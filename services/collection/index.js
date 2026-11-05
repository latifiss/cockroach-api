const newsSources = require('../../sourcesIndex');
const { loadRuntimeConfig } = require('../../config/runtime');
const { createSourceRegistry } = require('./sourceRegistry');
const { runCollection } = require('./collectionOrchestrator');
const { normalizeArticle, deduplicateCanonicalArticles } = require('../articles/canonicalArticle');
const { createLogger } = require('../../utils/logger');

const registry = createSourceRegistry(newsSources);
const logger = createLogger({ pretty: true });

function logCollectionSummary(run) {
  logger.info('NEWS COLLECTION FINISHED');
  logger.info('COLLECTION SUMMARY', {
    successful: run.succeededCount,
    failed: run.failedCount,
    articles: run.articleCount,
    duration: `${(run.durationMs / 1000).toFixed(1)}s`,
  });

  for (const result of run.results.filter((item) => item.status === 'failed')) {
    logger.warn(result.sourceName, {
      code: result.error?.code || 'SOURCE_FETCH_FAILED',
      message: result.error?.message || 'Source collection failed',
      attempts: result.attempts,
    });
  }
}

async function collectCanonicalArticles(options = {}) {
  const config = loadRuntimeConfig();
  logger.info('NEWS COLLECTION STARTED');
  logger.info('Registered sources', { count: registry.length });
  const run = await runCollection(registry, {
    concurrency: options.concurrency ?? config.collectionConcurrency,
    timeoutMs: options.timeoutMs ?? config.collectionTimeoutMs,
    retryAttempts: options.retryAttempts ?? config.collectionRetryAttempts,
    retryDelayMs: options.retryDelayMs ?? config.collectionRetryDelayMs,
  });

  logCollectionSummary(run);
  const articles = [];
  for (const result of run.results) {
    if (result.status !== 'succeeded') continue;
    for (const article of result.articles) {
      const normalized = normalizeArticle(article, result.source);
      if (normalized) articles.push(normalized);
    }
  }

  const normalizedArticles = deduplicateCanonicalArticles(articles);
  logger.info('Articles normalized', { count: normalizedArticles.length });
  return { ...run, articles: normalizedArticles };
}

module.exports = { collectCanonicalArticles, sourceRegistry: registry, logCollectionSummary };
