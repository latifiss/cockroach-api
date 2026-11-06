require('dotenv').config();
const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');

const logger = createLogger();
let connectionPromise = null;

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost');
});

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected');
});

async function connectDB(options = {}) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  const uri = options.uri || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  connectionPromise = mongoose.connect(uri, {
    dbName: options.dbName || process.env.MONGODB_DB_NAME || 'api',
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: options.maxPoolSize || 10,
    retryWrites: true,
    retryReads: true,
  }).then(() => mongoose.connection).catch((error) => {
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
