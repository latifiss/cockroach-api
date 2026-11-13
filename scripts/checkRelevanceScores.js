require('dotenv').config();

const mongoose = require('mongoose');

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from .env');
    }

    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'api' });

    const db = mongoose.connection.db;

    const [latestArticles, embeddedArticles, newsClusters, embeddedSamples] = await Promise.all([
      db.collection('latests').aggregate([
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
      ]).toArray()
    ]);

    console.log('\nRELEVANCE SCORE DIAGNOSTICS\n');
    console.log(JSON.stringify({
      database: 'api',
      latestArticles: latestArticles || { total: 0 },
      embeddedArticles: embeddedArticles || { total: 0 },
      newsClusters: newsClusters || { total: 0 },
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
