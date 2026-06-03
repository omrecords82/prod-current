# CLAUDE.md — OrthodoxMetrics AI Assistant Reference

## Project Overview

Multi-tenant Orthodox church management platform. Sacramental records (baptism, marriage, funeral), OCR digitization of historical ledgers, church administration.

**Stack**: Express + TypeScript backend (port 3001) → MariaDB, React + Vite + MUI + Tailwind frontend.

## Quick Commands

```bash
# Deploy
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh          # Full (backend + frontend)
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh be       # Backend only
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh fe       # Frontend only

# Service management
sudo systemctl restart orthodox-backend
sudo systemctl status orthodox-backend
sudo journalctl -u orthodox-backend -f    # Live logs

# Health check
curl http://127.0.0.1:3001/api/system/health

# OMAI service
sudo systemctl restart omai               # Port 7060
```

## Key File Locations

| File | Purpose |
|------|---------|
| `server/src/index.ts` | Backend entry — ALL route mounts (~100 routes) |
| `server/src/config/db.js` | DB pools: `getAppPool()`, `getTenantPool(churchId)` |
| `server/src/config/session.js` | Session config (MySQL store) |
| `server/src/config/index.ts` | Centralized config (loads .env) |
| `server/src/middleware/databaseRouter.js` | Multi-tenant DB routing middleware |
| `server/src/middleware/auth.js` | Auth middleware |
| `server/src/middleware/requestLogger.js` | API call logging to system_logs |
| `server/src/routes/records.js` | Church records controller |
| `server/src/routes/ocr/index.ts` | OCR route mounting |
| `server/src/workers/ocrFeederWorker.js` | OCR job processor (in-process) |
| `server/src/ocr/layouts/*.js` | Table extraction column bands |
| `server/src/ocr/columnMapper.ts` | OCR column → DB field mapping |
| `front-end/src/Router.tsx` | All frontend route definitions |
| `front-end/src/api/utils/axiosInstance.ts` | API client (auto-prefixes `/api`) |
| `scripts/om-deploy.sh` | Deployment script |
| `scripts/build-copy.js` | Copies .js files from src/ to dist/ |

## Patterns

### Adding a Backend Route

1. Create router file in `server/src/routes/` or `server/src/api/`
2. Mount it in `server/src/index.ts`: `app.use('/api/my-route', myRouter);`
3. For immediate effect: apply changes to BOTH `src/` and `dist/`
4. Use `mergeParams: true` if router is mounted under a path with params

### Adding a Frontend Page

1. Create page component in `front-end/src/features/` or `front-end/src/pages/`
2. Add lazy-loaded import in `front-end/src/Router.tsx`
3. Wrap with `<ProtectedRoute requiredRole={[...]}>` for auth
4. API calls use `apiClient` which auto-prefixes `/api`

### Database Access

```js
// Platform DB
const { getAppPool } = require('./config/db');
const [rows] = await getAppPool().query('SELECT ...', [params]);

// Church-specific DB
const { getTenantPool } = require('./config/db');
const pool = getTenantPool(churchId);  // Returns cached pool for om_church_##
const [rows] = await pool.query('SELECT * FROM baptism_records WHERE ...', [params]);

// Cross-DB qualified name (when on platform pool)
await appPool.query('SELECT * FROM `om_church_46`.`baptism_records` WHERE ...');
```

### Logging

```js
// API calls auto-logged by dbRequestLogger middleware to system_logs table
// Manual logging: just use console.log/error (captured by journalctl)
```

## Developer Rules

### NEVER create files outside of these directories:

- **Backend code** → `server/src/` only. Never create files directly in `server/` root, `server/database/`, `server/data/`, `server/scripts/`, or `server/misc/`. The build pipeline compiles `server/src/` → `server/dist/`. Anything outside `src/` is invisible to the running application.
- **Frontend code** → `front-end/src/` only. Never create files directly in `front-end/` root or `front-end/misc/`. Vite builds from `front-end/src/`.
- **SQL migrations** → `server/database/migrations/` (the one exception outside `src/`).
- **Documentation** → `docs/` at project root. Never scatter `.md` files into `server/`, `front-end/`, or subdirectories.
- **Scripts** → `scripts/` at project root for deployment/ops scripts.

### Why this matters

The `server/` and `front-end/` directories have accumulated stale files in non-standard locations over time (`server/data/`, `server/database/*.js`, `server/misc/`, `front-end/misc/`). These are legacy artifacts. Do not add to them. All new work goes into `src/` subdirectories which are the only directories processed by the build pipeline.

## Gotchas

1. **cookieParser MUST receive session secret** — `app.use(cookieParser(secret))`. Without it, every request gets a new session. Caused prod outage 2026-02-02.

2. **mergeParams: true** — Required on Express routers mounted under paths with params (e.g., `/api/churches/:churchId/records`).

3. **src/ AND dist/** — JS changes need both for immediate effect. TS changes need src/ + rebuild.

4. **tools/ not in dist** — `server/src/tools/` is excluded from build copy.

5. **getChurchRecordConnection is BROKEN** — Uses undefined `process.env.DB_PASS`. Use `getTenantPool(churchId)` instead.

6. **OCR vision results on disk** — Stored at `server/storage/feeder/job_{id}/page_0/vision_result.json`, NOT in DB column.

7. **safeRequire** — Route loading uses `safeRequire()` which returns a 503 stub on failure. Check startup logs for "Failed to load" warnings.

8. **Vite chunk warnings** — Large chunk warnings during frontend build are expected.

9. **FusionOverlay positioning** — Child boxes subtract `metrics.left`/`.top`, not `offsetX`/`offsetY`.

10. **Legacy OCR routes disabled** — `/api/ocr/*` disabled by default. Church-scoped routes at `/api/church/:churchId/ocr/*`.

## Database Architecture

- **Platform DB** (`orthodoxmetrics_db`): users, churches, sessions, system_logs, omai_* tables
- **Church DBs** (`om_church_##`): baptism/marriage/funeral_records, audit_logs, calendar, ocr_*
- **Tenant pool cache**: In-memory Map in `db.js`, keyed by churchId
- **DB user**: `orthodoxapps` (shell mysql client can't auth — use `node -e` with mysql2)

## Feature Lifecycle

Every user-facing feature follows a 5-stage lifecycle managed by a central registry at `front-end/src/config/featureRegistry.ts`. Stages 1-4 are only visible to `super_admin` users; stage 5 is visible to all. See [docs/sdlc.md](docs/sdlc.md) for full details.

| Stage | Label | Banner | Visibility |
|-------|-------|--------|------------|
| 1 | Prototype | Red | super_admin only |
| 2 | Development | Red | super_admin only |
| 3 | Review | Orange | super_admin only |
| 4 | Stabilizing | Orange | super_admin only |
| 5 | Production | Green/none | All users |

To register a new feature, add it to `FEATURE_REGISTRY` in `featureRegistry.ts` and wrap its route with `<EnvironmentAwarePage featureId="...">`. To promote, change the `stage` value.

## Roles

`super_admin` > `admin` > `church_admin` > `priest` > `deacon` > `editor`

## AI Agent Work Tracking (REQUIRED)

**Authoritative source: [AGENTS.md](AGENTS.md) at repo root.** That file is the
execution contract for every AI coding agent operating against OM, OMAI, or
OMStudio. When AGENTS.md and this section disagree, **AGENTS.md wins**.

The pointers below are a quick orientation only. Read AGENTS.md for the full
contract — preflight checklist, secret handling, danger zones, stop
conditions, completion-report format, and the actual canonical work-item
prefixes.

### What this means in practice for OM work

- **Work-item prefix:** `OMOD-####` (OM), `OMAD-####` (OMAI), `OMSD-####`
  (OMStudio). See [AGENTS.md §3.1](AGENTS.md#31-naming-and-prefixes).
- **Branch format:** `<type>/<work-item-id>/<yyyy-mm-dd>/<slug>` — three
  types only: `feature`, `fix`, `chore`. See
  [AGENTS.md §4.1](AGENTS.md#41-branch-naming).
- **Workspace:** always work in your assigned worktree, never in the deploy
  directory `/var/www/orthodoxmetrics/prod`. OM worktrees:
  `/var/www/workspaces/om/agent-{claude,cursor,windsurf}`.
- **Sequence:** create the work item (POST `/api/omai-daily/items`) → branch
  is auto-created → check the branch out → commit work → POST
  `/api/omai-daily/items/:id/start-work` to enter `in_progress` → finish work
  → POST `/api/omai-daily/items/:id/agent-complete` to enter `self_review` →
  open PR with `gh pr create`. Never self-merge.
- **Auth:** OMAI work-item endpoints take an operator JWT. Log in as
  `omsvc@orthodoxmetrics.com` with the vaulted `OMSVC_PASSWORD` (rendered to
  `.239` at `/var/lib/omstudio/secrets/OMSVC_PASSWORD.creds`). See
  [AGENTS.md §3.4 / §6](AGENTS.md#34-creating-a-work-item-omai-is-the-source-of-truth).
- **Completion report format:** mandatory, exact structure in
  [AGENTS.md §10](AGENTS.md#10-mandatory-completion-report-format).
- **Implementation drift to be aware of:** the OMAI auto-sync currently
  generates branch names with the legacy `omd-####` prefix regardless of
  repo target. Migration to per-system prefixes (`omod-` / `omad-` / `omsd-`)
  is tracked separately. Until that lands, the work-item title, PR title,
  and completion report carry the canonical `OMOD-####` form even if the
  branch name itself is auto-emitted as `feature/omd-####/...`.

### SDLC status ownership (quick view — AGENTS.md is canonical)

```
draft → backlog → in_progress → self_review → review → staging → done
blocked / cancelled (from any status)
```

| Status | DB Value | Owner | Trigger |
|--------|----------|-------|---------|
| Backlog | `backlog` | Admin | Item created |
| In Progress | `in_progress` | **Agent** | POST /start-work |
| Self Review | `self_review` | **Agent** | POST /agent-complete |
| Review | `review` | Admin | PR opened |
| Staging | `staging` | Admin | PR approved |
| Done | `done` | — | PR merged |

Agents own `in_progress` and `self_review`; admins own `backlog`, `review`,
`staging`. Agents pass `actor_type: "agent"` on PATCH `/status`. The
backend transition matrix rejects invalid jumps.

### Categories (from `om_daily_items.category`)

OM: `om-frontend`, `om-backend`, `om-database`, `om-ocr`, `om-records`,
`om-admin`, `om-portal`, `om-auth`, `om-devops`.
OMAI: `omai-frontend`, `omai-backend`, `omai-sdlc`, `omai-ai`.
Shared: `docs`.

### Agent Plans (assigned work plans)

```bash
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/api/prompt-plans/agent/claude_cli
```

If an active plan is returned, read `next_step.prompt_text` and execute that
stage. Work items are auto-linked to the plan's Change Set.

## Documentation

Detailed docs in `docs/`:
- [architecture.md](docs/architecture.md) — System overview
- [api-reference.md](docs/api-reference.md) — All backend routes
- [ocr-pipeline.md](docs/ocr-pipeline.md) — OCR system
- [deployment.md](docs/deployment.md) — Build & deploy
- [database.md](docs/database.md) — Schema & access patterns
- [frontend.md](docs/frontend.md) — Frontend architecture
- [sdlc.md](docs/sdlc.md) — Feature lifecycle stages
- [ai-agent-workflow.md](ai-agent-workflow.md) — AI agent work tracking workflow (repo root, authoritative for OM)
- [omai.md](docs/omai.md) — OMAI platform, auth bridge SSO, Berry frontend
