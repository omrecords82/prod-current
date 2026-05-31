/**
 * agent-reports.js — AI Agent Checkpoint Report Submission & Retrieval
 *
 * Routes:
 *   POST /api/agent-reports/daily      — Submit a checkpoint report (token-auth)
 *   GET  /api/agent-reports            — List reports (session-auth, super_admin)
 *   GET  /api/agent-reports/digest     — Generate digest for a date (session-auth, super_admin)
 *   POST /api/agent-reports/send-digest — Email digest now (session-auth, super_admin)
 *
 * Authentication:
 *   POST /daily uses AGENT_SUBMIT_TOKEN bearer token (no session required).
 *   All GET/POST management endpoints require a valid session + super_admin role.
 *
 * Storage:
 *   Raw JSON and rendered Markdown are stored immutably in agent_checkpoint_reports.
 *   Multiple agents may submit on the same date; each gets its own row.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { generateAndSendAgentDigest } = require('../services/agentReportDigestService');

// ─────────────────────────────────────────────────────────────────────────────
// Token middleware (for agent submit endpoint only)
// ─────────────────────────────────────────────────────────────────────────────

function requireSubmitToken(req, res, next) {
  const token = process.env.AGENT_SUBMIT_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Agent report submission is not configured on this server (AGENT_SUBMIT_TOKEN missing).' });
  }

  const auth = req.headers['authorization'] || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!provided || provided !== token) {
    return res.status(401).json({ error: 'Invalid or missing submit token.' });
  }

  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agent-reports/daily
// ─────────────────────────────────────────────────────────────────────────────

router.post('/daily', requireSubmitToken, async (req, res) => {
  try {
    const body = req.body;

    // Validate required fields
    const { agent, host, generated_at, drift_items, failed_units, services, repos } = body;
    if (!agent || !host || !generated_at) {
      return res.status(400).json({ error: 'Payload must include agent, host, and generated_at.' });
    }

    // Derive metadata from payload
    const reportDate = generated_at.substring(0, 10); // YYYY-MM-DD
    const driftCount = Array.isArray(drift_items) ? drift_items.length : 0;
    const failedServiceCount = Array.isArray(failed_units) ? failed_units.length : 0;
    const hasDirtyRepos = Array.isArray(repos) && repos.some(r => r.dirty) ? 1 : 0;
    const nextSuggestions = body.next_session_suggestions || null;

    // Render a minimal Markdown summary (full markdown sent in payload if present)
    const markdown = body._rendered_markdown || buildMarkdown(body);

    const pool = getAppPool();
    const [result] = await pool.query(
      `INSERT INTO agent_checkpoint_reports
         (report_date, agent_name, host, host_role, submitted_at, raw_json, rendered_markdown,
          drift_count, failed_service_count, has_dirty_repos, next_suggestions)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
      [
        reportDate,
        String(agent).substring(0, 120),
        String(host).substring(0, 120),
        body.host_role ? String(body.host_role).substring(0, 255) : null,
        JSON.stringify(body),
        markdown,
        driftCount,
        failedServiceCount,
        hasDirtyRepos,
        nextSuggestions ? JSON.stringify(nextSuggestions) : null,
      ]
    );

    console.log(`[AgentReports] Stored report id=${result.insertId} agent=${agent} host=${host} date=${reportDate}`);

    return res.status(201).json({
      ok: true,
      id: result.insertId,
      report_date: reportDate,
      agent,
      host,
      drift_count: driftCount,
      failed_service_count: failedServiceCount,
    });
  } catch (err) {
    console.error('[AgentReports] POST /daily error:', err);
    return res.status(500).json({ error: 'Failed to store report.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agent-reports
// List reports with optional ?date=YYYY-MM-DD and ?agent= filters
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', authMiddleware, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const pool = getAppPool();
    const { date, agent, limit = 100, offset = 0 } = req.query;

    const conditions = [];
    const params = [];

    if (date) { conditions.push('report_date = ?'); params.push(date); }
    if (agent) { conditions.push('agent_name = ?'); params.push(agent); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT id, report_date, agent_name, host, host_role, submitted_at,
              drift_count, failed_service_count, has_dirty_repos
       FROM agent_checkpoint_reports
       ${where}
       ORDER BY submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM agent_checkpoint_reports ${where}`,
      params
    );

    return res.json({ reports: rows, total });
  } catch (err) {
    console.error('[AgentReports] GET / error:', err);
    return res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agent-reports/:id
// Fetch a single report with full markdown and raw JSON
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id', authMiddleware, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT * FROM agent_checkpoint_reports WHERE id = ?',
      [parseInt(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Report not found.' });
    return res.json({ report: rows[0] });
  } catch (err) {
    console.error('[AgentReports] GET /:id error:', err);
    return res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agent-reports/digest/summary?date=YYYY-MM-DD
// Returns the aggregated digest data (no email sent)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/digest/summary', authMiddleware, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const pool = getAppPool();
    const date = req.query.date || new Date().toISOString().substring(0, 10);

    const [reports] = await pool.query(
      `SELECT id, agent_name, host, host_role, submitted_at,
              drift_count, failed_service_count, has_dirty_repos,
              rendered_markdown, raw_json
       FROM agent_checkpoint_reports
       WHERE report_date = ?
       ORDER BY agent_name, submitted_at`,
      [date]
    );

    return res.json({ date, report_count: reports.length, reports });
  } catch (err) {
    console.error('[AgentReports] GET /digest/summary error:', err);
    return res.status(500).json({ error: 'Failed to build digest.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agent-reports/digest/send
// Generate and email the daily agent digest immediately
// ─────────────────────────────────────────────────────────────────────────────

router.post('/digest/send', authMiddleware, requireRole(['super_admin']), async (req, res) => {
  try {
    const date = req.body.date || new Date().toISOString().substring(0, 10);
    const result = await generateAndSendAgentDigest(date);
    return res.json({ ok: true, date, ...result });
  } catch (err) {
    console.error('[AgentReports] POST /digest/send error:', err);
    return res.status(500).json({ error: String(err.message) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildMarkdown(payload) {
  const lines = [
    `# Agent Checkpoint — ${payload.generated_at || ''}`,
    '',
    `- **Agent:** \`${payload.agent || 'unknown'}\``,
    `- **Host:** \`${payload.host || 'unknown'}\``,
    `- **Host role:** \`${payload.host_role || 'unspecified'}\``,
    '',
    '## Drift items',
    '',
  ];

  const drift = payload.drift_items || [];
  if (drift.length) {
    drift.forEach(d => lines.push(`- [ ] ${d}`));
  } else {
    lines.push('- [x] No drift detected.');
  }

  lines.push('', '## Failed units', '');
  const failed = payload.failed_units || [];
  if (failed.length) {
    failed.forEach(u => lines.push(`- \`${u}\``));
  } else {
    lines.push('_None._');
  }

  lines.push('', '## Next session suggestions', '');
  const next = payload.next_session_suggestions || [];
  next.forEach((s, i) => lines.push(`${i + 1}. ${s}`));

  return lines.join('\n');
}

module.exports = router;
