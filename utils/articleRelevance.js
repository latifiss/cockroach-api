const keywordRelevance = require('./keywordRelevance');

function normalizeForMatching(value) {
  return ` ${String(value || '').toLocaleLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, ' ').trim()} `;
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
    { text: normalizeForMatching((article.categories || []).join(' ')), multiplier: 1 },
    { text: normalizeForMatching((article.source_tags || []).join(' ')), multiplier: 1 },
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
