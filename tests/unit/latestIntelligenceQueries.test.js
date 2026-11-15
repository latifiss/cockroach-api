const test = require('node:test');
const assert = require('node:assert/strict');
const {
  findQueuedAndRecentArticles,
  findRecentlyIngestedArticles,
} = require('../../services/articles/latestIntelligenceQueries');

function createLatestModel({ resultsByFilter, calls }) {
  return {
    find(filter) {
      calls.push({ filter });
      const call = calls[calls.length - 1];
      return {
        sort(value) {
          call.sort = value;
          return this;
        },
        limit(value) {
          call.limit = value;
          return this;
        },
        select(value) {
          call.select = value;
          return this;
        },
        lean() {
          return resultsByFilter(filter);
        },
      };
    },
  };
}

test('loads queued and recent articles without a $nin exclusion', async () => {
  const calls = [];
  const queuedIds = ['queued-1', 'queued-2'];
  const queuedArticles = [{ article_id: 'queued-1' }];
  const recentArticles = [
    { article_id: 'queued-1' },
    { article_id: 'recent-1' },
  ];
  const logEvents = [];
  const logger = {
    info(message, context) { logEvents.push({ level: 'info', message, context }); },
    error(message, context) { logEvents.push({ level: 'error', message, context }); },
  };
  const Latest = createLatestModel({
    calls,
    resultsByFilter(filter) {
      if (filter.article_id) return Promise.resolve(queuedArticles);
      return Promise.resolve(recentArticles);
    },
  });

  const [queued, recent] = await findQueuedAndRecentArticles(Latest, {
    queuedIds,
    cutoff: new Date('2026-01-01T00:00:00.000Z'),
    limit: 100,
    logger,
  });

  assert.deepEqual(queued, queuedArticles);
  assert.deepEqual(recent, recentArticles);
  assert.deepEqual(calls[0].filter, { article_id: { $in: queuedIds } });
  assert.deepEqual(calls[1].filter, { published_at: { $gte: new Date('2026-01-01T00:00:00.000Z') } });
  assert.deepEqual(calls[1].sort, { published_at: -1 });
  assert.equal(calls[1].limit, 100);
  assert.equal(logEvents.filter((event) => event.message.includes('started')).length, 2);
  assert.equal(logEvents.filter((event) => event.message.includes('completed')).length, 2);
  assert.ok(logEvents.every((event) => event.context.durationMs === undefined || event.context.durationMs >= 0));
});

test('logs startup recovery query counts and shape', async () => {
  const calls = [];
  const logEvents = [];
  const logger = {
    info(message, context) { logEvents.push({ level: 'info', message, context }); },
    error(message, context) { logEvents.push({ level: 'error', message, context }); },
  };
  const articles = [{ article_id: 'recent-1' }];
  const Latest = createLatestModel({
    calls,
    resultsByFilter() { return Promise.resolve(articles); },
  });
  const cutoff = new Date('2026-01-01T00:00:00.000Z');

  const result = await findRecentlyIngestedArticles(Latest, { cutoff, limit: 50, logger });

  assert.deepEqual(result, articles);
  assert.deepEqual(calls[0].filter, {
    $or: [
      { first_seen_at: { $gte: cutoff } },
      { published_at: { $gte: cutoff } },
    ],
  });
  assert.deepEqual(calls[0].sort, { first_seen_at: -1, published_at: -1 });
  assert.equal(calls[0].limit, 50);
  assert.equal(calls[0].select, 'article_id');
  assert.equal(logEvents[1].context.returnedItems, 1);
  assert.equal(logEvents[1].context.requestedItems, 50);
});

test('logs query failures and propagates them to queue retry handling', async () => {
  const calls = [];
  const logEvents = [];
  const failure = new Error('database unavailable');
  const logger = {
    info(message, context) { logEvents.push({ level: 'info', message, context }); },
    error(message, context) { logEvents.push({ level: 'error', message, context }); },
  };
  const Latest = createLatestModel({
    calls,
    resultsByFilter() { return Promise.reject(failure); },
  });

  await assert.rejects(
    findRecentlyIngestedArticles(Latest, {
      cutoff: new Date(),
      limit: 50,
      logger,
    }),
    failure
  );
  assert.equal(logEvents[1].level, 'error');
  assert.equal(logEvents[1].context.requestedItems, 50);
  assert.equal(logEvents[1].context.returnedItems, 0);
  assert.ok(logEvents[1].context.durationMs >= 0);
});

test('waits for both batch queries to settle before reporting a query failure', async () => {
  const calls = [];
  let releaseRecentQuery;
  const recentQuery = new Promise((resolve) => { releaseRecentQuery = resolve; });
  const Latest = createLatestModel({
    calls,
    resultsByFilter(filter) {
      if (filter.article_id) return Promise.reject(new Error('queued lookup failed'));
      return recentQuery;
    },
  });
  const logger = { info() {}, error() {} };
  let settled = false;
  const batch = findQueuedAndRecentArticles(Latest, {
    queuedIds: ['queued-1'],
    cutoff: new Date(),
    limit: 100,
    logger,
  }).catch((error) => {
    settled = true;
    throw error;
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  releaseRecentQuery([]);
  await assert.rejects(batch, /queued lookup failed/);
  assert.equal(settled, true);
});
