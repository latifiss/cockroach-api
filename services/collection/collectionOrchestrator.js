const { mapWithConcurrency } = require('./limitConcurrency');

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function withTimeout(promise, timeoutMs, sourceId) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error(`Source ${sourceId} exceeded ${timeoutMs}ms timeout`);
      error.code = 'SOURCE_TIMEOUT';
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function getSourceMetadata(source) {
  return {
    source_id: source.id,
    source_name: source.name,
    domain_url: source.domain_url,
    source_category: source.source_category,
    source_tags: source.source_tags || [],
    source_origin: source.source_origin || '',
    source_credibility: source.source_credibility ?? null,
  };
}

async function executeSource(source, options) {
  const startedAt = new Date();
  const started = Date.now();
  const metadata = getSourceMetadata(source);
  let lastError;

  for (let attempt = 0; attempt <= options.retryAttempts; attempt += 1) {
    try {
      const payload = await withTimeout(Promise.resolve().then(() => source.fetch()), options.timeoutMs, source.id);
      const articles = Array.isArray(payload?.articles) ? payload.articles : [];
      return {
        sourceId: source.id,
        sourceName: source.name || payload?.source_name || source.id,
        ...metadata,
        status: 'succeeded',
        attempts: attempt + 1,
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - started,
        articleCount: articles.length,
        source: payload && typeof payload === 'object'
          ? { ...metadata, ...payload }
          : { ...metadata },
        articles,
        error: null,
      };
    } catch (error) {
      lastError = error;
      if (attempt < options.retryAttempts) await delay(options.retryDelayMs * (attempt + 1));
    }
  }

  return {
    sourceId: source.id,
    sourceName: source.name || source.id,
    ...metadata,
    status: 'failed',
    attempts: options.retryAttempts + 1,
    startedAt,
    completedAt: new Date(),
    durationMs: Date.now() - started,
    articleCount: 0,
    source: null,
    articles: [],
    error: {
      name: lastError?.name || 'Error',
      code: lastError?.code || 'SOURCE_FETCH_FAILED',
      message: lastError?.message || 'Source collection failed',
    },
  };
}

async function runCollection(registry, options = {}) {
  const settings = {
    concurrency: options.concurrency ?? 8,
    timeoutMs: options.timeoutMs ?? 20000,
    retryAttempts: options.retryAttempts ?? 1,
    retryDelayMs: options.retryDelayMs ?? 500,
  };
  if (!Number.isInteger(settings.retryAttempts) || settings.retryAttempts < 0) {
    throw new RangeError('retryAttempts must be a non-negative integer');
  }

  const startedAt = new Date();
  const results = await mapWithConcurrency(registry, settings.concurrency, (source) => executeSource(source, settings));
  const completedAt = new Date();

  return {
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
    sourceCount: results.length,
    succeededCount: results.filter((result) => result.status === 'succeeded').length,
    failedCount: results.filter((result) => result.status === 'failed').length,
    articleCount: results.reduce((total, result) => total + result.articleCount, 0),
    results,
  };
}

module.exports = { runCollection, executeSource };