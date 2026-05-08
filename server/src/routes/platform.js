// server/src/routes/platform.js
// Read-only platform-provider feeds for OMStudio
// (CS-OMSTUDIO-PLATFORM-PROVIDERS-V1).
//
// Mounted at /api/platform. Authenticates via X-Service-Token
// (see middleware/serviceTokenAuth.js); never reads a session
// cookie. All endpoints are READ-ONLY and never mutate church
// records. OMStudio is the consumer; OM is the source of
// church + records data.
//
// Endpoints:
//   GET /api/platform/church-summary
//   GET /api/platform/resource-usage/certificates
//
// Both endpoints support ?limit= (capped server-side).

'use strict';

const express = require('express');
const { requireServiceToken } = require('../middleware/serviceTokenAuth');
const { queryPlatform } = require('../services/databaseService');

const router = express.Router();

router.use(requireServiceToken);

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function parseLimit(rawLimit, defaultValue = DEFAULT_LIMIT, maxValue = MAX_LIMIT) {
  const n = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return Math.min(n, maxValue);
}

// ── Helpers ─────────────────────────────────────────────────────

// Extract a best-effort jurisdiction string from the church
// settings JSON. Most rows have no jurisdiction field; surface
// null instead of inventing one.
function extractJurisdiction(settingsJson) {
  if (!settingsJson) return null;
  let s = settingsJson;
  if (typeof s === 'string') {
    try { s = JSON.parse(s); } catch { return null; }
  }
  if (!s || typeof s !== 'object') return null;
  if (typeof s.jurisdiction === 'string') return s.jurisdiction;
  if (typeof s.diocese === 'string') return s.diocese;
  if (s.organization && typeof s.organization.jurisdiction === 'string') {
    return s.organization.jurisdiction;
  }
  return null;
}

function shapeChurchSummary(row) {
  return {
    churchId: String(row.id),
    churchName: row.name || null,
    jurisdiction: extractJurisdiction(row.settings),
    schema: row.database_name || null,
    status: row.is_active ? 'active' : 'inactive',
    city: row.city || null,
    state: row.state_province || null,
    country: row.country || null,
    lastActivityAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    metadata: {
      setupComplete: !!row.setup_complete,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    },
  };
}

// ── /church-summary ─────────────────────────────────────────────
//
// Lightweight roll-up of the platform `churches` table. Filters
// to active churches by default; pass ?include_inactive=1 to
// include the rest.
router.get('/church-summary', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const includeInactive = req.query.include_inactive === '1' || req.query.include_inactive === 'true';

    const where = includeInactive ? '' : 'WHERE is_active = 1';
    const sql = `
      SELECT id, name, city, state_province, country, settings, is_active,
             database_name, setup_complete, created_at, updated_at
        FROM churches
        ${where}
        ORDER BY name ASC
        LIMIT ?
    `;
    const [rows] = await queryPlatform(sql, [limit]);

    res.json({
      ok: true,
      sourceSystem: 'om',
      generatedAt: new Date().toISOString(),
      churches: (rows || []).map(shapeChurchSummary),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'church_summary_failed',
      detail: err && err.message ? err.message : String(err),
    });
  }
});

// ── /resource-usage/certificates ────────────────────────────────
//
// Two discovery modes — the response picks one based on what OM
// actually has on disk, never overstates:
//
//   1. actual_certificate_usage
//      Used when orthodoxmetrics_db.generated_certificates exists.
//      That table is the audit trail written by
//      POST /api/certificate-templates/generate. Per-church counts
//      come from a single GROUP BY against it.
//
//   2. record_eligibility
//      Used when generated_certificates is missing. Falls back to
//      per-church sacramental record counts — these are NOT actual
//      certificates issued; they are records that *could* back a
//      certificate template. Honestly labelled as such.
//
//   3. unavailable
//      Returned only when neither mode can produce a result.
//
// Per-church queries run cross-schema from the platform pool
// (orthodoxapps has GRANT ALL ON *.*). information_schema is
// consulted before each count so missing tables never throw.
// Promise.allSettled keeps one broken church from killing the rest.

const SACRAMENT_TABLES = [
  // For actual_certificate_usage: enum values used by generated_certificates.record_type
  // For record_eligibility: per-church table names + candidate date columns (probed,
  // first-existing wins; null lastDate if none present).
  { type: 'baptism',     certLabel: 'Baptism',     table: 'baptism_records',     dateCols: ['reception_date', 'birth_date', 'created_at'],   inEligibility: true,  inGenerated: true },
  { type: 'marriage',    certLabel: 'Marriage',    table: 'marriage_records',    dateCols: ['marriage_date', 'mdate', 'created_at'],         inEligibility: true,  inGenerated: true },
  { type: 'chrismation', certLabel: 'Chrismation', table: 'chrismation_records', dateCols: ['chrismation_date', 'reception_date', 'created_at'], inEligibility: true,  inGenerated: false },
  { type: 'reception',   certLabel: 'Reception',   table: 'reception_records',   dateCols: ['reception_date', 'created_at'],                 inEligibility: true,  inGenerated: true },
  { type: 'funeral',     certLabel: 'Funeral',     table: 'funeral_records',     dateCols: ['funeral_date', 'burial_date', 'deceased_date', 'created_at'], inEligibility: false, inGenerated: true },
];

const ELIGIBILITY_LABELS = SACRAMENT_TABLES.filter((s) => s.inEligibility).map((s) => s.certLabel);

// Return Set<string> of tables (from `tables`) that exist in `schema`,
// using a single information_schema query.
async function listExistingTables(schema, tables) {
  if (!schema || !tables.length) return new Set();
  const [rows] = await queryPlatform(
    `SELECT table_name AS t
       FROM information_schema.tables
      WHERE table_schema = ?
        AND table_name IN (?)`,
    [schema, tables],
  );
  const set = new Set();
  for (const r of (rows || [])) {
    const tn = (r.t || r.TABLE_NAME || r.table_name || '').toString();
    if (tn) set.add(tn);
  }
  return set;
}

// Return Map<table, Set<column>> for the schema's tables we care about.
// Lets us pick the first present date column without crashing on schemas
// where, e.g., funeral_records has deceased_date instead of funeral_date.
async function listColumnsForTables(schema, tables) {
  const map = new Map();
  if (!schema || !tables.length) return map;
  const [rows] = await queryPlatform(
    `SELECT table_name AS t, column_name AS c
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name IN (?)`,
    [schema, tables],
  );
  for (const r of (rows || [])) {
    const t = (r.t || r.TABLE_NAME || r.table_name || '').toString();
    const c = (r.c || r.COLUMN_NAME || r.column_name || '').toString();
    if (!t || !c) continue;
    if (!map.has(t)) map.set(t, new Set());
    map.get(t).add(c);
  }
  return map;
}

// Quote a MySQL identifier (schema/table/column).
function ident(s) {
  return '`' + String(s).replace(/`/g, '``') + '`';
}

// Probe orthodoxmetrics_db for the presence of generated_certificates.
// Decides usageMode at the response level.
async function generatedCertificatesTableExists() {
  try {
    const [rows] = await queryPlatform(
      `SELECT 1 AS ok
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'generated_certificates'
        LIMIT 1`,
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

// ── actual_certificate_usage path ───────────────────────────────
//
// Pulls everything in one round-trip from orthodoxmetrics_db.generated_certificates.

async function discoverActualUsage(churches) {
  // Single grouped query — efficient for any number of churches.
  const [rows] = await queryPlatform(
    `SELECT church_id,
            record_type,
            status,
            COUNT(*)         AS c,
            MAX(generated_at) AS latest
       FROM generated_certificates
      GROUP BY church_id, record_type, status`,
  );

  // church_id -> { totals, perType: Map<type, {generated, downloaded, voided, count, latest}>, latestEpoch }
  const byChurch = new Map();
  for (const r of (rows || [])) {
    const cid = Number(r.church_id);
    if (!Number.isFinite(cid)) continue;
    if (!byChurch.has(cid)) {
      byChurch.set(cid, { perType: new Map(), latestEpoch: null, generated: 0, downloaded: 0, voided: 0, total: 0 });
    }
    const slot = byChurch.get(cid);
    const type = String(r.record_type || '');
    const status = String(r.status || 'generated');
    const count = Number(r.c || 0);
    const latest = r.latest ? new Date(r.latest) : null;

    slot.total += count;
    if (status === 'generated')   slot.generated += count;
    if (status === 'downloaded')  slot.downloaded += count;
    if (status === 'voided')      slot.voided += count;

    if (!slot.perType.has(type)) slot.perType.set(type, { count: 0, latestEpoch: null });
    const tslot = slot.perType.get(type);
    tslot.count += count;
    if (latest && !Number.isNaN(latest.getTime())) {
      const e = latest.getTime();
      if (slot.latestEpoch === null || e > slot.latestEpoch) slot.latestEpoch = e;
      if (tslot.latestEpoch === null || e > tslot.latestEpoch) tslot.latestEpoch = e;
    }
  }

  return churches.map((church) => {
    const cid = Number(church.id);
    const slot = byChurch.get(cid);
    const out = {
      churchId: String(church.id),
      churchName: church.name || null,
      jurisdiction: extractJurisdiction(church.settings),
      schema: church.database_name || null,
      certificatesDiscovered: slot ? slot.total : 0,
      certificateTypes: slot
        ? Array.from(slot.perType.keys())
            .filter((t) => slot.perType.get(t).count > 0)
            .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        : [],
      lastCertificateDate: slot && slot.latestEpoch
        ? new Date(slot.latestEpoch).toISOString().slice(0, 10)
        : null,
      recordsSource: 'orthodoxmetrics_db.generated_certificates',
      status: church.is_active ? 'active' : 'inactive',
      metadata: {
        usageMode: 'actual_certificate_usage',
        generated: slot ? slot.generated : 0,
        downloaded: slot ? slot.downloaded : 0,
        voided: slot ? slot.voided : 0,
        perType: slot
          ? Object.fromEntries(
              Array.from(slot.perType.entries()).map(([t, v]) => [
                t.charAt(0).toUpperCase() + t.slice(1),
                {
                  count: v.count,
                  lastGeneratedAt: v.latestEpoch ? new Date(v.latestEpoch).toISOString() : null,
                },
              ]),
            )
          : {},
      },
    };
    return out;
  });
}

// ── record_eligibility path ─────────────────────────────────────
//
// Per-church: probe information_schema, count rows in tables that
// exist, pick the first present date column to compute lastDate.
// One broken church → status='unavailable' for that church only.

async function discoverChurchEligibility(church) {
  const out = {
    churchId: String(church.id),
    churchName: church.name || null,
    jurisdiction: extractJurisdiction(church.settings),
    schema: church.database_name || null,
    certificatesDiscovered: 0,
    certificateTypes: [],
    lastCertificateDate: null,
    recordsSource: church.database_name ? `${church.database_name}.{discovered tables}` : 'unavailable',
    status: church.is_active ? 'active' : 'inactive',
    metadata: {
      usageMode: 'record_eligibility',
      recordCounts: Object.fromEntries(ELIGIBILITY_LABELS.map((l) => [l, 0])),
      missingTables: [],
      queriedTables: [],
    },
  };

  if (!church.database_name) {
    out.status = 'unavailable';
    out.metadata.reason = 'no_database_name';
    return out;
  }

  const eligibilityTables = SACRAMENT_TABLES.filter((s) => s.inEligibility);
  const tableNames = eligibilityTables.map((s) => s.table);

  let existing;
  let columnsByTable;
  try {
    [existing, columnsByTable] = await Promise.all([
      listExistingTables(church.database_name, tableNames),
      listColumnsForTables(church.database_name, tableNames),
    ]);
  } catch (err) {
    out.status = 'unavailable';
    out.metadata.reason = 'information_schema_failed';
    out.metadata.error = err && err.message ? err.message : String(err);
    return out;
  }

  for (const t of tableNames) {
    if (!existing.has(t)) out.metadata.missingTables.push(t);
  }

  if (existing.size === 0) {
    out.status = 'unavailable';
    out.metadata.reason = 'no_eligibility_tables';
    return out;
  }

  let total = 0;
  let latestEpoch = null;
  const presentTypes = [];
  let hadAnyError = false;

  for (const s of eligibilityTables) {
    if (!existing.has(s.table)) continue;
    out.metadata.queriedTables.push(s.table);

    const cols = columnsByTable.get(s.table) || new Set();
    const dateCol = s.dateCols.find((c) => cols.has(c)) || null;
    const dateExpr = dateCol ? `MAX(${ident(dateCol)})` : 'NULL';
    const sql = `SELECT COUNT(*) AS c, ${dateExpr} AS latest FROM ${ident(church.database_name)}.${ident(s.table)}`;

    try {
      const [rows] = await queryPlatform(sql);
      const r = rows && rows[0] ? rows[0] : {};
      const count = Number(r.c || 0);
      out.metadata.recordCounts[s.certLabel] = count;
      total += count;
      if (count > 0) presentTypes.push(s.certLabel);
      if (dateCol) {
        const latest = r.latest ? new Date(r.latest) : null;
        if (latest && !Number.isNaN(latest.getTime())) {
          const e = latest.getTime();
          if (latestEpoch === null || e > latestEpoch) latestEpoch = e;
        }
      } else {
        out.metadata[`${s.table}_dateColumn`] = 'none_detected';
      }
    } catch (err) {
      hadAnyError = true;
      out.metadata[`${s.table}_error`] = err && err.message ? err.message : String(err);
    }
  }

  out.certificatesDiscovered = total;
  out.certificateTypes = presentTypes;
  out.lastCertificateDate = latestEpoch ? new Date(latestEpoch).toISOString().slice(0, 10) : null;
  out.recordsSource = `${church.database_name}.{${out.metadata.queriedTables.join('|') || 'none'}}`;

  if (out.metadata.queriedTables.length === 0) {
    out.status = 'unavailable';
  } else if (hadAnyError || out.metadata.missingTables.length > 0) {
    out.status = 'partial';
  }
  return out;
}

router.get('/resource-usage/certificates', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);

    const [churches] = await queryPlatform(
      `SELECT id, name, city, state_province, country, settings, is_active, database_name
         FROM churches
        WHERE is_active = 1
        ORDER BY name ASC
        LIMIT ?`,
      [limit],
    );

    const haveActualTable = await generatedCertificatesTableExists();

    let usage = [];
    let usageMode;
    let queryKind;
    let querySql;
    let queryLimitations;

    if (haveActualTable) {
      try {
        usage = await discoverActualUsage(churches || []);
        usageMode = 'actual_certificate_usage';
        queryKind = 'existing';
        querySql = [
          '-- Stage 1 (orthodoxmetrics_db):',
          'SELECT id, name, settings, is_active, database_name FROM churches WHERE is_active = 1;',
          '',
          '-- Stage 2 (orthodoxmetrics_db) — single grouped query against the audit trail:',
          'SELECT church_id, record_type, status, COUNT(*) AS c, MAX(generated_at) AS latest',
          '  FROM generated_certificates',
          ' GROUP BY church_id, record_type, status;',
        ].join('\n');
        queryLimitations = [
          'Counts only certificates produced by POST /api/certificate-templates/generate (the template-driven path).',
          'Legacy per-sacrament PNG endpoints (baptismCertificates.js etc.) do not write to generated_certificates and are NOT counted here.',
          'record_type enum covers baptism / marriage / funeral / reception. Chrismation certificates are not represented.',
          'lastCertificateDate is the MAX(generated_at) across types for a church, not the global latest by type — see metadata.perType for per-type timestamps.',
        ];
      } catch (err) {
        // generated_certificates exists but query failed — fall back to eligibility.
        usage = [];
        usageMode = null;
        queryKind = null;
        querySql = null;
        queryLimitations = [`actual_certificate_usage query failed: ${err && err.message ? err.message : String(err)}`];
      }
    }

    if (!usageMode) {
      // record_eligibility path — per-church discovery, settle-per-church.
      const settled = await Promise.allSettled((churches || []).map(discoverChurchEligibility));
      usage = settled.map((s, i) => {
        if (s.status === 'fulfilled') return s.value;
        const c = (churches || [])[i] || {};
        return {
          churchId: String(c.id || ''),
          churchName: c.name || null,
          jurisdiction: extractJurisdiction(c.settings),
          schema: c.database_name || null,
          certificatesDiscovered: 0,
          certificateTypes: [],
          lastCertificateDate: null,
          recordsSource: 'unavailable',
          status: 'unavailable',
          metadata: {
            usageMode: 'record_eligibility',
            recordCounts: Object.fromEntries(ELIGIBILITY_LABELS.map((l) => [l, 0])),
            missingTables: [],
            queriedTables: [],
            reason: 'discovery_threw',
            error: s.reason && s.reason.message ? s.reason.message : String(s.reason),
          },
        };
      });
      usageMode = haveActualTable ? 'unavailable' : 'record_eligibility';
      queryKind = haveActualTable ? 'partial' : 'inferred';
      querySql = [
        '-- Stage 1 (orthodoxmetrics_db):',
        'SELECT id, name, settings, is_active, database_name FROM churches WHERE is_active = 1;',
        '',
        '-- Stage 2 (per om_church_<id>) — defensive discovery, cross-schema from the platform pool:',
        '--   a) Check which sacrament tables exist:',
        "SELECT table_name FROM information_schema.tables",
        " WHERE table_schema = ? AND table_name IN ('baptism_records','marriage_records','chrismation_records','reception_records');",
        '--   b) For each existing table, find the first present date column (reception_date / mdate / chrismation_date / created_at, etc.):',
        'SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?;',
        '--   c) Count + max date (MAX returns NULL when no date column was detected):',
        'SELECT COUNT(*) AS c, MAX(<first_present_date_col>) AS latest FROM <church_db>.<sacrament_table>;',
      ].join('\n');
      queryLimitations = [
        'OM does not currently expose certificate generation audit records (orthodoxmetrics_db.generated_certificates is missing or unreadable).',
        'This provider reports record-backed certificate eligibility — counts of sacramental records that *could* support a certificate template, not certificates actually issued.',
        'Funeral records are intentionally excluded from eligibility counts; funeral certificates are not on the OMStudio /today path.',
        'Tables checked per church: baptism_records, marriage_records, chrismation_records, reception_records. Missing ones are recorded in metadata.missingTables, not treated as global failure.',
        'lastCertificateDate is the MAX across whichever date column was discovered per table; null when no candidate column is present.',
      ];
    }

    // discoveryState: live = every active church returned a real (non-unavailable) row.
    let succeeded = 0;
    let failed = 0;
    for (const u of usage) {
      if (u.status && u.status !== 'unavailable') succeeded += 1;
      else failed += 1;
    }
    let discoveryState = 'live';
    if (succeeded === 0 && failed > 0) discoveryState = 'unavailable';
    else if (failed > 0) discoveryState = 'partial';

    const queryDescription = usageMode === 'actual_certificate_usage'
      ? 'OM logs every template-driven certificate to orthodoxmetrics_db.generated_certificates. This provider returns actual certificate usage by grouping that audit trail per church / record_type / status.'
      : usageMode === 'record_eligibility'
        ? 'OM does not currently expose certificate generation audit records. This provider reports record-backed certificate eligibility by counting sacramental records in each active church schema where supported tables exist (information_schema is consulted before each count, so missing tables are recorded as limitations rather than failures).'
        : 'Neither the certificate audit trail nor per-church eligibility tables could be queried — usage is unavailable for this snapshot.';

    res.json({
      ok: true,
      sourceSystem: 'om',
      generatedAt: new Date().toISOString(),
      discoveryState,
      usageMode,
      queryDescription,
      usage,
      query: {
        kind: queryKind || 'partial',
        sqlOrDescription: querySql || queryDescription,
        limitations: queryLimitations || [],
      },
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'resource_usage_failed',
      detail: err && err.message ? err.message : String(err),
    });
  }
});

// ── /work-sessions/active ───────────────────────────────────────
//
// Service-to-service lookup for OMStudio's "do I have an active OM
// work session right now?" badge. OMStudio MUST NOT forward its
// user JWT to OM — JWT secrets and claim shapes differ. This
// endpoint takes the user's email via X-On-Behalf-Of-Email,
// resolves it against orthodoxmetrics_db.users, and returns the
// active session for that user (or active:false).
//
// Read-only — never mutates work_sessions or any other table.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

router.get('/work-sessions/active', async (req, res) => {
  try {
    const rawEmail = req.serviceCaller && typeof req.serviceCaller.email === 'string'
      ? req.serviceCaller.email.trim()
      : '';
    if (!rawEmail) {
      return res.status(400).json({
        ok: false,
        error: 'missing_on_behalf_of_email',
        message: 'X-On-Behalf-Of-Email header is required for this endpoint.',
      });
    }
    if (!EMAIL_RE.test(rawEmail)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_email',
        message: 'X-On-Behalf-Of-Email is not a valid email format.',
      });
    }
    const email = rawEmail.toLowerCase();

    // Resolve user. Email column is UNIQUE, so LIMIT 1 is belt-and-suspenders.
    const [userRows] = await queryPlatform(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email],
    );
    if (!userRows || userRows.length === 0) {
      return res.json({
        ok: true,
        sourceSystem: 'om',
        email,
        active: false,
        reason: 'user_not_found',
      });
    }
    const userId = userRows[0].id;

    const [rows] = await queryPlatform(
      `SELECT id, user_id, source_system, started_at, status, start_context
         FROM work_sessions
        WHERE user_id = ? AND status = 'active'
        ORDER BY started_at DESC
        LIMIT 1`,
      [userId],
    );
    if (!rows || rows.length === 0) {
      return res.json({
        ok: true,
        sourceSystem: 'om',
        email,
        active: false,
      });
    }

    const session = rows[0];
    let startContext = {};
    if (session.start_context) {
      try {
        const parsed = typeof session.start_context === 'string'
          ? JSON.parse(session.start_context)
          : session.start_context;
        if (parsed && typeof parsed === 'object') startContext = parsed;
      } catch {
        startContext = {};
      }
    }

    // Use DB NOW() for elapsed so app-server clock drift can't lie.
    let elapsedSeconds = null;
    try {
      const [nowRows] = await queryPlatform('SELECT NOW() AS db_now');
      const dbNow = nowRows && nowRows[0] && nowRows[0].db_now
        ? new Date(nowRows[0].db_now)
        : new Date();
      const startedAt = new Date(session.started_at);
      elapsedSeconds = Math.max(0, Math.floor((dbNow.getTime() - startedAt.getTime()) / 1000));
    } catch {
      // Non-fatal — still return the session, just without elapsed.
    }

    return res.json({
      ok: true,
      sourceSystem: 'om',
      email,
      active: true,
      session: {
        id: String(session.id),
        userId: String(session.user_id),
        sourceSystem: session.source_system,
        status: session.status,
        startedAt: session.started_at ? new Date(session.started_at).toISOString() : null,
        elapsedSeconds,
        // summary_note and end_context are intentionally excluded — they can
        // contain free-form user notes. start_context is exposed in metadata
        // because it's structured app context (page path, source_system).
        metadata: { startContext },
      },
    });
  } catch (err) {
    // Log server-side; don't leak DB error text to the caller.
    console.error('[platform] work-sessions/active failed:', err && err.message ? err.message : err);
    return res.status(500).json({
      ok: false,
      error: 'work_sessions_active_failed',
    });
  }
});

// ── /build-runs/summary ─────────────────────────────────────────
//
// Service-to-service mirror of GET /api/admin/build-runs/summary
// (server/src/routes/admin/buildRuns.js) — used by OMStudio's
// /releases Build Console (CS-OMSTUDIO-RELEASES-BUILD-CONSOLE-V1)
// since OMStudio cannot replay OM's session JWT (different secret +
// claim shape).
//
// Auth: X-Service-Token + X-On-Behalf-Of-Email (same pattern as
// /work-sessions/active). build_runs is global, so the email is not
// used to scope the data — but the on-behalf-of header is required
// for audit-attribution parity with other platform calls.
//
// Body shape matches the admin route 1:1 so the OMStudio consumer
// doesn't have to translate.
//
// Read-only — never mutates build_runs or build_run_events.
router.get('/build-runs/summary', async (req, res) => {
  try {
    const rawEmail = req.serviceCaller && typeof req.serviceCaller.email === 'string'
      ? req.serviceCaller.email.trim()
      : '';
    if (!rawEmail) {
      return res.status(400).json({
        ok: false,
        error: 'missing_on_behalf_of_email',
        message: 'X-On-Behalf-Of-Email header is required for this endpoint.',
      });
    }
    if (!EMAIL_RE.test(rawEmail)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_email',
        message: 'X-On-Behalf-Of-Email is not a valid email format.',
      });
    }

    let hours = parseInt(req.query.hours, 10);
    if (!Number.isFinite(hours)) hours = 24;
    hours = Math.max(1, Math.min(168, hours));

    const [countResults] = await queryPlatform(
      `SELECT
         SUM(frontend_hit) AS frontend_builds,
         SUM(server_hit)   AS server_builds
       FROM (
         SELECT
           e.run_id,
           MAX(e.stage = 'Frontend Build' OR e.stage LIKE 'Frontend%') AS frontend_hit,
           MAX(e.stage LIKE 'Backend%')                                AS server_hit
         FROM build_run_events e
         WHERE e.created_at >= NOW() - INTERVAL ? HOUR
         GROUP BY e.run_id
       ) t`,
      [hours],
    );

    const frontendBuilds = Number(countResults?.[0]?.frontend_builds || 0);
    const serverBuilds   = Number(countResults?.[0]?.server_builds   || 0);

    const [last10Results] = await queryPlatform(
      `SELECT
         r.run_id, r.env, r.origin, r.status, r.started_at, r.ended_at,
         MAX(e.stage = 'Frontend Build' OR e.stage LIKE 'Frontend%') AS built_frontend,
         MAX(e.stage LIKE 'Backend%')                                AS built_server,
         TIMESTAMPDIFF(SECOND, r.started_at, COALESCE(r.ended_at, NOW())) AS duration_seconds
       FROM build_runs r
       LEFT JOIN build_run_events e ON e.run_id = r.run_id
       WHERE r.started_at >= NOW() - INTERVAL ? HOUR
       GROUP BY r.run_id, r.env, r.origin, r.status, r.started_at, r.ended_at
       ORDER BY r.started_at DESC
       LIMIT 10`,
      [hours],
    );

    const last10 = (last10Results || []).map((row) => ({
      runId: row.run_id,
      env: row.env,
      origin: row.origin,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      builtFrontend: !!row.built_frontend,
      builtServer: !!row.built_server,
      durationSeconds: row.duration_seconds,
    }));

    return res.json({
      success: true,
      hours,
      frontendBuilds,
      serverBuilds,
      last10,
    });
  } catch (err) {
    console.error('[platform] build-runs/summary failed:', err && err.message ? err.message : err);
    return res.status(500).json({
      ok: false,
      error: 'build_runs_summary_failed',
    });
  }
});

// ─── /tenant-config/known-slots ────────────────────────────────────────
// OMOD-1502 — read-only known-slots endpoint that OMStudio's preflight
// validator consumes (CS-OM-TENANT-PORTAL-CONFIG-REGISTRY-V1).
//
// Auth: X-Service-Token + X-On-Behalf-Of-Email (same pattern as
// /work-sessions/active and /build-runs/summary). Additionally requires
// X-Source-System: omstudio — defense in depth so a leaked service token
// can't be used by a non-OMStudio caller.
//
// Returns the shape OMStudio's lib/packages/compatibility.js consumes
// from tenantConfigResolver(tenant_id):
//   {
//     exists,                                  // bool
//     modules: { "<category>.<module_key>": bool, ... },
//     known_slots: ["<config_key>", ...],      // flat array of layout-slot keys
//     active_roles: ["priest", "church_admin", ...],
//     branding: { logo_position, ... } | null,
//     theme_modes: ["light", "dark"]
//   }
//
// IMPORTANT: returns 404 — NOT 200 with {exists:false} — when the tenant_id
// doesn't match any active church. OMStudio's resolver distinguishes
// "registry not shipped" (null from connector) from "tenant not found"
// (404 → log + null) — see lib/packages/index.js / compatibility.js. Per
// the connector contract, 4xx (other than 404) and 5xx are graceful
// degrade (degraded), while 404 is a clean negative answer.

const KNOWN_SLOT_DEFAULTS = {
  // Slots that exist by virtue of OM shipping the portal at all — present
  // for every active church regardless of whether someone has explicitly
  // populated rows in tenant_portal_config_items yet. V1 is informational;
  // V2 will narrow these to "rows that exist AND are is_active=1".
  baseline_known_slots: [
    'portal.layout.chrome',
    'portal.dashboard.hub_root',
    'portal.dashboard.search_box',
    'portal.dashboard.recent_activity',
    'portal.dashboard.record_pipeline',
    'records.baptism.list',
    'records.marriage.list',
    'records.funeral.list',
    'church_profile.name',
    'church_profile.contact_email',
    'navigation.role_default_landing',
    'analytics.parish_summary',
  ],
  baseline_modules: {
    'records.baptism': true,
    'records.marriage': true,
    'records.funeral': true,
    'records.batches': true,
    'analytics.charts': true,
    'analytics.parish_summary': true,
    'auth.login': true,
    'auth.sessions': true,
  },
  baseline_active_roles: [
    'super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor',
  ],
  baseline_theme_modes: ['light', 'dark'],
};

router.get('/tenant-config/known-slots', async (req, res) => {
  try {
    // 1. on-behalf-of-email
    const rawEmail = req.serviceCaller && typeof req.serviceCaller.email === 'string'
      ? req.serviceCaller.email.trim()
      : '';
    if (!rawEmail) {
      return res.status(400).json({
        ok: false,
        error: 'missing_on_behalf_of_email',
        message: 'X-On-Behalf-Of-Email header is required for this endpoint.',
      });
    }
    if (!EMAIL_RE.test(rawEmail)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_email',
        message: 'X-On-Behalf-Of-Email is not a valid email format.',
      });
    }

    // 2. source system gate — must be omstudio
    const sourceSystem = (req.serviceCaller && req.serviceCaller.sourceSystem)
      || req.get('X-Source-System')
      || '';
    if ((sourceSystem || '').toLowerCase() !== 'omstudio') {
      return res.status(403).json({
        ok: false,
        error: 'source_system_not_allowed',
        message: 'X-Source-System: omstudio header is required for this endpoint.',
      });
    }

    // 3. tenant_id
    const tenantIdRaw = req.query.tenant_id;
    const tenantId = parseInt(tenantIdRaw, 10);
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'missing_tenant_id',
        message: 'tenant_id query param is required (positive integer).',
      });
    }

    // 4. resolve church — 404 if not found OR not active. The connector
    //    treats 404 as "tenant not found" (clean negative); other errors
    //    degrade.
    const [churches] = await queryPlatform(
      `SELECT id, name, church_name, primary_color, secondary_color,
              logo_path, logo_dark_path, favicon_path,
              has_baptism_records, has_marriage_records, has_funeral_records,
              is_active, setup_complete
       FROM churches WHERE id = ? LIMIT 1`,
      [tenantId],
    );
    if (!churches.length || !churches[0].is_active) {
      return res.status(404).json({
        ok: false,
        error: 'tenant_not_found',
        message: `No active church with tenant_id=${tenantId}.`,
      });
    }
    const church = churches[0];

    // 5. registry rows for this tenant
    const [rows] = await queryPlatform(
      `SELECT config_key, category, target_surface, user_roles, current_source,
              layout_contract, omstudio_package_relevance
       FROM tenant_portal_config_items
       WHERE church_id = ? AND is_active = 1`,
      [tenantId],
    );

    // 6. compose response
    //
    // known_slots: every active registry row's config_key, unioned with the
    // baseline. Baseline covers the case where this tenant has no rows yet
    // — V1 is informational, so we return the safe-known-good set rather
    // than an empty array, and downstream OMStudio still gets a valid
    // pass/fail signal.
    const slotSet = new Set(KNOWN_SLOT_DEFAULTS.baseline_known_slots);
    const moduleMap = { ...KNOWN_SLOT_DEFAULTS.baseline_modules };
    const roleSet = new Set(KNOWN_SLOT_DEFAULTS.baseline_active_roles);

    for (const r of rows) {
      slotSet.add(r.config_key);

      // Per-row module signal: row config_key 'records.baptism.list' →
      // module 'records.baptism' enabled. We take the first two
      // dot-segments (or the whole key if only one).
      const firstDot = r.config_key.indexOf('.');
      if (firstDot > 0) {
        const secondDot = r.config_key.indexOf('.', firstDot + 1);
        const moduleKey = secondDot > 0
          ? r.config_key.slice(0, secondDot)
          : r.config_key;
        moduleMap[moduleKey] = true;
      }

      // user_roles influences the active_roles set
      let userRoles = null;
      try {
        userRoles = typeof r.user_roles === 'string'
          ? JSON.parse(r.user_roles)
          : r.user_roles;
      } catch { userRoles = null; }
      if (Array.isArray(userRoles)) {
        for (const role of userRoles) {
          if (typeof role === 'string') roleSet.add(role);
        }
      }
    }

    // has_*_records flags from the church row override module presence
    moduleMap['records.baptism']  = !!church.has_baptism_records;
    moduleMap['records.marriage'] = !!church.has_marriage_records;
    moduleMap['records.funeral']  = !!church.has_funeral_records;

    const branding = (church.primary_color || church.logo_path) ? {
      primary_color:    church.primary_color || null,
      secondary_color:  church.secondary_color || null,
      logo_path:        church.logo_path || null,
      logo_dark_path:   church.logo_dark_path || null,
      favicon_path:     church.favicon_path || null,
    } : null;

    return res.json({
      ok: true,
      exists: true,
      tenant_id: tenantId,
      tenant_name: church.church_name || church.name || null,
      modules: moduleMap,
      known_slots: Array.from(slotSet).sort(),
      active_roles: Array.from(roleSet).sort(),
      branding,
      theme_modes: KNOWN_SLOT_DEFAULTS.baseline_theme_modes,
      registry_row_count: rows.length,
      registry_version: 'v1_informational',
    });
  } catch (err) {
    console.error(
      '[platform] tenant-config/known-slots failed:',
      err && err.message ? err.message : err,
    );
    return res.status(500).json({
      ok: false,
      error: 'tenant_config_known_slots_failed',
    });
  }
});

module.exports = router;
