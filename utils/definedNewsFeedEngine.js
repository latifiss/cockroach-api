const buildDefinedNewsFeedClusters = async ({
  coreArticles = [],
  freshArticles = [],
  clusterFreshFn,
  formatArticle,
  getRepresentativeTitle,
  getTopKeywords,
}) => {
  if (!Array.isArray(coreArticles) || !Array.isArray(freshArticles)) {
    throw new Error('Expected coreArticles and freshArticles to be arrays');
  }

  const freshClusters = await clusterFreshFn(freshArticles);

  const coreCluster = {
    cluster_id: 0,
    size: coreArticles.length,
    representative_title: 'Top Stories',
    articles: coreArticles.map(formatArticle),
    is_core: true,
    top_keywords: getTopKeywords(coreArticles),
  };

  const formattedFreshClusters = freshClusters.map((cluster, index) => ({
    cluster_id: index + 1,
    size: cluster.length,
    representative_title: getRepresentativeTitle(cluster),
    articles: cluster.map(formatArticle),
    is_core: false,
    top_keywords: getTopKeywords(cluster),
  }));

  return [
    coreCluster,
    ...formattedFreshClusters.sort((a, b) => {
      if (b.size !== a.size) return b.size - a.size;
      const avgA =
        a.articles.reduce((sum, art) => sum + (art.relevance_score || 0), 0) /
        a.size;
      const avgB =
        b.articles.reduce((sum, art) => sum + (art.relevance_score || 0), 0) /
        b.size;
      return avgB - avgA;
    }),
  ];
};

module.exports = {
  buildDefinedNewsFeedClusters,
};
