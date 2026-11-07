const test = require('node:test');
const assert = require('node:assert/strict');
const SchedulerLease = require('../../models/schedulerLease.model');
const {
  acquirePipelineLease,
  renewPipelineLease,
  releasePipelineLease,
} = require('../../services/operations/schedulerLease');

test('renews and releases only a lease owned by the current process', async () => {
  const originalFindOneAndUpdate = SchedulerLease.findOneAndUpdate;
  const originalUpdateOne = SchedulerLease.updateOne;
  let owner;
  const updates = [];

  try {
    SchedulerLease.findOneAndUpdate = (filter, update) => {
      owner = update.$set.owner;
      return {
        lean: async () => ({ owner }),
      };
    };

    assert.equal(await acquirePipelineLease(), true);
    assert.ok(owner);

    SchedulerLease.updateOne = async (filter, update) => {
      updates.push({ filter, update });
      return { matchedCount: 1 };
    };

    assert.equal(await renewPipelineLease(), true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].filter._id, 'news-intelligence-pipeline');
    assert.equal(updates[0].filter.owner, owner);
    assert.ok(updates[0].filter.lease_until.$gt instanceof Date);
    assert.ok(updates[0].update.$set.lease_until instanceof Date);
    assert.ok(updates[0].update.$set.lease_until > updates[0].filter.lease_until.$gt);

    SchedulerLease.updateOne = async (filter, update) => {
      updates.push({ filter, update });
      return { matchedCount: 0 };
    };

    assert.equal(await renewPipelineLease(), false);
    assert.equal(updates[1].filter.owner, owner);

    SchedulerLease.updateOne = async (filter, update) => {
      updates.push({ filter, update });
      return { matchedCount: 1 };
    };

    assert.equal(await releasePipelineLease(), true);
    assert.equal(updates[2].filter._id, 'news-intelligence-pipeline');
    assert.equal(updates[2].filter.owner, owner);
    assert.ok(updates[2].update.$set.lease_until instanceof Date);
  } finally {
    SchedulerLease.findOneAndUpdate = originalFindOneAndUpdate;
    SchedulerLease.updateOne = originalUpdateOne;
  }
});
