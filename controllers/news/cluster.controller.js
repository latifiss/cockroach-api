const crypto = require('crypto');
const News = require('../../models/news.model');

function generateClusterId(articles) {
  const sortedIds = articles.map((article) => article.article_id || article.link || article.title).sort().join('|');
  return crypto.createHash('sha256').update(sortedIds).digest('hex').slice(0, 32);
}

async function getclusterLatestNews(req, res) {
  try {
    const pageNum = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const [clusters, total, articleCount] = await Promise.all([
      News.find().sort({ average_relevance: -1, updatedAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      News.countDocuments(),
      News.aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]),
    ]);

    return res.json({
      clustered_count: total,
      page: pageNum,
      per_page: limitNum,
      total_articles: articleCount[0]?.total || 0,
      total_clusters: total,
      clusters: clusters.map((cluster) => ({
        cluster_id: cluster.cluster_id || generateClusterId(cluster.articles || []),
        size: cluster.size || cluster.articles?.length || 0,
        representative_title: cluster.representative_title || '',
        average_relevance: cluster.average_relevance || 0,
        articles: cluster.articles || [],
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve clustered news' });
  }
}

module.exports = { getclusterLatestNews };
