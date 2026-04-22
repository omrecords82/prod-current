# OM OCR

> OCR workbench, field mapping, fusion overlay, and review UI for digitizing sacramental ledgers.

## Overview

Complete OCR review UI: the workbench page, the image/table fusion overlay, column-band mapping, per-record review flow, and the developer-tools wrapper. Talks to `/api/church/:churchId/ocr/*` endpoints via the shared `axiosInstance`.

**Primary consumers:** Standalone — mount under an admin or devel-tools route.

### Contents

**Files:** 10  •  **LOC:** 1,805

| Path | Kind | Files |
|------|------|-------|
| `features/` | dir | 10 |

### External (npm) dependencies

- **React core**: `react` _(9)_
- **React Router**: `react-router-dom` _(2)_
- **MUI**: `@mui/material` _(6)_
- **UI utilities**: `@tabler/icons-react` _(1)_

The `(n)` count is the number of import statements referencing that package. Install these as peer dependencies in the consumer app. Match the OM repo's versions in `front-end/package.json` to avoid MUI major-version drift.

### Path-alias imports (expected in consumer app)

These are references to paths outside this bundle. The consumer must either (a) install **om-foundation** (which ships most of the `@/hooks`, `@/context`, `@/utils`, `@/api`, `@/shared/*`, `@/types`, `@/theme` targets), or (b) provide equivalent implementations at the same alias paths.

| Import path | References |
|-------------|------------|
| `@/shared/lib/axiosInstance` | 3 |
| `@/context/AuthContext` | 2 |
| `@/features/devel-tools/om-ocr/components/workbench/OcrWorkbench` | 1 |
| `@/features/devel-tools/om-ocr/context/WorkbenchContext` | 1 |
| `@/ui/icons` | 1 |

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
rsync -a ../packages/om-components/om-ocr/src/ ./src/
```

**Step 4 — install the npm peer dependencies** listed under *External (npm) dependencies* above. Example:

```bash
npm i @mui/material @tabler/icons-react react react-router-dom
```

**Step 5 — wire up routes / providers.** See the per-feature entry points under this bundle's `src/features/*/` and the route definitions in `src/Router.tsx` in the OM repo for examples. Each top-level feature exports a lazy-loadable page component; register it under your router.

## Notes & caveats

- Expects OCR backend routes mounted under `/api/church/:churchId/ocr/*`.
- Vision results are stored on disk (`server/storage/feeder/job_*/page_0/vision_result.json`), not in a DB column — if you re-implement the backend, preserve that layout.
- Legacy `/api/ocr/*` routes are disabled by default.

## Provenance

Copied from `front-end/src/` at the `main` tip on 2026-04-22 (commit `465663d7`), as part of OMD-1307. Sources remain in the OM monorepo — this tree is a redistributable snapshot, not the live source of truth.
