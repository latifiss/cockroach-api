const express = require('express');
const { connectDB } = require('./db/index');
require('dotenv').config();
const cors = require('cors');
const cron = require('node-cron');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const { throttle } = require('lodash');

const latestRouter = require('./routes/news/latest.routes');
const clusterRouter = require('./routes/news/cluster.routes');
const feedRouter = require('./routes/news/feed.routes');
const articleRouter = require('./routes/news/articles.routes');
const newsRouter = require('./routes/news/news.routes');

const { updateNewsCache } = require('./controllers/news/feed.controller');
const latestNewsCronJob = require('./jobs/latest.job');
const clusterNewsCronJob = require('./jobs/clusterNews.job');

if (cluster.isMaster) {
  console.log(`👾 Master ${process.pid} is running`);

  for (let i = 0; i < Math.min(numCPUs, 4); i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  const app = express();
  const PORT = process.env.PORT || 5000;

  app.use(cors());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  app.use('/api/news', latestRouter);
  app.use('/api/news/cluster', clusterRouter);
  app.use('/api/news/feed', feedRouter);
  app.use('/api/articles', articleRouter);
  app.use('/api/news-feed', newsRouter);

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  const throttledUpdateNewsCache = throttle(updateNewsCache, 60000, {
    trailing: false,
  });

  const server = app.listen(PORT, async () => {
    console.log(`🌍 Worker ${process.pid} running on port ${PORT}`);

    try {
      await connectDB();

      if (cluster.worker.id === 1) {
        setTimeout(() => {
          latestNewsCronJob.start();
          clusterNewsCronJob.start();

          setTimeout(() => {
            throttledUpdateNewsCache().catch(console.error);
          }, 15000);
        }, 5000);
      }
    } catch (err) {
      console.error('Failed to initialize:', err);
    }
  });

  cron.schedule('*/15 * * * *', () => {
    if (cluster.worker.id === 1) {
      throttledUpdateNewsCache().catch(console.error);
    }
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      console.log(`Worker ${process.pid} closed`);
      process.exit(0);
    });
  });
}
