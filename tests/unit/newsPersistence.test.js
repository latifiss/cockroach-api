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

test('releases slugs from emptied clusters before writing replacement cluster documents', async () => {
  const writes = [];
  let deleteFilter;
  let storedArticles = [{ article_id: 'article-1', title: 'Story', slug: createArticleSlug(article('article-1')) }];
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
      writes.push(operations);
      for (const operation of operations) {
        const update = operation.updateOne;
        if (update.filter._id === 'old-cluster') {
          storedArticles = update.update.$set.articles;
          continue;
        }
        if (update.update.$set.cluster_id) {
          const incomingSlug = update.update.$set.articles[0].slug;
          assert.equal(
            storedArticles.some((item) => item.slug === incomingSlug),
            false,
            'old cluster must release its article slug before the replacement upsert'
          );
        }
      }
      return {
        upsertedCount: operations.filter((operation) => operation.updateOne.upsert).length,
        modifiedCount: operations.length,
      };
    },
    async deleteMany(filter) {
      deleteFilter = filter;
      return { deletedCount: 1 };
    },
  };

  const result = await persistNewsClusters(model, [[article('article-1')]]);

  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0][0].updateOne.update.$set.articles, []);
  assert.equal(writes[0][0].updateOne.update.$set.size, 0);
  assert.deepEqual(deleteFilter._id.$in, ['old-cluster']);
  assert.equal(result.detached, 1);
  assert.equal(result.removed, 1);
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
