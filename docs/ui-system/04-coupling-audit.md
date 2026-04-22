# OM-UI-SYS-001: Frontend Component Inventory Audit
## Cross-Cutting Concerns and Coupling Analysis

**Audit Date**: 2026-04-21  
**Branch**: `feature/om-ui-system/2026-04-21/component-inventory-audit`  
**Scope**: `/front-end/src/` — MUI 7.2, Tailwind v4, CustomizerContext-driven theming  

---

## 1. Theme System

### 1.1 Theme Provider Architecture

**Provider Stack** (from `main.tsx` → `App.tsx`):
```
ThemeProvider(theme={omTheme})              // main.tsx
  ├─ CustomizerContextProvider
  └─ ThemeProvider(theme={BuildTheme()})    // App.tsx (via ThemeSettings())
```

**Issue**: Dual ThemeProvider nesting. The outer provider in `main.tsx` uses a static `omTheme`, then the inner provider in `App.tsx` rebuilds the theme dynamically from `CustomizerContext`. This works but adds complexity for a new UI system to navigate.

### 1.2 Theme Definition Files

Located in `/src/theme/`:
- `Theme.tsx` — Main hook-based theme builder (`ThemeSettings()` + `BuildTheme()`)
- `omTheme.ts` — Static fallback theme (for before CustomizerContext is available)
- `LightThemeColors.tsx` — Light mode palette options (theme selection)
- `DarkThemeColors.tsx` — Dark mode palette options
- `DefaultColors.tsx` — Base palette (primary, secondary, success, error, warning, info, grey)
- `Typography.tsx` — Font sizes, weights, line heights
- `Shadows.tsx` — Shadow definitions (light & dark)
- `Components.tsx` — MUI component style overrides

### 1.3 Dark Mode Toggle

**Mechanism**: `CustomizerContext` (in `/src/context/CustomizerContext.tsx`)

- State: `activeMode` (string: "light" | "dark")
- Storage: `localStorage` key `orthodoxmetrics-activeMode`
- Auto-detection: Time-based (6 PM–6 AM defaults to dark) if no user preference stored
- DOM side-effect: Sets `document.documentElement.classList.add/remove('dark')` for Tailwind + `data-theme-mode` attribute for MUI
- Setter: `setActiveMode(mode)` — persists to localStorage and triggers theme rebuild via `BuildTheme()`

### 1.4 How Components Consume Theme Tokens

**Observed patterns** (high frequency):

1. **`useTheme()` hook** (MUI standard):
   ```tsx
   const theme = useTheme();
   // Use: theme.palette.primary.main, theme.shape.borderRadius, etc.
   ```
   Heavily used in styled components and inline `sx` props.

2. **`sx={{ ... }}` prop** (MUI styled system):
   ```tsx
   <Box sx={{ bgcolor: 'background.paper', color: 'text.primary' }} />
   ```
   Dominant pattern for responsive and token-based styling.

3. **Tailwind classes** (secondary, frontend pages):
   ```tsx
   <div className="flex gap-4 bg-slate-100 dark:bg-slate-800 text-white" />
   ```
   Used in ~70 components/features under `src/components/frontend-pages/` and some `src/features/` sections.

4. **Styled-components** (via `styled()` from `@mui/material`):
   ```tsx
   const StyledBox = styled(Box)(({ theme }) => ({
     backgroundColor: theme.palette.background.default,
   }));
   ```

5. **CSS modules / `index.css`** (OMAI Logger, custom sections):
   - CSS custom properties (e.g., `--log-error-text`, `--orthodox-purple`)
   - Tailwind `@apply` in `index.css` for OMAI Logger console styling

**Hardcoded Colors**: 
- Grep for `#[0-9a-fA-F]{6}` in `components/` and `features/` found **0 hex color hard-codes** in component source.
- Hex values only appear in:
  - `/src/theme/` definition files (intentional)
  - `/src/index.css` CSS custom properties (OMAI Logger design system)
  - `tailwind.config.js` (Tailwind palette extension)

**Verdict**: Clean token consumption; no hard-coded colors in component logic.

---

## 2. Modernize Coupling

### 2.1 Modernize Location

Modernize (the Ant Design-derived admin template) lives in:
```
/src/layouts/full/
├── FullLayout.tsx
├── vertical/
│   ├── header/ (Header, Profile, Search, Navigation, etc.)
│   └── sidebar/ (Sidebar, NavItem, MenuItems, etc.)
├── shared/
│   ├── breadcrumb/ (Breadcrumb.tsx)
│   ├── customizer/ (Customizer UI for theme switching)
│   ├── loadable/
│   └── logo/
└── horizontal/ (alternate layout option)
```

This is the app shell/chrome — layout, header, sidebar, navigation.

### 2.2 Components Importing from Modernize Paths

**Files importing from `layouts/full`** (79 unique files):

**Worst offenders** (~10 most tightly coupled):

1. `components/frontend-pages/shared/header/HpHeader.tsx` — imports `Profile` from `@/layouts/full/vertical/header/Profile`
2. `features/devel-tools/menu-editor/MenuEditor.tsx` — imports `getMenuItems`, `SuperAdminMenuTemplate`, `SuperAdminMenuMetadata` from `@/layouts/full/vertical/sidebar/MenuItems*`
3. `features/devel-tools/menu-editor/templates/transformMenuTemplate.ts` — imports menu item types from `MenuItems-default-superadmin`
4. `features/berry-calendar/BerryCalendarPage.tsx` — imports `Breadcrumb` from `@/layouts/full/shared/breadcrumb/`
5. `features/berry-cards/BerryCardGalleryPage.tsx` — imports `Breadcrumb`
6. `features/berry-crm/BerryContactManagementPage.tsx` — imports `Breadcrumb`
7. `features/berry-crm/BerryLeadManagementPage.tsx` — imports `Breadcrumb`
8. `features/berry-crm/BerrySalesManagementPage.tsx` — imports `Breadcrumb`
9. `features/account/AccountLayout.tsx` — imports `Breadcrumb`
10. `features/portal/PortalCertificatesPage.tsx` — imports `Breadcrumb`

**Severity**: 
- **High**: Menu items coupling (MenuEditor, SDLCWizardPage, ReleaseHistoryPage, PlatformStatusPage)
- **Medium**: Breadcrumb imports (many feature pages; coupling to app shell structure)
- **Low**: Profile component import (single use in frontend header)

### 2.3 Modernize Theme Coupling

**Modernize does NOT provide the theme**. It consumes the MUI theme:
- `FullLayout.tsx` uses `useTheme()` to get the current MUI theme
- Sidebar, header, navigation all use MUI components (`Box`, `AppBar`, `Drawer`, etc.)
- Customizer lives inside Modernize but controls `CustomizerContext` (decoupled)

**No tight theming coupling from Modernize → Theme system**. Modernize is purely a layout shell.

---

## 3. MUI Usage

### 3.1 Version

**Material-UI v7.2.0** (latest as of audit date)
```json
"@mui/material": "^7.2.0",
"@mui/system": "^7.2.0",
"@mui/x-charts": "^8.9.0",
"@mui/x-data-grid": "^6.18.2",
"@mui/x-date-pickers": "^6.18.2",
```

### 3.2 Top MUI Components by Import Frequency

Ranked by rough usage (from grep of component source + JSX element count):

1. **Typography** — ~9,884 usages (text styling)
2. **Box** — ~8,133 usages (layout container; heavily used)
3. **Button** — ~2,922 usages (actions)
4. **Grid** — ~2,070 usages (2D layouts; legacy; Tailwind flexbox often preferred)
5. **Paper** — ~1,350 usages (card surfaces)
6. **TextField** — ~902 usages (form inputs)
7. **Card** — ~901 usages (content containers)
8. **Dialog** — ~696 usages (modals)
9. **Select** — ~675 usages (form dropdowns)
10. **Modal** — ~23 usages (low; Dialog preferred)

**MUI import count**: 232 unique component imports across the codebase from `@mui/material`.

### 3.3 Import Pattern

All MUI usage is **direct imports**:
```tsx
import { Box, Button, Card, ... } from '@mui/material';
```

No wrapper layer or custom "OM UI" version of MUI components (except form field wrappers in `src/components/forms/theme-elements/` for branding).

---

## 4. Tailwind Integration

### 4.1 Tailwind Actually Used?

**Yes**, but secondary to MUI. ~70 files use Tailwind classes in `components/` and `features/`:
- Frontend pages (`components/frontend-pages/`) — heavy Tailwind use
- Some OMAI Logger / admin features — custom styling
- Utility classes and animations

**Example files with Tailwind**:
- `components/frontend-pages/homepage/HomepageHero.tsx` — `className="flex gap-4 text-white"`
- `components/frontend-pages/tour/DemoStepAnalytics.tsx` — Tailwind spacing, colors
- Various console/log components — `className="bg-slate-800 text-gray-400"`

### 4.2 Tailwind Config

File: `/front-end/tailwind.config.js`

```javascript
{
  darkMode: 'class',  // Enables .dark class-based dark mode
  colors: {
    orthodox: {
      purple: '#6B21A8',
      gold: '#FFD700',
      red: '#DC2626',
      green: '#059669',
      blue: '#2563EB',
      white: '#F9FAFB',
      black: '#1F2937',
    },
    slate: { /* 50–950 spectrum */ }
  },
  fontFamily: {
    'noto-serif-georgian': [...],
    'mono': [...],
  }
}
```

**Tailwind-specific oddities**:
- Custom `orthodox.*` color palette (liturgical theming)
- Custom animations: `colorflow`, `flow`, `slide-in-right`
- Dark mode synced with MUI via `CustomizerContext` setting `.dark` class on `<html>`

### 4.3 MUI ↔ Tailwind Conflict Mitigations

**`/src/index.css`** has explicit overrides to prevent button styling conflicts:

```css
/* Fix MUI button text visibility — Tailwind preflight sets color:inherit which
   breaks MUI buttons. For contained buttons, honor MUI's per-button
   --variant-containedColor ... */
.MuiButton-root {
  color: inherit !important;
}
.MuiButton-root.MuiButton-contained {
  color: var(--variant-containedColor, #fff) !important;
}
```

**Tailwind preflight disabled for MUI classes** to prevent cascade issues.

---

## 5. Global Styles

### 5.1 `/src/index.css` Overview

**Size**: ~539 lines  
**Content**:
1. Tailwind imports (`@import "tailwindcss"`)
2. MUI button color fixes (as noted above)
3. CSS custom properties for OMAI Logger (log-level colors, console theme, status indicators)
4. Orthodox schedule design tokens (`--orthodox-purple`, `--schedule-allowed`, etc.)
5. Typography & spacing scales
6. Dark mode overrides (`.dark` selector)
7. OMAI Logger-specific animations & scrollbar styling
8. Liturgical gradient animation
9. Global scrollbar & console card styles
10. AG Grid theme overrides for LENT_THEME

**Relevant to UI system**: 
- CSS custom properties layer for logging/console features (not core UI system)
- Tailwind dark mode class setup
- AG Grid theming (separate concern)

### 5.2 Other Global Stylesheets

- `/src/assets/themes/` — AG Grid theme CSS (generated build artifacts)
- Imported in `main.tsx`: `react-toastify/dist/ReactToastify.css` (toast notifications)
- No other significant global stylesheets affecting core theming

---

## 6. Routing Coupling in "Shared" Components

### 6.1 React Router Imports in Components/Features

**Total files importing `react-router-dom`**: 128 unique files

**Pattern breakdown**:
- `useNavigate` — component-level navigation
- `useLocation` — route-aware conditional rendering
- `useParams` — dynamic route parameters
- `Link` / `NavLink` — client-side navigation
- `Navigate` — programmatic redirects (auth guards)

**Representative worst offenders**:
1. `components/OmAssistant/OmAssistantMessages.tsx` — `useNavigate()` for link handling
2. `components/ErrorBoundary/AdminErrorBoundary.tsx` — `useNavigate()` for error recovery
3. `components/auth/ProtectedRoute.tsx` — `Navigate` for auth redirects
4. `components/apps/invoice/*` — `useParams`, `useNavigate` for detail/edit flows
5. `features/admin/` suite — heavy routing usage in admin panel features
6. `features/records-centralized/*` — routing-aware record navigation
7. `features/devel-tools/*` — routing for tool navigation

**Severity**: 
- **High**: These components cannot be extracted to a reusable UI system without embedding router logic.
- **Risk**: Future UI system must provide route-agnostic versions or a routing abstraction layer.

---

## 7. API/Data Fetching Coupling

### 7.1 Files Importing from `src/api/` or Using API Clients

**Total files**: 183 unique files

**Import patterns**:
1. `apiClient` from `@/api/utils/axiosInstance` (most common)
2. Custom API hooks (`useQuery`, `useMutation` from `@tanstack/react-query`)
3. API service classes (e.g., `RecordsApiService`, `UnifiedRecordsApiService`)

### 7.2 Worst Offenders (Top ~15)

1. `components/OmAssistant/useOmAssistant.ts` — `apiClient.post()` for OMAI command execution
2. `components/OmAssistant/OmAssistant.tsx` — OMAI API integration
3. `components/SocialPermissionsToggle.tsx` — `apiClient.get/put/post` for admin social perms
4. `components/ErrorBoundary/AdminErrorBoundary.tsx` — `apiClient.post('/logs/admin-errors', ...)`
5. `components/global/GlobalOMAI.tsx` — `apiClient.get/post` for command history & execution
6. `components/global/GlobalOMAI/AssistantTab.tsx` — dynamic API client import
7. `components/ImpersonationBanner.tsx` — API calls for impersonation state
8. `features/account/accountApi.ts` — centralized account API client
9. `features/account/parish-management/useParishSettings.ts` — API hook for parish settings
10. `features/admin/ChurchAdminPanelWorking.tsx` — church admin API calls
11. `features/admin/BigBookDynamicRoute.tsx` — big book data fetching
12. `features/admin/components/ComponentManager.tsx` — component health & test APIs
13. `features/admin/OMAIDiscoveryPanel.tsx` — OMAI discovery API
14. `features/devel-tools/om-ocr/api/pipelineApi.ts` — OCR pipeline API client
15. `features/records-centralized/components/records/RecordsApiService.ts` — records CRUD

**Severity**: 
- **Very High**: API clients are baked into component logic. Components cannot be reused without a backend.
- **Risk**: UI system components that fetch data directly cannot be ported to other apps.

### 7.3 API Client Architecture

File: `/src/api/utils/axiosInstance.ts`
```tsx
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  ...
});
```

Used throughout for:
- Admin operations (users, churches, permissions)
- OMAI command execution
- OCR pipeline management
- Records CRUD (baptism, marriage, funeral)
- Account & parish management
- Liturgical calendar sync

---

## Summary Table: Coupling Risk Matrix

| Coupling Type | Files Affected | Severity | UI System Impact |
|---|---|---|---|
| API Client (`apiClient`) | 183 | Very High | Components cannot be reused without backend |
| React Router | 128 | High | Components need route abstraction layer |
| Modernize Imports (`layouts/full`) | 79 | Medium | Some page components tightly bound to app shell |
| Tailwind Classes | 70 | Low | Coexists cleanly with MUI; CSS-in-JS migration needed |
| Hard-coded Colors | 0 | None | No issues detected |

---

## 5 Highest-Priority Coupling Hazards

### 1. **API Client Embedding (183 files, Very High Risk)**
   - **Problem**: Components directly call `apiClient` for data. Cannot be extracted or reused.
   - **Example**: `OmAssistant` component bakes OMAI API calls into component state.
   - **Mitigation for UI System**: Require all components to accept data via props or React Query contexts; ban direct API imports in component code.

### 2. **Router Coupling in Components (128 files, High Risk)**
   - **Problem**: Components use `useNavigate`, `useParams`, `useLocation` for navigation logic.
   - **Example**: `ModernInvoiceEdit.tsx` uses `useParams` and `useNavigate` for invoice ID and save redirects.
   - **Mitigation for UI System**: Create route-agnostic component variants or pass navigation callbacks as props.

### 3. **Modernize Breadcrumb/Menu Imports (79 files, Medium Risk)**
   - **Problem**: Many feature pages import `Breadcrumb` from `layouts/full`, tightly binding to app shell structure.
   - **Example**: All `Berry*Page.tsx` features import the same Breadcrumb component.
   - **Mitigation for UI System**: Extract Breadcrumb to standalone, route-agnostic component; remove `layouts/full` dependency.

### 4. **Dual Theme Provider Nesting (Architecture Risk)**
   - **Problem**: `main.tsx` wraps with static `omTheme`, `App.tsx` rebuilds theme via `BuildTheme()` using CustomizerContext. Adds complexity.
   - **Impact**: New UI system must understand this pattern to override or extend theming.
   - **Mitigation for UI System**: Consolidate to single theme provider; make CustomizerContext the single source of truth.

### 5. **MUI ↔ Tailwind Color Coordination (Design System Risk)**
   - **Problem**: Two independent color systems (MUI palette vs. Tailwind config) + CSS custom properties for logging. No single source of truth.
   - **Example**: Primary blue is `#5D87FF` in MUI, but Tailwind has independent `orthodox` color palette.
   - **Mitigation for UI System**: Unify color tokens; either replace Tailwind with MUI System, or use Tailwind as single source and sync MUI theme from it.

---

## Final Verdict

### **Can the UI system be built cleanly on top of the current theme?**

**NO — not without refactoring first.** The current theme system is **MUI-solid** (v7.2, well-structured token consumption) but suffers from three critical issues:

1. **API/Router coupling is pervasive** — 183 files have API clients, 128 have router logic. Components are not reusable.
2. **Dual theming (MUI + Tailwind + CSS custom properties)** — No unified token system; future UI system must coordinate three systems.
3. **Modernize shell is tightly integrated** — Breadcrumb, menu, profile imports scattered across 79 files; extracting components requires shell abstraction.

### **Recommended approach for future UI system**:

1. **Refactor data fetching**: Implement React Query wrapper layer; ban direct `apiClient` imports in components.
2. **Extract routing**: Create route-agnostic component variants; remove `useNavigate`, `useParams` from presentational components.
3. **Unify theming**: Pick ONE color system (recommend MUI System + CSS-in-JS) and migrate Tailwind classes to MUI `sx` props.
4. **Decouple Modernize**: Extract Breadcrumb, menu items, profile as standalone components; remove `layouts/full` imports from feature files.
5. **Consolidate theme providers**: Single ThemeProvider with CustomizerContext feeding it; remove dual-nesting pattern.

**Effort estimate**: 2–3 weeks of refactoring to achieve a "clean" reusable UI system. Current codebase is **extractable but not portable** without these changes.

