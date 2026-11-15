const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_CONCURRENT_MONGO_PERSISTENCE,
  withMongoPersistence,
  getMongoPersistenceStatus,
} = require('../../utils/mongoPersistenceLimiter');

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('bounds active MongoDB persistence operations and releases slots', async () => {
  const gate = deferred();
  let active = 0;
  let maximumActive = 0;
  const operations = Array.from({ length: MAX_CONCURRENT_MONGO_PERSISTENCE + 4 }, () => (
    withMongoPersistence(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await gate.promise;
      active -= 1;
    })
  ));

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(maximumActive, MAX_CONCURRENT_MONGO_PERSISTENCE);
  assert.equal(getMongoPersistenceStatus().active, MAX_CONCURRENT_MONGO_PERSISTENCE);
  assert.equal(getMongoPersistenceStatus().waiting, 4);

  gate.resolve();
  await Promise.all(operations);

  assert.equal(active, 0);
  assert.equal(getMongoPersistenceStatus().active, 0);
  assert.equal(getMongoPersistenceStatus().waiting, 0);
});

test('preserves FIFO order for waiting MongoDB operations', async () => {
  const firstGate = deferred();
  const order = [];
  const first = withMongoPersistence(async () => firstGate.promise);
  await new Promise((resolve) => setImmediate(resolve));

  const queued = Array.from({ length: MAX_CONCURRENT_MONGO_PERSISTENCE + 2 }, (_, index) => (
    withMongoPersistence(async () => { order.push(index); })
  ));

  await new Promise((resolve) => setImmediate(resolve));
  firstGate.resolve();
  await Promise.all([first, ...queued]);

  assert.deepEqual(order, Array.from({ length: queued.length }, (_, index) => index));
});
