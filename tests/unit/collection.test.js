const test = require('node:test');
const assert = require('node:assert/strict');
const { mapWithConcurrency } = require('../../services/collection/limitConcurrency');
const { createSourceRegistry } = require('../../services/collection/sourceRegistry');
const { runCollection } = require('../../services/collection/collectionOrchestrator');
const { attachSourceConfigName, attachSourceDomainUrl } = require('../../utils/sourceConfig');

test('mapWithConcurrency preserves input order and respects the concurrency limit', async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency([30, 10, 20, 5], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, value));
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(results, [60, 20, 40, 10]);
  assert.equal(peak, 2);
});

test('mapWithConcurrency rejects invalid limits', async () => {
  await assert.rejects(mapWithConcurrency([], 0, async () => {}), /concurrency/);
});

test('source registry allows multiple collectors for one publisher but rejects duplicate collector identifiers', () => {
  const fetchPublisherFeedA = () => {};
  fetchPublisherFeedA.sourceId = '1004';
  const fetchPublisherFeedB = () => {};
  fetchPublisherFeedB.sourceId = '1004';

  const registry = createSourceRegistry([fetchPublisherFeedA, fetchPublisherFeedA, fetchPublisherFeedB]);
  assert.equal(registry.length, 2);
  assert.equal(registry[0].id, 'fetchPublisherFeedA');
  assert.equal(registry[1].id, 'fetchPublisherFeedB');
  assert.equal(registry[0].publisher_id, '1004');
  assert.equal(registry[1].publisher_id, '1004');

  const duplicateCollector = function fetchPublisherFeedA() {};
  assert.throws(() => createSourceRegistry([fetchPublisherFeedA, duplicateCollector]), /Duplicate collector identifier/);
});

test('source registry supplies a non-empty name when a source name is blank', () => {
  const fetchGraphicSportsArticles = async () => ({ articles: [] });
  fetchGraphicSportsArticles.sourceName = '  ';
  const [source] = createSourceRegistry([fetchGraphicSportsArticles]);
  assert.equal(source.name, 'Graphic Sports');
});

test('source registry uses the configured name for failed sources', async () => {
  const fetch3NewsBusiness = async () => {
    throw new Error('unavailable');
  };
  attachSourceConfigName({ fetch3NewsBusiness }, {
    '3news-business': { name: '3News', domain_url: '3news.com', source_category: 'Sports' },
  });

  const registry = createSourceRegistry([fetch3NewsBusiness]);
  const result = await runCollection(registry, { retryAttempts: 0 });

  assert.equal(result.results[0].sourceName, '3News');
  assert.equal(result.results[0].sourceId, 'fetch3NewsBusiness');
  assert.equal(result.results[0].domain_url, '3news.com');
  assert.equal(result.results[0].source_category, 'Sports');
});

test('source registry carries the domain URL for sources without SOURCE_CONFIG', async () => {
  const fetchSkyNewsBusiness = async () => ({ articles: [] });
  attachSourceDomainUrl({ fetchSkyNewsBusiness }, 'skynews.com', 'Business & Finance');

  const [source] = createSourceRegistry([fetchSkyNewsBusiness]);
  const result = await runCollection([source], { retryAttempts: 0 });

  assert.equal(result.results[0].source.domain_url, 'skynews.com');
  assert.equal(result.results[0].source_category, 'Business & Finance');
  assert.equal(result.results[0].source.source_category, 'Business & Finance');
});

test('collection isolates source failures and reports source outcomes', async () => {
  const registry = createSourceRegistry([
    async () => ({ source_name: 'A', articles: [{ title: 'One' }] }),
    async () => { throw new Error('publisher unavailable'); },
  ]);
  const result = await runCollection(registry, { concurrency: 1, retryAttempts: 0, timeoutMs: 100 });
  assert.equal(result.sourceCount, 2);
  assert.equal(result.succeededCount, 1);
  assert.equal(result.failedCount, 1);
  assert.equal(result.articleCount, 1);
  assert.equal(result.results[1].error.message, 'publisher unavailable');
});

test('collection retries a failed source within configured policy', async () => {
  let attempts = 0;
  const registry = createSourceRegistry([async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary');
    return { articles: [] };
  }]);
  const result = await runCollection(registry, { retryAttempts: 1, retryDelayMs: 0, timeoutMs: 100 });
  assert.equal(attempts, 2);
  assert.equal(result.succeededCount, 1);
  assert.equal(result.results[0].attempts, 2);
});

test('collection records timeout failures', async () => {
  const registry = createSourceRegistry([async () => new Promise(() => {})]);
  const result = await runCollection(registry, { retryAttempts: 0, timeoutMs: 10 });
  assert.equal(result.failedCount, 1);
  assert.equal(result.results[0].error.code, 'SOURCE_TIMEOUT');
});

test('collector payload publisher metadata survives when it is not attached to the fetch function', async () => {
  const fetchExampleFeed = async () => ({
    source_id: 'publisher-42',
    source_name: 'Payload Name',
    source_origin: 'Ghana',
    source_tags: ['business'],
    source_credibility: 3,
    articles: [{ title: 'A story' }],
  });
  attachSourceDomainUrl({ fetchExampleFeed }, 'example.com', 'Business & Finance');

  const [source] = createSourceRegistry([fetchExampleFeed]);
  const result = await runCollection([source], { retryAttempts: 0 });
  const outcome = result.results[0];

  assert.equal(outcome.sourceId, 'fetchExampleFeed');
  assert.equal(outcome.source_id, 'publisher-42');
  assert.equal(outcome.publisher_id, 'publisher-42');
  assert.equal(outcome.collector_id, 'fetchExampleFeed');
  assert.equal(outcome.source.source_id, 'publisher-42');
  assert.equal(outcome.source.source_name, 'Payload Name');
  assert.equal(outcome.source.domain_url, 'example.com');
  assert.equal(outcome.source.source_category, 'Business & Finance');
  assert.equal(outcome.source.source_credibility, 3);
});
