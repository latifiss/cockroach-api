require('dotenv').config();
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');
const { attachMongoClientMonitoring } = require('./mongoMonitoring');
const { getEffectiveMongoConnectionOptions } = require('./connectionOptions');
const {
  getModelIndexSignature,
  initializeIndexesWithLease,
} = require('./indexInitialization');

const logger = createLogger();
let connectionPromise = null;
let indexPromise = null;
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
      autoIndex: mongoose.connection.get('autoIndex'),
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

  const connectionOptions = getEffectiveMongoConnectionOptions(options);
  delete connectionOptions.uri;

  const connectAttempt = mongoose.connect(uri, connectionOptions);
  try {
    attachMongoClientMonitoring(mongoose.connection.getClient(), logger);
  } catch (error) {
    logger.error('MongoDB monitoring setup failed', { error });
  }

  logger.info('MongoDB connection configured', {
    workerRole: process.env.SCHEDULER_WORKER === 'true' ? 'scheduler' : 'api',
    maxPoolSize: connectionOptions.maxPoolSize,
    autoIndex: connectionOptions.autoIndex,
    waitQueueTimeoutMS: connectionOptions.waitQueueTimeoutMS,
  });

  connectionPromise = connectAttempt.then(() => mongoose.connection).catch((error) => {
    logger.error('MongoDB connection failed', { error });
    throw error;
  }).finally(() => {
    connectionPromise = null;
  });

  return connectionPromise;
}

async function ensureApplicationIndexes() {
  if (indexPromise) return indexPromise;
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB must be connected before ensuring indexes');
  }

  indexPromise = (async () => {
    const modelNames = mongoose.modelNames().sort();
    const models = modelNames.map((modelName) => mongoose.model(modelName));
    const indexSignature = getModelIndexSignature(models);
    const startedAt = Date.now();
    const result = await initializeIndexesWithLease({
      collection: mongoose.connection.db.collection('application_index_initialization'),
      owner: `${process.pid}:${randomUUID()}`,
      signature: indexSignature,
      initialize: async (assertLeaseOwnership) => {
        logger.info('MongoDB index setup started', { models: modelNames.length });
        for (const model of models) {
          assertLeaseOwnership();
          await model.createIndexes();
        }
        assertLeaseOwnership();
      },
    });

    if (result.initialized) {
      logger.info('MongoDB index setup completed', {
        models: modelNames.length,
        durationMs: Date.now() - startedAt,
      });
    } else {
      logger.info('MongoDB index setup already completed by another application instance', {
        models: modelNames.length,
      });
    }
  })().catch((error) => {
    indexPromise = null;
    logger.error('MongoDB index setup failed', { error });
    throw error;
  });

  return indexPromise;
}

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, ensureApplicationIndexes, isDBConnected, mongoose };
