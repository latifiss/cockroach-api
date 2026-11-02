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
