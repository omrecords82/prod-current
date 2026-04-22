# OM Components — redistributable bundles

> Categorized snapshots of OM-specific frontend code, ready to install into a new OM site.

This tree groups the OrthodoxMetrics frontend components and features into **8 bundles**, each with its own `README.md`, dependency profile, and install guide. Sources remain in the OM monorepo under `front-end/src/`; this directory is a **redistributable snapshot**.

## Bundles

| Bundle | Files | LOC | Tagline |
|--------|------:|----:|---------|
| [`om-foundation`](./om-foundation/README.md) | 234 | 36,978 | Shared primitives, theme, forms, layouts, hooks, context, utils, API client, and types used by every other bundle. |
| [`om-ocr`](./om-ocr/README.md) | 10 | 1,805 | OCR workbench, field mapping, fusion overlay, and review UI for digitizing sacramental ledgers. |
| [`om-records`](./om-records/README.md) | 90 | 24,576 | Sacramental records UI — baptism, marriage, funeral — plus preview pane, field renderers, certificates, and dynamic tables. |
| [`om-churches`](./om-churches/README.md) | 10 | 4,705 | Multi-tenant church setup, wizard, and live table builder. |
| [`om-calendar`](./om-calendar/README.md) | 12 | 3,539 | Orthodox liturgical calendar with three implementation variants. |
| [`om-admin`](./om-admin/README.md) | 470 | 142,992 | Admin panel — user management, system health, logs, CMS, dashboards, VRT settings, OMAI Daily, devel-tools, AdminFloatingHUD. |
| [`om-omai`](./om-omai/README.md) | 14 | 3,429 | OMAI floating panel, chat assistant, OmLearn, and AI learning UI. |
| [`om-auth`](./om-auth/README.md) | 59 | 17,121 | Login, register, forgot-password, account hub, user profile, portal landing, and user-admin form modal. |
| **Total** | **899** | **235,145** | |

## Dependency order

Install in this order to avoid unresolved imports:

1. **`om-foundation`** (base — required by every other bundle)
2. Any of `om-ocr`, `om-records`, `om-churches`, `om-calendar`, `om-auth`, `om-omai`
3. `om-admin` last — it touches all of the above through shared hooks

## Install model

Each bundle is distributed as a plain source tree under `src/`. To consume:

```bash
# From the consumer app root:
rsync -a /path/to/packages/om-components/om-foundation/src/ ./src/
rsync -a /path/to/packages/om-components/om-<category>/src/ ./src/

# install peer deps listed in the target bundle's README
npm install <peer-deps-from-README>
```

The bundles intentionally share the same `@/*`, `@om/*`, and `@shared/*` alias roots, so merging them into a single `src/` tree in the consumer works without file collisions.

## What is NOT included

The OMD-1305 audit flagged these directories as Modernize / Berry template dead code. They are **intentionally excluded** from the bundles:

- `components/apps/` (48 files, ~460 KB — Modernize blog/email/chat/contacts/ecommerce)
- `components/dashboards/` (16 files, ~96 KB — ecommerce/generic dashboards)
- `components/frontend-pages/{homepage,about,tour,portfolio,blog,contact}` (~29 files, ~320 KB — Modernize marketing demos; the `shared/` subfolder IS included under `om-foundation`)
- `features/apps/` (calendar/contacts/email/invoice/kanban/notes/tickets/user-profile — all Modernize template apps)
- `features/pages/`, `features/landingpage/` (Modernize scaffolding)
- `features/berry-{calendar,cards,crm,map,profile-02,profile-03}` (Berry template variants)
- `features/social/` (Modernize chat/friends/notifications demos)
- `src/kanban/`, `src/mocks/`, `src/sandbox/`
- Zero-consumer orphans: `AdvancedGridDialog.tsx`, `ColorPaletteSelector.tsx`, `ColorPickerPopover/`

If you need any of these, pull them directly from the OM repo at `front-end/src/`.

## Known limitations

1. **MUI-based, not Mantine.** Components use `@mui/material`. A Mantine-native port is a separate undertaking — see OMD-1307 follow-ups.
2. **Backend contract implicit.** Bundles assume the OM server is reachable and exposes the relevant routes (records, OCR, auth, OMAI Daily, etc.). Each bundle's README calls out the specific route prefixes it expects.
3. **Alias-based imports.** All bundles use `@/*` path aliases. Consumer apps must configure matching aliases in `tsconfig.json` and `vite.config.ts` (or the equivalent for your bundler).
4. **No per-bundle `package.json`.** This is a source-tree distribution, not a package-registry distribution. If you want registry-style installation (`npm i @orthodoxmetrics/om-records`), that is a future enhancement.

## Provenance

Generated as OMD-1307 on 2026-04-22 from the `main` tip (commit `465663d7`). Source of truth: `front-end/src/`. Re-run the bundling after any material change to that tree.
