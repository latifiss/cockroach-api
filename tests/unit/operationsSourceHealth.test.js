const test = require('node:test');
const assert = require('node:assert/strict');
const SourceHealth = require('../../models/sourceHealth.model');
const { getSourceHealth } = require('../../controllers/operations.controller');

test('source health endpoint fills in names for legacy records', async () => {
  const originalFind = SourceHealth.find;
  let response;
  SourceHealth.find = () => ({
    sort() {
      return this;
    },
    async lean() {
      return [
        { source_id: 'fetchGraphicSportsArticles', source_name: '' },
        { source_id: 'fetchGraphicSportsArticles', source_name: 'Graphic Sports' },
        { source_id: 'fetchLifeHackerHealthNews', source_name: 'Life Hacker' },
      ];
    },
  });

  try {
    await getSourceHealth({ query: {} }, {
      json(body) {
        response = body;
        return this;
      },
    });

    assert.equal(response.sources[0].source_name, 'Graphic');
    assert.equal(response.sources[0].domain_url, 'graphic.com.gh');
    assert.equal(response.sources[0].source_category, 'Sports');
    assert.equal(response.sources[1].source_name, 'Graphic');
    assert.equal(response.sources[1].domain_url, 'graphic.com.gh');
    assert.equal(response.sources[1].source_category, 'Sports');
    assert.equal(response.sources[2].source_name, 'Life Hacker Health');
    assert.equal(response.sources[2].domain_url, 'lifehacker.com');
    assert.equal(response.sources[2].source_category, 'Science & Health');
  } finally {
    SourceHealth.find = originalFind;
  }
});
