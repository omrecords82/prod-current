# Orthodox Metrics Design System Audit

**Date:** 2026-06-11  
**Scope:** `front-end/` public marketing, authentication, and shared chrome  
**Token source:** `src/styles/design-tokens.css` · `src/design-system/tokens.ts`

---

## Summary

Phase 1 establishes a centralized token layer, reusable primitives (Button, Card, Input, Section, Modal), and migrates high-traffic surfaces (login, header, footer, cards, typography, buttons) to the unified Orthodox Metrics identity:

- **Headings:** Cormorant Garamond (500/600/700)
- **Body:** Inter (400/500/600)
- **Primary action:** Gold `#D4AF37` with dark text
- **Themes:** Matched light/dark token pairs (no unrelated gray GitHub-style dark palette)

---

## Components Created

| Component | Path |
|-----------|------|
| Design tokens (CSS) | `src/styles/design-tokens.css` |
| Design tokens (TS) | `src/design-system/tokens.ts` |
| Button | `src/design-system/Button.tsx` |
| Card | `src/design-system/Card.tsx` |
| Input | `src/design-system/Input.tsx` |
| Section | `src/design-system/Section.tsx` |
| Modal | `src/design-system/Modal.tsx` |
| Login feature carousel | `src/design-system/LoginFeatureCarousel.tsx` |

---

## Components Updated

| Area | Changes |
|------|---------|
| `om-design-system.css` | Now imports `design-tokens.css` only (no duplicate values) |
| `om-components.css` | Page container, sections, cards, badges, typography, buttons → CSS variables |
| `tailwind.config.js` | `font-om-display` → Cormorant Garamond; `font-om-body` → Inter |
| `index.html` | Google Fonts updated; theme-color → `#120A2A` |
| `index.css` | `html` background uses `--om-bg` |
| `Login2.tsx` | Feature carousel left; DS `Card` right; removed legacy canonical carousel |
| `AuthLogin.tsx` | `om-auth-form` wrapper — gold Sign In, themed inputs, no blue autofill |
| `FeatureCard.tsx` | Uses DS `Card` + token text classes |
| `SectionHeader.tsx` | Subtitle colors → `om-text-secondary` |
| `HpHeader.tsx` | Nav + language menu → token colors |
| `HeroCarousel.tsx` | Background + fonts → design tokens |

---

## Typography Fixes Applied

- Global `h1`–`h4` scale in `design-tokens.css` (56 / 42 / 32 / 24 px)
- Tailwind aliases `font-om-display` / `font-om-body` remapped (no mass file renames required)
- Removed Cinzel / Crimson Pro from public font loading
- `om-heading-*` and `om-text-*` classes in `om-components.css` use token families and scale

---

## Hardcoded Colors Removed (foundation layer)

| Before | After |
|--------|-------|
| `#2d1b4e` purple primary buttons | `var(--om-gold)` primary |
| `#f9fafb` / `#0d1117` gray surfaces | `var(--om-bg)` / `var(--om-surface-*)` |
| `#4a5565` body gray | `var(--om-text-secondary)` |
| Cinzel / Crimson Pro font stacks | `var(--om-font-heading)` / `var(--om-font-body)` |
| Gradient-only page backgrounds | Solid token backgrounds (light `#F7F3E8`, dark `#120A2A`) |
| MUI blue primary on login | Gold via `.om-auth-form` overrides |

---

## Remaining Violations (Phase 2 backlog)

These files still contain inline hex colors or legacy patterns and should be migrated to tokens / DS components:

### Public components (`~150+ inline color refs`)

- `components/frontend-pages/homepage/figma/ProductEcosystem.tsx` (52)
- `components/frontend-pages/homepage/figma/HeroCarousel.tsx` (11 — slide accent colors)
- `components/frontend-pages/shared/sections/CTASection.tsx` (12)
- `components/frontend-pages/homepage/HomepageIntro.tsx` (14)
- `components/frontend-pages/tour/*` (demo steps, interactive demo)
- `components/frontend-pages/homepage/HomepageDiocesanAnalyticsSection.tsx`

### Public pages

- `features/pages/frontend-pages/Pricing.tsx` (20)
- `features/pages/frontend-pages/Homepage.tsx` (15)
- `features/pages/frontend-pages/About.tsx` (16)
- `features/pages/frontend-pages/Contact.tsx` (13)
- `features/pages/frontend-pages/SampleRecordsExplorer.tsx` (12)
- `features/pages/frontend-pages/Blog.tsx`, `Tour.tsx`, `Terms.tsx`, `Privacy.tsx`, `Security.tsx`

### Auth / onboarding

- `features/auth/authentication/auth1/Register.tsx` (4)
- `components/om-church-onboarding/v1/**` (separate theme.css stack)

### Authenticated app (MUI shell — Phase 3)

- `layouts/portal/ChurchPortalLayout.tsx` — hardcoded `#1a1a2e`, Inter nav
- `layouts/full/**` — MUI theme not yet bridged to `omTokens`
- Dashboard widgets, admin panels, AG Grid themes

### Button variants still in CSS (legacy aliases)

- `om-btn-outline`, `om-btn-ghost`, `om-btn-link` in `om-components.css` — need token migration or deprecation

---

## Verification Checklist

- [x] Login Sign In uses gold primary (not blue/purple)
- [x] Login card matches DS Card (16px radius, token border/shadow)
- [x] Header/footer share `om-public-header` / `om-public-footer` on tokens
- [x] Light/dark use paired `--om-bg`, `--om-surface`, `--om-text-*` variables
- [ ] All public pages free of `#2d1b4e` / `#4a5565` inline (Phase 2)
- [ ] Portal layout uses same tokens as marketing (Phase 3)
- [ ] Enrollment flow uses DS Card + Footer (Phase 2)
- [ ] MUI global theme bridge for authenticated routes (Phase 3)

---

## Recommended Next Steps

1. **Codemod:** Replace `text-[#4a5565]`, `text-[#2d1b4e]`, `dark:text-gray-*` with `om-text-secondary` / `text-[var(--om-text-primary)]` across `frontend-pages/`.
2. **Adopt DS Button** in CTASection, Pricing CTAs, and Homepage hero actions (replace `om-btn-*` gradually).
3. **Bridge MUI theme** in `ThemeContext` using `omTokens` for dashboard parity.
4. **Onboarding** — align `om-church-onboarding/v1/styles/theme.css` with `design-tokens.css`.
5. **ESLint rule** (optional) — flag hex colors in `src/components/frontend-pages` and `src/features/pages/frontend-pages`.
