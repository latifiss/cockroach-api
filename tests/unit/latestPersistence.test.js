const test = require('node:test');
const assert = require('node:assert/strict');
const { isDeepStrictEqual } = require('node:util');
const Latest = require('../../models/latest.model');
const { persistLatestArticles, toLatestDocument } = require('../../services/articles/latestPersistence');
const { MAX_CONCURRENT_MONGO_PERSISTENCE } = require('../../utils/mongoPersistenceLimiter');

function article(articleId, overrides = {}) {
  return {
    article_id: articleId,
    title: 'Headline',
    description: 'Summary',
    content: 'Full story',
    published_at: new Date('2026-10-01T10:00:00.000Z'),
    relevance_score: 1,
    categories: ['news'],
    source_id: 'publisher-1',
    source_name: 'Publisher One',
    source_credibility: 0.6,
    image_url: 'https://example.test/image.jpg',
    ...overrides,
  };
}

function withFakeLatest(storedArticles, callback) {
  const originalFind = Latest.find;
  const originalBulkWrite = Latest.bulkWrite;
  const storedById = new Map(storedArticles.map((stored) => [stored.article_id, { ...stored }]));
  const state = { operations: [], bulkWriteCalls: 0 };

  Latest.find = (filter) => ({
    select() { return this; },
    async lean() {
      const requestedIds = new Set(filter.article_id.$in);
      return [...storedById.values()]
        .filter((stored) => requestedIds.has(stored.article_id))
        .map((stored) => ({ ...stored }));
    },
  });
  Latest.bulkWrite = async (operations) => {
    state.bulkWriteCalls += 1;
    state.operations.push(...operations);
    let upsertedCount = 0;
    let modifiedCount = 0;
    let matchedCount = 0;
    for (const { updateOne } of operations) {
      const articleId = updateOne.filter.article_id;
      const existing = storedById.get(articleId);
      const document = updateOne.update.$set;
      if (!existing) {
        storedById.set(articleId, { ...document, first_seen_at: updateOne.update.$setOnInsert.first_seen_at });
        upsertedCount += 1;
      } else {
        matchedCount += 1;
        if (Object.keys(document).some((field) => !isDeepStrictEqual(document[field], existing[field]))) {
          modifiedCount += 1;
        }
        storedById.set(articleId, { ...existing, ...document });
      }
    }
    return { upsertedCount, modifiedCount, matchedCount };
  };

  return Promise.resolve()
    .then(() => callback({ state, storedById }))
    .finally(() => {
      Latest.find = originalFind;
      Latest.bulkWrite = originalBulkWrite;
    });
}

test('queues new and materially changed articles, while persisting metadata-only changes', async () => {
  const material = article('material-1');
  const metadata = article('metadata-1');
  const unchanged = article('unchanged-1');
  const existing = [
    { ...toLatestDocument(material), title: 'Old headline' },
    { ...toLatestDocument(metadata), image_url: 'https://example.test/old.jpg', source_credibility: 0.4 },
    toLatestDocument(unchanged),
  ];

  await withFakeLatest(existing, async ({ state }) => {
    const result = await persistLatestArticles([
      article('new-1'),
      article('material-1', { title: 'Updated headline' }),
      article('metadata-1', { image_url: 'https://example.test/new.jpg', source_credibility: 0.8 }),
      article('unchanged-1'),
    ], { retryDelayMs: 1 });

    assert.deepEqual(result.newArticleIds, ['new-1']);
    assert.deepEqual(result.materiallyChangedArticleIds, ['material-1']);
    assert.deepEqual(result.intelligenceArticleIds, ['new-1', 'material-1']);
    assert.equal(result.metadataUpdated, 1);
    assert.equal(result.unchanged, 1);
    assert.equal(result.upserted, 1);
    assert.equal(result.modified, 2);
    assert.equal(state.operations.length, 3);
    assert.equal(state.operations.find((operation) => operation.updateOne.filter.article_id === 'metadata-1')
      .updateOne.update.$set.source_credibility, 0.8);
  });
});

test('keeps the existing publication date when a publisher omits it on later polls', async () => {
  const storedDate = new Date('2025-03-04T12:00:00.000Z');
  const stored = { ...toLatestDocument(article('missing-date-1')), published_at: storedDate };

  await withFakeLatest([stored], async ({ state, storedById }) => {
    const first = await persistLatestArticles([
      article('missing-date-1', { published_at: null }),
    ]);
    const second = await persistLatestArticles([
      article('missing-date-1', { published_at: null }),
    ]);

    assert.equal(first.unchanged, 1);
    assert.equal(second.unchanged, 1);
    assert.equal(state.bulkWriteCalls, 0);
    assert.equal(storedById.get('missing-date-1').published_at.getTime(), storedDate.getTime());
  });
});

test('retries an idempotent latest-article batch after a transient MongoDB failure', async () => {
  const originalFind = Latest.find;
  const originalBulkWrite = Latest.bulkWrite;
  let writeCalls = 0;
  Latest.find = () => ({ select() { return this; }, async lean() { return []; } });
  Latest.bulkWrite = async (operations) => {
    writeCalls += 1;
    if (writeCalls === 1) {
      const error = new Error('connection timed out');
      error.name = 'MongoNetworkTimeoutError';
      throw error;
    }
    return { upsertedCount: operations.length, modifiedCount: 0, matchedCount: 0 };
  };

  try {
    const result = await persistLatestArticles([article('retry-1')], { retryDelayMs: 1 });
    assert.equal(writeCalls, 2);
    assert.deepEqual(result.intelligenceArticleIds, ['retry-1']);
  } finally {
    Latest.find = originalFind;
    Latest.bulkWrite = originalBulkWrite;
  }
});

test('bounds concurrent article persistence without serializing all writes', async () => {
  const originalFind = Latest.find;
  const originalBulkWrite = Latest.bulkWrite;
  let activeReads = 0;
  let maxActiveReads = 0;
  const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  Latest.find = () => ({
    select() { return this; },
    async lean() {
      activeReads += 1;
      maxActiveReads = Math.max(maxActiveReads, activeReads);
      await delay(5);
      activeReads -= 1;
      return [];
    },
  });
  Latest.bulkWrite = async (operations) => {
    await delay(5);
    return { upsertedCount: operations.length, modifiedCount: 0, matchedCount: 0 };
  };

  try {
    await Promise.all(Array.from({ length: 18 }, (_, index) => (
      persistLatestArticles([article(`concurrent-${index}`)])
    )));
    assert.ok(maxActiveReads <= MAX_CONCURRENT_MONGO_PERSISTENCE);
    assert.ok(maxActiveReads > 1);
  } finally {
    Latest.find = originalFind;
    Latest.bulkWrite = originalBulkWrite;
  }
});
