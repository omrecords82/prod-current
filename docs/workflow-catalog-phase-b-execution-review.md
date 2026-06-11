# Workflow Catalog — Phase B Execution Model Design Review

**Pre-implementation architecture review**

| Field | Value |
|-------|-------|
| **Date** | 2026-06-13 |
| **Reviewer** | Architecture review (pre-code) |
| **Design under review** | [workflow-catalog-phase-b-execution-design.md](./workflow-catalog-phase-b-execution-design.md) |
| **Prerequisite** | Phase A shipped (`20260613_workflow_hierarchy_phase_a.sql`) |
| **Verdict** | **Conditional Go** — implement after schema/service corrections in §4 |

---

## 1. Executive summary

The Phase B design is **directionally correct** and addresses the primary gap identified in the architecture analysis: replacing resolver inference with durable per-church execution rows, event timelines, and materialized cross-tenant summaries. The five-layer state separation, write-through + reconcile pattern, and feature-flag migration path are sound.

**However**, the proposed schema has **three blocking correctness issues** (MariaDB `NULL` uniqueness, missing optimistic concurrency, incomplete subject model) and **two scalability gaps** (on-read tenant reconcile on goals path, OCR job cardinality) that must be fixed in the first implementation PR before any write-through hooks land.

| Metric | Value |
|--------|-------|
| **Implementation readiness score** | **76 / 100** (as-designed) → **88 / 100** (with §4 recommendations applied) |
| **Go / No-Go** | **Conditional Go** — proceed with PR sequence §8 after §4 schema/service amendments |

---

## 2. Review by focus area

### 2.1 Execution model correctness — **Good with fixes**

**Strengths**

- Clear separation of definition vs execution vs domain authority.
- Subject-scoped instances correctly model `church.enrollment` (per `ONB_*`) and `ocr.batch.review` (per job).
- Lifecycle states cover operational reality (`blocked` distinct from `failed`).
- `reconcile_hash` + dedupe keys show awareness of idempotency.
- Domain-wins drift policy is correct for a mirror model.

**Issues**

| ID | Severity | Issue |
|----|----------|-------|
| C1 | **Critical** | Composite `UNIQUE (church_id, workflow_key, subject_type, subject_id)` with nullable `subject_id` — MariaDB permits **multiple rows** where `subject_id IS NULL`, breaking church-scoped singleton workflows (`church.ops.setup`, `identity.user.admin`, etc.). |
| C2 | **Critical** | `dedupe_key` nullable `UNIQUE` — same NULL-multiple-rows problem; reconcile retries can duplicate events. |
| C3 | **High** | `records.certificate.generate` models a **one-shot goal** (complete after first cert). That matches current resolver behavior but is not a durable “workflow” for repeat certificate generation — document as `goal_surface` semantics or add `reactivation_policy`. |
| C4 | **High** | `identity.user.admin` has no **re-open** path if active users drop below 2 after completion — execution stays `completed` while resolver would re-surface a goal. |
| C5 | **Medium** | Step rows created lazily on transition — funnel analytics require retroactive inserts on backfill; pre-seed all catalog steps at `execution_created`. |
| C6 | **Medium** | `workflow_version` string only — no FK to `app_workflow_versions.id`; catalog version promotion cannot be traced precisely. |

### 2.2 Multi-tenant scalability (100 → 1,000 → 10,000) — **Good with OCR caveat**

| Tier | Churches | Assessment |
|------|----------|------------|
| **S (100)** | Design adequate | Single tables, materialized summary, no on-read tenant fan-out required. |
| **M (1,000)** | Achievable | Indexed execution queries and summary table meet &lt;500ms targets **if** goals API does not trigger tenant reconcile. |
| **L (10,000)** | Achievable with amendments | OCR job executions dominate row count; nightly full-church scan is **not** acceptable — reconcile **active/stale executions only**. |

**Cardinality driver:** `ocr.batch.review` is multi-instance. At 10k churches × 5 concurrent jobs average = **50k execution rows** (not 40k). Historical jobs push event volume higher unless archive job runs aggressively.

**On-read reconcile (§7.4)** for `ocr.setup.wizard` on goals path: **reject at M scale**. Tenant DB connection per goals request × concurrent parish sessions will exhaust pool. Replace with: read `context_snapshot` + background stale refresh only.

### 2.3 MariaDB indexing strategy — **Needs refinement**

**Adequate**

- `(church_id, status)` — parish goals
- `(workflow_key, current_step_key, status)` — stuck-by-step
- `(execution_id, created_at)` — timeline

**Missing / weak**

| Gap | Recommendation |
|-----|----------------|
| Stuck query uses `updated_at` filter | Add `(workflow_key, status, updated_at)` — replaces low-selectivity `idx_cwe_updated` alone |
| Goals hot path | Add covering `(church_id, status, workflow_key, current_step_key, execution_id)` |
| Active execution lookup by subject | Add `(subject_type, subject_id, workflow_key)` — write-through upsert path |
| Event analytics by date | `(created_at, workflow_key)` or partition key alignment |
| `dedupe_key` lookups | Make `NOT NULL` with sentinel `__none__` or drop nullable |

**FK note:** Child tables FK to `execution_id VARCHAR(36)` on parent's secondary unique key — valid in InnoDB. Acceptable at projected scale; optional future optimization: internal `BIGINT execution_pk` FK for step/event joins, keep `execution_id` as external API ref.

### 2.4 Event volume projections — **Underestimated for OCR history**

**Assumptions (steady-state, 15 filed workflows)**

| Metric | Per church (avg) | 100 | 1,000 | 10,000 |
|--------|------------------|-----|-------|--------|
| Active execution rows | 3–5 | 400 | 4,000 | 40,000–55,000 |
| New events / month | 2–8 | 800 | 8,000 | 80,000 |
| **Cumulative events (24 mo)** | — | **~25k** | **~250k** | **~2.5M** |

**OCR sensitivity analysis**

| Scenario | Event rows @ 10k churches (24 mo) |
|----------|-----------------------------------|
| Design baseline (archive @ 90d, 5 jobs/church lifetime) | ~200k |
| Bulk digitization (50 jobs/church, 8 events/job, 50% archived) | **~2M** |
| No archive policy | **>5M** |

**Conclusion:** Design’s “~200k events at 10k” is valid only with **strict archive** and modest job volume. Plan for **2M events** as L-tier planning figure.

**Events per transition:** Design cites ~5 events/execution lifetime — realistic for church-scoped workflows (~8–15 with full step trail). OCR jobs add ~6–10 events each.

### 2.5 Reconciliation strategy — **Sound pattern, unsafe defaults**

**Strengths**

- Domain-wins on drift
- Nightly full audit + manual scoped reconcile
- Per-workflow reconciler registry mirrors `RUNTIME_RESOLVERS`
- `workflow_execution_reconcile_runs` audit trail

**Issues**

| ID | Issue | Fix |
|----|-------|-----|
| R1 | Nightly loop “each church × each workflow” = 60k iterations at 10k scale | Iterate **domain subjects** (open onboarding, open ocr_jobs) + **stale execution rows** only |
| R2 | Concurrent reconcile + write-through | Reconcile acquires row lock `SELECT … FOR UPDATE` or skips if `updated_at` &lt; 30s |
| R3 | Reconcile behind write-through duplicates events despite dedupe | `dedupe_key` must include `source_updated_at` or domain status hash — **NOT NULL** |
| R4 | Tenant OCR reconcile in nightly batch | Batch by `church_id`, max 5 concurrent tenant pools; timeout 5s/church |

**Recommended reconcile priority queue**

1. Executions with `status IN (active, blocked, pending)` and `last_reconciled_at` stale
2. Domain subjects without execution row (discovery pass)
3. Terminal executions pending archive (age &gt; 90d)

### 2.6 Race conditions — **High risk without concurrency control**

| Scenario | Risk | Mitigation |
|----------|------|------------|
| `onboardingService` commits → write-through fails | Execution lag (OK) / goals wrong until reconcile | Outbox row or retry queue; acceptable with reconcile |
| Write-through + reconcile overlap | Lost update or duplicate events | `lock_version INT` optimistic CAS on execution update |
| Dual OCR worker status update | Last-write-wins on same job execution | Upsert keyed by `(subject_type, subject_id)`; dedupe on `review_status` |
| Goals read during transition | Transient wrong step | Read committed isolation sufficient; optional `read_consistency_token` in response |
| Async summary refresh vs read | Stale KPIs | `workflow_execution_summary.stale=1` during refresh; APIs return `stale` flag |
| Platform domain + execution not one TX | Partial consistency | **Same connection transaction** for `onboarding_requests` + execution when both platform tables |

**`workflowExecutionService` must implement**

```
UPDATE church_workflow_executions
SET …, lock_version = lock_version + 1
WHERE execution_id = ? AND lock_version = ?
```

Return `409 EXECUTION_CONFLICT` on mismatch; reconciler retries.

### 2.7 Workflow state consistency guarantees — **Eventually consistent (by design)**

**Guaranteed (with fixes)**

- At most one **active** church-scoped execution per `(church_id, workflow_key)` when `subject_id` sentinel used
- Append-only events (no UPDATE on `workflow_execution_events`)
- Domain tables remain authoritative; execution catches up within reconcile SLA

**Not guaranteed (document explicitly)**

- Real-time sync between domain and execution (milliseconds) — **target &lt;1s** on write-through paths only
- Cross-table transactional consistency with **tenant DB** (OCR setup) — eventual via reconcile
- Goals API strongly consistent with domain — **eventually consistent** unless same-TX write-through

**SLA proposal**

| Path | Max drift |
|------|-----------|
| Platform write-through (enrollment, ocr_jobs) | 0s (same request) |
| Tenant write-through (ocr setup save) | 0s on save route + execution write |
| Goals read (no write) | Uses execution row; ≤ `stale_after` |
| Nightly reconcile | ≤ 24h for edge cases |

### 2.8 Failure recovery — **Adequate**

**Strengths:** Feature-flag rollback, rename-table emergency rollback, domain tables untouched.

**Gaps**

| Gap | Recommendation |
|-----|----------------|
| No dead-letter for failed write-through | `workflow_execution_outbox` (execution_id, payload, attempts, next_retry) |
| No reconcile partial failure resume | `workflow_execution_reconcile_runs.cursor` JSON checkpoint |
| No church-level rebuild | `POST /reconcile { church_id }` exists — add `rebuild=true` to wipe + recreate |

### 2.9 API performance concerns — **Mostly sound**

| API | Concern | Recommendation |
|-----|---------|----------------|
| `GET /workflow-goals` | Must stay &lt;25ms | Single query: executions + catalog cache in memory; **no reconcile on read** |
| `GET /workflow-executions` list | Offset pagination slow at L | Cursor pagination on `(updated_at, execution_id)` |
| `GET /timeline` cross-execution | Full table scan risk | Require `workflow_key` + date range; cap 90 days default |
| `GET /analytics/funnel` | JSON `step_distribution` parsing | Normalized `workflow_execution_step_summary` table |
| `PATCH` admin transition | Bypass domain | Require `force=true` + audit event; default path goes through domain service |

### 2.10 Backfill migration risks — **Medium-high**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Resolver vs reconciler disagree on `church.ops.setup` | Wrong initial step for ~10–30% churches | Shadow compare report before cutover; log diffs |
| OCR jobs backfill volume | Thousands of execution rows on prod import parishes | Backfill open jobs only; archive seeded jobs as `completed` immediately |
| Backfill without step rows | Broken funnel | Pre-seed all steps; mark prior steps `completed` |
| Write-through enabled before backfill | Duplicate creation attempts | Gate: `EXECUTION_WRITE_THROUGH` only after backfill job success |
| Zero open enrollments today (prod) | Empty enrollment executions until next enroll | Acceptable — verify on next enrollment write-through |
| Historical events skipped | Thin timeline | Backfill optional `reconciled` snapshot event with full `context_snapshot` |

---

## 3. Component-level verdicts

### 3.1 `church_workflow_executions` — **Approve with amendments**

| Aspect | Verdict |
|--------|---------|
| Purpose | Correct canonical row |
| Lifecycle enum | Complete |
| `context_snapshot` | Good denormalization |
| `subject_type` ENUM | Too narrow — extend or use `VARCHAR(32)` + registry |
| `subject_id` NULL | **Must fix** — use sentinel `church:{church_id}` for church-scoped |
| `workflow_version` | Add `workflow_version_id BIGINT UNSIGNED NULL` FK |
| Concurrency | Add `lock_version INT UNSIGNED NOT NULL DEFAULT 0` |
| Archive | Add `superseded_by_execution_id VARCHAR(32) NULL` for enrollment re-runs |

### 3.2 `church_workflow_step_executions` — **Approve**

Pre-seed on create. Consider `duration_ms` generated column. FK on `execution_id` acceptable.

### 3.3 `workflow_execution_events` — **Approve with amendments**

| Decision | Recommendation |
|----------|----------------|
| Partition now vs defer | **Create partitioned from day one** (monthly `RANGE(TO_DAYS(created_at))`) — empty table cost is negligible; avoids painful migration at 500k+ rows. Parent `church_workflow_executions` stays unpartitioned (FK safe). |
| `event_id` format | `WEE_<ULID>` — time-ordered timeline |
| `dedupe_key` | `NOT NULL` — hash or `SHA256(execution_id\|event_type\|to_step\|source_ts\|domain_hash)` |
| Retention | Archive partition drop &gt;24 months; job executions archive to `archived` status at 90d |

### 3.4 `workflow_execution_summary` — **Materialized, not generated**

| Approach | Verdict |
|----------|---------|
| Generated on read (`GROUP BY`) | **Reject** at M+ scale |
| Materialized table (design) | **Approve** |
| Refresh strategy | **Hybrid:** incremental delta on `applyTransition` + nightly full recompute for drift correction |
| JSON `step_distribution` | **Supplement** with `workflow_execution_step_summary(workflow_key, step_key, status, count)` for funnel SQL |

### 3.5 `workflowExecutionService` — **Approve concept; specify contract**

**Required service contract before PR merge**

1. `upsertExecutionFromDomain({ workflow_key, church_id, subject, domainSnapshot, actor })` — single entry for write-through
2. `applyTransition()` — transactional: execution + steps + event + outbox summary delta
3. `reconcileExecution()` — idempotent; respects `lock_version`
4. `discoverSubjects(workflow_key)` — domain query, not church fan-out
5. No direct SQL from routes — all hooks call service

**Do not** expose `applyTransition` on public HTTP (design correct).

---

## 4. Specific design decisions

### 4.1 `execution_id`: UUID vs ULID

| Option | Pros | Cons |
|--------|------|------|
| UUID v4 (design) | Matches `deployment_id` pattern | Random order — poor timeline locality; 36 chars |
| ULID bare | Sortable, 26 chars | Inconsistent with `ONB_` prefix convention |
| **`WEX_<ULID>` (recommended)** | Matches `ONB_<ULID>`; sortable; operator-identifiable; 31 chars | New prefix to document |

**Recommendation:** **`WEX_<ULID>`** via existing `onboardingId.generateUlid()`. Store in `VARCHAR(32)`. Same for `event_id` → `WEE_<ULID>`.

### 4.2 Event partitioning: immediate vs deferred

| | Immediate (recommended) | Deferred (design) |
|--|-------------------------|-------------------|
| Migration pain | None at create | High at 500k–2M rows |
| FK compatibility | OK (events partitioned, parent not) | OK |
| Ops complexity | Monthly `ADD PARTITION` cron | One-time risky `ALTER` |

**Recommendation:** **Partition at table creation** with 3 historical + 3 future monthly partitions + `p_max`. Defer only if prod MariaDB &lt;10.2 (partition limits) — verify version before PR1.

### 4.3 Summary: materialized vs generated

**Materialized** with incremental updates (see §3.4). Generated views acceptable **only** for dev/sanity checks.

### 4.4 Versioned workflow migrations

**Required additions**

| Field / table | Purpose |
|---------------|---------|
| `workflow_version_id` on execution | Pin to `app_workflow_versions.id` at `execution_created` |
| `definition_hash` CHAR(64) | Hash of step_key list at start — detect mid-flight catalog changes |
| `app_workflow_step_migrations` (Phase B.1) | `from_version_id`, `to_version_id`, `step_key_map` JSON — remap in reconciler |

**Policy:** Active executions stay on pinned version until completed or admin-migrated. New executions use catalog `active_version_id`.

### 4.5 `subject_type` / `subject_id` sufficiency

**Current ENUM** covers 6 workflows but **not** #7–#15 without migration:

| Future workflow | Subject model |
|-----------------|---------------|
| `records.manual.entry` | `church` + optional `record_type` in `context_snapshot` |
| `billing.client.lifecycle` | `church` |
| `crm.lead.nurture` | `crm_lead` + `subject_id=lead_id` |
| `church.decommission` | `church` |
| `email.intake.review` | `email_submission` + `subject_id` |
| `records.data.audit` | `audit_run` + `subject_id` |
| `ocr.import.bulk` | `ocr_job` or `import_batch` |
| `governance.component.promote` | `deployment_request` + `subject_id` |

**Recommendation:** Replace ENUM with **`VARCHAR(32) NOT NULL`** + seed table `workflow_execution_subject_types(subject_type, description, id_pattern)`. Validate in service layer. Keeps future workflows out of DDL migrations.

**`subject_id` normalization:** Always non-null. Convention:

| Scope | `subject_id` value |
|-------|-------------------|
| Church-scoped | `church:{church_id}` |
| Onboarding | `ONB_{ULID}` (domain id) |
| OCR job | `job:{id}` |
| CRM lead | `lead:{id}` |

---

## 5. Critical issues summary

| # | Issue | Blocker? |
|---|-------|----------|
| **1** | Nullable `subject_id` breaks UNIQUE singleton semantics (MariaDB) | **Yes** |
| **2** | Nullable `dedupe_key` allows duplicate events | **Yes** |
| **3** | No optimistic locking on execution row | **Yes** (before write-through) |
| **4** | On-read tenant reconcile on goals API | **Yes** at 1k+ churches |
| **5** | Nightly full church×workflow scan | No (fix before L tier) |
| **6** | `subject_type` ENUM too rigid for #7–#15 | No (fix in PR1) |
| **7** | Certificate/identity goal semantics vs durable workflow | No (document) |
| **8** | Missing outbox for write-through failures | No (fix in PR2) |

---

## 6. Recommended schema changes (amend design §9 before PR1)

```sql
-- church_workflow_executions amendments
ALTER … 
  execution_id            VARCHAR(32)  NOT NULL,  -- WEX_<ULID>
  subject_type            VARCHAR(32)  NOT NULL DEFAULT 'church',
  subject_id              VARCHAR(64)  NOT NULL,  -- never NULL; church:{id}
  workflow_version_id     BIGINT UNSIGNED NULL,
  definition_hash         CHAR(64)     NULL,
  lock_version            INT UNSIGNED NOT NULL DEFAULT 0,
  superseded_by_execution_id VARCHAR(32) NULL,
  source_updated_at       TIMESTAMP    NULL,  -- domain row updated_at for ordering
  UNIQUE KEY uq_church_workflow_subject (church_id, workflow_key, subject_type, subject_id);

-- workflow_execution_events: partition at create; dedupe NOT NULL
event_id                  VARCHAR(32)  NOT NULL,  -- WEE_<ULID>
dedupe_key                CHAR(64)     NOT NULL,

-- New: normalized step summary for funnel SQL
CREATE TABLE workflow_execution_step_summary (
  workflow_key   VARCHAR(96) NOT NULL,
  step_key       VARCHAR(96) NOT NULL,
  status_bucket  ENUM('active','completed','blocked','failed') NOT NULL,
  execution_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workflow_key, step_key, status_bucket)
);

-- New: subject type registry
CREATE TABLE workflow_execution_subject_types (
  subject_type   VARCHAR(32) NOT NULL PRIMARY KEY,
  description    VARCHAR(256) NULL,
  id_pattern     VARCHAR(128) NULL
);

-- Optional: write-through failure recovery
CREATE TABLE workflow_execution_outbox (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  execution_id VARCHAR(32) NULL,
  operation VARCHAR(48) NOT NULL,
  payload JSON NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP NULL,
  last_error VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_outbox_retry (next_retry_at, attempts)
);
```

---

## 7. Recommended index changes

| Table | Index | Purpose |
|-------|-------|---------|
| `church_workflow_executions` | `(church_id, status, workflow_key, current_step_key)` | Goals hot path |
| `church_workflow_executions` | `(workflow_key, status, updated_at)` | Stuck churches |
| `church_workflow_executions` | `(subject_type, subject_id)` | Write-through upsert |
| `church_workflow_executions` | `(status, last_reconciled_at)` | Nightly stale picker |
| `workflow_execution_events` | Partition by `created_at` month | Retention + prune |
| `workflow_execution_events` | `(workflow_key, to_step_key, created_at)` | Funnel |

Drop or demote standalone `idx_cwe_updated` — absorbed into composite above.

---

## 8. Performance recommendations

1. **Goals API:** one SELECT executions + in-memory catalog step map; zero reconcile on read.
2. **Summary refresh:** O(1) delta per transition; nightly `COUNT(*)` validation only.
3. **Reconcile worker:** subject-driven discovery, not `FOR each church`.
4. **OCR tenant access:** only on `ocr.setup.wizard` save + stale reconcile job — never goals read.
5. **Archive job:** weekly; `ocr.batch.review` completed &gt;90d → `archived`; move events to cold partition.
6. **Connection pool:** cap tenant reconcile at 5; queue remainder.
7. **Cursor pagination** on all list endpoints before 1k churches.
8. **Read replica** (Phase F): route `/workflow-analytics/*` only.

---

## 9. Scale projections (revised)

| Resource | 100 churches | 1,000 churches | 10,000 churches |
|----------|--------------|----------------|-----------------|
| `church_workflow_executions` (active) | 400 | 4,000 | 40k–55k |
| `church_workflow_step_executions` | 4,000 | 40,000 | 400k–550k |
| `workflow_execution_events` (24 mo cumulative) | 25k | 250k | **2.5M** (planning) |
| Nightly reconcile duration | &lt;30s | 2–4 min | 20–40 min (subject-scoped) |
| Goals API p95 | &lt;15ms | &lt;20ms | &lt;25ms |
| Summary read p95 | &lt;5ms | &lt;5ms | &lt;5ms |
| Storage (execution layer) | &lt;50 MB | ~500 MB | ~5 GB |

---

## 10. Implementation readiness score

| Category | Weight | Score | Notes |
|----------|--------|-------|-------|
| Architecture correctness | 25% | 82 | Five-layer model sound; goal-workflow edge cases |
| Schema design | 20% | 68 | NULL unique + ENUM rigidity |
| Scalability | 20% | 74 | OCR cardinality; on-read reconcile |
| Migration safety | 15% | 80 | Feature flags good; backfill ordering |
| API design | 10% | 85 | Complete surface |
| Operability | 10% | 78 | Reconcile audit; needs outbox |

**Weighted total: 76 / 100**

**With §4–§7 amendments applied: 88 / 100**

---

## 11. Go / No-Go recommendation

### **Conditional Go**

Proceed with Phase B implementation **after**:

1. Amending design doc §9 SQL per §6 (blocking).
2. Adopting `WEX_<ULID>` / `WEE_<ULID>` identifiers.
3. Documenting certificate + identity as **goal-surface** workflows (may re-enter via new execution).
4. Accepting defaults for open questions H3, PB-Q1, PB-Q2 (design §18 defaults are reasonable).
5. Verifying prod MariaDB version supports partitioning + FK to non-partitioned parent.

**Do not merge write-through PRs** until: schema PR deployed, backfill completed, shadow comparison report reviewed.

---

## 12. PR-sized implementation sequence

Each PR is independently deployable with feature flags. Order is strict.

| PR | Title | Scope | Repo | Flag impact |
|----|-------|-------|------|-------------|
| **B-PR1** | Execution schema v2 (amended) | Migration §6 + subject registry + step summary + outbox tables; partition events at create | OM | None — tables empty |
| **B-PR2** | `workflowExecutionService` core | upsert, applyTransition, lock_version, dedupe, step pre-seed; unit tests | OM | `EXECUTION_MODEL_ENABLED` |
| **B-PR3** | Reconciler registry | Port resolver logic to reconcilers; `discoverSubjects`; no hooks | OM | — |
| **B-PR4** | Backfill + shadow report | CLI backfill; compare execution vs resolver; operator report | OM | — |
| **B-PR5** | Write-through: enrollment | `onboardingService` hooks only | OM | `EXECUTION_WRITE_THROUGH` |
| **B-PR6** | Write-through: OCR jobs + setup | OCR worker, review routes, settings save | OM | `EXECUTION_WRITE_THROUGH` |
| **B-PR7** | Write-through: ops + identity + certs | Church setup, user admin, certificate routes | OM | `EXECUTION_WRITE_THROUGH` |
| **B-PR8** | Goals dual-read | `getGoalsForChurch` execution-first; fallback flag | OM | `EXECUTION_READ_PRIMARY` |
| **B-PR9** | Platform query + timeline APIs | List, detail, stuck, timeline (OM) | OM | — |
| **B-PR10** | Summary + reconcile worker | Incremental delta, nightly job, outbox retry | OM | — |
| **B-PR11** | Analytics APIs + KPI cutover | Summary, funnel, attention; OMAI runtime switch | OM | `EXECUTION_ANALYTICS_ENABLED` |
| **B-PR12** | Cutover + fallback off | `EXECUTION_FALLBACK_INFERENCE=false`; ops sign-off | OM | Production cutover |
| **B-PR13** | OMAI executions proxy + UI tab | Proxy routes; Workflows.tsx Executions tab | OMAI | — |

**Parallelization:** B-PR13 can start after B-PR9. B-PR5–B-PR7 can parallelize per workflow after B-PR4.

**Estimated calendar:** 12–15 engineering days across 13 PRs.

---

## 13. Pre-PR1 checklist

| # | Item | Owner |
|---|------|-------|
| 1 | MariaDB version check (partitioning + FK) | Ops |
| 2 | Amend Phase B design doc §9 with §6 schema | Backend |
| 3 | Accept H3 / PB-Q1 / PB-Q2 defaults or answer | Product |
| 4 | Define Manville + one bulk-OCR parish for E2E | QA |
| 5 | Approve conditional go (this document) | Architecture |

---

## 14. Related documents

| Document | Action |
|----------|--------|
| [workflow-catalog-phase-b-execution-design.md](./workflow-catalog-phase-b-execution-design.md) | Amend §9 before PR1 |
| [workflow-catalog-open-questions.md](./workflow-catalog-open-questions.md) | Close H3, PB-Q1, PB-Q2 with defaults |
| [app-workflow-catalog-pipeline.md](./app-workflow-catalog-pipeline.md) | Log review verdict |

---

*Review complete — Conditional Go at 76/100 (88/100 with amendments).*
