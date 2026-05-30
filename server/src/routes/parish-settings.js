/**
 * Parish Settings API — per-church key/value configuration store.
 *
 * Table: parish_settings (platform DB)
 * Categories: mapping, theme, ui, search, system, branding
 *
 * GET  /api/parish-settings/:churchId              → all settings grouped by category
 * GET  /api/parish-settings/:churchId/:category     → settings for one category
 * POST /api/parish-settings/:churchId               → upsert settings (category + settings object)
 * PATCH /api/parish-settings/:churchId/:category    → partial update within a category
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { getAppPool } = require('../config/db');
const recordTableConfig = require('../services/recordTableConfig');

const VALID_CATEGORIES = ['mapping', 'theme', 'ui', 'search', 'system', 'branding'];

// Record type → physical table name. Restricting to this fixed set means the
// columns endpoint can never be used to introspect arbitrary tables.
const RECORD_TABLE_BY_TYPE = {
  baptism: 'baptism_records',
  marriage: 'marriage_records',
  funeral: 'funeral_records',
};

// ── Helpers ────────────────────────────────────────────────

function validateCategory(category) {
  return VALID_CATEGORIES.includes(category);
}

function parseChurchId(raw) {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Parse JSON value from DB — mysql2 may return string or already-parsed object */
function parseJsonValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

// ── GET /api/parish-settings/:churchId ─────────────────────
// Returns all settings grouped: { mapping: { key: value }, theme: { ... } }

router.get('/:churchId', async (req, res) => {
  try {
    const churchId = parseChurchId(req.params.churchId);
    if (!churchId) return res.status(400).json({ error: 'Invalid church_id' });

    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT category, setting_key, value FROM parish_settings WHERE church_id = ?',
      [churchId]
    );

    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = {};
      grouped[row.category][row.setting_key] = parseJsonValue(row.value);
    }

    res.json({ church_id: churchId, settings: grouped });
  } catch (err) {
    console.error('[parish-settings] GET all error:', err);
    res.status(500).json({ error: 'Failed to fetch parish settings' });
  }
});

// ── GET /api/parish-settings/:churchId/:category ───────────

router.get('/:churchId/:category', async (req, res) => {
  try {
    const churchId = parseChurchId(req.params.churchId);
    if (!churchId) return res.status(400).json({ error: 'Invalid church_id' });

    const { category } = req.params;
    if (!validateCategory(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT setting_key, value FROM parish_settings WHERE church_id = ? AND category = ?',
      [churchId, category]
    );

    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = parseJsonValue(row.value);
    }

    res.json({ church_id: churchId, category, settings });
  } catch (err) {
    console.error(`[parish-settings] GET ${req.params.category} error:`, err);
    res.status(500).json({ error: 'Failed to fetch parish settings' });
  }
});

// ── GET /api/parish-settings/:churchId/record-columns/:recordType ──
// Returns the live column list for a church's record table so the Database
// Mapping wizard can build its field list from the real schema instead of a
// hardcoded one. recordType ∈ {baptism, marriage, funeral}.

router.get('/:churchId/record-columns/:recordType', async (req, res) => {
  try {
    const churchId = parseChurchId(req.params.churchId);
    if (!churchId) return res.status(400).json({ error: 'Invalid church_id' });

    const tableName = RECORD_TABLE_BY_TYPE[req.params.recordType];
    if (!tableName) {
      return res.status(400).json({
        error: `Invalid recordType. Must be one of: ${Object.keys(RECORD_TABLE_BY_TYPE).join(', ')}`,
      });
    }

    const columns = await recordTableConfig.getTableColumns(churchId, tableName);
    if (!columns) {
      return res.status(404).json({ error: `Table ${tableName} not found for church ${churchId}` });
    }

    res.json({ church_id: churchId, recordType: req.params.recordType, table: tableName, columns });
  } catch (err) {
    console.error('[parish-settings] GET record-columns error:', err);
    res.status(500).json({ error: 'Failed to fetch record columns' });
  }
});

// ── POST /api/parish-settings/:churchId ────────────────────
// Body: { category: "mapping", settings: { key1: value1, key2: value2 } }
// Upserts each key within the category.

router.post('/:churchId', async (req, res) => {
  try {
    const churchId = parseChurchId(req.params.churchId);
    if (!churchId) return res.status(400).json({ error: 'Invalid church_id' });

    const { category, settings } = req.body;
    if (!category || !validateCategory(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings must be a non-null object' });
    }

    const pool = getAppPool();
    const entries = Object.entries(settings);
    if (entries.length === 0) {
      return res.status(400).json({ error: 'settings object is empty' });
    }

    // Upsert each key — JSON.stringify the value for the JSON column
    const upsertSQL = `
      INSERT INTO parish_settings (church_id, category, setting_key, value)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP
    `;

    for (const [key, value] of entries) {
      await pool.query(upsertSQL, [churchId, category, key, JSON.stringify(value)]);
    }

    res.json({ success: true, church_id: churchId, category, keys_saved: entries.length });
  } catch (err) {
    console.error('[parish-settings] POST error:', err);
    res.status(500).json({ error: 'Failed to save parish settings' });
  }
});

// ── PATCH /api/parish-settings/:churchId/:category ─────────
// Body: { key1: value1, key2: value2 }
// Partial update — only touches keys present in body.

router.patch('/:churchId/:category', async (req, res) => {
  try {
    const churchId = parseChurchId(req.params.churchId);
    if (!churchId) return res.status(400).json({ error: 'Invalid church_id' });

    const { category } = req.params;
    if (!validateCategory(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    const settings = req.body;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'Body must be a non-null object of key-value pairs' });
    }

    const entries = Object.entries(settings);
    if (entries.length === 0) {
      return res.status(400).json({ error: 'No settings provided' });
    }

    const pool = getAppPool();
    const upsertSQL = `
      INSERT INTO parish_settings (church_id, category, setting_key, value)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP
    `;

    for (const [key, value] of entries) {
      await pool.query(upsertSQL, [churchId, category, key, JSON.stringify(value)]);
    }

    res.json({ success: true, church_id: churchId, category, keys_updated: entries.length });
  } catch (err) {
    console.error(`[parish-settings] PATCH ${req.params.category} error:`, err);
    res.status(500).json({ error: 'Failed to update parish settings' });
  }
});

module.exports = router;
