# News Aggregation Intelligence — Architecture Audit

**Branch:** `feature/news-aggregation-intelligence`  
**Audit type:** Static repository and architecture review  
**Status:** Audit complete; implementation has not started  
**Review standard:** Production-minded, staff-level backend engineering

## 1. Executive assessment

The repository is not a greenfield API. It already contains a broad publisher integration catalogue, RSS and HTML collectors, MongoDB/Mongoose persistence, article and cluster endpoints, scheduled jobs, semantic embeddings, keyword relevance, and Redis utilities.

The right strategy is to evolve the existing system behind stable interfaces. Replacing the collector catalogue or rewriting all existing endpoints would add migration risk without creating immediate intelligence value.

The current system is best described as a collection of overlapping ingestion and feed-generation paths rather than one controlled ingestion pipeline. The most important architectural change is to establish a single, observable path from source collection through canonicalization, deduplication, story clustering, enrichment, ranking, persistence, and read APIs.

## 2. Existing system inventory

| Area | Existing implementation | Audit assessment |
|---|---|---|
| Runtime | Node.js, CommonJS, Express 5 | Keep for the initial modernization; avoid an unnecessary framework migration. |
| Persistence | MongoDB with Mongoose 8 | Reuse initially; introduce explicit domain models and indexes. |
| Source integrations | `sources/` plus `sourcesIndex.js` | Valuable existing asset, but registry and adapter contracts are implicit. |
| Collection | RSS Parser, Axios, Cheerio, individual source functions | Reuse adapters; centralize orchestration, limits, timing, and outcomes. |
| Latest feed | `jobs/latest.job.js`, `Latest` model | Overlaps with other ingestion paths and has persistence-contract defects. |
| Clustering | `utils/newsCluster.js`, `News` model, cluster job | Embedding-based prototype; needs lifecycle, batching, and deterministic boundaries. |
| Deduplication | `utils/deduplicate.js` | Too weak for cross-publisher identity resolution. |
| Ranking | `utils/rankArticle.js`, `keywordRelevance.js` | Keyword-only and Ghana-heavy; not a calibrated multi-signal ranking system. |
| Categorization | `utils/categorize.js` | Demonstration-level classifier, not production enrichment. |
| Scheduling | `node-cron` jobs in application workers | Scheduling and execution ownership are not sufficiently isolated. |
| Caching | In-memory feed cache and Redis client utility | In-memory cache is per process; Redis utility is not a coherent cache boundary. |
| API | Multiple news, latest, feed, cluster, and article controllers | Several routes independently fetch, cluster, or mutate the same data. |
| Tests | `package.json` test script exits with “no test specified” | No usable automated test command is currently configured. |
| Operations | Console logging and basic `/health` route | No durable source health, run history, or pipeline-level operational view. |

## 3. High-priority findings

### P0 — Correctness and data integrity

1. **There are multiple ingestion implementations.** The latest job, cluster job, feed cache, cluster controller, latest controller, and manual update controller each fetch sources and transform articles independently. The same publisher can be fetched and interpreted multiple times with different behavior.
2. **The latest persistence payload does not satisfy its model contract.** The job does not reliably populate required fields such as `slug` and `source_link`; it also assigns the `generateMetaDescription` function itself in one fallback instead of its return value. Its upsert filter can include an undefined slug.
3. **The cluster update endpoint is destructive.** It deletes every existing cluster before inserting replacements. A failure between deletion and successful insertion can leave the collection empty.
4. **Deduplication can collapse unrelated records.** The current key is `article_id || link`; records without either value share an undefined key. It also does not canonicalize URLs or resolve title-based cross-source duplicates.
5. **Article schemas contain inconsistent/duplicated fields.** The article model declares `source_tags` twice, and the article/latest/news models do not represent one consistent canonical article contract.

### P0 — Runtime and workload control

1. **Feed collection starts at module import time.** The feed controller calls `updateNewsCache()` and starts a process-local interval at the top level. Since the application forks multiple workers and imports this controller in each worker, every worker can run its own full collection cycle.
2. **The application has several competing collection schedules.** Latest and cluster jobs both poll all sources every five minutes; the feed cache also refreshes; request handlers can trigger full source collection. This multiplies upstream traffic, CPU usage, and model inference work.
3. **The embedding model is initialized inside every clustering call.** There is no shared model lifecycle or bounded embedding batch strategy. Embeddings are requested concurrently for the entire input set.
4. **Source fan-out is unbounded.** `Promise.all` is used across the complete source registry without a central concurrency budget, timeout policy, or per-source execution record.
5. **Worker ownership is implicit.** Cron registration and process lifecycle are tied to the web application cluster rather than a distinct worker role with an explicit lease or singleton guarantee.

### P1 — Intelligence quality

1. **Clustering is greedy and order-dependent.** Each article is compared with a cluster seed rather than a robust cluster representation. Input ordering can change membership.
2. **Clustering only enforces a source-name uniqueness rule.** This is not equivalent to story identity and can incorrectly prevent legitimate same-publisher updates from being grouped.
3. **Ranking is mostly keyword substring matching.** The source credibility argument is not used; scores are unbounded; recency, corroboration, originality, geography, topic, and freshness are not consistently represented.
4. **The relevance vocabulary is geographically narrow.** Ghana-specific signals are useful but should increase local relevance, not suppress important international stories.
5. **Categorization is not production-ready.** The current Naive Bayes classifier has only a handful of training examples and reads `article.text`, which is not the common title/description shape returned by the source adapters.
6. **No durable enrichment state exists.** Topic, entity, location, event, summary, confidence, model version, and enrichment timestamps are not managed as independently versioned outputs.

### P1 — Observability and operations

1. A source failure is usually logged to the console and converted to an empty result. The system cannot reliably distinguish a healthy source with no new articles from a failed source.
2. There is no durable collection-run record with start/end time, outcome, counts, latency, retry count, and error classification.
3. There is no source-health history or API surface for degraded sources and recovery.
4. The health endpoint reports process health only; it does not distinguish liveness from readiness or report MongoDB/worker dependencies.
5. Error handling and operational behavior differ across collectors and jobs.

### P1 — API and security

1. Read endpoints and write/refresh endpoints are mixed with no consistent service boundary.
2. The manual update route can trigger full ingestion through an HTTP request; it must not remain an unguarded public operational trigger.
3. CORS is unrestricted and there is no visible centralized rate-limit, security-header, or request-validation layer in the inspected application entry point.
4. Some endpoints accept unbounded or weakly validated pagination and user-provided regular expressions.
5. Controllers return internal error details in several paths.

## 4. Architecture decisions

### Decision 1: One ingestion pipeline

All scheduled and manual ingestion must call the same application service. Controllers must not fetch publishers directly.

Target flow:

```text
Source Registry
    |
Collection Scheduler
    |
Collection Orchestrator ---- Source Health / Run Records
    |
Source Adapters (RSS / HTML / JSON / API)
    |
Raw Article Contract
    |
Normalization & Validation
    |
Canonical Article Identity
    |
Deduplication & Revision Detection
    |
Story Candidate Generation
    |
Story Clustering
    |
Intelligence Enrichment
    |
Ranking & Geographic Relevance
    |
Persistence
    |
Read Models / API / Cache
```

### Decision 2: Preserve adapters, standardize their contract

Existing source functions should be wrapped or migrated incrementally to a documented adapter contract. A source should return metadata and article records; the orchestrator should own concurrency, timeouts, retries, metrics, and failure isolation.

A source failure must not fail the entire collection run. Each source execution should produce a structured outcome.

### Decision 3: Separate article identity from story identity

An article is a publisher's individual publication. A story is the underlying real-world event or developing narrative covered by one or more articles. The system must preserve both identities.

- **Article identity:** canonical URL, publisher/source, normalized title fingerprint, publication metadata, and stable source identifiers.
- **Story identity:** stable cluster identifier, representative headline, member articles, topic/entity/location associations, and lifecycle timestamps.

A new article should not force a story to receive a new identity merely because its membership changes.

### Decision 4: Persist pipeline state explicitly

Introduce durable records for:
- source definitions and operational status;
- collection runs and per-source execution outcomes;
- canonical articles and article revisions;
- story clusters and cluster membership;
- enrichment outputs and model/version metadata.

Do not use one large embedded article array as the only source of truth for all pipeline stages. Read-optimized documents can be derived from canonical records.

### Decision 5: Make intelligence explainable and versioned

Ranking should expose component scores and reason codes, not only one opaque number. Initial signals should include recency, source quality, independent corroboration, geographic relevance, topic relevance, article completeness, and story velocity.

Enrichment outputs must record their method/model version, confidence where available, and timestamps. AI-generated claims should never overwrite source facts.

### Decision 6: Keep geography additive

GH, CI, NG, and combined audience contexts should contribute positive relevance signals. They must not act as hard filters that remove important global reporting. The same story can have multiple audience-specific ranking results without duplicating the underlying story.

### Decision 7: Separate API processes from background work

The HTTP application should serve persisted read models. A dedicated worker role should own scheduled collection and pipeline processing. If deployment constraints initially require one deployment, process roles must still be explicit and only one scheduler owner may run.

### Decision 8: Migrate without breaking existing consumers

Existing routes and response shapes should be treated as compatibility contracts until usage is verified. New services should be introduced behind existing controllers or versioned endpoints. Destructive collection replacement should be removed before any wider migration.

## 5. Proposed domain boundaries

| Domain | Responsibility |
|---|---|
| `sources` | Source definitions, adapter implementations, source metadata and capabilities. |
| `collection` | Scheduling, orchestration, concurrency, timeout/retry policy, run lifecycle. |
| `articles` | Normalization, validation, canonical identity, revisions, deduplication. |
| `stories` | Candidate generation, clustering, membership, representative story metadata. |
| `intelligence` | Topic classification, entity extraction, geography, summaries, event signals. |
| `ranking` | Explainable scoring, audience-specific relevance, freshness and trend signals. |
| `operations` | Source health, run history, pipeline metrics, readiness and recovery. |
| `api` | Request validation, authorization, compatibility responses and read models. |
| `platform` | Database, cache, configuration, logging, telemetry and lifecycle management. |

These are logical boundaries first. They do not require splitting the repository into microservices.

## 6. Implementation sequence

| Order | Work package | Exit criteria |
|---:|---|---|
| 1 | Architecture and contract foundation | Domain boundaries, canonical data contracts, migration plan and test strategy documented. |
| 2 | Runtime safety and configuration | Predictable startup/shutdown, readiness/liveness, one scheduler owner, validated configuration. |
| 3 | Source registry and collection orchestration | Central registry, bounded concurrency, per-source isolation, timeout/retry policy, structured outcomes. |
| 4 | Canonical article pipeline | Normalization, validation, URL canonicalization, stable identity and safe upserts. |
| 5 | Source/run observability | Durable run history, source health state, failure classification, health APIs. |
| 6 | Story identity and clustering | Deterministic candidate generation, incremental membership, cluster lifecycle and evaluation fixtures. |
| 7 | Intelligence enrichment | Versioned topics, entities, locations, event metadata and summaries with confidence/provenance. |
| 8 | Explainable ranking | Component scores, freshness, source quality, corroboration, geographic and audience relevance. |
| 9 | Read APIs and caching | Stable pagination, filters, indexes, compatibility layer and cache invalidation. |
| 10 | Security, reliability and release | Authorization for operational writes, request limits, resilience tests, load tests, documentation and rollout plan. |

## 7. Engineering standards and acceptance gates

Every work package should include:
- unit tests for deterministic domain logic;
- integration tests for persistence and orchestration boundaries;
- fixtures for representative RSS, HTML, malformed, duplicate, and stale source data;
- explicit error handling and structured logs;
- bounded resource use and observable latency;
- indexes and query plans for production read paths;
- migration/backfill and rollback considerations where persisted data changes;
- no secrets, credentials, or production-only configuration committed to source control.

Release gates:
1. A single source failure cannot abort unrelated source collection.
2. A collection run cannot silently replace healthy data with an empty result.
3. Re-running a collection is idempotent.
4. The same publisher article does not create duplicate canonical records.
5. Story membership changes do not create uncontrolled story identity churn.
6. Ranking output includes inspectable component scores and reason codes.
7. Source failures and recovery are queryable through operational APIs.
8. Web requests never trigger an uncontrolled full-source crawl.
9. Existing consumer routes remain compatible or have an explicit versioned migration.
10. Tests run from a real `npm test` command and CI blocks regressions.

## 8. Immediate implementation priorities

The first code changes should not start with an LLM call or a new ranking formula. They should establish the safety rails that make later intelligence reliable:

1. Add a real test harness and baseline fixtures.
2. Centralize runtime configuration and structured logging.
3. Stop module-import side effects and guarantee one scheduler owner.
4. Introduce the source registry/adapter contract and bounded collection orchestration.
5. Persist collection runs and per-source health outcomes.
6. Establish a canonical article contract before migrating clustering and ranking.

## 9. Scope boundaries

- Keep the existing Express, CommonJS, MongoDB/Mongoose stack for the first modernization phase.
- Do not introduce microservices, Kafka, Kubernetes, or a new database merely for architectural appearance.
- Do not replace the existing source catalogue wholesale.
- Do not make AI-generated summaries or labels the source of truth.
- Do not delete or rewrite legacy collections until compatibility, backfill, and rollback are established.

## 10. Audit limitations

This is a static review of the repository files inspected on the feature branch. No application was executed, no production database was queried, and no live publisher endpoints were tested as part of this audit. Runtime findings should be confirmed with tests and controlled execution before production changes.
