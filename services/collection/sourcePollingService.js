const { sourceRegistry } = require('./index');
const { executeSource } = require('./collectionOrchestrator');
const { normalizeArticle, deduplicateCanonicalArticles } = require('../articles/canonicalArticle');
const { scoreArticlesRelevance } = require('../../utils/articleRelevance');
const { persistLatestArticles } = require('../articles/latestPersistence');
const { transitionSourceHealth } = require('../operations/sourceHealth');
const SourceHealth = require('../../models/sourceHealth.model');
const Latest = require('../../models/latest.model');
const News = require('../../models/news.model');
const { clusterNewsArticles } = require('../../utils/newsCluster');
const { persistNewsClustersIncremental } = require('../articles/newsPersistence');
const { updateNewsCache } = require('../../controllers/news/feed.controller');
const { loadRuntimeConfig } = require('../../config/runtime');
const { createLogger } = require('../../utils/logger');
const { randomUUID } = require('crypto');
const SchedulerLease = require('../../models/schedulerLease.model');

const logger = createLogger();
const POLL_INTERVAL_MS = Math.max(30000, Number.parseInt(process.env.SOURCE_POLL_INTERVAL_MS, 10) || 5 * 60 * 1000);
const INTELLIGENCE_DEBOUNCE_MS = Math.max(1000, Number.parseInt(process.env.INTELLIGENCE_DEBOUNCE_MS, 10) || 10000);
const INTELLIGENCE_LOOKBACK_HOURS = Math.max(1, Number.parseInt(process.env.INTELLIGENCE_LOOKBACK_HOURS, 10) || 6);
const INTELLIGENCE_ARTICLE_LIMIT = Math.max(100, Number.parseInt(process.env.INTELLIGENCE_ARTICLE_LIMIT, 10) || 1000);
const SOURCE_POLLING_LEASE_ID = 'news-source-polling';
const SOURCE_POLLING_LEASE_DURATION_MS = 5 * 60 * 1000;
const SOURCE_POLLING_LEASE_RENEWAL_MS = 60 * 1000;
const sourcePollingOwner = `${process.pid}:${randomUUID()}`;
let started = false;
let stopped = false;
let intelligenceTimer = null;
let intelligenceQueue = Promise.resolve();
let pendingArticleIds = new Set();
let retryArticleIds = [];
let activePolls = 0;
let sourcePollingLeaseTimer = null;
const sourcePollingTimers = new Map();
const inFlightSources = new Set();

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sourceOutcome(source, result) {
  return {
    sourceId: source.id,
    sourceName: source.name,
    domain_url: source.domain_url,
    source_category: source.source_category,
    status: result.status,
    completedAt: result.completedAt,
    durationMs: result.durationMs,
    articleCount: result.articleCount,
    error: result.error,
  };
}

async function persistSourceHealth(source, result, newArticleCount = 0) {
  const previous = await SourceHealth.findOne({ source_id: source.id }).lean();
  const health = transitionSourceHealth(previous || {}, sourceOutcome(source, result), source.name);
  await SourceHealth.updateOne(
    { source_id: source.id },
    {
      $set: {
        ...health,
        last_new_article_count: newArticleCount,
        poll_interval_ms: POLL_INTERVAL_MS,
        next_fetch_at: new Date(Date.now() + POLL_INTERVAL_MS),
      },
    },
    { upsert: true }
  );
}

function scheduleIntelligence(articleIds) {
  for (const id of articleIds) pendingArticleIds.add(id);
  if (intelligenceTimer || stopped) return;
  intelligenceTimer = setTimeout(() => {
    intelligenceTimer = null;
    intelligenceQueue = intelligenceQueue
      .then(processIntelligenceQueue)
      .catch((error) => {
        for (const id of retryArticleIds) pendingArticleIds.add(id);
        retryArticleIds = [];
        logger.error('Incremental intelligence processing failed; articles returned to the queue', { error });
        if (!stopped && pendingArticleIds.size) {
          setTimeout(() => scheduleIntelligence([]), 30000).unref?.();
        }
      });
  }, INTELLIGENCE_DEBOUNCE_MS);
}

async function processIntelligenceQueue() {
  if (stopped || pendingArticleIds.size === 0) return;
  const queuedIds = [...pendingArticleIds];
  retryArticleIds = queuedIds;
  pendingArticleIds.clear();
  const cutoff = new Date(Date.now() - INTELLIGENCE_LOOKBACK_HOURS * 60 * 60 * 1000);
  const recentArticles = await Latest.find({
    $or: [
      { article_id: { $in: queuedIds } },
      { published_at: { $gte: cutoff } },
    ],
  })
    .sort({ published_at: -1 })
    .limit(INTELLIGENCE_ARTICLE_LIMIT)
    .lean();

  const articlesById = new Map();
  for (const article of recentArticles) {
    if (!article?.article_id || !article?.title) continue;
    articlesById.set(String(article.article_id), {
      ...article,
      meta: article.meta || article.meta_description || '',
      relevance_score: article.relevance_score ?? 1,
      isFirstParty: false,
      isBreaking: false,
      has_image: Boolean(article.has_image || article.image_url),
      source_link: article.source_link || article.canonical_url || article.link || '',
    });
  }

  const articles = [...articlesById.values()];
  if (!articles.length) {
    retryArticleIds = [];
    return;
  }

  logger.info('Incremental intelligence batch started', {
    queuedArticles: queuedIds.length,
    candidateArticles: articles.length,
    lookbackHours: INTELLIGENCE_LOOKBACK_HOURS,
  });

  const clusters = await clusterNewsArticles(articles, 0.7);
  const persistence = await persistNewsClustersIncremental(News, clusters, { logger });
  retryArticleIds = [];
  await updateNewsCache().catch((error) => logger.error('Incremental news cache refresh failed; API workers will refresh on demand', { error }));

  logger.info('Incremental intelligence batch completed', {
    queuedArticles: queuedIds.length,
    candidateArticles: articles.length,
    clusters: persistence.attempted,
    inserted: persistence.inserted,
    updated: persistence.updated,
    detached: persistence.detached,
    removed: persistence.removed,
  });

  if (pendingArticleIds.size) scheduleIntelligence([]);
}

async function collectOneSource(source) {
  if (stopped || inFlightSources.has(source.id)) return;
  inFlightSources.add(source.id);
  activePolls += 1;

  try {
    const config = loadRuntimeConfig();
    const result = await executeSource(source, {
      timeoutMs: config.collectionTimeoutMs,
      retryAttempts: config.collectionRetryAttempts,
      retryDelayMs: config.collectionRetryDelayMs,
    });

    let newArticleCount = 0;
    if (result.status === 'succeeded') {
      const normalized = deduplicateCanonicalArticles(
        result.articles
          .map((article) => normalizeArticle(article, result.source))
          .filter(Boolean)
      );
      const scored = scoreArticlesRelevance(normalized);
      const persistence = await persistLatestArticles(scored, { batchSize: 100 });
      newArticleCount = persistence.upserted;
      if (persistence.upserted > 0 || persistence.modified > 0) {
        scheduleIntelligence(scored.map((article) => article.article_id));
      }
      logger.info('Publisher collection completed', {
        source: source.name,
        status: result.status,
        fetched: result.articleCount,
        newArticles: newArticleCount,
        updatedArticles: persistence.modified,
        durationMs: result.durationMs,
      });
    } else {
      logger.warn('Publisher collection failed', {
        source: source.name,
        code: result.error?.code,
        error: result.error?.message,
        durationMs: result.durationMs,
      });
    }

    await persistSourceHealth(source, result, newArticleCount);
  } catch (error) {
    logger.error('Publisher collection or processing failed', { source: source.name, error });
    const failedResult = {
      sourceId: source.id,
      sourceName: source.name,
      status: 'failed',
      completedAt: new Date(),
      durationMs: null,
      articleCount: 0,
      error: { code: error.code || 'SOURCE_PROCESSING_FAILED', message: error.message },
    };
    await persistSourceHealth(source, failedResult, 0).catch((healthError) => {
      logger.error('Publisher health update failed', { source: source.name, error: healthError });
    });
  } finally {
    activePolls -= 1;
    inFlightSources.delete(source.id);
  }
}

async function acquireSourcePollingLease() {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + SOURCE_POLLING_LEASE_DURATION_MS);
  const lease = await SchedulerLease.findOneAndUpdate(
    { _id: SOURCE_POLLING_LEASE_ID, lease_until: { $lte: now } },
    { $set: { owner: sourcePollingOwner, acquired_at: now, lease_until: leaseUntil } },
    { new: true }
  ).lean();

  if (lease?.owner === sourcePollingOwner) return true;

  try {
    await SchedulerLease.create({
      _id: SOURCE_POLLING_LEASE_ID,
      owner: sourcePollingOwner,
      acquired_at: now,
      lease_until: leaseUntil,
    });
    return true;
  } catch (error) {
    if (error.code === 11000) {
      logger.warn('Source polling is already owned by another application instance');
      return false;
    }
    throw error;
  }
}

async function renewSourcePollingLease() {
  const now = new Date();
  const result = await SchedulerLease.updateOne(
    {
      _id: SOURCE_POLLING_LEASE_ID,
      owner: sourcePollingOwner,
      lease_until: { $gt: now },
    },
    { $set: { lease_until: new Date(now.getTime() + SOURCE_POLLING_LEASE_DURATION_MS) } }
  );
  return result.matchedCount === 1;
}

async function startSourcePolling() {
  if (started) return true;
  const acquired = await acquireSourcePollingLease();
  if (!acquired) return false;

  started = true;
  stopped = false;
  sourcePollingLeaseTimer = setInterval(() => {
    renewSourcePollingLease()
      .then((renewed) => {
        if (renewed) return;
        stopped = true;
        for (const timer of sourcePollingTimers.values()) clearInterval(timer);
        sourcePollingTimers.clear();
        if (sourcePollingLeaseTimer) clearInterval(sourcePollingLeaseTimer);
        logger.error('Source polling lease was lost; this instance will stop scheduling publisher polls');
      })
      .catch((error) => {
        stopped = true;
        for (const timer of sourcePollingTimers.values()) clearInterval(timer);
        sourcePollingTimers.clear();
        if (sourcePollingLeaseTimer) clearInterval(sourcePollingLeaseTimer);
        logger.error('Source polling lease renewal failed; this instance will stop scheduling publisher polls', { error });
      });
  }, SOURCE_POLLING_LEASE_RENEWAL_MS);
  sourcePollingLeaseTimer.unref();

  logger.info('Continuous source polling started', {
    sources: sourceRegistry.length,
    pollIntervalMs: POLL_INTERVAL_MS,
    concurrency: 'all registered sources',
    leaseOwner: sourcePollingOwner,
  });
  for (const source of sourceRegistry) {
    collectOneSource(source).catch((error) => {
      logger.error('Initial publisher collection failed', { source: source.name, error });
    });
    const timer = setInterval(() => {
      if (inFlightSources.has(source.id)) {
        logger.warn('Publisher poll skipped because its previous request is still running', { source: source.name });
        return;
      }
      collectOneSource(source).catch((error) => {
        logger.error('Scheduled publisher collection failed', { source: source.name, error });
      });
    }, POLL_INTERVAL_MS);
    timer.unref();
    sourcePollingTimers.set(source.id, timer);
  }
  return true;
}

async function stopSourcePolling() {
  stopped = true;
  if (sourcePollingLeaseTimer) clearInterval(sourcePollingLeaseTimer);
  sourcePollingLeaseTimer = null;
  for (const timer of sourcePollingTimers.values()) clearInterval(timer);
  sourcePollingTimers.clear();
  if (intelligenceTimer) clearTimeout(intelligenceTimer);
  await intelligenceQueue;
  while (activePolls > 0) await wait(100);
  await SchedulerLease.updateOne(
    { _id: SOURCE_POLLING_LEASE_ID, owner: sourcePollingOwner },
    { $set: { lease_until: new Date() } }
  ).catch((error) => logger.error('Failed to release source polling lease', { error }));
  logger.info('Continuous source polling stopped', { activePolls });
}

function getSourcePollingStatus() {
  return {
    started,
    stopped,
    sourceCount: sourceRegistry.length,
    activePolls,
    inFlightSources: [...inFlightSources],
    pendingIntelligenceArticles: pendingArticleIds.size,
    pollIntervalMs: POLL_INTERVAL_MS,
  };
}

module.exports = { startSourcePolling, stopSourcePolling, getSourcePollingStatus, processIntelligenceQueue };
