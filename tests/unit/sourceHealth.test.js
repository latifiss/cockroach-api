const test = require('node:test');
const assert = require('node:assert/strict');
const { transitionSourceHealth } = require('../../services/operations/sourceHealth');

test('source health becomes degraded after a failure', () => {
  const result = transitionSourceHealth({}, {
    sourceId: 'publisher-a',
    status: 'failed',
    completedAt: new Date('2026-11-02T12:00:00Z'),
    durationMs: 1200,
    articleCount: 0,
    error: { code: 'SOURCE_FETCH_FAILED', message: 'unavailable' },
  });
  assert.equal(result.status, 'degraded');
  assert.equal(result.consecutive_failures, 1);
  assert.equal(result.failed_runs, 1);
  assert.equal(result.source_name, 'publisher-a');
});

test('source health replaces blank names with a humanized source identifier', () => {
  const result = transitionSourceHealth({ source_name: ' ' }, {
    sourceId: 'fetchGraphicSportsArticles',
    sourceName: ' ',
    status: 'failed',
  });
  assert.equal(result.source_name, 'Graphic Sports');
});

test('source health escalates after repeated failures', () => {
  const previous = { consecutive_failures: 2, total_runs: 2, failed_runs: 2 };
  const result = transitionSourceHealth(previous, {
    sourceId: 'publisher-a',
    status: 'failed',
    completedAt: new Date(),
    durationMs: 20,
    error: { code: 'SOURCE_TIMEOUT', message: 'timed out' },
  });
  assert.equal(result.status, 'failing');
  assert.equal(result.consecutive_failures, 3);
});

test('a successful run restores health and preserves historical failures', () => {
  const previous = { consecutive_failures: 3, total_runs: 3, failed_runs: 3, successful_runs: 0 };
  const result = transitionSourceHealth(previous, {
    sourceId: 'publisher-a',
    status: 'succeeded',
    completedAt: new Date(),
    durationMs: 80,
    articleCount: 4,
  });
  assert.equal(result.status, 'healthy');
  assert.equal(result.consecutive_failures, 0);
  assert.equal(result.failed_runs, 3);
  assert.equal(result.successful_runs, 1);
  assert.equal(result.last_error_code, null);
});
