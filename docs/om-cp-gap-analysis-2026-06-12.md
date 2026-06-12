# OM Control Panel — Gap Analysis & Updates (2026-06-12)

**Scope:** `/omai/cp/om` and embedded OM parish admin surfaces  
**Policy decision:** Only **Manville (#46)** and **Test Church (#278)** remain tenant-provisioned in OM Ops.

---

## Updates shipped this session

| # | Item | Status |
|---|------|--------|
| 1 | De-provision ~80 CRM-staged churches (directory only, no `database_name`) | ✅ Migration `20260612_om_cp_operational_churches_only.sql` |
| 2 | Reactivate Test Church (#278) as `is_demo=1`, active tenant | ✅ |
| 3 | `churchVisibility.js` — operational vs directory SQL helpers | ✅ |
| 4 | `GET /api/admin/churches` — operational default; `?include_directory=1` for full CRM list | ✅ |
| 5 | `GET /api/churches` — same operational filter for super_admin ChurchHeader | ✅ |
| 6 | OM `ChurchAdminList` — info banner, parish/type/status/DB columns | ✅ |
| 7 | OMAI `OMControlPanel` — fixed stats (Active Parishes + CRM Directory counts) | ✅ |
| 8 | OMAI fusion config — "Active Parishes" label + policy note | ✅ |

---

## Remaining gaps (recommended follow-up)

| Priority | Gap | Recommendation |
|----------|-----|----------------|
| P1 | Phase 1 batch-stage still creates church rows + can promote to phase 2 | Gate `batch-promote` / `promote` on enrollment completion or explicit super_admin override |
| P1 | Church Command Center pipeline still shows all 79 directory rows | OK for CRM — add UI badge "Directory (not provisioned)" |
| P2 | OM CP is iframe-heavy; no native church pipeline | Link prominently to CCC from OM landing (done via banner copy) |
| P2 | `GET /admin/churches/:id` still requires `is_active=1` | Allow super_admin read of directory rows for CRM preview |
| P2 | Tenant DBs (`om_church_*`) still exist on disk for de-provisioned parishes | Ops script to archive/drop unused schemas (manual, high risk) |
| P3 | Berryops / Studio Hub external links fragile without session bridge | Monitor embed status endpoint |
| P3 | Stale capability registry entries for removed `/cp/om/*` routes | Clean `capabilityRegistry.ts` |
| P3 | Two onboarding systems (phase pipeline vs enrollment requests) | OM CP enrollment embed only; document in OM landing |
| P4 | Demo church management not linked from OM CP | Add fusion item → `/admin/control-panel/demo-churches` |

---

## Where to manage what

| Surface | Route | Purpose |
|---------|-------|---------|
| **OM CP Active Parishes** | `/cp/om/churches` → `/admin/churches` | Manville + Test Church only |
| **Enrollment requests** | `/cp/om/enrollment-onboarding` | ONB_* enrollment workflow |
| **CRM directory / staging** | `/cp/ops/church-command-center` | ~80 OCA leads, phase staging, outreach |

---

*See `server/src/utils/churchVisibility.js` for filter implementation.*
