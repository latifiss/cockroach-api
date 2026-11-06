const test = require('node:test');
const assert = require('node:assert/strict');
const { authorizeOperations } = require('../../controllers/operations.controller');

function authorize(header) {
  let statusCode;
  let responseBody;
  let nextCalled = false;
  const req = { get: () => header };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  authorizeOperations(req, res, () => {
    nextCalled = true;
  });

  return { statusCode, responseBody, nextCalled };
}

test('authorizes bearer and raw operations tokens', () => {
  const originalToken = process.env.OPS_API_TOKEN;
  process.env.OPS_API_TOKEN = 'test-operations-token';

  try {
    for (const header of [
      'Bearer test-operations-token',
      'bearer test-operations-token',
      'Bearer   test-operations-token  ',
      'test-operations-token',
    ]) {
      assert.equal(authorize(header).nextCalled, true, `Expected authorization for ${header}`);
    }
  } finally {
    if (originalToken === undefined) delete process.env.OPS_API_TOKEN;
    else process.env.OPS_API_TOKEN = originalToken;
  }
});

test('rejects invalid credentials and hides unconfigured operations routes', () => {
  const originalToken = process.env.OPS_API_TOKEN;
  process.env.OPS_API_TOKEN = 'test-operations-token';

  try {
    const unauthorized = authorize('Bearer incorrect-token');
    assert.equal(unauthorized.statusCode, 401);
    assert.deepEqual(unauthorized.responseBody, { error: 'Unauthorized' });

    delete process.env.OPS_API_TOKEN;
    const hidden = authorize('Bearer test-operations-token');
    assert.equal(hidden.statusCode, 404);
    assert.deepEqual(hidden.responseBody, { error: 'Not found' });
  } finally {
    if (originalToken === undefined) delete process.env.OPS_API_TOKEN;
    else process.env.OPS_API_TOKEN = originalToken;
  }
});
