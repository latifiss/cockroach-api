const Latest = require('../../models/latest.model');
const { generateSlug, generateMetaDescription, generateMetaTitle } = require('../../utils/helpers');
const { bulkWriteInBatches } = require('../../utils/bulkWrite');
const { createLogger } = require('../../utils/logger');

const logger = createLogger();

function toLatestDocument(article) {
  const title = article.title.trim();
  const slug = `${generateSlug(title) || 'article'}-${article.article_id.slice(0, 12)}`;
  const description = article.description || article.summary || '';
  const metaDescription = article.meta_description || generateMetaDescription({ ...article, summary: description });
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
    published_at: article.published_at || new Date(),
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
  if (articles.length === 0) return { attempted: 0, batches: 0, upserted: 0, modified: 0 };
  const documents = articles.filter((article) => article?.article_id && article?.title).map(toLatestDocument);
  if (!documents.length) return { attempted: 0, batches: 0, upserted: 0, modified: 0 };

  const operations = documents.map((document) => ({
    updateOne: {
      filter: { article_id: document.article_id },
      update: { $set: document, $setOnInsert: { first_seen_at: new Date() } },
      upsert: true,
    },
  }));

  logger.info('Saving latest articles', { count: operations.length, batchSize: options.batchSize || 500 });
  const result = await bulkWriteInBatches(Latest, operations, {
    batchSize: options.batchSize ?? 500,
    maxRetries: options.maxRetries ?? 2,
    retryDelayMs: options.retryDelayMs ?? 500,
    ordered: false,
    onRetry: ({ batch, batches, attempt, error }) => logger.warn('Retrying MongoDB article batch', {
      batch, batches, retry: attempt, error: error.message,
    }),
  });
  logger.info('Latest article persistence completed', {
    attempted: result.attempted, batches: result.batches, upserted: result.upserted, modified: result.modified,
  });
  return result;
}

module.exports = { persistLatestArticles, toLatestDocument };
