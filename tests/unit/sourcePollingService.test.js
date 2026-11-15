const test = require('node:test');
const assert = require('node:assert/strict');
const { getSourcePollingStatus } = require('../../services/collection/sourcePollingService');

test('source polling service exposes its initial operational state', () => {
  const status = getSourcePollingStatus();

  assert.equal(status.started, false);
  assert.equal(status.stopped, false);
  assert.ok(status.sourceCount > 0);
  assert.equal(status.activePolls, 0);
  assert.equal(status.pollIntervalMs, 5 * 60 * 1000);
});
