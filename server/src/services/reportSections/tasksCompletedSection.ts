/**
 * tasksCompletedSection.ts — Weekly report section: Tasks Completed
 * Pulls OM Daily items completed during the reporting period.
 */

const { getAppPool } = require('../../config/db');

export async function generate(userId: number, periodStart: string, periodEnd: string) {
  const pool = getAppPool();

  // Query OM Daily items that were completed in this period
  // The om_daily_items table is in orthodoxmetrics_db (platform DB)
  let tasks: any[] = [];
  try {
    const [rows]: any = await pool.query(
      `SELECT id, title, task_type, category, status, priority, updated_at
       FROM om_daily_items
       WHERE (assignee_id = ? OR created_by = ?)
         AND status IN ('done', 'approved', 'self_review', 'review_ready')
         AND updated_at >= ? AND updated_at <= ?
       ORDER BY updated_at DESC
       LIMIT 50`,
      [userId, userId, periodStart, periodEnd + ' 23:59:59']
    );
    tasks = rows;
  } catch (err: any) {
    // Table might not exist or have different schema — graceful fallback
    console.warn('tasksCompletedSection: Could not query om_daily_items:', err.message);
  }

  if (tasks.length === 0) {
    return {
      html: `
        <div style="margin-bottom: 24px;">
          <h2 style="color: #2d1b4e; margin: 0 0 0 0; font-size: 22px; font-weight: 700;">Tasks Completed</h2>
          <div style="height: 3px; background: linear-gradient(90deg, #0369a1, #8c249d); margin: 6px 0 16px 0; border-radius: 2px;"></div>
          <p style="color: #6b7280; font-size: 14px;">No tasks completed during this period.</p>
        </div>`,
      data: { tasks: [], count: 0 }
    };
  }

  const typeColors: Record<string, string> = {
    feature: '#8b5cf6',
    enhancement: '#3b82f6',
    bugfix: '#ef4444',
    refactor: '#f59e0b',
    chore: '#6b7280',
    docs: '#10b981',
    migration: '#ec4899',
    spike: '#06b6d4'
  };

  let html = `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #2d1b4e; margin: 0 0 0 0; font-size: 22px; font-weight: 700;">Tasks Completed <span style="font-size: 14px; font-weight: 400; color: #6b7280;">(${tasks.length})</span></h2>
      <div style="height: 3px; background: linear-gradient(90deg, #0369a1, #8c249d); margin: 6px 0 16px 0; border-radius: 2px;"></div>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>`;

  for (const task of tasks) {
    const color = typeColors[task.task_type] || '#6b7280';
    html += `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">
              <span style="display: inline-block; background: ${color}; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 8px;">${task.task_type}</span>
              <span style="font-size: 14px; color: #1f2937;">${task.title}</span>
            </td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">
              <span style="font-size: 12px; color: #9ca3af;">${task.category || ''}</span>
            </td>
          </tr>`;
  }

  html += `
        </tbody>
      </table>
    </div>`;

  return {
    html,
    data: {
      count: tasks.length,
      tasks: tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        task_type: t.task_type,
        category: t.category,
        status: t.status
      }))
    }
  };
}
