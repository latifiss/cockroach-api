const test = require('node:test');
const assert = require('node:assert/strict');
const {
  prepareClusters,
  stableClusterId,
  createArticleSlug,
  persistNewsClusters,
} = require('../../services/articles/newsPersistence');

function article(articleId, title = 'Same story', extra = {}) {
  return {
    article_id: articleId,
    title,
    source_id: `source-${articleId}`,
    relevance_score: 1,
    description: 'Story description',
    ...extra,
  };
}

test('prepares clusters with one occurrence of each article identity', () => {
  const first = article('article-1');
  const duplicate = article('article-1', 'Better story', { content: 'More complete content' });
  const second = article('article-2');

  const prepared = prepareClusters([[first, duplicate], [duplicate, second]]);

  assert.equal(prepared.length, 2);
  assert.deepEqual(prepared.map((cluster) => cluster.articles.map((item) => item.article_id)), [
    ['article-1'],
    ['article-2'],
  ]);
  assert.equal(prepared[0].articles[0].title, 'Better story');
});

test('uses stable cluster IDs regardless of article order', () => {
  const first = article('article-1');
  const second = article('article-2');
  assert.equal(stableClusterId([first, second]), stableClusterId([second, first]));
});

test('creates different unique slugs for different articles with the same title', () => {
  assert.notEqual(
    createArticleSlug(article('article-1')),
    createArticleSlug(article('article-2'))
  );
});

test('detaches incoming articles from their previous clusters before upserting new membership', async () => {
  const existing = {
    _id: 'old-cluster',
    articles: [
      { article_id: 'article-1', title: 'Same story', relevance_score: 1 },
      { article_id: 'article-old', title: 'Older story', relevance_score: 0.5 },
    ],
  };
  const writes = [];
  const deletions = [];
  const model = {
    find() {
      return { lean: async () => [existing] };
    },
    async bulkWrite(operations) {
      writes.push(operations);
      return {
        upsertedCount: operations.filter((operation) => operation.updateOne.upsert).length,
        modifiedCount: operations.length,
      };
    },
    async deleteMany(filter) {
      deletions.push(filter);
      return { deletedCount: 0 };
    },
  };

  const result = await persistNewsClusters(model, [[article('article-1')]], { retryDelayMs: 1 });

  assert.equal(writes.length, 2);
  assert.deepEqual(
    writes[0][0].updateOne.update.$set.articles.map((item) => item.article_id),
    ['article-old']
  );
  assert.equal(writes[1][0].updateOne.update.$set.articles[0].article_id, 'article-1');
  assert.equal(writes[1][0].updateOne.upsert, true);
  assert.equal(result.detached, 1);
  assert.equal(deletions.length, 0);
});

test('deletes emptied clusters before writing replacement cluster documents', async () => {
  const events = [];
  const writes = [];
  let deleteFilter;
  const storedArticles = [{ article_id: 'article-1', title: 'Story', slug: createArticleSlug(article('article-1')) }];
  const model = {
    find() {
      return {
        lean: async () => [{
          _id: 'old-cluster',
          cluster_id: 'old-cluster',
          articles: storedArticles,
        }],
      };
    },
    async bulkWrite(operations) {
      events.push('bulkWrite');
      writes.push(operations);
      return {
        upsertedCount: operations.filter((operation) => operation.updateOne.upsert).length,
        modifiedCount: operations.length,
      };
    },
    async deleteMany(filter) {
      events.push('deleteMany');
      deleteFilter = filter;
      return { deletedCount: 1 };
    },
  };

  const result = await persistNewsClusters(model, [[article('article-1')]]);

  assert.deepEqual(events, ['deleteMany', 'bulkWrite']);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0].updateOne.upsert, true);
  assert.deepEqual(deleteFilter._id.$in, ['old-cluster']);
  assert.equal(deleteFilter.articles, undefined);
  assert.equal(result.detached, 1);
  assert.equal(result.removed, 1);
});
test('repairs legacy articles with missing slugs before cluster writes', async () => {
  const incoming = article('article-1');
  const legacyDocument = {
    _id: 'legacy-cluster',
    cluster_id: 'legacy-cluster',
    articles: [
      { article_id: 'legacy-article-1', title: 'Legacy story' },
      { article_id: 'legacy-article-2', title: 'Another legacy story', slug: null },
    ],
  };
  const writes = [];
  let storedArticles = legacyDocument.articles;
  const model = {
    find(query) {
      assert.ok(query.$or.some((condition) => condition['articles.slug'] === null));
      return { lean: async () => [legacyDocument] };
    },
    async bulkWrite(operations) {
      writes.push(operations);
      if (operations[0].updateOne.filter._id === 'legacy-cluster') {
        storedArticles = operations[0].updateOne.update.$set.articles;
        assert.ok(storedArticles.every((item) => typeof item.slug === 'string' && item.slug.length > 0));
        assert.equal(new Set(storedArticles.map((item) => item.slug)).size, storedArticles.length);
      }
      return {
        upsertedCount: operations.filter((operation) => operation.updateOne.upsert).length,
        modifiedCount: operations.length,
      };
    },
    async deleteMany() {
      return { deletedCount: 0 };
    },
  };

  await persistNewsClusters(model, [[incoming]]);

  assert.equal(writes.length, 2);
  assert.ok(storedArticles.every((item) => item.slug !== null && item.slug !== undefined));
});

test('keeps an article in its existing cluster on an identical repeated run', async () => {
  const incoming = article('article-1');
  const clusterId = stableClusterId([incoming]);
  const existing = {
    _id: 'current-cluster',
    cluster_id: clusterId,
    articles: [{
      ...incoming,
      slug: createArticleSlug(incoming),
      article_type: 'main',
      meta: 'Story description',
      published_at: new Date('2026-01-01T00:00:00.000Z'),
    }],
  };
  const writes = [];
  let deleteCalls = 0;
  const model = {
    find() {
      return { lean: async () => [existing] };
    },
    async bulkWrite(operations) {
      writes.push(operations);
      return { upsertedCount: 0, modifiedCount: 0, matchedCount: 1 };
    },
    async deleteMany() {
      deleteCalls += 1;
      return { deletedCount: 0 };
    },
  };

  const result = await persistNewsClusters(model, [[incoming]]);

  assert.equal(writes.length, 1);
  assert.equal(writes[0][0].updateOne.filter.cluster_id, clusterId);
  assert.equal(result.detached, 0);
  assert.equal(result.removed, 0);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 0);
  assert.equal(deleteCalls, 0);
});

test('rejects a stored slug owned by a different article before writing', async () => {
  const incoming = article('incoming-article');
  const conflictingStoredArticle = {
    article_id: 'different-article',
    title: incoming.title,
    slug: createArticleSlug(incoming),
  };
  let writeCalls = 0;
  const model = {
    find() {
      return {
        lean: async () => [{
          _id: 'legacy-cluster',
          cluster_id: 'legacy-cluster',
          articles: [conflictingStoredArticle],
        }],
      };
    },
    async bulkWrite() {
      writeCalls += 1;
      return { upsertedCount: 0, modifiedCount: 0 };
    },
  };

  await assert.rejects(
    persistNewsClusters(model, [[incoming]]),
    (error) => error.code === 'NEWS_SLUG_CONFLICT'
      && error.slugConflicts[0].existingArticleId === 'different-article'
  );
  assert.equal(writeCalls, 0);
});


test('persists a cluster batch atomically under the owned scheduler lease', async () => {
  const events = [];
  const session = {
    async withTransaction(callback) {
      events.push('transaction:start');
      await callback();
      events.push('transaction:commit');
    },
    async endSession() {
      events.push('session:end');
    },
  };
  const leaseModel = {
    async updateOne(filter, update, options) {
      assert.equal(filter.owner, 'test-owner');
      assert.ok(options.session);
      assert.equal(update.$inc.lease_revision, 1);
      events.push('lease:verified');
      return { matchedCount: 1 };
    },
  };
  const writes = [];
  const model = {
    db: { async startSession() { return session; } },
    find() {
      return {
        session() { return this; },
        async lean() { return []; },
      };
    },
    async bulkWrite(operations, options) {
      assert.equal(options.session, session);
      writes.push(operations);
      events.push('bulkWrite');
      return { upsertedCount: 1, modifiedCount: 0, matchedCount: 0 };
    },
    async deleteMany() {
      throw new Error('No deletion should be needed');
    },
  };

  const result = await persistNewsClusters(model, [[article('article-transaction')]], {
    leaseOwner: 'test-owner',
    leaseModel,
    transactionBatchSize: 1,
  });

  assert.equal(result.inserted, 1);
  assert.equal(result.batches, 1);
  assert.equal(writes.length, 1);
  assert.deepEqual(events, [
    'transaction:start',
    'lease:verified',
    'bulkWrite',
    'transaction:commit',
    'session:end',
  ]);
});

test('aborts cluster persistence when the scheduler lease is no longer owned', async () => {
  let writes = 0;
  let ended = false;
  const session = {
    async withTransaction(callback) { await callback(); },
    async endSession() { ended = true; },
  };
  const model = {
    db: { async startSession() { return session; } },
    find() {
      throw new Error('News lookup must not run without the lease');
    },
    async bulkWrite() {
      writes += 1;
    },
  };

  await assert.rejects(
    persistNewsClusters(model, [[article('article-lease-lost')]], {
      leaseOwner: 'stale-owner',
      leaseModel: { async updateOne() { return { matchedCount: 0 }; } },
    }),
    (error) => error.code === 'PIPELINE_LEASE_LOST'
  );
  assert.equal(writes, 0);
  assert.equal(ended, true);
});
