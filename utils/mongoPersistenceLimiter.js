function readConcurrencyLimit(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('MONGO_PERSISTENCE_CONCURRENCY must be a positive integer');
  }
  return parsed;
}

const MAX_CONCURRENT_MONGO_PERSISTENCE = readConcurrencyLimit(
  process.env.MONGO_PERSISTENCE_CONCURRENCY,
  3
);
let active = 0;
const waiters = [];

async function acquire() {
  if (active < MAX_CONCURRENT_MONGO_PERSISTENCE && waiters.length === 0) {
    active += 1;
    return;
  }
  await new Promise((resolve) => waiters.push(resolve));
  active += 1;
}

function release() {
  active -= 1;
  const next = waiters.shift();
  if (next) next();
}

async function withMongoPersistence(operation) {
  if (typeof operation !== 'function') throw new TypeError('operation must be a function');

  await acquire();
  try {
    return await operation();
  } finally {
    release();
  }
}

function getMongoPersistenceStatus() {
  return {
    active,
    waiting: waiters.length,
    limit: MAX_CONCURRENT_MONGO_PERSISTENCE,
  };
}

module.exports = {
  MAX_CONCURRENT_MONGO_PERSISTENCE,
  withMongoPersistence,
  getMongoPersistenceStatus,
};
