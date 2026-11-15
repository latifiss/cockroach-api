# News Intelligence Pipeline Operations

## Runtime configuration

The application validates these environment variables at startup:

| Variable | Default | Purpose |
|---|---:|---|
| NODE_ENV | development | Runtime environment |
| PORT | 5000 | HTTP server port |
| MONGODB_URI | — | MongoDB connection URI |
| COLLECTION_CONCURRENCY | 8 | Maximum concurrent publisher adapters |
| COLLECTION_TIMEOUT_MS | 20000 | Per-attempt publisher timeout |
| COLLECTION_RETRY_ATTEMPTS | 1 | Retry count after a failed attempt |
| COLLECTION_RETRY_DELAY_MS | 500 | Base retry delay |
| OPS_API_TOKEN | — | Bearer token protecting operational endpoints |

Set a long, random OPS_API_TOKEN before exposing the operations routes. When it is not configured, the operations routes return 404 rather than exposing operational data.

## Operational endpoints

Source health responses include each source's configured display name, base publisher domain (`domain_url`), and one `source_category` from the supported category list. Legacy records are populated from the source registry.

Supported `source_category` values: `News`, `Politics`, `Local`, `Business & Finance`, `Sports`, `World`, `Africa`, `Games`, `Science & Health`, `Entertainment`, `Technology`, and `Lifestyle`.

In an API client's Bearer Token auth setting, enter only the token value; the client adds the `Bearer` prefix. A custom `Authorization` header may contain either `Bearer <OPS_API_TOKEN>` or the token value directly.

All endpoints below require the header `Authorization: Bearer <OPS_API_TOKEN>`.\n\n- `GET /api/operations/health/summary` — high-level status for configured sources, the latest pipeline run, and the scheduler lease. Unseen configured sources count as `unknown`; the endpoint does not assume they are healthy.\n- `GET /api/operations/health/pipeline` — latest ten persisted pipeline runs, the latest stage and outcome, elapsed time, and scheduler lease state.\n

- `GET /api/operations/sources` — source health. Optional `status=healthy|degraded|failing|unknown`.
- `GET /api/operations/collections` — paginated collection-run history. Optional `page`, `limit`, and `status`.
- `GET /api/operations/collections/:id` — source-by-source outcome details for one collection run.

## Pipeline behavior

The scheduler runs the unified collection, canonicalization, persistence and clustering pipeline every 30 minutes (UTC). The legacy latest and clustering job modules now re-export the unified scheduler rather than running independent collectors.

A source failure is isolated from other publishers. Failed attempts are recorded in collection history and source health. A collection run with no successful sources does not overwrite article or cluster data. Empty successful publisher responses are valid and do not delete existing records.

Canonical latest articles are written with MongoDB bulk upserts keyed by canonical article identity. Clusters are also written with bulk upserts keyed by a deterministic hash of their article identities. The feed cache reads persisted clusters; request handlers do not scrape publishers.

## Deployment notes

1. Configure MongoDB and the runtime variables before starting the service.
2. Configure OPS_API_TOKEN and keep it out of source control.
3. Run `npm test` in CI before deployment.
4. Confirm `/health/live` and `/health/ready` after startup.
5. Verify source health and collection history using the protected operations endpoints.

The initial migration intentionally retains existing article and cluster records. It does not perform destructive cleanup or rewrite legacy records.
\n## Health status semantics\n\n- `healthy` — the latest persisted pipeline run completed and configured sources have recorded healthy status.\n- `degraded` — the latest pipeline run had source failures, source records are missing or unknown, or there is not enough persisted evidence to confirm health.\n- `failing` — the latest pipeline run failed or at least one configured source is failing.\n- `running` — the latest persisted pipeline run is currently in a pipeline stage.\n- `stalled` — a persisted run still reports `running` more than 45 minutes after its recorded start.\n- `unknown` — no persisted pipeline run is available.\n\nThe scheduler lease response exposes whether the lease is active and its timestamps; it deliberately does not expose the lease owner identifier. The existing public `/health/live` and `/health/ready` endpoints remain lightweight process and database checks and do not expose operational details.\n