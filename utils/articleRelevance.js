const keywordRelevance = require('./keywordRelevance');

function toSearchableText(value, depth = 0) {
  if (value == null || depth > 3) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSearchableText(item, depth + 1)).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    return ['name', 'label', 'value', 'slug', 'title', 'category', 'tag']
      .map((key) => toSearchableText(value[key], depth + 1))
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

function normalizeForMatching(value) {
  return \` \${toSearchableText(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} \`;
}

const entries = Object.entries(keywordRelevance)
  .map(([keyword, weight]) => ({
    keyword: normalizeForMatching(keyword),
    weight: Number(weight),
  }))
  .filter((entry) => entry.keyword.trim() && Number.isFinite(entry.weight) && entry.weight > 0);

function scoreArticleRelevance(article) {
  const fields = [
    { text: normalizeForMatching(article.title), multiplier: 2 },
    { text: normalizeForMatching(article.description || article.summary), multiplier: 1 },
    { text: normalizeForMatching(article.content), multiplier: 0.5 },
    { text: normalizeForMatching(article.categories), multiplier: 1 },
    { text: normalizeForMatching(article.source_tags), multiplier: 1 },
  ];

  let score = 1;
  for (const entry of entries) {
    const multiplier = fields.reduce(
      (total, field) => total + (field.text.includes(entry.keyword) ? field.multiplier : 0),
      0
    );
    if (multiplier) score += entry.weight * multiplier;
  }

  return Number(Math.min(100, score).toFixed(2));
}

function scoreArticlesRelevance(articles) {
  return articles.map((article) => ({
    ...article,
    relevance_score: scoreArticleRelevance(article),
  }));
}

module.exports = { scoreArticleRelevance, scoreArticlesRelevance };
