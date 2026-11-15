const CollectionRun = require('../models/collectionRun.model');
const SourceHealth = require('../models/sourceHealth.model');
const SchedulerLease = require('../models/schedulerLease.model');
const { resolveSourceName } = require('../services/collection/sourceRegistry');
const { sourceRegistry } = require('../services/collection');

const PIPELINE_LEASE_ID = 'news-intelligence-pipeline';
const PIPELINE_STALE_AFTER_MS = 45 * 60 * 1000;
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
    const startedAt = run.started_at ? new Date(run.started_at).getTime() : 0;
    return startedAt && now.getTime() - startedAt > PIPELINE_STALE_AFTER_MS ? 'stalled' : 'running';
  }
  if (run.pipeline_status === 'failed' || run.status === 'failed') return 'failing';
  if (run.status === 'completed_with_errors' || run.failed_count > 0) return 'degraded';
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

async function getPipelineHealth(req, res) {
  try {
    const now = new Date();
    const [runs, lease] = await Promise.all([
      CollectionRun.find().sort({ started_at: -1 }).limit(10).lean(),
      SchedulerLease.findById(PIPELINE_LEASE_ID).select('lease_until acquired_at').lean(),
    ]);
    const latestRun = runs[0] || null;
    const status = getPipelineStatus(latestRun, now);
    const startedAt = latestRun?.started_at ? new Date(latestRun.started_at) : null;
    const ageMs = startedAt ? Math.max(0, now.getTime() - startedAt.getTime()) : null;

    return res.json({
      status,
      checked_at: now,
      stale_after_ms: PIPELINE_STALE_AFTER_MS,
      last_run: latestRun ? {
        id: latestRun._id,
        status: latestRun.status,
        pipeline_status: latestRun.pipeline_status || 'pending',
        pipeline_stage: latestRun.pipeline_stage || null,
        pipeline_error: latestRun.pipeline_error || null,
        started_at: latestRun.started_at,
        completed_at: latestRun.completed_at,
        duration_ms: latestRun.duration_ms,
        age_ms: ageMs,
        source_count: latestRun.source_count || 0,
        succeeded_count: latestRun.succeeded_count || 0,
        failed_count: latestRun.failed_count || 0,
        article_count: latestRun.article_count || 0,
      } : null,
      scheduler_lease: serializeLease(lease, now),
      recent_runs: runs.map((run) => ({
        id: run._id,
        status: run.status,
        pipeline_status: run.pipeline_status || 'pending',
        pipeline_stage: run.pipeline_stage || null,
        started_at: run.started_at,
        completed_at: run.completed_at,
        duration_ms: run.duration_ms,
        source_count: run.source_count || 0,
        succeeded_count: run.succeeded_count || 0,
        failed_count: run.failed_count || 0,
        article_count: run.article_count || 0,
      })),
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
    const hasSourceFailures = sourceCounts.failing > 0;
    const hasSourceDegradation = sourceCounts.degraded > 0 || sourceCounts.unknown > 0;
    const status = pipelineStatus === 'failing' || pipelineStatus === 'stalled' || hasSourceFailures
      ? 'failing'
      : pipelineStatus === 'healthy' && !hasSourceDegradation
        ? 'healthy'
        : 'degraded';

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
        last_run_at: latestRun?.started_at || null,
        last_completed_at: latestRun?.completed_at || null,
        last_run_status: latestRun?.status || null,
        last_stage: latestRun?.pipeline_stage || null,
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
