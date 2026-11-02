const crypto = require('crypto');

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

function normalizeArticle(article, source = {}) {
  if (!article || typeof article !== 'object') return null;
  const title = normalizeText(article.title);
  if (!title) return null;

  const sourceId = normalizeText(article.source_id || source.source_id || source.sourceId || source.source_name || source.sourceName);
  const sourceName = normalizeText(article.source_name || source.source_name || source.sourceName);
  const url = canonicalizeUrl(article.link || article.url || article.source_link);
  const titleFingerprint = hash(title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim());
  const identity = article.article_id
    ? `external:${normalizeText(String(article.article_id))}`
    : url
      ? `url:${url}`
      : `source-title:${sourceId || 'unknown'}:${titleFingerprint}`;

  const publishedAt = article.published_at || article.pubDate || article.publishedAt || null;
  const parsedDate = publishedAt ? new Date(publishedAt) : null;

  return {
    article_id: hash(identity),
    identity_key: identity,
    title,
    title_fingerprint: titleFingerprint,
    description: normalizeText(article.description || article.summary),
    content: normalizeText(article.content || article.contentSnippet),
    canonical_url: url,
    link: url || normalizeText(article.link || article.url),
    image_url: normalizeText(article.image_url || article.image || article.thumbnail),
    source_id: sourceId,
    source_name: sourceName,
    source_link: normalizeText(source.source_link || source.sourceLink),
    source_origin: normalizeText(source.source_origin || source.sourceOrigin),
    source_tags: Array.isArray(source.source_tags) ? source.source_tags : [],
    published_at: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    has_image: Boolean(article.image_url || article.image || article.thumbnail),
  };
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
  canonicalizeUrl,
  deduplicateCanonicalArticles,
  normalizeText,
};
