const cron = require('node-cron');
const News = require('../models/news.model');
const { collectCanonicalArticles } = require('../services/collection');
const { persistCollectionRun } = require('../services/operations/collectionPersistence');
const { persistLatestArticles } = require('../services/articles/latestPersistence');
const { clusterNewsArticles } = require('../utils/newsCluster');
const { getRepresentativeTitle } = require('../utils/representativeTitle');
const { generateSlug, generateMetaDescription } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');

const logger = createLogger();
let running = false;

function stableClusterId(cluster) {
  const crypto = require('crypto');
  const identities = cluster.map((article) => article.article_id).sort().join('|');
  return crypto.createHash('sha256').update(identities).digest('hex').slice(0, 32);
}

async function persistClusters(clusters) {
  if (!clusters.length) return { attempted: 0, upserted: 0, modified: 0 };
  const operations = clusters.map((cluster) => {
    const sorted = [...cluster].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    const articles = sorted.map((article, index) => ({
      ...article,
      slug: article.slug || `${generateSlug(article.title) || 'article'}-${article.article_id.slice(0, 10)}`,
      meta: article.meta || generateMetaDescription(article),
      article_type: index === 0 ? 'main' : 'sub',
      isFirstParty: false,
      isBreaking: false,
      has_image: Boolean(article.has_image || article.image_url),
      source_link: article.source_link || article.canonical_url || article.link || '',
      source_tags: article.source_tags || [],
    }));
    return {
      updateOne: {
        filter: { cluster_id: stableClusterId(sorted) },
        update: { $set: {
          cluster_id: stableClusterId(sorted),
          size: articles.length,
          representative_title: getRepresentativeTitle(sorted) || sorted[0].title,
          average_relevance: Number((sorted.reduce((sum, item) => sum + (item.relevance_score || 0), 0) / sorted.length).toFixed(3)),
          articles,
        } },
        upsert: true,
      },
    };
  });
  const result = await News.bulkWrite(operations, { ordered: false });
  return { attempted: operations.length, upserted: result.upsertedCount || 0, modified: result.modifiedCount || 0 };
}

async function executePipeline() {
  if (running) {
    logger.warn('Intelligence pipeline skipped because a previous run is still active');
    return null;
  }
  running = true;
  const startedAt = Date.now();
  try {
    const collection = await collectCanonicalArticles();
    await persistCollectionRun(collection);
    if (collection.succeededCount === 0) {
      logger.error('Collection produced no successful source results; preserving existing article and cluster data', {
        sourceCount: collection.sourceCount,
        failedCount: collection.failedCount,
      });
      return { collection, persistence: null, clusters: null };
    }

    const latest = await persistLatestArticles(collection.articles);
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
    const clusterPersistence = await persistClusters(clusters);
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
    logger.error('Intelligence pipeline failed', { error });
    throw error;
  } finally {
    running = false;
  }
}

const intelligencePipelineJob = cron.schedule('*/5 * * * *', () => {
  executePipeline().catch((error) => logger.error('Scheduled pipeline execution failed', { error }));
}, { scheduled: false, timezone: 'UTC' });

module.exports = { intelligencePipelineJob, executePipeline, persistClusters };
