# Workflow Catalog — Open Questions & Decisions Needed

**Created:** 2026-06-12  
**Status:** Awaiting product / operator input  
**Related docs:**
- [app-workflow-catalog-pipeline.md](./app-workflow-catalog-pipeline.md) — architecture & work log
- [workflow-catalog-review-implementation.md](./workflow-catalog-review-implementation.md) — shipped review decisions

**How to use this file:** Answer each open question inline (add your decision under the question) or reply in chat with question numbers. Do **not** treat resolved items as still open unless you want to change a shipped decision.

---

## Recently resolved (2026-06-12 catalog review — do not re-open unless reversing)

| # | Question | Decision (shipped) |
|---|----------|-------------------|
| R1 | Which workflow to file as #6? | `church.ops.setup` |
| R2 | `church_ops` separate from `church.enrollment`? | **Yes — separate workflows** |
| R3 | Lock endpoint sets `is_locked`? | **Yes** |
| R4 | OCR runtime summary — scan all church DBs on refresh? | **No — platform DB cache** (`workflow_runtime_cache`) |
| R5 | Parish OCR routes — portal vs devel? | **Portal for parish** (`/portal/ocr/setup`, etc.); devel retained for staff |
| R6 | Payment — single step or split? | **Split:** `payment_pending` + `payment_received` |
| R7 | Feature flags on workflow goals? | **Yes** — `FEATURE_OCR`, `FEATURE_CERTIFICATES` |

---

## A. Post-ship operations (confirm or assign owner)

These do not need architecture decisions but need an operator to confirm completion.

| ID | Question | Options / notes | Your answer |
|----|----------|-----------------|-------------|
| A1 | Has `20260612_workflow_catalog_review_decisions.sql` been run on **all** environments (dev, staging, prod)? | Prod: yes (2026-06-12). Others: ? | |
| A2 | Who runs `POST /api/platform/workflow-catalog/sync-production-states` after each catalog deploy? | Manual / scheduled / CI hook | |
| A3 | Who runs initial `POST /api/platform/governance/runtime-cache/refresh` after deploy? | One-time + periodic? | |
| A4 | What is the **canonical E2E validation parish** for all 6 filed workflows? | Manville (#46) suggested | |
| A5 | Operator sign-off for Step 1 (`s1-r8`): who signs off and what evidence is required beyond automated readiness? | Name + checklist | |

---

## B. Workflow catalog & scope (file #7+)

| ID | Question | Options | Your answer |
|----|----------|---------|-------------|
| B1 | **Which workflow should be filed next as #7?** | Manual sacramental entry · audit workflow · church decommission · other | |
| B2 | Priority order for workflows #7–#10? | Rank: manual entry, audit, decommission, CRM follow-up, … | |
| B3 | Should `sync-production-states` run on a **schedule** or only manually after deploys? | Cron / manual / deploy hook | |
| B4 | Overview Dashboard: replace one of eight executive stat cards with a single **“Workflow attention”** card, or keep the dedicated Workflow Operations section only? | Replace card / keep section / both | |
| B5 | Retire parallel legacy progress paths (`church-onboarding` pipeline labels, `getProgressSteps` fallback)? | When / never / phased | |

---

## C. Step 2 — Promotion loop (Workshop → OMStudio → OM)

**Blocking for automation.** Approve today = DB status + validation gates only; no filesystem deploy.

| ID | Question | Options | Your answer |
|----|----------|---------|-------------|
| C1 | **Physical package deploy (`s2-o1`):** Should approve copy Workshop artifacts to OM/OMAI/OMStudio filesystems? | Yes — copy on approve · No — DB-status-only for now · Hybrid — copy + manual deploy | |
| C2 | **Automated deploy on approve:** Should approve auto-trigger `om-deploy.sh` / `omai-deploy.sh` for `target_app`? | Auto-deploy · Human deploy after approve · Auto for OMAI only · Never auto | |
| C3 | **Validation gates (`s2-o3`):** Which checks are **required** before approve? | Build pass · Drift clear · Hash match · Preview URL · Production readiness 100% · All of the above | |
| C4 | **Per-target version matrix (`s2-o2`):** Where should deployed component versions display? | Catalog detail drawer · OMStudio refs tab · Separate matrix page · Executive overview | |
| C5 | **Rollback targets (`s2-o4`):** Where should previous version be stored on every approve? | `workflow_deployment_history` only · `workshop_deployment_requests` · `omstudio_workflow_refs` · `app_component_versions` | |
| C6 | **`full_version` convention (`s2-r3`):** Is `semver_build` (e.g. `1.0.0_3`) **mandatory** for all Workshop submits? | Mandatory · Recommended · Optional | |
| C7 | Failed validation on approve: should request move to `failed` (current) or stay `submitted` for retry? | failed · submitted · new status `validation_failed` | |

---

## D. Step 3 — OMStudio & governance program

| ID | Question | Options | Your answer |
|----|----------|---------|-------------|
| D1 | **OMStudio native consumer (`s3-o1`):** Timeline for OMStudio app to call `/api/platform/workflow-refs` directly vs OMAI proxy UI only? | Q3 2026 · Later · OMAI proxy is sufficient indefinitely | |
| D2 | **Workshop component registry (`s3-o2`):** Full runbook in scope for this initiative or separate project? | This initiative · Separate project · Defer | |
| D3 | **Legacy workflow DB tables:** Which are safe to drop after soak, and what is the soak **end date**? | List tables + date | |
| D4 | Should OMStudio be the **sole** approve/deploy UI, or keep OMAI Control Panel as co-equal? | OMStudio only · OMAI CP only · Both | |
| D5 | Documentation authority: keep canonical docs only under `orthodoxmetrics/prod/docs`, or sync copy to `omai/docs`? | OM only · Sync to OMAI · External ops docs | |

---

## E. Identity & parish users

| ID | Question | Options | Your answer |
|----|----------|---------|-------------|
| E1 | **Parish user creation:** Can `church_admin` **create** users from `/account/parish-management/users`? | Yes — full CRUD · No — activate pending + view only (create stays platform admin) | |
| E2 | **Role assignment:** Can parish admins assign `church_role` from parish page? | Yes · No — platform admin only via `/admin/users` · Limited roles only | |
| E3 | **`/admin/control-panel/pending-members`:** Still needed for platform ops, or superseded by parish users page? | Keep both · Retire pending-members · Platform-only pending-members | |
| E4 | **Multi-church users:** User in `church_users` for church A but `users.church_id` = B — which wins for identity goals and parish list? | `church_users` always · `users.church_id` fallback · Error / merge job | |
| E5 | Should we **deprecate `users.church_id`** entirely and migrate all membership to `church_users`? | Yes — migration plan · No — dual write · Phased | |
| E6 | Unlock path: should parish staff unlock set `is_active=1` only, or also clear `lockout_reason` (current unlock does both)? | Current behavior OK · Stricter audit · Notify platform on unlock | |

---

## F. Certificates & records

| ID | Question | Options | Your answer |
|----|----------|---------|-------------|
| F1 | **Certificate mid-flow goals:** Draft persistence for resume-style goals, or first-certificate nudge only? | Draft table / `generated_certificates.status=draft` · Nudge only | |
| F2 | **Rector/seal metadata:** Should certificate goals block until `churches.rector_name` / seal images configured? | Block · Warn only · Ignore | |
| F3 | **Template jurisdiction:** Fire goals when parish jurisdiction has no matching `certificate_templates` row? | Yes — setup goal · No — generic template · Hide certificates goal | |
| F4 | File **manual sacramental entry** as workflow #7 before or after certificate draft work? | Before · After · Same PR | |

---

## G. OCR

| ID | Question | Options | Your answer |
|----|----------|---------|-------------|
| G1 | **OCR setup goals:** Show for every active church until complete, or only when church attempts OCR upload (`OcrSetupGate`)? | All active churches · Upload attempt only · Feature-flag parishes | |
| G2 | **OCR cache refresh:** TTL-only (15 min) OK, or require event hook on every `ocr_setup_state` write? | TTL only · Event hook required · Both | |
| G3 | **OCR cache refresh:** Who may trigger manual refresh besides super_admin? | Super_admin only · Admin · Scheduled job | |
| G4 | Portal OCR setup route: `/portal/ocr/setup` vs `/portal/ocr/settings` — which is the canonical entry? | `/portal/ocr/setup` (current) · `/portal/ocr/settings` · Both aliases | |

---

## H. Enrollment, CRM & `church.ops.setup`

| ID | Question | Options | Your answer |
|----|----------|---------|-------------|
| H1 | **CRM funnel KPIs:** Show enrollment funnel metrics from **catalog steps** on Overview and/or CCC? | Overview · CCC · Both · Neither | |
| H2 | **Remove `getEnrollmentLegacyProgress` fallback** entirely and require catalog DB for all enrollment progress APIs? | Yes — breaking change OK · Phased deprecation · Keep fallback | |
| H3 | **`church.ops.setup` completion:** Who may toggle `setup_complete` — parish admin, platform admin, or automatic when checklist passes? | Manual toggle · Auto when resolver steps done · Platform only | |
| H4 | **`church.ops.setup` vs enrollment:** After `active`, should enrollment goal ever reappear (e.g. re-enrollment)? | Never · Special re-enrollment workflow · Same `church.enrollment` row | |
| H5 | Pre-onboarded parishes (~80 CRM-only): should goal strip show enrollment goals without `onboarding_requests`? | Yes · No · CRM-specific goal | |
| H6 | `branding_optional` step in ops setup: required for go-live or truly optional forever? | Optional · Required for phase 4 · Jurisdiction-specific | |

---

## I. Access control & API behavior

| ID | Question | Options | Your answer |
|----|----------|---------|-------------|
| I1 | **`workflow-goals` API:** Should `church_admin` see platform-admin-only goals (e.g. `staff_review` enrollment)? | Parish-filtered only (current) · Show all with `audience=admin` flag · Role-based mix | |
| I2 | **Super admin on parish dashboard:** All workflow goals when impersonating a church, or parish-filtered only? | All goals · Parish-filtered · Configurable | |
| I3 | **Feature flags:** Which workflows beyond OCR/certificates should be gated? | Identity · Enrollment · Ops setup · None | |
| I4 | Should feature flags read from **DB settings** (`features.*` keys) in addition to env vars? | Env only (current) · DB overrides env · DB only | |

---

## J. Process, testing & PR strategy

| ID | Question | Options | Your answer |
|----|----------|---------|-------------|
| J1 | **PR strategy:** Continue direct-to-main deploy for pipeline slices, or tracking PR for Step 2/3? | Direct-to-main · Tracking PR · PR for governance only | |
| J2 | **Validation church:** Manville (#46) as canonical E2E for all **six** workflows — agreed? | Yes · Different church: ___ · Multiple churches | |
| J3 | Required smoke test checklist before marking Step 1 complete? | Provide checklist or adopt default in §K | |
| J4 | Non-prod migration runbook: who owns applying SQL migrations to dev/staging DBs? | Ops · Dev on demand · Automated | |

---

## K. Default smoke test checklist (confirm or edit)

Use for **A4 / J2 / J3** unless you provide a different list.

- [ ] `GET /api/workflow-goals?church_id=<test>` returns expected goals for enrollment, ops setup, identity, OCR (feature flags on)
- [ ] Parish `WorkflowGoalStrip` deep links resolve (no 404)
- [ ] `/portal/ocr/setup` loads for parish staff; `/devel/ocr-setup-wizard` still loads for super_admin
- [ ] Lock user → `is_locked=1`; unlock clears lock; identity goal counts update via `church_users`
- [ ] `GET /api/platform/workflow-runtime-summary` uses OCR cache (`cache_hit` or fresh refresh)
- [ ] `church.ops.setup` appears in catalog + `omstudio_workflow_refs` after sync-production-states
- [ ] Workshop submit → approve runs validation gates → `workflow_deployment_history` row created
- [ ] OMStudio refs tab shows authority manifest + deployment history

**Test parish ID:** ___________

---

## L. Technical work that can proceed without answers (for reference)

These are **not** blocked on product input; listed so they are not mistaken for open questions.

| Item | Notes |
|------|-------|
| `church-onboarding.js` user counts → `church_users` | Align with identity resolver |
| OCR cache event hook on `ocr_setup_state` writes | Unless G2 says TTL-only forever |
| `church.ops.setup` production readiness / drift pass | Automated |
| Record `rollback_of_deployment_id` on approve | Unless C5 specifies different store |

---

## M. Answer submission template

Copy into chat or edit this file:

```
A4: Manville #46
B1: manual entry as #7
C1: DB-status-only for 90 days, then filesystem copy
C2: Human deploy after approve
...
```

---

*Update this file when questions are answered. Move answered rows to §“Recently resolved” with date and decision.*
