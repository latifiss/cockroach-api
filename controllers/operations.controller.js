const CollectionRun = require('../models/collectionRun.model');
const SourceHealth = require('../models/sourceHealth.model');
const SchedulerLease = require('../models/schedulerLease.model');
const { resolveSourceName } = require('../services/collection/sourceRegistry');
const { sourceRegistry } = require('../services/collection');

const PIPELINE_LEASE_ID = 'news-intelligence-pipeline';
const PIPELINE_STALE_AFTER_MS = Math.max(60 * 1000, Number.parseInt(process.env.PIPELINE_STALE_AFTER_MS, 10) || 10 * 60 * 1000);
const configuredSourceNames = new Map(sourceRegistry.map(({ id, name }) => [id, name]));
const configuredSourceDomains = new Map(sourceRegistry.map(({ id, domain_url }) => [id, domain_url]));
const configuredSourceCategories = new Map(sourceRegistry.map(({ id, source_category }) => [id, source_category]));

function authorizeOperations(req, res, next) {
  const token = process.env.OPS_API_TOKEN;
  if (!token) return res.status(404).json({ error: 'Not found' });
  const authorization = req.get('authorization');
  const suppliedToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? authorization?.trim();
  if (suppliedToken !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function getPipelineStatus(run, now = new Date()) {
  if (!run) return 'unknown';
  if (run.pipeline_status === 'running') {
    const lastActivityAt = run.pipeline_heartbeat_at
      || run.pipeline_stage_started_at
      || run.pipeline_started_at
      || run.started_at;
    const startedAt = lastActivityAt ? new Date(lastActivityAt).getTime() : 0;
    return startedAt && now.getTime() - startedAt > PIPELINE_STALE_AFTER_MS ? 'stalled' : 'running';
  }
  if (run.pipeline_status === 'failed' || run.status === 'failed' && !run.pipeline_status) return 'failing';
  if (run.pipeline_status === 'skipped') return 'skipped';
  if (run.pipeline_status === 'completed') return 'healthy';
  return 'unknown';
}

function serializeLease(lease, now = new Date()) {
  if (!lease) return { status: 'not_found', is_active: false, acquired_at: null, lease_until: null };
  const leaseUntil = lease.lease_until ? new Date(lease.lease_until) : null;
  const isActive = Boolean(leaseUntil && leaseUntil.getTime() > now.getTime());
  return {
    status: isActive ? 'active' : 'expired',
    is_active: isActive,
    acquired_at: lease.acquired_at || null,
    lease_until: lease.lease_until || null,
  };
}

function serializePipelineRun(run, now) {
  const pipelineStartedAt = run.pipeline_started_at || run.started_at || null;
  const pipelineCompletedAt = run.pipeline_completed_at
    || (run.pipeline_status === 'completed' || run.pipeline_status === 'skipped' ? run.completed_at : null);
  const stageStartedAt = run.pipeline_stage_started_at || null;
  const stageAgeMs = stageStartedAt ? Math.max(0, now.getTime() - new Date(stageStartedAt).getTime()) : null;

  return {
    id: run._id,
    status: run.status,
    pipeline_status: run.pipeline_status || 'pending',
    pipeline_stage: run.pipeline_stage || null,
    pipeline_error: run.pipeline_error || null,
    pipeline_started_at: pipelineStartedAt,
    pipeline_completed_at: pipelineCompletedAt,
    pipeline_duration_ms: run.pipeline_duration_ms ?? null,
    pipeline_heartbeat_at: run.pipeline_heartbeat_at || null,
    pipeline_stage_started_at: stageStartedAt,
    pipeline_stage_completed_at: run.pipeline_stage_completed_at || null,
    pipeline_stage_duration_ms: run.pipeline_stage_duration_ms ?? null,
    stage_age_ms: stageAgeMs,
    started_at: run.started_at,
    completed_at: run.completed_at,
    duration_ms: run.duration_ms,
    source_count: run.source_count || 0,
    succeeded_count: run.succeeded_count || 0,
    failed_count: run.failed_count || 0,
    article_count: run.article_count || 0,
  };
}

async function getPipelineHealth(req, res) {
  try {
    const now = new Date();
    const [runs, lease] = await Promise.all([
      CollectionRun.find().sort({ started_at: -1 }).limit(10).lean(),
      SchedulerLease.findById(PIPELINE_LEASE_ID).select('lease_until acquired_at').lean(),
    ]);
    const latestRun = runs[0] || null;
    const status = getPipelineStatus(latestRun, now);

    return res.json({
      status,
      checked_at: now,
      stale_after_ms: PIPELINE_STALE_AFTER_MS,
      last_run: latestRun ? serializePipelineRun(latestRun, now) : null,
      scheduler_lease: serializeLease(lease, now),
      recent_runs: runs.map((run) => serializePipelineRun(run, now)),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve pipeline health' });
  }
}

async function getHealthSummary(req, res) {
  try {
    const now = new Date();
    const [sourceRecords, latestRun, lease] = await Promise.all([
      SourceHealth.find().lean(),
      CollectionRun.findOne().sort({ started_at: -1 }).lean(),
      SchedulerLease.findById(PIPELINE_LEASE_ID).select('lease_until acquired_at').lean(),
    ]);

    const sourceCounts = { healthy: 0, degraded: 0, failing: 0, unknown: 0 };
    const knownSourceIds = new Set();
    for (const source of sourceRecords) {
      if (!configuredSourceNames.has(source.source_id)) continue;
      knownSourceIds.add(source.source_id);
      const status = sourceCounts[source.status] === undefined ? 'unknown' : source.status;
      sourceCounts[status] += 1;
    }
    sourceCounts.unknown += Math.max(0, configuredSourceNames.size - knownSourceIds.size);

    const pipelineStatus = getPipelineStatus(latestRun, now);
    const schedulerLease = serializeLease(lease, now);
    const hasSourceDegradation = sourceCounts.failing > 0 || sourceCounts.degraded > 0 || sourceCounts.unknown > 0;
    const status = pipelineStatus === 'failing' || pipelineStatus === 'stalled'
      ? 'failing'
      : pipelineStatus === 'healthy' && !hasSourceDegradation
        ? 'healthy'
        : 'degraded';

    const pipelineRun = latestRun ? serializePipelineRun(latestRun, now) : null;
    return res.json({
      status,
      checked_at: now,
      sources: {
        configured: configuredSourceNames.size,
        tracked: knownSourceIds.size,
        untracked: Math.max(0, configuredSourceNames.size - knownSourceIds.size),
        by_status: sourceCounts,
      },
      pipeline: {
        status: pipelineStatus,
        last_run_at: pipelineRun?.pipeline_started_at || null,
        last_completed_at: pipelineRun?.pipeline_completed_at || null,
        last_run_status: latestRun?.status || null,
        last_stage: latestRun?.pipeline_stage || null,
        last_error: latestRun?.pipeline_error || null,
        heartbeat_at: latestRun?.pipeline_heartbeat_at || null,
        stage_started_at: latestRun?.pipeline_stage_started_at || null,
        stage_age_ms: pipelineRun?.stage_age_ms ?? null,
        duration_ms: latestRun?.pipeline_duration_ms ?? null,
      },
      scheduler: schedulerLease,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve health summary' });
  }
}

async function getSourceHealth(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const sources = await SourceHealth.find(filter).sort({ status: 1, last_attempt_at: -1 }).lean();
    for (const source of sources) {
      source.source_name = resolveSourceName(
        source.source_id,
        configuredSourceNames.get(source.source_id),
        source.source_name
      );
      source.domain_url = configuredSourceDomains.get(source.source_id) || source.domain_url;
      source.source_category = configuredSourceCategories.get(source.source_id) || source.source_category || 'News';
    }
    return res.json({ total: sources.length, sources });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve source health' });
  }
}

async function getCollectionRuns(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const [runs, total] = await Promise.all([
      CollectionRun.find(filter).sort({ started_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CollectionRun.countDocuments(filter),
    ]);
    return res.json({ total, page, per_page: limit, total_pages: Math.ceil(total / limit), runs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve collection runs' });
  }
}

async function getCollectionRun(req, res) {
  try {
    const run = await CollectionRun.findById(req.params.id).lean();
    if (!run) return res.status(404).json({ error: 'Collection run not found' });
    return res.json({ run });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid collection run identifier' });
  }
}

module.exports = {
  authorizeOperations,
  getHealthSummary,
  getPipelineHealth,
  getSourceHealth,
  getCollectionRuns,
  getCollectionRun,
  getPipelineStatus,
  serializeLease,
};
