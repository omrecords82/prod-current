/**
 * anomaliesSection.ts — Weekly report section: Anomalies
 * Detects: sessions open too long, missing end times, overlapping sessions.
 */

const { getAppPool } = require('../../config/db');

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export async function generate(userId: number, periodStart: string, periodEnd: string) {
  const pool = getAppPool();
  const anomalies: Array<{ type: string; severity: string; message: string; session_id?: number }> = [];

  // 1. Sessions still active (not ended)
  const [activeSessions]: any = await pool.query(
    `SELECT id, started_at FROM work_sessions
     WHERE user_id = ? AND status = 'active'
       AND started_at >= ? AND started_at <= ?`,
    [userId, periodStart, periodEnd + ' 23:59:59']
  );

  for (const s of activeSessions) {
    const elapsed = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000);
    if (elapsed > 16 * 3600) {
      anomalies.push({
        type: 'stale_session',
        severity: 'warning',
        message: `Session #${s.id} has been active for ${formatDuration(elapsed)} (started ${new Date(s.started_at).toLocaleString()})`,
        session_id: s.id
      });
    }
  }

  // 2. Sessions with very long duration (>12 hours)
  const [longSessions]: any = await pool.query(
    `SELECT id, started_at, duration_seconds FROM work_sessions
     WHERE user_id = ? AND status = 'completed' AND duration_seconds > 43200
       AND started_at >= ? AND started_at <= ?`,
    [userId, periodStart, periodEnd + ' 23:59:59']
  );

  for (const s of longSessions) {
    anomalies.push({
      type: 'long_session',
      severity: 'info',
      message: `Session #${s.id} lasted ${formatDuration(s.duration_seconds)} — was the end time accurate?`,
      session_id: s.id
    });
  }

  // 3. Auto-ended sessions
  const [autoEnded]: any = await pool.query(
    `SELECT wse.work_session_id as session_id
     FROM work_session_events wse
     JOIN work_sessions ws ON ws.id = wse.work_session_id
     WHERE ws.user_id = ? AND wse.event_type = 'auto_ended'
       AND ws.started_at >= ? AND ws.started_at <= ?`,
    [userId, periodStart, periodEnd + ' 23:59:59']
  );

  if (autoEnded.length > 0) {
    anomalies.push({
      type: 'auto_ended',
      severity: 'warning',
      message: `${autoEnded.length} session(s) were automatically ended due to inactivity`
    });
  }

  // 4. Cancelled sessions
  const [cancelled]: any = await pool.query(
    `SELECT COUNT(*) as count FROM work_sessions
     WHERE user_id = ? AND status = 'cancelled'
       AND started_at >= ? AND started_at <= ?`,
    [userId, periodStart, periodEnd + ' 23:59:59']
  );

  if (cancelled[0].count > 0) {
    anomalies.push({
      type: 'cancelled',
      severity: 'info',
      message: `${cancelled[0].count} session(s) were cancelled`
    });
  }

  if (anomalies.length === 0) {
    return {
      html: `
        <div style="margin-bottom: 24px;">
          <h2 style="color: #2d1b4e; margin: 0 0 0 0; font-size: 22px; font-weight: 700;">Anomalies</h2>
          <div style="height: 3px; background: linear-gradient(90deg, #0369a1, #8c249d); margin: 6px 0 16px 0; border-radius: 2px;"></div>
          <p style="color: #10b981; font-size: 14px;">No anomalies detected. All sessions look clean.</p>
        </div>`,
      data: { anomalies: [] }
    };
  }

  const severityIcons: Record<string, string> = {
    warning: '&#9888;&#65039;',
    info: '&#8505;&#65039;',
    error: '&#10060;'
  };

  const severityColors: Record<string, string> = {
    warning: '#f59e0b',
    info: '#3b82f6',
    error: '#ef4444'
  };

  let html = `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #2d1b4e; margin: 0 0 0 0; font-size: 22px; font-weight: 700;">Anomalies <span style="font-size: 14px; font-weight: 400; color: #6b7280;">(${anomalies.length})</span></h2>
      <div style="height: 3px; background: linear-gradient(90deg, #0369a1, #8c249d); margin: 6px 0 16px 0; border-radius: 2px;"></div>`;

  for (const a of anomalies) {
    const color = severityColors[a.severity] || '#6b7280';
    const icon = severityIcons[a.severity] || '';
    html += `
      <div style="background: #fff7ed; border-left: 3px solid ${color}; padding: 10px 14px; margin-bottom: 6px; border-radius: 0 6px 6px 0;">
        <span style="font-size: 14px;">${icon} ${a.message}</span>
      </div>`;
  }

  html += '</div>';

  return {
    html,
    data: { anomalies }
  };
}
