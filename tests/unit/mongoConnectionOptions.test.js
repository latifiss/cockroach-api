const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  getMongoConnectionOptions,
  getEffectiveMongoConnectionOptions,
  readPositiveInteger,
} = require('../../db/connectionOptions');

test('uses the implemented API worker defaults and common driver options', () => {
  const options = getMongoConnectionOptions({ SCHEDULER_WORKER: 'false' });

  assert.deepEqual(options, {
    dbName: 'api',
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 3,
    minPoolSize: 0,
    maxConnecting: 2,
    waitQueueTimeoutMS: 15000,
    monitorCommands: true,
    retryWrites: true,
    retryReads: true,
    autoIndex: false,
  });
});

test('uses the implemented scheduler worker defaults', () => {
  const options = getMongoConnectionOptions({ SCHEDULER_WORKER: 'true' });

  assert.equal(options.maxPoolSize, 6);
  assert.equal(options.waitQueueTimeoutMS, 15000);
  assert.equal(options.autoIndex, false);
});

test('keeps effective application options safe from autoIndex overrides', () => {
  const options = getEffectiveMongoConnectionOptions(
    { maxPoolSize: 8, autoIndex: true, dbName: 'custom' },
    { SCHEDULER_WORKER: 'true' }
  );

  assert.equal(options.maxPoolSize, 8);
  assert.equal(options.dbName, 'custom');
  assert.equal(options.autoIndex, false);
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

test('connection-level autoIndex reports false when the global Mongoose default is true', () => {
  const connection = mongoose.connection;
  const previousGlobal = mongoose.get('autoIndex');
  const hadConnectionSetting = Object.hasOwn(connection.config, 'autoIndex');
  const previousConnectionSetting = connection.config.autoIndex;

  try {
    mongoose.set('autoIndex', true);
    connection.set('autoIndex', false);
    assert.equal(connection.get('autoIndex'), false);
  } finally {
    if (hadConnectionSetting) connection.config.autoIndex = previousConnectionSetting;
    else delete connection.config.autoIndex;
    mongoose.set('autoIndex', previousGlobal);
  }
});

test('rejects invalid pool sizes instead of silently accepting them', () => {
  assert.throws(() => readPositiveInteger('0', 5, 'MONGODB_API_MAX_POOL_SIZE'));
  assert.throws(() => readPositiveInteger('many', 5, 'MONGODB_API_MAX_POOL_SIZE'));
});
