// Cosine similarity (optimized)
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dot / denominator : 0;
}

// Improved clustering logic with one-article-per-source constraint
function clusterArticles(articles, embeddings, threshold = 0.5) {
  const clusters = [];
  const used = new Set();

  for (let i = 0; i < articles.length; i++) {
    if (used.has(i)) continue;

    const cluster = [articles[i]];
    const sourcesInCluster = new Set([articles[i].source_name]);
    used.add(i);

    for (let j = 0; j < articles.length; j++) {
      if (i === j || used.has(j)) continue;

      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      const sourceAlreadyInCluster = sourcesInCluster.has(
        articles[j].source_name
      );

      if (sim >= threshold && !sourceAlreadyInCluster) {
        cluster.push(articles[j]);
        used.add(j);
        sourcesInCluster.add(articles[j].source_name);
      }
    }

    if (cluster.length > 0) {
      clusters.push(cluster);
    }
  }

  // Sort clusters by size (largest first)
  clusters.sort((a, b) => b.length - a.length);
  return clusters;
}

// Enhanced main function with text preprocessing
async function clusterNewsArticles(articles, threshold = 0.7) {
  const { pipeline } = await import('@xenova/transformers');

  try {
    const extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );

    // Preprocess and embed articles in parallel
    const embeddingPromises = articles.map(async (article) => {
      const text = preprocessText(
        `${article.title || ''} ${article.description || ''}`
      );
      const output = await extractor(text, {
        pooling: 'mean',
        normalize: true,
      });
      return output.data;
    });

    // Wait for all embeddings to complete
    const embeddings = await Promise.all(embeddingPromises);

    return clusterArticles(articles, embeddings, threshold);
  } catch (error) {
    console.error('Clustering failed:', error);
    // Fallback: return each article in its own cluster
    return articles.map((article) => [article]);
  }
}

// Basic text preprocessing
function preprocessText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

module.exports = {
  clusterNewsArticles,
  _test: {
    cosineSimilarity,
    clusterArticles,
  },
};
