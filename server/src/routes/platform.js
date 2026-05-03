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
const {
  queryPlatform,
  getChurchRecordConnection,
} = require('../services/databaseService');

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
// Two-stage discovery:
//   1. Enumerate active churches in orthodoxmetrics_db.
//   2. Per-church, count records in the canonical sacrament tables
//      (baptism_records, marriage_records, funeral_records, plus
//      optional chrismation_records). information_schema is queried
//      first so missing tables don't throw.
//
// Settle-per-church via Promise.allSettled — one broken church DB
// does NOT fail the response. discoveryState reflects whether all
// queries succeeded (`live`), some failed (`partial`), or
// everything failed (`unavailable`).

const SACRAMENT_TABLES = [
  // type, table, optional, dateColumn, certificateLabel
  { type: 'baptism',     table: 'baptism_records',     optional: false, dateCol: 'reception_date',   certLabel: 'Baptism' },
  { type: 'marriage',    table: 'marriage_records',    optional: false, dateCol: 'mdate',            certLabel: 'Marriage' },
  { type: 'funeral',     table: 'funeral_records',     optional: false, dateCol: 'funeral_date',     certLabel: 'Funeral' },
  { type: 'chrismation', table: 'chrismation_records', optional: true,  dateCol: 'chrismation_date', certLabel: 'Chrismation' },
];

async function listExistingTables(conn, schemaName) {
  const [rows] = await conn.query(
    `SELECT table_name AS t
       FROM information_schema.tables
       WHERE table_schema = ?
         AND table_name IN (?)`,
    [schemaName, SACRAMENT_TABLES.map((s) => s.table)],
  );
  const set = new Set();
  for (const r of (rows || [])) {
    // Some MariaDB returns lower-case keys.
    const tn = (r.t || r.TABLE_NAME || r.table_name || '').toString();
    if (tn) set.add(tn);
  }
  return set;
}

async function discoverChurchUsage(church) {
  const churchId = church.id;
  const out = {
    churchId: String(churchId),
    churchName: church.name || null,
    jurisdiction: extractJurisdiction(church.settings),
    schema: church.database_name || null,
    certificatesDiscovered: 0,
    certificateTypes: [],
    lastCertificateDate: null,
    recordsSource: church.database_name
      ? `${church.database_name}.{baptism|marriage|funeral|chrismation}_records`
      : 'unavailable',
    status: church.is_active ? 'active' : 'inactive',
    metadata: {},
  };

  if (!church.database_name) {
    out.status = 'unavailable';
    out.metadata.reason = 'no_database_name';
    return out;
  }

  let conn;
  try {
    conn = await getChurchRecordConnection(churchId);
  } catch (err) {
    out.status = 'unavailable';
    out.metadata.reason = 'connection_failed';
    out.metadata.error = err && err.message ? err.message : String(err);
    return out;
  }

  let existingTables;
  try {
    existingTables = await listExistingTables(conn, church.database_name);
  } catch (err) {
    out.status = 'unavailable';
    out.metadata.reason = 'information_schema_failed';
    out.metadata.error = err && err.message ? err.message : String(err);
    return out;
  }

  let total = 0;
  let latestEpoch = null;
  const types = [];

  for (const sacrament of SACRAMENT_TABLES) {
    if (!existingTables.has(sacrament.table)) continue;
    try {
      const [rows] = await conn.query(
        `SELECT COUNT(*) AS c, MAX(\`${sacrament.dateCol}\`) AS latest FROM \`${sacrament.table}\``,
      );
      const r = rows && rows[0] ? rows[0] : {};
      const count = Number(r.c || 0);
      if (count > 0) {
        types.push(sacrament.certLabel);
        total += count;
        const latest = r.latest ? new Date(r.latest) : null;
        if (latest && !Number.isNaN(latest.getTime())) {
          const epoch = latest.getTime();
          if (latestEpoch === null || epoch > latestEpoch) latestEpoch = epoch;
        }
      }
    } catch (err) {
      // Non-fatal — note partial in metadata.
      out.metadata[`${sacrament.table}_error`] = err && err.message ? err.message : String(err);
    }
  }

  out.certificatesDiscovered = total;
  out.certificateTypes = types;
  out.lastCertificateDate = latestEpoch
    ? new Date(latestEpoch).toISOString().slice(0, 10)
    : null;
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

    const settled = await Promise.allSettled((churches || []).map(discoverChurchUsage));

    const usage = [];
    let succeeded = 0;
    let failed = 0;
    settled.forEach((s, i) => {
      if (s.status === 'fulfilled') {
        usage.push(s.value);
        if (s.value.status !== 'unavailable') succeeded += 1;
        else failed += 1;
      } else {
        failed += 1;
        const c = churches[i] || {};
        usage.push({
          churchId: String(c.id || ''),
          churchName: c.name || null,
          jurisdiction: extractJurisdiction(c.settings),
          schema: c.database_name || null,
          certificatesDiscovered: 0,
          certificateTypes: [],
          lastCertificateDate: null,
          recordsSource: 'unavailable',
          status: 'unavailable',
          metadata: { reason: 'discovery_threw', error: s.reason && s.reason.message ? s.reason.message : String(s.reason) },
        });
      }
    });

    let discoveryState = 'live';
    if (succeeded === 0 && failed > 0) discoveryState = 'unavailable';
    else if (failed > 0) discoveryState = 'partial';

    res.json({
      ok: true,
      sourceSystem: 'om',
      generatedAt: new Date().toISOString(),
      discoveryState,
      queryDescription:
        'Two-stage: enumerate active churches in orthodoxmetrics_db; ' +
        'per-church, count records in baptism_records / marriage_records / ' +
        'funeral_records (and chrismation_records when present via ' +
        'information_schema check). Settle-per-church via ' +
        'Promise.allSettled so one broken church DB does not fail the ' +
        'response.',
      usage,
      query: {
        kind: 'existing',
        sqlOrDescription: [
          "-- Stage 1 (orthodoxmetrics_db):",
          "SELECT id, name, settings, is_active, database_name FROM churches WHERE is_active = 1;",
          "",
          "-- Stage 2 (per om_church_<id>):",
          "SELECT COUNT(*), MAX(<date_col>) FROM <baptism|marriage|funeral|chrismation>_records;",
        ].join('\n'),
        limitations: [
          'Funeral counts roll up into the per-church total but are sacramental records, not certificate templates.',
          'Reception and Recognition certificates have no dedicated record table; they are not surfaced here.',
          'lastCertificateDate is the MAX across the four sacrament tables, not the global latest by certificate type.',
          'Per-church information_schema query runs on every request — consider caching once snapshot persistence lands.',
        ],
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

module.exports = router;
