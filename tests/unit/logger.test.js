const test = require('node:test');
const assert = require('node:assert/strict');
const { createLogger } = require('../../utils/logger');

test('logger emits structured JSON records and serializes errors', () => {
  const records = [];
  const sink = {
    info: (line) => records.push(JSON.parse(line)),
    error: (line) => records.push(JSON.parse(line)),
    warn: (line) => records.push(JSON.parse(line)),
    log: (line) => records.push(JSON.parse(line)),
  };
  const logger = createLogger({ level: 'debug', sink, pretty: false });
  logger.info('collection started', { runId: 'run-1' });
  logger.error('source failed', { error: new Error('offline') });
  assert.equal(records[0].message, 'collection started');
  assert.equal(records[0].runId, 'run-1');
  assert.equal(records[1].error.message, 'offline');
  assert.ok(records[1].timestamp);
});

test('logger emits readable emoji-prefixed messages in pretty mode', () => {
  const records = [];
  const sink = {
    info: (line) => records.push(line),
    error: (line) => records.push(line),
    warn: (line) => records.push(line),
    log: (line) => records.push(line),
  };
  const logger = createLogger({ level: 'debug', sink, pretty: true });
  logger.info('collection started', { runId: 'run-1' });
  logger.warn('source delayed');
  assert.match(records[0], /^ℹ️ collection started/);
  assert.match(records[0], /runId: run-1/);
  assert.match(records[1], /^⚠️ source delayed/);
});
