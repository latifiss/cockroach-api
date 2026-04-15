const cron = require('node-cron');
const crypto = require('crypto');
const mongoose = require('mongoose');
const News = require('../models/news.model');
const { deduplicateArticles } = require('../utils/deduplicate');
const { clusterNewsArticles } = require('../utils/newsCluster');
const { getRepresentativeTitle } = require('../utils/representativeTitle');
const { generateSlug, generateMetaDescription } = require('../utils/helpers');
const newsSources = require('../sourcesIndex.js');

// Constants
const CLUSTER_SIMILARITY_THRESHOLD = 0.7;
const BATCH_SIZE = 500;

function cleanText(text) {
  return text
    ? text.toString().replace(/\n/g, '').replace(/\s+/g, ' ').trim()
    : '';
}

function generateClusterId(cluster) {
  const ids = cluster
    .map((a) => a.article_id || a.link || a.url || JSON.stringify(a.title))
    .sort()
    .join('|');
  return crypto.createHash('sha256').update(ids).digest('hex').substring(0, 32);
}

function processArticle(article) {
  if (!article?.title?.trim()) return null;

  return {
    ...article,
    title: cleanText(article.title),
    meta: article.meta || generateMetaDescription(article),
    slug: article.slug || generateSlug(article.title),
    article_id: article.article_id || crypto.randomUUID(),
    relevance_score: article.relevance_score ?? 1,
    published_at: article.published_at || new Date().toISOString(),
    has_image: article.has_image ?? true,
    isFirstParty: article.isFirstParty ?? false,
    isBreaking: article.isBreaking ?? false,
    source_id: article.source_id || 'Ghweb1234567899',
    source_name: article.source_name || 'Ghanaian web',
    source_link: article.source_link || article.link || '',
    source_origin: article.source_origin || 'Ghana',
    source_tags: Array.isArray(article.source_tags) ? article.source_tags : [],
    creator: article.creator || '',
  };
}

async function fetchAllArticlesFromSources() {
  const allNews = await Promise.all(newsSources.map((fetchFn) => fetchFn()));

  let allArticles = [];

  for (const source of allNews) {
    console.log(
      `✅ Retrieved ${source.articles?.length || 0} from ${
        source.source_name || 'Unknown Source'
      }`
    );

    if (source.articles && source.articles.length > 0) {
      const articlesWithSource = source.articles.map((article) => ({
        ...article,
        source_id: source.source_id || '',
        source_name: source.source_name || '',
        source_link: source.source_link || '',
        source_origin: source.source_origin || '',
        source_tags: source.source_tags || [],
        has_image: article.image ? true : false,
        creator: source.creator || '',
        slug: article.slug || generateSlug(article.title),
        meta: article.meta || generateMetaDescription(article),
      }));

      allArticles.push(...articlesWithSource);
    }
  }

  return allArticles;
}

async function processAndSaveClusters(clusters) {
  if (!clusters?.length) return 0;

  const processedClusters = clusters.map((cluster) => {
    const sorted = [...cluster].sort(
      (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
    );
    return {
      cluster_id: generateClusterId(sorted),
      size: sorted.length,
      representative_title:
        cleanText(getRepresentativeTitle(sorted)) || 'No title',
      average_relevance: parseFloat(
        (
          sorted.reduce((sum, a) => sum + (a.relevance_score || 0), 0) /
          sorted.length
        ).toFixed(2)
      ),
      articles: sorted.map((article, idx) => ({
        ...article,
        article_type: sorted.length === 1 || idx === 0 ? 'main' : 'sub',
      })),
    };
  });

  // Use bulkWrite for better performance
  const bulkOps = processedClusters.map((cluster) => ({
    updateOne: {
      filter: { cluster_id: cluster.cluster_id },
      update: { $set: cluster },
      upsert: true,
    },
  }));

  const result = await News.bulkWrite(bulkOps, { ordered: false });
  return result.upsertedCount + result.modifiedCount;
}

const clusterNewsCronJob = cron.schedule(
  '*/5 * * * *',
  async () => {
    console.log('\n🕒 [CRON] Starting optimized cluster news job...');
    const startTime = Date.now();

    try {
      console.log('🌐 Fetching articles from APIs...');
      const rawArticles = await fetchAllArticlesFromSources();

      const allArticles = rawArticles.map(processArticle).filter(Boolean);

      console.log(`📥 Received ${allArticles.length} valid articles`);

      if (allArticles.length === 0) {
        console.log('ℹ️ No valid articles to process');
        return;
      }

      console.log(`🧹 Deduplicating ${allArticles.length} articles...`);
      const uniqueArticles = deduplicateArticles(allArticles);

      console.log(`🧠 Clustering ${uniqueArticles.length} articles...`);
      const clusters = await clusterNewsArticles(
        uniqueArticles,
        CLUSTER_SIMILARITY_THRESHOLD
      );

      console.log(`💾 Saving ${clusters.length} clusters...`);
      const savedCount = await processAndSaveClusters(clusters);

      console.log(`✅ Successfully saved ${savedCount} clusters`);
    } catch (err) {
      console.error('❌ [CRON] Cluster news job failed:', err);
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      console.log(`🏁 Completed in ${duration.toFixed(2)}s\n`);
    }
  },
  {
    scheduled: true,
    timezone: 'UTC',
  }
);

process.on('SIGTERM', () => {
  clusterNewsCronJob.stop();
  mongoose.disconnect();
});

module.exports = clusterNewsCronJob;
