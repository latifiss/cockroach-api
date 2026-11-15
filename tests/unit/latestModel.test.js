const test = require('node:test');
const assert = require('node:assert/strict');
const Latest = require('../../models/latest.model');

test('indexes latest article lookup and intelligence date queries without uniqueness assumptions', () => {
  const indexes = Latest.schema.indexes();

  assert.ok(indexes.some(([keys, options]) => (
    keys.article_id === 1 && options.name === 'latest_article_id_idx' && options.unique !== true
  )));
  assert.ok(indexes.some(([keys, options]) => (
    keys.published_at === -1 && options.name === 'latest_published_at_idx'
  )));
  assert.ok(indexes.some(([keys, options]) => (
    keys.first_seen_at === -1
      && keys.published_at === -1
      && options.name === 'latest_first_seen_published_at_idx'
  )));
});
