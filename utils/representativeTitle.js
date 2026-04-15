function getRepresentativeTitle(cluster) {
  if (!cluster.length) return '';

  const topArticle = cluster.reduce((prev, current) =>
    prev.relevance_score > current.relevance_score ? prev : current
  );

  return topArticle.title;
}

module.exports = { getRepresentativeTitle };
