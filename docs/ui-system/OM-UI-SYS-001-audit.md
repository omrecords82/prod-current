# OM-UI-SYS-001 — Component Inventory, Classification, and Extraction Audit

| | |
|---|---|
| **Prompt** | OM-UI-SYS-001 |
| **OMAI Daily item** | OMD-1305 |
| **Branch** | `feature/om-ui-system/2026-04-21/component-inventory-audit` |
| **Audit date** | 2026-04-21 |
| **Scope** | `front-end/src/` — no code changes in this step |

This document is the top-level synthesis. Underlying detail lives in four companion audits in this directory:

- [`01-om-namespace-audit.md`](./01-om-namespace-audit.md) — `front-end/src/@om/`
- [`02-components-dir-audit.md`](./02-components-dir-audit.md) — `front-end/src/components/`
- [`03-features-dir-audit.md`](./03-features-dir-audit.md) — `front-end/src/features/`
- [`04-coupling-audit.md`](./04-coupling-audit.md) — theme, MUI, Modernize, routing, and API coupling

---

## 1. Executive summary

OM has three partially overlapping attempts at a shared UI layer:

1. **`@om/components/`** — cleanly designed, production-quality, and completely unused. ~3,164 LOC. Zero consumers.
2. **`components/forms/theme-elements/` + `components/*`** — the legacy shared layer. Heavily used (e.g. `CustomTextField` has 29 importers) but mixed with Modernize template leftovers (`components/apps/`, `components/dashboards/`, `components/frontend-pages/*`) that are effectively dead.
3. **Per-feature component libraries** under `features/<area>/components/` — where the real UI patterns have been re-invented, often 3–6 times (StatCards ×6, PageHeaders ×4, Toolbars ×5, Dialogs ×12+).

**There is a defensible extraction target.** A modest set of ~20 foundation/OM-system candidates accounts for the majority of the duplication. Most of the apparent UI surface (~540 KB across `apps/`, `dashboards/`, `frontend-pages/*`) is Modernize template dead code and should be deleted, not extracted.

**The theme is in good shape.** MUI 7.2 with a `CustomizerContext`-driven dark mode works; components that use `sx` + theme tokens dark-mode correctly. But most candidate components are not portable because they couple to `apiClient`, React Router, and the Modernize shell layout.

**Bottom line**: the new UI system can be built cleanly, but the first extraction waves must focus on components that are **genuinely presentation-only** — and we must refuse to extract the "looks shared" ones that bake in `apiClient`, `useNavigate`, or `layouts/full/shared/...` imports. Those need to be refactored *inside their feature* before promotion.

---

## 2. Current-state findings

### 2.1 Directory-level picture

| Path | Files (approx) | State | Action |
|------|---------------|-------|--------|
| `@om/components/ui/forms/` | 5 | Unused, production-quality | Adopt as forms foundation |
| `@om/components/ui/theme/` | 1 | Unused; useful | Wire up behind app settings |
| `@om/components/features/auth/` | 1 | Unused; 651 LOC | Adopt in admin users page |
| `@om/components/features/liturgical-calendar-*` | 3 | **Three variants** — pick one | Defer to OM-UI-SYS-004 |
| `components/` (root-level) | ~25 | Mixed: some OM-system, some feature-composite, some dead | Per-file triage (see §3) |
| `components/forms/theme-elements/` | 5 | Foundation — heavily used | Decide vs `@om/ui/forms` |
| `components/compat/` (Grid2 etc.) | 1 | MUI v7 shim, 22 consumers | Keep as-is |
| `components/custom-scroll/` | 1 | 7 consumers | Keep as-is |
| `components/OmAssistant/` | 1 | OM-branded, 2 consumers, clean | Promote to OM System |
| `components/RecordPreviewPane/` | 1 | OM-branded, 2 consumers, clean | Promote to OM System |
| `components/ErrorBoundary/` | 1 | Critical primitive | Keep, expose in foundation |
| `components/global/GlobalOMAI/` | 1 | 600+ LOC, 1 consumer, API-coupled | Move into `features/` |
| `components/AdminFloatingHUD.tsx` | 1 | 741 LOC, socket.io + context + API | Move into `features/admin` |
| `components/UserFormModal.tsx` | 1 | 702 LOC, mutation + form state | Replace with `@om/features/auth/UserFormModal` |
| `components/VRTSettingsPanel.tsx` + tabs | 2 | 966 LOC, settings mutations | Move into its feature |
| `components/apps/` | 48 | Modernize blog/email/chat/contacts/ecommerce — mostly unused | **Delete** |
| `components/dashboards/` | 16 | Ecommerce/generic dashboards — 13 imports total, none OM-domain | **Delete** |
| `components/frontend-pages/*` (demos) | ~29 | Marketing/demo pages | **Delete** |
| `components/frontend-pages/shared/` | ~8 | Reused header/footer/CTA primitives | Keep, move to `features/public-site` or OM System |
| `components/dashboards/*` | 16 | Duplicates of OM dashboard features | Delete |
| `features/records-centralized/components/` | ~30 | 10K+ LOC; biggest concentration of duplication | Extract 3 candidates, keep rest local |
| `features/<other 29 areas>/` | many | Per-area local components with significant cross-feature duplication | Extract per §4 |

### 2.2 Theme & dark mode

- **Provider stack**: `ThemeProvider(omTheme)` in `main.tsx` wrapping `CustomizerContextProvider` wrapping an inner `ThemeProvider(BuildTheme())` in `App.tsx`. Nested, but works. Dark mode toggled via `CustomizerContext.activeMode`, persisted to `localStorage`, mirrored onto `<html class="dark">` for Tailwind.
- **Consumption**: 199 observed instances of `sx` + theme tokens or `useTheme()`. 89 hard-coded hex colors, concentrated in code we are deleting (`apps/`, `dashboards/`, demo pages) — this is not a blocker.
- **Verdict**: the theme itself is clean. Dark mode works in any component that uses `sx` with theme palette keys.

### 2.3 Coupling hazards (what makes "shared" components un-shareable)

From `04-coupling-audit.md`:

| Hazard | Files affected | Severity |
|--------|----------------|----------|
| Direct `apiClient` / `axiosInstance` imports inside "shared" components | 183 | **Very high** |
| `react-router-dom` hooks (`useNavigate`, `useParams`) inside components | 128 | **High** |
| Deep imports from `layouts/full/shared/*` (Modernize chrome) | 79 | Medium |
| Dual `ThemeProvider` nesting in `main.tsx` + `App.tsx` | 1 | Low, but confusing |
| MUI primary `#5D87FF` vs Tailwind `orthodox.*` palette drift | Entire app | Design-system risk |

**Any extraction candidate with an `apiClient` or `useNavigate` import must be refactored before promotion.** Do not paper over this with pass-through props in a rush.

---

## 3. Classification inventory (consolidated)

Detailed per-file tables live in `02-components-dir-audit.md` and `03-features-dir-audit.md`. What follows is the cross-repo summary count and the high-value picks.

### 3.1 Counts

| Classification | Count (approx) | Where |
|---------------|---------------|-------|
| Foundation UI | ~13 | `@om/ui/forms/*`, `components/forms/theme-elements/*`, `components/compat/Grid2`, `components/custom-scroll/Scrollbar`, `components/ErrorBoundary/*` |
| OM System | ~20 | `@om/features/auth/*`, `components/OmAssistant`, `components/RecordPreviewPane`, `components/ImpersonationBanner`, `components/HudStatusBody`, `components/TableControlPanel`, `components/InviteActivityDialog`, `components/FieldRenderer`, + domain patterns extractable from `features/records-centralized` (PageHeader, ControlToolbar), `features/*/StatCard`, etc. |
| Feature Composite | ~35 | `AdminFloatingHUD`, `UserFormModal` (legacy), `HudOmaiPanel`, `InviteUserDialog`, `GlobalOMAI`, `SiteEditorOverlay`, `SocialPermissionsToggle`, `VRTSettingsPanel/Tabs`, `OMBigBook`, `OcrWorkbench`, `LiveTableBuilder`, `OMAIDiscoveryPanel`, plus 20+ per-feature page composites |
| Page-Local Only | ~60 | Per-feature components with exactly one import site and no duplication; keep where they are |
| Remove / Duplicate / Not worth preserving | ~120 files | Entire `components/apps/`, `components/dashboards/`, demo `frontend-pages/*`, plus specific duplicates (`RecordsControlsCard.tsx` duplicates `RecordsControlsBar.tsx`; `AdvancedGridDialog`, `ColorPaletteSelector`, `ColorPickerPopover` — zero consumers) |

### 3.2 Cross-cutting notes

- **`@om/components/` and `components/forms/theme-elements/` duplicate each other.** `@om/ui/forms/TextFormInput` vs `CustomTextField` solve the same problem with different APIs (`@om` is `react-hook-form`-aware; `Custom*` is plain MUI passthrough). Do not keep both past OM-UI-SYS-003 — pick one.
- **Every `@om/features/liturgical-calendar-*` is a separate implementation of the same feature.** Not "variants for different use cases" — three different calendar libraries. Resolve during OM-UI-SYS-004.

---

## 4. Duplicate-pattern inventory

From `03-features-dir-audit.md`:

| Pattern | Variants | Example locations | Consolidation target |
|---------|---------|-------------------|----------------------|
| **Stat / summary card** (count + icon + trend) | 6 | Admin dashboard, system health, records analytics, portal landing, OMAI panel, devel-tools overview | `om-system/StatCard` |
| **Page header** (title + subtitle + actions + optional hero) | 4 | `ChurchRecordsHeader`, `HeroBanner`, `RecordHeaderBanner`, portal landing header | `om-system/PageHeader` |
| **Control toolbar** (filters + search + view toggle + actions) | 5 | `RecordsControlsBar`, `RecordsControlsCard` (identical), calendar filter bars, devel-tools console header, logs toolbar | `om-system/ControlToolbar` |
| **Action / confirmation dialog** | 12+ | `EditRecordDialog`, `DeleteConfirmDialog`, `InviteUserDialog`, admin action dialogs, records dialogs, devel-tools task dialogs | `om-system/ActionDialog` |
| **Data table wrapper** | 3 | `StandardRecordsTable` (AG-Grid), `DynamicRecordsTable` (React-Table), system logs MUI DataGrid | Keep separate; standardize the action-row/toolbar around them, not the grid itself |
| **Empty / loading / error state** | 3 | Skeleton-based, icon + message, spinner + message | `foundation/EmptyState`, `foundation/LoadingState`, `foundation/ErrorState` |
| **Trend badge** (% change + arrow + color) | 3+ | Admin dashboard, analytics view, system monitoring | `om-system/TrendBadge` |
| **Chart card** (title + subtitle + chart) | 4 | Analytics, system, dashboard, reports | `om-system/ChartCard` |

**Biggest single win**: `RecordsControlsBar.tsx` (329 LOC) and `RecordsControlsCard.tsx` (324 LOC) in `features/records-centralized/components/` are the same component with the second wrapped in a `Card`. Delete one immediately, or during OM-UI-SYS-003 extraction.

---

## 5. Recommended extraction order

Ordered by value-per-risk. The list is intentionally conservative — everything here is **presentation-only** and has real multi-site usage today.

### Wave 1 — Foundation UI (OM-UI-SYS-003, first half)

1. **`EmptyState` / `LoadingState` / `ErrorState`** — 3 variants across features, all purely presentational. Lowest risk, highest payoff in de-duplication.
2. **`StatCard`** — 6 duplicate implementations. Single `{ label, value, icon?, trend? }` API.
3. **`PageHeader`** — 4 duplicates. `{ title, subtitle?, actions?, meta? }`.
4. **`SectionCard`** — wraps a titled section in a `Card`. Already informally used in many feature pages.
5. **Formalize `@om/ui/forms/*`** as the canonical forms layer. Do not yet migrate `CustomTextField` consumers (that's Wave 3).
6. **`Scrollbar`** (from `components/custom-scroll/`) — already used in 7 places. Move to foundation, no API change.
7. **`Grid2`** (from `components/compat/`) — keep as-is, move into foundation namespace.
8. **`ErrorBoundary`** — critical primitive, keep API stable.

### Wave 2 — OM System (OM-UI-SYS-004)

9. **`ControlToolbar`** — 5 duplicates; needs careful prop design around filter plugins and actions.
10. **`ActionDialog`** — 12+ dialogs, but the pattern ("title + body + confirm/cancel + optional form") is small; risk is that each caller has slightly different validation handling.
11. **`ChartCard`** — 4 duplicates; container around existing chart libs.
12. **`TrendBadge`** — small, 3+ duplicates.
13. **`OmAssistant`** — already clean OM-branded chat UI; move into OM System layer and keep public API.
14. **`RecordPreviewPane`** — already OM-System-shaped; relocate.
15. **`ImpersonationBanner`** — reads `useAuth`, renders banner; acceptable coupling because `useAuth` is part of the platform, not a feature.
16. **`@om/features/auth/UserFormModal`** — adopt as-is in admin users page; retire `components/UserFormModal.tsx` (702 LOC legacy).

### Wave 3 — Legacy migration + cleanup (OM-UI-SYS-005)

17. **Forms consolidation** — pick `@om/ui/forms` vs `CustomTextField` et al. Migrate 29 `CustomTextField` consumers.
18. **Delete `components/apps/`, `components/dashboards/`, `components/frontend-pages/{homepage,about,tour,portfolio,blog,contact}`.** ~540 KB.
19. **Relocate feature composites** currently living in `components/` root (`AdminFloatingHUD`, `VRTSettingsPanel`, `GlobalOMAI`, `HudOmaiPanel`, `InviteUserDialog`, `SiteEditorOverlay`, `SocialPermissionsToggle`) into their respective `features/<area>/`.
20. **Delete duplicates**: `RecordsControlsCard` (duplicate of `RecordsControlsBar`), `AdvancedGridDialog`, `ColorPaletteSelector`, `ColorPickerPopover` (zero consumers).

### Deferred to OM-UI-SYS-006

- Any `react-router-dom`-coupled or `apiClient`-coupled component sitting in `components/`. Refactor in place first; do not extract until the coupling is removed.
- Calendar variant consolidation. Pick one of `@om/features/liturgical-calendar-{modern,raydar,monthly}` and delete the other two.

---

## 6. Anti-candidate list (do not preserve / do not extract)

### 6.1 Delete wholesale

- `components/apps/*` — 48 files, ~460 KB. Modernize template scaffolding (blog/email/chat/contacts/ecommerce). 0–5 real uses; replace those uses with feature-local implementations or delete along with the importer.
- `components/dashboards/*` — 16 files, ~96 KB. Ecommerce/generic dashboards. 13 total imports, none OM-domain.
- `components/frontend-pages/{homepage,about,tour,portfolio,blog,contact}` — ~29 files, ~320 KB. Marketing demos.
- `components/AdvancedGridDialog.tsx`, `components/ColorPaletteSelector.tsx`, `components/ColorPickerPopover/` — zero consumers.
- `features/records-centralized/components/RecordsControlsCard.tsx` — identical twin of `RecordsControlsBar.tsx`.

### 6.2 Do not extract — keep page-local

- **`OMBigBook.tsx`** (3,509 LOC) — admin mega-page, dense business logic, no real reusable surface.
- **`OcrWorkbench.tsx`** (1,204 LOC) — OCR-domain-specific, tightly coupled to overlay state and the OCR pipeline.
- **`LiveTableBuilder.tsx`** (591 LOC) — church-wizard specific; if a pattern is extractable it's narrow ("field builder"), not the whole component.
- **`OMAIDiscoveryPanel.tsx`** (896 LOC) — AI-specific NLP UI; do not try to generalize.
- **Auth forms (login/register/forgot-password page components)** — heavily coupled to auth state and validation.
- **`AdminFloatingHUD.tsx`** (741 LOC), **`HudOmaiPanel.tsx`** (426 LOC), **`GlobalOMAI.tsx`** (600+ LOC) — all couple to contexts, sockets, or API. Relocate (into `features/admin` or a `features/omai`), do **not** try to extract as shared.

### 6.3 Do not extract — coupling is the reason, not size

- Anything in `components/` that imports from `@/api/utils/axiosInstance`, `useNavigate`, `useParams`, or `src/layouts/full/shared/*`. These are refactor-first items; extraction comes only after the coupling is removed.

---

## 7. Proposed target folder / module structure

OM-UI-SYS-002 is responsible for creating this. Proposed shape:

```
front-end/src/@om/components/
├── foundation/           # theme-agnostic primitives
│   ├── forms/            # (from current @om/ui/forms/*)
│   │   ├── TextFormInput.tsx
│   │   ├── SelectFormInput.tsx
│   │   ├── PasswordFormInput.tsx
│   │   ├── TextAreaFormInput.tsx
│   │   ├── DropzoneFormInput.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── Grid2.tsx           # from components/compat/
│   │   ├── Scrollbar.tsx       # from components/custom-scroll/
│   │   └── SectionCard.tsx
│   ├── state/
│   │   ├── EmptyState.tsx
│   │   ├── LoadingState.tsx
│   │   ├── ErrorState.tsx
│   │   └── ErrorBoundary.tsx
│   ├── theme/
│   │   └── ThemeCustomizer.tsx # from current @om/ui/theme/
│   └── index.ts
├── om-system/            # OM-branded presentation, accepts data via props
│   ├── PageHeader.tsx
│   ├── StatCard.tsx
│   ├── TrendBadge.tsx
│   ├── ChartCard.tsx
│   ├── ControlToolbar.tsx
│   ├── ActionDialog.tsx
│   ├── OmAssistant/            # relocated from components/OmAssistant
│   ├── RecordPreviewPane/      # relocated from components/RecordPreviewPane
│   ├── ImpersonationBanner.tsx # relocated from components/
│   └── index.ts
├── features/             # domain components with service injection (not data fetching)
│   ├── auth/
│   │   └── UserFormModal.tsx   # existing; winning implementation
│   ├── calendar/
│   │   └── LiturgicalCalendar.tsx  # one chosen variant; others deleted
│   └── index.ts
└── index.ts
```

Feature-local code continues to live under `front-end/src/features/<area>/`. Feature composites that currently sit in `components/` root get relocated into the appropriate `features/<area>/` — not `@om/`.

### Layer rules (to be enforced in OM-UI-SYS-002)

| Layer | Allowed deps | Forbidden |
|-------|-------------|-----------|
| `foundation/` | React, MUI, `react-hook-form`, theme tokens | Router, API client, feature code, `apiClient`, `axiosInstance` |
| `om-system/` | Everything `foundation/` allows, plus OM theme tokens and `foundation/*` | Router hooks, API client, `features/*` |
| `features/` (under `@om/`) | Everything above plus service injection via props | Direct `apiClient` imports, Router hooks |
| `front-end/src/features/<area>/` | Anything — this is the app layer | — |

### Naming conventions

- Foundation UI: neutral noun (`EmptyState`, `PageHeader`, `Scrollbar`).
- OM System: `Om` prefix **only** where the component is distinctly OM-branded (`OmAssistant`). Otherwise neutral.
- Avoid `Custom*` going forward — the prefix is a tell of "MUI passthrough with a small tweak" and the layer boundary should do that job instead.

---

## 8. Risks / blockers

1. **`@om/` path alias is not configured.** Must be added to `tsconfig.json` and `vite.config.ts` before OM-UI-SYS-002 starts writing imports against it.
2. **Dual `ThemeProvider` stack** (`main.tsx` static + `App.tsx` dynamic) — works, but collapsing to a single provider would simplify the UI-system story. Not required for OM-UI-SYS-001; flag for OM-UI-SYS-006.
3. **MUI palette vs Tailwind `orthodox.*` palette** — primary colors differ (`#5D87FF` vs orthodox palette). This doesn't block the extraction but matters when we formalize tokens. OM-UI-SYS-002 should pick one source of truth.
4. **Calendar triplet** — three implementations under `@om/features/liturgical-calendar-*`. Decide-and-delete in OM-UI-SYS-004.
5. **Deep `apiClient`/router coupling** in 183+128 files — the audit deliberately did not promote anything that has these imports. Wave 3 (OM-UI-SYS-005) must refactor coupled components in place; premature extraction will drag the coupling into the shared layer.
6. **Git state in `/var/www/orthodoxmetrics/prod`** (not this workspace) has large uncommitted deletions of feature sub-components on branch `feat/1304-...`. If that work lands before OM-UI-SYS-002 runs, the feature-area inventory in `03-features-dir-audit.md` will drift — re-run feature inventory at the top of OM-UI-SYS-002 if main has moved significantly.

---

## 9. Proposed next-step plan (handoff to OM-UI-SYS-002)

The next prompt should:

1. **Configure the path alias**: add `@om/*` to `front-end/tsconfig.json` `paths` and confirm Vite picks it up in dev + build. Verify with one throwaway import that gets reverted.
2. **Create the target folder skeleton** per §7 — empty `foundation/`, `om-system/`, `features/` with placeholder `index.ts` files.
3. **Move the existing `@om/ui/forms/*` and `@om/ui/theme/*`** into the new shape (`foundation/forms/`, `foundation/theme/`). Rename only, no API change.
4. **Write layer contracts** (short markdown files or JSDoc at `index.ts` tops) capturing the rules in §7.
5. **Document naming conventions** in `docs/ui-system/conventions.md`.
6. **Declare the approved first extraction list** for OM-UI-SYS-003 — start with the Wave 1 items in §5 (`EmptyState`, `LoadingState`, `ErrorState`, `StatCard`, `PageHeader`, `SectionCard`, `Scrollbar`, `Grid2`, `ErrorBoundary`).
7. **Do not** promote `OmAssistant`, `RecordPreviewPane`, `ImpersonationBanner`, `ControlToolbar`, `ActionDialog`, `ChartCard`, `TrendBadge`, or `UserFormModal` yet — those are Wave 2 (OM-UI-SYS-004).
8. **Do not** touch any component with `apiClient` or router hooks at this stage.

---

## 10. Success criteria check

From the prompt:

- ✅ **"We can clearly distinguish OM-owned reusable UI from page code"** — the §3 classification and the companion per-dir audits do this.
- ✅ **"We have a defensible list of what is worth extracting"** — §5 Wave 1 / Wave 2.
- ✅ **"We have enough structure to start extraction without guesswork"** — §7 folder layout, §9 handoff plan.
- ✅ **"No library migration has started yet"** — this branch contains only `docs/ui-system/*`.
