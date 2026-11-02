function transitionSourceHealth(previous = {}, outcome, sourceName = '') {
  const now = outcome.completedAt || new Date();
  const failures = outcome.status === 'failed'
    ? (previous.consecutive_failures || 0) + 1
    : 0;
  const totalRuns = (previous.total_runs || 0) + 1;
  const successfulRuns = (previous.successful_runs || 0) + (outcome.status === 'succeeded' ? 1 : 0);
  const failedRuns = (previous.failed_runs || 0) + (outcome.status === 'failed' ? 1 : 0);

  let status = 'healthy';
  if (outcome.status === 'failed') {
    status = failures >= 3 ? 'failing' : 'degraded';
  }

  return {
    source_id: outcome.sourceId,
    source_name: sourceName || previous.source_name || '',
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

module.exports = { transitionSourceHealth };
