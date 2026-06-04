/**
 * CRM API Routes
 * Full customer relationship management for US Orthodox Churches
 *
 * Mounted at /api/crm
 *
 * DATA OWNERSHIP: All write operations target omai_crm_* tables (OMAI-owned).
 * Legacy us_churches/crm_* tables are read-only during quarantine.
 * Migration completed 2026-03-24.
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

const requireAdmin = requireRole(['admin', 'super_admin']);

function getPool() {
  return require('../config/db').promisePool;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — aggregate stats for the CRM home page
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const pool = getPool();

    // Pipeline counts
    const [pipelineCounts] = await pool.query(
      `SELECT uc.pipeline_stage, ps.label, ps.color, ps.sort_order, COUNT(*) as count
       FROM omai_crm_leads uc
       LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       GROUP BY uc.pipeline_stage, ps.label, ps.color, ps.sort_order
       ORDER BY ps.sort_order`
    );

    // Overdue follow-ups
    const [overdue] = await pool.query(
      `SELECT COUNT(*) as count FROM omai_crm_followups WHERE status = 'pending' AND due_date < CURDATE()`
    );

    // Today's follow-ups
    const [todayFollowups] = await pool.query(
      `SELECT COUNT(*) as count FROM omai_crm_followups WHERE status = 'pending' AND due_date = CURDATE()`
    );

    // Upcoming follow-ups (next 7 days)
    const [upcoming] = await pool.query(
      `SELECT f.*, uc.name as church_name, uc.state_code, uc.city
       FROM omai_crm_followups f
       JOIN omai_crm_leads uc ON f.church_id = uc.id
       WHERE f.status = 'pending' AND f.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY f.due_date ASC
       LIMIT 20`
    );

    // Recent activity (last 20)
    const [recentActivity] = await pool.query(
      `SELECT a.*, uc.name as church_name, uc.state_code
       FROM omai_crm_activities a
       JOIN omai_crm_leads uc ON a.church_id = uc.id
       ORDER BY a.created_at DESC
       LIMIT 20`
    );

    // Total churches, total clients
    const [totals] = await pool.query(
      `SELECT COUNT(*) as total, SUM(is_client) as clients FROM omai_crm_leads`
    );

    // Churches by state (top 10 by pipeline activity — non-new_lead)
    const [activeStates] = await pool.query(
      `SELECT state_code, COUNT(*) as count
       FROM omai_crm_leads
       WHERE pipeline_stage != 'prospects'
       GROUP BY state_code
       ORDER BY count DESC
       LIMIT 10`
    );

    let myWork = null;
    const userId = req.session?.user?.id;
    if (userId) {
      const [myLeads] = await pool.query(
        'SELECT COUNT(*) as count FROM omai_crm_leads WHERE assigned_to = ?',
        [userId]
      );
      const [myOverdue] = await pool.query(
        `SELECT COUNT(*) as count FROM omai_crm_followups
         WHERE assigned_to = ? AND status = 'pending' AND due_date < CURDATE()`,
        [userId]
      );
      const [myToday] = await pool.query(
        `SELECT COUNT(*) as count FROM omai_crm_followups
         WHERE assigned_to = ? AND status = 'pending' AND due_date = CURDATE()`,
        [userId]
      );
      myWork = {
        assignedLeads: myLeads[0].count,
        overdueFollowups: myOverdue[0].count,
        todayFollowups: myToday[0].count,
      };
    }

    res.json({
      pipeline: pipelineCounts,
      overdue: overdue[0].count,
      todayFollowups: todayFollowups[0].count,
      upcomingFollowups: upcoming,
      recentActivity,
      totalChurches: totals[0].total,
      totalClients: totals[0].clients || 0,
      activeStates,
      myWork,
    });
  } catch (err) {
    console.error('CRM dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PIPELINE STAGES — list and manage
// ═══════════════════════════════════════════════════════════════

// Admin users eligible for lead assignment
router.get('/assignees', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT id,
              email,
              COALESCE(NULLIF(TRIM(full_name), ''),
                NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''),
                email) AS label
       FROM users
       WHERE role IN ('admin', 'super_admin') AND (is_active = 1 OR is_active IS NULL)
       ORDER BY label`
    );
    res.json({ assignees: rows });
  } catch (err) {
    console.error('CRM assignees error:', err);
    res.status(500).json({ error: 'Failed to load assignees' });
  }
});

// Pipeline reporting — stage distribution, idle time, public funnel
router.get('/reporting', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();

    const [byStage] = await pool.query(
      `SELECT uc.pipeline_stage, ps.label, ps.color, ps.sort_order, ps.is_terminal,
              COUNT(*) AS count,
              ROUND(AVG(DATEDIFF(CURDATE(), COALESCE(uc.last_contacted_at, uc.created_at))), 1) AS avg_days_idle
       FROM omai_crm_leads uc
       LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       GROUP BY uc.pipeline_stage, ps.label, ps.color, ps.sort_order, ps.is_terminal
       ORDER BY ps.sort_order`
    );

    const [funnel] = await pool.query(
      `SELECT
         COUNT(*) AS total_leads,
         SUM(is_client = 1) AS clients,
         SUM(pipeline_stage = 'active_parish') AS active_parish,
         SUM(pipeline_stage = 'lost') AS lost
       FROM omai_crm_leads`
    );

    let inquiriesLast30 = 0;
    try {
      const [inq] = await pool.query(
        `SELECT COUNT(*) AS count FROM omai_crm_inquiries
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
      );
      inquiriesLast30 = inq[0].count;
    } catch (_) { /* table may not exist in older envs */ }

    const [stageChanges] = await pool.query(
      `SELECT COUNT(*) AS transitions
       FROM omai_crm_activities
       WHERE activity_type = 'stage_change'
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`
    );

    const total = funnel[0].total_leads || 0;
    const clients = funnel[0].clients || 0;
    const conversionPct = total > 0 ? Math.round((clients / total) * 1000) / 10 : 0;

    res.json({
      byStage,
      funnel: funnel[0],
      conversionPct,
      inquiriesLast30,
      stageChanges90d: stageChanges[0].transitions,
    });
  } catch (err) {
    console.error('CRM reporting error:', err);
    res.status(500).json({ error: 'Failed to load reporting' });
  }
});

router.get('/pipeline-stages', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM omai_crm_pipeline_stages ORDER BY sort_order');
    res.json({ stages: rows });
  } catch (err) {
    console.error('Pipeline stages error:', err);
    res.status(500).json({ error: 'Failed to load pipeline stages' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CHURCHES — list, search, detail, update pipeline stage
// ═══════════════════════════════════════════════════════════════

// List churches with CRM data, filters, search, pagination
router.get('/churches', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      limit = 25,
      search = '',
      state = '',
      pipeline_stage = '',
      jurisdiction = '',
      priority = '',
      assigned_to = '',
      overdue_followup = '',
      sort = 'name',
      direction = 'asc',
    } = req.query;

    const conditions = [];
    const params = [];

    if (assigned_to === 'me') {
      const uid = req.session?.user?.id;
      if (uid) {
        conditions.push('uc.assigned_to = ?');
        params.push(uid);
      }
    } else if (assigned_to && assigned_to !== 'all' && assigned_to !== '') {
      const aid = parseInt(String(assigned_to), 10);
      if (!Number.isNaN(aid)) {
        conditions.push('uc.assigned_to = ?');
        params.push(aid);
      }
    }

    if (overdue_followup === '1' || overdue_followup === 'true') {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM omai_crm_followups cf
          WHERE cf.church_id = uc.id AND cf.status = 'pending' AND cf.due_date < CURDATE()
        )`
      );
    }

    if (search) {
      conditions.push('(uc.name LIKE ? OR uc.city LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (state) {
      conditions.push('uc.state_code = ?');
      params.push(state);
    }
    if (pipeline_stage) {
      conditions.push('uc.pipeline_stage = ?');
      params.push(pipeline_stage);
    }
    if (jurisdiction) {
      // Support both legacy free-text and new jurisdiction_id
      if (!isNaN(parseInt(jurisdiction))) {
        conditions.push('uc.jurisdiction_id = ?');
        params.push(parseInt(jurisdiction));
      } else {
        conditions.push('uc.jurisdiction = ?');
        params.push(jurisdiction);
      }
    }
    if (priority) {
      conditions.push('uc.priority = ?');
      params.push(priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist sort fields
    const allowedSorts = ['name', 'state_code', 'city', 'jurisdiction', 'pipeline_stage', 'priority', 'last_contacted_at', 'next_follow_up'];
    const sortField = allowedSorts.includes(sort) ? `uc.${sort}` : 'uc.name';
    const sortDir = direction === 'desc' ? 'DESC' : 'ASC';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM omai_crm_leads uc ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT uc.*, ps.label as stage_label, ps.color as stage_color,
              j.name AS jurisdiction_name, j.abbreviation AS jurisdiction_abbr, j.calendar_type AS jurisdiction_calendar,
              COALESCE(NULLIF(TRIM(u.full_name), ''),
                NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                u.email) AS assignee_name,
              (SELECT COUNT(*) FROM omai_crm_contacts cc WHERE cc.church_id = uc.id) as contact_count,
              (SELECT COUNT(*) FROM omai_crm_activities ca WHERE ca.church_id = uc.id) as activity_count,
              (SELECT COUNT(*) FROM omai_crm_followups cf WHERE cf.church_id = uc.id AND cf.status = 'pending') as pending_followups
       FROM omai_crm_leads uc
       LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       LEFT JOIN jurisdictions j ON uc.jurisdiction_id = j.id
       LEFT JOIN users u ON uc.assigned_to = u.id
       ${whereClause}
       ORDER BY ${sortField} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      churches: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('CRM churches list error:', err);
    res.status(500).json({ error: 'Failed to load churches' });
  }
});

// Get single church detail with contacts, recent activities, follow-ups
router.get('/churches/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [churchRows] = await pool.query(
      `SELECT uc.*, ps.label as stage_label, ps.color as stage_color,
              COALESCE(NULLIF(TRIM(u.full_name), ''),
                NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                u.email) AS assignee_name
       FROM omai_crm_leads uc
       LEFT JOIN omai_crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
       LEFT JOIN users u ON uc.assigned_to = u.id
       WHERE uc.id = ?`,
      [id]
    );
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    const [contacts] = await pool.query('SELECT * FROM omai_crm_contacts WHERE church_id = ? ORDER BY is_primary DESC, first_name', [id]);
    const [activities] = await pool.query(
      'SELECT * FROM omai_crm_activities WHERE church_id = ? ORDER BY created_at DESC LIMIT 50', [id]
    );
    const [followUps] = await pool.query(
      'SELECT * FROM omai_crm_followups WHERE church_id = ? ORDER BY due_date ASC', [id]
    );

    let provisionedClient = null;
    const provisionedId = churchRows[0].provisioned_church_id;
    if (provisionedId) {
      const [clientRows] = await pool.query(
        `SELECT
          c.id, c.name, c.email, c.phone, c.address, c.city, c.state_province, c.country,
          c.jurisdiction, c.website, c.rector_name, c.calendar_type, c.is_active, c.setup_complete,
          c.onboarding_phase, c.onboarding_stage, c.crm_lead_id, c.db_name, c.has_baptism_records,
          c.has_marriage_records, c.has_funeral_records, c.created_at,
          COALESCE(tok.active_tokens, 0) AS active_token_count,
          COALESCE(usr.total_users, 0) AS total_users,
          COALESCE(usr.active_users, 0) AS active_users,
          COALESCE(usr.pending_users, 0) AS pending_users
        FROM churches c
        LEFT JOIN (
          SELECT church_id, COUNT(*) AS active_tokens
          FROM church_registration_tokens WHERE is_active = 1
          GROUP BY church_id
        ) tok ON tok.church_id = c.id
        LEFT JOIN (
          SELECT church_id,
            COUNT(*) AS total_users,
            SUM(CASE WHEN is_locked = 0 THEN 1 ELSE 0 END) AS active_users,
            SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) AS pending_users
          FROM users WHERE church_id IS NOT NULL
          GROUP BY church_id
        ) usr ON usr.church_id = c.id
        WHERE c.id = ?`,
        [provisionedId]
      );
      provisionedClient = clientRows[0] || null;
    }

    res.json({
      church: churchRows[0],
      contacts,
      activities,
      followUps,
      provisionedClient,
    });
  } catch (err) {
    console.error('CRM church detail error:', err);
    res.status(500).json({ error: 'Failed to load church detail' });
  }
});

// Update church CRM fields (pipeline stage, priority, notes, etc.)
router.put('/churches/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { pipeline_stage, priority, crm_notes, assigned_to, next_follow_up, tags } = req.body;

    const updates = [];
    const params = [];

    if (pipeline_stage !== undefined) { updates.push('pipeline_stage = ?'); params.push(pipeline_stage); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (crm_notes !== undefined) { updates.push('crm_notes = ?'); params.push(crm_notes); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }
    if (next_follow_up !== undefined) { updates.push('next_follow_up = ?'); params.push(next_follow_up || null); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    await pool.query(`UPDATE omai_crm_leads SET ${updates.join(', ')} WHERE id = ?`, params);

    // Log stage change as activity
    if (pipeline_stage !== undefined) {
      await pool.query(
        `INSERT INTO omai_crm_activities (church_id, activity_type, subject, metadata, created_by)
         VALUES (?, 'stage_change', ?, ?, ?)`,
        [id, `Pipeline stage changed to: ${pipeline_stage}`, JSON.stringify({ new_stage: pipeline_stage }), req.session?.user?.id || null]
      );

      // If moved to 'active_parish', mark as client
      if (pipeline_stage === 'active_parish') {
        await pool.query('UPDATE omai_crm_leads SET is_client = 1 WHERE id = ?', [id]);
      }
    }

    const [updated] = await pool.query('SELECT * FROM omai_crm_leads WHERE id = ?', [id]);
    res.json({ church: updated[0] });
  } catch (err) {
    console.error('CRM church update error:', err);
    res.status(500).json({ error: 'Failed to update church' });
  }
});

// Bulk update pipeline stage
router.put('/churches/bulk/pipeline', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { church_ids, pipeline_stage } = req.body;
    if (!church_ids?.length || !pipeline_stage) return res.status(400).json({ error: 'church_ids and pipeline_stage required' });

    const placeholders = church_ids.map(() => '?').join(',');
    await pool.query(`UPDATE omai_crm_leads SET pipeline_stage = ? WHERE id IN (${placeholders})`, [pipeline_stage, ...church_ids]);

    // Log activities
    for (const cid of church_ids) {
      await pool.query(
        `INSERT INTO omai_crm_activities (church_id, activity_type, subject, metadata, created_by) VALUES (?, 'stage_change', ?, ?, ?)`,
        [cid, `Bulk pipeline stage changed to: ${pipeline_stage}`, JSON.stringify({ new_stage: pipeline_stage, bulk: true }), req.session?.user?.id || null]
      );
    }

    res.json({ updated: church_ids.length });
  } catch (err) {
    console.error('CRM bulk update error:', err);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CONTACTS — CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/churches/:churchId/contacts', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      'SELECT * FROM omai_crm_contacts WHERE church_id = ? ORDER BY is_primary DESC, first_name', [req.params.churchId]
    );
    res.json({ contacts: rows });
  } catch (err) {
    console.error('CRM contacts list error:', err);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

router.post('/churches/:churchId/contacts', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { churchId } = req.params;
    const { first_name, last_name, role, email, phone, is_primary, notes } = req.body;
    if (!first_name) return res.status(400).json({ error: 'first_name required' });

    // If setting as primary, unset other primaries
    if (is_primary) {
      await pool.query('UPDATE omai_crm_contacts SET is_primary = 0 WHERE church_id = ?', [churchId]);
    }

    const [result] = await pool.query(
      `INSERT INTO omai_crm_contacts (church_id, first_name, last_name, role, email, phone, is_primary, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [churchId, first_name, last_name || null, role || null, email || null, phone || null, is_primary ? 1 : 0, notes || null]
    );

    // Log activity
    await pool.query(
      `INSERT INTO omai_crm_activities (church_id, contact_id, activity_type, subject, created_by)
       VALUES (?, ?, 'note', ?, ?)`,
      [churchId, result.insertId, `Contact added: ${first_name} ${last_name || ''}`.trim(), req.session?.user?.id || null]
    );

    const [contact] = await pool.query('SELECT * FROM omai_crm_contacts WHERE id = ?', [result.insertId]);
    res.status(201).json({ contact: contact[0] });
  } catch (err) {
    console.error('CRM contact create error:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

router.put('/contacts/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { first_name, last_name, role, email, phone, is_primary, notes } = req.body;

    const [existing] = await pool.query('SELECT * FROM omai_crm_contacts WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Contact not found' });

    if (is_primary) {
      await pool.query('UPDATE omai_crm_contacts SET is_primary = 0 WHERE church_id = ?', [existing[0].church_id]);
    }

    await pool.query(
      `UPDATE omai_crm_contacts SET first_name = ?, last_name = ?, role = ?, email = ?, phone = ?, is_primary = ?, notes = ? WHERE id = ?`,
      [first_name || existing[0].first_name, last_name, role, email, phone, is_primary ? 1 : 0, notes, id]
    );

    const [updated] = await pool.query('SELECT * FROM omai_crm_contacts WHERE id = ?', [id]);
    res.json({ contact: updated[0] });
  } catch (err) {
    console.error('CRM contact update error:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/contacts/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT * FROM omai_crm_contacts WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Contact not found' });

    await pool.query('DELETE FROM omai_crm_contacts WHERE id = ?', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('CRM contact delete error:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ACTIVITIES — log and list
// ═══════════════════════════════════════════════════════════════

router.get('/churches/:churchId/activities', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type = '' } = req.query;
    let sql = 'SELECT * FROM omai_crm_activities WHERE church_id = ?';
    const params = [req.params.churchId];
    if (type) { sql += ' AND activity_type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await getPool().query(sql, params);
    res.json({ activities: rows });
  } catch (err) {
    console.error('CRM activities list error:', err);
    res.status(500).json({ error: 'Failed to load activities' });
  }
});

router.post('/churches/:churchId/activities', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { churchId } = req.params;
    const { activity_type, subject, body, contact_id, metadata } = req.body;
    if (!activity_type || !subject) return res.status(400).json({ error: 'activity_type and subject required' });

    const [result] = await pool.query(
      `INSERT INTO omai_crm_activities (church_id, contact_id, activity_type, subject, body, metadata, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [churchId, contact_id || null, activity_type, subject, body || null, metadata ? JSON.stringify(metadata) : null, req.session?.user?.id || null]
    );

    // Update last_contacted_at if it's a contact-type activity
    if (['call', 'email', 'meeting'].includes(activity_type)) {
      await pool.query('UPDATE omai_crm_leads SET last_contacted_at = NOW() WHERE id = ?', [churchId]);
    }

    const [activity] = await pool.query('SELECT * FROM omai_crm_activities WHERE id = ?', [result.insertId]);
    res.status(201).json({ activity: activity[0] });
  } catch (err) {
    console.error('CRM activity create error:', err);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// ═══════════════════════════════════════════════════════════════
// FOLLOW-UPS — CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/follow-ups', requireAuth, async (req, res) => {
  try {
    const { status = 'pending', limit = 50, assigned_to = '' } = req.query;
    let sql = `SELECT f.*, uc.name as church_name, uc.state_code, uc.city, uc.pipeline_stage
               FROM omai_crm_followups f
               JOIN omai_crm_leads uc ON f.church_id = uc.id`;
    const params = [];
    const where = [];

    if (status && status !== 'all') {
      where.push('f.status = ?');
      params.push(status);
    }
    if (assigned_to === 'me') {
      const uid = req.session?.user?.id;
      if (uid) {
        where.push('f.assigned_to = ?');
        params.push(uid);
      }
    } else if (assigned_to && assigned_to !== 'all') {
      const aid = parseInt(String(assigned_to), 10);
      if (!Number.isNaN(aid)) {
        where.push('f.assigned_to = ?');
        params.push(aid);
      }
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY f.due_date ASC LIMIT ?';
    params.push(parseInt(String(limit), 10) || 50);

    const [rows] = await getPool().query(sql, params);

    const dueDateStr = (d) => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d).slice(0, 10);
    };

    // Mark overdue
    const now = new Date().toISOString().split('T')[0];
    rows.forEach(r => {
      const due = dueDateStr(r.due_date);
      if (r.status === 'pending' && due && due < now) {
        r.is_overdue = true;
      }
    });

    res.json({ followUps: rows });
  } catch (err) {
    console.error('CRM follow-ups list error:', err);
    res.status(500).json({ error: 'Failed to load follow-ups' });
  }
});

router.post('/churches/:churchId/follow-ups', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { churchId } = req.params;
    const { due_date, subject, description, assigned_to } = req.body;
    if (!due_date || !subject) return res.status(400).json({ error: 'due_date and subject required' });

    const [result] = await pool.query(
      `INSERT INTO omai_crm_followups (church_id, assigned_to, due_date, subject, description)
       VALUES (?, ?, ?, ?, ?)`,
      [churchId, assigned_to || null, due_date, subject, description || null]
    );

    // Update next_follow_up on church
    await pool.query(
      `UPDATE omai_crm_leads SET next_follow_up = (
         SELECT MIN(due_date) FROM omai_crm_followups WHERE church_id = ? AND status = 'pending'
       ) WHERE id = ?`,
      [churchId, churchId]
    );

    const [followUp] = await pool.query('SELECT * FROM omai_crm_followups WHERE id = ?', [result.insertId]);
    res.status(201).json({ followUp: followUp[0] });
  } catch (err) {
    console.error('CRM follow-up create error:', err);
    res.status(500).json({ error: 'Failed to create follow-up' });
  }
});

router.put('/follow-ups/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { status, due_date, subject, description } = req.body;

    const [existing] = await pool.query('SELECT * FROM omai_crm_followups WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Follow-up not found' });

    const updates = [];
    const params = [];
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'completed') { updates.push('completed_at = NOW()'); }
    }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
    if (subject !== undefined) { updates.push('subject = ?'); params.push(subject); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    await pool.query(`UPDATE omai_crm_followups SET ${updates.join(', ')} WHERE id = ?`, params);

    // Refresh next_follow_up on church
    const churchId = existing[0].church_id;
    await pool.query(
      `UPDATE omai_crm_leads SET next_follow_up = (
         SELECT MIN(due_date) FROM omai_crm_followups WHERE church_id = ? AND status = 'pending'
       ) WHERE id = ?`,
      [churchId, churchId]
    );

    const [updated] = await pool.query('SELECT * FROM omai_crm_followups WHERE id = ?', [id]);
    res.json({ followUp: updated[0] });
  } catch (err) {
    console.error('CRM follow-up update error:', err);
    res.status(500).json({ error: 'Failed to update follow-up' });
  }
});

router.delete('/follow-ups/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT * FROM omai_crm_followups WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Follow-up not found' });

    await pool.query('DELETE FROM omai_crm_followups WHERE id = ?', [req.params.id]);

    // Refresh next_follow_up on church
    const churchId = existing[0].church_id;
    await pool.query(
      `UPDATE omai_crm_leads SET next_follow_up = (
         SELECT MIN(due_date) FROM omai_crm_followups WHERE church_id = ? AND status = 'pending'
       ) WHERE id = ?`,
      [churchId, churchId]
    );

    res.json({ deleted: true });
  } catch (err) {
    console.error('CRM follow-up delete error:', err);
    res.status(500).json({ error: 'Failed to delete follow-up' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROVISION — initiate church provisioning from CRM data
// ═══════════════════════════════════════════════════════════════

router.post('/churches/:id/provision', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const crypto = require('crypto');

    const [churchRows] = await pool.query(
      `SELECT uc.*, j.calendar_type AS jurisdiction_calendar, j.name AS jurisdiction_name
       FROM omai_crm_leads uc
       LEFT JOIN jurisdictions j ON uc.jurisdiction_id = j.id
       WHERE uc.id = ?`,
      [id]
    );
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });
    const church = churchRows[0];

    if (church.provisioned_church_id) {
      return res.status(400).json({ error: 'Church already provisioned', provisioned_church_id: church.provisioned_church_id });
    }

    // Get primary contact
    const [contacts] = await pool.query('SELECT * FROM omai_crm_contacts WHERE church_id = ? AND is_primary = 1 LIMIT 1', [id]);
    const primaryContact = contacts.length > 0 ? contacts[0] : null;

    const contactEmail = primaryContact?.email || null;
    const calendarType = church.jurisdiction_calendar || null;

    // 1. Insert into churches table (correct column names)
    const [insertResult] = await pool.query(
      `INSERT INTO churches (name, email, phone, website, address, city, state_province, postal_code, country,
                             jurisdiction, jurisdiction_id, calendar_type, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'United States', ?, ?, ?, TRUE)`,
      [
        church.name,
        contactEmail,
        church.phone || primaryContact?.phone || null,
        church.website || null,
        church.street || null,
        church.city || null,
        church.state_code || null,
        church.zip || null,
        church.jurisdiction || church.jurisdiction_name || null,
        church.jurisdiction_id || null,
        calendarType,
      ]
    );

    const newChurchId = insertResult.insertId;

    // 2. Create tenant database via centralized provisioning service
    let provisionResult = null;
    try {
      const { provisionTenantDb } = require('../services/tenantProvisioning');
      provisionResult = await provisionTenantDb(newChurchId, pool, { source: 'crm', initiatedBy: req.session?.user?.id });
      if (!provisionResult.success) {
        console.error('Tenant provisioning failed (non-fatal, church record still created):', provisionResult.error);
      }
    } catch (provisionErr) {
      console.error('Tenant provisioning failed (non-fatal, church record still created):', provisionErr.message);
    }

    // 3. Generate registration token
    let registrationToken = null;
    let registrationUrl = null;
    try {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        'INSERT INTO church_registration_tokens (church_id, token, created_by) VALUES (?, ?, ?)',
        [newChurchId, token, req.session?.user?.id || 0]
      );
      registrationToken = token;
      const encodedName = encodeURIComponent(church.name);
      registrationUrl = `https://orthodoxmetrics.com/auth/register?token=${token}&church=${encodedName}`;
    } catch (tokenErr) {
      console.error('Token generation failed (non-fatal):', tokenErr.message);
    }

    // 4. Link back to CRM
    await pool.query(
      'UPDATE omai_crm_leads SET provisioned_church_id = ?, is_client = 1, pipeline_stage = ? WHERE id = ?',
      [newChurchId, 'active_parish', id]
    );

    // 5. Log activity
    await pool.query(
      `INSERT INTO omai_crm_activities (church_id, activity_type, subject, metadata, created_by)
       VALUES (?, 'provision', ?, ?, ?)`,
      [id, `Church provisioned as OrthodoxMetrics client (ID: ${newChurchId})`,
       JSON.stringify({
         provisioned_church_id: newChurchId,
         database_name: provisionResult?.targetDb || null,
         calendar_type: calendarType,
         jurisdiction_id: church.jurisdiction_id || null,
         registration_token: registrationToken ? '(generated)' : null,
       }), req.session?.user?.id || null]
    );

    res.status(201).json({
      success: true,
      provisioned_church_id: newChurchId,
      database_name: provisionResult?.targetDb || null,
      calendar_type: calendarType,
      registration_url: registrationUrl,
      message: `${church.name} has been provisioned as church #${newChurchId}`,
    });
  } catch (err) {
    console.error('CRM provision error:', err);
    res.status(500).json({ error: 'Failed to provision church' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MAP DATA — pipeline-enriched church counts by state
// ═══════════════════════════════════════════════════════════════

router.get('/map-data', requireAuth, async (req, res) => {
  try {
    const pool = getPool();

    // State-level pipeline breakdown
    const [stateData] = await pool.query(
      `SELECT state_code, pipeline_stage, COUNT(*) as count
       FROM omai_crm_leads
       GROUP BY state_code, pipeline_stage
       ORDER BY state_code`
    );

    // Aggregate by state
    const states = {};
    for (const row of stateData) {
      if (!states[row.state_code]) {
        states[row.state_code] = { total: 0, pipeline: {} };
      }
      states[row.state_code].total += row.count;
      states[row.state_code].pipeline[row.pipeline_stage] = row.count;
    }

    res.json({ states });
  } catch (err) {
    console.error('CRM map data error:', err);
    res.status(500).json({ error: 'Failed to load map data' });
  }
});

// ═══════════════════════════════════════════════════════════════
// EXPORT — generate XLSX/CSV of church data with filter parity
// ═══════════════════════════════════════════════════════════════

const REGIONS_MAP = {
  northeast: ['CT', 'DE', 'ME', 'MD', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT', 'DC'],
  midwest: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  south: ['AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA', 'WV'],
  west: ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR', 'UT', 'WA', 'WY'],
};

const EXPORT_COLUMN_DEFS = {
  church_id:            { header: 'Church ID',            key: 'id' },
  church_name:          { header: 'Church Name',          key: 'name' },
  jurisdiction:         { header: 'Jurisdiction',         key: 'jurisdiction' },
  street:               { header: 'Street',               key: 'street' },
  city:                 { header: 'City',                 key: 'city' },
  state:                { header: 'State',                key: 'state_code' },
  zip:                  { header: 'ZIP',                  key: 'zip' },
  phone:                { header: 'Phone',                key: 'phone' },
  website:              { header: 'Website',              key: 'website' },
  latitude:             { header: 'Latitude',             key: 'latitude' },
  longitude:            { header: 'Longitude',            key: 'longitude' },
  op_status:            { header: 'Operational Status',   key: 'op_status' },
  pipeline_stage:       { header: 'Pipeline Stage',       key: 'stage_label' },
  priority:             { header: 'Priority',             key: 'priority' },
  is_client:            { header: 'Is Client',            key: 'is_client' },
  source:               { header: 'Source',               key: 'source' },
  last_contacted_at:    { header: 'Last Contacted',       key: 'last_contacted_at' },
  next_follow_up:       { header: 'Next Follow-Up',       key: 'next_follow_up' },
  primary_contact_name: { header: 'Primary Contact',      key: 'primary_contact_name' },
  primary_contact_email:{ header: 'Primary Contact Email', key: 'primary_contact_email' },
  primary_contact_phone:{ header: 'Primary Contact Phone', key: 'primary_contact_phone' },
};

const MAX_EXPORT_ROWS = 10000;

router.post('/churches/export', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const {
      exportMode = 'all',        // all | state | region | selected
      filters = {},              // { viewMode, jurisdiction, search }
      state = null,              // for 'state' mode
      region = null,             // for 'region' mode
      selectedIds = [],          // for 'selected' mode
      columns = null,            // array of column keys, or null for defaults
      includeContacts = false,
      includeCoordinates = true,
      format = 'xlsx',           // xlsx | csv
    } = req.body;

    // Validate export mode
    const validModes = ['all', 'state', 'region', 'selected'];
    if (!validModes.includes(exportMode)) {
      return res.status(400).json({ error: 'Invalid exportMode' });
    }

    if (exportMode === 'selected' && (!Array.isArray(selectedIds) || selectedIds.length === 0)) {
      return res.status(400).json({ error: 'selectedIds required for selected mode' });
    }

    if (exportMode === 'state' && (!state || typeof state !== 'string' || state.length !== 2)) {
      return res.status(400).json({ error: 'Valid 2-letter state code required for state mode' });
    }

    if (exportMode === 'region' && (!region || !REGIONS_MAP[region])) {
      return res.status(400).json({ error: 'Valid region required (northeast, midwest, south, west)' });
    }

    // Determine which states to query
    let targetStates = null; // null means all
    if (exportMode === 'state') {
      targetStates = [state.toUpperCase()];
    } else if (exportMode === 'region') {
      targetStates = REGIONS_MAP[region];
    }

    // Build enriched church list (same logic as analytics/us-churches-enriched)
    let crmSql = `
      SELECT uc.id, uc.name, uc.street, uc.city, uc.state_code, uc.zip,
             uc.phone, uc.website, uc.latitude, uc.longitude, uc.jurisdiction,
             uc.pipeline_stage, uc.priority, uc.is_client, uc.provisioned_church_id,
             uc.last_contacted_at, uc.next_follow_up, uc.crm_notes,
             ps.label AS stage_label, ps.color AS stage_color
      FROM us_churches uc
      LEFT JOIN crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key`;
    const crmParams = [];

    if (targetStates) {
      crmSql += ` WHERE uc.state_code IN (${targetStates.map(() => '?').join(',')})`;
      crmParams.push(...targetStates);
    }

    if (filters.jurisdiction) {
      crmSql += targetStates ? ' AND' : ' WHERE';
      crmSql += ' uc.jurisdiction = ?';
      crmParams.push(filters.jurisdiction);
    }

    if (filters.search) {
      crmSql += (crmParams.length > 0 ? ' AND' : ' WHERE');
      crmSql += ' (uc.name LIKE ? OR uc.city LIKE ?)';
      crmParams.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    crmSql += ' ORDER BY uc.state_code, uc.jurisdiction, uc.city, uc.name';
    const [crmRows] = await pool.query(crmSql, crmParams);

    // Get onboarded churches
    let obSql = `
      SELECT c.id, c.name, c.city, c.state_province, c.phone, c.website,
             c.latitude, c.longitude, c.jurisdiction, c.is_active, c.setup_complete,
             c.address,
             COALESCE(usr.active_users, 0) AS active_users,
             COALESCE(usr.pending_users, 0) AS pending_users
      FROM churches c
      LEFT JOIN (
        SELECT church_id,
          SUM(CASE WHEN is_locked = 0 THEN 1 ELSE 0 END) AS active_users,
          SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) AS pending_users
        FROM users WHERE church_id IS NOT NULL
        GROUP BY church_id
      ) usr ON usr.church_id = c.id`;
    const obParams = [];

    if (targetStates) {
      obSql += ` WHERE c.state_province IN (${targetStates.map(() => '?').join(',')})`;
      obParams.push(...targetStates);
    }

    const [onboardedRows] = await pool.query(obSql, obParams);

    // Build provisioned set for dedup
    const provisionedSet = new Set(
      crmRows.filter(r => r.provisioned_church_id).map(r => r.provisioned_church_id)
    );

    // Compute operational status (same logic as analytics/us-churches-enriched)
    const churches = crmRows.map(r => {
      let op_status = 'directory';
      if (r.provisioned_church_id) {
        const ob = onboardedRows.find(o => o.id === r.provisioned_church_id);
        if (ob) {
          if (ob.setup_complete || ob.active_users > 0) op_status = 'live';
          else op_status = 'onboarding';
        } else {
          op_status = 'client';
        }
      } else if (r.pipeline_stage && r.pipeline_stage !== 'prospects') {
        op_status = 'pipeline';
      }
      return { ...r, source: 'crm', op_status, onboarded_church_id: r.provisioned_church_id || null };
    });

    // Add standalone onboarded churches not in CRM
    for (const ob of onboardedRows) {
      if (provisionedSet.has(ob.id)) continue;
      let op_status = 'onboarding';
      if (ob.setup_complete || ob.active_users > 0) op_status = 'live';
      churches.push({
        id: `church_${ob.id}`,
        name: ob.name,
        street: ob.address,
        city: ob.city,
        state_code: ob.state_province,
        zip: null,
        phone: ob.phone,
        website: ob.website,
        latitude: ob.latitude,
        longitude: ob.longitude,
        jurisdiction: ob.jurisdiction,
        pipeline_stage: op_status === 'live' ? 'active_parish' : 'deployment',
        priority: null,
        is_client: 1,
        provisioned_church_id: null,
        last_contacted_at: null,
        next_follow_up: null,
        crm_notes: null,
        stage_label: op_status === 'live' ? 'Active' : 'Onboarding',
        stage_color: null,
        source: 'onboarded',
        op_status,
        onboarded_church_id: ob.id,
      });
    }

    // Apply viewMode filter
    let filtered = churches;
    if (filters.viewMode && filters.viewMode !== 'all') {
      if (filters.viewMode === 'pipeline') filtered = filtered.filter(c => c.op_status === 'pipeline');
      else if (filters.viewMode === 'onboarding') filtered = filtered.filter(c => c.op_status === 'onboarding');
      else if (filters.viewMode === 'live') filtered = filtered.filter(c => c.op_status === 'live' || c.op_status === 'client');
    }

    // Apply selected IDs filter
    if (exportMode === 'selected') {
      const idSet = new Set(selectedIds.map(String));
      filtered = filtered.filter(c => idSet.has(String(c.id)));
    }

    // Enforce export limit
    if (filtered.length > MAX_EXPORT_ROWS) {
      return res.status(400).json({
        error: `Export limited to ${MAX_EXPORT_ROWS} rows. Current result: ${filtered.length}. Apply more filters.`,
      });
    }

    if (filtered.length === 0) {
      return res.status(400).json({ error: 'No churches match the current filters' });
    }

    // Optionally join primary contacts
    let contactMap = {};
    if (includeContacts) {
      const churchIds = filtered.filter(c => typeof c.id === 'number').map(c => c.id);
      if (churchIds.length > 0) {
        const [contacts] = await pool.query(
          `SELECT church_id, CONCAT(first_name, ' ', COALESCE(last_name, '')) AS contact_name, email, phone
           FROM omai_crm_contacts WHERE church_id IN (${churchIds.map(() => '?').join(',')}) AND is_primary = 1`,
          churchIds
        );
        for (const c of contacts) {
          contactMap[c.church_id] = c;
        }
      }
    }

    // Resolve columns
    const defaultCols = ['church_id', 'church_name', 'jurisdiction', 'street', 'city', 'state', 'zip', 'phone', 'website', 'op_status', 'pipeline_stage', 'priority', 'source'];
    if (includeCoordinates) defaultCols.push('latitude', 'longitude');
    if (includeContacts) defaultCols.push('primary_contact_name', 'primary_contact_email', 'primary_contact_phone');

    const exportColumns = (columns && Array.isArray(columns) && columns.length > 0)
      ? columns.filter(c => EXPORT_COLUMN_DEFS[c])
      : defaultCols;

    // Build rows
    const rows = filtered.map(church => {
      const contact = contactMap[church.id] || {};
      const row = {
        ...church,
        primary_contact_name: contact.contact_name || '',
        primary_contact_email: contact.email || '',
        primary_contact_phone: contact.phone || '',
      };
      return exportColumns.map(colKey => {
        const def = EXPORT_COLUMN_DEFS[colKey];
        const val = row[def.key];
        return val != null ? val : '';
      });
    });

    const headers = exportColumns.map(c => EXPORT_COLUMN_DEFS[c].header);

    if (format === 'csv') {
      // CSV output
      const { format: formatCsv } = require('@fast-csv/format');
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="church-export-${timestamp}.csv"`);

      const csvStream = formatCsv({ headers: true });
      csvStream.pipe(res);
      // Write header row
      for (const row of rows) {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        csvStream.write(obj);
      }
      csvStream.end();
    } else {
      // XLSX output
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'OrthodoxMetrics CRM';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Churches');

      // Header row
      sheet.columns = exportColumns.map((colKey, i) => ({
        header: headers[i],
        key: colKey,
        width: Math.max(headers[i].length + 4, 14),
      }));

      // Style header
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.alignment = { vertical: 'middle' };
      headerRow.height = 24;

      // Data rows
      for (const row of rows) {
        const obj = {};
        exportColumns.forEach((colKey, i) => { obj[colKey] = row[i]; });
        sheet.addRow(obj);
      }

      // Auto-filter
      sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + exportColumns.length)}1` };

      // Freeze header
      sheet.views = [{ state: 'frozen', ySplit: 1 }];

      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="church-export-${timestamp}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    }

    console.log(`CRM export: ${filtered.length} churches, mode=${exportMode}, format=${format}, user=${req.session?.user?.id || 'jwt'}`);
  } catch (err) {
    console.error('CRM export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate export' });
    }
  }
});

// Export count preview (lightweight — no file generation)
router.post('/churches/export-count', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { exportMode = 'all', filters = {}, state = null, region = null, selectedIds = [] } = req.body;

    let targetStates = null;
    if (exportMode === 'state' && state) targetStates = [state.toUpperCase()];
    else if (exportMode === 'region' && region && REGIONS_MAP[region]) targetStates = REGIONS_MAP[region];

    // Count CRM churches
    let crmSql = 'SELECT COUNT(*) as cnt FROM us_churches uc';
    const crmParams = [];
    const conditions = [];

    if (targetStates) {
      conditions.push(`uc.state_code IN (${targetStates.map(() => '?').join(',')})`);
      crmParams.push(...targetStates);
    }
    if (filters.jurisdiction) {
      conditions.push('uc.jurisdiction = ?');
      crmParams.push(filters.jurisdiction);
    }
    if (filters.search) {
      conditions.push('(uc.name LIKE ? OR uc.city LIKE ?)');
      crmParams.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (conditions.length) crmSql += ' WHERE ' + conditions.join(' AND ');

    const [countResult] = await pool.query(crmSql, crmParams);
    let total = countResult[0].cnt;

    // Rough count of onboarded (not exact with dedup but good enough for preview)
    let obSql = 'SELECT COUNT(*) as cnt FROM churches c';
    const obParams = [];
    if (targetStates) {
      obSql += ` WHERE c.state_province IN (${targetStates.map(() => '?').join(',')})`;
      obParams.push(...targetStates);
    }
    const [obCount] = await pool.query(obSql, obParams);
    total += obCount[0].cnt;

    if (exportMode === 'selected') {
      total = Array.isArray(selectedIds) ? selectedIds.length : 0;
    }

    res.json({ count: total });
  } catch (err) {
    console.error('CRM export count error:', err);
    res.status(500).json({ error: 'Failed to get export count' });
  }
});

module.exports = router;
