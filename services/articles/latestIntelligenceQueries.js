const { withMongoPersistence } = require('../../utils/mongoPersistenceLimiter');

async function runLatestQuery(logger, queryName, requestedItems, execute) {
  const startedAt = Date.now();
  logger.info('🔎 Latest query started', { query: queryName, requestedItems });

  try {
    const articles = await withMongoPersistence(execute);
    logger.info('✅ Latest query completed', {
      query: queryName,
      durationMs: Date.now() - startedAt,
      requestedItems,
      returnedItems: articles.length,
    });
    return articles;
  } catch (error) {
    logger.error('❌ Latest query failed', {
      query: queryName,
      durationMs: Date.now() - startedAt,
      requestedItems,
      returnedItems: 0,
      error,
    });
    throw error;
  }
}

async function findQueuedAndRecentArticles(Latest, { queuedIds, cutoff, limit, logger }) {
  const results = await Promise.allSettled([
    runLatestQuery(logger, 'queued-articles', queuedIds.length, () => (
      Latest.find({ article_id: { $in: queuedIds } }).lean()
    )),
    runLatestQuery(logger, 'recent-articles', limit, () => (
      Latest.find({ published_at: { $gte: cutoff } })
        .sort({ published_at: -1 })
        .limit(limit)
        .lean()
    )),
  ]);
  const failedQuery = results.find((result) => result.status === 'rejected');
  if (failedQuery) throw failedQuery.reason;
  return results.map((result) => result.value);
}

function findRecentlyIngestedArticles(Latest, { cutoff, limit, logger }) {
  return runLatestQuery(logger, 'startup-recovery', limit, () => (
    Latest.find({
      $or: [
        { first_seen_at: { $gte: cutoff } },
        { published_at: { $gte: cutoff } },
      ],
    })
      .sort({ first_seen_at: -1, published_at: -1 })
      .limit(limit)
      .select('article_id')
      .lean()
  ));
}

module.exports = {
  findQueuedAndRecentArticles,
  findRecentlyIngestedArticles,
};
