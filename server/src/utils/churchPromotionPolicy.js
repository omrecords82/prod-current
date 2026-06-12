/**
 * Gate onboarding phase 1→2 (tenant DB provisioning).
 * Directory/staged CRM rows must not receive om_church_* databases without enrollment.
 */
const { isOperationalChurchId } = require('./churchVisibility');

const ENROLLED_REQUEST_STATUSES = new Set([
  'payment_received',
  'provisioning',
  'admin_account_created',
  'awaiting_first_login',
  'record_tables_review',
  'active',
]);

const ENROLLED_PROVISIONING_STATUSES = new Set([
  'church_created',
  'admin_created',
  'completed',
]);

const ALLOWED_CLIENT_STATUSES = new Set(['enrolling', 'active_paid']);

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {{ id: number, client_status?: string|null }} churchRow
 * @param {{ fromPhase: number, toPhase: number, force?: boolean }} opts
 */
async function assertPhasePromotionAllowed(pool, churchRow, { fromPhase, toPhase, force = false }) {
  if (toPhase !== fromPhase + 1) {
    return { allowed: false, status: 400, code: 'invalid_transition', reason: 'Can only promote one phase at a time.' };
  }

  // Only gate tenant DB creation (phase 1→2).
  if (fromPhase !== 1 || toPhase !== 2) {
    return { allowed: true };
  }

  if (force) {
    return { allowed: true, forced: true };
  }

  const churchId = Number(churchRow.id);

  if (isOperationalChurchId(churchId)) {
    return { allowed: true, operational: true };
  }

  if (churchRow.client_status && ALLOWED_CLIENT_STATUSES.has(churchRow.client_status)) {
    return { allowed: true, clientStatus: churchRow.client_status };
  }

  const [onbRows] = await pool.query(
    `SELECT status, provisioning_status
     FROM onboarding_requests
     WHERE church_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [churchId]
  );

  if (onbRows.length) {
    const row = onbRows[0];
    if (
      ENROLLED_REQUEST_STATUSES.has(row.status)
      || ENROLLED_PROVISIONING_STATUSES.has(row.provisioning_status)
    ) {
      return { allowed: true, enrollment: true };
    }
  }

  if (churchRow.client_status === 'directory' || churchRow.client_status === 'pre_onboarded') {
    return {
      allowed: false,
      status: 403,
      code: 'directory_not_enrolled',
      reason:
        'Phase 1→2 blocked: directory/staged parish without enrollment. Complete enrollment first or use force override (super_admin).',
    };
  }

  return {
    allowed: false,
    status: 403,
    code: 'enrollment_required',
    reason:
      'Phase 1→2 blocked: no qualifying enrollment request. Complete payment/enrollment before provisioning a tenant database.',
  };
}

module.exports = {
  assertPhasePromotionAllowed,
  ENROLLED_REQUEST_STATUSES,
  ENROLLED_PROVISIONING_STATUSES,
  ALLOWED_CLIENT_STATUSES,
};
