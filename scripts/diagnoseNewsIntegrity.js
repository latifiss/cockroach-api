require('dotenv').config();
const { connectDB, mongoose } = require('../db');
const Latest = require('../models/latest.model');
const News = require('../models/news.model');
const SchedulerLease = require('../models/schedulerLease.model');

const LIMIT = 20;
const MAX_TIME_MS = 120000;

async function runCheck(label, operation) {
  process.stdout.write(`🔎 ${label}...\n`);
  const startedAt = Date.now();
  const result = await operation();
  process.stdout.write(`✅ ${label} completed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s\n`);
  return result;
}

async function collectIntegrityReport() {
  const db = mongoose.connection.db;
  const latest = db.collection(Latest.collection.name);
  const news = db.collection(News.collection.name);
  const leases = db.collection(SchedulerLease.collection.name);

  const latestCount = await runCheck('Count latest documents', () => latest.countDocuments({}, { maxTimeMS: MAX_TIME_MS }));
  const newsCount = await runCheck('Count news clusters', () => news.countDocuments({}, { maxTimeMS: MAX_TIME_MS }));
  const latestMissingSlugs = await runCheck('Check latest slugs', () => latest.countDocuments({
    $or: [
      { slug: { $exists: false } },
      { slug: null },
      { slug: '' },
      { slug: /^\\s*$/ },
    ],
  }, { maxTimeMS: MAX_TIME_MS }));

  const newsMissingSlugs = await runCheck('Check embedded news slugs', () => news.aggregate([
    { $unwind: '$articles' },
    {
      $match: {
        $or: [
          { 'articles.slug': { $exists: false } },
          { 'articles.slug': null },
          { 'articles.slug': '' },
          { 'articles.slug': /^\\s*$/ },
        ],
      },
    },
    { $count: 'count' },
  ], { allowDiskUse: true, maxTimeMS: MAX_TIME_MS }).toArray());

  const duplicateLatestArticleIds = await runCheck('Check duplicate article IDs in latest', () => latest.aggregate([
    { $group: { _id: '$article_id', count: { $sum: 1 } } },
    { $match: { _id: { $nin: [null, ''] }, count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: LIMIT },
  ], { allowDiskUse: true, maxTimeMS: MAX_TIME_MS }).toArray());

  const duplicateClusterMembership = await runCheck('Check articles in multiple clusters', () => news.aggregate([
    { $unwind: '$articles' },
    {
      $group: {
        _id: '$articles.article_id',
        count: { $sum: 1 },
        clusters: { $addToSet: '$cluster_id' },
      },
    },
    { $match: { _id: { $nin: [null, ''] }, count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: LIMIT },
  ], { allowDiskUse: true, maxTimeMS: MAX_TIME_MS }).toArray());

  const duplicateNewsSlugOwnership = await runCheck('Check duplicate slug ownership', () => news.aggregate([
    { $unwind: '$articles' },
    {
      $group: {
        _id: '$articles.slug',
        articleIds: { $addToSet: '$articles.article_id' },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        _id: { $nin: [null, ''] },
        $expr: { $gt: [{ $size: '$articleIds' }, 1] },
      },
    },
    { $sort: { count: -1 } },
    { $limit: LIMIT },
  ], { allowDiskUse: true, maxTimeMS: MAX_TIME_MS }).toArray());

  const newsArticleIds = await runCheck('Collect unique news article IDs', async () => {
    const rows = await news.aggregate([
      { $unwind: '$articles' },
      { $match: { 'articles.article_id': { $nin: [null, ''] } } },
      { $group: { _id: '$articles.article_id' } },
    ], { allowDiskUse: true, maxTimeMS: MAX_TIME_MS }).toArray();
    return rows.map((row) => row._id);
  });

  const latestArticleIds = await runCheck('Compare news IDs with latest records', async () => {
    if (!newsArticleIds.length) return [];
    const found = await latest.distinct('article_id', {
      article_id: { $in: newsArticleIds },
    }, { maxTimeMS: MAX_TIME_MS });
    const foundSet = new Set(found);
    return newsArticleIds
      .filter((articleId) => !foundSet.has(articleId))
      .slice(0, LIMIT)
      .map((article_id) => ({ article_id }));
  });

  const emptyClusters = await runCheck('Check empty clusters', () => news.countDocuments(
    { articles: { $size: 0 } },
    { maxTimeMS: MAX_TIME_MS },
  ));
  const newsIndexes = await runCheck('Read news indexes', () => news.indexes());
  const latestIndexes = await runCheck('Read latest indexes', () => latest.indexes());
  const schedulerLease = await runCheck('Read scheduler lease', () => leases.findOne({ _id: 'news-intelligence-pipeline' }));

  const report = {
    checkedAt: new Date().toISOString(),
    database: mongoose.connection.name,
    collections: {
      latest: { name: Latest.collection.name, documents: latestCount },
      news: { name: News.collection.name, documents: newsCount },
    },
    slugIntegrity: {
      latestDocumentsWithMissingOrBlankSlug: latestMissingSlugs,
      embeddedNewsArticlesWithMissingOrBlankSlug: newsMissingSlugs[0]?.count || 0,
    },
    identityIntegrity: {
      duplicateArticleIdsInLatest: duplicateLatestArticleIds,
      articlesAppearingInMultipleNewsClusters: duplicateClusterMembership,
      slugsAssignedToMultipleArticleIds: duplicateNewsSlugOwnership,
      newsArticlesWithoutMatchingLatestRecord: latestArticleIds,
    },
    clusterIntegrity: {
      emptyNewsClusterDocuments: emptyClusters,
    },
    indexes: {
      latest: latestIndexes.map(({ name, key, unique }) => ({ name, key, unique: Boolean(unique) })),
      news: newsIndexes.map(({ name, key, unique }) => ({ name, key, unique: Boolean(unique) })),
    },
    schedulerLease: schedulerLease
      ? {
          owner: schedulerLease.owner,
          acquiredAt: schedulerLease.acquired_at,
          leaseUntil: schedulerLease.lease_until,
          currentlyActive: schedulerLease.lease_until > new Date(),
        }
      : null,
  };

  const issueCount =
    latestMissingSlugs +
    (newsMissingSlugs[0]?.count || 0) +
    duplicateLatestArticleIds.length +
    duplicateClusterMembership.length +
    duplicateNewsSlugOwnership.length +
    latestArticleIds.length +
    emptyClusters;

  return { report, issueCount };
}

async function main() {
  try {
    await connectDB({ socketTimeoutMS: 180000, maxPoolSize: 3 });
    const { report, issueCount } = await collectIntegrityReport();
    process.stdout.write('\n🧪 NEWS DATABASE INTEGRITY REPORT\n');
    process.stdout.write(JSON.stringify(report, null, 2));
    process.stdout.write('\n\n');
    if (issueCount > 0) {
      process.stdout.write(`⚠️ Potential integrity issues found in the returned checks: ${issueCount}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write('✅ No integrity issues found by these checks.\n');
    }
  } catch (error) {
    process.stderr.write(`❌ Integrity diagnostic failed: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
