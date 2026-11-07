require('dotenv').config();
const { connectDB, mongoose } = require('../db');
const Latest = require('../models/latest.model');
const News = require('../models/news.model');
const SchedulerLease = require('../models/schedulerLease.model');

const LIMIT = 20;

async function collectIntegrityReport() {
  const db = mongoose.connection.db;
  const latest = db.collection(Latest.collection.name);
  const news = db.collection(News.collection.name);
  const leases = db.collection(SchedulerLease.collection.name);

  const [
    latestCount,
    newsCount,
    latestMissingSlugs,
    newsMissingSlugs,
    duplicateLatestArticleIds,
    duplicateClusterMembership,
    duplicateNewsSlugOwnership,
    newsArticlesMissingFromLatest,
    emptyClusters,
    newsIndexes,
    latestIndexes,
    schedulerLease,
  ] = await Promise.all([
    latest.countDocuments(),
    news.countDocuments(),
    latest.countDocuments({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' },
        { slug: /^\\s*$/ },
      ],
    }),
    news.aggregate([
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
    ]).toArray(),
    latest.aggregate([
      { $group: { _id: '$article_id', count: { $sum: 1 } } },
      { $match: { _id: { $nin: [null, ''] }, count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: LIMIT },
    ]).toArray(),
    news.aggregate([
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
    ], { allowDiskUse: true }).toArray(),
    news.aggregate([
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
    ], { allowDiskUse: true }).toArray(),
    news.aggregate([
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
    ], { allowDiskUse: true }).toArray(),
    news.countDocuments({ articles: { $size: 0 } }),
    news.indexes(),
    latest.indexes(),
    leases.findOne({ _id: 'news-intelligence-pipeline' }),
  ]);

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
    await connectDB();
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
