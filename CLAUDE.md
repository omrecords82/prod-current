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

**Every change you make MUST be tracked as an OMAI Daily item with branch lifecycle management.** This is mandatory, not optional.

**Full workflow documentation:** [ai-agent-workflow.md](ai-agent-workflow.md) (repo root — authoritative for OM)

### Workspace Rule

**Always work from your assigned worktree.** Never work from deploy directories directly — they are deploy-only.

#### OrthodoxMetrics (OM) workspaces — repo: `prod-current`

| Agent | Workspace |
|-------|-----------|
| Claude CLI | `/var/www/om-workspaces/agent-claude` |
| Cursor | `/var/www/om-workspaces/agent-cursor` |
| Windsurf | `/var/www/om-workspaces/agent-windsurf` |

#### OMAI workspaces — repo: `omai`

| Agent | Workspace |
|-------|-----------|
| Claude CLI | `/var/www/omai-workspaces/agent-claude` |
| Cursor | `/var/www/omai-workspaces/agent-cursor` |
| Windsurf | `/var/www/omai-workspaces/agent-windsurf` |

### Quick Reference — Branch Lifecycle

```bash
# 0. Enter your OM workspace
cd /var/www/om-workspaces/agent-claude

# 1. Create item (BEFORE starting work) — status MUST be "backlog"
curl -X POST http://127.0.0.1:7060/api/omai-daily/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"...","task_type":"chore","status":"backlog","source":"agent","agent_tool":"claude_cli","priority":"medium","category":"om-frontend","description":"..."}'

# 2. Start work — creates branch from main, checks it out locally
curl -X POST http://127.0.0.1:7060/api/omai-daily/items/:id/start-work \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"branch_type":"enhancement","agent_tool":"claude_cli"}'

# 3. Verify branch
git branch --show-current

# 4. Do your work, commit changes to the branch, push regularly
git push -u origin HEAD

# 5. Signal work complete — moves item to Self Review
curl -X POST http://127.0.0.1:7060/api/omai-daily/items/:id/agent-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agent_tool":"claude_cli","summary":"Brief description of what was done"}'

# 6. Create Pull Request
gh pr create --base main --head "$(git branch --show-current)" \
  --title "OMD-<id>: Short description" --body "..." --label "agent-pr"

# 7. Admin reviews and merges — agents never self-merge
```

### Workflow

0. **Enter workspace** → `cd /var/www/om-workspaces/agent-claude` (OM worktree, **not** the OMAI worktree)
1. **Create item** → `POST /api/omai-daily/items` with `status: "backlog"`, `source: "agent"`, `agent_tool: "claude_cli"`
2. **Start work** → `POST /api/omai-daily/items/:id/start-work` with `branch_type` — creates and checks out a branch from `main`
3. **During work** → Commit changes to the branch. Push regularly with `git push -u origin HEAD`. Update `progress` (0-100) if the task is large
4. **Signal complete** → `POST /api/omai-daily/items/:id/agent-complete` — moves item from In Progress → Self Review. **ALWAYS call this when you finish work on a task.** Idempotent and safe to call multiple times.
5. **Create PR** → `gh pr create` against `main` with OMD item ID in the title. Never self-merge.
6. **If abandoned** → Set `status: "cancelled"` with reason in description

### Task Types

`feature` | `enhancement` | `bugfix` | `refactor` | `migration` | `chore` | `spike` | `docs`

### Branch Naming Standard

All branches use the authoritative format: `<type>/<work-item-id>/<yyyy-mm-dd>/<slug>`

| branch_type | Branch prefix | Example |
|-------------|---------------|---------|
| `feature` | `feature` | `feature/omd-412/2026-03-31/work-session-foundation` |
| `enhancement` | `feature` | `feature/omd-413/2026-03-31/improve-ocr-accuracy` |
| `bugfix` | `fix` | `fix/omd-414/2026-03-31/session-cookie-issue` |
| `refactor` | `chore` | `chore/omd-415/2026-03-31/extract-db-helpers` |
| `migration` | `chore` | `chore/omd-416/2026-03-31/move-crm-to-omai` |
| `chore` | `chore` | `chore/omd-417/2026-03-31/update-deps` |
| `spike` | `feature` | `feature/omd-418/2026-03-31/evaluate-ocr-engine` |
| `docs` | `chore` | `chore/omd-419/2026-03-31/api-reference` |

**Three branch types**: `feature`, `fix`, `chore`. All task types map to one of these.

**Work item ID**: `omd-NNN` for OMAI Daily items, username for human work, agent tool name for agent work.

**Create with**: `/var/omai-ops/scripts/orthodoxmetrics/start-task-branch.sh <type> <description> --item <id>`

**Legacy branches** (feat/, enh/, ref/, etc.) are allowed temporarily with a deprecation warning. All new work must use the standard format.

### Categories

**OM (prod-current):** `om-frontend` | `om-backend` | `om-database` | `om-ocr` | `om-records` | `om-admin` | `om-portal` | `om-auth` | `om-devops`
**OMAI:** `omai-frontend` | `omai-backend` | `omai-sdlc` | `omai-ai`
**Shared:** `docs`

### SDLC Status Ownership (Canonical 8-Status Model)

```
draft → backlog → in_progress → self_review → review → staging → done
blocked (from any active status)
cancelled (from any status)
```

| Status | DB Value | Owner | Trigger |
|--------|----------|-------|---------|
| Draft | `draft` | Creator | Structured intake (pre-backlog shaping) |
| Backlog | `backlog` | Admin | Intake promotion / item created |
| In Progress | `in_progress` | **Agent** | POST /start-work |
| Self Review | `self_review` | **Agent** | POST /agent-complete |
| Review | `review` | Admin | PR opened (GitHub webhook) |
| Staging | `staging` | Admin | PR approved (GitHub webhook) |
| Done | `done` | — | PR merged (GitHub webhook) |
| Blocked | `blocked` | Admin | Manual or webhook |
| Cancelled | `cancelled` | — | Manual |

**Key enforcement:**
- Agents pass `actor_type: "agent"` in PATCH /status calls to identify themselves
- Agents own `in_progress` and `self_review` — admins cannot skip these steps
- Admins own `backlog`, `review`, `staging` — agents cannot self-approve
- `blocked` and `cancelled` transitions are always allowed by any actor
- Backend PATCH /status enforces the transition matrix — invalid transitions are rejected

### Key Rules

- **ALWAYS work from your workspace** — Never `cd` into `/var/www/omai/` to make changes. Pre-commit hooks will block you.
- **ALWAYS signal completion** — Call `POST /items/:id/agent-complete` when you finish work. This moves the item to Self Review so the board reflects your progress. Without this call, items stay stuck in In Progress.
- **ALWAYS create a PR** — After agent-complete, open a PR with `gh pr create`. Never self-merge.
- **Agent transitions use actor_type** — When calling PATCH /status directly, include `"actor_type": "agent"` in the body. The `agent-complete` and `start-work` endpoints handle this automatically.
- **Fast-forward only** — `complete-work` uses `git merge --ff-only`. If main has diverged, rebase first.
- **Clean tree required** — All changes must be committed before calling `complete-work`.
- **Explicit actions** — Branches are NOT auto-merged on status change. You must call the endpoints.
- **One branch per item, one PR per branch** — Each OMAI Daily item gets its own isolated branch and PR.

### Priorities: `critical`, `high`, `medium` (default), `low`
### Categories: `om-frontend`, `om-backend`, `om-database`, `om-ocr`, `om-records`, `om-admin`, `om-portal`, `om-auth`, `om-devops`, `omai-frontend`, `omai-backend`, `omai-sdlc`, `omai-ai`, `docs`

### Agent Plans (Assigned Work Plans)

Check for assigned plans at conversation start:
```bash
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/api/prompt-plans/agent/claude_cli
```
If an active plan is returned, read the `next_step.prompt_text` and execute that stage. Work items are auto-linked to the plan's Change Set. See [ai-agent-workflow.md](ai-agent-workflow.md) for full details.

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
