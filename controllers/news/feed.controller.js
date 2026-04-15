const crypto = require('crypto');
const newsSources = require('../../sourcesIndex');
const { clusterNewsArticles } = require('../../utils/newsCluster');
const { deduplicateArticles } = require('../../utils/deduplicate');
const { getRepresentativeTitle } = require('../../utils/representativeTitle');
const rankArticle = require('../../utils/rankArticle');

let cachedNews = {
  clusters: [],
  lastUpdated: new Date(0),
  expiration: 15 * 60 * 1000,
  isUpdating: false,
};

function cleanText(text) {
  return text ? text.replace(/\n/g, '').replace(/\s+/g, ' ').trim() : '';
}

async function updateNewsCache() {
  if (cachedNews.isUpdating) return;
  cachedNews.isUpdating = true;

  try {
    const startTime = Date.now();
    const allNews = await Promise.all(
      newsSources.map(async (fetch) => {
        try {
          const result = await fetch();
          // console.log(
          //   `Fetched ${result.articles?.length || 0} from ${result.source_name}`
          // );
          return result;
        } catch (error) {
          console.error('Fetch error:', error.message);
          return { articles: [], source_name: 'unknown' };
        }
      })
    );

    let allArticles = [];
    allNews.forEach((source) => {
      if (source?.articles?.length) {
        const enriched = source.articles.map((a) => ({
          ...a,
          title: cleanText(a.title),
          source_name: source.source_name || 'unknown',
          source_origin: source.source_origin || '',
          source_tags: source.source_tags || [],
          relevance_score: rankArticle(a, source) || 0,
        }));
        allArticles.push(...enriched);
      }
    });

    let clusters = [];
    try {
      const uniqueArticles = deduplicateArticles(allArticles);
      clusters = await clusterNewsArticles(uniqueArticles, 0.75);
    } catch (error) {
      console.error('Clustering error:', error.message);
      clusters = allArticles.map((article) => [article]);
    }

    clusters = clusters
      .map((cluster) => ({
        articles: cluster,
        relevance:
          cluster.reduce(
            (sum, article) => sum + (article.relevance_score || 0),
            0
          ) / cluster.length,
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .map((c) => c.articles);

    cachedNews = {
      clusters,
      lastUpdated: new Date(),
      expiration: 15 * 60 * 1000,
      isUpdating: false,
    };

    // console.log(
    //   `Updated ${clusters.length} clusters in ${
    //     (Date.now() - startTime) / 1000
    //   }s`
    // );
  } catch (error) {
    console.error('Update error:', error.message);
    cachedNews.isUpdating = false;
  }
}

function mergeClusters(newClusters, oldClusters) {
  const allClusters = [...newClusters, ...oldClusters];
  const seenArticles = new Set();
  const merged = [];

  for (const cluster of allClusters) {
    const uniqueArticles = cluster.filter((article) => {
      const key =
        article.article_id || article.link || JSON.stringify(article.title);
      return !seenArticles.has(key) && seenArticles.add(key);
    });

    if (uniqueArticles.length > 0) {
      merged.push(uniqueArticles);
    }
  }

  return merged.sort((a, b) => {
    const aScore = Math.max(...a.map((art) => art.relevance_score || 0));
    const bScore = Math.max(...b.map((art) => art.relevance_score || 0));
    return bScore - aScore;
  });
}

function generateClusterId(cluster) {
  const ids = cluster
    .map((a) => a.article_id || a.link || a.url || JSON.stringify(a.title))
    .sort()
    .join('|');

  return crypto.createHash('sha256').update(ids).digest('hex').substring(0, 32);
}

setInterval(updateNewsCache, 15 * 60 * 1000);
updateNewsCache().catch((err) => console.error('Initial error:', err));

const getNewsFeed = async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(
      200,
      Math.max(1, parseInt(req.query.limit, 10) || 200)
    );

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const clustersToPaginate =
      cachedNews.clusters.length > 0 ? cachedNews.clusters : [[]];

    res.json({
      clustered_count: clustersToPaginate.length,
      page: pageNum,
      per_page: limitNum,
      total_articles: clustersToPaginate.reduce(
        (sum, cluster) => sum + cluster.length,
        0
      ),
      total_clusters: clustersToPaginate.length,
      last_updated: cachedNews.lastUpdated.toISOString(),
      next_update: new Date(
        cachedNews.lastUpdated.getTime() + cachedNews.expiration
      ).toISOString(),
      clusters: clustersToPaginate
        .slice(startIndex, endIndex)
        .map((cluster) => ({
          cluster_id: generateClusterId(cluster),
          size: cluster.length,
          representative_title:
            cleanText(getRepresentativeTitle(cluster)) || 'No title',
          average_relevance:
            cluster.length > 0
              ? cluster.reduce((sum, a) => sum + (a.relevance_score || 0), 0) /
                cluster.length
              : 0,
          articles: cluster.map((article) => ({
            ...article,
            title: cleanText(article.title),
          })),
        })),
    });
  } catch (error) {
    console.error('Controller error:', error.message);
    res.status(500).json({
      error: 'Server error',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getNewsFeed,
  updateNewsCache,
};
