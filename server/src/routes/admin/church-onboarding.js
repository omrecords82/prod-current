// server/src/routes/admin/church-onboarding.js — Church onboarding pipeline (Phase 2)
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getAppPool } = require('../../config/db');
const { requireRole } = require('../../middleware/auth');
const { provisionTenantDb } = require('../../services/tenantProvisioning');

const ADMIN_ROLES = ['super_admin', 'admin'];

// GET /api/admin/church-onboarding/pipeline — All churches with onboarding status
router.get('/pipeline', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();

    const [churches] = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.church_name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state_province,
        c.country,
        c.jurisdiction,
        c.website,
        c.db_name,
        c.database_name,
        c.is_active,
        c.setup_complete,
        c.onboarding_phase,
        c.crm_lead_id,
        c.has_baptism_records,
        c.has_marriage_records,
        c.has_funeral_records,
        c.rector_name,
        c.calendar_type,
        c.notes,
        c.created_at,
        c.last_login_at,
        COALESCE(tok.active_token_count, 0)   AS active_tokens,
        COALESCE(usr.total_users, 0)           AS total_users,
        COALESCE(usr.active_users, 0)          AS active_users,
        COALESCE(usr.pending_users, 0)         AS pending_users,
        ep.enrichment_status,
        ep.established_year,
        ep.size_category,
        ep.established_confidence,
        ep.size_confidence
      FROM churches c
      LEFT JOIN (
        SELECT church_id, COUNT(*) AS active_token_count
        FROM church_registration_tokens
        WHERE is_active = 1
        GROUP BY church_id
      ) tok ON tok.church_id = c.id
      LEFT JOIN (
        SELECT
          church_id,
          COUNT(*)                                              AS total_users,
          SUM(CASE WHEN is_locked = 0 THEN 1 ELSE 0 END)      AS active_users,
          SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END)      AS pending_users
        FROM users
        WHERE church_id IS NOT NULL
        GROUP BY church_id
      ) usr ON usr.church_id = c.id
      LEFT JOIN church_enrichment_profiles ep ON ep.church_id = c.id
      ORDER BY c.created_at DESC
    `);

    // Derive onboarding_stage for each church
    const pipeline = churches.map(ch => {
      let onboarding_stage;
      if (ch.setup_complete === 1) {
        onboarding_stage = 'setup_complete';
      } else if (ch.active_users > 0) {
        onboarding_stage = 'active';
      } else if (ch.pending_users > 0) {
        onboarding_stage = 'members_joining';
      } else if (ch.active_tokens > 0) {
        onboarding_stage = 'token_issued';
      } else {
        onboarding_stage = 'new';
      }

      return {
        id: ch.id,
        name: ch.name || ch.church_name,
        email: ch.email,
        phone: ch.phone,
        address: ch.address,
        city: ch.city,
        state_province: ch.state_province,
        country: ch.country,
        jurisdiction: ch.jurisdiction,
        website: ch.website,
        db_name: ch.db_name || ch.database_name,
        is_active: ch.is_active,
        setup_complete: ch.setup_complete,
        onboarding_phase: ch.onboarding_phase,
        crm_lead_id: ch.crm_lead_id,
        has_baptism_records: ch.has_baptism_records,
        has_marriage_records: ch.has_marriage_records,
        has_funeral_records: ch.has_funeral_records,
        rector_name: ch.rector_name,
        calendar_type: ch.calendar_type,
        notes: ch.notes,
        created_at: ch.created_at,
        last_login_at: ch.last_login_at,
        active_token_count: ch.active_tokens,
        total_users: ch.total_users,
        active_users: ch.active_users,
        pending_users: ch.pending_users,
        enrichment_status: ch.enrichment_status,
        established_year: ch.established_year,
        size_category: ch.size_category,
        established_confidence: ch.established_confidence,
        size_confidence: ch.size_confidence,
        onboarding_stage
      };
    });

    res.json({ success: true, churches: pipeline });
  } catch (error) {
    console.error('Failed to load onboarding pipeline:', error);
    res.status(500).json({ success: false, message: 'Failed to load onboarding pipeline.' });
  }
});

// GET /api/admin/church-onboarding/tokens — All tokens across all churches
router.get('/tokens', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();

    const [tokens] = await pool.query(`
      SELECT
        crt.id,
        crt.church_id,
        c.name          AS church_name,
        crt.token,
        crt.is_active,
        crt.created_at,
        creator.email   AS created_by_email,
        COALESCE(usage.usage_count, 0) AS usage_count
      FROM church_registration_tokens crt
      JOIN churches c ON crt.church_id = c.id
      LEFT JOIN users creator ON crt.created_by = creator.id
      LEFT JOIN (
        SELECT church_id, COUNT(*) AS usage_count
        FROM users
        WHERE lockout_reason LIKE '%church token%'
        GROUP BY church_id
      ) usage ON usage.church_id = crt.church_id
      ORDER BY crt.created_at DESC
    `);

    res.json({ success: true, tokens });
  } catch (error) {
    console.error('Failed to load onboarding tokens:', error);
    res.status(500).json({ success: false, message: 'Failed to load onboarding tokens.' });
  }
});

// POST /api/admin/church-onboarding/:churchId/send-token — Generate token + registration URL
router.post('/:churchId/send-token', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const currentUser = req.user || req.session?.user;

    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID.' });
    }

    const pool = getAppPool();

    // Verify church exists
    const [churches] = await pool.query('SELECT id, name FROM churches WHERE id = ?', [churchId]);
    if (churches.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    const church = churches[0];

    // Deactivate existing active tokens for this church
    await pool.query(
      'UPDATE church_registration_tokens SET is_active = 0 WHERE church_id = ?',
      [churchId]
    );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'INSERT INTO church_registration_tokens (church_id, token, created_by) VALUES (?, ?, ?)',
      [churchId, token, currentUser?.id || 0]
    );

    // Build registration URL
    const encodedChurchName = encodeURIComponent(church.name);
    const registrationUrl = `https://orthodoxmetrics.com/auth/register?token=${token}&church=${encodedChurchName}`;

    console.log(`Registration token generated for church ${church.name} (ID: ${churchId}) with URL`);

    res.json({
      success: true,
      token,
      church_id: churchId,
      church_name: church.name,
      registration_url: registrationUrl,
      message: `Registration token generated for ${church.name}.`
    });
  } catch (error) {
    console.error('Failed to generate registration token:', error);
    res.status(500).json({ success: false, message: 'Failed to generate registration token.' });
  }
});

// ---------------------------------------------------------------------------
// Phase 3 endpoints
// ---------------------------------------------------------------------------

// GET /api/admin/church-onboarding/:churchId/detail — Comprehensive onboarding detail
router.get('/:churchId/detail', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID.' });
    }

    const pool = getAppPool();

    // Church info
    const [churches] = await pool.query(
      `SELECT id, name, email, phone, address, city, state_province, country,
              jurisdiction, is_active, setup_complete, created_at, website, db_name, notes
       FROM churches WHERE id = ?`,
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    const church = churches[0];

    // Members (users) for this church
    const [members] = await pool.query(
      `SELECT id, email, first_name, last_name, full_name, role, is_locked, lockout_reason, created_at
       FROM users WHERE church_id = ?
       ORDER BY created_at DESC`,
      [churchId]
    );

    // Tokens for this church (with creator email)
    const [tokens] = await pool.query(
      `SELECT crt.id, crt.token, crt.is_active, crt.created_at, u.email AS created_by
       FROM church_registration_tokens crt
       LEFT JOIN users u ON crt.created_by = u.id
       WHERE crt.church_id = ?
       ORDER BY crt.created_at DESC`,
      [churchId]
    );

    // Derive onboarding_stage
    const activeUsers = members.filter(m => m.is_locked === 0).length;
    const pendingUsers = members.filter(m => m.is_locked === 1).length;
    const activeTokens = tokens.filter(t => t.is_active === 1).length;

    let onboarding_stage;
    if (church.setup_complete === 1) {
      onboarding_stage = 'setup_complete';
    } else if (activeUsers > 0) {
      onboarding_stage = 'active';
    } else if (pendingUsers > 0) {
      onboarding_stage = 'members_joining';
    } else if (activeTokens > 0) {
      onboarding_stage = 'token_issued';
    } else {
      onboarding_stage = 'new';
    }

    // Derive checklist
    const checklist = {
      church_created: true,
      token_issued: tokens.length > 0,
      members_registered: members.length > 0,
      members_active: activeUsers > 0,
      setup_complete: church.setup_complete === 1
    };

    res.json({
      success: true,
      church,
      members,
      tokens,
      onboarding_stage,
      checklist
    });
  } catch (error) {
    console.error('Failed to load church onboarding detail:', error);
    res.status(500).json({ success: false, message: 'Failed to load church onboarding detail.' });
  }
});

// POST /api/admin/church-onboarding/:churchId/toggle-setup — Toggle setup_complete flag
router.post('/:churchId/toggle-setup', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID.' });
    }

    const pool = getAppPool();

    const [churches] = await pool.query('SELECT id, setup_complete FROM churches WHERE id = ?', [churchId]);
    if (churches.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    const newValue = churches[0].setup_complete === 1 ? 0 : 1;
    await pool.query('UPDATE churches SET setup_complete = ? WHERE id = ?', [newValue, churchId]);

    res.json({ success: true, setup_complete: newValue });
  } catch (error) {
    console.error('Failed to toggle setup_complete:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle setup_complete.' });
  }
});

// POST /api/admin/church-onboarding/:churchId/update-notes — Update church notes
router.post('/:churchId/update-notes', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID.' });
    }

    const { notes } = req.body;
    if (typeof notes !== 'string') {
      return res.status(400).json({ success: false, message: 'Notes must be a string.' });
    }

    const pool = getAppPool();

    const [churches] = await pool.query('SELECT id FROM churches WHERE id = ?', [churchId]);
    if (churches.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    await pool.query('UPDATE churches SET notes = ? WHERE id = ?', [notes, churchId]);

    res.json({ success: true, notes });
  } catch (error) {
    console.error('Failed to update church notes:', error);
    res.status(500).json({ success: false, message: 'Failed to update church notes.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PHASE PROMOTION — Move churches between onboarding phases
// ═══════════════════════════════════════════════════════════════

// POST /api/admin/church-onboarding/promote — Single church phase promotion
router.post('/promote', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { church_id, from_phase, to_phase } = req.body;
    if (!church_id || !from_phase || !to_phase) {
      return res.status(400).json({ success: false, message: 'church_id, from_phase, to_phase required.' });
    }
    if (to_phase !== from_phase + 1) {
      return res.status(400).json({ success: false, message: 'Can only promote one phase at a time.' });
    }

    const pool = getAppPool();
    const [rows] = await pool.query('SELECT id, name, onboarding_phase, db_name, database_name FROM churches WHERE id = ?', [church_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Church not found.' });

    const church = rows[0];
    if (church.onboarding_phase !== from_phase) {
      return res.status(409).json({ success: false, message: `Church is currently phase ${church.onboarding_phase}, not ${from_phase}.` });
    }

    // Phase-specific actions
    let dbCreated = false;
    if (from_phase === 1 && to_phase === 2) {
      // Phase 1→2: Create tenant database from approved template
      const provResult = await provisionTenantDb(church.id, pool, { allowExisting: true, source: 'onboarding', initiatedBy: req.session?.user?.id });
      if (!provResult.success) {
        return res.status(500).json({ success: false, message: `Tenant DB provisioning failed: ${provResult.error}` });
      }
      dbCreated = provResult.dbCreated;
    }

    await pool.query('UPDATE churches SET onboarding_phase = ? WHERE id = ?', [to_phase, church.id]);

    console.log(`[Onboarding] Church ${church.id} (${church.name}) promoted: phase ${from_phase} → ${to_phase}${dbCreated ? ' + tenant DB created' : ''}`);
    res.json({ success: true, church_id: church.id, from_phase, to_phase, db_created: dbCreated });
  } catch (error) {
    console.error('Failed to promote church:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to promote church.' });
  }
});

// POST /api/admin/church-onboarding/batch-promote — Batch promote churches between phases
router.post('/batch-promote', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { from_phase, to_phase } = req.body;
    if (from_phase == null || to_phase == null) {
      return res.status(400).json({ success: false, message: 'from_phase and to_phase required.' });
    }
    if (to_phase !== from_phase + 1) {
      return res.status(400).json({ success: false, message: 'Can only promote one phase at a time.' });
    }

    const pool = getAppPool();

    // Get all churches at from_phase
    const [churches] = await pool.query(
      'SELECT id, name, db_name, database_name FROM churches WHERE onboarding_phase = ?',
      [from_phase]
    );

    if (!churches.length) {
      return res.json({ success: true, promoted: 0, results: [], message: 'No churches at this phase.' });
    }

    const results = [];

    for (const church of churches) {
      try {
        let dbCreated = false;

        // Phase-specific actions
        if (from_phase === 1 && to_phase === 2) {
          const existingDb = church.db_name || church.database_name;
          if (!existingDb) {
            const provResult = await provisionTenantDb(church.id, pool, { allowExisting: true, source: 'onboarding', initiatedBy: req.session?.user?.id });
            if (!provResult.success) {
              throw new Error(provResult.error);
            }
            dbCreated = provResult.dbCreated;
          }
        }

        await pool.query('UPDATE churches SET onboarding_phase = ? WHERE id = ?', [to_phase, church.id]);
        results.push({ id: church.id, name: church.name, success: true, db_created: dbCreated });
      } catch (err) {
        console.error(`[Onboarding] Failed to promote church ${church.id}:`, err.message);
        results.push({ id: church.id, name: church.name, success: false, error: err.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`[Onboarding] Batch promote phase ${from_phase} → ${to_phase}: ${succeeded} succeeded, ${failed} failed out of ${churches.length}`);

    res.json({
      success: true,
      promoted: succeeded,
      failed,
      total: churches.length,
      results,
    });
  } catch (error) {
    console.error('Failed batch promote:', error);
    res.status(500).json({ success: false, message: error.message || 'Batch promote failed.' });
  }
});

// provisionSingleTenantDb — REMOVED
// Replaced by tenantProvisioning service (server/src/services/tenantProvisioning.js)
// which provides template validation, verification, rollback, and structured logging.

// ═══════════════════════════════════════════════════════════════
// PHASE 1 BATCH STAGING — Create bare-minimum church rows from CRM leads
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/church-onboarding/phase1/candidates — Preview OCA NY/NJ leads eligible for staging
router.get('/phase1/candidates', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const [leads] = await pool.query(`
      SELECT cl.id, cl.name, cl.street, cl.city, cl.state_code, cl.zip,
             cl.phone, cl.website, cl.latitude, cl.longitude,
             cl.jurisdiction, cl.jurisdiction_id, cl.pipeline_stage,
             cl.is_client, cl.provisioned_church_id
      FROM omai_crm_leads cl
      WHERE cl.jurisdiction = 'OCA'
        AND cl.state_code IN ('NY', 'NJ')
        AND cl.provisioned_church_id IS NULL
        AND cl.id NOT IN (SELECT crm_lead_id FROM churches WHERE crm_lead_id IS NOT NULL)
      ORDER BY cl.state_code, cl.city, cl.name
    `);
    res.json({ success: true, candidates: leads, count: leads.length });
  } catch (err) {
    console.error('Phase1 candidates error:', err);
    res.status(500).json({ success: false, error: 'Failed to load candidates' });
  }
});

// POST /api/admin/church-onboarding/phase1/batch-stage — Batch create Phase 1 church rows
// Body: { lead_ids?: number[], state?: string, jurisdiction?: string }
router.post('/phase1/batch-stage', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const { lead_ids, state, jurisdiction } = req.body;

    // Build scope-aware eligibility query
    const jur = jurisdiction || 'OCA';
    const conditions = ['cl.jurisdiction = ?'];
    const params = [jur];

    // State scope: accept comma-separated or default to all states
    if (state) {
      const states = String(state).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (states.length > 0) {
        conditions.push(`cl.state_code IN (${states.map(() => '?').join(',')})`);
        params.push(...states);
      }
    }

    conditions.push('cl.provisioned_church_id IS NULL');
    conditions.push('cl.id NOT IN (SELECT crm_lead_id FROM churches WHERE crm_lead_id IS NOT NULL)');

    let query = `
      SELECT cl.id, cl.name, cl.street, cl.city, cl.state_code, cl.zip,
             cl.phone, cl.website, cl.latitude, cl.longitude,
             cl.jurisdiction, cl.jurisdiction_id
      FROM omai_crm_leads cl
      WHERE ${conditions.join(' AND ')}
    `;

    if (Array.isArray(lead_ids) && lead_ids.length > 0) {
      query += ` AND cl.id IN (${lead_ids.map(() => '?').join(',')})`;
      params.push(...lead_ids.map(id => parseInt(id)));
    }

    query += ' ORDER BY cl.state_code, cl.city, cl.name';

    const [leads] = await pool.query(query, params);

    if (leads.length === 0) {
      return res.json({ success: true, staged: 0, message: 'No eligible leads to stage' });
    }

    const staged = [];
    const errors = [];

    for (const lead of leads) {
      try {
        // Generate placeholder email (unique constraint on churches.email)
        const placeholderEmail = `onboarding-${lead.id}@placeholder.orthodoxmetrics.com`;

        const [result] = await pool.query(
          `INSERT INTO churches (
            name, church_name, email, phone, address, city, state_province, postal_code, country,
            website, jurisdiction, jurisdiction_id, latitude, longitude,
            is_active, onboarding_phase, crm_lead_id,
            has_baptism_records, has_marriage_records, has_funeral_records, setup_complete
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'US', ?, ?, ?, ?, ?, 0, 1, ?, 0, 0, 0, 0)`,
          [
            lead.name, lead.name, placeholderEmail, lead.phone, lead.street, lead.city, lead.state_code,
            lead.zip, lead.website, lead.jurisdiction, lead.jurisdiction_id,
            lead.latitude, lead.longitude, lead.id
          ]
        );

        const churchId = result.insertId;

        // Link CRM lead back to the new church
        await pool.query(
          'UPDATE omai_crm_leads SET provisioned_church_id = ? WHERE id = ?',
          [churchId, lead.id]
        );

        staged.push({ church_id: churchId, crm_lead_id: lead.id, name: lead.name });
      } catch (insertErr) {
        errors.push({ crm_lead_id: lead.id, name: lead.name, error: insertErr.message });
      }
    }

    res.json({
      success: true,
      staged: staged.length,
      errors: errors.length,
      results: staged,
      errorDetails: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Phase1 batch-stage error:', err);
    res.status(500).json({ success: false, error: 'Failed to batch stage churches' });
  }
});

// GET /api/admin/church-onboarding/phase1/staged — List all Phase 1 churches
router.get('/phase1/staged', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const [churches] = await pool.query(`
      SELECT c.id, c.name, c.city, c.state_province AS state_code, c.postal_code AS zip,
             c.phone, c.website, c.latitude, c.longitude,
             c.jurisdiction, c.jurisdiction_id, c.onboarding_phase,
             c.crm_lead_id, c.created_at,
             c.rector_name, c.admin_email,
             cl.pipeline_stage, cl.is_client
      FROM churches c
      LEFT JOIN omai_crm_leads cl ON c.crm_lead_id = cl.id
      WHERE c.onboarding_phase IS NOT NULL
      ORDER BY c.onboarding_phase, c.state_province, c.city, c.name
    `);
    res.json({ success: true, churches, count: churches.length });
  } catch (err) {
    console.error('Phase1 staged list error:', err);
    res.status(500).json({ success: false, error: 'Failed to load staged churches' });
  }
});

// POST /api/admin/church-onboarding/:churchId/contact — Set the church's primary contact
// (rector name + real email address) on a staged/onboarded church row. Used by the
// onboarding pipeline UI before sending an invite — without this, the church row only
// has a placeholder email like onboarding-{leadId}@placeholder.orthodoxmetrics.com and
// there's nobody/nothing to send a login invite to.
//
// Body: { rector_name?: string, admin_email?: string }
//   - admin_email must be a valid-looking address; rector_name is free-form (Fr. James, etc.).
//   - Either field may be omitted to leave the existing value alone; passing an empty string
//     clears that field.
router.post('/:churchId/contact', requireRole(ADMIN_ROLES), async (req, res) => {
  const churchId = parseInt(req.params.churchId);
  if (isNaN(churchId)) {
    return res.status(400).json({ success: false, message: 'Invalid church ID.' });
  }

  const { rector_name, admin_email } = req.body || {};
  const updates = [];
  const params = [];

  if (rector_name !== undefined) {
    const trimmed = typeof rector_name === 'string' ? rector_name.trim() : '';
    updates.push('rector_name = ?');
    params.push(trimmed === '' ? null : trimmed);
  }
  if (admin_email !== undefined) {
    const trimmed = typeof admin_email === 'string' ? admin_email.trim() : '';
    if (trimmed !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return res.status(400).json({ success: false, message: 'admin_email is not a valid email address.' });
    }
    updates.push('admin_email = ?');
    params.push(trimmed === '' ? null : trimmed);
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'No fields supplied (expected rector_name and/or admin_email).' });
  }

  try {
    const pool = getAppPool();
    const [existing] = await pool.query(
      'SELECT id, name, onboarding_phase FROM churches WHERE id = ?',
      [churchId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    params.push(churchId);
    await pool.query(`UPDATE churches SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(
      'SELECT id, name, rector_name, admin_email, onboarding_phase FROM churches WHERE id = ?',
      [churchId]
    );

    res.json({ success: true, church: updated[0] });
  } catch (err) {
    console.error('Set contact error:', err);
    res.status(500).json({ success: false, error: 'Failed to set contact info', detail: err.message });
  }
});

// GET /api/admin/church-onboarding/bulk-eligibility — Generic bulk action eligibility check
// Query params: action (required), state, jurisdiction
// Returns { actionAllowed, totalInScope, eligibleCount, ineligibleCount, reason }
router.get('/bulk-eligibility', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { action, state, jurisdiction } = req.query;
    if (!action) {
      return res.status(400).json({ success: false, error: 'Missing required param: action' });
    }

    const pool = getAppPool();

    // ── Action: phase1_stage ──────────────────────────────────
    // Eligible: CRM leads matching scope that have NOT been provisioned yet
    if (action === 'phase1_stage') {
      const jur = jurisdiction || 'OCA';

      // Build WHERE clause dynamically based on scope
      const conditions = ['cl.jurisdiction = ?'];
      const params = [jur];

      if (state) {
        const states = String(state).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (states.length > 0) {
          conditions.push(`cl.state_code IN (${states.map(() => '?').join(',')})`);
          params.push(...states);
        }
      }

      const whereClause = conditions.join(' AND ');

      // Total in scope (all CRM leads matching jurisdiction + state filter)
      const [totalRows] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM omai_crm_leads cl WHERE ${whereClause}`,
        params
      );
      const totalInScope = totalRows[0].cnt;

      // Eligible: not yet provisioned and not already linked to a church
      const [eligibleRows] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM omai_crm_leads cl
         WHERE ${whereClause}
           AND cl.provisioned_church_id IS NULL
           AND cl.id NOT IN (SELECT crm_lead_id FROM churches WHERE crm_lead_id IS NOT NULL)`,
        params
      );
      const eligibleCount = eligibleRows[0].cnt;
      const ineligibleCount = totalInScope - eligibleCount;

      const actionAllowed = eligibleCount > 0;
      let reason = '';
      if (!actionAllowed) {
        if (totalInScope === 0) {
          reason = `No ${jur} churches found in the selected scope.`;
        } else {
          reason = `All ${jur} churches in this scope have already been staged or advanced beyond Phase 1.`;
        }
      }

      return res.json({
        success: true,
        action,
        scope: { jurisdiction: jur, state: state || null },
        totalInScope,
        eligibleCount,
        ineligibleCount,
        actionAllowed,
        reason,
      });
    }

    // Unknown action
    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('Bulk eligibility check error:', err);
    res.status(500).json({ success: false, error: 'Failed to check eligibility' });
  }
});

// GET /api/admin/church-onboarding/onboarding-dashboard — Dashboard stats for onboarding pipeline
router.get('/onboarding-dashboard', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const [phases] = await pool.query(`
      SELECT onboarding_phase, COUNT(*) AS count
      FROM churches
      WHERE onboarding_phase IS NOT NULL
      GROUP BY onboarding_phase
      ORDER BY onboarding_phase
    `);

    const phaseMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of phases) {
      phaseMap[row.onboarding_phase] = row.count;
    }

    const [total] = await pool.query(
      'SELECT COUNT(*) AS count FROM churches WHERE onboarding_phase IS NOT NULL'
    );

    res.json({
      success: true,
      phases: [
        { phase: 1, label: 'Phase 1 — Infancy', description: 'Minimal info, no tenant DB or users', count: phaseMap[1], color: '#9e9e9e' },
        { phase: 2, label: 'Phase 2 — Child', description: 'Info filled, tenant DB created, no users', count: phaseMap[2], color: '#42a5f5' },
        { phase: 3, label: 'Phase 3 — Teenager', description: 'TBD', count: phaseMap[3], color: '#66bb6a' },
        { phase: 4, label: 'Phase 4 — Adult', description: 'TBD', count: phaseMap[4], color: '#ffa726' },
        { phase: 5, label: 'Phase 5 — Elder', description: 'TBD', count: phaseMap[5], color: '#ab47bc' },
      ],
      total: total[0].count,
    });
  } catch (err) {
    console.error('Onboarding dashboard error:', err);
    res.status(500).json({ success: false, error: 'Failed to load onboarding dashboard' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DIOCESAN DASHBOARD — Real data for NY/NJ OCA diocese overview
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/church-onboarding/diocesan-dashboard — Diocese of NY & NJ stats
router.get('/diocesan-dashboard', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();

    // All OCA churches in NY/NJ from CRM leads (us_churches)
    const [crmChurches] = await pool.query(`
      SELECT cl.id, cl.name, cl.street, cl.city, cl.state_code, cl.zip,
             cl.phone, cl.website, cl.latitude, cl.longitude,
             cl.jurisdiction, cl.pipeline_stage, cl.is_client,
             cl.provisioned_church_id
      FROM omai_crm_leads cl
      WHERE cl.jurisdiction = 'OCA'
        AND cl.state_code IN ('NY', 'NJ')
      ORDER BY cl.state_code, cl.city, cl.name
    `);

    // Onboarded churches in NY/NJ (from churches table)
    const [onboardedChurches] = await pool.query(`
      SELECT c.id, c.name, c.city, c.state_province AS state_code,
             c.onboarding_phase, c.crm_lead_id, c.is_active, c.setup_complete,
             c.has_baptism_records, c.has_marriage_records, c.has_funeral_records
      FROM churches c
      WHERE c.onboarding_phase IS NOT NULL
        AND c.state_province IN ('NY', 'NJ')
      ORDER BY c.onboarding_phase, c.name
    `);

    // Build a map of crm_lead_id → onboarded church for merging
    const onboardedByCrmId = {};
    for (const ch of onboardedChurches) {
      if (ch.crm_lead_id) onboardedByCrmId[ch.crm_lead_id] = ch;
    }

    // Phase breakdown
    const phaseBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const ch of onboardedChurches) {
      if (ch.onboarding_phase) phaseBreakdown[ch.onboarding_phase]++;
    }

    // Pipeline stage breakdown
    const pipelineBreakdown = {};
    for (const ch of crmChurches) {
      const stage = ch.pipeline_stage || 'unknown';
      pipelineBreakdown[stage] = (pipelineBreakdown[stage] || 0) + 1;
    }

    // State breakdown
    const stateBreakdown = {};
    for (const ch of crmChurches) {
      stateBreakdown[ch.state_code] = (stateBreakdown[ch.state_code] || 0) + 1;
    }

    // Merge CRM + onboarded into unified parish list
    const parishes = crmChurches.map(crm => {
      const onboarded = onboardedByCrmId[crm.id] || null;
      return {
        crm_id: crm.id,
        church_id: onboarded ? onboarded.id : null,
        name: crm.name,
        city: crm.city,
        state_code: crm.state_code,
        street: crm.street,
        zip: crm.zip,
        phone: crm.phone,
        website: crm.website,
        latitude: crm.latitude ? Number(crm.latitude) : null,
        longitude: crm.longitude ? Number(crm.longitude) : null,
        pipeline_stage: crm.pipeline_stage,
        is_client: crm.is_client || 0,
        onboarding_phase: onboarded ? onboarded.onboarding_phase : null,
        is_active: onboarded ? onboarded.is_active : 0,
        setup_complete: onboarded ? onboarded.setup_complete : 0,
        has_baptism_records: onboarded ? onboarded.has_baptism_records : 0,
        has_marriage_records: onboarded ? onboarded.has_marriage_records : 0,
        has_funeral_records: onboarded ? onboarded.has_funeral_records : 0,
      };
    });

    res.json({
      success: true,
      summary: {
        totalParishes: crmChurches.length,
        onboarded: onboardedChurches.length,
        byState: stateBreakdown,
        byPipelineStage: pipelineBreakdown,
        byOnboardingPhase: phaseBreakdown,
        withCoordinates: crmChurches.filter(c => c.latitude && c.longitude).length,
        clients: crmChurches.filter(c => c.is_client).length,
      },
      parishes,
    });
  } catch (err) {
    console.error('Diocesan dashboard error:', err);
    res.status(500).json({ success: false, error: 'Failed to load diocesan dashboard' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PHASE PROMOTION — Move churches between onboarding phases
// ═══════════════════════════════════════════════════════════════

const PHASE_LABELS = {
  1: 'Infancy',
  2: 'Child',
  3: 'Teenager',
  4: 'Adult',
  5: 'Elder',
};

// POST /api/admin/church-onboarding/:churchId/promote — Promote church to next onboarding phase
router.post('/:churchId/promote', requireRole(ADMIN_ROLES), async (req, res) => {
  const churchId = parseInt(req.params.churchId);
  if (isNaN(churchId)) {
    return res.status(400).json({ success: false, message: 'Invalid church ID.' });
  }

  try {
    const pool = getAppPool();

    const [rows] = await pool.query(
      'SELECT id, name, onboarding_phase, email FROM churches WHERE id = ?',
      [churchId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    const church = rows[0];
    const currentPhase = church.onboarding_phase;

    if (currentPhase === null) {
      return res.status(400).json({ success: false, message: 'Church is not in the onboarding pipeline.' });
    }
    if (currentPhase >= 5) {
      return res.status(400).json({ success: false, message: 'Church is already at the maximum phase.' });
    }

    const nextPhase = currentPhase + 1;
    let dbCreated = false;

    // Phase 1→2: Create tenant database from approved template
    if (currentPhase === 1 && nextPhase === 2) {
      const provResult = await provisionTenantDb(churchId, pool, { allowExisting: true, source: 'onboarding', initiatedBy: req.session?.user?.id });
      if (!provResult.success) {
        return res.status(500).json({ success: false, message: `Tenant DB provisioning failed: ${provResult.error}` });
      }
      dbCreated = provResult.dbCreated;
    }

    // Update onboarding phase
    await pool.query('UPDATE churches SET onboarding_phase = ? WHERE id = ?', [nextPhase, churchId]);

    console.log(`[Onboarding] Church ${churchId} (${church.name}) promoted: Phase ${currentPhase} (${PHASE_LABELS[currentPhase]}) → Phase ${nextPhase} (${PHASE_LABELS[nextPhase]})`);

    res.json({
      success: true,
      church_id: churchId,
      previous_phase: currentPhase,
      new_phase: nextPhase,
      label: PHASE_LABELS[nextPhase],
      message: `${church.name} promoted to ${PHASE_LABELS[nextPhase]}`,
      db_created: dbCreated,
    });
  } catch (err) {
    console.error('Promote error:', err);
    res.status(500).json({ success: false, error: 'Failed to promote church', detail: err.message });
  }
});

// POST /api/admin/church-onboarding/:churchId/demote — Demote church to previous onboarding phase
router.post('/:churchId/demote', requireRole(ADMIN_ROLES), async (req, res) => {
  const churchId = parseInt(req.params.churchId);
  if (isNaN(churchId)) {
    return res.status(400).json({ success: false, message: 'Invalid church ID.' });
  }

  try {
    const pool = getAppPool();

    const [rows] = await pool.query(
      'SELECT id, name, onboarding_phase FROM churches WHERE id = ?',
      [churchId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    const church = rows[0];
    const currentPhase = church.onboarding_phase;

    if (currentPhase === null || currentPhase <= 1) {
      return res.status(400).json({ success: false, message: 'Church is already at the minimum phase.' });
    }

    const prevPhase = currentPhase - 1;
    await pool.query('UPDATE churches SET onboarding_phase = ? WHERE id = ?', [prevPhase, churchId]);

    console.log(`[Onboarding] Church ${churchId} (${church.name}) demoted: Phase ${currentPhase} → Phase ${prevPhase}`);

    res.json({
      success: true,
      church_id: churchId,
      previous_phase: currentPhase,
      new_phase: prevPhase,
      label: PHASE_LABELS[prevPhase],
      message: `${church.name} demoted to ${PHASE_LABELS[prevPhase]}`,
    });
  } catch (err) {
    console.error('Demote error:', err);
    res.status(500).json({ success: false, error: 'Failed to demote church' });
  }
});

module.exports = router;
