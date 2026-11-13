const crypto = require('crypto');
const { generateSlug } = require('../../utils/helpers');

const TRACKING_PARAMETERS = new Set([
  'fbclid', 'gclid', 'dclid', 'mc_cid', 'mc_eid', 'ref', 'ref_src',
]);

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function canonicalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.protocol = 'https:';
    url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMETERS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createCanonicalArticleSlug(article) {
  const title = generateSlug(article.title).slice(0, 100) || 'article';
  const source = generateSlug(article.source_name || article.source_id || 'unknown-source').slice(0, 40) || 'unknown-source';
  const identity = String(article.article_id || hash(`${article.source_id || 'unknown'}:${article.title || ''}`));
  const suffix = /^[a-f0-9]{64}$/i.test(identity) ? identity.slice(0, 16).toLowerCase() : hash(identity).slice(0, 16);
  return `${title}-${source}-${suffix}`;
}

function normalizeArticle(article, source = {}) {
  if (!article || typeof article !== 'object') return null;
  const title = normalizeText(article.title);
  if (!title) return null;

  const sourceId = normalizeText(source.source_id || source.publisher_id || article.source_id || source.source_name || source.sourceName);
  const publisherId = normalizeText(source.publisher_id || source.source_id || article.publisher_id || article.source_id);
  const collectorId = normalizeText(source.collector_id || source.collectorId);
  const sourceName = normalizeText(source.source_name || source.sourceName || article.source_name);
  const url = canonicalizeUrl(article.link || article.url || article.source_link);
  const titleFingerprint = hash(title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim());
  const identity = url
    ? `url:${url}`
    : article.article_id
      ? `external:${sourceId || 'unknown'}:${normalizeText(String(article.article_id))}`
      : `source-title:${sourceId || 'unknown'}:${titleFingerprint}`;

  const publishedAt = article.published_at || article.pubDate || article.publishedAt || null;
  const parsedDate = publishedAt ? new Date(publishedAt) : null;
  const sourceTags = Array.isArray(source.source_tags)
    ? source.source_tags
    : Array.isArray(source.sourceTags)
      ? source.sourceTags
      : Array.isArray(article.source_tags)
        ? article.source_tags
        : [];

  const articleId = hash(identity);
  const normalizedArticle = {
    article_id: articleId,
    identity_key: identity,
    title,
    title_fingerprint: titleFingerprint,
    description: normalizeText(article.description || article.summary),
    content: normalizeText(article.content || article.contentSnippet),
    canonical_url: url,
    link: url || normalizeText(article.link || article.url),
    image_url: normalizeText(article.image_url || article.image || article.thumbnail),
    source_id: sourceId,
    publisher_id: publisherId || sourceId,
    collector_id: collectorId,
    source_name: sourceName,
    domain_url: normalizeText(source.domain_url || source.domainUrl || article.domain_url),
    source_category: normalizeText(source.source_category || source.sourceCategory || article.source_category) || 'News',
    source_credibility: source.source_credibility ?? source.sourceCredibility ?? article.source_credibility ?? null,
    source_link: normalizeText(source.source_link || source.sourceLink || article.source_link),
    source_origin: normalizeText(source.source_origin || source.sourceOrigin || article.source_origin),
    source_tags: sourceTags,
    published_at: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    has_image: Boolean(article.has_image || article.image_url || article.image || article.thumbnail),
    creator: normalizeText(article.creator || source.creator),
    meta: normalizeText(article.meta),
    meta_title: normalizeText(article.meta_title),
    meta_description: normalizeText(article.meta_description),
    relevance_score: Number.isFinite(Number(article.relevance_score)) ? Number(article.relevance_score) : 1,
    categories: Array.isArray(article.categories) ? article.categories : [],
  };
  normalizedArticle.slug = createCanonicalArticleSlug(normalizedArticle);
  return normalizedArticle;
}

function deduplicateCanonicalArticles(articles) {
  const byIdentity = new Map();
  for (const article of articles) {
    if (!article) continue;
    const key = article.identity_key || article.article_id;
    if (!key) continue;
    const existing = byIdentity.get(key);
    if (!existing || completeness(article) > completeness(existing)) {
      byIdentity.set(key, article);
    }
  }
  return [...byIdentity.values()];
}

function completeness(article) {
  return ['description', 'content', 'image_url', 'canonical_url', 'published_at'].reduce(
    (score, field) => score + (article[field] ? 1 : 0),
    0
  );
}

module.exports = {
  normalizeArticle,
  createCanonicalArticleSlug,
  canonicalizeUrl,
  deduplicateCanonicalArticles,
  normalizeText,
};
