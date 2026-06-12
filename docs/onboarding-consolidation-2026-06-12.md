# Onboarding Systems Consolidation — 2026-06-12

Three parallel onboarding flows are consolidated under a single canonical model.

## Canonical model

| Layer | Source of truth | Purpose |
|-------|-----------------|---------|
| **Commercial** | `churches.client_status` + `billing_status` | Paid vs directory vs suspended |
| **Enrollment** | `onboarding_requests` (ONB_*) | Self-serve / admin enrollment lifecycle |
| **CRM sales** | `omai_crm_leads.pipeline_stage` | Pre-provision funnel only |
| **Tenant DB** | `churches.database_name` via `tenantProvisioning` | Single provisioner for all paths |
| **Workflow execution** | `church.enrollment` + `church.ops.setup` | Runtime progress (workflow catalog) |
| **Legacy display** | `churches.onboarding_phase` (1–5) | Read-only ops staging label; writes gated |

**Bidirectional CRM link (required):**  
`omai_crm_leads.provisioned_church_id` ↔ `churches.crm_lead_id`

## New shared services (OM server)

| Module | Role |
|--------|------|
| `churchProvisionOrchestrator.js` | `provisionFromCrmLead`, `stageDirectoryFromCrmLead`, `linkCrmLeadToChurch` |
| `churchOnboardingState.js` | `loadOnboardingState`, `resolveOnboardingState` |
| `churchPromotionPolicy.js` | `assertPhasePromotionAllowed`, `assertCrmProvisionAllowed` |

## API consolidation

| Before | After |
|--------|-------|
| OMAI-only `/api/admin/church-lifecycle` | **OM server** `/api/admin/church-lifecycle` (OMAI proxies unmatched `/api/*`) |
| CRM `POST /api/crm/churches/:id/provision` (inline) | Delegates to orchestrator |
| Lifecycle `active_parish` + ChurchProvisioner | Delegates to orchestrator + enrollment gate |
| Phase `batch-stage` (inline INSERT) | `stageDirectoryFromCrmLead` — **no tenant DB**, `client_status=directory` |
| Phase promote 1→2 | Still gated; enrollment is required path for tenant DB |

**New endpoint:** `GET /api/admin/church-lifecycle/unified/:id` — merged enrollment + CRM + church state.

## Provision rules (all paths)

Tenant DB creation requires **one of**:

1. Paid/waived `onboarding_requests` linked to CRM lead or church
2. Operational allow-list church (#46, #278) via phase promote
3. `super_admin` + `force: true`

Directory staging (`batch-stage`) creates phase-1 CRM rows only — never tenant DBs.

## UI impact

- **Church Command Center** pipeline shows `canonical_system` hint (crm / phase_pipeline / legacy)
- **Enrollment panel** remains primary action for paid clients
- **CRM provision / active_parish** returns 403 without enrollment unless forced
- Workflows catalog item **s1-o2** marked done

## Deprecated / removed

- `omai/_runtime/.../admin-church-lifecycle.js` — removed; OM route is canonical
- OMAI `ChurchProvisioner` path for lifecycle provision
- Duplicate inline CRM provision in `crm.js`

## Migration notes for operators

1. **New paid parish:** Create enrollment (ONB_*) → payment → create temporary admin (provisions tenant DB)
2. **CRM directory:** Use map batch-stage → directory rows only
3. **Do not** batch-promote phase 1→2 for directory parishes
4. **Super-admin override:** `{ "force": true }` on provision or promote when needed

## Follow-up (completed 2026-06-12)

- CCC drawer uses `GET .../unified/:id?full=1` (single call for lifecycle + enrollment + state)
- OM `ChurchLifecycleDetailPage` redirects to OMAI CCC via `ChurchLifecycleRedirect`
- Legacy `ChurchLifecycleDetailPage/` panel tree removed from `front-end` and `packages/om-admin` (2026-06-12)
- `onboarding_phase` writes frozen when `EXECUTION_READ_PRIMARY=true` — use `churchOnboardingPhase.js` for derived display phase
