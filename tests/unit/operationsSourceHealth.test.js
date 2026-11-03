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

    assert.equal(response.sources[0].source_name, 'Graphic Sports');
    assert.equal(response.sources[1].source_name, 'Life Hacker');
  } finally {
    SourceHealth.find = originalFind;
  }
});
