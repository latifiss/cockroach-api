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
    let clustersWithRepairs = 0;
    let embeddedArticlesRepaired = 0;
    let missingLatestMatches = 0;
    let batchNumber = 0;

    while (await cursor.hasNext()) {
      const clusters = [];

      while (clusters.length < BATCH_SIZE && await cursor.hasNext()) {
        clusters.push(await cursor.next());
      }

      batchNumber += 1;
      clustersScanned += clusters.length;

      const articleIds = [
        ...new Set(
          clusters.flatMap((cluster) =>
            (Array.isArray(cluster.articles) ? cluster.articles : [])
              .filter((article) =>
                article?.article_id && typeof article.relevance_score !== 'number'
              )
              .map((article) => article.article_id)
          )
        ),
      ];

      if (!articleIds.length) {
        console.log(`Scanned ${clustersScanned} clusters (batch ${batchNumber}); no matching article IDs in this batch.`);
        continue;
      }

      const latestArticles = await latest.find(
        { article_id: { $in: articleIds } },
        { projection: { _id: 0, article_id: 1, relevance_score: 1 } }
      ).toArray();

      const scoresById = new Map(
        latestArticles
          .filter((article) => Number.isFinite(article.relevance_score))
          .map((article) => [article.article_id, article.relevance_score])
      );

      const operations = [];

      for (const cluster of clusters) {
        const articles = Array.isArray(cluster.articles) ? cluster.articles : [];
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

        clustersWithRepairs += 1;
        embeddedArticlesRepaired += repairedInCluster;

        const averageRelevance = updatedArticles.length
          ? Number((
              updatedArticles.reduce(
                (sum, article) => sum + (Number(article.relevance_score) || 0),
                0
              ) / updatedArticles.length
            ).toFixed(3))
          : 0;

        operations.push({
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
      }

      if (apply && operations.length) {
        const result = await news.bulkWrite(operations, { ordered: false });
        clustersUpdated += result.modifiedCount || 0;
      }

      console.log(
        `Scanned ${clustersScanned} clusters; ${clustersWithRepairs} clusters contain repairs; ${embeddedArticlesRepaired} embedded articles can be repaired.`
      );
    }

    console.log(JSON.stringify({
      database: 'api',
      mode: apply ? 'APPLY' : 'DRY RUN',
      clustersScanned,
      clustersWithRepairs,
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
