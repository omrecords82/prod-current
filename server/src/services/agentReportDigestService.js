/**
 * agentReportDigestService.js — Daily AI Agent Checkpoint Digest
 *
 * Aggregates all agent_checkpoint_reports for a given date, renders an HTML
 * digest email, and sends it using the platform SMTP configuration.
 *
 * Entry points:
 *   generateAndSendAgentDigest(date: string)  — called from route or scheduler
 *   getAgentDigestRecipients()                — reads weekly_report_configs row 1
 *
 * The service re-uses the existing SMTP credentials (SMTP_HOST etc.) and reads
 * recipients from weekly_report_configs so no separate config table is needed.
 */

'use strict';

const nodemailer = require('nodemailer');
const { getAppPool } = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Mail transport (lazy-created singleton)
// ─────────────────────────────────────────────────────────────────────────────

let _transport = null;

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transport;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recipients — pulled from weekly_report_configs (user_id=1, or first row)
// ─────────────────────────────────────────────────────────────────────────────

async function getAgentDigestRecipients() {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT recipients FROM weekly_report_configs WHERE is_enabled = 1 ORDER BY id ASC LIMIT 1'
    );
    if (!rows.length) return [process.env.EMAIL_FROM || 'info@orthodoxmetrics.com'];
    const raw = rows[0].recipients;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) && parsed.length ? parsed : [process.env.EMAIL_FROM];
  } catch (err) {
    console.error('[AgentDigest] Failed to read recipients:', err.message);
    return [process.env.EMAIL_FROM || 'info@orthodoxmetrics.com'];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

async function generateAndSendAgentDigest(date) {
  const pool = getAppPool();

  const [reports] = await pool.query(
    `SELECT id, agent_name, host, host_role, submitted_at,
            drift_count, failed_service_count, has_dirty_repos,
            rendered_markdown, raw_json
     FROM agent_checkpoint_reports
     WHERE report_date = ?
     ORDER BY agent_name, submitted_at`,
    [date]
  );

  if (!reports.length) {
    return { sent: false, reason: `No agent reports found for ${date}.` };
  }

  const html = buildDigestHtml(date, reports);
  const text = buildDigestText(date, reports);
  const recipients = await getAgentDigestRecipients();

  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const info = await getTransport().sendMail({
    from: `"Orthodox Metrics AI Ops" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: recipients.join(', '),
    subject: `AI Agent Work Report — ${formatted}`,
    html,
    text,
  });

  console.log(`[AgentDigest] Sent digest for ${date} → ${recipients.join(', ')} msgId=${info.messageId}`);

  return {
    sent: true,
    date,
    report_count: reports.length,
    recipients,
    message_id: info.messageId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML email builder
// ─────────────────────────────────────────────────────────────────────────────

function buildDigestHtml(date, reports) {
  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const totalDrift = reports.reduce((s, r) => s + (r.drift_count || 0), 0);
  const totalFailed = reports.reduce((s, r) => s + (r.failed_service_count || 0), 0);
  const dirtyCount = reports.filter(r => r.has_dirty_repos).length;

  const agentBlocks = reports.map(r => buildAgentBlock(r)).join('\n');

  const alertBanner = (totalDrift > 0 || totalFailed > 0) ? `
    <div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:14px 18px;margin-bottom:24px;border-radius:4px;">
      <strong style="color:#92400e;">⚠ Attention Required</strong>
      <ul style="margin:8px 0 0 0;padding-left:20px;color:#78350f;">
        ${totalDrift > 0 ? `<li><strong>${totalDrift}</strong> unresolved drift item${totalDrift !== 1 ? 's' : ''} across all agents</li>` : ''}
        ${totalFailed > 0 ? `<li><strong>${totalFailed}</strong> failed systemd unit${totalFailed !== 1 ? 's' : ''} detected</li>` : ''}
        ${dirtyCount > 0 ? `<li><strong>${dirtyCount}</strong> agent${dirtyCount !== 1 ? 's' : ''} reported dirty git working tree${dirtyCount !== 1 ? 's' : ''}</li>` : ''}
      </ul>
    </div>` : `
    <div style="background:#d1fae5;border-left:4px solid #10b981;padding:14px 18px;margin-bottom:24px;border-radius:4px;">
      <strong style="color:#065f46;">✓ All Clear</strong> — No drift or failed services detected across ${reports.length} agent report${reports.length !== 1 ? 's' : ''}.
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f3f4f6; color: #1f2937; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #2d1b4e 0%, #1e2a3a 100%); padding: 28px 32px; }
    .header h1 { margin: 0 0 4px 0; font-size: 22px; color: #ffffff; font-weight: 600; }
    .header p { margin: 0; font-size: 14px; color: rgba(255,255,255,0.7); }
    .content { padding: 28px 32px; }
    .summary-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-box { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; text-align: center; }
    .stat-box .num { font-size: 28px; font-weight: 700; color: #2d1b4e; }
    .stat-box .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-top: 2px; }
    .stat-box.warn .num { color: #d97706; }
    .stat-box.danger .num { color: #dc2626; }
    .agent-card { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
    .agent-header { background: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
    .agent-name { font-weight: 600; color: #2d1b4e; font-size: 15px; }
    .agent-meta { font-size: 12px; color: #6b7280; }
    .agent-body { padding: 16px; }
    .section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin: 14px 0 6px 0; }
    .section-label:first-child { margin-top: 0; }
    .item { font-size: 13px; padding: 4px 0; color: #374151; }
    .item.drift { color: #92400e; }
    .item.failed { color: #991b1b; }
    .item.ok { color: #065f46; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-left: 6px; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-ok { background: #d1fae5; color: #065f46; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .md-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; font-size: 12px; font-family: 'Courier New', monospace; white-space: pre-wrap; color: #374151; max-height: 300px; overflow-y: auto; margin-top: 8px; }
    .footer { background: #2d1b4e; padding: 16px 32px; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: rgba(255,255,255,0.6); }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>AI Agent Work Report</h1>
    <p>${formatted} &nbsp;·&nbsp; ${reports.length} agent report${reports.length !== 1 ? 's' : ''} submitted</p>
  </div>
  <div class="content">
    <div class="summary-row">
      <div class="stat-box"><div class="num">${reports.length}</div><div class="lbl">Reports</div></div>
      <div class="stat-box ${totalDrift > 0 ? 'warn' : ''}"><div class="num">${totalDrift}</div><div class="lbl">Drift Items</div></div>
      <div class="stat-box ${totalFailed > 0 ? 'danger' : ''}"><div class="num">${totalFailed}</div><div class="lbl">Failed Units</div></div>
      <div class="stat-box ${dirtyCount > 0 ? 'warn' : ''}"><div class="num">${dirtyCount}</div><div class="lbl">Dirty Repos</div></div>
    </div>

    ${alertBanner}

    ${agentBlocks}
  </div>
  <div class="footer">
    <p>Orthodox Metrics AI Operations &nbsp;·&nbsp; Automated daily agent digest &nbsp;·&nbsp; ${new Date().getFullYear()}</p>
  </div>
</div>
</body>
</html>`;
}

function buildAgentBlock(report) {
  let raw = {};
  try { raw = typeof report.raw_json === 'string' ? JSON.parse(report.raw_json) : report.raw_json; } catch {}

  const drift = Array.isArray(raw.drift_items) ? raw.drift_items : [];
  const failed = Array.isArray(raw.failed_units) ? raw.failed_units : [];
  const next = Array.isArray(raw.next_session_suggestions) ? raw.next_session_suggestions : [];
  const repos = Array.isArray(raw.repos) ? raw.repos : [];
  const services = Array.isArray(raw.services) ? raw.services : [];

  const submittedAt = new Date(report.submitted_at).toLocaleString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  const driftBadge = report.drift_count > 0
    ? `<span class="badge badge-warn">${report.drift_count} drift</span>`
    : `<span class="badge badge-ok">clean</span>`;

  const failBadge = report.failed_service_count > 0
    ? `<span class="badge badge-danger">${report.failed_service_count} failed</span>`
    : '';

  const driftHtml = drift.length
    ? drift.map(d => `<div class="item drift">⚠ ${escHtml(d)}</div>`).join('')
    : `<div class="item ok">✓ No drift detected</div>`;

  const failedHtml = failed.length
    ? failed.map(u => `<div class="item failed">✗ <code>${escHtml(u)}</code></div>`).join('')
    : `<div class="item ok">✓ No failed units</div>`;

  const repoHtml = repos.length ? repos.map(r => {
    const status = !r.exists ? '🔴 missing' : r.dirty ? `🟡 dirty (${(r.changed||[]).length} changed, ${(r.untracked||[]).length} untracked)` : '🟢 clean';
    return `<div class="item"><code>${escHtml(r.path)}</code> — ${status}${r.branch ? ` @ <em>${escHtml(r.branch)}</em>` : ''}</div>`;
  }).join('') : '<div class="item" style="color:#9ca3af;">No repos reported</div>';

  const nextHtml = next.length
    ? next.map((s, i) => `<div class="item">${i + 1}. ${escHtml(s)}</div>`).join('')
    : '';

  return `
  <div class="agent-card">
    <div class="agent-header">
      <div>
        <span class="agent-name">${escHtml(report.agent_name)}</span>
        ${driftBadge}${failBadge}
      </div>
      <div class="agent-meta">${escHtml(report.host)}${report.host_role ? ` · ${escHtml(report.host_role)}` : ''} · submitted ${submittedAt}</div>
    </div>
    <div class="agent-body">
      <div class="section-label">Repositories</div>
      ${repoHtml}
      <div class="section-label">Drift Items</div>
      ${driftHtml}
      <div class="section-label">Failed Units</div>
      ${failedHtml}
      ${nextHtml ? `<div class="section-label">Next Session Suggestions</div>${nextHtml}` : ''}
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain text fallback
// ─────────────────────────────────────────────────────────────────────────────

function buildDigestText(date, reports) {
  const lines = [
    `AI Agent Work Report — ${date}`,
    '='.repeat(60),
    `${reports.length} agent report(s) submitted`,
    '',
  ];

  for (const r of reports) {
    lines.push(`─ Agent: ${r.agent_name}  Host: ${r.host}`);
    lines.push(`  Drift: ${r.drift_count}  Failed units: ${r.failed_service_count}  Dirty repos: ${r.has_dirty_repos ? 'yes' : 'no'}`);
    lines.push('');
    let raw = {};
    try { raw = typeof r.raw_json === 'string' ? JSON.parse(r.raw_json) : r.raw_json; } catch {}
    const drift = Array.isArray(raw.drift_items) ? raw.drift_items : [];
    if (drift.length) { drift.forEach(d => lines.push(`  ! ${d}`)); }
    const failed = Array.isArray(raw.failed_units) ? raw.failed_units : [];
    if (failed.length) { failed.forEach(u => lines.push(`  ✗ ${u}`)); }
    const next = Array.isArray(raw.next_session_suggestions) ? raw.next_session_suggestions : [];
    if (next.length) { next.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`)); }
    lines.push('');
  }

  lines.push('Orthodox Metrics AI Operations — automated daily digest');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { generateAndSendAgentDigest, getAgentDigestRecipients };
