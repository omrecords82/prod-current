# Cursor Handoff — Workflow Catalog & Execution Model

**Purpose:** Give this document (or paste its contents) into a new Cursor chat on another machine so work can continue without losing context.  
**Last updated:** 2026-06-13  
**Prior chat:** Workflow catalog Phase A/B implementation, B-PR10–13, product decisions, Executions tab UI.

---

## 0. First message to paste in Cursor (copy this block)

```
Continue the OrthodoxMetrics / OMAI workflow catalog program.

Read these files first (in order):
1. /var/www/orthodoxmetrics/prod/docs/workflow-catalog-cursor-handoff.md  (this handoff)
2. /var/www/orthodoxmetrics/prod/docs/workflow-catalog-open-questions.md  (product decisions)
3. /var/www/orthodoxmetrics/prod/docs/workflow-catalog-decisions-implementation-plan.md  (PR sequence)

Context: Phase B execution model is shipped (B-PR1–13). Product decisions were recorded 2026-06-13.
Next recommended work: **UI-PR1** (Workflow Attention card), then **B-PR12** cutover (`EXECUTION_FALLBACK_INFERENCE=false` after soak).
**B-PR14 shipped** — `server/scripts/workflow-smoke-manville.js` (`npm run workflow:smoke:manville`).

Repos: OM = /var/www/orthodoxmetrics/prod, OMAI = /var/www/omai
Deploy: /var/omai-ops/om-deploy.sh, /var/omai-ops/omai-deploy.sh
Canonical E2E parish: Manville church #46

Do not commit unless I ask. Follow existing code conventions. OM front-end must not use Unstable_Grid2.
```

---

## 1. Repositories & paths

| What | Path | Remote (typical) |
|------|------|------------------|
| **OM (OrthodoxMetrics prod)** | `/var/www/orthodoxmetrics/prod` | `github-omrecords82-prod:omrecords82/prod-current.git` |
| **OMAI** | `/var/www/omai` | `github-omrecords82-omai:omrecords82/omai.git` |
| **OM deploy script** | `/var/omai-ops/om-deploy.sh` | — |
| **OMAI deploy script** | `/var/omai-ops/omai-deploy.sh` | — |
| **Shared DB** | `orthodoxmetrics_db` (MariaDB) | Platform catalog + execution tables |

On a new PC, clone/pull both repos to equivalent paths if possible. OMAI runtime **requires** OM on disk at `OM_PROD_ROOT` (usually `/var/www/orthodoxmetrics/prod`) because `_runtime/server` `require()`s OM services directly.

---

## 2. What was completed (do not re-implement)

### Phase A (shipped earlier)
- Three-tier workflow hierarchy: GLOBAL → APP_FAMILY → WORKFLOW_GROUP
- Migration: `server/database/migrations/20260613_workflow_hierarchy_phase_a.sql`
- `workflowCatalogService.js`, OMAI three-tier catalog UI

### Phase B (shipped — commits on `main`)

| PR | OM commit | What |
|----|-----------|------|
| B-PR1 | `66292890` | Execution schema migration `20260615_workflow_execution_phase_b.sql` |
| B-PR2–4 | `7162bce2` | `workflowExecutionService`, reconcilers, backfill CLI |
| B-PR5–7 | `9da5e2f0` | Write-through hooks (onboarding, OCR, church-users, certs, etc.) |
| B-PR8–9 | `fed6e194` | Goals dual-read, platform execution APIs |
| B-PR10–11 | `6b822a1e` | Reconcile job + crons, analytics KPI cutover |

| PR | OMAI commit | What |
|----|-------------|------|
| B-PR13 partial | `8dcbab2` | Proxy routes for workflow-executions APIs |
| B-PR13 UI | `27e5335` | **Executions tab** in `berry/src/views/control-panel/ops/Workflows.tsx` |

**Backfill ran:** 7+ OCR job executions (church 278); nightly reconcile created 5 more on first manual run.

### Product decisions (2026-06-13)
Recorded in `docs/workflow-catalog-open-questions.md` and summarized in `docs/workflow-catalog-decisions-implementation-plan.md`.

Key decisions:
- **E2E parish:** Manville **#46**
- **Workflow #7:** `records.manual.entry`
- **Priority #8–10:** billing → CRM nurture → decommission
- **Promotion:** hybrid staging copy, human deploy, 5 validation gates, `validation_failed` status
- **Legacy paths:** phased deprecation only after B-PR12 cutover

---

## 3. Current production state

### Git (as of handoff)

**OM `main`:** `6b822a1e` (deployed via `om-deploy.sh be-sync`)

**OMAI `main`:** `27e5335` (deployed via `omai-deploy.sh fe` + `be`)

### Uncommitted local changes on handoff machine

These may **not** be on origin yet — **pull and verify**, or commit/push before switching PCs:

| File | Status |
|------|--------|
| `docs/workflow-catalog-open-questions.md` | Modified (2026-06-13 decisions) |
| `docs/app-workflow-catalog-pipeline.md` | Modified (status line + plan link) |
| `docs/workflow-catalog-decisions-implementation-plan.md` | **New file** — may be untracked; add + commit |
| `docs/workflow-catalog-cursor-handoff.md` | **This file** — add + commit |

### Execution env flags (`server/.env` — not in git)

```
EXECUTION_MODEL_ENABLED=true
EXECUTION_WRITE_THROUGH=true
EXECUTION_READ_PRIMARY=true
EXECUTION_FALLBACK_INFERENCE=true    ← still on (B-PR12 NOT done)
EXECUTION_ANALYTICS_ENABLED=true
```

**B-PR12 cutover** = set `EXECUTION_FALLBACK_INFERENCE=false` after Manville #46 soak + §K checklist.

### Crons (when `EXECUTION_MODEL_ENABLED=true`)
- **02:00 UTC** — nightly reconcile (`workflowExecutionReconcileJob`)
- **Every 15m** — outbox retry
- CLI: `cd server && EXECUTION_MODEL_ENABLED=true node scripts/workflow-execution-reconcile.js`

---

## 4. Key files (bookmark these)

### OM backend

| Area | Path |
|------|------|
| Phase B migration | `server/database/migrations/20260615_workflow_execution_phase_b.sql` |
| Execution service | `server/src/services/workflowExecutionService.js` |
| Write-through sync | `server/src/services/workflowExecutionSync.js` |
| Reconcilers | `server/src/services/workflowExecutionReconcilers.js` |
| Reconcile job + crons | `server/src/services/workflowExecutionReconcileJob.js`, `server/src/index.ts` |
| Goals (dual-read) | `server/src/services/workflowGoalsService.js` |
| Platform APIs | `server/src/routes/platform.js` (execution routes at bottom) |
| Backfill CLI | `server/scripts/backfill-workflow-executions.js` |
| Reconcile CLI | `server/scripts/workflow-execution-reconcile.js` |

### OMAI

| Area | Path |
|------|------|
| Workflows UI (Catalog / Roadmap / **Executions**) | `berry/src/views/control-panel/ops/Workflows.tsx` |
| Route registry | `berry/src/views/control-panel/config/registry.ts` |
| Platform API proxy | `_runtime/server/src/api-ops/platform-workflows.js` |

### Documentation (read before coding)

| Doc | Purpose |
|-----|---------|
| `docs/workflow-catalog-cursor-handoff.md` | This handoff |
| `docs/workflow-catalog-open-questions.md` | Product decisions + §K smoke checklist |
| `docs/workflow-catalog-decisions-implementation-plan.md` | PR sequence B-PR14 → Phase C → Phase E |
| `docs/app-workflow-catalog-pipeline.md` | North star + architecture |
| `docs/workflow-catalog-phase-b-execution-design.md` | Phase B design (some status lines stale) |
| `docs/workflow-catalog-architecture-gap-analysis.md` | Workflows #7–#15 + phases C–H |

---

## 5. Six filed workflows (catalog v1)

1. `church.enrollment`
2. `church.ops.setup`
3. `ocr.setup.wizard`
4. `ocr.batch.review`
5. `identity.user.admin`
6. `records.certificate.generate`

Next to file: **`records.manual.entry`** (#7).

---

## 6. What is NOT done yet (your queue)

### Immediate (Phase B finish)

| ID | Work | Notes |
|----|------|-------|
| ~~**B-PR14**~~ | ~~Manville #46 smoke script + run §K checklist~~ | **Done** — `npm run workflow:smoke:manville` (add `--lock-test` for K4 cycle) |
| **B-PR12** | Cutover: `EXECUTION_FALLBACK_INFERENCE=false` | After soak; compare execution vs resolver goals |
| **B-PR15** | OCR goal gating (feature-flag / upload-attempt only) + cache event hook + cron | G1–G3 |
| **B-PR16** | Auto `setup_complete` when ops checklist passes | H3 |
| **B-PR17** | Suppress enrollment goals for CRM-only parishes | H5 |
| **B-PR18** | DB feature flag overrides (I4) | |
| **B-PR19** | Phased legacy retirement (`getEnrollmentLegacyProgress`) | After B-PR12 only |
| **B-PR20** | Unlock audit event + `church_users` alignment | E6, E4 |

### UI (parallel)

| ID | Work |
|----|------|
| **UI-PR1** | Compact “Workflow Attention” stat card on Executive Overview (B4) |
| **UI-PR2/3** | CRM funnel KPIs on Overview + CCC (H1) |

### Phase C — governance (tracking PR epic)

C-PR1 → C-PR9: `validation_failed` status, mandatory semver_build, validation gates, staging package copy on approve, `app_component_versions` + rollback links, version matrix in OMStudio refs tab, auto `sync-production-states` on deploy.

See full sequence in `docs/workflow-catalog-decisions-implementation-plan.md` §7.

### Phase E — file workflows #7–#10

After B-PR12: `records.manual.entry` → `billing.client.lifecycle` → `crm.lead.nurture` → `church.decommission`.

---

## 7. Still-open product questions (only 4)

| ID | Item |
|----|------|
| A1 | Review-decisions SQL on dev/staging? |
| A3 | Post-deploy runtime-cache refresh trigger? |
| A5 | Who signs Step 1 (`s1-r8`)? |
| D3 | Legacy table drop list + soak end date |

Everything else is decided — see open-questions doc.

---

## 8. Deploy commands (user rules)

**OM backend:**
```bash
cd /var/www/orthodoxmetrics/prod
git checkout --detach origin/main   # or feature branch
/var/omai-ops/om-deploy.sh be-sync
```

**OMAI frontend + backend:**
```bash
cd /var/www/omai
/var/omai-ops/omai-deploy.sh fe
/var/omai-ops/omai-deploy.sh be
```

User rule: **commit, push, and deploy** when making OM/OMAI changes. Use **tracking PRs** for Step 2/3 governance (J1). **Do not commit** unless user asks (confirm on new machine).

**OM front-end rule:** Do **not** use `Unstable_Grid2` in `/var/www/orthodoxmetrics/prod/front-end`.

**Branch naming (when using task branches):** `fix/omd-XXX/2026-06-08/ccc-my-work-actions` style.

---

## 9. Quick verification commands

```bash
# OM health
curl -s http://127.0.0.1:3001/api/system/health | head

# Goals for Manville (dual-read)
cd /var/www/orthodoxmetrics/prod/server
node -e "
require('dotenv').config();
const goals = require('./src/services/workflowGoalsService');
goals.getGoalsForChurch(46, { audience: 'parish' }).then(g => console.log(g.source, g.goals.length));
"

# Execution summary
node -e "
require('dotenv').config();
const db = require('./src/config/db');
db.getAppPool().query('SELECT workflow_key, executions_total, executions_active FROM workflow_execution_summary').then(([r]) => console.table(r));
"

# Manual reconcile
EXECUTION_MODEL_ENABLED=true node scripts/workflow-execution-reconcile.js

# §K smoke (Manville #46) — B-PR14
npm run workflow:smoke:manville
npm run workflow:smoke:manville -- --lock-test
```

**OMAI UI:** Control Panel → Workflows → **Executions** tab  
Route: `/cp/executive/workflow-executions`

---

## 10. Known bugs / fixes already applied

| Issue | Fix |
|-------|-----|
| `ocr_jobs` has no `updated_at` | Use `created_at` in ORDER BY (`workflowGoalsService.js`) |
| MariaDB UNIQUE + NULL `subject_id` | Sentinel IDs: `church:{id}`, `job:{id}` |
| Enrollment rejected step mapping | Fixed null map → `submit_enrollment` in reconciler |

---

## 11. Agent transcript (optional)

Full prior conversation JSONL (if synced to new machine):

`/home/next/.cursor/projects/var-www/agent-transcripts/19eb9bd0-daf2-4699-acfc-ed7e3b9b67ef/19eb9bd0-daf2-4699-acfc-ed7e3b9b67ef.jsonl`

Search keywords: `B-PR`, `workflowExecution`, `Executions tab`, `Manville`, `sync-production-states`.

---

## 12. Suggested first task on new PC

1. `git pull` OM + OMAI on `main`
2. Confirm uncommitted docs from §3 are committed/pushed (or re-apply from this handoff)
3. Verify prod env flags match §3
4. Start **B-PR14**: script that runs §K checklist against church #46 and reports pass/fail
5. Or start **UI-PR1**: Workflow Attention card on Executive Overview (decision B4)

Ask the user which they prefer if unclear.

---

*End of handoff — update this file when major milestones ship (B-PR12, Phase C MVP, workflow #7 filed).*
