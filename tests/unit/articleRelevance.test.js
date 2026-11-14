const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreArticleRelevance, scoreArticlesRelevance } = require('../../utils/articleRelevance');

test('scores weighted keywords in titles more strongly than body text', () => {
  const titleScore = scoreArticleRelevance({ title: 'Ghana announces new policy' });
  const bodyScore = scoreArticleRelevance({ title: 'New announcement', description: 'Ghana announces a new policy' });

  assert.ok(titleScore > bodyScore);
  assert.ok(titleScore > 1);
});

test('matches configured keywords without case sensitivity or partial-word matches', () => {
  const upperCase = scoreArticleRelevance({ title: 'GHANA election update' });
  const partialWord = scoreArticleRelevance({ title: 'Ghanaians discuss a proposal' });

  assert.ok(upperCase > 1);
  assert.equal(partialWord, 1);
});

test('scores categories and source tags and caps the final score', () => {
  const tagged = scoreArticleRelevance({
    title: 'A developing story',
    categories: ['Politics', 'Election'],
    source_tags: ['Ghana', 'Accra'],
  });
  const maximum = scoreArticleRelevance({
    title: 'Ghana Accra election galamsey economy corruption healthcare education',
    description: 'Ghana Accra election galamsey economy corruption healthcare education',
    content: 'Ghana Accra election galamsey economy corruption healthcare education',
  });

  assert.ok(tagged > 1);
  assert.ok(maximum <= 100);
});

test('returns scored article copies without mutating the originals', () => {
  const articles = [{ title: 'Ghana election results' }];
  const scored = scoreArticlesRelevance(articles);

  assert.ok(scored[0].relevance_score > 1);
  assert.equal(articles[0].relevance_score, undefined);
});
