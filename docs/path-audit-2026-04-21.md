# Path Audit — 2026-04-21

> Read-only audit produced for OMD-1301 (Phase 4 — Audit hardcoded path
> references across OM codebase). Sets the scope for the Phase 4 path
> refactor (step 5 of OMD-1299). No code change in this report; it is a
> categorized inventory + recommended order for the actual refactor.

## Scope

Greps across `server/src/`, `front-end/src/`, root-level `config/`,
`database/migrations/`, and docs. All counts are occurrence counts, not
unique files.

Patterns audited:

- Literal `/var/www/orthodoxmetrics/prod` references
- Literal `/var/omai-ops/` references
- Other absolute paths assumed to exist
  (`/etc/orthodoxmetrics/`, `/var/log/orthodoxmetrics/`,
  `/opt/orthodoxmetrics/`, etc.)
- `process.env.HOME`, `os.homedir()`, `__dirname`-based assumptions
  that break when `APP_ROOT` is elsewhere
- Hardcoded LAN IPs (`.239` `.241` `.221` `.242`)
- `orthodoxmetrics.com` references (some legitimate, some leaky)

## Summary by pattern

| Pattern                                                           | Files | Occurrences | Severity     |
| ----------------------------------------------------------------- | ----- | ----------- | ------------ |
| `/var/www/orthodoxmetrics/prod` (absolute prod path)              | 75    | **248**     | high         |
| `/var/omai-ops/` (OMAI ops scripts)                               | 7     | 20          | moderate     |
| `/var/www/omai` (cross-project coupling)                          | 8     | 26          | high         |
| `/etc/orthodoxmetrics`, `/var/log/orthodoxmetrics`, `/opt/orthodoxmetrics` | 5     | 13          | low          |
| Hardcoded IPs (`.239` `.241` `.221` `.242`)                       | 17    | 40          | moderate     |
| `orthodoxmetrics.com` (domain — some legit, some leaky)           | 64    | 123         | case-by-case |

## Categorization by refactor difficulty

### Trivial (~20 instances)

String-only — error messages like `'Run: npm rebuild canvas'`. Replace
with `${APP_ROOT}/server`. No functional change, just cosmetics.

Representative files:

- `src/index.ts:188,402`

### Moderate (~60 instances) — utility constants and config defaults

These define paths the app uses at runtime — need to be driven from
`APP_ROOT` env with sane defaults.

Representative files:

- `src/utils/ocrPaths.ts:16` — `UPLOADS_ROOT = '/var/www/orthodoxmetrics/prod/uploads'`
- `src/config/library-config.js` — library source paths
- `src/utils/logger.js` — log output path
- `src/utils/encryptedStorage.js` — encrypted file storage root
- `src/modules/backup/BackupEngine.js` — backup destination

### Moderate (~30 instances) — test fixtures

Mostly in `src/**/__tests__/*.test.ts`. Need a shared test helper that
reads `APP_ROOT` from env (default to prod for back-compat).

Representative files:

- `src/utils/__tests__/ocrPaths.test.ts` (33 occurrences alone)
- `src/services/__tests__/taskDiscoveryService.test.ts` (7)
- `src/services/__tests__/libraryOrganizer.test.ts` (23)

### High (~5 instances — disproportionately painful)

Hardcoded `require()` with absolute paths. Node module resolution is
done at require time, so changing these requires either dynamic require
from `APP_ROOT` or restructuring to use relative paths.

Representative:

- `src/index.ts:1281` — `require('/var/www/orthodoxmetrics/prod/misc/omai/services/index.js')`

### High — architectural (~15 instances, flagged for guardrail)

Cross-project coupling to `/var/www/omai/*` filesystem. Per Phase 4
guardrail #3 ("OM ↔ OMAI integrations use HTTP, not shared
filesystem"), these should become HTTP calls over time.

Representative files:

- `src/services/repoService.js:2` — reaches into `/var/www/omai` repo
- `src/routes/admin/build-approval.js:2` — shared state with OMAI
- `src/routes/admin/ops.js:1` — operational commands reaching into OMAI
- `src/routes/om-daily.js:1` — OM-side mirror of OMAI Daily
- `src/api/bigbook.js` — 11 occurrences

### Config files (outside build — env-specific, fine as-is)

- `config/nginx-*.conf` — per-env nginx templates, should become the
  template source for systemd/nginx parameterization in deliverable 3

### `orthodoxmetrics.com` domain (123 occurrences, 64 files)

Not all problematic:

- **Legit**: CORS allow-list, marketing pages, email From: addresses,
  footer links, SEO tags
- **Leaky**: hardcoded API URLs in frontend that should come from
  `VITE_API_BASE`, hardcoded session cookie domain, hardcoded invite
  link origins

Needs triage, not mass refactor. Recommend defer to a separate sub-item
— focus Phase 4 on paths first.

## Top 10 files by impact (weighted by severity × call frequency)

1. `src/index.ts` — core, 3 prod-path hits, one functional `require()`
2. `src/utils/ocrPaths.ts` — OCR pipeline depends on this
3. `src/config/library-config.js` — library feature broken on any
   non-prod host
4. `src/modules/backup/BackupEngine.js` — backup target hardcoded
5. `src/utils/logger.js` — log output path
6. `src/services/repoService.js` — cross-project coupling
7. `src/api/bigbook.js` — 11 hits, doc gallery feature
8. `src/routes/om-daily.js` — OMAI Daily mirror, 2 hits + domain hits
9. `src/routes/admin/build-approval.js` — deploy gate, OMAI coupling
10. `front-end/vite.config.ts` — dev server IP hardcoded (affects local dev)

## Recommended order for Phase 4 step 5 (refactor sweep)

1. **Create `APP_ROOT` constant in `server/src/config/paths.ts`** —
   single source, reads `process.env.APP_ROOT` with fallback to
   `/var/www/orthodoxmetrics/prod` (so nothing breaks on day 1).
2. **Update top-5 utilities first**: `ocrPaths.ts`, `logger.js`,
   `library-config.js`, `BackupEngine.js`, `encryptedStorage.js` —
   highest leverage, moderate risk.
3. **Test harness**: introduce `testPaths.ts` helper so tests read from
   the same config.
4. **String-only replacements** (error messages) — bulk sed-style, trivial.
5. **DEFER**: cross-project OMAI filesystem coupling — needs separate
   HTTP-interface design (Phase 4 guardrail #3), not Phase 4 scope.
6. **DEFER**: `orthodoxmetrics.com` domain audit — separate sub-item.

## Non-goals for the Phase 4 refactor sweep

- Do NOT touch `database/migrations/*.sql` — historical files, don't
  rewrite history.
- Do NOT refactor `front-end/src/features/devel-tools/` deeply — those
  are admin tools with their own lifecycle, revisit later.
- Do NOT rewrite `pathResolver.ts` — it's a Samba-mount utility,
  different concern.
