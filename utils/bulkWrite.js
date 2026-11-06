const TRANSIENT_ERROR_NAMES = new Set(['MongoNetworkError', 'MongoNetworkTimeoutError', 'MongoServerSelectionError', 'MongoWaitQueueTimeoutError', 'MongoTimeoutError']);
const TRANSIENT_ERROR_CODES = new Set([6, 7, 89, 91, 189, 262, 9001, 10107, 11600, 11602, 13435, 13436]);

function isTransientMongoError(error) {
  if (!error) return false;
  if (TRANSIENT_ERROR_NAMES.has(error.name)) return true;
  if (TRANSIENT_ERROR_CODES.has(Number(error.code))) return true;
  return /server selection timed out|connection timed out|socket timed out|network error|connection pool.*timed out|timed out.*connection/i.test(error.message || '');
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function bulkWriteInBatches(model, operations, options = {}) {
  if (!model || typeof model.bulkWrite !== 'function') throw new TypeError('model.bulkWrite must be a function');
  if (!Array.isArray(operations)) throw new TypeError('operations must be an array');
  const batchSize = options.batchSize ?? 500;
  const maxRetries = options.maxRetries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 500;
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new RangeError('batchSize must be a positive integer');
  if (!Number.isInteger(maxRetries) || maxRetries < 0) throw new RangeError('maxRetries must be a non-negative integer');

  const totals = { attempted: operations.length, batches: Math.ceil(operations.length / batchSize), upserted: 0, modified: 0, matched: 0, inserted: 0, deleted: 0 };
  for (let offset = 0, batchIndex = 0; offset < operations.length; offset += batchSize, batchIndex += 1) {
    const batch = operations.slice(offset, offset + batchSize);
    let result;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        result = await model.bulkWrite(batch, { ordered: options.ordered ?? false });
        break;
      } catch (error) {
        if (!isTransientMongoError(error) || attempt >= maxRetries) {
          error.bulkWrite = { batch: batchIndex + 1, batches: totals.batches, batchSize: batch.length, completedBatches: batchIndex };
          throw error;
        }
        options.onRetry?.({ batch: batchIndex + 1, batches: totals.batches, attempt: attempt + 1, maxRetries, error });
        await wait(retryDelayMs * (attempt + 1));
      }
    }
    totals.upserted += result.upsertedCount || 0;
    totals.modified += result.modifiedCount || 0;
    totals.matched += result.matchedCount || 0;
    totals.inserted += result.insertedCount || 0;
    totals.deleted += result.deletedCount || 0;
    options.onBatchComplete?.({ batch: batchIndex + 1, batches: totals.batches, batchSize: batch.length, totals: { ...totals } });
  }
  return totals;
}

module.exports = { bulkWriteInBatches, isTransientMongoError };
