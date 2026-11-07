require('dotenv').config();
const { connectDB, mongoose } = require('../db');
const Latest = require('../models/latest.model');
const News = require('../models/news.model');
const SchedulerLease = require('../models/schedulerLease.model');

const LIMIT = 20;
const MAX_TIME_MS = 120000;

async function runCheck(label, operation) {
  process.stdout.write(`🔎 ${label}...\\n`);
  const startedAt = Date.now();
  const result = await operation();
  process.stdout.write(`✅ ${label} completed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s\\n`);
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

  const newsArticlesMissingFromLatest = await runCheck('Check news articles against latest', () => news.aggregate([
    { $unwind: '$articles' },
    {
      $lookup: {
        from: Latest.collection.name,
        localField: 'articles.article_id',
        foreignField: 'article_id',
        as: 'latestMatch',
      },
    },
    { $match: { latestMatch: { $size: 0 } } },
    {
      $project: {
        _id: 0,
        cluster_id: 1,
        article_id: '$articles.article_id',
        title: '$articles.title',
      },
    },
    { $limit: LIMIT },
  ], { allowDiskUse: true, maxTimeMS: MAX_TIME_MS }).toArray());

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
      newsArticlesWithoutMatchingLatestRecord: newsArticlesMissingFromLatest,
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
    newsArticlesMissingFromLatest.length +
    emptyClusters;

  return { report, issueCount };
}

async function main() {
  try {
    await connectDB({ socketTimeoutMS: 180000, maxPoolSize: 3 });
    const { report, issueCount } = await collectIntegrityReport();
    process.stdout.write('\\n🧪 NEWS DATABASE INTEGRITY REPORT\\n');
    process.stdout.write(JSON.stringify(report, null, 2));
    process.stdout.write('\\n\\n');
    if (issueCount > 0) {
      process.stdout.write(`⚠️ Potential integrity issues found in the returned checks: ${issueCount}\\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write('✅ No integrity issues found by these checks.\\n');
    }
  } catch (error) {
    process.stderr.write(`❌ Integrity diagnostic failed: ${error.stack || error.message}\\n`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
