# OMOD-1446 — Before-state report

**Branch:** `feature/omd-1446/2026-05-06/omod-public-site-launch-hardening-post-astro-rollb`
**HEAD before work:** `85b6f123` (FIX-CONVERSATION-LOG-STRAY-BRACE)
**Repo:** `nexty1982/prod-current`
**Host / Agent:** `claude-cli/.239`
**Worktree:** `/var/www/om-workspaces/agent-claude2`
**Generated:** 2026-05-06

This is the read-only audit fed into the implementation pass. No code changes
were applied while this report was being written.

## 1. Public-site architecture (already in place)

The OM React SPA already has substantive public-site scaffolding. The Astro
rebuild was rolled back on 2026-05-05 because it removed real product/demo
surface; this work hardens the existing React site rather than re-attempting
the rebuild.

- Public route registry: `front-end/src/config/publicRoutes.ts:11-24`
  (HOME, ABOUT, PRICING, SAMPLES, SAMPLES_EXPLORER, TOUR, BLOG, CONTACT, FAQ,
  PRIVACY, TERMS, SECURITY).
- Public layout: `front-end/src/layouts/full/blank/PublicLayout.tsx`
  (HpHeader + `<Outlet />` + SiteFooter). No `<main>` landmark.
- Apex (`/`) renders `<RootGate />` (Router.tsx:223) which dispatches to the
  marketing Homepage for unauthenticated visitors and to a role-appropriate
  dashboard for authenticated users.
- Per-page SEO component: `front-end/src/components/seo/PublicSeo.tsx`
  (title / description / canonical / OG / Twitter / noindex; `bare` and
  `image` overrides; defaults to `summary_large_image`). Used by all 12
  public pages plus deferred public routes.
- Site-wide JSON-LD: `front-end/index.html:62-80` ships Organization +
  WebSite. No FAQPage / SoftwareApplication / Article / BreadcrumbList
  emitted by any public page today.
- i18n source of truth: `server/src/routes/i18n.js` `ENGLISH_DEFAULTS`
  (frontmatter and live API confirm this — DB only stores non-English).
  Editing English public-site copy = source change, not a DB migration.

## 2. Sitemap and robots state

Live `front-end/public/sitemap.xml` (14 URLs):

| URL | Priority | Issue |
|-----|----------|-------|
| `/` | 1.0 | canonical apex — keep |
| `/frontend-pages/homepage` | 1.0 | **duplicate of `/`** — drop |
| `/frontend-pages/about` | 0.8 | keep |
| `/tour` | 0.9 | keep |
| `/frontend-pages/pricing` | 0.9 | keep |
| `/samples` | 0.7 | keep |
| `/frontend-pages/contact` | 0.7 | keep |
| `/frontend-pages/blog` | 0.7 | keep |
| `/frontend-pages/faq` | 0.6 | keep |
| `/frontend-pages/oca-timeline` | 0.5 | **deferred public route** — drop |
| `/frontend-pages/sacramental-restrictions` | 0.5 | **deferred public route** — drop |
| `/privacy` | 0.4 | keep |
| `/terms` | 0.4 | keep |
| `/security` | 0.4 | keep |

`front-end/public/robots.txt` is correctly scoped (admin/api/auth/dashboard
disallowed; `/samples/explorer` correctly disallowed as thin content;
sitemap reference present).

## 3. Per-page state (12 public pages)

All 12 import `PublicSeo` and render valid title/description. Page-level
JSON-LD beyond what `index.html` emits is **absent everywhere**.

| Page | Title | Has H1 | Page-level JSON-LD | Notes |
|------|-------|--------|---------------------|-------|
| Homepage | "Sacramental records, modernized for every parish" | no (h2) | none | rich content (Hero, How It Works, Features, Why Choose Us) |
| About | "About" | no (h2) | none | founder section real (`Nectarios Parsells`, ~110 words across founder_p1+p2) |
| Tour | "Platform Tour" | no (h2) | none | TourInteractiveDemo component |
| Samples | "Sample Records" | no (h2) | none | Greek/Russian/Romanian/Georgian sample certs |
| Pricing | "Pricing" | no (h3 on tier cards) | none | `HIDE_PRICES=true` → "Contact for Pricing"; 3 tiers + Enterprise; 5-row FAQ section |
| Contact | "Contact" | no (h2) | none | working form, 6 enquiry types, posts `/api/contact` |
| Faq | "Frequently Asked Questions" | no (h4) | none | **6 Q/A only** — prompt asks for 8-12 |
| Blog | "Blog" | no (h2) | none | structure but article content is i18n-driven |
| Privacy | "Privacy Policy" | no | none | draft notice + 2 paragraphs (placeholder) |
| Terms | "Terms of Service" | no | none | draft notice + 2 paragraphs (placeholder) |
| Security | "Security" | no | none | draft notice + 2 paragraphs (placeholder) |
| SamplesExplorer | n/a (under `/samples/explorer`) | n/a | n/a | imports `ag-grid-community` directly (line 8-9) — only public route that pulls ag-grid |

**FAQ Q/A pairs (live `/api/i18n/en`):**
1. What is included with my purchase?
2. One time purchase
3. How does the Orthodox Metrics calendar work?
4. What is the timeframe to have the church records complete?
5. What if I need to print a baptismal or marriage certificate, can I do that?
6. How can I get support?

Missing topics from prompt's required FAQ list: metrical records definition,
sacramental records breakdown, Old/New Julian calendar, multi-script OCR
(Greek/Cyrillic/Georgian/Arabic/Romanian/English), legacy ledger
digitization, diocese / multi-parish use, parish data protection,
public pricing question, onboarding flow, paper-record import, target
audience.

**Founder section:** Real and credible — names Nectarios Parsells, mentions
"firsthand experience in an Orthodox parish", "input from clergy and
parish administrators across multiple jurisdictions", "small mission
parishes to established cathedral communities". Word count
~110 — slightly below the 150-word target.

## 4. Accessibility state

| Concern | State | Citation |
|---------|-------|----------|
| Skip-to-main-content link | **missing** | App.tsx, Router.tsx, PublicLayout.tsx |
| `<main>` landmark | **missing** in PublicLayout | `front-end/src/layouts/full/blank/PublicLayout.tsx:17-31` |
| `<nav>` landmark | present | `front-end/src/components/frontend-pages/shared/header/HpHeader.tsx:54` |
| `<footer>` landmark | present | `front-end/src/components/frontend-pages/shared/footer/SiteFooter.tsx:10` |
| Single `<h1>` per public page | **missing** — every public page leads with h2/h3/h4 | every Public*.tsx |
| ARIA-labels on icon-only controls | partial — language switcher, theme toggle, mobile menu have labels | HpHeader.tsx:107, 140, 150 |
| Route-change focus management | **missing** — no `useEffect` on `useLocation` for focus reset in any public route | — |
| Alt text on hero images | partial — founder image has alt; many hero images rely on CSS backgrounds | About.tsx:165 |
| Dark mode focus indicators | not audited (visual) | — |

## 5. Public-bundle composition

- `vite.config.ts:107-136` defines `manualChunks` for `vendor` (react, react-dom,
  react-router-dom), `mui` (@mui/material, @mui/icons-material), `aggrid`
  (ag-grid-community, ag-grid-react).
- `front-end/src/agGridModules.ts` is imported only by `main.tsx` and
  `RecordsPage.tsx`. **However** `front-end/src/features/pages/frontend-pages/SampleRecordsExplorer.tsx:8-9` imports
  `ag-grid-community` and `ag-grid-react` directly — so `/samples/explorer`
  pulls the `aggrid` chunk on first visit. Acceptable: that route is the
  documented sample-records demo and the bundle splits out cleanly.
- No public marketing page directly imports `@mui/x-data-grid`, kanban,
  dashboard widgets, or admin-only components.
- PublicLayout wraps only HpHeader, SiteFooter, EditModeProvider/Toggle
  (super_admin gated), and OmAssistant. No admin-side leakage.

## 6. Live response headers (security gap)

```
GET https://orthodoxmetrics.com/   →   HTTP/1.1 200
Server: nginx/1.18.0 (Ubuntu)        ← server_tokens leaks version
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

**Missing across the entire public surface:**

- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (or CSP-Report-Only)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` / `SAMEORIGIN` (or `frame-ancestors` directive)
- `Referrer-Policy`
- `Permissions-Policy`
- HTTP/2 — vhost still on HTTP/1.1
- `Content-Encoding: gzip|br` — `Vary: Accept-Encoding` is set but the test
  request did not negotiate compression; nginx config is not advertising br

These changes are **drafted in repo-tracked nginx config only**; live nginx
edits are out of scope per AGENTS.md §8.2.

## 7. Build, deploy, test surface

- Frontend build: `front-end/` is a Vite SPA. Repo build script is
  `npm run build` from `front-end/` (verify before use). Output → `dist/`.
- Backend: `server/src/` → `dist/` via `scripts/build-copy.js` and `tsc`.
- Live deploy (out of scope): `/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh`
  (full | be | fe). This PR does not deploy.

## 8. Drift items vs AGENTS.md / launch-config doc

1. **Branch prefix.** OMAI auto-sync emits `feature/omd-1446/...` (legacy
   `omd-` prefix). AGENTS.md §3.1/§4.1 mandates `omod-` for OM. Already
   on the operator's roadmap as `chore/omd-1445/.../prefix-migration-omd-omad-omsd-omod`.
   Trust-reality applied: branch adopted as auto-emitted, item title and
   PR title use `OMOD-1446`.
2. **`source` column width.** AGENTS.md §3.4 example `agent:claude-cli/.242`
   is 21 chars. Schema `om_daily_items.source` is `VARCHAR(20)`. Used the
   short form `source: "agent"` + `assigned_agent: "claude-cli/.239"`.
3. **POST-time fields.** AGENTS.md §3.4 says `status` and `category` "return
   500 at create time". Reality: the POST handler accepts both
   (`server/src/api-ops/omai-daily.js:578-617`) and the DB defaults
   (`status='backlog'`, `repo_target='orthodoxmetrics'`) match. POST set
   status / category cleanly.
4. **Sitemap stale entries.** `/frontend-pages/oca-timeline` and
   `/frontend-pages/sacramental-restrictions` are still indexed even though
   they're documented as deferred public routes.
5. **`HOME` constant aliases the apex.** `publicRoutes.ts:12`
   `HOME: '/frontend-pages/homepage'` — but apex `/` is the canonical landing.
   Sitemap and PublicSeo currently emit both. Drop the alias from sitemap;
   leave the routing intact (deep-link parity).
6. **Live security headers.** Launch-config doc tracks SEO/social but does
   not specify CSP/HSTS/etc. Drafting these in `config/om/nginx/draft/` and
   leaving an operator instructions block in the completion report.

## 9. Implementation plan (next phase)

Frontend code (no DB / no live ops):

1. Add `<main id="main-content">` to PublicLayout + skip-link in App shell.
2. Add route-change focus management (useEffect on `useLocation`).
3. Promote per-page top heading from h2/h3/h4 to single `<h1>` on each
   public page.
4. Extend `PublicSeo` to accept an optional `schema` prop, OR introduce
   `<JsonLd>` component to emit page-level structured data:
   - Faq → FAQPage (built from the live i18n keys at render time).
   - Pricing → SoftwareApplication (3 tiers + Enterprise).
   - Homepage → BreadcrumbList (just "Home") + Service description.
   - About → Person (founder) + BreadcrumbList.
   - Blog → Blog / BlogPosting (when listings present).
5. Drop `/frontend-pages/homepage`, `/frontend-pages/oca-timeline`,
   `/frontend-pages/sacramental-restrictions` from `front-end/public/sitemap.xml`.
   Optionally add `/blog/:slug` placeholder once blog detail is wired
   (deferred — out of scope for this PR).
6. Expand `ENGLISH_DEFAULTS` FAQ to ~10 Q/A in `server/src/routes/i18n.js`,
   covering: metrical records, sacramental record types, Old/New Julian
   calendars, multi-script OCR, legacy ledger digitization, certificate
   generation, diocese / multi-parish use, data protection, onboarding,
   paper-record import, target audience.
7. Tighten Google Fonts loading in `index.html` (preconnect to fonts.gstatic.com,
   confirm display=swap is on every URL — already on most).
8. (Optional) Expand `about.founder_p1`/`p2` slightly toward 150 words.

Repo-only nginx draft (no live edits):

9. `config/om/nginx/snippets/security-headers.draft.conf` — proposed
   `add_header` block for the public vhost. Document operator action in the
   completion report. Do not edit `/etc/nginx`.

Doc fix (operator pre-approved):

10. CLAUDE.md "AI Agent Work Tracking" section to point at AGENTS.md as
    canonical. Replace the inline `omd-NNN` quick-reference with a pointer
    to AGENTS.md §3 / §4 / §6 / §10.

## 10. Files likely to change

- `front-end/public/sitemap.xml` (drop 3 stale entries)
- `front-end/src/layouts/full/blank/PublicLayout.tsx` (`<main>` + focus mgmt)
- `front-end/src/App.tsx` or top-level (skip-link)
- `front-end/src/components/seo/PublicSeo.tsx` (`schema` prop or new
  `<JsonLd>` component)
- `front-end/src/components/seo/JsonLd.tsx` (NEW, optional)
- `front-end/src/features/pages/frontend-pages/{Homepage,About,Pricing,Faq,Tour,Samples,Contact,Blog,Privacy,Terms,Security}.tsx` (`<h1>` + per-page schema where applicable)
- `front-end/src/components/frontend-pages/homepage/faq/index.tsx` (new accordion entries 7-10 wired to new i18n keys)
- `front-end/src/index.html` (preconnect)
- `server/src/routes/i18n.js` (FAQ ENGLISH_DEFAULTS expanded; founder bio
  optional polish)
- `config/om/nginx/snippets/security-headers.draft.conf` (NEW, repo-only)
- `CLAUDE.md` (drift fix)
- `_report/public-site-launch-hardening-before.md` (this file)

No nginx live edits, no systemd changes, no DB migrations, no auth/JWT
changes, no removal of demo/product surface.
