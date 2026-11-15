const MAX_CONCURRENT_MONGO_PERSISTENCE = 6;
let active = 0;
const waiters = [];

async function withMongoPersistence(operation) {
  if (typeof operation !== 'function') throw new TypeError('operation must be a function');

  if (active >= MAX_CONCURRENT_MONGO_PERSISTENCE) {
    await new Promise((resolve) => waiters.push(resolve));
  }
  active += 1;

  try {
    return await operation();
  } finally {
    active -= 1;
    const next = waiters.shift();
    if (next) next();
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
