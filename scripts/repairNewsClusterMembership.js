require('dotenv').config();
const { connectDB, mongoose } = require('../db');
const News = require('../models/news.model');
const { getRepresentativeTitle } = require('../utils/representativeTitle');

function articleCompleteness(article) {
  return ['title', 'description', 'content', 'image_url', 'canonical_url', 'published_at', 'slug']
    .reduce((score, field) => score + (article?.[field] ? 1 : 0), 0);
}

function compareOccurrences(left, right) {
  const completenessDifference = articleCompleteness(right.article) - articleCompleteness(left.article);
  if (completenessDifference) return completenessDifference;

  const leftArticleDate = new Date(left.article.updatedAt || left.article.published_at || 0).getTime();
  const rightArticleDate = new Date(right.article.updatedAt || right.article.published_at || 0).getTime();
  if (leftArticleDate !== rightArticleDate) return rightArticleDate - leftArticleDate;

  const leftDocumentDate = new Date(left.document.updatedAt || left.document.createdAt || 0).getTime();
  const rightDocumentDate = new Date(right.document.updatedAt || right.document.createdAt || 0).getTime();
  if (leftDocumentDate !== rightDocumentDate) return rightDocumentDate - leftDocumentDate;

  return String(left.document.cluster_id || left.document._id)
    .localeCompare(String(right.document.cluster_id || right.document._id));
}

async function buildRepairPlan(documents) {
  const occurrencesByArticleId = new Map();

  documents.forEach((document) => {
    (document.articles || []).forEach((article, index) => {
      if (!article?.article_id) return;
      const articleId = String(article.article_id);
      if (!occurrencesByArticleId.has(articleId)) occurrencesByArticleId.set(articleId, []);
      occurrencesByArticleId.get(articleId).push({ document, article, index });
    });
  });

  const keepByArticleId = new Map();
  const duplicateArticleIds = [];
  let duplicateOccurrences = 0;

  for (const [articleId, occurrences] of occurrencesByArticleId) {
    if (occurrences.length < 2) continue;
    occurrences.sort(compareOccurrences);
    keepByArticleId.set(articleId, occurrences[0]);
    duplicateArticleIds.push({
      article_id: articleId,
      occurrences: occurrences.length,
      clusters: [...new Set(occurrences.map(({ document }) => String(document.cluster_id)))],
      keptCluster: String(occurrences[0].document.cluster_id),
    });
    duplicateOccurrences += occurrences.length - 1;
  }

  const updates = [];
  const emptyDocumentIds = [];
  let removedOccurrences = 0;

  for (const document of documents) {
    const originalArticles = document.articles || [];
    const retainedArticles = [];
    const seenInDocument = new Set();

    originalArticles.forEach((article, index) => {
      const articleId = article?.article_id ? String(article.article_id) : null;
      if (!articleId) {
        retainedArticles.push(article);
        return;
      }

      const keeper = keepByArticleId.get(articleId);
      if (keeper && (String(keeper.document._id) !== String(document._id) || keeper.index !== index)) {
        removedOccurrences += 1;
        return;
      }

      if (seenInDocument.has(articleId)) {
        removedOccurrences += 1;
        return;
      }
      seenInDocument.add(articleId);
      retainedArticles.push(article);
    });

    if (retainedArticles.length === originalArticles.length) continue;

    if (!retainedArticles.length) {
      emptyDocumentIds.push(document._id);
      continue;
    }

    const relevanceTotal = retainedArticles.reduce(
      (sum, article) => sum + (Number(article.relevance_score) || 0),
      0
    );

    updates.push({
      updateOne: {
        filter: { _id: document._id },
        update: {
          $set: {
            articles: retainedArticles,
            size: retainedArticles.length,
            representative_title: getRepresentativeTitle(retainedArticles) || retainedArticles[0].title || '',
            average_relevance: Number((relevanceTotal / retainedArticles.length).toFixed(3)),
          },
        },
      },
    });
  }

  const alreadyEmptyIds = documents
    .filter((document) => !Array.isArray(document.articles) || document.articles.length === 0)
    .map((document) => document._id);
  const deleteIds = [...new Set([...emptyDocumentIds, ...alreadyEmptyIds].map(String))];

  return {
    duplicateArticleIds,
    duplicateArticleIdCount: duplicateArticleIds.length,
    duplicateOccurrences,
    removedOccurrences,
    documentsToUpdate: updates.length,
    documentsToDelete: deleteIds.length,
    deleteIds,
    updates,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');

  try {
    await connectDB({ maxPoolSize: 3 });
    process.stdout.write('🔎 Loading news clusters for global membership reconciliation...\n');
    const documents = await News.find(
      {},
      { _id: 1, cluster_id: 1, articles: 1, createdAt: 1, updatedAt: 1 }
    ).lean();

    const plan = await buildRepairPlan(documents);
    process.stdout.write('\n🧪 CLUSTER MEMBERSHIP REPAIR PLAN\n');
    process.stdout.write(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      clustersScanned: documents.length,
      duplicateArticleIds: plan.duplicateArticleIdCount,
      duplicateOccurrencesToRemove: plan.duplicateOccurrences,
      documentsToUpdate: plan.documentsToUpdate,
      documentsToDelete: plan.documentsToDelete,
      duplicateExamples: plan.duplicateArticleIds.slice(0, 20),
    }, null, 2));
    process.stdout.write('\n');

    if (!apply) {
      process.stdout.write('\nℹ️ Dry run only. No database records were changed. Review the plan, then run npm run repair:cluster-membership -- --apply to apply it.\n');
      return;
    }

    if (plan.deleteIds.length) {
      const deletion = await News.deleteMany({ _id: { $in: plan.deleteIds } });
      process.stdout.write(`🗑️ Deleted empty clusters: ${deletion.deletedCount || 0}\n`);
    }

    if (plan.updates.length) {
      const result = await News.bulkWrite(plan.updates, { ordered: false });
      process.stdout.write(`🧹 Updated clusters: ${result.modifiedCount || 0}\n`);
    }

    process.stdout.write(`✅ Repair completed. Duplicate article occurrences removed: ${plan.removedOccurrences}\n`);
  } catch (error) {
    process.stderr.write(`❌ Cluster membership repair failed: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) main();

module.exports = { buildRepairPlan };
