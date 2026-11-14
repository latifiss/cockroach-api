require('dotenv').config();

const mongoose = require('mongoose');

const BATCH_SIZE = 100;

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from .env');

  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'api' });

  try {
    const db = mongoose.connection.db;
    const news = db.collection('news');
    const latest = db.collection('latests');
    const cursor = news.find({
      articles: { $elemMatch: { relevance_score: { $exists: false } } },
    }).batchSize(BATCH_SIZE);

    let clustersScanned = 0;
    let clustersUpdated = 0;
    let embeddedArticlesRepaired = 0;
    let missingLatestMatches = 0;
    let pending = [];

    async function flush() {
      if (!pending.length || !apply) {
        pending = [];
        return;
      }

      const result = await news.bulkWrite(pending, { ordered: false });
      clustersUpdated += result.modifiedCount || 0;
      pending = [];
    }

    while (await cursor.hasNext()) {
      const cluster = await cursor.next();
      clustersScanned += 1;

      const articles = Array.isArray(cluster.articles) ? cluster.articles : [];
      const missingArticles = articles.filter((article) =>
        article?.article_id && typeof article.relevance_score !== 'number'
      );

      if (!missingArticles.length) continue;

      const articleIds = missingArticles.map((article) => article.article_id);
      const latestArticles = await latest.find(
        { article_id: { $in: articleIds } },
        { projection: { _id: 0, article_id: 1, relevance_score: 1 } }
      ).toArray();

      const scoresById = new Map(
        latestArticles
          .filter((article) => Number.isFinite(article.relevance_score))
          .map((article) => [article.article_id, article.relevance_score])
      );

      let repairedInCluster = 0;
      const updatedArticles = articles.map((article) => {
        if (typeof article.relevance_score === 'number') return article;
        const score = scoresById.get(article.article_id);
        if (!Number.isFinite(score)) {
          if (article.article_id) missingLatestMatches += 1;
          return article;
        }
        repairedInCluster += 1;
        return { ...article, relevance_score: score };
      });

      if (!repairedInCluster) continue;

      embeddedArticlesRepaired += repairedInCluster;
      const averageRelevance = Number((
        updatedArticles.reduce((sum, article) => sum + (Number(article.relevance_score) || 0), 0) /
        updatedArticles.length
      ).toFixed(3));

      pending.push({
        updateOne: {
          filter: {
            _id: cluster._id,
            articles: { $elemMatch: { relevance_score: { $exists: false } } },
          },
          update: {
            $set: {
              articles: updatedArticles,
              average_relevance: averageRelevance,
            },
          },
        },
      });

      if (pending.length >= BATCH_SIZE) await flush();
    }

    await flush();

    console.log(JSON.stringify({
      database: 'api',
      mode: apply ? 'APPLY' : 'DRY RUN',
      clustersScanned,
      clustersUpdated: apply ? clustersUpdated : 0,
      embeddedArticlesRepaired,
      missingLatestMatches,
      nextStep: apply
        ? 'Run node scripts/checkRelevanceScores.js to verify the repair.'
        : 'Review the counts, then run node scripts/repairEmbeddedRelevanceScores.js --apply to write the changes.',
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Embedded relevance score repair failed:', error);
  process.exitCode = 1;
});
