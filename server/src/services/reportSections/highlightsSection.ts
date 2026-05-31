/**
 * highlightsSection.ts — Weekly report section: Highlights & Notes
 * Collects session notes from work_sessions.summary_note.
 */

const { getAppPool } = require('../../config/db');

export async function generate(userId: number, periodStart: string, periodEnd: string) {
  const pool = getAppPool();

  const [rows]: any = await pool.query(
    `SELECT id, started_at, summary_note, duration_seconds
     FROM work_sessions
     WHERE user_id = ? AND summary_note IS NOT NULL AND summary_note != ''
       AND started_at >= ? AND started_at <= ?
     ORDER BY started_at`,
    [userId, periodStart, periodEnd + ' 23:59:59']
  );

  if (rows.length === 0) {
    return {
      html: `
        <div style="margin-bottom: 24px;">
          <h2 style="color: #2d1b4e; margin: 0 0 0 0; font-size: 22px; font-weight: 700;">Highlights & Notes</h2>
          <div style="height: 3px; background: linear-gradient(90deg, #0369a1, #8c249d); margin: 6px 0 16px 0; border-radius: 2px;"></div>
          <p style="color: #6b7280; font-size: 14px;">No session notes recorded during this period.</p>
        </div>`,
      data: { notes: [] }
    };
  }

  let html = `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #2d1b4e; margin: 0 0 0 0; font-size: 22px; font-weight: 700;">Highlights & Notes</h2>
      <div style="height: 3px; background: linear-gradient(90deg, #0369a1, #8c249d); margin: 6px 0 16px 0; border-radius: 2px;"></div>`;

  for (const row of rows) {
    const date = new Date(row.started_at);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    html += `
      <div style="background: #faf5ff; border-left: 3px solid #8c249d; padding: 12px 16px; margin-bottom: 8px; border-radius: 0 6px 6px 0;">
        <div style="font-size: 11px; color: #8c249d; font-weight: 600; margin-bottom: 4px;">${dateStr}</div>
        <div style="font-size: 14px; color: #1f2937; line-height: 1.5;">${escapeHtml(row.summary_note)}</div>
      </div>`;
  }

  html += '</div>';

  return {
    html,
    data: {
      notes: rows.map((r: any) => ({
        session_id: r.id,
        date: r.started_at,
        note: r.summary_note
      }))
    }
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}
