# OM Foundation

> Shared primitives, theme, forms, layouts, hooks, context, utils, API client, and types used by every other bundle.

## Overview

This is the base layer. Every other om-components bundle depends on it. It contains the shared React primitives, the OM theme + customizer, the MUI v7 `Grid2` compat shim, the form primitives (`CustomTextField` family + the unused `@om/ui/forms` react-hook-form layer), `ErrorBoundary`, `Scrollbar`, plus the full cross-cutting infrastructure the other bundles import under `@/` aliases — `hooks/`, `context/`, `utils/`, `api/`, `types/`, `config/`, `lib/`, `theme/`, `store/`, `events/`, `layouts/`, `shared/`.

**Primary consumers:** Every other bundle.

### Contents

**Files:** 234  •  **LOC:** 36,978

| Path | Kind | Files |
|------|------|-------|
| `@om/` | dir | 9 |
| `api/` | dir | 9 |
| `components/` | dir | 52 |
| `config/` | dir | 9 |
| `context/` | dir | 20 |
| `events/` | dir | 1 |
| `features/` | dir | 3 |
| `hooks/` | dir | 17 |
| `layouts/` | dir | 38 |
| `lib/` | dir | 1 |
| `shared/` | dir | 42 |
| `store/` | dir | 2 |
| `theme/` | dir | 10 |
| `types/` | dir | 16 |
| `ui/` | dir | 2 |
| `utils/` | dir | 17 |

### External (npm) dependencies

- **React core**: `react` _(130)_, `react-dom` _(1)_
- **React Router**: `react-router-dom` _(32)_
- **MUI**: `@mui/material` _(99)_, `@mui/icons-material` _(12)_
- **Emotion (MUI styling)**: `@emotion/react` _(1)_
- **Forms**: `react-hook-form` _(4)_
- **Calendar**: `date-fns` _(2)_, `dayjs` _(2)_
- **State / Data**: `axios` _(7)_, `@tanstack/react-query` _(1)_, `simplebar-react` _(1)_, `socket.io-client` _(1)_
- **UI utilities**: `@tabler/icons-react` _(27)_, `lucide-react` _(5)_, `framer-motion` _(1)_, `react-dropzone` _(1)_
- **Rich text / editors**: `@tiptap/react` _(1)_
- **Other**: `swr` _(5)_, `react-i18next` _(4)_, `lodash` _(3)_, `@emotion/cache` _(1)_, `@tiptap/starter-kit` _(1)_, `i18next` _(1)_, `notistack` _(1)_, `react-helmet` _(1)_, `react-slick` _(1)_, `stylis-plugin-rtl` _(1)_, `xterm` _(1)_, `xterm-addon-fit` _(1)_, `xterm-addon-search` _(1)_, `xterm-addon-web-links` _(1)_

The `(n)` count is the number of import statements referencing that package. Install these as peer dependencies in the consumer app. Match the OM repo's versions in `front-end/package.json` to avoid MUI major-version drift.

### Path-alias imports (expected in consumer app)

This bundle *provides* most of these targets in its own `src/` tree. Merge this bundle's `src/` into the consumer's `src/` so that the `@/*`, `@shared/*`, and `@om/*` aliases resolve here.

| Import path | References |
|-------------|------------|
| `@/api/utils/axiosInstance` | 32 |
| `@/context/CustomizerContext` | 23 |
| `@/context/AuthContext` | 15 |
| `@/context/LanguageContext` | 7 |
| `@/context/config` | 6 |
| `@/api/globalFetcher` | 5 |
| `@/hooks/useAuth` | 4 |
| `@/shared/lib/apiClient` | 3 |
| `@/assets/images/profile/user-1.jpg` | 3 |
| `@/assets/images/profile/user-2.jpg` | 3 |
| `@/config/publicRoutes` | 3 |
| `@/api/uiPreferences` | 2 |
| `@/shared/lib/invoicePDFGenerator` | 2 |
| `@/assets/en_samples.json` | 2 |
| `@/assets/gr_samples.json` | 2 |
| `@/assets/ru_samples.json` | 2 |
| `@/assets/en_marriage_75.json` | 2 |
| `@/context/EditModeContext` | 2 |
| `@/hooks/useDraggableFab` | 2 |
| `@/layouts/full/vertical/header/Profile` | 2 |
| `@/assets/images/profile/user-3.jpg` | 2 |
| `@/assets/images/profile/user-4.jpg` | 2 |
| `@/components/compat/Grid2` | 2 |
| `@/components/OmAssistant` | 2 |
| `@/components/custom-scroll/Scrollbar` | 2 |

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

**Step 2 — copy this bundle into the consumer's `src/`.**

```bash
rsync -a ../packages/om-components/om-foundation/src/ ./src/
```

**Step 3 — install the npm peer dependencies** listed under *External (npm) dependencies* above. Example:

```bash
npm i @emotion/cache @emotion/react @mui/icons-material @mui/material @tabler/icons-react @tanstack/react-query @tiptap/react @tiptap/starter-kit axios date-fns …
```

**Step 5 — wire up routes / providers.** See the per-feature entry points under this bundle's `src/features/*/` and the route definitions in `src/Router.tsx` in the OM repo for examples. Each top-level feature exports a lazy-loadable page component; register it under your router.

## Notes & caveats

- This bundle is intentionally large (~37K LOC) because it includes all cross-cutting infrastructure that the other bundles reference via `@/*` path aliases. A consumer app must provide these paths at its own `@/*` alias root — typically by merging this bundle's `src/` into its own `src/` tree.
- `@om/ui/forms` (react-hook-form-based) and `components/forms/theme-elements/` (MUI-passthrough) duplicate each other. Pick one in the consumer — do not ship both.
- `layouts/` contains Modernize shell layouts; you can delete the subfolders you don't use.

## Provenance

Copied from `front-end/src/` at the `main` tip on 2026-04-22 (commit `465663d7`), as part of OMD-1307. Sources remain in the OM monorepo — this tree is a redistributable snapshot, not the live source of truth.
