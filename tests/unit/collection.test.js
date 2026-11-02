const test = require('node:test');
const assert = require('node:assert/strict');
const { mapWithConcurrency } = require('../../services/collection/limitConcurrency');
const { createSourceRegistry } = require('../../services/collection/sourceRegistry');
const { runCollection } = require('../../services/collection/collectionOrchestrator');

test('mapWithConcurrency preserves input order and respects the concurrency limit', async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency([30, 10, 20, 5], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, value));
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(results, [60, 20, 40, 10]);
  assert.equal(peak, 2);
});

test('source registry rejects duplicate source identifiers', () => {
  const first = () => {};
  first.sourceId = 'publisher';
  const second = () => {};
  second.sourceId = 'publisher';
  assert.throws(() => createSourceRegistry([first, second]), /Duplicate source identifier/);
});

test('collection isolates source failures and reports source outcomes', async () => {
  const registry = createSourceRegistry([
    async () => ({ source_name: 'A', articles: [{ title: 'One' }] }),
    async () => { throw new Error('publisher unavailable'); },
  ]);
  const result = await runCollection(registry, { concurrency: 1, retryAttempts: 0, timeoutMs: 100 });
  assert.equal(result.sourceCount, 2);
  assert.equal(result.succeededCount, 1);
  assert.equal(result.failedCount, 1);
  assert.equal(result.articleCount, 1);
  assert.equal(result.results[1].error.message, 'publisher unavailable');
});

test('collection times out a source and retries within configured policy', async () => {
  let attempts = 0;
  const registry = createSourceRegistry([async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary');
    return { articles: [] };
  }]);
  const result = await runCollection(registry, { retryAttempts: 1, retryDelayMs: 0, timeoutMs: 100 });
  assert.equal(attempts, 2);
  assert.equal(result.succeededCount, 1);
  assert.equal(result.results[0].attempts, 2);
});
