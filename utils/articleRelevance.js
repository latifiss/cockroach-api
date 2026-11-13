const keywordRelevance = require('./keywordRelevance');

const entries = Object.entries(keywordRelevance)
  .map(([keyword, weight]) => ({
    keyword,
    weight: Number(weight),
    pattern: new RegExp(`(^|[^\\p{L}\\p{N}])${keyword.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}([^\\p{L}\\p{N}]|$)`, 'iu'),
  }))
  .filter((entry) => entry.keyword && Number.isFinite(entry.weight) && entry.weight > 0);

function scoreArticleRelevance(article) {
  const title = String(article.title || '');
  const description = String(article.description || article.summary || '');
  const content = String(article.content || '');
  const categories = Array.isArray(article.categories) ? article.categories.join(' ') : '';
  const tags = Array.isArray(article.source_tags) ? article.source_tags.join(' ') : '';
  const fields = [
    { text: title, multiplier: 2 },
    { text: description, multiplier: 1 },
    { text: content, multiplier: 0.5 },
    { text: categories, multiplier: 1 },
    { text: tags, multiplier: 1 },
  ];

  let score = 1;
  for (const entry of entries) {
    const multiplier = fields.reduce(
      (total, field) => total + (entry.pattern.test(field.text) ? field.multiplier : 0),
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
