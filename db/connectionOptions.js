function readPositiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${name}: expected a positive integer`);
  }
  return parsed;
}

function getMongoConnectionOptions(env = process.env) {
  const isSchedulerWorker = env.SCHEDULER_WORKER === 'true';
  const maxPoolSize = isSchedulerWorker
    ? readPositiveInteger(env.MONGODB_SCHEDULER_MAX_POOL_SIZE, 10, 'MONGODB_SCHEDULER_MAX_POOL_SIZE')
    : readPositiveInteger(env.MONGODB_API_MAX_POOL_SIZE, 5, 'MONGODB_API_MAX_POOL_SIZE');

  return {
    dbName: env.MONGODB_DB_NAME || 'api',
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize,
    minPoolSize: 0,
    maxConnecting: 2,
    waitQueueTimeoutMS: 10000,
    monitorCommands: true,
    retryWrites: true,
    retryReads: true,
    autoIndex: isSchedulerWorker,
  };
}

module.exports = { getMongoConnectionOptions, readPositiveInteger };
