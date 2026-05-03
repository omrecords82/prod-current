'use strict';

/**
 * GET /api/churches/:churchId/clergy-tenure
 *
 * Returns how many years the authenticated user has appeared as
 * clergy in this church's records — i.e., the difference between
 * the current year and the earliest year their name shows up in
 * any of the three sacrament tables (baptism / marriage / funeral).
 *
 * Used by the portal hub to render "Rector at <church> for N years"
 * under the welcome header. Returns { years: null } when no records
 * mention the user — e.g. a lay admin viewing the page.
 *
 * Auth required. Matches against the user's last_name (and falls back
 * to first_name if last_name is missing) using a LIKE %name%. The
 * clergy column on records typically reads "Rev. James Parsells",
 * while users.first_name for that user is "Fr James" — so first-name
 * matching alone doesn't work. Last-name match is more robust.
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { getAppPool } = require('../config/db-compat');
const { getChurchPool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    if (!Number.isFinite(churchId) || churchId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid church id' });
    }

    // Permit only members of this church (or platform admins) to query.
    const role = req.user && req.user.role;
    const userChurchId = req.user && req.user.church_id;
    const isPlatformAdmin = role === 'super_admin' || role === 'admin';
    if (!isPlatformAdmin && userChurchId !== churchId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const lastName = (req.user && (req.user.last_name || '')) || '';
    const firstName = (req.user && (req.user.first_name || '')) || '';
    const matchTerm = (lastName.trim() || firstName.trim() || '').trim();
    if (!matchTerm) {
      return res.json({ success: true, data: { years: null, reason: 'no_user_name' } });
    }

    // Verify the church exists + has a tenant DB before querying it.
    const [churchRows] = await getAppPool().query(
      'SELECT id, name, church_name, database_name FROM churches WHERE id = ? LIMIT 1',
      [churchId],
    );
    if (!churchRows.length || !churchRows[0].database_name) {
      return res.status(404).json({ success: false, error: 'Church not found or has no tenant DB' });
    }
    const churchName = churchRows[0].church_name || churchRows[0].name || null;

    const tenantPool = getChurchPool(churchId);
    const like = `%${matchTerm}%`;

    // Earliest year across the three tables. Each query is wrapped so
    // a missing column (e.g. unusual schema variant) just yields null
    // for that table rather than failing the whole response.
    async function safeMin(sql) {
      try {
        const [rows] = await tenantPool.query(sql, [like]);
        const v = rows && rows[0] && rows[0].y;
        return v == null ? null : Number(v);
      } catch {
        return null;
      }
    }

    const [yBaptism, yMarriage, yFuneral] = await Promise.all([
      safeMin('SELECT MIN(YEAR(reception_date)) AS y FROM baptism_records WHERE clergy LIKE ?'),
      safeMin('SELECT MIN(YEAR(mdate)) AS y FROM marriage_records WHERE clergy LIKE ?'),
      safeMin('SELECT MIN(YEAR(deceased_date)) AS y FROM funeral_records WHERE clergy LIKE ?'),
    ]);

    const candidates = [yBaptism, yMarriage, yFuneral].filter((y) => Number.isFinite(y));
    if (candidates.length === 0) {
      return res.json({
        success: true,
        data: { years: null, reason: 'no_matches', matchTerm, churchName },
      });
    }

    const firstYear = Math.min(...candidates);
    const currentYear = new Date().getUTCFullYear();
    const years = Math.max(0, currentYear - firstYear);

    res.json({
      success: true,
      data: {
        years,
        firstYear,
        currentYear,
        churchName,
        matchTerm,
      },
    });
  } catch (err) {
    console.error('[clergy-tenure] error:', err && err.message ? err.message : err);
    res.status(500).json({ success: false, error: 'Failed to compute clergy tenure' });
  }
});

module.exports = router;
