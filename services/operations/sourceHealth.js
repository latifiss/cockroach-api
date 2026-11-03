function humanizeSourceId(sourceId) {
  const value = String(sourceId || 'unknown-source').trim();
  const name = value
    .replace(/^fetch/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/\b(Articles|News)\b$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return name || value || 'Unknown source';
}

function transitionSourceHealth(previous = {}, outcome, sourceName) {
  const now = outcome.completedAt || new Date();
  const failures = outcome.status === 'failed'
    ? (previous.consecutive_failures || 0) + 1
    : 0;
  const totalRuns = (previous.total_runs || 0) + 1;
  const successfulRuns = (previous.successful_runs || 0) + (outcome.status === 'succeeded' ? 1 : 0);
  const failedRuns = (previous.failed_runs || 0) + (outcome.status === 'failed' ? 1 : 0);
  const resolvedSourceName = String(
    sourceName || outcome.sourceName || outcome.source?.source_name || previous.source_name || humanizeSourceId(outcome.sourceId)
  ).trim();

  let status = 'healthy';
  if (outcome.status === 'failed') {
    status = failures >= 3 ? 'failing' : 'degraded';
  }

  return {
    source_id: outcome.sourceId,
    source_name: resolvedSourceName || humanizeSourceId(outcome.sourceId),
    status,
    consecutive_failures: failures,
    total_runs: totalRuns,
    successful_runs: successfulRuns,
    failed_runs: failedRuns,
    last_attempt_at: now,
    last_success_at: outcome.status === 'succeeded' ? now : previous.last_success_at || null,
    last_failure_at: outcome.status === 'failed' ? now : previous.last_failure_at || null,
    last_error_code: outcome.error?.code || null,
    last_error_message: outcome.error?.message || null,
    last_duration_ms: outcome.durationMs ?? null,
    last_article_count: outcome.articleCount || 0,
  };
}

module.exports = { transitionSourceHealth, humanizeSourceId };
