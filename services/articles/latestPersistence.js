const Latest = require('../../models/latest.model');
const { generateSlug, generateMetaDescription, generateMetaTitle } = require('../../utils/helpers');

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
    image_url: article.image_url || '',
    has_image: Boolean(article.has_image || article.image_url),
    source_name: article.source_name || 'Unknown source',
    source_id: article.source_id || 'unknown',
    source_link: article.source_link || article.canonical_url || article.link || '',
    source_origin: article.source_origin || '',
    source_tags: Array.isArray(article.source_tags) ? article.source_tags : [],
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

async function persistLatestArticles(articles) {
  if (!Array.isArray(articles)) throw new TypeError('articles must be an array');
  if (articles.length === 0) return { attempted: 0, upserted: 0, modified: 0 };
  const documents = articles.filter((article) => article?.article_id && article?.title).map(toLatestDocument);
  if (!documents.length) return { attempted: 0, upserted: 0, modified: 0 };

  const operations = documents.map((document) => ({
    updateOne: {
      filter: { article_id: document.article_id },
      update: {
        $set: document,
        $setOnInsert: { first_seen_at: new Date() },
      },
      upsert: true,
    },
  }));
  const result = await Latest.bulkWrite(operations, { ordered: false });
  return {
    attempted: documents.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  };
}

module.exports = { persistLatestArticles, toLatestDocument };
