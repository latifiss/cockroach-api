const test = require('node:test');
const assert = require('node:assert/strict');
const { executeSource, normalizeSourceError } = require('../../services/collection/collectionOrchestrator');

const options = { timeoutMs: 100, retryAttempts: 0, retryDelayMs: 1 };

test('executeSource marks a returned scraper error as failed', async () => {
  const result = await executeSource({
    id: 'test-collector',
    name: 'Test Publisher',
    fetch: async () => ({ articles: [], error: 'Access denied' }),
  }, options);

  assert.equal(result.status, 'failed');
  assert.equal(result.articleCount, 0);
  assert.equal(result.error.code, 'SOURCE_FETCH_FAILED');
  assert.equal(result.error.message, 'Access denied');
});

test('executeSource preserves HTTP status codes from returned scraper errors', async () => {
  const result = await executeSource({
    id: 'test-http-collector',
    fetch: async () => ({ articles: [], error: { code: 'HTTP_403', message: 'Access denied' } }),
  }, options);

  assert.equal(result.status, 'failed');
  assert.equal(result.error.code, 'HTTP_403');
});

test('executeSource keeps valid empty feeds successful', async () => {
  const result = await executeSource({
    id: 'empty-feed',
    fetch: async () => ({ articles: [] }),
  }, options);

  assert.equal(result.status, 'succeeded');
  assert.equal(result.articleCount, 0);
  assert.equal(result.error, null);
});

test('normalizeSourceError classifies HTTP response failures', () => {
  assert.deepEqual(normalizeSourceError({ response: { status: 405 }, message: 'Method not allowed' }), {
    name: 'Error',
    code: 'HTTP_405',
    message: 'Method not allowed',
  });
});
