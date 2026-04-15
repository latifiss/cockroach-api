const deduplicateArticles = (articles) => {
  const seen = new Map();
  for (const article of articles) {
    const key = article.article_id || article.link;
    if (!seen.has(key)) {
      seen.set(key, article);
    }
  }
  return Array.from(seen.values());
};

module.exports = { deduplicateArticles };
