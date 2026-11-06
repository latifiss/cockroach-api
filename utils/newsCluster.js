let extractorPromise;

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < vecA.length; index += 1) {
    dot += vecA[index] * vecB[index];
    normA += vecA[index] * vecA[index];
    normB += vecB[index] * vecB[index];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dot / denominator : 0;
}

function clusterArticles(articles, embeddings, threshold = 0.5) {
  const clusters = [];
  const used = new Set();

  for (let index = 0; index < articles.length; index += 1) {
    if (used.has(index)) continue;
    const cluster = [articles[index]];
    const sources = new Set([articles[index].source_id || articles[index].source_name]);
    used.add(index);

    for (let candidate = 0; candidate < articles.length; candidate += 1) {
      if (candidate === index || used.has(candidate)) continue;
      const source = articles[candidate].source_id || articles[candidate].source_name;
      if (sources.has(source)) continue;
      if (cosineSimilarity(embeddings[index], embeddings[candidate]) >= threshold) {
        cluster.push(articles[candidate]);
        sources.add(source);
        used.add(candidate);
      }
    }
    clusters.push(cluster);
  }

  return clusters.sort((left, right) => right.length - left.length);
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import('@xenova/transformers')
      .then(({ pipeline }) => pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'))
      .catch((error) => {
        extractorPromise = null;
        throw error;
      });
  }
  return extractorPromise;
}

function preprocessText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function clusterNewsArticles(articles, threshold = 0.7) {
  if (!Array.isArray(articles) || articles.length === 0) return [];
  try {
    const extractor = await getExtractor();
    const embeddings = [];
    const batchSize = 32;

    for (let start = 0; start < articles.length; start += batchSize) {
      const batch = articles.slice(start, start + batchSize);
      const batchEmbeddings = await Promise.all(batch.map(async (article) => {
        const text = preprocessText(`${article.title || ''} ${article.description || ''}`);
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return output.data;
      }));
      embeddings.push(...batchEmbeddings);
    }

    return clusterArticles(articles, embeddings, threshold);
  } catch (error) {
    console.error('Clustering failed:', error);
    return articles.map((article) => [article]);
  }
}

module.exports = {
  clusterNewsArticles,
  _test: { cosineSimilarity, clusterArticles, preprocessText },
};
