function createIntelligenceArticleQueue() {
  const articleIds = new Set();

  return {
    add(ids) {
      let added = 0;
      for (const id of ids) {
        if (id === undefined || id === null || id === '') continue;
        const key = String(id);
        if (articleIds.has(key)) continue;
        articleIds.add(key);
        added += 1;
      }
      return added;
    },
    take() {
      const queuedIds = [...articleIds];
      articleIds.clear();
      return queuedIds;
    },
    get size() {
      return articleIds.size;
    },
  };
}

module.exports = { createIntelligenceArticleQueue };
