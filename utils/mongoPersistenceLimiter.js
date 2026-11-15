const MAX_CONCURRENT_MONGO_PERSISTENCE = 6;
let active = 0;
const waiters = [];

async function acquire() {
  if (active < MAX_CONCURRENT_MONGO_PERSISTENCE && waiters.length === 0) {
    active += 1;
    return;
  }
  await new Promise((resolve) => waiters.push(resolve));
}

function release() {
  const next = waiters.shift();
  if (next) {
    next();
    return;
  }
  active -= 1;
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
