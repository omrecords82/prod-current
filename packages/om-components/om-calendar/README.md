# OM Calendar

> Orthodox liturgical calendar with three implementation variants.

## Overview

Three separate liturgical-calendar implementations under `@om/`: `modern`, `raydar`, and `monthly`. Each uses a different calendar library. The `features/liturgical-calendar/` subdir contains the page wrapper that wires one in. `components/calendar/` has the shared day/event renderers.

**Primary consumers:** Public-facing calendar page and/or admin dashboard.

### Contents

**Files:** 12  •  **LOC:** 3,539

| Path | Kind | Files |
|------|------|-------|
| `@om/` | dir | 3 |
| `components/` | dir | 2 |
| `features/` | dir | 8 |

### External (npm) dependencies

- **React core**: `react` _(10)_
- **MUI**: `@mui/material` _(1)_
- **Calendar**: `@fullcalendar/react` _(3)_, `@fullcalendar/daygrid` _(2)_, `@fullcalendar/interaction` _(2)_, `@fullcalendar/timegrid` _(2)_, `date-fns` _(2)_, `@fullcalendar/core` _(1)_, `dayjs` _(1)_, `moment` _(1)_
- **UI utilities**: `framer-motion` _(2)_
- **Other**: `@fullcalendar/list` _(2)_, `react-big-calendar` _(1)_

The `(n)` count is the number of import statements referencing that package. Install these as peer dependencies in the consumer app. Match the OM repo's versions in `front-end/package.json` to avoid MUI major-version drift.

### Path-alias imports (expected in consumer app)

These are references to paths outside this bundle. The consumer must either (a) install **om-foundation** (which ships most of the `@/hooks`, `@/context`, `@/utils`, `@/api`, `@/shared/*`, `@/types`, `@/theme` targets), or (b) provide equivalent implementations at the same alias paths.

| Import path | References |
|-------------|------------|
| `@/shared/lib/orthodoxCalendarService` | 3 |
| `@/shared/lib/useCalendarData` | 2 |
| `@/context/ChurchContext` | 2 |
| `@/shared/ui/PageContainer` | 1 |
| `@/context/AuthContext` | 1 |
| `@/context/CustomizerContext` | 1 |
| `@/api/utils/axiosInstance` | 1 |

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
rsync -a ../packages/om-components/om-calendar/src/ ./src/
```

**Step 4 — install the npm peer dependencies** listed under *External (npm) dependencies* above. Example:

```bash
npm i @fullcalendar/core @fullcalendar/daygrid @fullcalendar/interaction @fullcalendar/list @fullcalendar/react @fullcalendar/timegrid @mui/material date-fns dayjs framer-motion …
```

**Step 5 — wire up routes / providers.** See the per-feature entry points under this bundle's `src/features/*/` and the route definitions in `src/Router.tsx` in the OM repo for examples. Each top-level feature exports a lazy-loadable page component; register it under your router.

## Notes & caveats

- **Pick ONE variant before shipping to production.** The three are not configurable alternatives — they are three separate implementations. Delete the two you do not use.
- The `raydar` variant uses `@fullcalendar/*`; the others use different libs. Check the per-variant peer deps in its source.

## Provenance

Copied from `front-end/src/` at the `main` tip on 2026-04-22 (commit `465663d7`), as part of OMD-1307. Sources remain in the OM monorepo — this tree is a redistributable snapshot, not the live source of truth.
