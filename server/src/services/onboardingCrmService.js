/**
 * CRM integration placeholder — OMAI/onboarding_requests remains source of truth.
 * onboarding_request_id is the OM-owned external reference (crm_external_ref).
 */

const { getAppPool } = require('../config/db');

/**
 * Create or update a CRM lead from an onboarding request.
 * @param {object} onboardingRequest Row from onboarding_requests
 * @returns {Promise<{ crmRecordId: number|null, linked: boolean }>}
 */
async function createOrUpdateEnrollmentLead(onboardingRequest) {
  const pool = getAppPool();
  const extRef = onboardingRequest.onboarding_request_id;
  const payload = onboardingRequest.submitted_payload_json || {};
  const parishName = onboardingRequest.parish_name;
  const state = onboardingRequest.state || payload.stateCode || '';

  if (onboardingRequest.crm_record_id) {
    await pool.query(
      `UPDATE omai_crm_leads SET crm_notes = CONCAT(COALESCE(crm_notes, ''), '\n[', ?, '] Enrollment ref: ', ?)
       WHERE id = ?`,
      [new Date().toISOString().slice(0, 10), extRef, onboardingRequest.crm_record_id]
    );
    return { crmRecordId: onboardingRequest.crm_record_id, linked: true };
  }

  const [existing] = await pool.query(
    `SELECT id FROM omai_crm_leads WHERE ext_id = ? LIMIT 1`,
    [extRef]
  );
  if (existing.length) {
    return { crmRecordId: existing[0].id, linked: true };
  }

  const [ins] = await pool.query(
    `INSERT INTO omai_crm_leads (ext_id, name, state_code, pipeline_stage, priority, crm_notes)
     VALUES (?, ?, ?, 'engagement', 'medium', ?)`,
    [
      extRef,
      parishName,
      state || null,
      `Enrollment onboarding ref ${extRef}`,
    ]
  );

  return { crmRecordId: ins.insertId, linked: true };
}

/**
 * Link an existing CRM record to an onboarding request.
 */
async function linkCrmRecord(onboardingRequestId, crmRecordId) {
  const pool = getAppPool();
  await pool.query(
    `UPDATE onboarding_requests SET crm_record_id = ?, updated_at = NOW() WHERE onboarding_request_id = ?`,
    [crmRecordId, onboardingRequestId]
  );
  await pool.query(
    `UPDATE omai_crm_leads SET ext_id = ? WHERE id = ? AND (ext_id IS NULL OR ext_id LIKE 'web-enroll-%')`,
    [onboardingRequestId, crmRecordId]
  );
  return { linked: true, crmRecordId };
}

module.exports = {
  createOrUpdateEnrollmentLead,
  linkCrmRecord,
};
