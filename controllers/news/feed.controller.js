const crypto = require('crypto');
const News = require('../../models/news.model');
const { getRepresentativeTitle } = require('../../utils/representativeTitle');
const { createLogger } = require('../../utils/logger');

const logger = createLogger();
const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedNews = {
  clusters: [],
  lastUpdated: new Date(0),
  expiration: CACHE_TTL_MS,
  isUpdating: false,
};

function cleanText(text) {
  return text ? String(text).replace(/\n/g, '').replace(/\s+/g, ' ').trim() : '';
}

function generateClusterId(cluster) {
  const ids = cluster.map((article) => article.article_id || article.link || article.title).sort().join('|');
  return crypto.createHash('sha256').update(ids).digest('hex').slice(0, 32);
}

async function updateNewsCache() {
  if (cachedNews.isUpdating) return;
  cachedNews.isUpdating = true;
  try {
    const storedClusters = await News.find().sort({ average_relevance: -1, updatedAt: -1 }).lean();
    const clusters = storedClusters.map((cluster) => cluster.articles || []);
    cachedNews = {
      clusters,
      lastUpdated: new Date(),
      expiration: CACHE_TTL_MS,
      isUpdating: false,
    };
    return cachedNews;
  } catch (error) {
    cachedNews.isUpdating = false;
    logger.error('Persisted news feed cache refresh failed; retaining previous cache', { error });
    throw error;
  }
}

function mergeClusters(newClusters, oldClusters) {
  const seenArticles = new Set();
  return [...newClusters, ...oldClusters].map((cluster) => cluster.filter((article) => {
    const key = article.article_id || article.link || article.title;
    if (seenArticles.has(key)) return false;
    seenArticles.add(key);
    return true;
  })).filter((cluster) => cluster.length);
}

const getNewsFeed = async (req, res) => {
  try {
    const pageNum = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 200));
    const clusters = cachedNews.clusters;
    const totalArticles = clusters.reduce((sum, cluster) => sum + cluster.length, 0);
    return res.json({
      clustered_count: clusters.length,
      page: pageNum,
      per_page: limitNum,
      total_articles: totalArticles,
      total_clusters: clusters.length,
      last_updated: cachedNews.lastUpdated.toISOString(),
      next_update: new Date(cachedNews.lastUpdated.getTime() + cachedNews.expiration).toISOString(),
      clusters: clusters.slice((pageNum - 1) * limitNum, pageNum * limitNum).map((cluster) => ({
        cluster_id: generateClusterId(cluster),
        size: cluster.length,
        representative_title: cleanText(getRepresentativeTitle(cluster)) || 'No title',
        average_relevance: cluster.length
          ? cluster.reduce((sum, article) => sum + (article.relevance_score || 0), 0) / cluster.length
          : 0,
        articles: cluster.map((article) => ({ ...article, title: cleanText(article.title) })),
      })),
    });
  } catch (error) {
    logger.error('News feed response failed', { error });
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getNewsFeed, updateNewsCache, mergeClusters };
