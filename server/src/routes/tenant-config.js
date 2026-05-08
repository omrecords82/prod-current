/**
 * Tenant Portal Config Registry — CRUD routes (OMOD-1502).
 *
 * Per-tenant portal configuration items per OMSD-1491 §C schema.
 * Backed by orthodoxmetrics_db.tenant_portal_config_items.
 *
 * Endpoints:
 *   POST   /api/tenant-config/list           — list rows for a church (filter by category)
 *   GET    /api/tenant-config/get/:id        — single row by id
 *   POST   /api/tenant-config/set            — upsert by (church_id, config_key)  [admin/super_admin]
 *   DELETE /api/tenant-config/delete/:id     — delete row                          [admin/super_admin]
 *
 * The platform-side read endpoint (/api/platform/tenant-config/known-slots) lives
 * in routes/platform.js — it has different auth (service-token + on-behalf-of-email).
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const VALID_CATEGORIES = [
  'portal', 'records', 'branding', 'church_profile',
  'navigation', 'permissions', 'uploads', 'analytics',
  'layout', 'notifications', 'tenant', 'auth',
];

const VALID_TENANT_SCOPES = [
  'global', 'per_church', 'per_user', 'per_role', 'per_record_type',
];

// Reasonable cap on JSON payload sizes per row to prevent runaway writes.
const MAX_JSON_FIELD_BYTES = 64 * 1024;

// ── helpers ──────────────────────────────────────────────────────────────

function parseId(raw) {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** mysql2 returns JSON columns either as parsed objects or as strings, depending
 *  on driver options. Normalize to a JS value, returning null on parse failure. */
function readJsonColumn(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return val;
}

/** Validate + serialize a JSON-shaped column on write. Returns null on null/undefined,
 *  a string ready for INSERT/UPDATE on a valid value, or throws an Error with a
 *  client-safe message on invalid input. */
function writeJsonColumn(val, fieldName) {
  if (val === undefined || val === null) return null;
  let s;
  try { s = JSON.stringify(val); }
  catch { throw new Error(`${fieldName} is not JSON-serializable`); }
  if (Buffer.byteLength(s, 'utf8') > MAX_JSON_FIELD_BYTES) {
    throw new Error(`${fieldName} exceeds ${MAX_JSON_FIELD_BYTES}-byte limit`);
  }
  return s;
}

/** Shape a DB row for the API response. */
function shapeRow(row) {
  return {
    id: row.id,
    church_id: row.church_id,
    config_key: row.config_key,
    display_name: row.display_name,
    category: row.category,
    owning_system: row.owning_system,
    target_surface: row.target_surface,
    user_roles: readJsonColumn(row.user_roles),
    tenant_scope: row.tenant_scope,
    current_source: readJsonColumn(row.current_source),
    current_behavior: row.current_behavior,
    configurable_fields: readJsonColumn(row.configurable_fields),
    layout_contract: readJsonColumn(row.layout_contract),
    dependencies: readJsonColumn(row.dependencies),
    omstudio_package_relevance: readJsonColumn(row.omstudio_package_relevance),
    gaps_or_risks: readJsonColumn(row.gaps_or_risks),
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by_user_id: row.created_by_user_id,
    updated_by_user_id: row.updated_by_user_id,
  };
}

// ── POST /api/tenant-config/list ─────────────────────────────────────────
//
// Body: { church_id: number, category?: string, include_inactive?: boolean }
// Returns: { items: [...] }

router.post('/list', requireAuth, async (req, res) => {
  try {
    const { church_id, category, include_inactive } = req.body || {};
    const churchId = parseId(church_id);
    if (!churchId) {
      return res.status(400).json({ error: 'church_id required (positive integer)' });
    }
    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `invalid category; allowed: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    const where = ['church_id = ?'];
    const params = [churchId];
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (!include_inactive) {
      where.push('is_active = 1');
    }

    const [rows] = await getAppPool().query(
      `SELECT * FROM tenant_portal_config_items
       WHERE ${where.join(' AND ')}
       ORDER BY category, config_key`,
      params,
    );

    res.json({ items: rows.map(shapeRow) });
  } catch (err) {
    console.error('[tenant-config] list error:', err);
    res.status(500).json({ error: 'Failed to list tenant config items' });
  }
});

// ── GET /api/tenant-config/get/:id ───────────────────────────────────────

router.get('/get/:id', requireAuth, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });

    const [rows] = await getAppPool().query(
      'SELECT * FROM tenant_portal_config_items WHERE id = ?',
      [id],
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });

    res.json({ item: shapeRow(rows[0]) });
  } catch (err) {
    console.error('[tenant-config] get error:', err);
    res.status(500).json({ error: 'Failed to fetch tenant config item' });
  }
});

// ── POST /api/tenant-config/set ──────────────────────────────────────────
//
// Upsert by natural key (church_id, config_key). Body shape mirrors §C plus id
// (optional — if present, behaves as an update by primary key for that single
// row; otherwise UPSERT semantics on the natural key).

router.post('/set', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const b = req.body || {};
    const churchId = parseId(b.church_id);
    const configKey = typeof b.config_key === 'string' ? b.config_key.trim() : '';

    if (!churchId) return res.status(400).json({ error: 'church_id required' });
    if (!configKey) return res.status(400).json({ error: 'config_key required' });
    if (configKey.length > 255) {
      return res.status(400).json({ error: 'config_key too long (max 255)' });
    }
    if (!VALID_CATEGORIES.includes(b.category)) {
      return res.status(400).json({
        error: `category required; allowed: ${VALID_CATEGORIES.join(', ')}`,
      });
    }
    const tenantScope = b.tenant_scope || 'per_church';
    if (!VALID_TENANT_SCOPES.includes(tenantScope)) {
      return res.status(400).json({
        error: `invalid tenant_scope; allowed: ${VALID_TENANT_SCOPES.join(', ')}`,
      });
    }

    let userRolesJson, currentSourceJson, configurableFieldsJson,
        layoutContractJson, dependenciesJson, omstudioRelevanceJson, gapsJson;
    try {
      userRolesJson           = writeJsonColumn(b.user_roles,                  'user_roles');
      currentSourceJson       = writeJsonColumn(b.current_source,              'current_source');
      configurableFieldsJson  = writeJsonColumn(b.configurable_fields,         'configurable_fields');
      layoutContractJson      = writeJsonColumn(b.layout_contract,             'layout_contract');
      dependenciesJson        = writeJsonColumn(b.dependencies,                'dependencies');
      omstudioRelevanceJson   = writeJsonColumn(b.omstudio_package_relevance,  'omstudio_package_relevance');
      gapsJson                = writeJsonColumn(b.gaps_or_risks,               'gaps_or_risks');
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    // Ensure the church actually exists — protects FK invariant and gives a
    // cleaner error than the InnoDB FK violation surface.
    const [churchCheck] = await getAppPool().query(
      'SELECT id FROM churches WHERE id = ? LIMIT 1', [churchId],
    );
    if (!churchCheck.length) {
      return res.status(400).json({ error: `church_id ${churchId} does not exist` });
    }

    const userId = req.session?.user?.id || req.user?.userId || req.user?.id || null;

    const [result] = await getAppPool().query(
      `INSERT INTO tenant_portal_config_items (
         church_id, config_key, display_name, category, owning_system,
         target_surface, user_roles, tenant_scope, current_source,
         current_behavior, configurable_fields, layout_contract,
         dependencies, omstudio_package_relevance, gaps_or_risks,
         is_active, created_by_user_id, updated_by_user_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         display_name = VALUES(display_name),
         category = VALUES(category),
         owning_system = VALUES(owning_system),
         target_surface = VALUES(target_surface),
         user_roles = VALUES(user_roles),
         tenant_scope = VALUES(tenant_scope),
         current_source = VALUES(current_source),
         current_behavior = VALUES(current_behavior),
         configurable_fields = VALUES(configurable_fields),
         layout_contract = VALUES(layout_contract),
         dependencies = VALUES(dependencies),
         omstudio_package_relevance = VALUES(omstudio_package_relevance),
         gaps_or_risks = VALUES(gaps_or_risks),
         is_active = VALUES(is_active),
         updated_by_user_id = VALUES(updated_by_user_id)`,
      [
        churchId,
        configKey,
        b.display_name || null,
        b.category,
        b.owning_system || 'OM',
        b.target_surface || null,
        userRolesJson,
        tenantScope,
        currentSourceJson,
        b.current_behavior || null,
        configurableFieldsJson,
        layoutContractJson,
        dependenciesJson,
        omstudioRelevanceJson,
        gapsJson,
        b.is_active === false ? 0 : 1,
        userId,
        userId,
      ],
    );

    // Fetch the resulting row by natural key — works for both INSERT and UPDATE.
    const [rows] = await getAppPool().query(
      'SELECT * FROM tenant_portal_config_items WHERE church_id = ? AND config_key = ?',
      [churchId, configKey],
    );

    res.json({
      item: shapeRow(rows[0]),
      action: result.affectedRows === 1 ? 'inserted' : 'updated',
    });
  } catch (err) {
    console.error('[tenant-config] set error:', err);
    res.status(500).json({ error: 'Failed to upsert tenant config item' });
  }
});

// ── DELETE /api/tenant-config/delete/:id ─────────────────────────────────

router.delete('/delete/:id', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });

    const [result] = await getAppPool().query(
      'DELETE FROM tenant_portal_config_items WHERE id = ?',
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'not found' });
    }
    res.json({ ok: true, deleted_id: id });
  } catch (err) {
    console.error('[tenant-config] delete error:', err);
    res.status(500).json({ error: 'Failed to delete tenant config item' });
  }
});

module.exports = router;
