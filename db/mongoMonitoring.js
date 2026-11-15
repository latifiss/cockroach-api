const SLOW_CHECKOUT_MS = 100;
const SLOW_COMMAND_MS = 250;
const HEARTBEAT_LOG_INTERVAL_MS = 60000;
const monitoredClients = new WeakSet();

function attachMongoClientMonitoring(client, logger) {
  if (!client || typeof client.on !== 'function' || monitoredClients.has(client)) return false;
  monitoredClients.add(client);

  const unavailableServers = new Set();
  const lastHeartbeatFailure = new Map();

  client.on('connectionPoolCreated', (event) => {
    logger.info('MongoDB connection pool created', {
      server: event.address,
      maxPoolSize: event.options.maxPoolSize,
      maxConnecting: event.options.maxConnecting,
      waitQueueTimeoutMS: event.options.waitQueueTimeoutMS,
    });
  });
  client.on('connectionPoolReady', (event) => {
    logger.info('MongoDB connection pool ready', { server: event.address });
  });
  client.on('connectionPoolCleared', (event) => {
    logger.warn('MongoDB connection pool cleared', {
      server: event.address,
      interruptInUseConnections: event.interruptInUseConnections,
    });
  });
  client.on('connectionPoolClosed', (event) => {
    logger.info('MongoDB connection pool closed', { server: event.address });
  });
  client.on('connectionClosed', (event) => {
    if (event.reason !== 'error') return;
    logger.warn('MongoDB connection closed after an error', {
      server: event.address,
      reason: event.reason,
      error: event.error,
    });
  });
  client.on('connectionReady', (event) => {
    if (event.durationMS < SLOW_CHECKOUT_MS) return;
    logger.warn('MongoDB connection establishment delayed', {
      server: event.address,
      durationMs: event.durationMS,
    });
  });
  client.on('connectionCheckedOut', (event) => {
    if (event.durationMS < SLOW_CHECKOUT_MS) return;
    logger.warn('MongoDB connection checkout delayed', {
      server: event.address,
      durationMs: event.durationMS,
    });
  });
  client.on('connectionCheckOutFailed', (event) => {
    logger.error('MongoDB connection checkout failed', {
      server: event.address,
      durationMs: event.durationMS,
      reason: event.reason,
    });
  });
  client.on('commandSucceeded', (event) => {
    if (event.duration < SLOW_COMMAND_MS) return;
    logger.warn('MongoDB command slow', {
      database: event.databaseName,
      command: event.commandName,
      durationMs: event.duration,
    });
  });
  client.on('commandFailed', (event) => {
    logger.error('MongoDB command failed', {
      database: event.databaseName,
      command: event.commandName,
      durationMs: event.duration,
      error: event.failure,
    });
    client.on('error', (error) => {
      logger.error('MongoDB driver client error', { error });
    });
  });
  client.on('serverHeartbeatFailed', (event) => {
    const now = Date.now();
    const previous = lastHeartbeatFailure.get(event.connectionId) || 0;
    if (now - previous < HEARTBEAT_LOG_INTERVAL_MS) return;
    lastHeartbeatFailure.set(event.connectionId, now);
    logger.error('MongoDB server heartbeat failed', {
      connectionId: event.connectionId,
      durationMs: event.duration,
      error: event.failure,
    });
  });
  client.on('serverDescriptionChanged', (event) => {
    const isUnavailable = event.newDescription?.type === 'Unknown';
    const wasUnavailable = unavailableServers.has(event.address);
    if (isUnavailable && !wasUnavailable) {
      unavailableServers.add(event.address);
      logger.error('MongoDB server became unavailable', {
        server: event.address,
        error: event.newDescription?.error,
      });
    } else if (!isUnavailable && wasUnavailable) {
      unavailableServers.delete(event.address);
      lastHeartbeatFailure.delete(event.address);
      logger.info('MongoDB server recovered', { server: event.address });
    }
  });

  return true;
}

module.exports = { attachMongoClientMonitoring, SLOW_CHECKOUT_MS, SLOW_COMMAND_MS };
