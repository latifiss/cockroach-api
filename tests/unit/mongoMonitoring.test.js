const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { attachMongoClientMonitoring } = require('../../db/mongoMonitoring');

test('reports delayed checkouts, failed commands, cleared pools, and server recovery', () => {
  const client = new EventEmitter();
  const events = [];
  const logger = {
    info(message, context) { events.push({ level: 'info', message, context }); },
    warn(message, context) { events.push({ level: 'warn', message, context }); },
    error(message, context) { events.push({ level: 'error', message, context }); },
  };

  assert.equal(attachMongoClientMonitoring(client, logger), true);
  assert.equal(attachMongoClientMonitoring(client, logger), false);

  client.emit('connectionPoolCreated', {
    address: 'node-a',
    options: { maxPoolSize: 10, maxConnecting: 2, waitQueueTimeoutMS: 0 },
  });
  client.emit('connectionReady', { address: 'node-a', durationMS: 200 });
  client.emit('connectionCheckedOut', { address: 'node-a', durationMS: 150 });
  client.emit('connectionCheckOutFailed', {
    address: 'node-a',
    durationMS: 500,
    reason: 'connection pool timeout',
  });
  client.emit('connectionPoolCleared', {
    address: 'node-a',
    interruptInUseConnections: true,
  });
  client.emit('commandSucceeded', {
    databaseName: 'api',
    commandName: 'find',
    duration: 300,
  });
  client.emit('commandFailed', {
    databaseName: 'api',
    commandName: 'update',
    duration: 25,
    failure: new Error('network error'),
  });
  client.emit('serverDescriptionChanged', {
    address: 'node-a',
    newDescription: { type: 'Unknown', error: new Error('heartbeat timeout') },
  });
  client.emit('serverDescriptionChanged', {
    address: 'node-a',
    newDescription: { type: 'RSPrimary' },
  });

  assert.deepEqual(events.map((event) => event.message), [
    'MongoDB connection pool created',
    'MongoDB connection establishment delayed',
    'MongoDB connection checkout delayed',
    'MongoDB connection checkout failed',
    'MongoDB connection pool cleared',
    'MongoDB command slow',
    'MongoDB command failed',
    'MongoDB server became unavailable',
    'MongoDB server recovered',
  ]);
  assert.equal(events[1].context.durationMs, 200);
  assert.equal(events[2].context.durationMs, 150);
  assert.equal(events[5].context.command, 'find');
  assert.equal(events[6].context.error.message, 'network error');
});
