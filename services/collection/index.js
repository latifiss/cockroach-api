const newsSources = require('../../sourcesIndex');
const { loadRuntimeConfig } = require('../../config/runtime');
const { createSourceRegistry } = require('./sourceRegistry');
const { runCollection } = require('./collectionOrchestrator');
const { normalizeArticle, deduplicateCanonicalArticles } = require('../articles/canonicalArticle');
const { createLogger } = require('../../utils/logger');

const registry = createSourceRegistry(newsSources);
const logger = createLogger({ pretty: true });

function withCleanScraperErrors(callback) {
  const originalError = console.error;
  console.error = (...args) => {
    const message = String(args[0] ?? '');
    if (/^(Error fetching|Failed to fetch|Error parsing|Error extracting)/i.test(message)) return;
    originalError(...args);
  };

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      console.error = originalError;
    });
}

function formatDuration(durationMs) {
  return durationMs < 1000
    ? `${durationMs}ms`
    : `${(durationMs / 1000).toFixed(1)}s`;
}

function logCollectionSummary(run) {
  logger.info('SOURCE RESULTS');

  for (const result of run.results) {
    const duration = formatDuration(result.durationMs);
    if (result.status === 'failed') {
      logger.warn(`✖ ${result.sourceName} | ${result.error?.code || 'SOURCE_FETCH_FAILED'} | ${result.error?.message || 'Source collection failed'} | ${result.attempts} attempt(s) | ${duration}`);
      continue;
    }

    if (result.articleCount === 0) {
      logger.warn(`⚠ ${result.sourceName} | No articles returned | ${duration}`);
      continue;
    }

    logger.info(`✔ ${result.sourceName} | ${result.articleCount} articles | ${duration}`);
  }

  logger.info('COLLECTION SUMMARY', {
    successful: run.succeededCount,
    failed: run.failedCount,
    empty: run.results.filter((item) => item.status === 'succeeded' && item.articleCount === 0).length,
    articles: run.articleCount,
    duration: formatDuration(run.durationMs),
  });
}

async function collectCanonicalArticles(options = {}) {
  const config = loadRuntimeConfig();
  logger.info('NEWS COLLECTION STARTED');
  logger.info('Registered sources', { count: registry.length });

  const run = await withCleanScraperErrors(() => runCollection(registry, {
    concurrency: options.concurrency ?? config.collectionConcurrency,
    timeoutMs: options.timeoutMs ?? config.collectionTimeoutMs,
    retryAttempts: options.retryAttempts ?? config.collectionRetryAttempts,
    retryDelayMs: options.retryDelayMs ?? config.collectionRetryDelayMs,
  }));

  logCollectionSummary(run);
  const articles = [];
  for (const result of run.results) {
    if (result.status !== 'succeeded') continue;
    for (const article of result.articles) {
      const normalized = normalizeArticle(article, result.source);
      if (normalized) articles.push(normalized);
    }
  }

  const normalizedArticles = deduplicateCanonicalArticles(articles);
  logger.info(`✔ Articles normalized | ${normalizedArticles.length} unique articles`);
  return { ...run, articles: normalizedArticles };
}

module.exports = { collectCanonicalArticles, sourceRegistry: registry, logCollectionSummary };
