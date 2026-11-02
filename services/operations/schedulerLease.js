const { randomUUID } = require('crypto');
const SchedulerLease = require('../../models/schedulerLease.model');

const LEASE_ID = 'news-intelligence-pipeline';
const LEASE_DURATION_MS = 30 * 60 * 1000;
const ownerId = `${process.pid}:${randomUUID()}`;

async function acquirePipelineLease() {
  const now = new Date();
  try {
    const lease = await SchedulerLease.findOneAndUpdate(
      { _id: LEASE_ID, lease_until: { $lt: now } },
      {
        $set: {
          owner: ownerId,
          acquired_at: now,
          lease_until: new Date(now.getTime() + LEASE_DURATION_MS),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return lease?.owner === ownerId;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}

async function releasePipelineLease() {
  await SchedulerLease.updateOne(
    { _id: LEASE_ID, owner: ownerId },
    { $set: { lease_until: new Date(Date.now() + 4 * 60 * 1000) } }
  );
}

module.exports = { acquirePipelineLease, releasePipelineLease };
