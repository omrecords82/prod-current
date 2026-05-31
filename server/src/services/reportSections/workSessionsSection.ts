/**
 * workSessionsSection.ts — Weekly report section: Work Sessions Summary
 * Generates HTML + data for total time, session count, daily breakdown.
 */

const { getAppPool } = require('../../config/db');

interface DailyRow {
  date: string;
  session_count: number;
  total_seconds: number;
}

interface SessionRow {
  id: number;
  started_at: Date;
  ended_at: Date | null;
  duration_seconds: number | null;
  status: string;
  source_system: string;
  summary_note: string | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(dateStr: string): string {
  const clean = typeof dateStr === 'string' && dateStr.includes('T') ? dateStr.split('T')[0] : String(dateStr).substring(0, 10);
  const d = new Date(clean + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatPeriodDate(dateStr: string, includeYear = false): string {
  const clean = typeof dateStr === 'string' && dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const d = new Date(clean + 'T12:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (includeYear) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

export async function generate(userId: number, periodStart: string, periodEnd: string) {
  const pool = getAppPool();

  // Total stats
  const [totals]: any = await pool.query(
    `SELECT COUNT(*) as session_count,
            COALESCE(SUM(duration_seconds), 0) as total_seconds
     FROM work_sessions
     WHERE user_id = ? AND status IN ('completed', 'active')
       AND started_at >= ? AND started_at <= ?`,
    [userId, periodStart, periodEnd + ' 23:59:59']
  );

  // Daily breakdown
  const [daily]: any = await pool.query(
    `SELECT DATE(started_at) as date,
            COUNT(*) as session_count,
            COALESCE(SUM(duration_seconds), 0) as total_seconds
     FROM work_sessions
     WHERE user_id = ? AND status IN ('completed', 'active')
       AND started_at >= ? AND started_at <= ?
     GROUP BY DATE(started_at)
     ORDER BY date`,
    [userId, periodStart, periodEnd + ' 23:59:59']
  );

  // Individual sessions
  const [sessions]: any = await pool.query(
    `SELECT id, started_at, ended_at, duration_seconds, status, source_system, summary_note
     FROM work_sessions
     WHERE user_id = ? AND status IN ('completed', 'active')
       AND started_at >= ? AND started_at <= ?
     ORDER BY started_at`,
    [userId, periodStart, periodEnd + ' 23:59:59']
  );

  const stats = totals[0];
  const totalFormatted = formatDuration(stats.total_seconds);

  // Build HTML
  let html = `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #2d1b4e; margin: 0 0 0 0; font-size: 22px; font-weight: 700;">
        Work Sessions Summary
      </h2>
      <div style="height: 3px; background: linear-gradient(90deg, #0369a1, #8c249d); margin: 6px 0 20px 0; border-radius: 2px;"></div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;"><tr>
        <td style="vertical-align: middle; width: auto;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background: #f3e8ff; padding: 14px 22px; border-radius: 8px; text-align: center; vertical-align: middle;">
              <div style="font-size: 28px; font-weight: 700; color: #8c249d;">${totalFormatted}</div>
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Total Time</div>
            </td>
            <td style="width: 16px;"></td>
            <td style="background: #e8f4f8; padding: 14px 22px; border-radius: 8px; text-align: center; vertical-align: middle;">
              <div style="font-size: 28px; font-weight: 700; color: #0369a1;">${stats.session_count}</div>
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Sessions</div>
            </td>
          </tr></table>
        </td>
        <td style="vertical-align: middle; text-align: right; padding-left: 20px;">
          <div style="font-size: 20px; font-weight: 400; color: #6b7280;">Weekly Work Report</div>
          <div style="font-size: 14px; color: #9ca3af;">${formatPeriodDate(periodStart)} — ${formatPeriodDate(periodEnd, true)}</div>
        </td>
      </tr></table>`;

  // Daily breakdown table
  if (daily.length > 0) {
    html += `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #374151;">Day</th>
            <th style="text-align: center; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #374151;">Sessions</th>
            <th style="text-align: right; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #374151;">Time</th>
          </tr>
        </thead>
        <tbody>`;

    for (const d of daily as DailyRow[]) {
      html += `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px;">${formatDate(d.date)}</td>
            <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px;">${d.session_count}</td>
            <td style="text-align: right; padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 600;">${formatDuration(d.total_seconds)}</td>
          </tr>`;
    }

    html += `
        </tbody>
      </table>`;
  }

  // Session detail list
  if (sessions.length > 0) {
    html += `
      <details style="margin-top: 8px;">
        <summary style="cursor: pointer; font-size: 13px; color: #6b7280; padding: 4px 0;">Session Details (${sessions.length})</summary>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="text-align: left; padding: 6px 8px; font-size: 12px; color: #6b7280;">Start</th>
              <th style="text-align: left; padding: 6px 8px; font-size: 12px; color: #6b7280;">End</th>
              <th style="text-align: right; padding: 6px 8px; font-size: 12px; color: #6b7280;">Duration</th>
              <th style="text-align: left; padding: 6px 8px; font-size: 12px; color: #6b7280;">Note</th>
            </tr>
          </thead>
          <tbody>`;

    for (const s of sessions as SessionRow[]) {
      const start = new Date(s.started_at);
      const end = s.ended_at ? new Date(s.ended_at) : null;
      html += `
            <tr>
              <td style="padding: 6px 8px; font-size: 12px;">${formatDate(start.toISOString().split('T')[0])} ${formatTime(start)}</td>
              <td style="padding: 6px 8px; font-size: 12px;">${end ? formatTime(end) : '<span style="color: #ef4444;">Active</span>'}</td>
              <td style="text-align: right; padding: 6px 8px; font-size: 12px;">${s.duration_seconds ? formatDuration(s.duration_seconds) : '—'}</td>
              <td style="padding: 6px 8px; font-size: 12px; color: #6b7280; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.summary_note || '—'}</td>
            </tr>`;
    }

    html += `
          </tbody>
        </table>
      </details>`;
  }

  html += '</div>';

  return {
    html,
    data: {
      total_seconds: stats.total_seconds,
      total_formatted: totalFormatted,
      session_count: stats.session_count,
      daily: daily.map((d: DailyRow) => ({
        date: d.date,
        session_count: d.session_count,
        total_seconds: d.total_seconds
      })),
      sessions: sessions.map((s: SessionRow) => ({
        id: s.id,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_seconds: s.duration_seconds,
        status: s.status
      }))
    }
  };
}
