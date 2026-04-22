# OM Auth

> Login, register, forgot-password, account hub, user profile, portal landing, and user-admin form modal.

## Overview

All auth-flow pages (`features/auth/*` — 24 files), the account hub (`features/account/*` — 24 files), the authenticated portal landing (`features/portal/*` — 7 files), the `@om/features/auth/UserFormModal` (react-hook-form), the legacy `UserFormModal.tsx` (702 LOC — retire in favor of the `@om/` version), and the `auth/` utility folder (token storage, session bridge).

**Primary consumers:** Every OM site.

### Contents

**Files:** 59  •  **LOC:** 17,121

| Path | Kind | Files |
|------|------|-------|
| `@om/` | dir | 2 |
| `auth/` | dir | 1 |
| `components/` | dir | 1 |
| `features/` | dir | 55 |

### External (npm) dependencies

- **React core**: `react` _(53)_
- **React Router**: `react-router-dom` _(25)_
- **MUI**: `@mui/icons-material` _(110)_, `@mui/material` _(24)_
- **UI utilities**: `@tabler/icons-react` _(6)_

The `(n)` count is the number of import statements referencing that package. Install these as peer dependencies in the consumer app. Match the OM repo's versions in `front-end/package.json` to avoid MUI major-version drift.

### Path-alias imports (expected in consumer app)

These are references to paths outside this bundle. The consumer must either (a) install **om-foundation** (which ships most of the `@/hooks`, `@/context`, `@/utils`, `@/api`, `@/shared/*`, `@/types`, `@/theme` targets), or (b) provide equivalent implementations at the same alias paths.

| Import path | References |
|-------------|------------|
| `@/context/LanguageContext` | 28 |
| `@/context/AuthContext` | 13 |
| `@/api/utils/axiosInstance` | 13 |
| `@/shared/ui/PageContainer` | 10 |
| `@/context/ChurchContext` | 6 |
| `@/layouts/full/shared/logo/Logo` | 6 |
| `@/components/forms/theme-elements/CustomTextField` | 6 |
| `@/components/forms/theme-elements/CustomFormLabel` | 6 |
| `@/ui/icons` | 4 |
| `@/layouts/full/shared/breadcrumb/Breadcrumb` | 2 |
| `@/api/metrics.api` | 2 |
| `@/utils/roleAvatars` | 2 |
| `@/features/auth/authentication/authForms/AuthRegister` | 2 |
| `@/features/auth/authentication/authForms/AuthTwoSteps` | 2 |
| `@/features/auth/authentication/authForms/AuthForgotPassword` | 2 |
| `@/components/frontend-pages/shared/header/HpHeader` | 2 |
| `@/components/frontend-pages/shared/footer/SiteFooter` | 2 |
| `@/types/auth/auth` | 2 |
| `@/assets/images/backgrounds/login-bg.svg` | 2 |
| `@/shared/lib/userService` | 1 |
| `@/shared/components/SacramentalRestrictionsViewer` | 1 |
| `@/api/admin.api` | 1 |
| `@/shared/ui/DashboardCard` | 1 |
| `@/assets/images/backgrounds/errorimg.svg` | 1 |
| `@/features/auth/authentication/authForms/AuthLogin` | 1 |

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
rsync -a ../packages/om-components/om-auth/src/ ./src/
```

**Step 4 — install the npm peer dependencies** listed under *External (npm) dependencies* above. Example:

```bash
npm i @mui/icons-material @mui/material @tabler/icons-react react react-router-dom
```

**Step 5 — wire up routes / providers.** See the per-feature entry points under this bundle's `src/features/*/` and the route definitions in `src/Router.tsx` in the OM repo for examples. Each top-level feature exports a lazy-loadable page component; register it under your router.

## Notes & caveats

- Session cookie contract: backend must mount `cookieParser(secret)` with the same secret used for sessions. Missing the secret causes session churn (prod outage 2026-02-02).
- Both `UserFormModal.tsx` (legacy, 702 LOC) and `@om/auth/UserFormModal.tsx` (modern, react-hook-form) are bundled. Pick one. The `@om/` version is the go-forward.
- `features/portal/` is the post-login landing page; it assumes the user is authenticated — wrap its route in your `ProtectedRoute` equivalent.

## Provenance

Copied from `front-end/src/` at the `main` tip on 2026-04-22 (commit `465663d7`), as part of OMD-1307. Sources remain in the OM monorepo — this tree is a redistributable snapshot, not the live source of truth.
