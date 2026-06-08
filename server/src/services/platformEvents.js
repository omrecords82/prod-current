/**
 * Platform Events — centralized event publishing + rule evaluation service.
 *
 * Any subsystem publishes events through publishPlatformEvent().
 * After insert, matching enabled rules are evaluated and executed.
 *
 * Append-only: events are never updated or deleted by this service.
 */

const { getAppPool } = require('../config/db');

// ─── Valid enums (kept in sync with migration) ────────────────

const VALID_SEVERITIES = ['info', 'warning', 'critical', 'success'];
const VALID_ACTOR_TYPES = ['user', 'system', 'agent', 'worker'];
const VALID_PLATFORMS = ['omai', 'om', 'shared'];

// ─── Publish ─────────────────────────────────────────────────

/**
 * Publish a platform event. Validates, inserts, then evaluates rules.
 *
 * @param {Object} evt
 * @param {string} evt.event_type      - e.g. 'task.created', 'system.degraded'
 * @param {string} evt.category        - e.g. 'task', 'system', 'alert', 'ocr'
 * @param {string} [evt.severity='info']
 * @param {string} evt.source_system   - e.g. 'task_runner', 'platform_health'
 * @param {number} [evt.source_ref_id] - FK to source entity
 * @param {string} evt.title
 * @param {string} [evt.message]
 * @param {Object} [evt.event_payload] - Rich metadata
 * @param {string} [evt.actor_type='system']
 * @param {number} [evt.actor_id]
 * @param {string} [evt.actor_name]
 * @param {number} [evt.church_id]
 * @param {string} [evt.platform='shared']
 * @returns {Promise<{id: number}>} Inserted event ID
 */
async function publishPlatformEvent(evt) {
  // Validate required fields
  if (!evt.event_type) throw new Error('event_type is required');
  if (!evt.category) throw new Error('category is required');
  if (!evt.source_system) throw new Error('source_system is required');
  if (!evt.title) throw new Error('title is required');

  // Normalize defaults
  const severity = VALID_SEVERITIES.includes(evt.severity) ? evt.severity : 'info';
  const actor_type = VALID_ACTOR_TYPES.includes(evt.actor_type) ? evt.actor_type : 'system';
  const platform = VALID_PLATFORMS.includes(evt.platform) ? evt.platform : 'shared';

  const pool = getAppPool();

  const [result] = await pool.query(
    `INSERT INTO platform_events
     (event_type, category, severity, source_system, source_ref_id,
      title, message, event_payload, actor_type, actor_id, actor_name,
      church_id, platform, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      evt.event_type,
      evt.category,
      severity,
      evt.source_system,
      evt.source_ref_id || null,
      evt.title,
      evt.message || null,
      evt.event_payload ? JSON.stringify(evt.event_payload) : null,
      actor_type,
      evt.actor_id || null,
      evt.actor_name || null,
      evt.church_id || null,
      platform,
    ]
  );

  const eventId = result.insertId;

  // Fire-and-forget rule evaluation (never crash the caller)
  evaluateRules(eventId, evt).catch(err => {
    console.error('[PlatformEvents] Rule evaluation failed:', err.message);
  });

  return { id: eventId };
}

// ─── Rule evaluation ─────────────────────────────────────────

async function evaluateRules(eventId, evt) {
  const pool = getAppPool();

  // Fetch enabled rules that could match this event
  const [rules] = await pool.query(
    `SELECT * FROM platform_event_rules WHERE is_enabled = 1`
  );

  for (const rule of rules) {
    try {
      if (!matchesRule(rule, evt)) continue;

      // Cooldown check
      if (rule.last_fired_at) {
        const elapsed = (Date.now() - new Date(rule.last_fired_at).getTime()) / 1000;
        if (elapsed < rule.cooldown_seconds) {
          await recordRuleRun(pool, rule.id, eventId, rule.action_type, null, 'skipped', 'Cooldown active');
          continue;
        }
      }

      // Count threshold check (if configured)
      const condition = parseJson(rule.condition_json);
      if (condition?.count_threshold) {
        const window = condition.time_window_seconds || 900;
        const [countResult] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM platform_events
           WHERE event_type = ? AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)`,
          [evt.event_type, window]
        );
        if (countResult[0].cnt < condition.count_threshold) {
          continue; // Threshold not met — skip silently (not a skip-record event)
        }
      }

      // Execute action
      const result = await executeAction(pool, rule, eventId, evt);

      // Update last_fired_at
      await pool.query(
        'UPDATE platform_event_rules SET last_fired_at = UTC_TIMESTAMP() WHERE id = ?',
        [rule.id]
      );

      await recordRuleRun(pool, rule.id, eventId, rule.action_type, result.target_ref_id, 'success', result.message);
    } catch (err) {
      await recordRuleRun(pool, rule.id, eventId, rule.action_type || 'unknown', null, 'failed', err.message);
    }
  }
}

function matchesRule(rule, evt) {
  // Event type match (exact or LIKE pattern)
  if (rule.event_type_pattern) {
    if (rule.event_type_pattern.includes('%')) {
      // SQL LIKE pattern — do simple JS equivalent
      const regex = new RegExp('^' + rule.event_type_pattern.replace(/%/g, '.*') + '$');
      if (!regex.test(evt.event_type)) return false;
    } else {
      if (rule.event_type_pattern !== evt.event_type) return false;
    }
  }

  // Category match
  if (rule.category && rule.category !== evt.category) return false;

  // Severity threshold
  if (rule.severity_threshold) {
    const levels = { info: 0, warning: 1, critical: 2 };
    const evtLevel = levels[evt.severity] ?? 0;
    const threshold = levels[rule.severity_threshold] ?? 0;
    if (evtLevel < threshold) return false;
  }

  // Extended conditions
  const condition = parseJson(rule.condition_json);
  if (condition) {
    if (condition.source_system && condition.source_system !== evt.source_system) return false;
    if (condition.platform && condition.platform !== evt.platform) return false;
  }

  return true;
}

async function executeAction(pool, rule, eventId, evt) {
  const config = parseJson(rule.action_config_json) || {};

  switch (rule.action_type) {
    case 'create_alert': {
      // Publish an alert event (alerts are events with category='alert')
      const alertTitle = config.title || `Alert: ${evt.title}`;
      const alertSeverity = config.severity || 'critical';

      const [alertResult] = await pool.query(
        `INSERT INTO platform_events
         (event_type, category, severity, source_system, source_ref_id,
          title, message, event_payload, actor_type, platform, created_at)
         VALUES ('alert.created', 'alert', ?, 'rule_engine', ?,
                 ?, ?, ?, 'system', ?, UTC_TIMESTAMP())`,
        [
          alertSeverity,
          eventId,
          alertTitle,
          `Triggered by rule: ${rule.name}`,
          JSON.stringify({ rule_id: rule.id, trigger_event_id: eventId, original_event: evt.event_type }),
          evt.platform || 'shared',
        ]
      );

      return { target_ref_id: alertResult.insertId, message: `Alert created: ${alertTitle}` };
    }

    case 'create_task': {
      const taskTitle = config.title || `Auto-task: ${evt.title}`;
      const taskType = config.task_type || 'automated';

      const [taskResult] = await pool.query(
        `INSERT INTO omai_tasks
         (task_type, source_feature, title, status, created_by_name, created_at, metadata_json)
         VALUES (?, 'rule_engine', ?, 'queued', 'system', UTC_TIMESTAMP(), ?)`,
        [
          taskType,
          taskTitle,
          JSON.stringify({ rule_id: rule.id, trigger_event_id: eventId }),
        ]
      );

      // Publish event for the created task
      await pool.query(
        `INSERT INTO platform_events
         (event_type, category, severity, source_system, source_ref_id,
          title, message, actor_type, platform, created_at)
         VALUES ('task.created', 'task', 'info', 'rule_engine', ?,
                 ?, ?, 'system', ?, UTC_TIMESTAMP())`,
        [
          taskResult.insertId,
          taskTitle,
          `Auto-created by rule: ${rule.name}`,
          evt.platform || 'shared',
        ]
      );

      return { target_ref_id: taskResult.insertId, message: `Task created: ${taskTitle}` };
    }

    case 'log_only':
      return { target_ref_id: null, message: `Logged: ${rule.name}` };

    default:
      throw new Error(`Unknown action_type: ${rule.action_type}`);
  }
}

async function recordRuleRun(pool, ruleId, eventId, actionTaken, targetRefId, status, message) {
  try {
    await pool.query(
      `INSERT INTO platform_event_rule_runs
       (rule_id, event_id, action_taken, target_ref_id, result_status, result_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [ruleId, eventId, actionTaken, targetRefId || null, status, message || null]
    );
  } catch (err) {
    console.error('[PlatformEvents] Failed to record rule run:', err.message);
  }
}

function parseJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

// ─── Query helpers (for endpoints) ───────────────────────────

/**
 * Query events with filters.
 */
async function queryEvents({ platform, category, severity, church_id, since, event_type, source_ref_id, limit = 50, offset = 0 } = {}) {
  const pool = getAppPool();
  let where = 'WHERE 1=1';
  const params = [];

  if (platform) { where += ' AND platform = ?'; params.push(platform); }
  if (category) { where += ' AND category = ?'; params.push(category); }
  if (severity) { where += ' AND severity = ?'; params.push(severity); }
  if (church_id) { where += ' AND church_id = ?'; params.push(church_id); }
  if (event_type) { where += ' AND event_type = ?'; params.push(event_type); }
  if (source_ref_id) { where += ' AND source_ref_id = ?'; params.push(source_ref_id); }
  if (since) { where += ' AND created_at >= ?'; params.push(since); }

  const [rows] = await pool.query(
    `SELECT id, event_type, category, severity, source_system, source_ref_id,
            title, message, event_payload, actor_type, actor_id, actor_name,
            church_id, platform,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
     FROM platform_events ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  // Parse JSON fields
  return rows.map(r => {
    if (typeof r.event_payload === 'string') {
      try { r.event_payload = JSON.parse(r.event_payload); } catch {}
    }
    return r;
  });
}

/**
 * Get event summary counts for the last N hours.
 */
async function getEventSummary(hours = 24) {
  const pool = getAppPool();

  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(severity = 'critical') AS critical,
       SUM(severity = 'warning') AS warning,
       SUM(severity = 'success') AS success,
       SUM(category = 'task') AS task_events,
       SUM(category = 'ocr') AS ocr_events,
       SUM(category = 'system') AS system_events,
       SUM(category = 'alert') AS alert_events
     FROM platform_events
     WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)`,
    [hours]
  );

  return {
    period_hours: hours,
    total: Number(rows[0].total) || 0,
    critical: Number(rows[0].critical) || 0,
    warning: Number(rows[0].warning) || 0,
    success: Number(rows[0].success) || 0,
    task_events: Number(rows[0].task_events) || 0,
    ocr_events: Number(rows[0].ocr_events) || 0,
    system_events: Number(rows[0].system_events) || 0,
    alert_events: Number(rows[0].alert_events) || 0,
  };
}

module.exports = {
  publishPlatformEvent,
  queryEvents,
  getEventSummary,
};
