const crypto = require('crypto');
const { generateSlug, generateMetaDescription } = require('../../utils/helpers');
const { getRepresentativeTitle } = require('../../utils/representativeTitle');
const { bulkWriteInBatches } = require('../../utils/bulkWrite');

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
  const identity = String(article.article_id);
  return `${generateSlug(article.title) || 'article'}-${identity.slice(0, 24)}`;
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

async function persistNewsClusters(News, clusters, options = {}) {
  if (!News || typeof News.find !== 'function' || typeof News.bulkWrite !== 'function') {
    throw new TypeError('A News model is required');
  }
  if (!Array.isArray(clusters)) throw new TypeError('clusters must be an array');

  const prepared = prepareClusters(clusters);
  const articleIds = prepared.flatMap((cluster) => cluster.articles.map((article) => article.article_id));
  if (!articleIds.length) {
    return { attempted: 0, batches: 0, upserted: 0, modified: 0, detached: 0, removed: 0 };
  }

  const existingQuery = News.find({ 'articles.article_id': { $in: articleIds } });
  const existingDocuments = typeof existingQuery.lean === 'function'
    ? await existingQuery.lean()
    : await existingQuery;
  const incomingIds = new Set(articleIds);
  const detachOperations = [];
  const emptyDocumentIds = [];
  let detached = 0;

  for (const document of existingDocuments) {
    const existingArticles = Array.isArray(document.articles) ? document.articles : [];
    const remainingArticles = existingArticles.filter(
      (article) => !incomingIds.has(String(article.article_id))
    );
    const removedCount = existingArticles.length - remainingArticles.length;
    if (!removedCount) continue;
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
            representative_title: getRepresentativeTitle(remainingArticles) || remainingArticles[0].title,
            average_relevance: Number((relevanceTotal / remainingArticles.length).toFixed(3)),
          },
        },
      },
    });
  }

  if (detachOperations.length) {
    await bulkWriteInBatches(News, detachOperations, {
      batchSize: options.batchSize ?? 100,
      maxRetries: options.maxRetries ?? 2,
      retryDelayMs: options.retryDelayMs ?? 500,
      ordered: false,
    });
  }

  let removed = 0;
  if (emptyDocumentIds.length) {
    const result = await News.deleteMany({
      _id: { $in: emptyDocumentIds },
      articles: { $size: 0 },
    });
    removed = result.deletedCount || 0;
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

  return { ...result, detached, removed };
}

module.exports = {
  persistNewsClusters,
  prepareClusters,
  stableClusterId,
  createArticleSlug,
};
