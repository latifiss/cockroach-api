const newsSources = require('../../sourcesIndex');
const { loadRuntimeConfig } = require('../../config/runtime');
const { createSourceRegistry } = require('./sourceRegistry');
const { runCollection } = require('./collectionOrchestrator');
const { normalizeArticle, deduplicateCanonicalArticles } = require('../articles/canonicalArticle');

const registry = createSourceRegistry(newsSources);

async function collectCanonicalArticles(options = {}) {
  const config = loadRuntimeConfig();
  const run = await runCollection(registry, {
    concurrency: options.concurrency ?? config.collectionConcurrency,
    timeoutMs: options.timeoutMs ?? config.collectionTimeoutMs,
    retryAttempts: options.retryAttempts ?? config.collectionRetryAttempts,
    retryDelayMs: options.retryDelayMs ?? config.collectionRetryDelayMs,
  });

  const articles = [];
  for (const result of run.results) {
    if (result.status !== 'succeeded') continue;
    for (const article of result.articles) {
      const normalized = normalizeArticle(article, result.source);
      if (normalized) articles.push(normalized);
    }
  }

  return {
    ...run,
    articles: deduplicateCanonicalArticles(articles),
  };
}

module.exports = { collectCanonicalArticles, sourceRegistry: registry };
