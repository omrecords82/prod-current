# OM OMAI

> OMAI floating panel, chat assistant, OmLearn, and AI learning UI.

## Overview

The OMAI floating chat overlay (`GlobalOMAI`), the `OmAssistant` chat UI, the OmLearn knowledge-capture feature, and the `ai/learning/` pipeline hooks.

**Primary consumers:** Any site that runs the OMAI service (port 7060 by default).

### Contents

**Files:** 14  •  **LOC:** 3,429

| Path | Kind | Files |
|------|------|-------|
| `ai/` | dir | 1 |
| `components/` | dir | 12 |
| `features/` | dir | 1 |

### External (npm) dependencies

- **React core**: `react` _(9)_
- **React Router**: `react-router-dom` _(2)_
- **MUI**: `@mui/icons-material` _(3)_, `@mui/material` _(3)_

The `(n)` count is the number of import statements referencing that package. Install these as peer dependencies in the consumer app. Match the OM repo's versions in `front-end/package.json` to avoid MUI major-version drift.

### Path-alias imports (expected in consumer app)

These are references to paths outside this bundle. The consumer must either (a) install **om-foundation** (which ships most of the `@/hooks`, `@/context`, `@/utils`, `@/api`, `@/shared/*`, `@/types`, `@/theme` targets), or (b) provide equivalent implementations at the same alias paths.

| Import path | References |
|-------------|------------|
| `@/api/utils/axiosInstance` | 4 |
| `@/hooks/useDraggableFab` | 1 |

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
rsync -a ../packages/om-components/om-omai/src/ ./src/
```

**Step 4 — install the npm peer dependencies** listed under *External (npm) dependencies* above. Example:

```bash
npm i @mui/icons-material @mui/material react react-router-dom
```

**Step 5 — wire up routes / providers.** See the per-feature entry points under this bundle's `src/features/*/` and the route definitions in `src/Router.tsx` in the OM repo for examples. Each top-level feature exports a lazy-loadable page component; register it under your router.

## Notes & caveats

- Requires the OMAI backend to be reachable — by default the client assumes a relative `/omai/*` proxy or the environment variable-driven base URL.
- The `GlobalOMAI.tsx` top-level file (966 LOC) and the `GlobalOMAI/` subfolder are both included; pick whichever entry point your app uses.
- OMAI Daily (the admin workbench) is in `om-admin`, not here — this bundle is only the user-facing assistant.

## Provenance

Copied from `front-end/src/` at the `main` tip on 2026-04-22 (commit `465663d7`), as part of OMD-1307. Sources remain in the OM monorepo — this tree is a redistributable snapshot, not the live source of truth.
