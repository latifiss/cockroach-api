const CollectionRun = require('../../models/collectionRun.model');
const SourceHealth = require('../../models/sourceHealth.model');
const { transitionSourceHealth } = require('./sourceHealth');

async function persistCollectionRun(run) {
  const status = run.failedCount === 0
    ? 'completed'
    : run.succeededCount === 0
      ? 'failed'
      : 'completed_with_errors';

  const document = await CollectionRun.create({
    status,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    duration_ms: run.durationMs,
    source_count: run.sourceCount,
    succeeded_count: run.succeededCount,
    failed_count: run.failedCount,
    article_count: run.articleCount,
    source_outcomes: run.results.map((result) => ({
      source_id: result.sourceId,
      status: result.status,
      attempts: result.attempts,
      started_at: result.startedAt,
      completed_at: result.completedAt,
      duration_ms: result.durationMs,
      article_count: result.articleCount,
      error_code: result.error?.code || null,
      error_message: result.error?.message || null,
    })),
  });

  const operations = [];
  for (const result of run.results) {
    const previous = await SourceHealth.findOne({ source_id: result.sourceId }).lean();
    const health = transitionSourceHealth(previous || {}, result, result.source?.source_name || '');
    operations.push({
      updateOne: {
        filter: { source_id: result.sourceId },
        update: { $set: health },
        upsert: true,
      },
    });
  }

  if (operations.length) {
    await SourceHealth.bulkWrite(operations, { ordered: false });
  }

  return document;
}

module.exports = { persistCollectionRun };
