# OM-UI-SYS-001 — `@om/` Namespace Audit

**Audit date**: 2026-04-21
**Branch**: `feature/om-ui-system/2026-04-21/component-inventory-audit`
**Scope**: `front-end/src/@om/`
**Verdict**: Viable base for the new UI system, with caveats.

---

## 1. Full inventory

~3,164 lines of production-quality code across 16 files, organized under one top-level entry point.

### `front-end/src/@om/components/ui/`

| File | LOC | Purpose |
|------|-----|---------|
| `forms/TextFormInput.tsx` | 69 | `react-hook-form` + MUI `TextField` controller wrapper |
| `forms/SelectFormInput.tsx` | 101 | `react-hook-form` + MUI `Select` with `SelectOption` type |
| `forms/PasswordFormInput.tsx` | 96 | Password field with visibility toggle |
| `forms/TextAreaFormInput.tsx` | 79 | Multiline textarea with auto-resize |
| `forms/DropzoneFormInput.tsx` | 313 | File upload dropzone with preview / `UploadedFile` type |
| `forms/index.ts` | — | Barrel: re-exports all form inputs |
| `theme/ThemeCustomizer.tsx` | 217 | Drawer for light/dark, primary color, sidebar theme, sidebar size |
| `theme/index.ts` | — | Barrel: re-exports `ThemeCustomizer` + `ThemeSettings` type |
| `ui/index.ts` | — | Aggregates `forms` + `theme` |

### `front-end/src/@om/components/features/`

| File | LOC | Purpose |
|------|-----|---------|
| `auth/UserFormModal.tsx` | 651 | Multi-mode user CRUD modal — create / edit / reset password / delete |
| `auth/index.ts` | — | Barrel |
| `liturgical-calendar-modern.tsx` | 459 | React Big Calendar variant |
| `liturgical-calendar-raydar.tsx` | 590 | FullCalendar variant |
| `liturgical-calendar-monthly.tsx` | 515 | Custom grid calendar variant |
| `features/index.ts` | — | Barrel: auth + three calendars |

### `front-end/src/@om/components/index.ts`

Top-level namespace entry:

```ts
export * from './ui';       // forms + theme
export * from './features'; // auth + calendars
```

Contains commented placeholders for future categories (`Layout`, `Charts`, `Data`, `Legacy`) — not implemented.

---

## 2. Public surface (exports)

All exports are wired and typed. No stubs.

- **ui/forms** — `TextFormInput`, `SelectFormInput`, `PasswordFormInput`, `TextAreaFormInput`, `DropzoneFormInput` + prop types + `SelectOption`, `UploadedFile`.
- **ui/theme** — `ThemeCustomizer`, `ThemeSettings`.
- **features/auth** — `UserFormModal` + types (`User`, `Church`, `RoleOption`).
- **features/** — `ModernizeLiturgicalCalendar`, `RaydarLiturgicalCalendar`, monthly variant.

---

## 3. Layer split: is `ui/` vs `features/` being honored?

**Yes.**

- `ui/` is presentation-only: form inputs that wrap MUI + `react-hook-form`, and a theme drawer. No domain logic, no church/liturgical coupling.
- `features/` carries domain: user-management logic (role hierarchy `super_admin > admin > priest > deacon > editor`), church selection, and calendar service integration.

The boundary matches what OM-UI-SYS-002 should formalize. The three calendar variants under `features/` are a problem for the duplication story, not for the layer boundary.

---

## 4. Usage inside the app

**Zero imports** from any file outside `front-end/src/@om/` reference any path under `@om/`. This namespace is isolated — it has no consumers today.

This matters because:
- There's no migration cost to rename, relocate, or restructure `@om/`.
- The production-quality form components in `@om/ui/forms/` are sitting unused while the rest of the app rolls its own form plumbing (see `components/forms/theme-elements/` — `CustomTextField` has 29 consumers, `CustomFormLabel` has 9).
- Whatever is extracted in OM-UI-SYS-003 must make adoption the default, otherwise the new layer becomes a second unused namespace.

---

## 5. Library coupling

| Concern | Status |
|---------|--------|
| `@mui/material` | Used directly throughout — expected |
| `react-hook-form` | Hard dependency for all form inputs |
| Modernize layout paths (`src/layouts/full/...`) | **None** |
| React Router (`useNavigate`, `useParams`) | **None** |
| `axiosInstance` / `apiClient` / `fetch` | **None** — handlers passed via props |
| `orthodoxCalendarService` | Imported by all three calendar variants (service injection, acceptable) |

This is the cleanest-coupled code in the frontend. Forms are entirely presentational; feature components receive data/handlers via props.

---

## 6. Theme and dark-mode support

- **Form inputs** use MUI `sx`/theme tokens (`primary.light`, `error.main`, `grey.100`, etc.) — theme-aware, dark-mode-safe.
- **`ThemeCustomizer`** stores `{ mode, primaryColor, sidebarTheme, sidebarSize }` and emits via `onChange` — parent owns `ThemeProvider`.
- **Calendar variants** hard-code GOARCH brand colors (purple/gold/white). They do **not** adapt to dark mode. This is a gap: any of them promoted into a shared layer needs tokenization first, or they stay local.

---

## 7. Overall verdict

**Promote and extend.** `@om/` is not a dead branch, not an empty shell — it's a half-finished, unused but production-quality base.

### Caveats before it becomes the landing zone for OM-UI-SYS-002 and beyond

1. **Path alias is not configured.** `@om/*` is not in `tsconfig.json` paths nor `vite.config.ts` resolve. OM-UI-SYS-002 must add it before extraction starts.
2. **Three calendar variants are a mess.** Decide during OM-UI-SYS-004 which one survives; the other two are a cleanup cost, not an extraction candidate.
3. **Calendars hard-code brand colors.** Any surviving calendar needs to accept theme tokens before it can live in the shared layer.
4. **Adoption gap.** The existing `@om/ui/forms/*` components duplicate `components/forms/theme-elements/CustomTextField` etc. OM-UI-SYS-003 must decide which wins: `@om/ui/forms` (newer, typed for `react-hook-form`) or `CustomTextField` (29 real consumers). Do not let both survive.
5. **No layout/navigation/data-display/feedback coverage.** These all live outside `@om/` today and are what the extraction waves will pull in.

### What to carry forward into OM-UI-SYS-002

- **Keep** the `@om/components/{ui,features}/` two-layer split as the canonical structure.
- **Formalize** its index barrels and naming.
- **Fix** the alias and confirm Vite resolves it in both dev and build.
- **Declare** `@om/ui/forms` the winner in principle, but do not migrate consumers until OM-UI-SYS-003.
