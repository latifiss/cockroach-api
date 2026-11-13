require('dotenv').config();

const mongoose = require('mongoose');
const { scoreArticleRelevance } = require('../utils/articleRelevance');
const News = require('../models/news.model');

function summarizeScores(scores) {
  const values = scores.map((item) => item.score).filter(Number.isFinite);
  const aboveOne = scores.filter((item) => item.score > 1);
  const examples = aboveOne
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map(({ title, score, matchedFields }) => ({ title, score, matchedFields }));

  return {
    total: values.length,
    minimum: values.length ? Math.min(...values) : null,
    maximum: values.length ? Math.max(...values) : null,
    average: values.length
      ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3))
      : null,
    aboveOne: aboveOne.length,
    examples,
  };
}

function getMatchedFields(article) {
  const fields = [
    ['title', article.title],
    ['description', article.description || article.summary],
    ['content', article.content],
    ['categories', Array.isArray(article.categories) ? article.categories.join(' ') : ''],
    ['source_tags', Array.isArray(article.source_tags) ? article.source_tags.join(' ') : ''],
  ];

  return fields
    .filter(([, value]) => String(value || '').trim())
    .map(([name, value]) => name);
}

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from .env');
    }

    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'api' });

    const db = mongoose.connection.db;
    const latestCollection = db.collection('latests');

    const [latestArticles, embeddedArticles, newsClusters, embeddedSamples, latestSamples] = await Promise.all([
      latestCollection.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            scored: { $sum: { $cond: [{ $isNumber: '$relevance_score' }, 1, 0] } },
            missing: { $sum: { $cond: [{ $eq: [{ $type: '$relevance_score' }, 'missing'] }, 1, 0] } },
            minimum: { $min: '$relevance_score' },
            maximum: { $max: '$relevance_score' },
            average: { $avg: '$relevance_score' },
            zero: { $sum: { $cond: [{ $eq: ['$relevance_score', 0] }, 1, 0] } },
            aboveOne: { $sum: { $cond: [{ $gt: ['$relevance_score', 1] }, 1, 0] } }
          }
        }
      ]).next(),

      db.collection('news').aggregate([
        { $unwind: '$articles' },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            scored: { $sum: { $cond: [{ $isNumber: '$articles.relevance_score' }, 1, 0] } },
            missing: { $sum: { $cond: [{ $eq: [{ $type: '$articles.relevance_score' }, 'missing'] }, 1, 0] } },
            minimum: { $min: '$articles.relevance_score' },
            maximum: { $max: '$articles.relevance_score' },
            average: { $avg: '$articles.relevance_score' },
            zero: { $sum: { $cond: [{ $eq: ['$articles.relevance_score', 0] }, 1, 0] } },
            aboveOne: { $sum: { $cond: [{ $gt: ['$articles.relevance_score', 1] }, 1, 0] } }
          }
        }
      ]).next(),

      db.collection('news').aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            minimum: { $min: '$average_relevance' },
            maximum: { $max: '$average_relevance' },
            average: { $avg: '$average_relevance' },
            zero: { $sum: { $cond: [{ $eq: ['$average_relevance', 0] }, 1, 0] } },
            aboveOne: { $sum: { $cond: [{ $gt: ['$average_relevance', 1] }, 1, 0] } }
          }
        }
      ]).next(),

      db.collection('news').aggregate([
        { $unwind: '$articles' },
        {
          $project: {
            _id: 0,
            cluster_id: 1,
            title: '$articles.title',
            article_id: '$articles.article_id',
            relevance_score: '$articles.relevance_score'
          }
        },
        { $limit: 10 }
      ]).toArray(),

      latestCollection.find(
        {},
        {
          projection: {
            _id: 0,
            title: 1,
            description: 1,
            summary: 1,
            content: 1,
            categories: 1,
            source_tags: 1,
            relevance_score: 1,
          },
        }
      ).limit(5000).toArray(),
    ]);

    const rescored = latestSamples.map((article) => ({
      title: article.title || '(untitled)',
      score: scoreArticleRelevance(article),
      matchedFields: getMatchedFields(article),
    }));

    const schema = News.schema;
    const embeddedScorePath = schema.path('articles.relevance_score');

    console.log('\\nRELEVANCE SCORE DIAGNOSTICS\\n');
    console.log(JSON.stringify({
      database: 'api',
      latestArticles: latestArticles || { total: 0 },
      embeddedArticles: embeddedArticles || { total: 0 },
      newsClusters: newsClusters || { total: 0 },
      rescoredLatestSample: summarizeScores(rescored),
      rescoredSampleSize: latestSamples.length,
      newsEmbeddedRelevanceScoreSchema: {
        exists: Boolean(embeddedScorePath),
        type: embeddedScorePath?.instance || null,
        defaultValue: embeddedScorePath?.defaultValue ?? null,
      },
      embeddedArticleSamples: embeddedSamples
    }, null, 2));
  } catch (error) {
    console.error('Relevance diagnostics failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
