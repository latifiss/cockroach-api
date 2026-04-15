const News = require('../../models/news.model');
const newsSources = require('../../sourcesIndex');
const { deduplicateArticles } = require('../../utils/deduplicate');
const { clusterNewsArticles } = require('../../utils/newsCluster');
const { getRepresentativeTitle } = require('../../utils/representativeTitle');
const rankArticle = require('../../utils/rankArticle');
const crypto = require('crypto');
const mongoose = require('mongoose');

function cleanText(text) {
  return text ? text.replace(/\n/g, '').replace(/\s+/g, ' ').trim() : '';
}

function generateClusterId(cluster) {
  const ids = cluster
    .map((a) => a.article_id || a.link || a.url || JSON.stringify(a.title))
    .sort()
    .join('|');
  return crypto.createHash('sha256').update(ids).digest('hex').substring(0, 32);
}

const updateNewsInDB = async (req, res) => {
  try {
    const allNews = await Promise.all(
      newsSources.map(async (fetch) => {
        try {
          const result = await fetch();
          console.log(
            `✅ Fetched ${result.articles?.length || 0} from ${
              result.source_name
            }`
          );
          return result;
        } catch (error) {
          console.error('❌ Fetch error:', error.message);
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
          meta: a.meta || cleanText(a.title),
          source_name: source.source_name || 'unknown',
          source_origin: source.source_origin || '',
          source_tags: source.source_tags || [],
          relevance_score: rankArticle(a, source) || 0,
        }));
        allArticles.push(...enriched);
      }
    });

    const uniqueArticles = deduplicateArticles(allArticles);
    let clusters = await clusterNewsArticles(uniqueArticles, 0.75);

    const dbEntries = clusters.map((cluster) => {
      const sortedCluster = cluster.sort(
        (a, b) => b.relevance_score - a.relevance_score
      );
      const cluster_id = generateClusterId(sortedCluster);
      const representative_title = cleanText(
        getRepresentativeTitle(sortedCluster)
      );
      const size = sortedCluster.length;
      const average_relevance =
        sortedCluster.reduce((sum, a) => sum + (a.relevance_score || 0), 0) /
        size;

      // Assign article_type
      const articlesWithType = sortedCluster.map((article, index) => ({
        ...article,
        article_type: index === 0 ? 'main' : 'sub',
      }));

      return {
        cluster_id,
        representative_title,
        size,
        average_relevance,
        articles: articlesWithType,
      };
    });

    // Clear old clusters (optional: you can update instead if preferred)
    await News.deleteMany({});
    await News.insertMany(dbEntries);

    console.log(`✅ Saved ${dbEntries.length} clusters to database`);
    res.status(200).json({ message: 'News updated', count: dbEntries.length });
  } catch (error) {
    console.error('❌ Update error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const getNewsFromDB = async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(
      200,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const skip = (pageNum - 1) * limitNum;

    const [totalClusters, newsClusters] = await Promise.all([
      News.countDocuments(),
      News.find(
        {},
        {
          _id: 1,
          cluster_id: 1,
          representative_title: 1,
          average_relevance: 1,
          updatedAt: 1,
          createdAt: 1,
          size: 1,
        }
      )
        .sort({ average_relevance: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    res.json({
      clustered_count: totalClusters,
      page: pageNum,
      per_page: limitNum,
      total_clusters: totalClusters,
      clusters: newsClusters,
    });
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const getNewsByCategory = async (req, res) => {
  const category = (req.query.category || '').toLowerCase().trim();

  if (!category) {
    return res.status(400).json({ error: 'Missing category parameter' });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const skip = (page - 1) * limit;

    // Create index if it doesn't exist (should be done separately in production)
    await News.collection.createIndex({
      'articles.source_tags': 1,
      updatedAt: -1,
    });

    // Optimized aggregation pipeline
    const result = await News.aggregate([
      {
        $match: {
          'articles.source_tags': category,
        },
      },
      {
        $addFields: {
          filteredArticles: {
            $filter: {
              input: '$articles',
              as: 'article',
              cond: { $in: [category, '$$article.source_tags'] },
            },
          },
        },
      },
      {
        $match: {
          filteredArticles: { $ne: [] }, // Ensure we only keep documents with matching articles
        },
      },
      {
        $facet: {
          clusters: [
            { $sort: { updatedAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                cluster_id: 1,
                representative_title: 1,
                size: 1,
                average_relevance: 1,
                createdAt: 1,
                updatedAt: 1,
                articles: '$filteredArticles',
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const clusters = result[0].clusters;
    const total = result[0].totalCount[0]?.count || 0;

    res.json({
      total,
      page,
      total_pages: Math.ceil(total / limit),
      clusters,
    });
  } catch (error) {
    console.error('Error fetching clustered news by category:', error);
    res.status(500).json({
      error: 'Failed to fetch clustered news by category',
      details: error.message,
    });
  }
};

const getNewsById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid news ID' });
  }

  try {
    const cluster = await News.findById(id).lean();

    if (!cluster) {
      return res.status(404).json({ error: 'News cluster not found' });
    }

    res.json(cluster);
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = {
  updateNewsInDB,
  getNewsFromDB,
  getNewsByCategory,
  getNewsById,
};
