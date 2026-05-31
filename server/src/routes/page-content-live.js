/**
 * Page Content Live API — DB-backed content overrides + translation status
 *
 * Serves runtime text overrides for public pages from the page_content table.
 * GET is public (anonymous visitors need overrides). PUT/DELETE require super_admin.
 *
 * Translation status tracking:
 *   When English content changes → flags el/ru/ro/ka as needs_update.
 *   When a translation is saved  → clears that language's needs_update flag.
 *
 * Mounted at /api/page-content-live
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAppPool } = require('../config/db');
const { sanitizeHtml } = require('../utils/htmlSanitizer');
const router = express.Router();

const VALID_CONTENT_TYPES = ['text', 'rich_text'];

const TRANSLATION_LANGS = ['el', 'ru', 'ro', 'ka'];
const LANG_LABELS = { el: 'Greek', ru: 'Russian', ro: 'Romanian', ka: 'Georgian' };

// ─── Translation status routes (MUST be before /:pageKey to avoid shadowing) ──

// GET /translation-status/summary/all — global summary across all pages (super_admin)
router.get('/translation-status/summary/all', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      `SELECT lang_code, COUNT(*) as count
       FROM translation_status
       WHERE needs_update = 1
       GROUP BY lang_code`
    );

    const byLanguage = {};
    let total = 0;
    for (const row of rows) {
      byLanguage[row.lang_code] = row.count;
      total += row.count;
    }

    res.json({ success: true, total_needs_update: total, by_language: byLanguage });
  } catch (err) {
    console.error('[page-content-live] translation-status summary error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

// GET /translation-status/:pageKey — get translation status for all keys on a page
router.get('/translation-status/:pageKey', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { pageKey } = req.params;
    const pool = getAppPool();
    const prefix = `${pageKey}.`;

    const [rows] = await pool.query(
      `SELECT content_key, lang_code, source_version, translation_version, needs_update, flagged_at, resolved_at
       FROM translation_status
       WHERE content_key LIKE ?`,
      [`${prefix}%`]
    );

    const statuses = {};
    let needsUpdateCount = 0;
    const keysWithFlags = new Set();

    for (const row of rows) {
      // Strip the page prefix to match the contentKey format used in the frontend
      const shortKey = row.content_key.startsWith(prefix)
        ? row.content_key.slice(prefix.length)
        : row.content_key;

      if (!statuses[shortKey]) statuses[shortKey] = {};
      statuses[shortKey][row.lang_code] = {
        needs_update: !!row.needs_update,
        source_version: row.source_version,
        translation_version: row.translation_version,
        flagged_at: row.flagged_at,
        resolved_at: row.resolved_at,
      };

      if (row.needs_update) {
        needsUpdateCount++;
        keysWithFlags.add(shortKey);
      }
    }

    res.json({
      success: true,
      statuses,
      summary: {
        total_keys: Object.keys(statuses).length,
        keys_needing_update: keysWithFlags.size,
        total_language_flags: needsUpdateCount,
      },
    });
  } catch (err) {
    console.error('[page-content-live] translation-status GET error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch translation status' });
  }
});

// PUT /translation-status/resolve — mark a translation as up-to-date for a specific language
// Body: { contentKey: "about.hero_title", langCode: "el" }
router.put('/translation-status/resolve', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { contentKey, langCode } = req.body;
    if (!contentKey || !langCode) {
      return res.status(400).json({ success: false, error: 'contentKey and langCode are required' });
    }
    if (!TRANSLATION_LANGS.includes(langCode)) {
      return res.status(400).json({ success: false, error: `langCode must be one of: ${TRANSLATION_LANGS.join(', ')}` });
    }

    const pool = getAppPool();

    // Set translation_version = source_version, clear needs_update
    await pool.query(
      `UPDATE translation_status
       SET translation_version = source_version,
           needs_update = 0,
           resolved_at = NOW()
       WHERE content_key = ? AND lang_code = ?`,
      [contentKey, langCode]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[page-content-live] translation-status resolve error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to resolve translation status' });
  }
});

// ─── Page content overrides ──────────────────────────────────────────

// PUT / — upsert a content override (super_admin only)
// Side effect: flags all non-English translations as needing update
// Accepts optional contentType: 'text' (default) or 'rich_text'
router.put('/', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { pageKey, contentKey, contentValue, contentType } = req.body;
    if (!pageKey || !contentKey || contentValue == null) {
      return res.status(400).json({ success: false, error: 'pageKey, contentKey, and contentValue are required' });
    }

    const resolvedType = contentType && VALID_CONTENT_TYPES.includes(contentType) ? contentType : 'text';
    const userId = req.session?.user?.id || null;
    const pool = getAppPool();

    // Sanitize rich_text content before persisting
    const safeValue = resolvedType === 'rich_text' ? sanitizeHtml(contentValue) : contentValue;

    // Save the content override with its type
    await pool.query(
      `INSERT INTO page_content (page_key, content_key, content_value, content_type, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE content_value = VALUES(content_value), content_type = VALUES(content_type), updated_by = VALUES(updated_by)`,
      [pageKey, contentKey, safeValue, resolvedType, userId]
    );

    // Flag translations as needing update
    const fullKey = `${pageKey}.${contentKey}`;
    await flagTranslationsNeedUpdate(pool, fullKey);

    res.json({ success: true });
  } catch (err) {
    console.error('[page-content-live] PUT error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save override' });
  }
});

// DELETE /:pageKey/:contentKey — remove an override (super_admin only)
router.delete('/:pageKey/:contentKey', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { pageKey, contentKey } = req.params;
    await getAppPool().query(
      'DELETE FROM page_content WHERE page_key = ? AND content_key = ?',
      [pageKey, contentKey]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[page-content-live] DELETE error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete override' });
  }
});

// GET /:pageKey — fetch all overrides for a page (public) — MUST be last (catch-all param)
// Returns contentTypes map for keys that are rich_text (text is the default, omitted for brevity)
router.get('/:pageKey', async (req, res) => {
  try {
    const { pageKey } = req.params;
    const [rows] = await getAppPool().query(
      'SELECT content_key, content_value, content_type FROM page_content WHERE page_key = ?',
      [pageKey]
    );
    const overrides = {};
    const contentTypes = {};
    for (const row of rows) {
      overrides[row.content_key] = row.content_value;
      if (row.content_type && row.content_type !== 'text') {
        contentTypes[row.content_key] = row.content_type;
      }
    }
    res.json({ success: true, overrides, contentTypes });
  } catch (err) {
    console.error('[page-content-live] GET error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch overrides' });
  }
});

// ─── Helper ─────────────────────────────────────────────────────────

/**
 * Flag all 4 translation languages as needing update for a content key.
 * If rows don't exist yet, creates them with source_version=1.
 * If rows exist, increments source_version and sets needs_update=1.
 */
async function flagTranslationsNeedUpdate(pool, fullKey) {
  try {
    for (const lang of TRANSLATION_LANGS) {
      await pool.query(
        `INSERT INTO translation_status (content_key, lang_code, source_version, translation_version, needs_update, flagged_at)
         VALUES (?, ?, 1, 0, 1, NOW())
         ON DUPLICATE KEY UPDATE
           source_version = source_version + 1,
           needs_update = 1,
           flagged_at = NOW()`,
        [fullKey, lang]
      );
    }
  } catch (err) {
    // Non-fatal — don't break the content save if status tracking fails
    console.error('[page-content-live] flagTranslationsNeedUpdate error:', err.message);
  }
}

module.exports = router;
