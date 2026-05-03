const express = require('express');
const { getAppPool } = require('../config/db-compat');
const { getTenantPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LOOKUP API — Canonical namespace for all dropdown/lookup data
// Mounted at /api/lookup
// ═══════════════════════════════════════════════════════════════

// Use the canonical requireAuth middleware (session OR JWT) instead of
// a session-only check. The previous router-level session guard 401'd
// any caller authenticated by JWT — which was happening intermittently
// for the records edit dialog's clergy fetch.
router.use(requireAuth);

// ───────────────────────────────────────────────────────────────
// GET /api/lookup/clergy
// Query params:
//   church_id    (required — or falls back to session)
//   record_type  (optional: baptism | marriage | funeral — defaults to all)
//   search       (optional: contains match on clergy name)
//   limit        (optional: default 100, max 500)
// ───────────────────────────────────────────────────────────────

const CLERGY_TABLE_MAP = {
    baptism:  { table: 'baptism_records',  column: 'clergy' },
    marriage: { table: 'marriage_records',  column: 'clergy' },
    funeral:  { table: 'funeral_records',   column: 'clergy' },
};

router.get('/clergy', async (req, res) => {
    try {
        const churchId = req.query.church_id
            || req.session?.user?.church_id
            || req.user?.church_id;
        if (!churchId) {
            return res.status(400).json({ error: 'church_id is required (query param or session)' });
        }

        const recordType = req.query.record_type || null;
        const search = (req.query.search || '').trim();
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);

        // Validate record_type if provided
        if (recordType && !CLERGY_TABLE_MAP[recordType]) {
            return res.status(400).json({ error: `Invalid record_type: ${recordType}. Must be one of: baptism, marriage, funeral` });
        }

        // Determine which tables to query
        const tablesToQuery = recordType
            ? [CLERGY_TABLE_MAP[recordType]]
            : Object.values(CLERGY_TABLE_MAP);

        // Build UNION ALL query across selected tables for COUNT + DISTINCT
        const unionParts = [];
        const params = [];

        for (const { table, column } of tablesToQuery) {
            unionParts.push(`SELECT ${column} AS clergy_name FROM ${table} WHERE church_id = ? AND ${column} IS NOT NULL AND ${column} != '' AND ${column} != 'N/A'`);
            params.push(churchId);
        }

        // Wrap in a subquery to get DISTINCT names with counts
        let sql = `
            SELECT clergy_name, COUNT(*) AS cnt
            FROM (${unionParts.join(' UNION ALL ')}) AS combined
        `;

        // Optional search filter
        if (search) {
            sql += ` WHERE clergy_name LIKE ?`;
            params.push(`%${search}%`);
        }

        sql += ` GROUP BY clergy_name ORDER BY cnt DESC, clergy_name ASC LIMIT ?`;
        params.push(limit);

        const tenantPool = getTenantPool(churchId);
        const [rows] = await tenantPool.query(sql, params);

        const items = rows.map(row => ({
            value: row.clergy_name,
            label: row.clergy_name,
            count: row.cnt,
        }));

        res.json({
            items,
            meta: {
                church_id: parseInt(churchId),
                record_type: recordType || 'all',
                limit,
                total: items.length,
            }
        });
    } catch (error) {
        console.error('[Lookup] Error fetching clergy:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
