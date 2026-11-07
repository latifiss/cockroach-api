require('dotenv').config();
const assert = require('node:assert/strict');
const { connectDB, mongoose } = require('../db');
const News = require('../models/news.model');
const {
  acquirePipelineLease,
  releasePipelineLease,
  getPipelineLeaseOwner,
} = require('../services/operations/schedulerLease');
const { persistNewsClusters } = require('../services/articles/newsPersistence');

const collectionName = 'news_persistence_transaction_smoke';
const modelName = 'NewsPersistenceTransactionSmoke';
let SmokeNews;
let leaseAcquired = false;

function createArticle(articleId, title, sourceName) {
  return {
    article_id: articleId,
    title,
    source_name: sourceName,
    source_id: sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    source_link: `https://example.com/${articleId}`,
    canonical_url: `https://example.com/${articleId}`,
    published_at: new Date(),
    relevance_score: 1,
  };
}

async function readClusters() {
  return SmokeNews.find({}).lean();
}

function countArticleOccurrences(clusters, articleId) {
  return clusters.reduce(
    (count, cluster) => count + (cluster.articles || []).filter(
      (article) => article.article_id === articleId
    ).length,
    0
  );
}

async function run() {
  await connectDB();
  SmokeNews = mongoose.model(modelName, News.schema, collectionName);
  await SmokeNews.init();

  const indexes = await SmokeNews.collection.indexes();
  assert.ok(
    indexes.some((index) => index.name === 'articles.slug_1' && index.unique === true),
    'Temporary collection must have the unique embedded article slug index'
  );
  assert.ok(
    indexes.some((index) => index.name === 'cluster_id_1' && index.unique === true),
    'Temporary collection must have the unique cluster ID index'
  );

  leaseAcquired = await acquirePipelineLease();
  if (!leaseAcquired) {
    const error = new Error('Another pipeline process currently owns the scheduler lease; transaction smoke test was not run');
    error.code = 'PIPELINE_LEASE_HELD';
    throw error;
  }

  const firstArticle = createArticle(
    'transaction-smoke-article-a',
    'Transaction smoke test: first article',
    'Smoke Test Publisher A'
  );
  const secondArticle = createArticle(
    'transaction-smoke-article-b',
    'Transaction smoke test: second article',
    'Smoke Test Publisher B'
  );

  const initial = await persistNewsClusters(SmokeNews, [[firstArticle]], {
    leaseOwner: getPipelineLeaseOwner(),
    transactionBatchSize: 1,
  });
  assert.equal(initial.inserted, 1, 'Initial transaction should insert one cluster');

  let clusters = await readClusters();
  assert.equal(clusters.length, 1, 'Initial persistence should create exactly one cluster');
  assert.equal(countArticleOccurrences(clusters, firstArticle.article_id), 1);

  const moved = await persistNewsClusters(SmokeNews, [[firstArticle, secondArticle]], {
    leaseOwner: getPipelineLeaseOwner(),
    transactionBatchSize: 1,
  });
  assert.equal(moved.inserted, 1, 'Moving the article should create the replacement cluster');
  assert.equal(moved.removed, 1, 'Moving the only article should remove its now-empty old cluster');

  clusters = await readClusters();
  assert.equal(clusters.length, 1, 'The old cluster should be removed after the move');
  assert.equal(countArticleOccurrences(clusters, firstArticle.article_id), 1);
  assert.equal(countArticleOccurrences(clusters, secondArticle.article_id), 1);
  assert.equal(clusters[0].articles.length, 2, 'The replacement cluster should contain both articles');

  const repeated = await persistNewsClusters(SmokeNews, [[firstArticle, secondArticle]], {
    leaseOwner: getPipelineLeaseOwner(),
    transactionBatchSize: 1,
  });
  assert.equal(repeated.inserted, 0, 'Repeating the same reconciliation should not insert another cluster');

  clusters = await readClusters();
  assert.equal(clusters.length, 1, 'Repeated reconciliation should remain idempotent');
  assert.equal(countArticleOccurrences(clusters, firstArticle.article_id), 1);
  assert.equal(countArticleOccurrences(clusters, secondArticle.article_id), 1);

  const slugs = clusters.flatMap((cluster) => cluster.articles.map((article) => article.slug));
  assert.equal(new Set(slugs).size, slugs.length, 'All persisted article slugs should be unique');

  console.log('✅ Atlas transaction smoke test passed');
  console.log(JSON.stringify({
    database: mongoose.connection.name,
    temporaryCollection: collectionName,
    checks: [
      'unique cluster and embedded slug indexes exist',
      'cluster persistence commits inside a MongoDB transaction',
      'moving an article deletes its emptied previous cluster',
      'each article belongs to exactly one cluster',
      'repeated reconciliation is idempotent',
      'article slugs remain unique',
    ],
    finalClusterCount: clusters.length,
    finalArticleCount: clusters.reduce((total, cluster) => total + cluster.articles.length, 0),
  }, null, 2));
}

async function cleanup() {
  if (SmokeNews) {
    await SmokeNews.collection.drop().catch((error) => {
      if (error.codeName !== 'NamespaceNotFound' && error.code !== 26) throw error;
    });
  }
  if (leaseAcquired) await releasePipelineLease();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

run()
  .catch((error) => {
    console.error('❌ Atlas transaction smoke test failed:', error.message);
    if (error.code) console.error('Error code:', error.code);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (error) {
      console.error('❌ Transaction smoke-test cleanup failed:', error.message);
      process.exitCode = 1;
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => {});
    }
  });
