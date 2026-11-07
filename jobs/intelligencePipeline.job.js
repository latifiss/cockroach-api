const cron = require('node-cron');
const { collectCanonicalArticles } = require('../services/collection');
const { persistCollectionRun } = require('../services/operations/collectionPersistence');
const { persistLatestArticles } = require('../services/articles/latestPersistence');
const { persistNewsClusters } = require('../services/articles/newsPersistence');
const { clusterNewsArticles } = require('../utils/newsCluster');
const { generateSlug, generateMetaDescription } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { acquirePipelineLease, releasePipelineLease } = require('../services/operations/schedulerLease');

const logger = createLogger();
let running = false;
const CollectionRun = require('../models/collectionRun.model');

async function updatePipelineStage(collectionRunId, stage, status = 'running', error = null) {
  if (!collectionRunId) return;
  await CollectionRun.updateOne(
    { _id: collectionRunId },
    { $set: { pipeline_status: status, pipeline_stage: stage, pipeline_error: error } }
  );
}

async function executePipeline() {
  if (running) {
    logger.warn('⏭️ Pipeline skipped; previous run is still active');
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
      logger.warn('🔒 Pipeline skipped; another scheduler owns the lease');
      return null;
    }

    logger.info('🚀 Intelligence pipeline started');
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
    logger.info('💾 Latest article persistence started', { articles: collection.articles.length });
    const latest = await persistLatestArticles(collection.articles);
    logger.info('✅ Latest article persistence finished', {
      upserted: latest.upserted, modified: latest.modified, batches: latest.batches,
    });

    currentStage = 'clustering';
    await updatePipelineStage(collectionRun._id, currentStage);
    logger.info('🧠 Article clustering started', { articles: collection.articles.length });
    const articlesById = new Map();
    for (const article of collection.articles) {
      if (!article?.article_id || !article?.title) continue;
      const id = String(article.article_id);
      const existing = articlesById.get(id);
      if (!existing) articlesById.set(id, article);
    }
    const articles = [...articlesById.values()].map((article) => ({
      ...article,
      slug: `${generateSlug(article.title) || 'article'}-${String(article.article_id).slice(0, 24)}`,
      meta: generateMetaDescription(article),
      relevance_score: article.relevance_score ?? 1,
      isFirstParty: false,
      isBreaking: false,
      has_image: Boolean(article.has_image || article.image_url),
      source_link: article.source_link || article.canonical_url || article.link || '',
    }));
    const clusters = articles.length ? await clusterNewsArticles(articles, 0.7) : [];
    logger.info('✅ Article clustering finished', { articles: articles.length, clusters: clusters.length });

    currentStage = 'news_persistence';
    await updatePipelineStage(collectionRun._id, currentStage);
    const clusterPersistence = await persistNewsClusters(
      require('../models/news.model'),
      clusters,
      { logger }
    );
    logger.info('💾 News cluster persistence finished', {
      clusters: clusterPersistence.attempted,
      inserted: clusterPersistence.inserted,
      updated: clusterPersistence.updated,
      detached: clusterPersistence.detached,
      skipped: clusterPersistence.skipped,
      removed: clusterPersistence.removed,
      batches: clusterPersistence.batches,
    });

    currentStage = 'cache_refresh';
    await updatePipelineStage(collectionRun._id, currentStage);
    const { updateNewsCache } = require('../controllers/news/feed.controller');
    await updateNewsCache();

    await updatePipelineStage(collectionRun._id, 'completed', 'completed');
    logger.info('🎉 Intelligence pipeline completed', {
      durationMs: Date.now() - startedAt,
      sources: collection.sourceCount,
      successfulSources: collection.succeededCount,
      failedSources: collection.failedCount,
      canonicalArticles: articles.length,
      latestUpserted: latest.upserted,
      clusters: clusterPersistence.attempted,
      clusterArticlesInserted: clusterPersistence.inserted,
      clusterArticlesUpdated: clusterPersistence.updated,
      clusterArticlesDetached: clusterPersistence.detached,
      clusterArticlesSkipped: clusterPersistence.skipped,
      emptyClustersRemoved: clusterPersistence.removed,
    });
    return { collection, latest, clusterPersistence };
  } catch (error) {
    if (collectionRun?._id) {
      await updatePipelineStage(collectionRun._id, currentStage, 'failed', error.message)
        .catch((persistenceError) => logger.error('Failed to record pipeline failure', { error: persistenceError }));
    }
    logger.error('💥 Intelligence pipeline failed', { stage: currentStage, error, bulkWrite: error.bulkWrite || null });
    throw error;
  } finally {
    if (leaseAcquired) {
      await releasePipelineLease().catch((error) => logger.error('Failed to release pipeline scheduler lease', { error }));
    }
    running = false;
  }
}

const intelligencePipelineJob = cron.schedule('*/30 * * * *', () => {
  executePipeline().catch((error) => logger.error('Scheduled pipeline execution failed', { error }));
}, { scheduled: false, timezone: 'UTC' });

module.exports = { intelligencePipelineJob, executePipeline };
