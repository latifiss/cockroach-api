const test = require('node:test');
const assert = require('node:assert/strict');
const { loadRuntimeConfig } = require('../../config/runtime');

test('loads safe runtime defaults', () => {
  const config = loadRuntimeConfig({});
  assert.equal(config.port, 5000);
  assert.equal(config.collectionConcurrency, 8);
  assert.equal(config.collectionRetryAttempts, 1);
  assert.equal(Object.isFrozen(config), true);
});

test('rejects invalid numeric runtime configuration', () => {
  assert.throws(() => loadRuntimeConfig({ PORT: '0' }), /Invalid PORT/);
  assert.throws(() => loadRuntimeConfig({ COLLECTION_CONCURRENCY: 'many' }), /Invalid COLLECTION_CONCURRENCY/);
});

test('accepts zero retries and zero retry delay', () => {
  const config = loadRuntimeConfig({ COLLECTION_RETRY_ATTEMPTS: '0', COLLECTION_RETRY_DELAY_MS: '0' });
  assert.equal(config.collectionRetryAttempts, 0);
  assert.equal(config.collectionRetryDelayMs, 0);
});
