require('dotenv').config();

const mongoose = require('mongoose');

async function summarize(collection, field) {
  const [summary, samples] = await Promise.all([
    collection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          scored: {
            $sum: {
              $cond: [{ $isNumber: field }, 1, 0]
            }
          },
          missing: {
            $sum: {
              $cond: [{ $eq: [{ $type: field }, 'missing'] }, 1, 0]
            }
          },
          minimum: { $min: field },
          maximum: { $max: field },
          average: { $avg: field },
          zero: {
            $sum: {
              $cond: [{ $eq: [field, 0] }, 1, 0]
            }
          },
          positive: {
            $sum: {
              $cond: [{ $gt: [field, 0] }, 1, 0]
            }
          }
        }
      }
    ]).next(),
    collection.find(
      { [field.replace(/^\$/, '')]: { $exists: true } },
      { projection: { title: 1, article_id: 1, relevance_score: 1, average_relevance: 1, cluster_id: 1 } }
    ).limit(5).toArray()
  ]);

  return { summary: summary || { total: 0 }, samples };
}

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from .env');
    }

    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'api' });

    const db = mongoose.connection.db;
    const latest = await summarize(db.collection('latests'), '$relevance_score');
    const embeddedArticles = await summarize(db.collection('news'), '$articles.relevance_score');
    const clusters = await summarize(db.collection('news'), '$average_relevance');

    console.log('\nRELEVANCE SCORE DIAGNOSTICS\n');
    console.log(JSON.stringify({
      database: 'api',
      latestArticles: latest,
      embeddedArticles,
      newsClusters: clusters
    }, null, 2));
  } catch (error) {
    console.error('Relevance diagnostics failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
