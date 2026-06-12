# OM + OMAI Legacy Cleanup Report — 2026-06-12

Comprehensive audit and cleanup across Orthodox Metrics (OM) server/front-end, OMAI Berry control panel, and MariaDB on `192.168.1.241`.

---

## Executive summary

| Category | Action | Result |
|----------|--------|--------|
| Tenant DB orphans | Dropped 75 `om_church_*` schemas | Only `om_church_46`, `om_church_278` remain |
| Phase promote gating | New `churchPromotionPolicy.js` | Blocks 1→2 for directory/staged rows without enrollment |
| CCC pipeline UI | Badges + filters in `ChurchesList.tsx` | Operational / directory / not-provisioned visible |
| Dead route files | Deleted 3 unmounted duplicates | Reduced onboarding confusion |
| User counts | Pipeline uses `church_users` join | Accurate parish user metrics |
| DB backup tables | Dropped `user_profiles_backup`, `user_settings_backup` | 2-row snapshots removed |
| OM admin pipeline card | Redirect to `/admin/churches` | Fixes broken church-lifecycle API calls |

**Deferred (still in use):** `prompt_workflows`, `platform_workflows`, `workflow_templates` — active runtime dependencies until workflow catalog B-PR12 full cutover.

---

## 1. Orphan tenant databases (P1)

### Purpose
~80 CRM parishes were batch-promoted to phase 2 in 2026, creating `om_church_*` MariaDB schemas for every staged row. Product policy now limits operational OM embeds to Manville (#46) and Test Church (#278).

### What we did
- Migration `20260612_clear_decommissioned_tenant_refs.sql` — cleared stale `database_name` on decommissioned church #207.
- Script `server/scripts/cleanup-orphan-tenant-dbs.js` — compares `information_schema.SCHEMATA` against `churches.database_name`, supports `--dry-run` and `--execute`.
- **Executed on 192.168.1.241:** dropped **75 orphan schemas**; retained **2 linked** (`om_church_46`, `om_church_278`).

### Why
Orphan schemas consumed disk, appeared in ops tooling, and implied parishes were provisioned when they were only CRM directory rows. Physical cleanup aligns DB state with the operational-churches-only migration (`20260612_om_cp_operational_churches_only.sql`).

---

## 2. Phase promotion gating (P1)

### Purpose
`POST /api/admin/church-onboarding/promote`, `batch-promote`, and `/:churchId/promote` could create tenant DBs for any phase-1 church, reintroducing the mass-provisioning problem.

### What we did
- New `server/src/utils/churchPromotionPolicy.js` with `assertPhasePromotionAllowed()`.
- Gates **only phase 1→2** (tenant DB creation).
- Allows promotion when:
  - Church is on operational allow-list (#46, #278), or
  - `client_status` is `enrolling` or `active_paid`, or
  - Linked `onboarding_requests` row has enrolled status / provisioning progress, or
  - `force: true` from `super_admin`.
- Blocks directory / pre_onboarded rows without enrollment (HTTP 403).

### Why
Prevents accidental re-provisioning of CRM directory parishes via batch promote buttons in Church Command Center.

---

## 3. CCC pipeline UI badges (P1)

### Purpose
`ChurchesList.tsx` (OMAI `/cp/ops/churches`) showed all pipeline rows without distinguishing CRM directory vs tenant-provisioned vs operational parishes.

### What we did
- API pipeline response adds `tenant_provisioned`, `operational`.
- UI adds **Tenant** column with badges: Operational, CRM directory, Provisioned, Not provisioned.
- New filters: **CRM directory**, **Not provisioned (phase 2+)**.
- Info banner with summary counts.
- Updated `clientStatus.ts` directory description to match current policy.

### Why
Operators can see at a glance which rows must not receive OM embeds and which batch-promote actions will fail policy checks.

---

## 4. Pipeline user count fix

### Purpose
Onboarding pipeline counted users via `users.church_id`, which is legacy and often empty.

### What we did
Changed pipeline SQL to aggregate through `church_users` → `users` join.

### Why
User counts in CCC drawer and table reflect actual parish membership links.

---

## 5. Dead / duplicate code removed

| File | Purpose (historical) | Why removed |
|------|---------------------|-------------|
| `server/src/routes/admin/churches_simple.js` | Early stub admin churches route | Never mounted; superseded by `admin/churches.js` |
| `server/src/routes/church-onboarding.js` | Duplicate onboarding router at wrong path | Unmounted; canonical route is `admin/church-onboarding.js` |
| `omai/_runtime/server/routes/admin/churches_simple.js` | OMAI runtime copy of dead stub | Out of sync duplicate |

---

## 6. OM AdminControlPanel redirect

### Purpose
OM front-end `AdminControlPanel` linked to `/admin/control-panel/church-lifecycle`, which calls `/api/admin/church-lifecycle/*` — **only implemented on OMAI**, not OM server.

### What we did
Pipeline summary card and follow-up chips now navigate to `/admin/churches` (operational parish admin list with directory banner).

### Why
Removes broken API calls from OM admin home; parish CRM lifecycle belongs in OMAI Church Command Center.

---

## 7. Database audit — orthodoxmetrics_db (192.168.1.241)

### Cleaned
| Item | Rows | Action |
|------|------|--------|
| `user_profiles_backup` | 2 | Dropped |
| `user_settings_backup` | 2 | Dropped |
| 75× `om_church_*` schemas | — | Dropped |

### Retained (legacy but active)
| Table | Rows | Reason kept |
|-------|------|-------------|
| `prompt_workflows` | 34 | Used by `workflowService.js`, `autoExecutionService.js`, autonomy stack |
| `platform_workflows` | 6 | Platform workflow runner still references |
| `workflow_templates` | 5 | Template instantiation service |
| `app_workflows*` catalog | — | New system; parallel until B-PR12 cutover |

### omai_db
- 85 tables; no orphan backup/old/temp tables beyond legitimate `omai_onboarding_templates`.
- OMAI shares `orthodoxmetrics_db` for church/CRM data per `.env.production`.

---

## 8. Parallel onboarding systems (documented, not merged)

Three overlapping flows remain by design until a future consolidation PR:

1. **Phase pipeline** — `admin/church-onboarding.js` (onboarding_phase 1–5)
2. **Enrollment** — `admin/onboarding.js` + `onboarding_requests` (ONB_* lifecycle)
3. **CRM lifecycle** — OMAI-only `admin-church-lifecycle.js`

**Recommendation:** Keep enrollment as source of truth for paid clients; use phase pipeline for ops staging only with promotion policy enforced.

---

## 9. Scripts & migrations added

```
server/src/utils/churchPromotionPolicy.js
server/scripts/cleanup-orphan-tenant-dbs.js
server/database/migrations/20260612_clear_decommissioned_tenant_refs.sql
server/database/migrations/20260612_drop_profile_settings_backups.sql
```

---

## 10. Verification checklist

- [x] Only 2 `om_church_*` schemas on 241
- [x] Church #207 has `database_name = NULL`
- [x] Batch promote 1→2 skips directory rows (403 / per-row error)
- [x] CCC shows tenant badges
- [x] OM admin pipeline card → `/admin/churches`
- [ ] Deploy OM + OMAI and smoke-test CCC batch promote UI with directory filter

---

## Commits

| Repo | Scope |
|------|-------|
| OM (`orthodoxmetrics/prod`) | Policy, pipeline fix, dead routes, migrations, script, AdminControlPanel |
| OMAI (`omai/berry`) | ChurchesList badges, clientStatus copy |

---

*Generated during autonomous cleanup session — 2026-06-12*
