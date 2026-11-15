require('dotenv').config();
const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');
const { attachMongoClientMonitoring } = require('./mongoMonitoring');

const logger = createLogger();
let connectionPromise = null;
let disconnectedAt = null;

mongoose.connection.on('disconnected', () => {
  disconnectedAt = disconnectedAt || Date.now();
  logger.warn('MongoDB connection lost');
});

mongoose.connection.on('connected', () => {
  const reconnectedAfterMs = disconnectedAt ? Date.now() - disconnectedAt : null;
  disconnectedAt = null;
  try {
    const client = mongoose.connection.getClient();
    attachMongoClientMonitoring(client, logger);
    logger.info(reconnectedAfterMs === null ? 'MongoDB connected' : 'MongoDB reconnected', {
      maxPoolSize: client.options.maxPoolSize,
      maxConnecting: client.options.maxConnecting,
      reconnectedAfterMs,
    });
  } catch (error) {
    logger.error('MongoDB monitoring setup failed', { error });
  }
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error', { error });
});

async function connectDB(options = {}) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  const uri = options.uri || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  const connectAttempt = mongoose.connect(uri, {
    dbName: options.dbName || process.env.MONGODB_DB_NAME || 'api',
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: options.maxPoolSize || 10,
    monitorCommands: true,
    retryWrites: true,
    retryReads: true,
  });
  try {
    attachMongoClientMonitoring(mongoose.connection.getClient(), logger);
  } catch (error) {
    logger.error('MongoDB monitoring setup failed', { error });
  }

  connectionPromise = connectAttempt.then(() => mongoose.connection).catch((error) => {
    logger.error('MongoDB connection failed', { error });
    throw error;
  }).finally(() => {
    connectionPromise = null;
  });

  return connectionPromise;
}

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDBConnected, mongoose };
