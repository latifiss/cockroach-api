const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalizeUrl, normalizeArticle, deduplicateCanonicalArticles } = require('../../services/articles/canonicalArticle');

test('canonicalizes publisher URLs and removes tracking parameters', () => {
  assert.equal(
    canonicalizeUrl('http://www.Example.com/story/?utm_source=feed&id=2#section'),
    'https://example.com/story?id=2'
  );
});

test('normalizes article records into a stable canonical contract', () => {
  const first = normalizeArticle({ title: '  A   major story ', link: 'https://example.com/a?utm_campaign=x' }, { source_name: 'Example' });
  const second = normalizeArticle({ title: 'A major story', link: 'https://example.com/a' }, { source_name: 'Example' });
  assert.equal(first.article_id, second.article_id);
  assert.equal(first.title, 'A major story');
  assert.equal(first.source_name, 'Example');
});

test('scopes publisher-local identifiers to their source when URLs are unavailable', () => {
  const first = normalizeArticle({ title: 'Story', article_id: '123' }, { source_id: 'publisher-a' });
  const second = normalizeArticle({ title: 'Story', article_id: '123' }, { source_id: 'publisher-b' });
  assert.notEqual(first.article_id, second.article_id);
});

test('rejects records without titles', () => {
  assert.equal(normalizeArticle({ link: 'https://example.com/no-title' }), null);
});

test('deduplication retains the most complete record for an identity', () => {
  const sparse = { identity_key: 'same', title: 'Story', description: '' };
  const complete = { identity_key: 'same', title: 'Story', description: 'Description', image_url: 'image' };
  assert.deepEqual(deduplicateCanonicalArticles([sparse, complete]), [complete]);
});

test('preserves publisher metadata without mixing publisher and article categories', () => {
  const article = normalizeArticle({
    title: 'Publisher metadata story',
    link: 'https://example.com/story',
    categories: ['Politics'],
  }, {
    source_id: 'publisher-42',
    publisher_id: 'publisher-42',
    collector_id: 'fetchExamplePolitics',
    source_name: 'Example News',
    domain_url: 'example.com',
    source_category: 'News',
    source_credibility: 4,
    source_origin: 'Ghana',
    source_tags: ['ghana', 'politics'],
    source_link: 'https://example.com',
  });

  assert.equal(article.source_id, 'publisher-42');
  assert.equal(article.publisher_id, 'publisher-42');
  assert.equal(article.collector_id, 'fetchExamplePolitics');
  assert.equal(article.source_name, 'Example News');
  assert.equal(article.domain_url, 'example.com');
  assert.equal(article.source_category, 'News');
  assert.equal(article.source_credibility, 4);
  assert.equal(article.source_origin, 'Ghana');
  assert.deepEqual(article.source_tags, ['ghana', 'politics']);
  assert.deepEqual(article.categories, ['Politics']);
});

test('generates stable source-aware slugs when a publisher slug is missing', () => {
  const first = normalizeArticle({ title: 'A major story', slug: null, link: 'https://example.com/story' }, { source_id: 'publisher-a', source_name: 'Example News' });
  const repeated = normalizeArticle({ title: 'A major story', slug: '', link: 'https://example.com/story?utm_source=feed' }, { source_id: 'publisher-a', source_name: 'Example News' });
  const otherPublisher = normalizeArticle({ title: 'A major story', slug: null, link: 'https://other.example/story' }, { source_id: 'publisher-b', source_name: 'Other News' });

  assert.match(first.slug, /^a-major-story-example-news-/);
  assert.equal(first.slug, repeated.slug);
  assert.notEqual(first.article_id, otherPublisher.article_id);
  assert.notEqual(first.slug, otherPublisher.slug);
});
