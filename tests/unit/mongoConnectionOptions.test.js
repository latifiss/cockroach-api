const test = require('node:test');
const assert = require('node:assert/strict');
const { getMongoConnectionOptions, readPositiveInteger } = require('../../db/connectionOptions');

test('uses a smaller MongoDB pool for API workers', () => {
  const options = getMongoConnectionOptions({ SCHEDULER_WORKER: 'false' });

  assert.equal(options.maxPoolSize, 5);
  assert.equal(options.minPoolSize, 0);
  assert.equal(options.maxConnecting, 2);
  assert.equal(options.waitQueueTimeoutMS, 10000);
  assert.equal(options.autoIndex, false);
});

test('keeps the larger MongoDB pool and index management on the scheduler worker', () => {
  const options = getMongoConnectionOptions({ SCHEDULER_WORKER: 'true' });

  assert.equal(options.maxPoolSize, 10);
  assert.equal(options.autoIndex, true);
});

test('allows explicit role-specific pool sizing', () => {
  assert.equal(getMongoConnectionOptions({
    SCHEDULER_WORKER: 'true',
    MONGODB_SCHEDULER_MAX_POOL_SIZE: '8',
  }).maxPoolSize, 8);
  assert.equal(getMongoConnectionOptions({
    SCHEDULER_WORKER: 'false',
    MONGODB_API_MAX_POOL_SIZE: '3',
  }).maxPoolSize, 3);
});

test('rejects invalid pool sizes instead of silently accepting them', () => {
  assert.throws(() => readPositiveInteger('0', 5, 'MONGODB_API_MAX_POOL_SIZE'));
  assert.throws(() => readPositiveInteger('many', 5, 'MONGODB_API_MAX_POOL_SIZE'));
});
