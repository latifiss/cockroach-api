const test = require('node:test');
const assert = require('node:assert/strict');
const { bulkWriteInBatches, isTransientMongoError } = require('../../utils/bulkWrite');

test('bulkWriteInBatches divides operations into sequential batches and aggregates results', async () => {
  const calls = [];
  const model = {
    async bulkWrite(batch, options) {
      calls.push({ size: batch.length, ordered: options.ordered });
      return { upsertedCount: batch.length, modifiedCount: 2 };
    },
  };
  const result = await bulkWriteInBatches(model, Array.from({ length: 7 }, (_, index) => index), { batchSize: 3 });
  assert.deepEqual(calls.map((call) => call.size), [3, 3, 1]);
  assert.ok(calls.every((call) => call.ordered === false));
  assert.equal(result.attempted, 7);
  assert.equal(result.batches, 3);
  assert.equal(result.upserted, 7);
  assert.equal(result.modified, 6);
});

test('bulkWriteInBatches retries transient network failures and continues', async () => {
  let calls = 0;
  const model = {
    async bulkWrite(batch) {
      calls += 1;
      if (calls === 1) {
        const error = new Error('connection timed out');
        error.name = 'MongoNetworkTimeoutError';
        throw error;
      }
      return { upsertedCount: batch.length, modifiedCount: 0 };
    },
  };
  const result = await bulkWriteInBatches(model, [1, 2], { batchSize: 2, retryDelayMs: 1 });
  assert.equal(calls, 2);
  assert.equal(result.upserted, 2);
});

test('bulkWriteInBatches does not retry permanent errors and reports the failed batch', async () => {
  let calls = 0;
  const model = {
    async bulkWrite() {
      calls += 1;
      const error = new Error('duplicate key');
      error.code = 11000;
      throw error;
    },
  };
  await assert.rejects(
    bulkWriteInBatches(model, [1], { retryDelayMs: 1 }),
    (error) => error.bulkWrite.batch === 1 && error.bulkWrite.completedBatches === 0
  );
  assert.equal(calls, 1);
});

test('isTransientMongoError recognizes Mongo network timeout errors', () => {
  assert.equal(isTransientMongoError({ name: 'MongoNetworkTimeoutError' }), true);
  assert.equal(isTransientMongoError({ code: 11000, message: 'duplicate key' }), false);
});
