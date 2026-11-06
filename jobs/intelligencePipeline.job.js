const cron = require('node-cron');
const News = require('../models/news.model');
const { collectCanonicalArticles } = require('../services/collection');
const { persistCollectionRun } = require('../services/operations/collectionPersistence');
const { persistLatestArticles } = require('../services/articles/latestPersistence');
const { clusterNewsArticles } = require('../utils/newsCluster');
const { getRepresentativeTitle } = require('../utils/representativeTitle');
const { generateSlug, generateMetaDescription } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { bulkWriteInBatches } = require('../utils/bulkWrite');
const { acquirePipelineLease, releasePipelineLease } = require('../services/operations/schedulerLease');

const logger = createLogger();
let running = false;
const CollectionRun = require('../models/collectionRun.model');

function stableClusterId(cluster) {
  const crypto = require('crypto');
  const identities = cluster.map((article) => article.article_id).sort().join('|');
  return crypto.createHash('sha256').update(identities).digest('hex').slice(0, 32);
}

async function persistClusters(clusters) {
  if (!clusters.length) return { attempted: 0, batches: 0, upserted: 0, modified: 0 };
  const operations = clusters.map((cluster) => {
    const sorted = [...cluster].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    const articles = sorted.map((article, index) => ({
      ...article,
      published_at: article.published_at || new Date(),
      slug: article.slug || `${generateSlug(article.title) || 'article'}-${article.article_id.slice(0, 10)}`,
      meta: article.meta || generateMetaDescription(article),
      article_type: index === 0 ? 'main' : 'sub',
      isFirstParty: false,
      isBreaking: false,
      has_image: Boolean(article.has_image || article.image_url),
      source_link: article.source_link || article.canonical_url || article.link || '',
      source_tags: article.source_tags || [],
    }));
    const clusterId = stableClusterId(sorted);
    return {
      updateOne: {
        filter: { cluster_id: clusterId },
        update: { $set: {
          cluster_id: clusterId,
          size: articles.length,
          representative_title: getRepresentativeTitle(sorted) || sorted[0].title,
          average_relevance: Number((sorted.reduce((sum, item) => sum + (item.relevance_score || 0), 0) / sorted.length).toFixed(3)),
          articles,
        } },
        upsert: true,
      },
    };
  });

  return bulkWriteInBatches(News, operations, {
    batchSize: 100,
    maxRetries: 2,
    retryDelayMs: 500,
    ordered: false,
    onRetry: ({ batch, batches, attempt, error }) => logger.warn('Retrying MongoDB news-cluster batch', {
      batch, batches, retry: attempt, error: error.message,
    }),
  });
}

async function updatePipelineStage(collectionRunId, stage, status = 'running', error = null) {
  if (!collectionRunId) return;
  await CollectionRun.updateOne(
    { _id: collectionRunId },
    { $set: { pipeline_status: status, pipeline_stage: stage, pipeline_error: error } }
  );
}

async function executePipeline() {
  if (running) {
    logger.warn('Intelligence pipeline skipped because a previous run is still active');
    return null;
  }
  running = true;
  const startedAt = Date.now();
  let leaseAcquired = false;
  let collectionRun = null;
  let currentStage = 'collection';

  try {
    leaseAcquired = await acquirePipelineLease();
    if (!leaseAcquired) {
      logger.debug('Intelligence pipeline skipped because another instance owns the scheduler lease');
      return null;
    }

    logger.info('Intelligence pipeline started');
    const collection = await collectCanonicalArticles();
    collectionRun = await persistCollectionRun(collection);

    if (collection.succeededCount === 0) {
      await updatePipelineStage(collectionRun._id, 'collection', 'skipped', 'No publisher source completed successfully');
      logger.error('Collection produced no successful source results; preserving existing article and cluster data', {
        sourceCount: collection.sourceCount,
        failedCount: collection.failedCount,
      });
      return { collection, persistence: null, clusters: null };
    }

    currentStage = 'latest_persistence';
    await updatePipelineStage(collectionRun._id, currentStage);
    logger.info('Latest article persistence started', { articles: collection.articles.length });
    const latest = await persistLatestArticles(collection.articles);
    logger.info('Latest article persistence finished', {
      upserted: latest.upserted, modified: latest.modified, batches: latest.batches,
    });

    currentStage = 'clustering';
    await updatePipelineStage(collectionRun._id, currentStage);
    logger.info('Article clustering started', { articles: collection.articles.length });
    const articles = collection.articles.map((article) => ({
      ...article,
      slug: `${generateSlug(article.title) || 'article'}-${article.article_id.slice(0, 10)}`,
      meta: generateMetaDescription(article),
      relevance_score: article.relevance_score ?? 1,
      isFirstParty: false,
      isBreaking: false,
      has_image: Boolean(article.has_image || article.image_url),
      source_link: article.source_link || article.canonical_url || article.link || '',
    }));
    const clusters = articles.length ? await clusterNewsArticles(articles, 0.7) : [];
    logger.info('Article clustering finished', { articles: articles.length, clusters: clusters.length });

    currentStage = 'news_persistence';
    await updatePipelineStage(collectionRun._id, currentStage);
    const clusterPersistence = await persistClusters(clusters);
    logger.info('News cluster persistence finished', {
      clusters: clusterPersistence.attempted,
      upserted: clusterPersistence.upserted,
      modified: clusterPersistence.modified,
      batches: clusterPersistence.batches,
    });

    currentStage = 'cache_refresh';
    await updatePipelineStage(collectionRun._id, currentStage);
    const { updateNewsCache } = require('../controllers/news/feed.controller');
    await updateNewsCache();

    await updatePipelineStage(collectionRun._id, 'completed', 'completed');
    logger.info('Intelligence pipeline completed', {
      durationMs: Date.now() - startedAt,
      sources: collection.sourceCount,
      successfulSources: collection.succeededCount,
      failedSources: collection.failedCount,
      canonicalArticles: collection.articles.length,
      latestUpserted: latest.upserted,
      clusters: clusterPersistence.attempted,
    });
    return { collection, latest, clusterPersistence };
  } catch (error) {
    if (collectionRun?._id) {
      await updatePipelineStage(collectionRun._id, currentStage, 'failed', error.message)
        .catch((persistenceError) => logger.error('Failed to record pipeline failure', { error: persistenceError }));
    }
    logger.error('Intelligence pipeline failed', { stage: currentStage, error, bulkWrite: error.bulkWrite || null });
    throw error;
  } finally {
    if (leaseAcquired) {
      await releasePipelineLease().catch((error) => logger.error('Failed to release pipeline scheduler lease', { error }));
    }
    running = false;
  }
}

const intelligencePipelineJob = cron.schedule('*/2 * * * *', () => {
  executePipeline().catch((error) => logger.error('Scheduled pipeline execution failed', { error }));
}, { scheduled: false, timezone: 'UTC' });

module.exports = { intelligencePipelineJob, executePipeline, persistClusters };
