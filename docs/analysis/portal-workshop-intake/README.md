# OM Workshop Intake — `/portal` Church-User Component Collection

**Work Item:** OMD-1560 (OMOD-1560)
**Prompt:** `OM-PORTAL-COMPONENT-COLLECTION-V1`
**Generated:** 2026-05-11
**Source:** `nexty1982/prod-current` @ `origin/main 10ff0c9a`
**Branch:** `chore/omd-1560/2026-05-11/portal-component-collection`

This package is the first analysis-only intake bundle for OM Workshop. It describes everything the church-user `/portal` route depends on so Workshop can later import, render, tag, and govern those components.

---

## What `/portal` actually is

| Aspect | Resolves to |
|---|---|
| Router file | `front-end/src/routes/portalRoutes.tsx` |
| Mount | `front-end/src/routes/Router.tsx` → composed into the global routes array |
| Layout wrapper | `front-end/src/layouts/portal/ChurchPortalLayout.tsx` |
| Index page | `front-end/src/features/portal/ChurchPortalHub.tsx` (888 LOC) |
| Auth gate | `<ProtectedRoute requiredRole={[…]}>` on each child route |
| Redirect-in source | `RootGate.tsx`, `SmartRedirect.tsx`, mobile sidebar, `/portal/profile → /account/profile` |

The portal route block defines **22 child routes** (records list/new/edit per type, certificates, settings, charts, OCR, upload, guide, sacramental restrictions, site-map, profile redirect).

## Headline totals

| Metric | Value |
|---|---|
| Files in transitive closure (excluding assets) | **166** |
| Asset files in closure (svg/png/jpg/woff) | 15 |
| Portal-specific source files | **8** (`features/portal/*` + `layouts/portal/*`) |
| Shared dependencies | **158** |
| Unique API endpoints called from portal subtree | **116** |
| Auth-dependent components | 25 |
| Tenant-aware components (read `churchId` / `ChurchContext`) | 49 |
| API-dependent components | 42 |
| Workshop readiness — READY_DIRECT_IMPORT | **93** |
| Workshop readiness — NEEDS_ADAPTER | **62** |
| Workshop readiness — NEEDS_FIXTURE_DATA | **11** |
| Workshop readiness — NOT_WORKSHOP_READY | 0 |

## Primary component tree (8 portal-specific files)

| File | Lines | Category | Readiness | Notes |
|---|---:|---|---|---|
| `features/portal/ChurchPortalHub.tsx` | 888 | page | NEEDS_ADAPTER | Landing hub — auth + tenant + API |
| `features/portal/PortalSettingsPage.tsx` | 749 | page | NEEDS_ADAPTER | `/portal/settings` |
| `features/portal/PortalCertificatesPage.tsx` | 702 | page | NEEDS_ADAPTER | `/portal/certificates` (new template flow) |
| `features/portal/PortalRecordsPage.tsx` | 639 | page | NEEDS_ADAPTER | `/portal/records` |
| `features/portal/HeroBanner.tsx` | 159 | widget | NEEDS_FIXTURE_DATA | Hub hero (calendar/season aware) |
| `features/portal/RecordPipelineStatus.tsx` | 130 | widget | READY_DIRECT_IMPORT | OCR/feeder summary card |
| `features/portal/PortalSacramentalRestrictionsPage.tsx` | 40 | page | READY_DIRECT_IMPORT | Sibling impl; live route uses `OrthodoxScheduleGuidelinesPage` |
| `layouts/portal/ChurchPortalLayout.tsx` | 51 | layout | NEEDS_ADAPTER | `HpHeader` + `SiteFooter` + `Outlet` |

## Top API dependencies (by call count, see `portal-api-map.json` for full list)

Backed mostly by `metrics.api.ts` (centralized client) plus per-feature shims:
- `/baptism-records`, `/marriage-records`, `/funeral-records` (CRUD + autocomplete + export)
- `/churches/:id` family (`/dashboard`, `/charts/summary`, `/records-landing`, `/clergy-tenure`)
- `/api/church/:churchId/ocr/*` (jobs CRUD, retry, finalize, mapping — church-scoped OCR)
- `/api/ocr/*` (platform OCR — upload, templates, structure clusters)
- `/certificate-templates/*` and `/church/:churchId/certificate/*`
- `/my/churches`, `/my/church-settings`, `/my/ui-preferences`
- `/calendar/*` (day, season, pascha, feasts, saints)
- `/dashboard/*` (metrics, charts, recent-activity)

Backend mount evidence is in `portal-api-map.json:[].mounted_at`, traced from `server/src/index.ts` mounts + `server/src/routes/ocr/index.ts::mountOcrRoutes()`.

## Top risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| `risk.axios-instance` | Shared `apiClient` (axios) auto-prefixes `/api` and injects auth — rendering in Workshop without stubbing will hit real prod | **high** | Ship `WorkshopApiClient` that serves fixtures or hits a sandbox |
| `risk.tenant-context` | 49 components read `churchId` from `ChurchContext` / route param / session | **high** | `MockChurchProvider` with seeded `churchId`, branding, slug |
| `risk.auth-context` | 25 files import `useAuth` / `AuthContext` | medium | `MockAuthProvider` with church_user / priest / church_admin / deacon / editor variants |
| `risk.router-coupling` | Pages use `useNavigate` / `useParams` / `Outlet` | medium | Mount every Workshop preview under `MemoryRouter` with seeded entries |
| `risk.global-customizer` | `ChurchPortalLayout` depends on `CustomizerContext` (theme/layout flags) | low | Default `CustomizerContext` in Workshop StoryShell |

## Recommended first Workshop collection package

Collection ID: **`om.portal.church-user.v1`** (manifest in `portal-component-manifest.json`).

Import in this order (also encoded in the manifest's `recommended_import_order`):

1. **Pure types + utilities** — `RecordsPage/types.ts`, `RecordsPage/utils.ts`, `certificateTypes.ts`, `sacramentalDateRestrictions.ts`, `ui/icons.ts`
2. **Shared form/table primitives** — `SacramentalFormShell.tsx`, `StandardRecordsTable.tsx`, `RecordsControlsBar.tsx`, `RecordEditForm.tsx`
3. **Portal widgets without API** — `HeroBanner.tsx`, `RecordPipelineStatus.tsx`, `PortalSacramentalRestrictionsPage.tsx`
4. **Portal layout shell** — `ChurchPortalLayout.tsx` (needs provider stack but no API)
5. **Records hub pages** — Baptism/Marriage/Funeral RecordsPage + underlying `RecordsPage.tsx` (needs `WorkshopApiClient`)
6. **Record entry forms** — Baptism/Marriage/Funeral RecordEntryPage (save endpoints + tenant fixture)
7. **`ChurchPortalHub.tsx`** — cumulative; renders only after the prior adapters exist
8. **Heavy domain pages** — Settings / Certificates / Charts / OCR / Upload / Sacramental Restrictions

## What should NOT be imported yet

- `features/devel-tools/om-ocr/**` — pulled in transitively (40 files) because `OcrReviewPage` is reused at `/portal/ocr/jobs`, but devel-tools is its own ecosystem with the Workbench context, fusion overlays, and review wizards. Treat as a **separate Workshop collection** (`om.devel-tools.om-ocr.v1`) rather than bundling here.
- `features/admin/SiteMapPage.tsx` and `features/admin/control-panel/OrthodoxScheduleGuidelinesPage.tsx` — admin-owned even when surfaced under `/portal`. Better imported as part of an admin collection so governance metadata stays correct.
- `features/certificates/CertificateGeneratorPage.tsx` — legacy drag-and-drop generator; the new template flow is in `PortalCertificatesPage.tsx`. Import the new flow first; flag the legacy as deprecation candidate.
- Anything under `front-end/src/api/utils/axiosInstance.ts` — must be **replaced**, not imported as-is.

## Deliverables in this directory

| File | Purpose |
|---|---|
| `README.md` | This file |
| `portal-component-inventory.md` | Human-readable per-file inventory |
| `portal-component-manifest.json` | Workshop collection manifest (single source of truth for the importer) |
| `portal-api-map.json` | All 116 API endpoint calls with method/path/callers/mount |
| `portal-import-readiness.csv` | Per-component readiness flags for spreadsheet use |
| `tools/build-portal-closure.js` | Read-only helper that rebuilds the 181-file closure |

## Methodology + uncertainty

1. **Closure walk** starts from the 19 lazy-imported components in `portalRoutes.tsx` (plus `ChurchPortalLayout` + `portalRoutes.tsx` itself) and follows every relative / `@/`-aliased local import. External deps (`react`, `@mui/*`, `dayjs`, etc.) are ignored. See `tools/build-portal-closure.js`.
2. **Categorization** is heuristic — based on path + filename + import signature. A reviewer should re-tag widgets vs forms where the heuristic was too coarse.
3. **API backend mapping** uses `app.use(...)` patterns from `server/src/index.ts` plus `mountOcrRoutes()` in `server/src/routes/ocr/index.ts`. Catchall mounts at `/api` make some attribution conservative — the listed `backend_router_module` is the longest-matching mount, not necessarily the final handler.
4. **Readiness scoring** is conservative: any of auth/api/tenant flips to `NEEDS_ADAPTER`. Some flagged components may downgrade to `READY_DIRECT_IMPORT` once Workshop adapters land.
5. **Roles** for each route mirror `ProtectedRoute requiredRole={[…]}` exactly. The full per-route role matrix is in `portal-component-inventory.md`.

## Recommended next work item

**OMW-IMPORT-V1: stand up `om.portal.church-user.v1` collection in OM Workshop** —
- implement `WorkshopApiClient` + `MockAuthProvider` + `MockChurchProvider` + `MemoryRouterShell`
- import packages 1–3 from `recommended_import_order` (low-risk; renderable end-to-end)
- emit metadata records per the manifest's `components[]`
- defer packages 5–8 until adapters are validated against fixture data
