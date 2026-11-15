const test = require('node:test');
const assert = require('node:assert/strict');
const { createIntelligenceArticleQueue } = require('../../services/collection/intelligenceArticleQueue');

test('deduplicates queued article IDs and safely restores failed batch IDs', () => {
  const queue = createIntelligenceArticleQueue();

  assert.equal(queue.add(['article-1', 'article-1', 'article-2']), 2);
  const failedBatch = queue.take();
  assert.deepEqual(failedBatch, ['article-1', 'article-2']);
  assert.equal(queue.size, 0);

  queue.add(['article-3']);
  queue.add(failedBatch);
  assert.equal(queue.size, 3);
  assert.deepEqual(queue.take(), ['article-3', 'article-1', 'article-2']);
});
