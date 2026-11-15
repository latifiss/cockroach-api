const test = require('node:test');
const assert = require('node:assert/strict');
const CollectionRun = require('../../models/collectionRun.model');
const SourceHealth = require('../../models/sourceHealth.model');
const SchedulerLease = require('../../models/schedulerLease.model');
const { sourceRegistry } = require('../../services/collection');
const {
  getHealthSummary,
  getPipelineHealth,
  getPipelineStatus,
  serializeLease,
} = require('../../controllers/operations.controller');

test('pipeline status uses the latest heartbeat rather than total stage age', () => {
  const now = new Date('2026-11-15T10:00:00.000Z');
  assert.equal(getPipelineStatus(null, now), 'unknown');
  assert.equal(getPipelineStatus({
    pipeline_status: 'running',
    pipeline_started_at: new Date('2026-11-15T08:00:00.000Z'),
    pipeline_stage_started_at: new Date('2026-11-15T08:00:00.000Z'),
    pipeline_heartbeat_at: new Date('2026-11-15T09:59:30.000Z'),
  }, now), 'running');
  assert.equal(getPipelineStatus({
    pipeline_status: 'running',
    pipeline_heartbeat_at: new Date('2026-11-15T09:40:00.000Z'),
  }, now), 'stalled');
  assert.equal(getPipelineStatus({ pipeline_status: 'failed' }, now), 'failing');
  assert.equal(getPipelineStatus({ pipeline_status: 'skipped' }, now), 'skipped');
  assert.equal(getPipelineStatus({ status: 'completed_with_errors', pipeline_status: 'completed' }, now), 'healthy');
  assert.equal(getPipelineStatus({ status: 'completed', pipeline_status: 'completed' }, now), 'healthy');
});

test('scheduler lease serialization does not expose its owner token', () => {
  const now = new Date('2026-11-15T10:00:00.000Z');
  const active = serializeLease({
    owner: 'private-process-owner',
    acquired_at: new Date('2026-11-15T09:59:00.000Z'),
    lease_until: new Date('2026-11-15T10:05:00.000Z'),
  }, now);
  assert.equal(active.status, 'active');
  assert.equal(active.is_active, true);
  assert.equal(Object.hasOwn(active, 'owner'), false);
  assert.equal(serializeLease(null, now).status, 'not_found');
});

test('pipeline health exposes pipeline lifecycle timestamps and lease', async () => {
  const originals = {
    find: CollectionRun.find,
    findById: SchedulerLease.findById,
  };
  const latestRun = {
    _id: 'run-123',
    status: 'completed_with_errors',
    pipeline_status: 'completed',
    pipeline_stage: 'completed',
    pipeline_started_at: new Date(Date.now() - 120000),
    pipeline_completed_at: new Date(),
    pipeline_duration_ms: 120000,
    pipeline_heartbeat_at: new Date(),
    pipeline_stage_started_at: new Date(Date.now() - 10000),
    pipeline_stage_completed_at: new Date(),
    pipeline_stage_duration_ms: 10000,
    started_at: new Date(Date.now() - 180000),
    completed_at: new Date(Date.now() - 60000),
    duration_ms: 60000,
    source_count: 10,
    succeeded_count: 9,
    failed_count: 1,
    article_count: 120,
  };
  CollectionRun.find = () => ({
    sort() { return this; },
    limit() { return this; },
    async lean() { return [latestRun]; },
  });
  SchedulerLease.findById = () => ({
    select() {
      return {
        async lean() {
          return { acquired_at: new Date(), lease_until: new Date(Date.now() + 60000) };
        },
      };
    },
  });

  try {
    let response;
    await getPipelineHealth({}, {
      json(body) { response = body; return this; },
      status(code) { this.statusCode = code; return this; },
    });
    assert.equal(response.status, 'healthy');
    assert.equal(response.last_run.id, 'run-123');
    assert.equal(response.last_run.failed_count, 1);
    assert.equal(response.last_run.pipeline_duration_ms, 120000);
    assert.equal(response.scheduler_lease.is_active, true);
    assert.equal(response.recent_runs.length, 1);
  } finally {
    CollectionRun.find = originals.find;
    SchedulerLease.findById = originals.findById;
  }
});

test('health summary keeps source degradation separate from pipeline execution status', async () => {
  const originals = {
    find: SourceHealth.find,
    findOne: CollectionRun.findOne,
    findById: SchedulerLease.findById,
  };
  SourceHealth.find = () => ({
    async lean() {
      return [{
        source_id: sourceRegistry[0].id,
        status: 'failing',
      }];
    },
  });
  CollectionRun.findOne = () => ({
    sort() { return this; },
    async lean() {
      return {
        status: 'completed_with_errors',
        pipeline_status: 'completed',
        pipeline_stage: 'completed',
        pipeline_started_at: new Date(Date.now() - 120000),
        pipeline_completed_at: new Date(),
        pipeline_heartbeat_at: new Date(),
        pipeline_duration_ms: 120000,
        started_at: new Date(),
        completed_at: new Date(),
        failed_count: 1,
      };
    },
  });
  SchedulerLease.findById = () => ({
    select() {
      return { async lean() { return null; } };
    },
  });

  try {
    let response;
    await getHealthSummary({}, {
      json(body) { response = body; return this; },
      status(code) { this.statusCode = code; return this; },
    });
    assert.equal(response.pipeline.status, 'healthy');
    assert.equal(response.pipeline.duration_ms, 120000);
    assert.equal(response.sources.by_status.failing, 1);
    assert.equal(response.status, 'degraded');
  } finally {
    SourceHealth.find = originals.find;
    CollectionRun.findOne = originals.findOne;
    SchedulerLease.findById = originals.findById;
  }
});
