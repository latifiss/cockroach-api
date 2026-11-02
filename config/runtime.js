const DEFAULTS = {
  PORT: 5000,
  NODE_ENV: 'development',
  COLLECTION_CONCURRENCY: 8,
  COLLECTION_TIMEOUT_MS: 20000,
  COLLECTION_RETRY_ATTEMPTS: 1,
  COLLECTION_RETRY_DELAY_MS: 500,
};

function parseInteger(name, value, fallback, minimum = 1) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`Invalid ${name}: expected an integer greater than or equal to ${minimum}`);
  }
  return parsed;
}

function loadRuntimeConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || DEFAULTS.NODE_ENV;
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('Invalid NODE_ENV: expected development, test, or production');
  }

  return Object.freeze({
    nodeEnv,
    port: parseInteger('PORT', env.PORT, DEFAULTS.PORT),
    mongodbUri: env.MONGODB_URI || '',
    collectionConcurrency: parseInteger('COLLECTION_CONCURRENCY', env.COLLECTION_CONCURRENCY, DEFAULTS.COLLECTION_CONCURRENCY),
    collectionTimeoutMs: parseInteger('COLLECTION_TIMEOUT_MS', env.COLLECTION_TIMEOUT_MS, DEFAULTS.COLLECTION_TIMEOUT_MS),
    collectionRetryAttempts: parseInteger('COLLECTION_RETRY_ATTEMPTS', env.COLLECTION_RETRY_ATTEMPTS, DEFAULTS.COLLECTION_RETRY_ATTEMPTS, 0),
    collectionRetryDelayMs: parseInteger('COLLECTION_RETRY_DELAY_MS', env.COLLECTION_RETRY_DELAY_MS, DEFAULTS.COLLECTION_RETRY_DELAY_MS, 0),
  });
}

module.exports = { loadRuntimeConfig, parseInteger };
