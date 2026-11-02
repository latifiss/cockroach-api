require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cluster = require('cluster');
const os = require('os');
const { connectDB, isDBConnected, mongoose } = require('./db');
const { loadRuntimeConfig } = require('./config/runtime');
const { createLogger } = require('./utils/logger');

const config = loadRuntimeConfig();
const logger = createLogger();
const latestRouter = require('./routes/news/latest.routes');
const clusterRouter = require('./routes/news/cluster.routes');
const feedRouter = require('./routes/news/feed.routes');
const articleRouter = require('./routes/news/articles.routes');
const newsRouter = require('./routes/news/news.routes');
const operationsRouter = require('./routes/operations.routes');
const { updateNewsCache } = require('./controllers/news/feed.controller');
const { intelligencePipelineJob } = require('./jobs/intelligencePipeline.job');

if (cluster.isPrimary) {
  logger.info('Primary process started', { pid: process.pid });
  const workerCount = Math.min(os.cpus().length, 4);
  let shuttingDown = false;

  for (let index = 0; index < workerCount; index += 1) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    logger.error('API worker exited', { workerId: worker.id, pid: worker.process.pid, code, signal });
    if (!shuttingDown) cluster.fork();
  });

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Primary process shutting down');
    for (const worker of Object.values(cluster.workers)) worker?.process.kill('SIGTERM');
    setTimeout(() => process.exit(0), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else {
  let server;
  let shuttingDown = false;
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use('/api/news', latestRouter);
  app.use('/api/news/cluster', clusterRouter);
  app.use('/api/news/feed', feedRouter);
  app.use('/api/articles', articleRouter);
  app.use('/api/news-feed', newsRouter);
  app.use('/api/operations', operationsRouter);

  app.get('/health/live', (req, res) => res.status(200).json({ status: 'alive', pid: process.pid }));
  app.get('/health/ready', (req, res) => {
    const ready = isDBConnected();
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      dependencies: { mongodb: ready ? 'connected' : 'disconnected' },
    });
  });
  app.get('/health', (req, res) => {
    const ready = isDBConnected();
    res.status(ready ? 200 : 503).json({
      status: ready ? 'healthy' : 'degraded',
      pid: process.pid,
      dependencies: { mongodb: ready ? 'connected' : 'disconnected' },
    });
  });

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('API worker shutting down', { signal, pid: process.pid });
    intelligencePipelineJob.stop();
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    process.exit(0);
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  server = app.listen(config.port, async () => {
    logger.info('API worker listening', { pid: process.pid, port: config.port, workerId: cluster.worker.id });
    try {
      await connectDB();
      await updateNewsCache();
      intelligencePipelineJob.start();
      logger.info('Intelligence pipeline scheduler started', { workerId: cluster.worker.id });
    } catch (error) {
      logger.error('Worker initialization failed', { error });
      server.close(() => process.exit(1));
    }
  });
}
