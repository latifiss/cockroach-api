const crypto = require('crypto');
const { generateMetaDescription } = require('../../utils/helpers');
const { createCanonicalArticleSlug } = require('./canonicalArticle');
const { getRepresentativeTitle } = require('../../utils/representativeTitle');
const { bulkWriteInBatches } = require('../../utils/bulkWrite');
const SchedulerLease = require('../../models/schedulerLease.model');

function articleCompleteness(article) {
  return ['description', 'content', 'image_url', 'canonical_url', 'published_at'].reduce(
    (score, field) => score + (article[field] ? 1 : 0),
    0
  );
}

function stableClusterId(cluster) {
  const identities = cluster.map((article) => String(article.article_id)).sort().join('|');
  return crypto.createHash('sha256').update(identities).digest('hex').slice(0, 32);
}

function createArticleSlug(article) {
  return article.slug || createCanonicalArticleSlug(article);
}

function createLegacyArticleSlug(article, documentId, index) {
  const title = String(article.title || 'legacy-article');
  const source = String(article.source_name || article.source_id || 'unknown-source');
  const identity = article.article_id ? String(article.article_id) : `${documentId}:${index}`;
  const identityHash = crypto.createHash('sha256').update(`${identity}:${documentId}:${index}`).digest('hex').slice(0, 16);
  const { generateSlug } = require('../../utils/helpers');
  return `${generateSlug(title).slice(0, 100) || 'legacy-article'}-${generateSlug(source).slice(0, 40) || 'unknown-source'}-${identityHash}`;
}

function prepareClusters(clusters) {
  const assignedArticles = new Set();
  const prepared = [];

  for (const cluster of clusters) {
    if (!Array.isArray(cluster) || cluster.length === 0) continue;
    const articlesById = new Map();

    for (const article of cluster) {
      if (!article?.article_id || !article?.title) continue;
      const id = String(article.article_id);
      if (assignedArticles.has(id)) continue;
      const existing = articlesById.get(id);
      if (!existing || articleCompleteness(article) > articleCompleteness(existing)) {
        articlesById.set(id, article);
      }
    }

    const sorted = [...articlesById.values()].sort(
      (left, right) => (right.relevance_score || 0) - (left.relevance_score || 0)
    );
    if (!sorted.length) continue;

    for (const article of sorted) assignedArticles.add(String(article.article_id));

    const articles = sorted.map((article, index) => ({
      ...article,
      published_at: article.published_at || new Date(),
      slug: createArticleSlug(article),
      meta: article.meta || generateMetaDescription(article),
      article_type: index === 0 ? 'main' : 'sub',
      isFirstParty: false,
      isBreaking: false,
      has_image: Boolean(article.has_image || article.image_url),
      source_link: article.source_link || article.canonical_url || article.link || '',
      source_tags: article.source_tags || [],
    }));

    prepared.push({
      clusterId: stableClusterId(sorted),
      articles,
      representativeTitle: getRepresentativeTitle(sorted) || sorted[0].title,
      averageRelevance: Number((
        sorted.reduce((sum, article) => sum + (article.relevance_score || 0), 0) / sorted.length
      ).toFixed(3)),
    });
  }

  return prepared;
}

function findIncomingSlugConflicts(prepared) {
  const slugs = new Map();
  for (const cluster of prepared) {
    for (const article of cluster.articles) {
      const existingId = slugs.get(article.slug);
      if (existingId && existingId !== String(article.article_id)) {
        const error = new Error(`Incoming articles generated the same slug: ${article.slug}`);
        error.code = 'NEWS_SLUG_CONFLICT';
        error.slugConflicts = [{ slug: article.slug, articleIds: [existingId, String(article.article_id)] }];
        throw error;
      }
      slugs.set(article.slug, String(article.article_id));
    }
  }
}

function findStoredSlugConflicts(existingDocuments, incomingIds, incomingSlugs) {
  const conflicts = [];
  for (const document of existingDocuments) {
    for (const article of document.articles || []) {
      if (!incomingSlugs.has(article.slug)) continue;
      if (incomingIds.has(String(article.article_id))) continue;
      conflicts.push({
        slug: article.slug,
        existingArticleId: String(article.article_id),
        incomingArticleId: incomingSlugs.get(article.slug),
        clusterId: document.cluster_id,
      });
    }
  }
  return conflicts;
}

async function persistNewsClustersLegacy(News, clusters, options = {}) {
  if (!News || typeof News.find !== 'function' || typeof News.bulkWrite !== 'function') {
    throw new TypeError('A News model is required');
  }
  if (!Array.isArray(clusters)) throw new TypeError('clusters must be an array');

  const rawArticleCount = clusters.reduce(
    (total, cluster) => total + (Array.isArray(cluster) ? cluster.length : 0),
    0
  );
  const prepared = prepareClusters(clusters);
  const articleIds = prepared.flatMap((cluster) => cluster.articles.map((article) => String(article.article_id)));
  const incomingIds = new Set(articleIds);
  const targetClusterByArticleId = new Map(
    prepared.flatMap((cluster) => cluster.articles.map((article) => [String(article.article_id), cluster.clusterId]))
  );
  const incomingSlugs = new Map(
    prepared.flatMap((cluster) => cluster.articles.map((article) => [article.slug, String(article.article_id)]))
  );
  const skipped = rawArticleCount - articleIds.length;

  if (!articleIds.length) {
    return {
      attempted: 0,
      batches: 0,
      upserted: 0,
      modified: 0,
      inserted: 0,
      updated: 0,
      matched: 0,
      skipped,
      detached: 0,
      removed: 0,
    };
  }

  findIncomingSlugConflicts(prepared);

  const existingQuery = News.find({
    $or: [
      { 'articles.article_id': { $in: articleIds } },
      { 'articles.slug': { $in: [...incomingSlugs.keys()] } },
      { 'articles.slug': null },
      { articles: { $size: 0 } },
      { articles: null },
    ],
  });
  const existingDocuments = typeof existingQuery.lean === 'function'
    ? await existingQuery.lean()
    : await existingQuery;

  const slugConflicts = findStoredSlugConflicts(existingDocuments, incomingIds, incomingSlugs);
  if (slugConflicts.length) {
    const error = new Error(
      `News persistence stopped: ${slugConflicts.length} stored article slug conflict(s) belong to different article identities`
    );
    error.code = 'NEWS_SLUG_CONFLICT';
    error.slugConflicts = slugConflicts;
    options.logger?.error('Stored news slug conflict detected; no cluster writes were performed', {
      conflicts: slugConflicts.slice(0, 10),
      conflictCount: slugConflicts.length,
    });
    throw error;
  }

  const detachOperations = [];
  const emptyDocumentIds = [];
  let detached = 0;

  for (const document of existingDocuments) {
    const existingArticles = Array.isArray(document.articles) ? document.articles : [];
    if (!existingArticles.length) {
      emptyDocumentIds.push(document._id);
      continue;
    }
    let repairedCount = 0;
    const normalizedArticles = existingArticles.map((article, index) => {
      if (typeof article.slug === 'string' && article.slug.trim()) return article;
      repairedCount += 1;
      return {
        ...article,
        slug: createLegacyArticleSlug(article, document._id, index),
      };
    });
    const remainingArticles = normalizedArticles.filter((article) => {
      const targetClusterId = targetClusterByArticleId.get(String(article.article_id));
      return !targetClusterId || targetClusterId === document.cluster_id;
    });
    const removedCount = normalizedArticles.length - remainingArticles.length;
    if (!removedCount && !repairedCount) continue;
    detached += removedCount;

    if (!remainingArticles.length) {
      emptyDocumentIds.push(document._id);
      continue;
    }

    const relevanceTotal = remainingArticles.reduce(
      (sum, article) => sum + (Number(article.relevance_score) || 0),
      0
    );

    detachOperations.push({
      updateOne: {
        filter: { _id: document._id },
        update: {
          $set: {
            articles: remainingArticles,
            size: remainingArticles.length,
            representative_title: remainingArticles.length
              ? getRepresentativeTitle(remainingArticles) || remainingArticles[0].title
              : '',
            average_relevance: remainingArticles.length
              ? Number((relevanceTotal / remainingArticles.length).toFixed(3))
              : 0,
          },
        },
      },
    });
  }

  let removed = 0;
  if (emptyDocumentIds.length) {
    const deleteResult = await News.deleteMany({
      _id: { $in: emptyDocumentIds },
    });
    removed = deleteResult.deletedCount || 0;
  }

  if (detachOperations.length) {
    await bulkWriteInBatches(News, detachOperations, {
      batchSize: options.batchSize ?? 100,
      maxRetries: options.maxRetries ?? 2,
      retryDelayMs: options.retryDelayMs ?? 500,
      ordered: false,
    });
  }

  const operations = prepared.map((cluster) => ({
    updateOne: {
      filter: { cluster_id: cluster.clusterId },
      update: {
        $set: {
          cluster_id: cluster.clusterId,
          size: cluster.articles.length,
          representative_title: cluster.representativeTitle,
          average_relevance: cluster.averageRelevance,
          articles: cluster.articles,
        },
      },
      upsert: true,
    },
  }));

  const result = await bulkWriteInBatches(News, operations, {
    batchSize: options.batchSize ?? 100,
    maxRetries: options.maxRetries ?? 2,
    retryDelayMs: options.retryDelayMs ?? 500,
    ordered: false,
    onRetry: ({ batch, batches, attempt, error }) => options.logger?.warn(
      'Retrying MongoDB news-cluster batch',
      { batch, batches, retry: attempt, error: error.message }
    ),
  });

  const persistence = {
    ...result,
    inserted: result.upserted,
    updated: result.modified,
    skipped,
    detached,
    removed,
  };
  options.logger?.info('News cluster reconciliation completed', {
    inserted: persistence.inserted,
    updated: persistence.updated,
    detached: persistence.detached,
    skipped: persistence.skipped,
    removed: persistence.removed,
    attempted: persistence.attempted,
    batches: persistence.batches,
  });

  return persistence;
}


async function persistNewsClustersTransactional(News, prepared, options = {}) {
  const batchSize = options.transactionBatchSize ?? 40;
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new RangeError('transactionBatchSize must be a positive integer');
  if (!options.leaseOwner) {
    const error = new Error('A scheduler lease owner is required for transactional news persistence');
    error.code = 'PIPELINE_LEASE_OWNER_REQUIRED';
    throw error;
  }
  if (!News.db || typeof News.db.startSession !== 'function') {
    throw new Error('MongoDB session support is required for transactional news persistence');
  }

  const batches = [];
  for (let offset = 0; offset < prepared.length; offset += batchSize) batches.push(prepared.slice(offset, offset + batchSize));
  const totals = {
    attempted: prepared.length, batches: batches.length, upserted: 0, modified: 0,
    matched: 0, inserted: 0, deleted: 0, skipped: options.skipped || 0, detached: 0, removed: 0,
  };

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const batchArticleIds = batch.flatMap((cluster) => cluster.articles.map((article) => String(article.article_id)));
    const batchIncomingIds = new Set(batchArticleIds);
    const targetByArticleId = new Map(batch.flatMap((cluster) => cluster.articles.map((article) => [String(article.article_id), cluster.clusterId])));
    const incomingSlugs = new Map(batch.flatMap((cluster) => cluster.articles.map((article) => [article.slug, String(article.article_id)])));
    const session = await News.db.startSession();
    let batchResult;

    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const leaseModel = options.leaseModel || SchedulerLease;
        const leaseResult = await leaseModel.updateOne(
          { _id: 'news-intelligence-pipeline', owner: options.leaseOwner, lease_until: { $gt: now } },
          { $set: { lease_until: new Date(now.getTime() + 5 * 60 * 1000) }, $inc: { lease_revision: 1 } },
          { session }
        );
        if (leaseResult.matchedCount !== 1) {
          const error = new Error('News persistence stopped because scheduler lease ownership was lost');
          error.code = 'PIPELINE_LEASE_LOST';
          throw error;
        }

        const existingDocuments = await News.find({
          $or: [
            { 'articles.article_id': { $in: batchArticleIds } },
            { 'articles.slug': { $in: [...incomingSlugs.keys()] } },
          ],
        }).session(session).lean();

        const slugConflicts = findStoredSlugConflicts(existingDocuments, batchIncomingIds, incomingSlugs);
        if (slugConflicts.length) {
          const error = new Error(`News persistence stopped: ${slugConflicts.length} stored article slug conflict(s) belong to different article identities`);
          error.code = 'NEWS_SLUG_CONFLICT';
          error.slugConflicts = slugConflicts;
          throw error;
        }

        const detachOperations = [];
        const emptyDocumentIds = [];
        let detached = 0;

        for (const document of existingDocuments) {
          const existingArticles = Array.isArray(document.articles) ? document.articles : [];
          if (!existingArticles.length) {
            emptyDocumentIds.push(document._id);
            continue;
          }
          let repairedCount = 0;
          const normalizedArticles = existingArticles.map((article, index) => {
            if (typeof article.slug === 'string' && article.slug.trim()) return article;
            repairedCount += 1;
            return { ...article, slug: createLegacyArticleSlug(article, document._id, index) };
          });
          const remainingArticles = normalizedArticles.filter((article) => {
            const targetClusterId = targetByArticleId.get(String(article.article_id));
            return !targetClusterId || targetClusterId === document.cluster_id;
          });
          const removedCount = normalizedArticles.length - remainingArticles.length;
          if (!removedCount && !repairedCount) continue;
          detached += removedCount;
          if (!remainingArticles.length) {
            emptyDocumentIds.push(document._id);
            continue;
          }
          const relevanceTotal = remainingArticles.reduce((sum, article) => sum + (Number(article.relevance_score) || 0), 0);
          detachOperations.push({
            updateOne: {
              filter: { _id: document._id },
              update: { $set: {
                articles: remainingArticles,
                size: remainingArticles.length,
                representative_title: getRepresentativeTitle(remainingArticles) || remainingArticles[0].title,
                average_relevance: Number((relevanceTotal / remainingArticles.length).toFixed(3)),
              } },
            },
          });
        }

        let removed = 0;
        if (emptyDocumentIds.length) {
          const deletion = await News.deleteMany({ _id: { $in: emptyDocumentIds } }, { session });
          removed = deletion.deletedCount || 0;
        }
        if (detachOperations.length) await News.bulkWrite(detachOperations, { ordered: false, session });

        const upsertOperations = batch.map((cluster) => ({
          updateOne: {
            filter: { cluster_id: cluster.clusterId },
            update: { $set: {
              cluster_id: cluster.clusterId,
              size: cluster.articles.length,
              representative_title: cluster.representativeTitle,
              average_relevance: cluster.averageRelevance,
              articles: cluster.articles,
            } },
            upsert: true,
          },
        }));
        const upsertResult = await News.bulkWrite(upsertOperations, { ordered: false, session });
        batchResult = {
          upserted: upsertResult.upsertedCount || 0,
          modified: upsertResult.modifiedCount || 0,
          matched: upsertResult.matchedCount || 0,
          inserted: upsertResult.insertedCount || 0,
          deleted: upsertResult.deletedCount || 0,
          detached,
          removed,
        };
      }, {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        readPreference: 'primary',
      });
    } finally {
      await session.endSession();
    }

    for (const key of Object.keys(batchResult)) totals[key] += batchResult[key];
    options.logger?.info('News cluster transaction committed', {
      batch: batchIndex + 1, batches: batches.length, clusters: batch.length,
      detached: batchResult.detached, removed: batchResult.removed,
    });
  }

  totals.inserted = totals.upserted;
  totals.updated = totals.modified;
  options.logger?.info('News cluster reconciliation completed', {
    inserted: totals.inserted, updated: totals.updated, detached: totals.detached,
    skipped: totals.skipped, removed: totals.removed, attempted: totals.attempted, batches: totals.batches,
  });
  return totals;
}

async function persistNewsClusters(News, clusters, options = {}) {
  if (!News || typeof News.find !== 'function' || typeof News.bulkWrite !== 'function') {
    throw new TypeError('A News model is required');
  }
  if (!options.leaseOwner) return persistNewsClustersLegacy(News, clusters, options);
  if (!Array.isArray(clusters)) throw new TypeError('clusters must be an array');
  const rawArticleCount = clusters.reduce((total, cluster) => total + (Array.isArray(cluster) ? cluster.length : 0), 0);
  const prepared = prepareClusters(clusters);
  const articleCount = prepared.reduce((total, cluster) => total + cluster.articles.length, 0);
  const skipped = rawArticleCount - articleCount;
  if (!articleCount) {
    return { attempted: 0, batches: 0, upserted: 0, modified: 0, inserted: 0, updated: 0, matched: 0, skipped, detached: 0, removed: 0 };
  }
  findIncomingSlugConflicts(prepared);
  return persistNewsClustersTransactional(News, prepared, { ...options, skipped });
}

module.exports = {
  persistNewsClusters,
  persistNewsClustersLegacy,
  persistNewsClustersTransactional,
  prepareClusters,
  stableClusterId,
  createArticleSlug,
};
