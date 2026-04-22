# OM Churches

> Multi-tenant church setup, wizard, and live table builder.

## Overview

Church-admin UI for provisioning new tenant churches — the setup wizard, the live schema/table builder (~591 LOC), church profile editor, and the shared `TableControlPanel`.

**Primary consumers:** Platform-admin users provisioning new church tenants.

### Contents

**Files:** 10  •  **LOC:** 4,705

| Path | Kind | Files |
|------|------|-------|
| `components/` | dir | 1 |
| `features/` | dir | 9 |

### External (npm) dependencies

- **React core**: `react` _(10)_
- **React Router**: `react-router-dom` _(3)_
- **MUI**: `@mui/icons-material` _(1)_, `@mui/material` _(1)_
- **Forms**: `formik` _(2)_, `yup` _(2)_
- **UI utilities**: `@tabler/icons-react` _(3)_

The `(n)` count is the number of import statements referencing that package. Install these as peer dependencies in the consumer app. Match the OM repo's versions in `front-end/package.json` to avoid MUI major-version drift.

### Path-alias imports (expected in consumer app)

These are references to paths outside this bundle. The consumer must either (a) install **om-foundation** (which ships most of the `@/hooks`, `@/context`, `@/utils`, `@/api`, `@/shared/*`, `@/types`, `@/theme` targets), or (b) provide equivalent implementations at the same alias paths.

| Import path | References |
|-------------|------------|
| `@/shared/ui/BlankCard` | 5 |
| `@/context/AuthContext` | 3 |
| `@/shared/lib/fetchWithChurchContext` | 2 |
| `@/shared/ui/PageContainer` | 2 |
| `@/layouts/full/shared/breadcrumb/Breadcrumb` | 2 |
| `@/api/admin.api` | 2 |
| `@/utils/logger` | 2 |
| `@/types/orthodox-metrics.types` | 2 |
| `@/api/utils/axiosInstance` | 2 |
| `@/shared/ui/OrthodoxChurchIcon` | 1 |

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
rsync -a ../packages/om-components/om-churches/src/ ./src/
```

**Step 4 — install the npm peer dependencies** listed under *External (npm) dependencies* above. Example:

```bash
npm i @mui/icons-material @mui/material @tabler/icons-react formik react react-router-dom yup
```

**Step 5 — wire up routes / providers.** See the per-feature entry points under this bundle's `src/features/*/` and the route definitions in `src/Router.tsx` in the OM repo for examples. Each top-level feature exports a lazy-loadable page component; register it under your router.

## Notes & caveats

- The backend side uses per-tenant DB pools (`getTenantPool(churchId)`); this bundle is the UI counterpart. Ensure the backend route `/api/churches/*` is mounted.
- `LiveTableBuilder.tsx` is intentionally kept page-local — it is deeply coupled to the wizard flow and should not be extracted further.

## Provenance

Copied from `front-end/src/` at the `main` tip on 2026-04-22 (commit `465663d7`), as part of OMD-1307. Sources remain in the OM monorepo — this tree is a redistributable snapshot, not the live source of truth.
