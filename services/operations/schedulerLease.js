const { randomUUID } = require('crypto');
const SchedulerLease = require('../../models/schedulerLease.model');
const { createLogger } = require('../../utils/logger');
const logger = createLogger();

const LEASE_ID = 'news-intelligence-pipeline';
const LEASE_DURATION_MS = 30 * 60 * 1000;
const ownerId = `${process.pid}:${randomUUID()}`;

async function acquirePipelineLease() {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MS);

  const lease = await SchedulerLease.findOneAndUpdate(
    { _id: LEASE_ID, lease_until: { $lte: now } },
    {
      $set: {
        owner: ownerId,
        acquired_at: now,
        lease_until: leaseUntil,
      },
    },
    { new: true }
  ).lean();

  if (lease?.owner === ownerId) return true;

  try {
    await SchedulerLease.create({
      _id: LEASE_ID,
      owner: ownerId,
      acquired_at: now,
      lease_until: leaseUntil,
    });
    return true;
  } catch (error) {
    if (error.code === 11000) {
      const currentLease = await SchedulerLease.findById(LEASE_ID).select('owner lease_until acquired_at').lean();
      logger.warn('Pipeline scheduler lease is currently held', {
        leaseUntil: currentLease?.lease_until,
        acquiredAt: currentLease?.acquired_at,
        ownerIsCurrentProcess: currentLease?.owner === ownerId,
      });
      return false;
    }
    throw error;
  }
}

async function releasePipelineLease() {
  await SchedulerLease.updateOne(
    { _id: LEASE_ID, owner: ownerId },
    { $set: { lease_until: new Date() } }
  );
}

module.exports = { acquirePipelineLease, releasePipelineLease };
