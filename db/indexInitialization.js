const { createHash } = require('crypto');

const INDEX_INITIALIZATION_ID = 'application-index-initialization';
const INDEX_INITIALIZATION_LEASE_MS = 60 * 1000;
const INDEX_INITIALIZATION_RENEWAL_MS = 15 * 1000;
const INDEX_INITIALIZATION_POLL_MS = 1000;

function getModelIndexSignature(models) {
  const declarations = models.map((model) => [
    model.modelName,
    model.collection.name,
    model.schema.indexes(),
  ]).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

  return createHash('sha256').update(JSON.stringify(declarations)).digest('hex');
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function initializeIndexesWithLease({
  collection,
  owner,
  signature,
  initialize,
  leaseDurationMs = INDEX_INITIALIZATION_LEASE_MS,
  renewalIntervalMs = INDEX_INITIALIZATION_RENEWAL_MS,
  pollIntervalMs = INDEX_INITIALIZATION_POLL_MS,
  now = () => Date.now(),
  waitFor = wait,
}) {
  if (!collection || typeof collection.findOne !== 'function'
    || typeof collection.findOneAndUpdate !== 'function'
    || typeof collection.updateOne !== 'function') {
    throw new TypeError('collection must support findOne, findOneAndUpdate, and updateOne');
  }
  if (!owner || !signature || typeof initialize !== 'function') {
    throw new TypeError('owner, signature, and initialize are required');
  }

  while (true) {
    const state = await collection.findOne({ _id: INDEX_INITIALIZATION_ID });
    if (state?.initializedSignature === signature) return { initialized: false };

    const acquiredAt = new Date(now());
    let lease;
    try {
      lease = await collection.findOneAndUpdate(
        {
          _id: INDEX_INITIALIZATION_ID,
          $or: [
            { lease_until: { $exists: false } },
            { lease_until: { $lte: acquiredAt } },
          ],
        },
        {
          $set: {
            owner,
            acquired_at: acquiredAt,
            lease_until: new Date(acquiredAt.getTime() + leaseDurationMs),
          },
          $setOnInsert: { created_at: acquiredAt },
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
    }

    if (lease?.owner !== owner) {
      await waitFor(pollIntervalMs);
      continue;
    }
    break;
  }

  let leaseLost = null;
  let renewalPromise = null;
  const assertLeaseOwnership = () => {
    if (leaseLost) {
      throw new Error('MongoDB index initialization lease was lost', { cause: leaseLost });
    }
  };
  const renewLease = () => {
    if (renewalPromise) return;
    renewalPromise = collection.updateOne(
      { _id: INDEX_INITIALIZATION_ID, owner },
      { $set: { lease_until: new Date(now() + leaseDurationMs) } }
    ).then((result) => {
      if (result.matchedCount !== 1) {
        leaseLost = new Error('Index initialization lease is no longer owned by this instance');
      }
    }).catch((error) => {
      leaseLost = error;
    }).finally(() => {
      renewalPromise = null;
    });
  };
  const renewalTimer = setInterval(renewLease, renewalIntervalMs);
  renewalTimer.unref?.();

  try {
    assertLeaseOwnership();
    await initialize(assertLeaseOwnership);
    assertLeaseOwnership();

    const completedAt = new Date(now());
    const result = await collection.updateOne(
      { _id: INDEX_INITIALIZATION_ID, owner },
      {
        $set: {
          initializedSignature: signature,
          initializedAt: completedAt,
        },
        $unset: { owner: '', acquired_at: '', lease_until: '' },
      }
    );
    if (result.matchedCount !== 1) {
      throw new Error('Could not mark MongoDB index initialization as complete');
    }
    return { initialized: true };
  } finally {
    clearInterval(renewalTimer);
    if (renewalPromise) await renewalPromise;
  }
}

module.exports = {
  getModelIndexSignature,
  initializeIndexesWithLease,
  INDEX_INITIALIZATION_ID,
};
