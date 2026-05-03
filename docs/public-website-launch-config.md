# OrthodoxMetrics public website — launch configuration

**Prompt ID:** OM-PUBLIC-WEBSITE-LAUNCH-CONFIG-V1
**Branch:** `chore/public-website-launch-config`
**Audience:** anyone preparing orthodoxmetrics.com for public discovery (search engines, social previews, paid traffic, analytics).

This file is the operator's source of truth for everything that's not application logic — metadata, sharing image, sitemap, robots, analytics provider wiring, and the internal stats page. Update it when any of those values change.

---

## 1. Where the public site lives

The public marketing site is **bundled inside the same Vite SPA as the OM app** under `/var/www/orthodoxmetrics/prod/front-end/`. There is no separate marketing repo.

- Build output: `front-end/dist/` (served by nginx).
- Public marketing routes are listed in `front-end/src/config/publicRoutes.ts`.
- Top-level route registry: `front-end/src/routes/Router.tsx`.
- nginx vhost: `/etc/nginx/sites-enabled/orthodoxmetrics.com` (apex + `www` resolve to the same vhost; no apex/www redirect is enforced today — see *Risks* at the bottom).

## 2. Final metadata values

Site-wide defaults live in `front-end/index.html`. Per-page overrides come from `<PublicSeo>` (`front-end/src/components/seo/PublicSeo.tsx`).

| Field | Value |
|---|---|
| `<title>` (fallback) | *Orthodox Metrics — Sacramental records, modernized for every parish* |
| `description` (fallback) | *Orthodox Metrics is the records platform for Orthodox parishes — secure baptism, marriage, and funeral registers, OCR digitization of historic ledgers, and multi-tenant parish administration trusted to canonical custody.* |
| `theme-color` | `#2d1b4e` |
| `og:image` | `https://orthodoxmetrics.com/og/orthodoxmetrics-og-cover.png` (1200×630) |
| `og:image:alt` | *Orthodox Metrics — sacramental records platform for Orthodox parishes* |
| `twitter:card` | `summary_large_image` |
| Canonical | `https://orthodoxmetrics.com/` (page-level overrides set per-route via `<PublicSeo path=…>`) |
| Locales advertised in JSON-LD | `en, el, ru, ro, ka` |

To add or change metadata for an individual page, edit the `<PublicSeo>` block at the top of that page's component file.

## 3. Public URLs after deploy

| Resource | URL |
|---|---|
| OG cover image | https://orthodoxmetrics.com/og/orthodoxmetrics-og-cover.png |
| Sitemap | https://orthodoxmetrics.com/sitemap.xml |
| robots.txt | https://orthodoxmetrics.com/robots.txt |
| Web manifest | https://orthodoxmetrics.com/site.webmanifest |
| favicon (multi-size .ico) | https://orthodoxmetrics.com/favicon.ico |
| Apple touch icon | https://orthodoxmetrics.com/apple-touch-icon.png |
| 192/512 PWA icons | https://orthodoxmetrics.com/icon-192.png · /icon-512.png |
| Internal stats page | https://orthodoxmetrics.com/admin/website-stats *(super_admin / admin only)* |

## 4. Sitemap

`front-end/public/sitemap.xml` is **static**. It lists only the public marketing routes. To add a new public page:

1. Add the route to `front-end/src/config/publicRoutes.ts` (so internal navigation can use it).
2. Append a `<url>` entry to `public/sitemap.xml` with `<lastmod>` set to today.
3. Bump `<lastmod>` on existing entries when their content changes meaningfully (not on every deploy).

If the page should remain non-indexable (auth flow, debug page), do NOT add it to the sitemap and add `<PublicSeo … noindex />` on the route.

## 5. robots.txt

Allow-list strategy: allow root, then `Disallow:` every authenticated / admin / API surface. The current disallow list (in `public/robots.txt`):

```
/admin/   /api/   /auth/   /portal/   /account/   /dashboards/   /apps/
/social/  /chats/ /uploads/ /devel-tools/  /developer-tools/  /super-admin/
/users/   /omai/  /omai-realm/   /omstudio/   /samples/explorer
/build-info.json   /build.meta.json
```

Sitemap is referenced at the bottom. If a new internal route is added under one of these prefixes you don't need to do anything — the prefix already covers it.

## 6. Analytics providers

The frontend supports three providers (or none) via `import.meta.env`. The selected provider is loaded only if its required env vars are present **and** the visitor's `navigator.doNotTrack` is not `1`.

### Frontend env (rebuild required)

Set in `front-end/.env.production` (or your CI's deploy environment):

| Provider | Required vars |
|---|---|
| **none** | (default) `VITE_ANALYTICS_PROVIDER=none` — analytics is fully no-op |
| **plausible** | `VITE_ANALYTICS_PROVIDER=plausible` <br> `VITE_PLAUSIBLE_DOMAIN=orthodoxmetrics.com` <br> `VITE_PLAUSIBLE_SCRIPT_URL=https://plausible.io/js/script.js` *(optional, override for self-hosted)* |
| **umami** | `VITE_ANALYTICS_PROVIDER=umami` <br> `VITE_UMAMI_WEBSITE_ID=<uuid>` <br> `VITE_UMAMI_SCRIPT_URL=https://umami.example/script.js` |
| **ga4** | `VITE_ANALYTICS_PROVIDER=ga4` <br> `VITE_GA4_MEASUREMENT_ID=G-XXXXXXX` |

After changing any of these, run `npm run build` and redeploy `front-end/dist/`.

### Backend env (server restart required)

The internal stats page (`/admin/website-stats`) calls `/api/admin/website-stats`, which proxies to the provider's REST API server-side. Set in `server/.env` (or the systemd unit's `Environment=` block):

| Provider | Required vars |
|---|---|
| **none** | (default) `ANALYTICS_PROVIDER=none` — stats page renders the "configuration needed" empty state |
| **plausible** | `ANALYTICS_PROVIDER=plausible` <br> `PLAUSIBLE_SITE_ID=orthodoxmetrics.com` <br> `PLAUSIBLE_API_KEY=<token from plausible.io/settings>` <br> `PLAUSIBLE_API_URL=https://plausible.io/api/v1` *(optional)* |
| **umami** | `ANALYTICS_PROVIDER=umami` <br> `UMAMI_API_URL=https://umami.example/api` <br> `UMAMI_API_TOKEN=<api token>` <br> `UMAMI_WEBSITE_ID=<website uuid>` |

GA4 has no first-class REST API for the stats page; if you choose GA4 for the frontend, the stats page will show "configuration needed" and operators must use GA4's web UI directly.

## 7. Internal stats page

- Path: `/admin/website-stats`
- Auth: protected by `ProtectedRoute requiredRole={['super_admin', 'admin']}` on the frontend AND `requireRole(['super_admin', 'admin'])` on the backend route — both gates fire.
- Shows: unique visitors, pageviews, bounce rate, avg. visit duration, top 10 pages, top 10 referrers. Period selector: 24h / 7d / 30d / 12mo.
- **No mock data.** When provider creds are absent, the page shows a configuration-needed empty state with the exact env vars the operator should set. When the upstream provider errors out, the page surfaces the failure (with provider tokens redacted) instead of substituting placeholders.

## 8. Manual external setup (still required)

These cannot be automated from the codebase. Track them in a launch checklist:

### Google Search Console
1. Visit https://search.google.com/search-console.
2. Add **property → URL prefix** → `https://orthodoxmetrics.com`.
3. Verify via the **HTML tag** method: copy the `<meta name="google-site-verification" …>` tag and add it to `front-end/index.html` *just before* the `</head>` closer. Rebuild and deploy. Then click **Verify** in Search Console.
4. Submit the sitemap: **Sitemaps → Add new sitemap → `sitemap.xml`**.
5. Repeat for `https://www.orthodoxmetrics.com` if/when the apex/www canonical decision lands (see *Risks*).

### Bing Webmaster Tools
1. Visit https://www.bing.com/webmasters.
2. **Add a site → URL** → `https://orthodoxmetrics.com`. Bing will offer to import settings from Google Search Console — fastest path.
3. Otherwise verify via the same `<meta>` tag pattern.
4. Submit sitemap: **Sitemaps → Submit sitemap → https://orthodoxmetrics.com/sitemap.xml**.

### Social preview testers
- **Facebook / Meta:** https://developers.facebook.com/tools/debug/ → paste a public URL → click **Scrape Again** to re-fetch after meta changes (Facebook caches aggressively).
- **LinkedIn:** https://www.linkedin.com/post-inspector/ → paste URL.
- **X / Twitter:** Cards Validator was retired; the platform now generates previews from the `twitter:` meta tags directly. Best test is to paste a URL into a draft post and confirm the card.
- **Slack / Discord:** paste a URL into any channel as a quick smoke test.

### Verify indexed pages
After 24–72 hours of Search Console verification, run `site:orthodoxmetrics.com` in Google. Pages indexed will show. To deep-inspect a specific URL: **URL inspection → Inspect any URL** in Search Console.

### Analytics provider account
- **Plausible:** create site at https://plausible.io/sites → use the domain `orthodoxmetrics.com`. Generate an API key under https://plausible.io/settings#api-keys.
- **Umami:** self-hosted; create the site in Umami's admin, copy its UUID and the script URL.
- **GA4:** create a property at https://analytics.google.com → Admin → Data Streams → Web → enter the URL.

### DNS / canonical domain
**Today:** both `orthodoxmetrics.com` and `www.orthodoxmetrics.com` are served by the same nginx vhost without an apex/www redirect. Search engines may treat them as duplicates, which dilutes ranking signals. **Recommendation:** pick one canonical (apex is conventional for SaaS) and add a 301 from `www.orthodoxmetrics.com` → `orthodoxmetrics.com`. That belongs in the omai-ops nginx config as a follow-up.

## 9. How to test a social preview locally

1. Build: `npm run build`.
2. Serve `front-end/dist/` over a temporary HTTPS endpoint (ngrok / Cloudflare Tunnel / staging deploy).
3. Paste the public URL into Facebook's Sharing Debugger. The OG image, title, and description should all render correctly. Re-scrape after each change.
4. Repeat with the LinkedIn Post Inspector.

## 10. Risks / follow-ups

- **No apex/www canonical redirect** in nginx today. Add a 301 once the canonical decision is made — this is small but unblocks consistent SEO.
- **PageContainer.tsx** still uses the legacy `react-helmet` package; the rest of the public pages use `react-helmet-async` via `<PublicSeo>`. They coexist (last write wins for `<title>` / `<meta>`), but a small follow-up should migrate `PageContainer` to `react-helmet-async` for consistency.
- **GA4 in the stats page** — not supported server-side. If the operator chooses GA4 for the frontend, the stats page renders the empty state and operators read traffic from GA4's web UI.
- **Sitemap is static.** When the public page list changes substantially, refresh `public/sitemap.xml`'s `<lastmod>` values manually. A future enhancement could generate it at build time from `publicRoutes.ts`.

---

## File map

| File | Purpose |
|---|---|
| `front-end/index.html` | Site-wide SEO defaults, favicon links, Organization + WebSite JSON-LD |
| `front-end/public/og/orthodoxmetrics-og-cover.png` | 1200×630 OG / Twitter share image |
| `front-end/public/robots.txt` | Crawler policy |
| `front-end/public/sitemap.xml` | Sitemap |
| `front-end/public/site.webmanifest` | PWA manifest (public site) |
| `front-end/public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Favicon + app icon set |
| `front-end/src/components/seo/PublicSeo.tsx` | Per-page SEO + OG + Twitter helper |
| `front-end/src/lib/analytics.ts` | Provider abstraction + tracker bootstrap |
| `front-end/src/components/analytics/AnalyticsRouterListener.tsx` | Pageview hook (mounted at the router root) |
| `front-end/src/features/admin/website-stats/WebsiteStatsPage.tsx` | Internal stats UI |
| `server/src/routes/website-stats.js` | Backend proxy → provider stats API |
