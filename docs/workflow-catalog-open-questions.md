# Workflow Catalog — Open Questions & Decisions

**Created:** 2026-06-12  
**Last updated:** 2026-06-13 (product/operator decisions recorded)  
**Status:** **Mostly resolved** — see §“Recently resolved (2026-06-13)” and inline answers below. Remaining open items in §“Still open”.  
**Implementation plan:** [workflow-catalog-decisions-implementation-plan.md](./workflow-catalog-decisions-implementation-plan.md)

**Related docs:**
- [app-workflow-catalog-pipeline.md](./app-workflow-catalog-pipeline.md) — architecture & work log
- [workflow-catalog-review-implementation.md](./workflow-catalog-review-implementation.md) — shipped review decisions
- [workflow-catalog-architecture-gap-analysis.md](./workflow-catalog-architecture-gap-analysis.md) — platform gap analysis & workflows #7–#15
- [workflow-catalog-phase-a-hierarchy-design.md](./workflow-catalog-phase-a-hierarchy-design.md) — Phase A hierarchy (shipped)
- [workflow-catalog-phase-b-execution-design.md](./workflow-catalog-phase-b-execution-design.md) — Phase B execution model (shipped B-PR1–13)

**How to use this file:** Resolved decisions are authoritative for implementation. Do **not** re-open unless reversing a decision.

---

## Recently resolved (2026-06-12 catalog review)

| # | Question | Decision (shipped) |
|---|----------|-------------------|
| R1 | Which workflow to file as #6? | `church.ops.setup` |
| R2 | `church_ops` separate from `church.enrollment`? | **Yes — separate workflows** |
| R3 | Lock endpoint sets `is_locked`? | **Yes** |
| R4 | OCR runtime summary — scan all church DBs on refresh? | **No — platform DB cache** (`workflow_runtime_cache`) |
| R5 | Parish OCR routes — portal vs devel? | **Portal for parish** (`/portal/ocr/setup`, etc.); devel retained for staff |
| R6 | Payment — single step or split? | **Split:** `payment_pending` + `payment_received` |
| R7 | Feature flags on workflow goals? | **Yes** — env + DB overrides (see I4) |

---

## Recently resolved (2026-06-13 product/operator decisions)

| ID | Decision |
|----|----------|
| A4, J2 | **Manville church #46** is the canonical E2E validation parish |
| A2, B3 | **`sync-production-states` runs automatically after catalog deploys**; manual button retained in OMAI |
| B1 | File **`records.manual.entry`** as Workflow **#7** |
| B2 | Priority #7–#10: `records.manual.entry` → `billing.client.lifecycle` → `crm.lead.nurture` → `church.decommission` |
| B4 | **Keep** Workflow Operations section **and** add compact **“Workflow Attention”** executive stat card |
| B5, H2 | **Phased deprecation** of legacy progress paths; no hard-break until execution model cutover complete |
| C1 | **Hybrid promotion:** copy artifacts to controlled staging/package location on approve; do **not** overwrite live app filesystem |
| C2 | **Human deploy after approve** — no auto production deploy |
| C3 | Required gates: **build pass, drift clear, hash match, preview URL, production readiness 100%** |
| C4 | Version matrix: **OMStudio refs tab first**, catalog detail drawer read-only |
| C5 | Rollback targets in **`app_component_versions`**, linked to **`workflow_deployment_history`** |
| C6 | **`full_version` semver_build mandatory** (e.g. `1.0.0_3`) |
| C7 | Failed validation → status **`validation_failed`** |
| D1 | OMStudio native consumer target: **Q3 2026** |
| D2 | Workshop component registry = **separate project**, must stay compatible with governance model |
| D4 | **OMStudio sole approve/deploy UI long-term**; OMAI read-only/proxy during transition |
| D5 | **OMStudio is documentation authority**; repo docs are generated/exported copies |
| E1 | Parish admin **can create users** — church-scoped only |
| E2 | Parish admin assigns **limited church roles only** |
| E3 | **Keep pending-members** as **platform-only** pending-members |
| E4, E5 | **`church_users` always wins**; deprecate `users.church_id` via **phased migration** |
| E6 | Unlock: clear lockout fields, set active, **write audit event** |
| F1 | **First-certificate nudge only**; draft persistence later |
| F2 | Rector/seal: **warn, not block** |
| F3 | Missing jurisdiction template → **setup warning goal** |
| F4 | Manual sacramental entry (**#7**) **before** certificate draft work |
| G1 | OCR setup goals: **feature-flag parishes or upload-attempt churches only** |
| G2 | OCR cache: **both TTL and event hook** |
| G3 | OCR cache refresh: **super_admin + scheduled job** |
| G4 | **`/portal/ocr/setup` canonical**; `/portal/ocr/settings` may redirect/alias later |
| H1 | CRM funnel KPIs on **Overview and CCC** |
| H3 | `church.ops.setup` completes **automatically when checklist passes**; platform admin may override |
| H4 | Enrollment goal **does not reappear after active**; future re-enrollment = separate workflow |
| H5 | **No enrollment goals** for CRM-only parishes without `onboarding_requests`; future CRM-specific goal |
| H6 | Branding **optional for now**; may become jurisdiction-required later |
| I1 | Workflow goals API: **parish-filtered only** |
| I2 | Super_admin impersonation: **parish-filtered default**; platform diagnostic toggle later |
| I3 | Gate: **OCR, certificates, billing, CRM, decommission** — do **not** gate identity/enrollment/core ops setup |
| I4 | Feature flags: **DB overrides over env defaults** |
| J1 | **Tracking PRs** for Step 2/3 governance work |
| J3 | **Adopt default smoke test checklist** (§K) |
| J4 | **Ops owns** dev/staging/prod migrations until automation exists |

---

## Still open (needs operator input)

| ID | Question | Notes |
|----|----------|-------|
| A1 | Has `20260612_workflow_catalog_review_decisions.sql` been run on **all** environments? | Prod: yes (2026-06-12). Dev/staging: confirm |
| A3 | Initial `runtime-cache/refresh` after deploy — one-time only or also periodic? | G3 covers ongoing refresh authority; post-deploy trigger not specified |
| A5 | Operator sign-off for Step 1 (`s1-r8`): **who** signs off and what evidence beyond automated readiness? | Checklist adopted (J3); signatory name/process TBD |
| D3 | Legacy workflow DB tables: which are safe to drop and what is the soak **end date**? | Blocked on B-PR12 cutover + execution soak |

---

## A. Post-ship operations

| ID | Question | Decision |
|----|----------|----------|
| A1 | Migration on all environments? | **Open** — see §Still open |
| A2 | Who runs `sync-production-states` after catalog deploy? | **Automatic after catalog deploy** + manual button in OMAI Catalog tab |
| A3 | Initial runtime-cache refresh after deploy? | **Open** — scheduled job + super_admin per G3 |
| A4 | Canonical E2E validation parish? | **Manville #46** |
| A5 | Step 1 operator sign-off (`s1-r8`)? | **Open** — adopt §K checklist; signatory TBD |

---

## B. Workflow catalog & scope

| ID | Question | Decision |
|----|----------|----------|
| B1 | Workflow #7? | **`records.manual.entry`** |
| B2 | Priority #7–#10 | **#7** `records.manual.entry` · **#8** `billing.client.lifecycle` · **#9** `crm.lead.nurture` · **#10** `church.decommission` |
| B3 | `sync-production-states` schedule? | **Auto after catalog deploy** + manual retain |
| B4 | Workflow Attention card vs section? | **Both** — keep Workflow Operations section + add compact executive stat card |
| B5 | Retire legacy progress paths? | **Phased deprecation** — no hard-break until execution model live (B-PR12) |

---

## C. Step 2 — Promotion loop (Workshop → OMStudio → OM)

| ID | Question | Decision |
|----|----------|----------|
| C1 | Physical package deploy? | **Hybrid** — copy to controlled staging/package location on approve; no direct live filesystem overwrite |
| C2 | Auto-deploy on approve? | **No** — human deploy after approve |
| C3 | Required validation gates | **All:** build pass · drift clear · hash match · preview URL · production readiness 100% |
| C4 | Version matrix UI | **OMStudio refs tab first**; catalog detail drawer read-only |
| C5 | Rollback storage | **`app_component_versions`** + link to **`workflow_deployment_history`** |
| C6 | `full_version` format | **Mandatory** semver_build (`1.0.0_3`) |
| C7 | Failed validation status | **`validation_failed`** (new status) |

---

## D. Step 3 — OMStudio & governance

| ID | Question | Decision |
|----|----------|----------|
| D1 | OMStudio native consumer timeline | **Q3 2026** |
| D2 | Workshop component registry | **Separate project** — compatible with governance model |
| D3 | Legacy workflow DB table drop | **Open** — table list + soak end date TBD |
| D4 | Approve/deploy UI authority | **OMStudio sole long-term**; OMAI read-only/proxy during transition |
| D5 | Documentation authority | **OMStudio**; repo docs are generated/exported copies |

---

## E. Identity & parish users

| ID | Question | Decision |
|----|----------|----------|
| E1 | Parish user creation | **Yes** — church-scoped users only |
| E2 | Role assignment | **Limited church roles only** |
| E3 | Pending members path | **Keep** — platform-only pending-members |
| E4 | Multi-church membership source of truth | **`church_users` always wins** |
| E5 | Deprecate `users.church_id`? | **Yes — phased migration** |
| E6 | Unlock behavior | Clear lockout fields · set active · **audit event** |

---

## F. Certificates & records

| ID | Question | Decision |
|----|----------|----------|
| F1 | Certificate mid-flow goals | **Nudge only** — draft persistence later |
| F2 | Rector/seal metadata | **Warn only** — do not block |
| F3 | Missing jurisdiction template | **Setup warning goal** |
| F4 | Manual entry vs certificate draft | **#7 manual entry first** |

---

## G. OCR

| ID | Question | Decision |
|----|----------|----------|
| G1 | OCR setup goal visibility | **Feature-flag parishes or upload-attempt churches only** |
| G2 | OCR cache refresh strategy | **Both TTL and event hook** |
| G3 | Who may refresh OCR cache | **Super_admin + scheduled job** |
| G4 | Canonical portal OCR route | **`/portal/ocr/setup`** — settings may alias later |

---

## H. Enrollment, CRM & `church.ops.setup`

| ID | Question | Decision |
|----|----------|----------|
| H1 | CRM funnel KPIs | **Overview and CCC** |
| H2 | Remove `getEnrollmentLegacyProgress` | **Phased deprecation** (with B5) |
| H3 | `setup_complete` authority | **Auto when checklist passes**; platform admin override |
| H4 | Re-enrollment after active | **Never** on same workflow — future separate re-enrollment workflow |
| H5 | CRM-only parishes (~80) | **No enrollment goals** without `onboarding_requests`; future CRM goal |
| H6 | `branding_optional` | **Optional for now** — jurisdiction may require later |

---

## I. Access control & API behavior

| ID | Question | Decision |
|----|----------|----------|
| I1 | `workflow-goals` visibility | **Parish-filtered only** |
| I2 | Super_admin impersonation | **Parish-filtered default**; diagnostic toggle later |
| I3 | Feature-flagged workflows | Gate **OCR, certificates, billing, CRM, decommission** — **not** identity/enrollment/core ops setup |
| I4 | Feature flag source | **DB overrides env defaults** |

---

## J. Process, testing & PR strategy

| ID | Question | Decision |
|----|----------|----------|
| J1 | PR strategy | **Tracking PRs** for Step 2/3 governance |
| J2 | Validation church | **Manville #46** |
| J3 | Smoke test checklist | **Adopt §K default** |
| J4 | Non-prod migrations | **Ops owns** until automation exists |

---

## K. Smoke test checklist (adopted — J3)

**Test parish:** **Manville #46**

**Automation (B-PR14):** `cd server && npm run workflow:smoke:manville` — maps K1–K10; use `--lock-test` for K4 lock/unlock cycle; K10 skipped until B-PR12.

- [x] `GET /api/workflow-goals?church_id=46` returns expected goals for enrollment, ops setup, identity, OCR (feature flags on) — **K1** (mature parish: 0 goals OK)
- [x] Parish `WorkflowGoalStrip` deep links resolve (no 404) — **K2** (static route registry)
- [x] `/portal/ocr/setup` loads for parish staff; `/devel/ocr-setup-wizard` still loads for super_admin — **K3**
- [x] Lock user → `is_locked=1`; unlock clears lockout + sets active; identity execution sync via `church_users` — **K4** (`--lock-test`; audit event = B-PR20)
- [x] `GET /api/platform/workflow-runtime-summary` uses OCR cache (TTL or event-refreshed) — **K5**
- [x] `church.ops.setup` appears in catalog + `omstudio_workflow_refs` after sync-production-states — **K6**
- [x] Execution goals for church 46 match resolver fallback during soak (`source=execution` when rows exist) — **K7**
- [x] Workshop validation gates runnable (synthetic request); full approve loop = Phase C — **K8**
- [x] OMStudio authority manifest API (catalog + filed keys + docs) — **K9** (full refs tab UI = Phase C)
- [ ] `EXECUTION_FALLBACK_INFERENCE=false` smoke after B-PR12 cutover — **K10** (automated; skipped while fallback on)

---

## L. Technical work unlocked by decisions

| Item | Decision driver | Notes |
|------|-----------------|-------|
| Auto `sync-production-states` on catalog deploy | A2, B3 | Hook in deploy script or post-migration job |
| Workflow Attention stat card | B4 | OMAI Overview Dashboard |
| `validation_failed` status + gates | C3, C7 | Schema + approve handler |
| Staging package copy on approve | C1 | Controlled path; no live FS overwrite |
| `app_component_versions` rollback link | C5 | Approve writes version row + history link |
| Mandatory semver_build on Workshop submit | C6 | API validation |
| OCR setup goal gating | G1 | Resolver + feature flag / upload attempt |
| OCR cache event hook | G2 | On `ocr_setup_state` writes |
| OCR cache scheduled refresh | G3 | Cron alongside TTL |
| Auto `setup_complete` when ops checklist passes | H3 | Reconciler + execution write-through |
| CRM funnel KPIs | H1 | Overview + CCC |
| DB feature flag overrides | I4 | Settings table reads override env |
| Phased legacy path retirement | B5, H2 | After B-PR12 |
| `church_users` migration from `users.church_id` | E4, E5 | Phased |
| File workflow #7 `records.manual.entry` | B1, F4 | Phase E start |

---

*Last product decision batch: 2026-06-13. See [workflow-catalog-decisions-implementation-plan.md](./workflow-catalog-decisions-implementation-plan.md) for PR sequence.*
