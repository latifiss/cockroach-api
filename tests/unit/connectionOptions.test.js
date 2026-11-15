const test = require('node:test');
const assert = require('node:assert/strict');
const { getMongoConnectionOptions } = require('../../db/connectionOptions');

test('uses smaller API and scheduler pools by default and disables automatic indexes', () => {
  const api = getMongoConnectionOptions({ SCHEDULER_WORKER: 'false' });
  const scheduler = getMongoConnectionOptions({ SCHEDULER_WORKER: 'true' });

  assert.equal(api.maxPoolSize, 3);
  assert.equal(scheduler.maxPoolSize, 6);
  assert.equal(api.autoIndex, false);
  assert.equal(scheduler.autoIndex, false);
  assert.equal(api.waitQueueTimeoutMS, 15000);
});

test('allows pool sizes to be configured independently by worker role', () => {
  const api = getMongoConnectionOptions({
    SCHEDULER_WORKER: 'false',
    MONGODB_API_MAX_POOL_SIZE: '4',
    MONGODB_SCHEDULER_MAX_POOL_SIZE: '8',
  });
  const scheduler = getMongoConnectionOptions({
    SCHEDULER_WORKER: 'true',
    MONGODB_API_MAX_POOL_SIZE: '4',
    MONGODB_SCHEDULER_MAX_POOL_SIZE: '8',
  });

  assert.equal(api.maxPoolSize, 4);
  assert.equal(scheduler.maxPoolSize, 8);
});

test('rejects invalid pool size configuration', () => {
  assert.throws(
    () => getMongoConnectionOptions({ MONGODB_API_MAX_POOL_SIZE: '0' }),
    /MONGODB_API_MAX_POOL_SIZE/
  );
  assert.throws(
    () => getMongoConnectionOptions({ SCHEDULER_WORKER: 'true', MONGODB_SCHEDULER_MAX_POOL_SIZE: 'many' }),
    /MONGODB_SCHEDULER_MAX_POOL_SIZE/
  );
});
