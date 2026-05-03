'use strict';

/**
 * /api/church-branding/header/:churchId
 *
 * Lightweight church-metadata endpoint used by the front-end's
 * ChurchContext to render the church header (name, logo, theme color,
 * calendar type) on every page that loads church-scoped data.
 *
 * The front-end has been calling this path since long before this
 * router existed — the only mount under "/church-branding" was a
 * static-file server for uploaded logos, with no "/api" prefix. So
 * every page that initialised ChurchContext logged a "Failed to fetch
 * church data" 404 in the console. Harmless (ChurchContext fell back
 * to "System Admin" defaults), but noisy.
 *
 * Schema-shape mapping:
 *   churches.id              -> church_id
 *   churches.church_name     -> church_name
 *   churches.name            -> church_name_display (operators have set
 *                               either column over the years)
 *   churches.logo_path       -> logo_url
 *   churches.primary_color   -> primary_theme_color
 *   churches.database_name   -> database_name
 *   churches.calendar_type   -> calendar_type
 *
 * Read-only. requireAuth so we don't hand church metadata out to
 * anonymous callers (matches the rest of /api/churches/*).
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db-compat');
const { requireAuth } = require('../middleware/auth');

router.get('/header/:churchId', requireAuth, async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    if (!Number.isFinite(churchId) || churchId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid church id' });
    }

    const [rows] = await getAppPool().query(
      `SELECT id           AS church_id,
              church_name  AS church_name,
              name         AS church_name_display,
              logo_path    AS logo_url,
              primary_color AS primary_theme_color,
              database_name,
              calendar_type
         FROM churches
        WHERE id = ?
        LIMIT 1`,
      [churchId],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Church not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[church-branding] /header error:', err && err.message ? err.message : err);
    res.status(500).json({ success: false, error: 'Failed to load church metadata' });
  }
});

module.exports = router;
