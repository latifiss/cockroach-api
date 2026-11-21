const Latest = require('../../models/latest.model');
const { generateMetaDescription, generateMetaTitle } = require('../../utils/helpers');
const { createCanonicalArticleSlug } = require('./canonicalArticle');
const { bulkWriteInBatches } = require('../../utils/bulkWrite');
const { createLogger } = require('../../utils/logger');
const { isDeepStrictEqual } = require('node:util');
const { withMongoPersistence } = require('../../utils/mongoPersistenceLimiter');

const logger = createLogger();
const INTELLIGENCE_FIELDS = new Set([
  'title',
  'description',
  'content',
  'published_at',
  'relevance_score',
  'categories',
  'source_id',
  'source_name',
]);

function toLatestDocument(article, existingArticle = null) {
  const title = article.title.trim();
  const slug = article.slug || createCanonicalArticleSlug({ ...article, title });
  const description = article.description || article.summary || '';
  const metaDescription = article.meta_description || generateMetaDescription({ ...article, summary: description });
  const incomingPublishedAt = article.published_at ? new Date(article.published_at) : null;
  const publishedAt = incomingPublishedAt && !Number.isNaN(incomingPublishedAt.getTime())
    ? incomingPublishedAt
    : existingArticle?.published_at || new Date();
  return {
    article_id: article.article_id,
    title,
    description,
    content: article.content || '',
    slug,
    link: article.canonical_url || article.link || '',
    canonical_url: article.canonical_url || '',
    image_url: article.image_url || '',
    has_image: Boolean(article.has_image || article.image_url),
    source_name: article.source_name || 'Unknown source',
    source_id: article.source_id || article.publisher_id || 'unknown',
    publisher_id: article.publisher_id || article.source_id || 'unknown',
    collector_id: article.collector_id || '',
    domain_url: article.domain_url || '',
    source_category: article.source_category || 'News',
    source_credibility: article.source_credibility ?? null,
    source_link: article.source_link || article.canonical_url || article.link || '',
    source_origin: article.source_origin || '',
    source_tags: Array.isArray(article.source_tags) ? article.source_tags : [],
    categories: Array.isArray(article.categories) ? article.categories : [],
    relevance_score: article.relevance_score ?? 1,
    creator: article.creator || '',
    published_at: publishedAt,
    isBreaking: false,
    isFirstParty: false,
    label: '',
    meta: article.meta || metaDescription,
    meta_title: article.meta_title || generateMetaTitle(title),
    meta_description: metaDescription,
  };
}

async function persistLatestArticles(articles, options = {}) {
  if (!Array.isArray(articles)) throw new TypeError('articles must be an array');
  const byArticleId = new Map(
    articles
      .filter((article) => article?.article_id && article?.title)
      .map((article) => [String(article.article_id), article])
  );
  const validArticles = [...byArticleId.values()];
  if (!validArticles.length) return emptyPersistenceResult();

  return withMongoPersistence(async () => {
    const articleIds = validArticles.map((article) => String(article.article_id));
    const projectionFields = [...new Set([
      'article_id',
      ...Object.keys(toLatestDocument(validArticles[0])),
    ])];
    const comparisonStartedAt = Date.now();
    logger.debug('Latest article comparison started', { requestedItems: articleIds.length });
    let existingArticles;
    try {
      existingArticles = await Latest.find({ article_id: { $in: articleIds } })
        .select(projectionFields.join(' '))
        .lean();
    } catch (error) {
      logger.error('Latest article comparison failed', {
        durationMs: Date.now() - comparisonStartedAt,
        requestedItems: articleIds.length,
        returnedItems: 0,
        error,
      });
      throw error;
    }
    logger.debug('Latest article comparison completed', {
      durationMs: Date.now() - comparisonStartedAt,
      requestedItems: articleIds.length,
      returnedItems: existingArticles.length,
    });

    const existingById = new Map(
      existingArticles.map((article) => [String(article.article_id), article])
    );
    const operations = [];
    const newArticleIds = [];
    const materiallyChangedArticleIds = [];
    let metadataUpdated = 0;
    let unchanged = 0;

    for (const article of validArticles) {
      const articleId = String(article.article_id);
      const existingArticle = existingById.get(articleId);
      const document = toLatestDocument(article, existingArticle);
      if (!existingArticle) {
        newArticleIds.push(articleId);
      } else {
        const changedFields = Object.keys(document).filter(
          (field) => !isDeepStrictEqual(document[field], existingArticle[field])
        );
        if (!changedFields.length) {
          unchanged += 1;
          continue;
        }
        if (changedFields.some((field) => INTELLIGENCE_FIELDS.has(field))) {
          materiallyChangedArticleIds.push(articleId);
        } else {
          metadataUpdated += 1;
        }
      }

      operations.push({
        updateOne: {
          filter: { article_id: articleId },
          update: { $set: document, $setOnInsert: { first_seen_at: new Date() } },
          upsert: true,
        },
      });
    }

    if (!operations.length) {
      const result = { ...emptyPersistenceResult(), checked: validArticles.length, unchanged };
      logger.debug('Latest article persistence completed', {
        attempted: 0,
        batches: 0,
        upserted: 0,
        modified: 0,
        checked: result.checked,
        unchanged: result.unchanged,
      });
      return result;
    }

    logger.debug('Saving latest articles', { count: operations.length, batchSize: options.batchSize || 500 });
    const result = await bulkWriteInBatches(Latest, operations, {
      batchSize: options.batchSize ?? 500,
      maxRetries: options.maxRetries ?? 2,
      retryDelayMs: options.retryDelayMs ?? 500,
      ordered: false,
      onRetry: ({ batch, batches, attempt, error }) => logger.warn('Retrying MongoDB article batch', {
        batch, batches, retry: attempt, error: error.message,
      }),
    });
    const intelligenceArticleIds = [...new Set([...newArticleIds, ...materiallyChangedArticleIds])];
    const persistence = {
      ...result,
      checked: validArticles.length,
      newArticleIds,
      materiallyChangedArticleIds,
      intelligenceArticleIds,
      metadataUpdated,
      unchanged,
    };
    logger.info('Latest article persistence completed', {
      attempted: result.attempted,
      batches: result.batches,
      upserted: result.upserted,
      modified: result.modified,
      newArticles: newArticleIds.length,
      materiallyChanged: materiallyChangedArticleIds.length,
      metadataUpdated,
      unchanged,
    });
    return persistence;
  });
}

function emptyPersistenceResult() {
  return {
    attempted: 0,
    batches: 0,
    upserted: 0,
    modified: 0,
    matched: 0,
    inserted: 0,
    deleted: 0,
    checked: 0,
    newArticleIds: [],
    materiallyChangedArticleIds: [],
    intelligenceArticleIds: [],
    metadataUpdated: 0,
    unchanged: 0,
  };
}

module.exports = { persistLatestArticles, toLatestDocument, emptyPersistenceResult };
