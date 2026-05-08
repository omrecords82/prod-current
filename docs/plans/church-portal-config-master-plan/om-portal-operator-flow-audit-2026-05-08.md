# Audit Report — OM Church Portal Operator Flow

**Work item:** OMOD-1498
**Parent:** OMSD-1491 (Church Portal Configuration Master Plan, Phase 2 of 8)
**Plan type:** `audit.discovery` v4
**Date:** 2026-05-08
**Agent:** claude-cli @ /var/www/om-workspaces/agent-claude2
**Branch:** `feature/omod-1498/2026-05-08/om-portal-operator-flow-audit`
**Base SHA at audit time:** `9546353553f39b46c1bc3602e2172076ace31d5b`

## How to read this report

- One Markdown table per OMSD-1491 §C category. Surfaces are documented as one row per visible
  config-item the master plan §C registry will eventually own.
- `current_source` is the **verified** location of the value today: `frontend file:line`,
  `backend file:line`, `db.table`, or `db.table.column`. Inferred / can't-be-verified values
  are marked **`unknown`**.
- Every cell that names a path, route, or column was grep-verified against the worktree at the
  base SHA above; nothing is inferred from the master-plan prompt.

## Audit scope (what was inspected)

Read-only walk over the OM portal as it exists for `priest` / `deacon` / `editor` /
`church_admin` / `staff` / `viewer` role categories at orthodoxmetrics.com.

Surfaces walked:

- `front-end/src/routes/Router.tsx` (top-level routes, ProtectedRoute wrappers)
- `front-end/src/routes/portalRoutes.tsx` (`/portal/*` block)
- `front-end/src/layouts/portal/ChurchPortalLayout.tsx` (portal chrome)
- `front-end/src/features/portal/*` (Hub, HeroBanner, RecordPipelineStatus,
  PortalRecordsPage, PortalSettingsPage, PortalCertificatesPage)
- `front-end/src/features/account/*` (AccountLayout + 8 settings pages + accountApi.ts)
- `front-end/src/features/account/parish-management/*`
  (ParishDashboard, DatabaseMapping, ThemeStudio, UITheme, LandingPageBranding,
  RecordSettings, SearchConfiguration, SystemBehavior)
- `front-end/src/features/auth/authentication/auth2/Login2.tsx`
- `server/src/index.ts` (route mounts, ~100 entries — only the ~25 portal-relevant
  mounts read)
- `server/src/api/{churches,baptism,marriage,funeral,user-profile,notifications,certificates}.js`
- `server/src/routes/{auth,parish-settings,parish-stats,record-batches,user-sessions,clergy-tenure,jurisdictions,ocr-preferences,ui-preferences,church-branding}.js`
- `server/src/routes/admin/{churches,church-database}.js` (field-mapper + theme writers)
- `server/database/migrations/20260316_create_record_batches.sql`
- `server/src/routes/ocr/index.ts` (OCR aggregator, mount only)

## Resolver bundles applied at audit time

| Bundle | Version | Status |
|---|---|---|
| `om.claude.global` | 3 | active |
| `cross-system.agent.global` | 3 | active |
| `cross-system.workflow.work-item-lifecycle` | 2 | active |

Plan type bootstrap: `audit.discovery` v4 (active, owned by omstudio).
Resolver warnings observed:
1. `audit.discovery` plan_type owning_system=omstudio, not in resolved scope (om, global, cross_system) — used intentionally per master plan.
2. Substrate scope filter not yet implemented (cosmetic, no impact on this audit).

---

## Category: portal

Welcome / dashboard chrome, hero banner, recent activity, search box, pipeline status panel.
Route base: `/portal` (`portalRoute` in `front-end/src/routes/portalRoutes.tsx:38`).

| Config-item key                         | Surface in UI                                   | current_source (frontend)                                                                                                                | current_source (backend / DB)                                                                                                                                                                | Owning role(s)                                       | Notes / gaps |
|-----------------------------------------|-------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|---|
| `portal.layout.chrome`                  | Header (HpHeader) + Container + SiteFooter      | `front-end/src/layouts/portal/ChurchPortalLayout.tsx:20`                                                                                  | n/a (UI shell)                                                                                                                                                                                | all authenticated users (auth gate at line 27)       | Layout is hardcoded; no per-tenant override surface today. |
| `portal.layout.unauthenticated_redirect`| Sends to `/auth/login` if not authed            | `front-end/src/layouts/portal/ChurchPortalLayout.tsx:27`                                                                                  | n/a                                                                                                                                                                                           | n/a                                                  | Hardcoded redirect target; no per-tenant landing override today. |
| `portal.dashboard.hub_root`             | `/portal` index route                           | `portalRoutes.tsx:42` → `features/portal/ChurchPortalHub.tsx`                                                                              | n/a                                                                                                                                                                                           | all authenticated users                              | — |
| `portal.dashboard.hero_image`           | Hero banner image at top of hub                 | `front-end/src/features/portal/HeroBanner.tsx:8` (`HERO_IMAGES`, hardcoded map)                                                            | served from `/uploads/om_church_<id>/custom_images/<id>-header-latest.png` (filesystem, not DB)                                                                                                | all authenticated users                              | **GAP**: HERO_IMAGES is a hardcoded `Record<number, …>` containing only church 46. Other tenants render no banner. No DB column or admin UI controls this. |
| `portal.dashboard.greeting_text`        | "Welcome back, {name}" line                     | `front-end/src/features/portal/HeroBanner.tsx:99–113` props `greeting`, `roleLabel`                                                        | composed in `ChurchPortalHub.tsx` from `useAuth()` user profile (no dedicated endpoint)                                                                                                       | all authenticated users                              | Greeting derived in-component from session user; no per-tenant copy override. |
| `portal.dashboard.role_label`           | Role chip ("Priest", "Church Admin", …)         | `front-end/src/features/portal/ChurchPortalHub.tsx:71–82` (`ROLE_LABELS`)                                                                  | enum lives in `db.users.role` (referenced in `routes/auth.js:37+`)                                                                                                                            | all authenticated users                              | Labels hardcoded in component; if registry adds custom role display names, this is the override target. |
| `portal.dashboard.state_machine`        | Onboarding / Pipeline / Dashboard tri-state     | `front-end/src/features/portal/ChurchPortalHub.tsx:66`, `:530–537`                                                                          | derived from `record_batches.status` (counts) + record-counts; see `record-batches/summary` row below                                                                                          | all authenticated users                              | Logic lives in component, not DB. Registry would parameterize thresholds. |
| `portal.dashboard.search_box`           | Global search above record cards                 | `front-end/src/features/portal/ChurchPortalHub.tsx:317–421`, `:637–706`                                                                    | calls `metricsAPI.records.{getBaptismRecords,getMarriageRecords,getFuneralRecords}` (`front-end/src/api/metrics.api.ts:55,71,87`) → `GET /api/{baptism,marriage,funeral}-records?search=…`   | all authenticated users                              | Search is debounced (300ms); searches all three record types in parallel. |
| `portal.dashboard.recent_activity`      | "Recent records" rows inside each card           | `front-end/src/features/portal/ChurchPortalHub.tsx:442–469` (`loadRecentRecords`)                                                          | `metricsAPI.records.{getBaptismRecords,getMarriageRecords,getFuneralRecords}({limit:5, sortField:'reception_date'/'mdate'/'burial_date'})` → `db.{baptism,marriage,funeral}_records` (per-church DB) | all authenticated users                              | "Recent" = top 5 by date desc; sort field hardcoded per record type. |
| `portal.dashboard.record_pipeline`      | Uploaded → Processing → (Review) → Ready bar    | `front-end/src/features/portal/RecordPipelineStatus.tsx:24–63`                                                                              | counts come from `apiClient.get('/record-batches/summary')` in `ChurchPortalHub.tsx:426` → `routes/record-batches.js:14–34` → `db.record_batches.status`                                       | non-admin sees 3-stage; admin/super_admin sees 4-stage (in-component branch) | Stage values pulled from `record_batches.status` enum: `'uploaded','processing','admin_review','approved','published'` (`server/database/migrations/20260316_create_record_batches.sql:8`). |
| `portal.dashboard.scope_resolution`     | Which church the dashboard is "about"           | `useChurch()` context (active church id) + `apiClient.get('/my/churches')` in `ChurchPortalHub.tsx:269` and `UploadRecordsPage.tsx:224`     | `server/src/api/churches.js:77–160` (`/my/churches`) → `db.churches WHERE is_active=1` (super_admin sees all provisioned, admin/manager/church_admin/priest see only `users.church_id`)        | tenant scoping handled at backend by role            | Active church for super_admin is selected client-side; the backend always returns the user's allowed set. |

---

## Category: records

Three sacrament-record types — Baptisms, Marriages, Funerals — and their list / detail / add /
edit / search / dropdown surfaces.

| Config-item key                  | Surface in UI                                                                                                                                          | current_source (frontend)                                                                                              | current_source (backend / DB)                                                                                                  | Owning role(s)                                                            | Notes / gaps |
|----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|---|
| `records.baptism.list`           | "Baptisms" card on hub + `/portal/records/baptism`                                                                                                     | `portalRoutes.tsx:50–63`, `features/records-centralized/components/baptism/BaptismRecordsPage.tsx`                       | `GET /api/baptism-records` → `server/src/index.ts:977` → `api/baptism.js:204+` → `db.<church>.baptism_records` (per-church DB) | super_admin, admin, church_admin, priest, deacon, editor                  | Backend resolves church via `users.church_id` → `churches.database_name`. |
| `records.baptism.detail`         | `/portal/records/baptism` row click                                                                                                                    | same page; uses `metricsAPI.records.getBaptismRecord(id)` (`metrics.api.ts:58`)                                          | `GET /api/baptism-records/:id` → `api/baptism.js`                                                                              | same as list                                                              | — |
| `records.baptism.add`            | "Add new" button on Baptisms card → `/portal/records/baptism/new`                                                                                       | `portalRoutes.tsx:64–71` → `features/records-centralized/baptism/BaptismRecordEntryPage.tsx`                              | `POST /api/baptism-records` → `api/baptism.js:375+` → INSERT `db.<church>.baptism_records`                                     | same as list                                                              | — |
| `records.baptism.edit`           | `/portal/records/baptism/edit/:id`                                                                                                                      | `portalRoutes.tsx:72–79` → `BaptismRecordEntryPage.tsx`                                                                   | `PUT /api/baptism-records/:id` → `api/baptism.js`                                                                              | same as list                                                              | — |
| `records.marriage.list`          | "Marriages" card + `/portal/records/marriage`                                                                                                           | `portalRoutes.tsx:80–94`, `features/records-centralized/components/marriage/MarriageRecordsPage.tsx`                      | `GET /api/marriage-records` → `index.ts:978` → `api/marriage.js:203+` → `db.<church>.marriage_records`                          | same as baptism                                                           | Sort field `mdate` (per `metrics.api.ts:74` and Hub call). |
| `records.marriage.add` / `.edit` | `/portal/records/marriage/new`, `/portal/records/marriage/edit/:id`                                                                                     | `portalRoutes.tsx:95–105` → `MarriageRecordEntryPage.tsx`                                                                 | `POST/PUT /api/marriage-records[/:id]` → `api/marriage.js`                                                                     | same as baptism                                                           | — |
| `records.funeral.list`           | "Funerals" card + `/portal/records/funeral`                                                                                                              | `portalRoutes.tsx:106–120`, `features/records-centralized/components/death/FuneralRecordsPage.tsx`                        | `GET /api/funeral-records` → `index.ts:979` → `api/funeral.js:127+` → `db.<church>.funeral_records`                            | same as baptism                                                           | Sort field `burial_date`. |
| `records.funeral.add` / `.edit`  | `/portal/records/funeral/new`, `/portal/records/funeral/edit/:id`                                                                                       | `portalRoutes.tsx:121–131` → `FuneralRecordEntryPage.tsx`                                                                 | `POST/PUT /api/funeral-records[/:id]` → `api/funeral.js`                                                                       | same as baptism                                                           | — |
| `records.batches.summary`        | Pipeline counts (uploaded/processing/admin_review/approved/published)                                                                                   | `ChurchPortalHub.tsx:426`                                                                                                | `GET /api/record-batches/summary` → `routes/record-batches.js:14–34` → `db.record_batches GROUP BY status`                     | requireAuth; super_admin sees all churches, others scoped to their church | — |
| `records.dropdown_options`       | Select fields in entry pages (e.g. clergy list)                                                                                                          | `metrics.api.ts:103` `getDropdownOptions(recordType, field)`                                                               | `GET /api/{baptism,marriage,funeral}-records/dropdown-options/:field` → records routes                                          | same as list                                                              | Source table not verified — value pulled from records or a lookup table. **`unknown`** which side. |
| `records.export`                 | "Export" actions (not visible by default in portal nav)                                                                                                  | `metrics.api.ts:106` `exportRecords(recordType, filters, options)`                                                         | `POST /api/{type}-records/export` → records routes                                                                              | same as list                                                              | Export visibility in portal UI not located — **`unknown`** whether portal exposes it. |
| `records.import`                 | "Import" / upload-records flow                                                                                                                            | `metrics.api.ts:109` `uploadFile('/{type}-records/import', file)`                                                          | `POST /api/{type}-records/import` → records routes                                                                              | same as list                                                              | Distinct from OCR upload (different endpoint). Not visible in default portal nav. |

---

## Category: branding

Logos, favicon, primary/secondary colors, hero image, header text. Portal-side branding lives
across `churches.*_path` columns + `parish_settings.theme.*` rows + a hardcoded HeroBanner map.

| Config-item key                  | Surface in UI                                                                                                                              | current_source (frontend)                                                                                                                                              | current_source (backend / DB)                                                                                                                                                  | Owning role(s)                                              | Notes / gaps |
|----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------|---|
| `branding.logo_path`             | Account → Branding (logo upload)                                                                                                            | `front-end/src/features/account/AccountBrandingPage.tsx` + `accountApi.ts:256–272` (POST/DELETE `/api/my/church-branding/:field`)                                       | `POST/DELETE /api/my/church-branding/:field` → `api/churches.js:1214–1264` → updates `db.churches.logo_path`                                                                    | super_admin, admin, church_admin (via auth gate)             | File saved to `/uploads/om_church_<id>/branding/...`. |
| `branding.logo_dark_path`        | Account → Branding (dark-mode logo upload)                                                                                                  | same page as `branding.logo_path`                                                                                                                                       | same handler — field name `logo-dark` → `db.churches.logo_dark_path`                                                                                                            | same                                                         | — |
| `branding.favicon_path`          | Account → Branding (favicon upload)                                                                                                          | same page                                                                                                                                                                | same handler — field name `favicon` → `db.churches.favicon_path`                                                                                                                 | same                                                         | — |
| `branding.primary_color`         | Theme studio + church profile color picker                                                                                                   | `front-end/src/features/account/parish-management/ThemeStudioPage.tsx:77` (`useParishSettingsWithLocal('theme')`)                                                       | `GET/POST /api/parish-settings/:churchId/theme` → `routes/parish-settings.js:42–138` → `db.parish_settings (church_id, category='theme', setting_key, value)` JSON storage      | super_admin, admin, church_admin, priest                     | Also legacy `db.churches.primary_color` column read by `/api/my/church-settings` — **dual source of truth gap** between `churches.primary_color` and `parish_settings.theme.primary_color`. |
| `branding.secondary_color`       | Theme studio                                                                                                                                  | same as primary_color                                                                                                                                                    | same dual storage as primary_color (`db.churches.secondary_color` + `parish_settings`)                                                                                          | same                                                         | Same dual-source gap. |
| `branding.hero_image`            | Portal dashboard hero banner                                                                                                                  | `front-end/src/features/portal/HeroBanner.tsx:9–13` (HARDCODED `HERO_IMAGES` map, only church 46 today)                                                                  | filesystem only (`/uploads/om_church_<id>/custom_images/...`); **no DB column**                                                                                                  | n/a (super_admin would need to deploy code)                  | **GAP**: there is no per-tenant config row controlling the hero image. Phase 5 registry must add this. |
| `branding.theme_full`            | Theme studio "Apply theme" preset                                                                                                              | `parish-management/ThemeStudioPage.tsx`                                                                                                                                  | also `routes/admin/churches.js:249–290` writes/reads `orthodoxmetrics_db.church_themes` (separate table)                                                                         | super_admin, admin, church_admin, priest, manager            | **GAP**: third storage location: `church_themes` table at admin scope vs `parish_settings` at parish scope. Registry needs to pick canonical source. |
| `branding.landing_page_image`    | Account → Parish Management → Landing Page Branding                                                                                            | `front-end/src/features/account/parish-management/LandingPageBrandingPage.tsx:49` (`apiClient.post('/my/church-branding/${field}')`)                                     | `POST /api/my/church-branding/:field` (same handler as logo)                                                                                                                    | same as logo                                                 | Field name distinguishes target column. |

---

## Category: church_profile

Church identity (name, address, phone, language/timezone/currency, jurisdiction). Editable from
two places today (Account → Church Details and Portal → Settings, which is itself adapted from
the admin ChurchForm).

| Config-item key                   | Surface in UI                                                       | current_source (frontend)                                                                                                            | current_source (backend / DB)                                                                                                          | Owning role(s)                                  | Notes / gaps |
|-----------------------------------|---------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------|---|
| `church_profile.name`             | Account → Church Details: "Church name"                              | `AccountChurchDetailsPage.tsx` (uses `churchApi.getChurch()` from `accountApi.ts:228–253`)                                            | `GET/PUT /api/my/church-settings` → `api/churches.js:209–303` → `db.churches.name` (also `church_name` legacy column)                  | super_admin, admin, church_admin (via /my/* auth) | Two columns hold the name (`name`, `church_name`); endpoint returns both. |
| `church_profile.contact_email`    | Account → Church Details: Email                                      | same page                                                                                                                              | same endpoint → `db.churches.email`                                                                                                    | same                                              | — |
| `church_profile.phone`            | Account → Church Details: Phone                                      | same page                                                                                                                              | same endpoint → `db.churches.phone`                                                                                                    | same                                              | — |
| `church_profile.website`          | Account → Church Details: Website                                    | same page                                                                                                                              | same endpoint → `db.churches.website`                                                                                                  | same                                              | — |
| `church_profile.address.line1`    | Account → Church Details: Address                                    | same page                                                                                                                              | `db.churches.address`                                                                                                                  | same                                              | — |
| `church_profile.address.city`     | Account → Church Details: City                                       | same page                                                                                                                              | `db.churches.city`                                                                                                                     | same                                              | — |
| `church_profile.address.state`    | Account → Church Details: State                                      | same page                                                                                                                              | `db.churches.state_province`                                                                                                           | same                                              | — |
| `church_profile.address.postal`   | Account → Church Details: Postal code                                | same page                                                                                                                              | `db.churches.postal_code`                                                                                                              | same                                              | — |
| `church_profile.address.country`  | Account → Church Details: Country                                    | same page                                                                                                                              | `db.churches.country`                                                                                                                  | same                                              | — |
| `church_profile.preferred_language` | Account → Church Details: Language                                  | same page                                                                                                                              | `db.churches.preferred_language`                                                                                                       | same                                              | — |
| `church_profile.timezone`         | Account → Church Details: Timezone                                  | same page                                                                                                                              | `db.churches.timezone`                                                                                                                 | same                                              | — |
| `church_profile.currency`         | Account → Church Details: Currency                                  | same page                                                                                                                              | `db.churches.currency`                                                                                                                 | same                                              | — |
| `church_profile.calendar_type`    | Account → Church Details: Calendar (Gregorian / Revised Julian / Julian) | same page                                                                                                                          | `db.churches.calendar_type` (with `j.calendar_type` from `jurisdictions` as fallback / suggestion)                                       | same                                              | Calendar may be inherited from jurisdiction; UI allows override. |
| `church_profile.tax_id`           | Account → Church Details: Tax ID                                    | same page                                                                                                                              | `db.churches.tax_id`                                                                                                                   | same                                              | — |
| `church_profile.jurisdiction`     | Account → Church Details: Jurisdiction dropdown                      | `AccountChurchDetailsPage.tsx:127` (`apiClient.get('/jurisdictions')`)                                                                  | `GET /api/jurisdictions` → `routes/jurisdictions.js:22–46` → `db.jurisdictions`; persisted on church via `db.churches.jurisdiction_id` | same                                              | UI populates the dropdown from `jurisdictions`; `crm_match` block in `/my/church-settings` returns suggested jurisdiction from `us_churches` table. |
| `church_profile.description_multilang` | Account → Church Details: Description (multilang JSON blob)       | same page                                                                                                                              | `db.churches.description_multilang` (JSON)                                                                                            | same                                              | — |
| `church_profile.short_name`       | Used for hero image folder names + URL slugs                         | derived in component                                                                                                                    | `db.churches.short_name`                                                                                                               | same                                              | — |
| `church_profile.is_active`        | "Church active" flag                                                | not exposed in portal UI; only super_admin sees                                                                                          | `db.churches.is_active`                                                                                                                | super_admin (admin scope)                          | — |
| `church_profile.setup_complete`   | Onboarding-complete flag                                            | `AccountChurchDetailsPage.tsx` (read-only)                                                                                              | `db.churches.setup_complete`                                                                                                           | super_admin                                       | — |
| `church_profile.has_*_records`    | "This parish records X" toggles                                      | Account → Church Details                                                                                                                 | `db.churches.has_baptism_records`, `has_marriage_records`, `has_funeral_records`                                                       | super_admin, admin, church_admin                  | Used to drive which record-type cards appear on the dashboard — verified gap: these flags are **not consulted** in `ChurchPortalHub.tsx`'s card rendering today (cards always show all three). |

---

## Category: navigation

Top nav, portal sidebar entries, "go to my dashboard" routing for different roles, footer links.

| Config-item key                       | Surface in UI                                                                                       | current_source (frontend)                                                                                                                          | current_source (backend / DB)                                            | Owning role(s) | Notes / gaps |
|---------------------------------------|------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|---------------|---|
| `navigation.role_default_landing`     | Where you land after login (`AccountLayoutSwitcher`-style behavior in Router.tsx)                    | `Router.tsx:201–215` (`AccountLayoutSwitcher` returns `<ChurchPortalLayout/>` for non-super_admin/admin)                                              | n/a (route logic, no DB row)                                              | all users      | Hardcoded in router; registry would replace with per-tenant default-landing-page row. (NB: an old `default_landing_page` column was explicitly removed from churches schema — see comment in `PortalSettingsPage.tsx:43`.) |
| `navigation.portal.sidebar_items`     | Portal-layout left/top nav items                                                                     | `front-end/src/layouts/portal/ChurchPortalLayout.tsx` uses **`HpHeader`** (no sidebar). `Sidebar` items live separately for admin layouts only.    | n/a                                                                     | all            | Portal uses topbar-only nav; sidebar customization is admin-side only. |
| `navigation.menu_permissions`         | Per-role menu visibility                                                                              | `Router.tsx` ProtectedRoute wrappers (per-route allowlist)                                                                                          | also `routes/menu-permissions.js` (`/api/menu-permissions`) — admin-side configuration table | super_admin handles config | **GAP**: portal does not consult `menu-permissions` today; Router uses its own static `requiredRole` arrays. Registry would unify. |
| `navigation.footer_text`              | "Powered by OrthodoxMetrics" footer                                                                   | `front-end/src/components/frontend-pages/shared/footer/SiteFooter` (rendered by `ChurchPortalLayout.tsx:43`)                                           | n/a                                                                     | all            | Hardcoded; no per-tenant footer override. |
| `navigation.brand_header`             | Header logo + parish name                                                                             | `HpHeader` component (rendered by layout)                                                                                                            | reads `db.churches.name` via `useChurch()` context (which calls `/my/churches`) | all           | Brand header text comes from active church record; no separate "display name" override. |

---

## Category: permissions

Role-gating across portal routes. Source is `<ProtectedRoute requiredRole={[...]}>` arrays in
the router files.

| Config-item key                  | Surface (portal route)                                                | current_source (frontend)                                              | current_source (backend / DB)                                                                                                              | Allowed roles                                                                  | Notes / gaps |
|----------------------------------|-----------------------------------------------------------------------|------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------|---|
| `permissions.records.view`       | `/portal/records[/baptism|/marriage|/funeral]`                        | `portalRoutes.tsx:46,55,82,108`                                          | role check at backend in `api/baptism.js`, `api/marriage.js`, `api/funeral.js` (verified `requireAuth`; explicit role gate **`unknown`** at endpoint level — record returned is scoped to user's `church_id` regardless of role) | super_admin, admin, church_admin, priest, deacon, editor                       | — |
| `permissions.records.add`        | `/portal/records/{type}/new`                                          | `portalRoutes.tsx:67,89,114`                                            | `POST /api/{type}-records` → records routes                                                                                                  | super_admin, admin, church_admin, priest, deacon, editor                       | — |
| `permissions.records.edit`       | `/portal/records/{type}/edit/:id`                                     | `portalRoutes.tsx:74,96,121`                                            | `PUT /api/{type}-records/:id`                                                                                                                | super_admin, admin, church_admin, priest, deacon, editor                       | — |
| `permissions.upload`             | `/portal/upload` (UploadRecordsPage)                                   | `portalRoutes.tsx:130–137`                                              | `POST /api/ocr/jobs/upload` (line 321 of UploadRecordsPage)                                                                                  | super_admin, admin, church_admin, priest                                       | NB: NO deacon/editor — narrower than records edit. |
| `permissions.charts`             | `/portal/charts`                                                       | `portalRoutes.tsx:139–146`                                              | `GET /api/churches/:churchId/charts` → `api/om-charts.js`                                                                                    | super_admin, admin, church_admin, priest                                       | NB: NO deacon/editor. |
| `permissions.certificates`       | `/portal/certificates`, `/portal/certificates/generate`                | `portalRoutes.tsx:148–164`                                              | `GET /api/certificate-templates*` → `routes/certificate-templates.js`; `GET /api/church/records/:type` (called from `PortalCertificatesPage.tsx:179`) | super_admin, admin, church_admin, priest, deacon, editor                       | — |
| `permissions.settings`           | `/portal/settings` (PortalSettingsPage)                                | `portalRoutes.tsx:166–173`                                              | `GET/PUT /api/my/church-settings`; field-mapper `GET /api/admin/churches/:id/field-mapper`                                                  | super_admin, admin, church_admin, priest                                       | NB: PortalSettings hits admin-scoped endpoints (`/api/admin/churches/:id/field-mapper`) — verified at `PortalSettingsPage.tsx:252,301`. Backend allowlist there is `'admin','super_admin','manager','church_admin','priest'` (`routes/admin/churches.js:72`). |
| `permissions.profile_redirect`   | `/portal/profile`                                                      | `portalRoutes.tsx:175–178`                                              | none — pure redirect to `/account/profile`                                                                                                   | any authenticated                                                              | — |
| `permissions.guide`              | `/portal/guide`                                                         | `portalRoutes.tsx:180–187`                                              | static                                                                                                                                       | any authenticated                                                              | — |
| `permissions.ocr`                | `/portal/ocr`, `/portal/ocr/jobs`                                      | `portalRoutes.tsx:189–204`                                              | `/api/church/:churchId/ocr/*` (`routes/ocr/jobs.ts` etc., mounted by `mountOcrRoutes`)                                                       | super_admin, admin, church_admin, priest                                       | NB: NO deacon/editor. |
| `permissions.sacramental_restrictions` | `/portal/sacramental-restrictions`                                | `portalRoutes.tsx:206–213`                                              | `GET /api/admin/orthodox-schedule-guidelines`                                                                                                  | super_admin, admin, church_admin, priest, deacon, editor                       | — |
| `permissions.site_map`           | `/portal/site-map`                                                      | `portalRoutes.tsx:215–222`                                              | static                                                                                                                                       | any authenticated                                                              | — |
| `permissions.account.profile`    | `/account/profile`                                                      | `Router.tsx:846`                                                       | `GET /api/user/profile` → `api/user-profile.js`                                                                                              | any authenticated                                                              | — |
| `permissions.account.password`   | `/account/password`                                                     | `Router.tsx:848`                                                       | `PUT /api/user/profile/password`                                                                                                             | any authenticated (own user)                                                    | — |
| `permissions.account.sessions`   | `/account/sessions`                                                     | `Router.tsx:849`                                                       | `GET/DELETE /api/user/sessions[/...]` → `routes/user-sessions.js`                                                                              | any authenticated (own sessions)                                                | — |
| `permissions.account.notifications` | `/account/notifications`                                              | `Router.tsx:850`                                                       | `GET/PUT /api/notifications/preferences` → `api/notifications.js:703–719`                                                                     | any authenticated                                                              | — |
| `permissions.parish_management`  | `/account/parish-management/*`                                           | `Router.tsx:858–878`                                                    | mix: `/api/parish-settings/:id/*`, `/api/admin/churches/:id/field-mapper`, `/api/my/church-branding`                                          | wrapped in `<ProtectedRoute>` with no `requiredRole` — any authenticated user, but underlying admin endpoints enforce role | **GAP**: route-level role gate is missing on parish-management; only the underlying admin endpoints enforce. A non-admin can navigate to the page and just get 403 from the API. |

---

## Category: uploads

Records ingest (manual import + OCR upload + image upload for branding).

| Config-item key                     | Surface in UI                                                | current_source (frontend)                                                                                                  | current_source (backend / DB)                                                                                                                                                  | Owning role(s)                                              | Notes / gaps |
|-------------------------------------|--------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------|---|
| `uploads.records_csv`               | Records "Import" action                                       | `metrics.api.ts:109` `apiClient.uploadFile('/{type}-records/import', file, …)`                                              | `POST /api/{baptism,marriage,funeral}-records/import` → records routes                                                                                                            | same as records-edit                                          | Not currently exposed in the portal navigation; reachable via per-record-type detail toolbars (**`unknown`** if every record type page surfaces it). |
| `uploads.ocr_image`                 | `/portal/upload` (UploadRecordsPage)                          | `front-end/src/features/records-centralized/apps/upload-records/UploadRecordsPage.tsx:321`                                  | `POST /api/ocr/jobs/upload` → `routes/ocr/jobs.ts` (or its sub-route via `mountOcrRoutes` at `routes/ocr/index.ts:30`) → writes `ocr_jobs` row + filesystem under `server/storage/feeder/job_<id>/...` | super_admin, admin, church_admin, priest                     | Worker is a SEPARATE service (`om-ocr-worker`); intake here is the queue handoff. |
| `uploads.ocr_retry`                 | "Retry job" in OCR jobs page                                  | `UploadRecordsPage.tsx:326`                                                                                                  | `POST /api/church/:churchId/ocr/jobs/:id/retry` → OCR routes                                                                                                                      | same                                                          | — |
| `uploads.ocr_review_status`         | OCR job review-status patch                                   | `UploadRecordsPage.tsx:343`                                                                                                  | `PATCH /api/church/:churchId/ocr/jobs/:id/review-status`                                                                                                                          | same                                                          | — |
| `uploads.branding_image`            | Branding image uploads                                        | `LandingPageBrandingPage.tsx:49`, `accountApi.ts:256–263`                                                                    | `POST /api/my/church-branding/:field` → `api/churches.js:1214–1262` → updates `db.churches.{logo_path,logo_dark_path,favicon_path,…}` + saves file under `/uploads/...`            | super_admin, admin, church_admin                              | — |

---

## Category: analytics

Dashboards, charts, parish-level stats.

| Config-item key                | Surface in UI                                                | current_source (frontend)                                                                                                | current_source (backend / DB)                                                                                                          | Owning role(s)                                                | Notes / gaps |
|--------------------------------|--------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|---|
| `analytics.parish_summary`     | Account → Parish Management → Dashboard                      | `front-end/src/features/account/parish-management/ParishDashboard.tsx:71` (`apiClient.get('/parish-stats/${churchId}')`)  | `GET /api/parish-stats/:churchId` → `routes/parish-stats.js:11–34` → `COUNT(*)` from `db.<church>.{baptism,marriage,funeral}_records` | any authenticated                                              | No role gate on the route file (**`unknown`** if there's an upstream gate). |
| `analytics.feast_day_breakdown` | `/dashboards/analytics`                                      | `front-end/src/features/admin/AnalyticsDashboard.tsx:61` (`axios.get('/api/analytics/by-feast-day')`)                     | `GET /api/analytics/by-feast-day` → `routes/analytics.js`                                                                                | requires `view_dashboard` permission                           | NB: this is the *admin* analytics dashboard (`/dashboards/analytics`) — not in `/portal/*`. Non-admin/non-super_admin landing on `/portal` will not see this. |
| `analytics.charts`             | `/portal/charts`                                              | `front-end/src/features/church/apps/om-charts/OMChartsPage.tsx`                                                            | `GET /api/churches/:churchId/charts` → `api/om-charts.js`                                                                                | super_admin, admin, church_admin, priest                       | — |
| `analytics.clergy_tenure`      | Hub component (clergy info / "first served" badges)            | `ChurchPortalHub.tsx:292` (`apiClient.get('/churches/:id/clergy-tenure')`)                                                | `GET /api/churches/:churchId/clergy-tenure` → `routes/clergy-tenure.js:28+` → MIN(YEAR(date)) FROM each record table where `clergy LIKE ?` | any authenticated (read in hub)                               | Returns first-served year per clergy across all three record tables. |

---

## Category: layout

Per-tenant theme + UI layout overrides + landing-page customization. Storage is split across
`parish_settings` (parish-scoped), `church_themes` (admin-scoped), `user_table_settings`
(per-user UI prefs).

| Config-item key                      | Surface in UI                                                            | current_source (frontend)                                                                            | current_source (backend / DB)                                                                                                | Owning role(s)                                              | Notes / gaps |
|--------------------------------------|--------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------|---|
| `layout.theme.studio`                | Account → Parish Management → Theme Studio                               | `ThemeStudioPage.tsx:77` `useParishSettingsWithLocal('theme')`                                        | `GET/POST /api/parish-settings/:id/theme` → `db.parish_settings (category='theme')`                                          | wrapped `<ProtectedRoute>` (no `requiredRole`); backend gate **`unknown`** in route file | See "Permissions" gap re parish-management role gate. |
| `layout.theme.ui`                    | Account → Parish Management → UI Theme                                   | `UIThemePage.tsx`                                                                                       | `GET/POST /api/parish-settings/:id/ui` → `db.parish_settings (category='ui')`                                                | same                                                          | — |
| `layout.user_table_prefs`            | Per-user table column preferences (column order, sort, etc.)              | uses `apiClient.get('/my/ui-preferences')` (called from various record pages)                          | `GET/PUT /api/my/ui-preferences` → `routes/ui-preferences.js:13–60` → `db.user_table_settings (user_id, church_id, table_name, settings_json)` | own user                                                      | Per-user, per-church, per-table — granular. |
| `layout.landing_page_branding`       | Account → Parish Management → Landing Page Branding                       | `LandingPageBrandingPage.tsx`                                                                          | branding upload via `/api/my/church-branding/:field`; copy/text fields **`unknown`** (route file did not surface text fields; likely also `parish_settings`) | super_admin, admin, church_admin                              | — |
| `layout.search_configuration`        | Account → Parish Management → Search Configuration                        | `SearchConfigurationPage.tsx:3` documents `/api/parish-settings/:id/search`                            | `db.parish_settings (category='search')`                                                                                     | same as theme                                                  | — |
| `layout.system_behavior`             | Account → Parish Management → System Behavior                             | `SystemBehaviorPage.tsx:3` documents `/api/parish-settings/:id/system`                                  | `db.parish_settings (category='system')`                                                                                     | same                                                           | — |
| `layout.record_settings`             | Account → Parish Management → Record Settings                             | `RecordSettingsPage.tsx`                                                                                 | route used: **`unknown`** (no `apiClient` call grep-matched in this file at audit time; may use shared hook or be local-only state until save) | same                                                           | **GAP**: PreviewBanner exists; persistence path needs verification. |
| `layout.field_mapper`                | Portal → Settings → "Database Mapping" tab                                | `PortalSettingsPage.tsx:252,301` (`apiClient.get/post('/admin/churches/${churchId}/field-mapper')`)     | `GET/POST /api/admin/churches/:id/field-mapper` → `routes/admin/churches.js:71–207` → `db.orthodoxmetrics_db.field_mapper_settings (mappings JSON, field_settings JSON)` | super_admin, admin, manager, church_admin, priest             | Also reads `information_schema.columns` of the church DB to enumerate columns. |
| `layout.themes_admin`                | Admin theme writer (separate from parish-side studio)                    | not exposed in the portal nav                                                                            | `routes/admin/churches.js:249–290` → `db.orthodoxmetrics_db.church_themes`                                                    | super_admin, admin                                             | **GAP**: third theme storage (church_themes table) — registry must collapse the three sources. |

---

## Category: notifications

In-app notifications + per-user preferences.

| Config-item key                 | Surface in UI                                  | current_source (frontend)                                                                                          | current_source (backend / DB)                                                                                                                                              | Owning role(s)             | Notes / gaps |
|---------------------------------|------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------|---|
| `notifications.preferences`     | Account → Notifications                        | `AccountNotificationsPage.tsx`; `accountApi.ts:301–321` (GET/PUT `/api/notifications/preferences`)                  | `GET/PUT /api/notifications/preferences` → `api/notifications.js:703–719` → reads/writes per-user notification-prefs storage; type catalog at `db.notification_types` (`api/notifications.js:53,288,439,459`) | own user                   | Some prefs default off until first PUT. |
| `notifications.list`            | Notifications bell (header)                     | not part of this audit's portal walk; component lives in `HpHeader`                                                  | `GET /api/notifications` → `api/notifications.js:79+` → `db.notifications`                                                                                                  | requireAuth (per user)     | — |
| `notifications.unread_counts`   | Bell badge                                     | header                                                                                                              | `GET /api/notifications/counts` → `api/notifications.js:596+` → `db.notifications` aggregate                                                                               | requireAuth                | — |
| `notifications.queue_workflow`  | Internal queueing of outbound notifications    | n/a                                                                                                                  | `db.notification_queue` (status enum: pending/processing/sent/failed) — `api/notifications.js:354–411`                                                                       | system                     | Internal pipe; portal users don't interact directly. |

---

## Category: tenant

Per-tenant scoping + the connection layer. This is the layer the registry will sit beside.

| Config-item key                    | Surface (operator-visible behavior)                                  | current_source (frontend)                                                                | current_source (backend / DB)                                                                                                                                              | Owning role(s)              | Notes / gaps |
|------------------------------------|---------------------------------------------------------------------|------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|---|
| `tenant.id`                        | "Active church" id used by every per-church endpoint                  | `useChurch()` context, fed by `apiClient.get('/my/churches')` (`UploadRecordsPage.tsx:224`) | `GET /api/my/churches` → `api/churches.js:77–160` → `db.churches`                                                                                                            | as documented in `/my/churches` (super_admin all, others by `users.church_id`) | — |
| `tenant.database_name`             | The per-church DB used for sacramental records                        | n/a (server-side only)                                                                     | `db.churches.database_name`; resolved by `getChurchDbConnection(databaseName)` (`routes/admin/churches.js:103`) which returns the per-church pool                              | super_admin, admin, church_admin (write); read by all routes that scope by churchId | Default fallback `orthodoxmetrics_ch_${churchId}` is used if the column is null (`routes/admin/churches.js:101`). |
| `tenant.crm_link`                  | Optional link to CRM `us_churches` row used to suggest jurisdiction    | not visible in portal — used internally by `/my/church-settings`                          | `db.us_churches.provisioned_church_id` (or city+state fallback) (`api/churches.js:243+`)                                                                                     | server-side                 | — |
| `tenant.is_active`                 | Whether the church is enabled                                          | not surfaced in portal                                                                    | `db.churches.is_active`                                                                                                                                                     | super_admin                  | — |
| `tenant.setup_complete`            | Whether onboarding finished                                            | not surfaced in portal                                                                    | `db.churches.setup_complete`                                                                                                                                                | super_admin                  | — |

---

## Category: auth (cross-cutting)

Login + session lifecycle + password rotation. Not in master plan §C category list, but
collected here because every other category sits on top of it.

| Config-item key                  | Surface in UI                                       | current_source (frontend)                                                                       | current_source (backend / DB)                                                                                              | Owning role(s)         | Notes / gaps |
|----------------------------------|-----------------------------------------------------|-------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|------------------------|---|
| `auth.login`                     | `/auth/login` (`/auth/login2` alias)                  | `front-end/src/features/auth/authentication/auth2/Login2.tsx`                                    | `POST /api/auth/login` → `routes/auth.js:37–90+` → `SELECT * FROM users WHERE email=? AND is_active=1`; bcrypt verify       | public                 | — |
| `auth.logout`                    | Header "log out"                                      | `HpHeader` (not in this audit's deep walk)                                                       | `POST /api/auth/logout` → `routes/auth.js:480+`                                                                              | authenticated          | — |
| `auth.forgot_password`           | `/auth/forgot-password`                              | `ForgotPassword2`                                                                                  | `POST /api/auth/forgot-password` → `routes/auth.js:634+`                                                                     | public                 | — |
| `auth.password_change`           | Account → Password & Auth                            | `AccountPasswordPage.tsx`; `accountApi.ts:206–215`                                                | `PUT /api/user/profile/password` → `api/user-profile.js` → updates `db.users.password_hash` + revokes other sessions          | own user               | — |
| `auth.security_status`           | Account → Password (status pills)                    | `accountApi.ts:201–204`                                                                            | `GET /api/user/profile/security-status` → `api/user-profile.js` (derived view of `db.users` + `refresh_tokens` counts)        | own user               | — |
| `auth.email_verification_resend` | Account → Profile / Personal Info banner             | `accountApi.ts:218–223`                                                                            | `POST /api/user/profile/resend-verification` → `api/user-profile.js` → `utils/emailService`                                  | own user               | — |
| `auth.sessions.list`             | Account → Sessions                                   | `accountApi.ts:281–286`                                                                            | `GET /api/user/sessions` → `routes/user-sessions.js:43–70` → `SELECT FROM refresh_tokens` (active + recently revoked/expired) | own user               | NB: "sessions" maps to `refresh_tokens` rows, not a separate sessions table. |
| `auth.sessions.revoke_one`       | Account → Sessions row "revoke"                      | `accountApi.ts:288–291`                                                                            | `DELETE /api/user/sessions/:id` → `routes/user-sessions.js:89–134` → `UPDATE refresh_tokens SET revoked_at=NOW()`             | own user               | — |
| `auth.sessions.revoke_others`    | Account → Sessions "log out everywhere"              | `accountApi.ts:293–296`                                                                            | `POST /api/user/sessions/revoke-others` → `routes/user-sessions.js:158–185`                                                  | own user               | — |

---

## Role-based difference summary

The portal's `/portal/*` block (the actual experience non-super_admins live in) exposes the
following narrower role allowlists than the records read/write surface:

| Surface                                  | Allowed roles                                                                  | Notes |
|------------------------------------------|--------------------------------------------------------------------------------|-------|
| Records list/detail/add/edit (`/portal/records/*`) | super_admin, admin, church_admin, priest, deacon, editor                  | "full" portal allowlist |
| Upload (`/portal/upload`)                | super_admin, admin, church_admin, priest                                       | drops deacon + editor |
| Charts (`/portal/charts`)                | super_admin, admin, church_admin, priest                                       | drops deacon + editor |
| Settings (`/portal/settings`)            | super_admin, admin, church_admin, priest                                       | drops deacon + editor |
| OCR (`/portal/ocr*`)                     | super_admin, admin, church_admin, priest                                       | drops deacon + editor |
| Certificates (`/portal/certificates*`)   | super_admin, admin, church_admin, priest, deacon, editor                       | full allowlist |
| Sacramental restrictions                 | super_admin, admin, church_admin, priest, deacon, editor                       | full allowlist |
| Profile redirect / Guide / Site map      | any authenticated                                                              | — |

`viewer` and `staff` roles are referenced in `ROLE_LABELS` (`ChurchPortalHub.tsx:71–82`) but
**no portal route currently allows them in any `requiredRole` array**. Verified gap — those
roles can authenticate but every gated `/portal/*` redirects them to `/auth/unauthorized`. The
only place a non-staff/non-super-admin could land today is the dashboard hub itself
(no role array on the index route), where most cards are still rendered but actions 403 at
the API layer.

---

## Open questions / gaps

1. **`branding.hero_image`** — there is no DB column or admin UI for the per-tenant hero. Today
   it's a hardcoded `Record<number, …>` in `HeroBanner.tsx:9–13` containing only church 46.
   Phase 5 registry must add a `branding.hero_image` config-item and a writer.

2. **Three-way theme storage** — themes today live in:
   - `db.parish_settings (category='theme'|'ui')` (parish-scoped, written by Theme Studio /
     UI Theme pages)
   - `db.churches.primary_color`, `secondary_color` (legacy columns, read by
     `/my/church-settings`)
   - `db.orthodoxmetrics_db.church_themes` (admin-scoped, written by
     `routes/admin/churches.js:249+`)

   Registry must declare a single source of truth and either deprecate the others or document
   the precedence.

3. **`has_*_records` flags are not honored on the portal hub** — `db.churches.has_baptism_records`
   etc. exist and are editable from Account → Church Details, but `ChurchPortalHub.tsx`
   renders all three record-type cards regardless. Either the flags should be honored, or they
   should be removed from the registry.

4. **`/account/parish-management` lacks a route-level role gate** (`Router.tsx:858`'s
   `<ProtectedRoute>` wrapper has no `requiredRole`). Underlying admin endpoints enforce, so
   non-admins get 403 from the API rather than a clean redirect. Registry should declare the
   required role and the route should use it.

5. **`viewer` and `staff` roles are dead** in the portal — labels exist but no portal route
   allowlists either. Registry decides: either expose them on at least the index hub, or drop
   them from `ROLE_LABELS`.

6. **`navigation.menu_permissions`** is wired up server-side
   (`/api/menu-permissions`, `/api/admin/menu-permissions`) but the portal's actual nav comes
   from `HpHeader` + the per-route `requiredRole` arrays in Router.tsx; these two sources are
   not unified. Registry must pick one.

7. **`navigation.role_default_landing`** — the prior `default_landing_page` column on
   `churches` was explicitly removed (per `PortalSettingsPage.tsx:43` comment).
   `AccountLayoutSwitcher` (`Router.tsx:201–215`) hardcodes the redirect logic. Registry should
   replace the hardcode.

8. **Records dropdown source not verified** (`metrics.api.ts:103`). The endpoint
   `/api/{type}-records/dropdown-options/:field` exists but the SQL was not located in this
   pass — could come from the records table directly or a dedicated lookup table. Marked
   `unknown` in the records section.

9. **Records export visibility in portal not verified** (`metrics.api.ts:106`). The endpoint
   exists; whether the portal's records pages surface a button is **`unknown`** (would require
   inspecting each `*RecordsPage` component, which was not in scope of the
   `apiClient` grep used here).

10. **Help / UserGuide content source** is `front-end/src/features/help/UserGuide.tsx` — appears
    to be a static React page (no backend call). If the registry wants per-tenant help
    content, it would need a new path. Verified static at audit time but **not deeply
    inspected** beyond the import.

11. **`layout.record_settings`** persistence path was not located via `apiClient` grep on
    `RecordSettingsPage.tsx`; **`unknown`** whether it uses a shared hook, parish-settings,
    or stays in component state. Needs follow-up.

12. **`layout.landing_page_branding`** copy/text fields (vs. the image fields verified above)
    — image fields verified to use `/my/church-branding/:field`; the text-side persistence is
    **`unknown`** without deeper inspection.

13. **Plan-type owning_system mismatch** — `audit.discovery` is owned by `omstudio`, not by
    `om`/`global`/`cross_system` (resolver warning). Cosmetic only for this run, but worth
    raising for a future plan-type-ownership cleanup.

---

## Verdict

The portal as it exists today is functional but uses **at least three storage locations for
theme/branding** (`churches.*` columns, `parish_settings`, `church_themes`) and **at least two
for navigation/permissions** (Router `requiredRole` arrays vs. `menu_permissions` table). The
master-plan registry (Phase 5 / Child #5) must collapse those into one canonical source per
config-item key. None of the existing plumbing is so badly broken that the registry can't
graft on top of it; the high-priority gaps are the hero-image hardcode and the three-way theme
storage.

Risk level for the implementation phase that consumes this audit: **medium** (per
`audit.discovery` v4 risk options). Many cells map cleanly; the gaps above are real but
identified.

## Follow-up recommendations

1. **Phase 5 prep:** confirm with the master-plan owner which of the three theme/branding
   stores becomes canonical before writing the registry schema.
2. **Quick win:** decide whether `has_*_records` flags should drive card visibility on the hub
   (one component change) or be retired (one column drop migration).
3. **Quick win:** add a `requiredRole` array to the `/account/parish-management` route in
   `Router.tsx:858` so non-admins don't see the page chrome before getting API 403s.
4. **Quick win:** resolve `viewer` / `staff` — either give them a route or drop them from
   `ROLE_LABELS`.
5. **Phase 5 design input:** the `parish_settings` JSON-column model
   (`category, setting_key, value`) is the closest thing OM has today to the registry's
   shape. If it can be promoted to the registry's storage layer, less migration work.
6. **Pre-implementation:** verify the ten `unknown` cells above (mostly export visibility,
   record-settings persistence, dropdown source) before they become surprises in Phase 5.

---

## Evidence index (paths verified at audit time)

- Frontend portal block: `front-end/src/routes/portalRoutes.tsx`
- Frontend top router: `front-end/src/routes/Router.tsx`
- Portal layout: `front-end/src/layouts/portal/ChurchPortalLayout.tsx`
- Portal feature dir: `front-end/src/features/portal/{ChurchPortalHub,HeroBanner,RecordPipelineStatus,PortalRecordsPage,PortalSettingsPage,PortalCertificatesPage}.tsx`
- Account feature dir: `front-end/src/features/account/{AccountLayout,AccountProfilePage,AccountPersonalInfoPage,AccountPasswordPage,AccountSessionsPage,AccountNotificationsPage,AccountParishInfoPage,AccountChurchDetailsPage,AccountBrandingPage,AccountOcrPreferencesPage,accountApi,accountConstants}.{ts,tsx}`
- Parish management: `front-end/src/features/account/parish-management/{ParishDashboard,DatabaseMappingPage,ThemeStudioPage,UIThemePage,LandingPageBrandingPage,RecordSettingsPage,SearchConfigurationPage,SystemBehaviorPage,useParishSettings,PreviewBanner,ParishManagementLayout}.{ts,tsx}`
- Records pages: `front-end/src/features/records-centralized/components/{baptism/BaptismRecordsPage,marriage/MarriageRecordsPage,death/FuneralRecordsPage}.tsx` and `front-end/src/features/records-centralized/{baptism,marriage,funeral}/{Baptism,Marriage,Funeral}RecordEntryPage.tsx`
- Upload page: `front-end/src/features/records-centralized/apps/upload-records/UploadRecordsPage.tsx`
- API helpers: `front-end/src/api/{metrics.api.ts,utils/axiosInstance.ts}`
- Backend index: `server/src/index.ts`
- Backend records: `server/src/api/{baptism,marriage,funeral}.js`, `server/src/routes/{baptism,marriage,funeral}.js` (re-export)
- Backend churches: `server/src/api/churches.js` (`/my/churches`, `/my/church-settings`, `/my/church-branding/:field`)
- Backend admin: `server/src/routes/admin/{churches,church-database}.js`
- Backend record-batches: `server/src/routes/record-batches.js`
- Backend parish: `server/src/routes/{parish-settings,parish-stats,clergy-tenure,jurisdictions}.js`
- Backend user/auth: `server/src/routes/{auth,user-sessions,user-profile,user}.js`, `server/src/api/{user-profile,notifications,user}.js`
- Backend OCR: `server/src/routes/ocr/{index,jobs,review,fusion,...}.{ts,js}`
- Migration: `server/database/migrations/20260316_create_record_batches.sql`

