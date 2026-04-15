function getTopKeywords(articles, count = 5) {
  const keywordCounts = {};

  articles.forEach((article) => {
    if (article.keywords) {
      article.keywords.forEach((kw) => {
        if (keywordRelevance[kw]) {
          keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
        }
      });
    }

    const text = `${article.title || ''} ${
      article.description || ''
    }`.toLowerCase();
    for (const [keyword] of Object.entries(keywordRelevance)) {
      if (text.includes(keyword.toLowerCase())) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }
  });

  return Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([keyword, count]) => ({ keyword, count }));
}

module.exports = { getTopKeywords };
