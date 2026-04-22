# OM Records

> Sacramental records UI — baptism, marriage, funeral — plus preview pane, field renderers, certificates, and dynamic tables.

## Overview

The full records-centralized feature (AG-Grid + React-Table wrappers, filter chips, bulk actions, edit/create dialogs, persistence hooks), plus the `RecordPreviewPane`, the `FieldRenderer` (multi-type field display/edit), the certificates generator, and the dynamic-schema tables module. Pulls `recordSchemas/` from the shared tree.

**Primary consumers:** Records pages under a church-scoped route (`/records`).

### Contents

**Files:** 90  •  **LOC:** 24,576

| Path | Kind | Files |
|------|------|-------|
| `components/` | dir | 4 |
| `features/` | dir | 86 |
| `shared/` | dir | 1 |

### External (npm) dependencies

- **React core**: `react` _(72)_
- **React Router**: `react-router-dom` _(12)_
- **MUI**: `@mui/material` _(13)_, `@mui/x-date-pickers` _(6)_, `@mui/icons-material` _(3)_
- **Tables**: `ag-grid-community` _(2)_, `ag-grid-react` _(1)_
- **State / Data**: `@tanstack/react-query` _(2)_
- **UI utilities**: `@tabler/icons-react` _(4)_, `framer-motion` _(3)_
- **Other**: `jszip` _(1)_

The `(n)` count is the number of import statements referencing that package. Install these as peer dependencies in the consumer app. Match the OM repo's versions in `front-end/package.json` to avoid MUI major-version drift.

### Path-alias imports (expected in consumer app)

These are references to paths outside this bundle. The consumer must either (a) install **om-foundation** (which ships most of the `@/hooks`, `@/context`, `@/utils`, `@/api`, `@/shared/*`, `@/types`, `@/theme` targets), or (b) provide equivalent implementations at the same alias paths.

| Import path | References |
|-------------|------------|
| `@/api/utils/axiosInstance` | 15 |
| `@/context/LanguageContext` | 7 |
| `@/shared/lib/churchService` | 7 |
| `@/utils/formatDate` | 4 |
| `@/shared/ui/icons` | 4 |
| `@/ui/icons` | 3 |
| `@/shared/lib/axiosInstance` | 3 |
| `@/sandbox/field-mapper/api/client` | 3 |
| `@/features/records-centralized/common/recordsHighlighting` | 3 |
| `@/hooks/useChurchRecordsLanding` | 2 |
| `@/context/AuthContext` | 2 |
| `@/components/AdvancedGridDialog` | 2 |
| `@/events/recordsEvents` | 2 |
| `@/features/records-centralized/components/records/RecordsApiService` | 2 |
| `@/assets/images/frontend-pages/contact/shape1.png` | 1 |
| `@/layouts/full/shared/breadcrumb/Breadcrumb` | 1 |
| `@/shared/ui/PageContainer` | 1 |
| `@/context/ChurchContext` | 1 |
| `@/shared/lib/dynamicRecordsApi` | 1 |
| `@/agGridModules` | 1 |
| `@/shared/ui/AGGridErrorBoundary` | 1 |
| `@/features/records-centralized/common/ModernRecordViewerModal` | 1 |
| `@/features/records-centralized/common/usePersistedRowSelection` | 1 |
| `@/hooks/useRecordsPersistence` | 1 |
| `@/types/church-records-advanced.types` | 1 |

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
rsync -a ../packages/om-components/om-records/src/ ./src/
```

**Step 4 — install the npm peer dependencies** listed under *External (npm) dependencies* above. Example:

```bash
npm i @mui/icons-material @mui/material @mui/x-date-pickers @tabler/icons-react @tanstack/react-query ag-grid-community ag-grid-react framer-motion jszip react …
```

**Step 5 — wire up routes / providers.** See the per-feature entry points under this bundle's `src/features/*/` and the route definitions in `src/Router.tsx` in the OM repo for examples. Each top-level feature exports a lazy-loadable page component; register it under your router.

## Notes & caveats

- Heavy AG-Grid usage — consumer must install `ag-grid-community` + `ag-grid-react` at matching versions.
- Row selection persistence, auto-refresh on mutation, and 24-hour new-row highlighting are implemented via custom hooks in `hooks/` (provided by om-foundation).
- `RecordsControlsCard.tsx` was deleted from main as a duplicate of `RecordsControlsBar.tsx`.

## Provenance

Copied from `front-end/src/` at the `main` tip on 2026-04-22 (commit `465663d7`), as part of OMD-1307. Sources remain in the OM monorepo — this tree is a redistributable snapshot, not the live source of truth.
