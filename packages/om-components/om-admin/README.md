# OM Admin

> Admin panel — user management, system health, logs, CMS, dashboards, VRT settings, OMAI Daily, devel-tools, AdminFloatingHUD.

## Overview

Largest bundle. Everything under `features/admin/` (~45K LOC), `features/devel-tools/` (~75K LOC — OMTrace console, refactor console, API explorer, menu editor, logs, system monitoring, performance diagnostics, and the full OMAI Daily workbench), `features/system/`, `features/logs/`, `features/cms/`, `features/dashboard/`, plus the top-level admin components: `AdminFloatingHUD` (741 LOC), `AdminMessageNotification`, `HudStatusBody`, `HudOmaiPanel`, `ImpersonationBanner`, `InviteActivityDialog`, `InviteUserDialog`, `SiteEditorOverlay`, `SocialPermissionsToggle`, `VRTSettingsPanel` + tabs, plus `tools/omtrace/` and `ai/{visualTesting,vrt}/`.

**Primary consumers:** Only mount in sites that have a `super_admin` or `admin` role concept.

### Contents

**Files:** 470  •  **LOC:** 142,992

| Path | Kind | Files |
|------|------|-------|
| `ai/` | dir | 5 |
| `components/` | dir | 11 |
| `features/` | dir | 433 |
| `tools/` | dir | 34 |

### External (npm) dependencies

- **React core**: `react` _(347)_
- **React Router**: `react-router-dom` _(48)_
- **MUI**: `@mui/material` _(109)_, `@mui/icons-material` _(11)_, `@mui/x-data-grid` _(3)_, `@mui/x-date-pickers` _(3)_
- **Forms**: `formik` _(1)_, `yup` _(1)_
- **Tables**: `ag-grid-community` _(1)_, `ag-grid-react` _(1)_
- **Charts**: `react-apexcharts` _(9)_
- **Calendar**: `dayjs` _(4)_, `date-fns` _(1)_
- **State / Data**: `axios` _(8)_, `@tanstack/react-query` _(4)_, `socket.io-client` _(1)_
- **UI utilities**: `@tabler/icons-react` _(47)_, `react-toastify` _(7)_, `lucide-react` _(2)_
- **Other**: `path` _(25)_, `fs` _(23)_, `child_process` _(8)_, `${targetPath}` _(2)_, `glob` _(2)_, `react-map-gl` _(2)_, `ts-morph` _(2)_, `d3-scale` _(1)_, `express-session` _(1)_, `mapbox-gl` _(1)_

The `(n)` count is the number of import statements referencing that package. Install these as peer dependencies in the consumer app. Match the OM repo's versions in `front-end/package.json` to avoid MUI major-version drift.

### Path-alias imports (expected in consumer app)

These are references to paths outside this bundle. The consumer must either (a) install **om-foundation** (which ships most of the `@/hooks`, `@/context`, `@/utils`, `@/api`, `@/shared/*`, `@/types`, `@/theme` targets), or (b) provide equivalent implementations at the same alias paths.

| Import path | References |
|-------------|------------|
| `@/api/utils/axiosInstance` | 92 |
| `@/shared/ui/PageContainer` | 51 |
| `@/layouts/full/shared/breadcrumb/Breadcrumb` | 41 |
| `@/context/AuthContext` | 30 |
| `@/shared/lib/axiosInstance` | 27 |
| `@/types/refactorConsole` | 14 |
| `@/shared/lib/apiClient` | 14 |
| `@/ui/icons` | 12 |
| `@/components/compat/Grid2` | 9 |
| `@/api/admin.api` | 6 |
| `@/context/CustomizerContext` | 5 |
| `@/shared/recordSchemas/registry` | 5 |
| `@/theme/adminTokens` | 5 |
| `@/shared/ui/DashboardCard` | 5 |
| `@/api/components.api` | 5 |
| `@/shared/ui/BlankCard` | 4 |
| `@/config/featureRegistry` | 4 |
| `@/shared/ui/EmptyState` | 3 |
| `@/features/devel-tools/live-table-builder/types` | 3 |
| `@/shared/lib/userService` | 2 |
| `@/components/common/OMLoading` | 2 |
| `@/layouts/full/vertical/sidebar/MenuItems-default-superadmin` | 2 |
| `@/shared/lib/buildInfo` | 2 |
| `@/hooks/useServerVersion` | 2 |
| `@/features/devel-tools/live-table-builder/components/LiveTableBuilder` | 2 |

### Installing into a new OM site

**Step 1 — add path aliases.** In the consumer app's `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*":         ["*"],
      "@om/*":       ["@om/*"],
      "@shared/*":   ["shared/*"]
    }
  }
}
```

And in `vite.config.ts`:

```ts
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@':       path.resolve(__dirname, 'src'),
      '@om':     path.resolve(__dirname, 'src/@om'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
```

**Step 2 — install `om-foundation` first** (it provides the `@/hooks`, `@/context`, `@/api`, `@/utils`, `@/theme`, `@/shared/*` targets that this bundle imports).

```bash
# from the consumer app root
rsync -a ../packages/om-components/om-foundation/src/ ./src/
```

**Step 3 — copy this bundle into the consumer's `src/`.**

```bash
rsync -a ../packages/om-components/om-admin/src/ ./src/
```

**Step 4 — install the npm peer dependencies** listed under *External (npm) dependencies* above. Example:

```bash
npm i ${targetPath} @mui/icons-material @mui/material @mui/x-data-grid @mui/x-date-pickers @tabler/icons-react @tanstack/react-query ag-grid-community ag-grid-react axios …
```

**Step 5 — wire up routes / providers.** See the per-feature entry points under this bundle's `src/features/*/` and the route definitions in `src/Router.tsx` in the OM repo for examples. Each top-level feature exports a lazy-loadable page component; register it under your router.

## Notes & caveats

- This bundle is opinionated about the role model: expects `super_admin | admin | church_admin | priest | deacon | editor` hierarchy (see CLAUDE.md).
- The OMBigBook mega-page (3,509 LOC) is included but is page-local — do not try to extract pieces of it.
- The devel-tools subtree assumes OMAI runs at `http://<host>:7060` and has the `/api/omai-daily/*` routes mounted. If you're in a site without OMAI, delete `features/devel-tools/command-center/` and the OMAI Daily panels.
- VRT (visual regression testing) includes a Playwright-based workflow; only useful if you also ship `server/src/ai/vrt/` from the backend.

## Provenance

Copied from `front-end/src/` at the `main` tip on 2026-04-22 (commit `465663d7`), as part of OMD-1307. Sources remain in the OM monorepo — this tree is a redistributable snapshot, not the live source of truth.
