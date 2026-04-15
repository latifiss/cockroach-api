const crypto = require('crypto');
const newsSources = require('../../sourcesIndex');
const { clusterNewsArticles } = require('../../utils/newsCluster');
const { deduplicateArticles } = require('../../utils/deduplicate');

const generateClusterId = (articles) => {
  const sortedIds = articles
    .map((a) => a.id)
    .sort()
    .join('|');

  return crypto
    .createHash('sha256')
    .update(sortedIds)
    .digest('hex')
    .substring(0, 100);
};

const getclusterLatestNews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const allNews = await Promise.all(newsSources.map((fetch) => fetch()));

    let allArticles = [];
    allNews.forEach((source) => {
      if (source.articles?.length) {
        const enriched = source.articles.map((a) => ({
          ...a,
          source_name: source.source_name,
          source_origin: source.source_origin,
          source_tags: source.source_tags,
        }));
        allArticles.push(...enriched);
      }
    });

    const clusters = await clusterNewsArticles(allArticles, 0.75);

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedClusters = clusters.slice(startIndex, endIndex);

    res.json({
      clustered_count: clusters.length,
      page: pageNum,
      per_page: limitNum,
      total_articles: allArticles.length,
      total_clusters: clusters.length,
      clusters: paginatedClusters.map((group) => ({
        cluster_id: generateClusterId(group),
        size: group.length,
        articles: group,
      })),
    });
  } catch (error) {
    console.error('Error in clustering news:', error);
    res.status(500).json({
      error: 'Failed to cluster news',
      details: error.message,
    });
  }
};

module.exports = { getclusterLatestNews };
