const keywordRelevance = require('./keywordRelevance');

// Deduplicate articles based on article_id or title+source
function deduplicateArticles(articles) {
  const uniqueMap = new Map();

  articles.forEach((article) => {
    const key = article.article_id || `${article.title}-${article.source_name}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, article);
    }
  });

  return Array.from(uniqueMap.values());
}

// Get category suggestions when no articles found
function getCategorySuggestions(allArticles, searchCategory) {
  const allCategories = new Set();

  allArticles.forEach((article) => {
    if (article.category) allCategories.add(article.category);
    if (article.source_tags) {
      article.source_tags.forEach((tag) => allCategories.add(tag));
    }
  });

  return Array.from(allCategories)
    .filter((cat) => cat.toLowerCase().includes(searchCategory))
    .slice(0, 5);
}

// Get representative title from cluster (now considers relevance)
function getRepresentativeTitle(cluster) {
  if (!cluster.length) return '';

  // Find article with highest relevance score
  const topArticle = cluster.reduce((prev, current) =>
    prev.relevance_score > current.relevance_score ? prev : current
  );

  return topArticle.title;
}

// Extract top keywords from article set
function getTopKeywords(articles, count = 5) {
  const keywordCounts = {};

  articles.forEach((article) => {
    // Count keywords from article's keyword list
    if (article.keywords) {
      article.keywords.forEach((kw) => {
        if (keywordRelevance[kw]) {
          // Only count if in our relevance list
          keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
        }
      });
    }

    // Also count keywords found in title/description
    const text = `${article.title || ''} ${
      article.description || ''
    }`.toLowerCase();
    for (const [keyword] of Object.entries(keywordRelevance)) {
      if (text.includes(keyword.toLowerCase())) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }
  });

  // Sort by frequency and return top ones
  return Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([keyword, count]) => ({ keyword, count }));
}

module.exports = {
  deduplicateArticles,
  getCategorySuggestions,
  getRepresentativeTitle,
  getTopKeywords,
};
