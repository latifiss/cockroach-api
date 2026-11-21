const test = require('node:test');
const assert = require('node:assert/strict');
const Latest = require('../../models/latest.model');
const News = require('../../models/news.model');
const Article = require('../../models/article.model');
const {
  getModelIndexSignature,
  initializeIndexesWithLease,
  INDEX_INITIALIZATION_ID,
} = require('../../db/indexInitialization');

function createLeaseCollection(initialState = null) {
  let state = initialState ? { ...initialState } : null;

  return {
    async findOne() {
      return state ? { ...state } : null;
    },
    async findOneAndUpdate(filter, update, options) {
      const expiredBefore = filter.$or[1].lease_until.$lte;
      const leaseIsExpired = !state?.lease_until || state.lease_until <= expiredBefore;
      if (!leaseIsExpired) {
        if (options.upsert) {
          const error = new Error('Duplicate key');
          error.code = 11000;
          throw error;
        }
        return null;
      }

      state = {
        ...(state || {}),
        ...(state ? {} : update.$setOnInsert),
        ...update.$set,
        _id: filter._id,
      };
      return { ...state };
    },
    async updateOne(filter, update) {
      if (!state || state._id !== filter._id || state.owner !== filter.owner) {
        return { matchedCount: 0 };
      }
      Object.assign(state, update.$set || {});
      for (const key of Object.keys(update.$unset || {})) delete state[key];
      return { matchedCount: 1 };
    },
    get state() {
      return state ? { ...state } : null;
    },
  };
}

test('serializes index initialization and records completion for the same index signature', async () => {
  const collection = createLeaseCollection();
  let releaseInitialization;
  let signalStarted;
  const initializationGate = new Promise((resolve) => { releaseInitialization = resolve; });
  const initializationStarted = new Promise((resolve) => { signalStarted = resolve; });
  let calls = 0;

  const first = initializeIndexesWithLease({
    collection,
    owner: 'instance-1',
    signature: 'indexes-v1',
    leaseDurationMs: 1000,
    renewalIntervalMs: 100,
    pollIntervalMs: 1,
    initialize: async () => {
      calls += 1;
      signalStarted();
      await initializationGate;
    },
  });

  await initializationStarted;
  const second = initializeIndexesWithLease({
    collection,
    owner: 'instance-2',
    signature: 'indexes-v1',
    leaseDurationMs: 1000,
    renewalIntervalMs: 100,
    pollIntervalMs: 1,
    initialize: async () => { calls += 1; },
  });

  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(calls, 1);
  releaseInitialization();

  assert.deepEqual(await Promise.all([first, second]), [
    { initialized: true },
    { initialized: false },
  ]);
  assert.equal(calls, 1);
  assert.equal(collection.state.initializedSignature, 'indexes-v1');
  assert.equal(collection.state.owner, undefined);
  assert.equal(collection.state.lease_until, undefined);
});

test('recovers an expired initialization lease without deleting its record', async () => {
  const collection = createLeaseCollection({
    _id: INDEX_INITIALIZATION_ID,
    owner: 'crashed-instance',
    lease_until: new Date(Date.now() - 1000),
    acquired_at: new Date(Date.now() - 2000),
  });
  let calls = 0;

  const result = await initializeIndexesWithLease({
    collection,
    owner: 'recovery-instance',
    signature: 'indexes-v1',
    leaseDurationMs: 1000,
    renewalIntervalMs: 100,
    initialize: async () => { calls += 1; },
  });

  assert.deepEqual(result, { initialized: true });
  assert.equal(calls, 1);
  assert.equal(collection.state._id, INDEX_INITIALIZATION_ID);
  assert.equal(collection.state.initializedSignature, 'indexes-v1');
  assert.equal(collection.state.owner, undefined);
});

test('reruns initialization when the declared index signature changes', async () => {
  const collection = createLeaseCollection({
    _id: INDEX_INITIALIZATION_ID,
    initializedSignature: 'indexes-v1',
  });
  let calls = 0;

  const result = await initializeIndexesWithLease({
    collection,
    owner: 'instance-2',
    signature: 'indexes-v2',
    leaseDurationMs: 1000,
    renewalIntervalMs: 100,
    initialize: async () => { calls += 1; },
  });

  assert.deepEqual(result, { initialized: true });
  assert.equal(calls, 1);
  assert.equal(collection.state.initializedSignature, 'indexes-v2');
});

test('changes the deployment signature when model index declarations change', () => {
  const model = {
    modelName: 'Sample',
    collection: { name: 'samples' },
    schema: { indexes: () => [[{ first: 1 }, {}]] },
  };
  const initialSignature = getModelIndexSignature([model]);

  assert.equal(getModelIndexSignature([{ ...model }]), initialSignature);
  assert.notEqual(
    getModelIndexSignature([{
      ...model,
      schema: { indexes: () => [[{ second: -1 }, {}]] },
    }]),
    initialSignature
  );
});

test('declares Latest intelligence, News category, and Article indexes in their schemas', () => {
  const latestIndexes = Latest.schema.indexes();
  const newsIndexes = News.schema.indexes();
  const articleIndexes = Article.schema.indexes();

  assert.ok(latestIndexes.some(([fields]) => (
    fields.article_id === 1 && Object.keys(fields).length === 1
  )));
  assert.ok(latestIndexes.some(([fields]) => (
    fields.published_at === -1 && Object.keys(fields).length === 1
  )));
  assert.ok(latestIndexes.some(([fields]) => (
    fields.first_seen_at === -1 && fields.published_at === -1
  )));
  assert.ok(latestIndexes.some(([fields, options]) => (
    fields.slug === 1 && options.unique === true
  )));

  assert.ok(newsIndexes.some(([fields]) => (
    fields.average_relevance === -1 && fields.updatedAt === -1
  )));
  assert.ok(newsIndexes.some(([fields]) => (
    fields['articles.source_tags'] === 1 && fields.updatedAt === -1
  )));
  assert.ok(newsIndexes.some(([fields, options]) => (
    fields['articles.source_tags'] === 1
      && fields.updatedAt === -1
      && options.background === false
  )));
  assert.ok(newsIndexes.some(([fields, options]) => (
    fields.cluster_id === 1 && options.unique === true
  )));
  assert.ok(articleIndexes.some(([fields, options]) => (
    fields.slug === 1 && options.unique === true
  )));
});
