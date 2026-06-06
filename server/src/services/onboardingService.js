/**
 * Enrollment onboarding service — ONB_<ULID> lifecycle (source of truth).
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getAppPool } = require('../config/db');
const { generateOnboardingRequestId, isValidOnboardingRequestId } = require('../utils/onboardingId');
const onboardingCrm = require('./onboardingCrmService');

const VALID_RECORD_TYPES = ['baptism', 'marriage', 'funeral', 'chrismation', 'custom', 'other'];
const MODULE_TO_RECORD = { baptism: 'baptism', marriage: 'marriage', funeral: 'funeral', custom: 'custom' };

const STATUS_TRANSITIONS = {
  submitted: ['reviewing', 'payment_pending', 'rejected', 'cancelled'],
  reviewing: ['payment_pending', 'rejected', 'cancelled'],
  payment_pending: ['payment_received', 'rejected', 'cancelled'],
  payment_received: ['provisioning', 'rejected', 'cancelled'],
  provisioning: ['admin_account_created', 'rejected', 'cancelled'],
  admin_account_created: ['awaiting_first_login'],
  awaiting_first_login: ['record_tables_review'],
  record_tables_review: ['active'],
  active: [],
  rejected: [],
  cancelled: [],
};

const PAYMENT_TRANSITIONS = {
  not_required: ['pending', 'waived'],
  pending: ['invoice_sent', 'paid', 'failed', 'waived'],
  invoice_sent: ['paid', 'failed', 'waived'],
  paid: ['refunded'],
  failed: ['pending', 'invoice_sent'],
  refunded: [],
  waived: ['refunded'],
};

const PROVISIONING_TRANSITIONS = {
  not_started: ['queued', 'in_progress', 'failed'],
  queued: ['in_progress', 'failed'],
  in_progress: ['church_created', 'admin_created', 'completed', 'failed'],
  church_created: ['admin_created', 'completed', 'failed'],
  admin_created: ['completed', 'failed'],
  completed: [],
  failed: ['queued', 'in_progress'],
};

const DEFAULT_COLUMNS = {
  baptism: [
    { column_key: 'child_first_name', display_label: 'Child First Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 1 },
    { column_key: 'child_last_name', display_label: 'Child Last Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 2 },
    { column_key: 'date_of_birth', display_label: 'Date of Birth', data_type: 'date', required: true, visible: true, editable: true, source: 'system_default', sort_order: 3 },
    { column_key: 'baptism_date', display_label: 'Date of Baptism', data_type: 'date', required: true, visible: true, editable: true, source: 'system_default', sort_order: 4 },
    { column_key: 'birthplace', display_label: 'Place of Birth', data_type: 'text', required: false, visible: true, editable: true, source: 'system_default', sort_order: 5 },
    { column_key: 'parents', display_label: 'Parents', data_type: 'text', required: false, visible: true, editable: true, source: 'system_default', sort_order: 6 },
    { column_key: 'sponsors', display_label: 'Sponsors', data_type: 'text', required: false, visible: true, editable: true, source: 'system_default', sort_order: 7 },
    { column_key: 'officiating_priest', display_label: 'Officiating Priest', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 8 },
    { column_key: 'notes', display_label: 'Notes', data_type: 'textarea', required: false, visible: true, editable: true, source: 'system_default', sort_order: 9 },
  ],
  marriage: [
    { column_key: 'marriage_date', display_label: 'Marriage Date', data_type: 'date', required: true, visible: true, editable: true, source: 'system_default', sort_order: 1 },
    { column_key: 'groom_first_name', display_label: 'Groom First Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 2 },
    { column_key: 'groom_last_name', display_label: 'Groom Last Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 3 },
    { column_key: 'bride_first_name', display_label: 'Bride First Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 4 },
    { column_key: 'bride_last_name', display_label: 'Bride Last Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 5 },
    { column_key: 'parents', display_label: 'Parents', data_type: 'text', required: false, visible: true, editable: true, source: 'system_default', sort_order: 6 },
    { column_key: 'witnesses', display_label: 'Witnesses', data_type: 'text', required: false, visible: true, editable: true, source: 'system_default', sort_order: 7 },
    { column_key: 'license', display_label: 'Marriage License', data_type: 'text', required: false, visible: true, editable: true, source: 'system_default', sort_order: 8 },
    { column_key: 'officiating_priest', display_label: 'Officiating Priest', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 9 },
    { column_key: 'notes', display_label: 'Notes', data_type: 'textarea', required: false, visible: true, editable: true, source: 'system_default', sort_order: 10 },
  ],
  funeral: [
    { column_key: 'date_of_death', display_label: 'Date of Death', data_type: 'date', required: true, visible: true, editable: true, source: 'system_default', sort_order: 1 },
    { column_key: 'burial_date', display_label: 'Burial Date', data_type: 'date', required: false, visible: true, editable: true, source: 'system_default', sort_order: 2 },
    { column_key: 'deceased_first_name', display_label: 'Deceased First Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 3 },
    { column_key: 'deceased_last_name', display_label: 'Deceased Last Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 4 },
    { column_key: 'age', display_label: 'Age', data_type: 'number', required: false, visible: true, editable: true, source: 'system_default', sort_order: 5 },
    { column_key: 'officiating_priest', display_label: 'Officiating Priest', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 6 },
    { column_key: 'burial_location', display_label: 'Burial Location', data_type: 'text', required: false, visible: true, editable: true, source: 'system_default', sort_order: 7 },
    { column_key: 'notes', display_label: 'Notes', data_type: 'textarea', required: false, visible: true, editable: true, source: 'system_default', sort_order: 8 },
  ],
  chrismation: [
    { column_key: 'chrismation_date', display_label: 'Date of Chrismation', data_type: 'date', required: true, visible: true, editable: true, source: 'system_default', sort_order: 1 },
    { column_key: 'first_name', display_label: 'First Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 2 },
    { column_key: 'last_name', display_label: 'Last Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 3 },
    { column_key: 'sponsor_name', display_label: 'Sponsor Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 4 },
    { column_key: 'officiating_priest', display_label: 'Officiating Priest', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 5 },
    { column_key: 'notes', display_label: 'Notes', data_type: 'textarea', required: false, visible: true, editable: true, source: 'system_default', sort_order: 6 },
  ],
  custom: [
    { column_key: 'record_date', display_label: 'Record Date', data_type: 'date', required: true, visible: true, editable: true, source: 'system_default', sort_order: 1 },
    { column_key: 'subject_name', display_label: 'Subject Name', data_type: 'text', required: true, visible: true, editable: true, source: 'system_default', sort_order: 2 },
    { column_key: 'notes', display_label: 'Notes', data_type: 'textarea', required: false, visible: true, editable: true, source: 'system_default', sort_order: 3 },
  ],
};

function getActor(req) {
  const u = req?.session?.user || req?.user;
  return { actorUserId: u?.id || u?.userId || null, actorRole: u?.role || null };
}

function parseModules(modules) {
  if (!modules || typeof modules !== 'object') return [];
  return Object.entries(modules)
    .filter(([, v]) => v)
    .map(([k]) => MODULE_TO_RECORD[k] || k)
    .filter((t) => VALID_RECORD_TYPES.includes(t));
}

function buildSubmittedName(firstName, lastName, contactName) {
  if (contactName) return String(contactName).trim();
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

async function recordEvent(pool, onboardingRequestId, eventType, opts = {}) {
  await pool.query(
    `INSERT INTO onboarding_events
     (onboarding_request_id, event_type, old_status, new_status, actor_user_id, actor_role, notes, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      onboardingRequestId,
      eventType,
      opts.oldStatus || null,
      opts.newStatus || null,
      opts.actorUserId || null,
      opts.actorRole || null,
      opts.notes || null,
      opts.metadata ? JSON.stringify(opts.metadata) : null,
    ]
  );
}

async function getByPublicId(onboardingRequestId) {
  if (!isValidOnboardingRequestId(onboardingRequestId)) return null;
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM onboarding_requests WHERE onboarding_request_id = ? LIMIT 1`,
    [onboardingRequestId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  row.submitted_payload_json = typeof row.submitted_payload_json === 'string'
    ? JSON.parse(row.submitted_payload_json) : row.submitted_payload_json;
  row.selected_record_tables_json = typeof row.selected_record_tables_json === 'string'
    ? JSON.parse(row.selected_record_tables_json) : row.selected_record_tables_json;
  return row;
}

async function getEvents(onboardingRequestId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM onboarding_events WHERE onboarding_request_id = ? ORDER BY created_at ASC`,
    [onboardingRequestId]
  );
  return rows.map((r) => ({
    ...r,
    metadata_json: r.metadata_json && typeof r.metadata_json === 'string'
      ? JSON.parse(r.metadata_json) : r.metadata_json,
  }));
}

async function listRequests({ status, search, limit = 100, offset = 0 } = {}) {
  const pool = getAppPool();
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(parish_name LIKE ? OR submitted_by_email LIKE ? OR onboarding_request_id LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT onboarding_request_id, parish_name, submitted_by_name, submitted_by_email,
            status, payment_status, provisioning_status, created_at, updated_at
     FROM onboarding_requests ${where}
     ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...params, Math.min(limit, 500), offset]
  );
  return rows;
}

async function createFromEnrollment(payload, { crmRecordId = null, sourcePage = '/enroll' } = {}) {
  const pool = getAppPool();
  const {
    churchName, firstName, lastName, contactName, email, phone,
    city, state, stateCode, zip, country, timezone, jurisdiction,
    modules, recordImportMethod, startTimeline, parishSize, referral, notes,
  } = payload;

  const parishName = String(churchName || '').trim();
  const submittedEmail = String(email || '').trim().toLowerCase();
  if (!parishName || !submittedEmail) {
    throw new Error('Parish name and submitter email are required');
  }

  const selectedTables = parseModules(modules);
  if (!selectedTables.length) {
    throw new Error('At least one valid record table type must be selected');
  }

  const onboardingRequestId = generateOnboardingRequestId();
  const submittedByName = buildSubmittedName(firstName, lastName, contactName);
  const fullPayload = {
    ...payload,
    sourcePage,
    submittedAt: new Date().toISOString(),
    onboarding_request_id: onboardingRequestId,
  };

  const [result] = await pool.query(
    `INSERT INTO onboarding_requests (
      onboarding_request_id, crm_record_id, submitted_by_name, submitted_by_email, submitted_by_phone,
      parish_name, jurisdiction, city, state, country, postal_code, timezone,
      status, payment_status, provisioning_status,
      submitted_payload_json, selected_record_tables_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 'pending', 'not_started', ?, ?)`,
    [
      onboardingRequestId,
      crmRecordId,
      submittedByName,
      submittedEmail,
      phone || null,
      parishName,
      jurisdiction || null,
      city || null,
      state || stateCode || null,
      country || 'United States',
      zip || null,
      timezone || null,
      JSON.stringify(fullPayload),
      JSON.stringify(selectedTables),
    ]
  );

  await recordEvent(pool, onboardingRequestId, 'enrollment_submitted', {
    newStatus: 'submitted',
    notes: `Enrollment submitted from ${sourcePage}`,
    metadata: { parishName, email: submittedEmail },
  });

  const request = await getByPublicId(onboardingRequestId);

  try {
    const crm = await onboardingCrm.createOrUpdateEnrollmentLead(request);
    if (crm.crmRecordId && !crmRecordId) {
      await pool.query(
        'UPDATE onboarding_requests SET crm_record_id = ? WHERE onboarding_request_id = ?',
        [crm.crmRecordId, onboardingRequestId]
      );
      request.crm_record_id = crm.crmRecordId;
      await recordEvent(pool, onboardingRequestId, 'crm_linked', {
        metadata: { crmRecordId: crm.crmRecordId, crmExternalRef: onboardingRequestId },
      });
    }
  } catch (crmErr) {
    await recordEvent(pool, onboardingRequestId, 'crm_link_failed', {
      notes: crmErr.message,
    });
  }

  return { request, internalId: result.insertId };
}

function assertTransition(map, current, next, label) {
  const allowed = map[current] || [];
  if (!allowed.includes(next)) {
    throw new Error(`Invalid ${label} transition: ${current} → ${next}`);
  }
}

async function updateStatus(onboardingRequestId, newStatus, req, notes) {
  const pool = getAppPool();
  const row = await getByPublicId(onboardingRequestId);
  if (!row) throw new Error('Onboarding request not found');
  if (['rejected', 'cancelled'].includes(row.status)) {
    throw new Error('Cannot update a rejected or cancelled request');
  }
  if (newStatus === 'active' && !row.table_configuration_completed) {
    throw new Error('Cannot activate before table configuration is complete');
  }
  assertTransition(STATUS_TRANSITIONS, row.status, newStatus, 'status');

  const { actorUserId, actorRole } = getActor(req);
  await pool.query(
    'UPDATE onboarding_requests SET status = ?, updated_at = NOW() WHERE onboarding_request_id = ?',
    [newStatus, onboardingRequestId]
  );
  await recordEvent(pool, onboardingRequestId, 'status_changed', {
    oldStatus: row.status,
    newStatus,
    actorUserId,
    actorRole,
    notes,
  });
  return getByPublicId(onboardingRequestId);
}

async function updatePayment(onboardingRequestId, newPaymentStatus, req, notes) {
  const pool = getAppPool();
  const row = await getByPublicId(onboardingRequestId);
  if (!row) throw new Error('Onboarding request not found');
  if (['rejected', 'cancelled'].includes(row.status)) {
    throw new Error('Cannot update payment on a rejected or cancelled request');
  }
  assertTransition(PAYMENT_TRANSITIONS, row.payment_status, newPaymentStatus, 'payment');

  const { actorUserId, actorRole } = getActor(req);
  let statusUpdate = null;
  if (newPaymentStatus === 'paid' || newPaymentStatus === 'waived') {
    if (row.status === 'payment_pending' || row.status === 'reviewing') {
      statusUpdate = 'payment_received';
    }
  } else if (newPaymentStatus === 'invoice_sent' && row.status === 'reviewing') {
    statusUpdate = 'payment_pending';
  }

  await pool.query(
    'UPDATE onboarding_requests SET payment_status = ?, updated_at = NOW() WHERE onboarding_request_id = ?',
    [newPaymentStatus, onboardingRequestId]
  );
  await recordEvent(pool, onboardingRequestId, 'payment_status_changed', {
    oldStatus: row.payment_status,
    newStatus: newPaymentStatus,
    actorUserId,
    actorRole,
    notes,
  });

  if (statusUpdate) {
    await pool.query(
      'UPDATE onboarding_requests SET status = ? WHERE onboarding_request_id = ?',
      [statusUpdate, onboardingRequestId]
    );
    await recordEvent(pool, onboardingRequestId, 'status_changed', {
      oldStatus: row.status,
      newStatus: statusUpdate,
      actorUserId,
      actorRole,
      notes: `Auto-updated after payment → ${newPaymentStatus}`,
    });
  }

  return getByPublicId(onboardingRequestId);
}

async function updateProvisioning(onboardingRequestId, newProvStatus, req, notes) {
  const pool = getAppPool();
  const row = await getByPublicId(onboardingRequestId);
  if (!row) throw new Error('Onboarding request not found');
  assertTransition(PROVISIONING_TRANSITIONS, row.provisioning_status, newProvStatus, 'provisioning');

  const { actorUserId, actorRole } = getActor(req);
  let statusUpdate = null;
  if (newProvStatus === 'queued' && ['payment_received', 'reviewing'].includes(row.status)) {
    statusUpdate = 'provisioning';
  }

  await pool.query(
    'UPDATE onboarding_requests SET provisioning_status = ?, updated_at = NOW() WHERE onboarding_request_id = ?',
    [newProvStatus, onboardingRequestId]
  );
  await recordEvent(pool, onboardingRequestId, 'provisioning_status_changed', {
    oldStatus: row.provisioning_status,
    newStatus: newProvStatus,
    actorUserId,
    actorRole,
    notes,
  });

  if (statusUpdate) {
    await pool.query(
      'UPDATE onboarding_requests SET status = ? WHERE onboarding_request_id = ?',
      [statusUpdate, onboardingRequestId]
    );
    await recordEvent(pool, onboardingRequestId, 'status_changed', {
      oldStatus: row.status,
      newStatus: statusUpdate,
      actorUserId,
      actorRole,
    });
  }

  return getByPublicId(onboardingRequestId);
}

function generateTempPassword() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(16);
  let pwd = '';
  for (let i = 0; i < 16; i++) pwd += charset[bytes[i] % charset.length];
  return pwd;
}

async function ensureChurch(pool, row) {
  if (row.church_id) {
    const [ch] = await pool.query('SELECT id FROM churches WHERE id = ?', [row.church_id]);
    if (ch.length) return row.church_id;
  }

  const payload = row.submitted_payload_json || {};
  const email = row.submitted_by_email;
  const [existing] = await pool.query(
    'SELECT id FROM churches WHERE email = ? OR (name = ? AND city <=> ?) LIMIT 1',
    [email, row.parish_name, row.city || null]
  );
  if (existing.length) {
    await pool.query(
      'UPDATE onboarding_requests SET church_id = ? WHERE onboarding_request_id = ?',
      [existing[0].id, row.onboarding_request_id]
    );
    return existing[0].id;
  }

  const [ins] = await pool.query(
    `INSERT INTO churches (
      name, church_name, email, phone, address, city, state_province, postal_code, country,
      jurisdiction, is_active, onboarding_phase, crm_lead_id,
      has_baptism_records, has_marriage_records, has_funeral_records, setup_complete
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, 0)`,
    [
      row.parish_name,
      row.parish_name,
      email,
      row.submitted_by_phone,
      payload.address || null,
      row.city,
      row.state,
      row.postal_code,
      row.country || 'United States',
      row.jurisdiction,
      row.crm_record_id,
      (row.selected_record_tables_json || []).includes('baptism') ? 1 : 0,
      (row.selected_record_tables_json || []).includes('marriage') ? 1 : 0,
      (row.selected_record_tables_json || []).includes('funeral') ? 1 : 0,
    ]
  );
  const churchId = ins.insertId;
  await pool.query(
    'UPDATE onboarding_requests SET church_id = ? WHERE onboarding_request_id = ?',
    [churchId, row.onboarding_request_id]
  );
  return churchId;
}

async function createTemporaryAdmin(onboardingRequestId, req) {
  const pool = getAppPool();
  const row = await getByPublicId(onboardingRequestId);
  if (!row) throw new Error('Onboarding request not found');
  if (!['paid', 'waived'].includes(row.payment_status)) {
    throw new Error('Payment must be paid or waived before creating a temporary admin');
  }
  if (row.temporary_admin_user_id) {
    throw new Error('Temporary admin already exists. Use resend instructions instead.');
  }
  if (['rejected', 'cancelled'].includes(row.status)) {
    throw new Error('Cannot provision a rejected or cancelled request');
  }

  const { actorUserId, actorRole } = getActor(req);
  const churchId = await ensureChurch(pool, row);

  await pool.query(
    'UPDATE onboarding_requests SET provisioning_status = ? WHERE onboarding_request_id = ?',
    ['in_progress', onboardingRequestId]
  );

  const payload = row.submitted_payload_json || {};
  const firstName = payload.firstName || row.submitted_by_name.split(' ')[0] || 'Admin';
  const lastName = payload.lastName || row.submitted_by_name.split(' ').slice(1).join(' ') || 'User';
  const email = row.submitted_by_email;

  const [existingUser] = await pool.query('SELECT id FROM users WHERE LOWER(email) = ?', [email]);
  if (existingUser.length) {
    throw new Error('A user with this email already exists');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const [userIns] = await pool.query(
    `INSERT INTO users (email, first_name, last_name, role, church_id, onboarding_request_id,
      password_hash, must_change_password, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'church_admin', ?, ?, ?, 1, 1, NOW(), NOW())`,
    [email, firstName, lastName, churchId, onboardingRequestId, passwordHash]
  );
  const userId = userIns.insertId;

  await pool.query(
    `UPDATE onboarding_requests SET
      temporary_admin_user_id = ?, status = 'awaiting_first_login',
      provisioning_status = 'admin_created', church_id = ?, updated_at = NOW()
     WHERE onboarding_request_id = ?`,
    [userId, churchId, onboardingRequestId]
  );

  await recordEvent(pool, onboardingRequestId, 'temporary_admin_created', {
    actorUserId,
    actorRole,
    newStatus: 'awaiting_first_login',
    metadata: { userId, churchId },
  });

  await pool.query(
    'UPDATE churches SET admin_email = ?, rector_name = ? WHERE id = ?',
    [email, row.submitted_by_name, churchId]
  );

  return {
    request: await getByPublicId(onboardingRequestId),
    tempPassword,
    loginEmail: email,
    churchId,
    userId,
  };
}

async function getForUser(userId) {
  const pool = getAppPool();
  const [users] = await pool.query(
    'SELECT id, church_id, onboarding_request_id, must_change_password FROM users WHERE id = ?',
    [userId]
  );
  if (!users.length || !users[0].onboarding_request_id) return null;
  const request = await getByPublicId(users[0].onboarding_request_id);
  if (!request) return null;
  return {
    request,
    mustChangePassword: !!users[0].must_change_password,
    churchId: users[0].church_id,
  };
}

function validateColumns(columns, recordType) {
  const defaults = DEFAULT_COLUMNS[recordType] || DEFAULT_COLUMNS.custom;
  const requiredKeys = defaults.filter((c) => c.required).map((c) => c.column_key);
  const keys = new Set();
  for (const col of columns) {
    if (!col.column_key || !String(col.display_label || '').trim()) {
      throw new Error('Each column requires column_key and display_label');
    }
    if (keys.has(col.column_key)) {
      throw new Error(`Duplicate column key: ${col.column_key}`);
    }
    keys.add(col.column_key);
  }
  for (const rk of requiredKeys) {
    if (!keys.has(rk)) {
      throw new Error(`Required system column cannot be removed: ${rk}`);
    }
  }
  return true;
}

async function getRecordTableDraft(userId) {
  const ctx = await getForUser(userId);
  if (!ctx) throw new Error('No onboarding request for this user');
  const pool = getAppPool();
  const selected = ctx.request.selected_record_tables_json || [];
  const [saved] = await pool.query(
    `SELECT record_type, table_key, display_name, columns_json, enabled
     FROM church_record_table_configurations
     WHERE onboarding_request_id = ? AND church_id = ?`,
    [ctx.request.onboarding_request_id, ctx.churchId]
  );

  const savedMap = Object.fromEntries(saved.map((s) => [s.record_type, s]));

  const tables = selected.map((recordType) => {
    const tableKey = recordType === 'custom' ? 'custom_records' : `${recordType}_records`;
    const savedRow = savedMap[recordType];
    const columns = savedRow?.columns_json
      ? (typeof savedRow.columns_json === 'string' ? JSON.parse(savedRow.columns_json) : savedRow.columns_json)
      : (DEFAULT_COLUMNS[recordType] || DEFAULT_COLUMNS.custom).map((c) => ({ ...c, source: 'enrollment_selected' }));
    return {
      record_type: recordType,
      table_key: tableKey,
      display_name: savedRow?.display_name || `${recordType.charAt(0).toUpperCase()}${recordType.slice(1)} Records`,
      columns,
      recommended_columns: DEFAULT_COLUMNS[recordType] || DEFAULT_COLUMNS.custom,
      enabled: savedRow?.enabled !== 0,
    };
  });

  return {
    onboarding_request_id: ctx.request.onboarding_request_id,
    status: ctx.request.status,
    table_configuration_completed: !!ctx.request.table_configuration_completed,
    must_change_password: ctx.mustChangePassword,
    tables,
  };
}

async function saveRecordTables(userId, tables, { draft = true } = {}) {
  const ctx = await getForUser(userId);
  if (!ctx) throw new Error('No onboarding request for this user');
  if (ctx.request.table_configuration_completed && !draft) {
    throw new Error('Table configuration already completed');
  }

  const pool = getAppPool();
  const selected = new Set(ctx.request.selected_record_tables_json || []);

  for (const table of tables) {
    if (!selected.has(table.record_type)) {
      throw new Error(`Record type not in enrollment selection: ${table.record_type}`);
    }
    validateColumns(table.columns || [], table.record_type);
    const tableKey = table.table_key || `${table.record_type}_records`;
    const cols = JSON.stringify(table.columns);
    await pool.query(
      `INSERT INTO church_record_table_configurations
       (church_id, onboarding_request_id, record_type, table_key, display_name, columns_json, enabled, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), columns_json = VALUES(columns_json),
         enabled = VALUES(enabled), updated_at = NOW(), created_by = VALUES(created_by)`,
      [
        ctx.churchId,
        ctx.request.onboarding_request_id,
        table.record_type,
        tableKey,
        table.display_name,
        cols,
        table.enabled !== false ? 1 : 0,
        userId,
      ]
    );
  }

  await recordEvent(pool, ctx.request.onboarding_request_id, draft ? 'table_config_draft_saved' : 'table_config_saved', {
    actorUserId: userId,
    metadata: { tableCount: tables.length, draft },
  });

  return getRecordTableDraft(userId);
}

async function completeRecordTables(userId) {
  const draft = await getRecordTableDraft(userId);
  const pool = getAppPool();
  const onboardingRequestId = draft.onboarding_request_id;

  for (const table of draft.tables) {
    validateColumns(table.columns, table.record_type);
  }

  await pool.query(
    `UPDATE onboarding_requests SET
      table_configuration_completed = 1, first_login_completed = 1,
      status = 'active', updated_at = NOW()
     WHERE onboarding_request_id = ?`,
    [onboardingRequestId]
  );

  await recordEvent(pool, onboardingRequestId, 'table_configuration_completed', {
    actorUserId: userId,
    newStatus: 'active',
  });
  await recordEvent(pool, onboardingRequestId, 'onboarding_activated', {
    actorUserId: userId,
    newStatus: 'active',
  });

  return getByPublicId(onboardingRequestId);
}

async function markFirstLoginComplete(userId) {
  const ctx = await getForUser(userId);
  if (!ctx) return null;
  const pool = getAppPool();
  if (ctx.request.status === 'awaiting_first_login') {
    await pool.query(
      `UPDATE onboarding_requests SET first_login_completed = 1, status = 'record_tables_review', updated_at = NOW()
       WHERE onboarding_request_id = ?`,
      [ctx.request.onboarding_request_id]
    );
    await recordEvent(pool, ctx.request.onboarding_request_id, 'first_login_completed', {
      actorUserId: userId,
      newStatus: 'record_tables_review',
    });
  }
  return getByPublicId(ctx.request.onboarding_request_id);
}

async function updateAdminNotes(onboardingRequestId, notes, req) {
  const pool = getAppPool();
  const { actorUserId, actorRole } = getActor(req);
  await pool.query(
    'UPDATE onboarding_requests SET admin_notes = ?, updated_at = NOW() WHERE onboarding_request_id = ?',
    [notes, onboardingRequestId]
  );
  await recordEvent(pool, onboardingRequestId, 'admin_notes_updated', { actorUserId, actorRole, notes });
  return getByPublicId(onboardingRequestId);
}

async function linkCrm(onboardingRequestId, crmRecordId, req) {
  const row = await getByPublicId(onboardingRequestId);
  if (!row) throw new Error('Onboarding request not found');
  await onboardingCrm.linkCrmRecord(onboardingRequestId, crmRecordId);
  const { actorUserId, actorRole } = getActor(req);
  const pool = getAppPool();
  await recordEvent(pool, onboardingRequestId, 'crm_linked', {
    actorUserId,
    actorRole,
    metadata: { crmRecordId, crmExternalRef: onboardingRequestId },
  });
  return getByPublicId(onboardingRequestId);
}

function getProgressSteps(request, events) {
  const stepKeys = [
    'submitted', 'reviewing', 'payment', 'provisioning',
    'admin_created', 'first_login', 'table_configuration', 'active',
  ];
  const statusToStep = {
    submitted: 0,
    reviewing: 1,
    payment_pending: 2,
    payment_received: 2,
    provisioning: 3,
    admin_account_created: 4,
    awaiting_first_login: 5,
    record_tables_review: 6,
    active: 7,
    rejected: -1,
    cancelled: -1,
  };
  const currentIdx = statusToStep[request.status] ?? 0;
  const eventTimes = {};
  for (const ev of events) {
    if (ev.event_type === 'status_changed' && ev.new_status) {
      eventTimes[ev.new_status] = ev.created_at;
    }
  }
  return stepKeys.map((key, idx) => ({
    key,
    completed: idx <= currentIdx && request.status !== 'rejected' && request.status !== 'cancelled',
    current: idx === currentIdx,
    timestamp: eventTimes[key] || null,
  }));
}

module.exports = {
  VALID_RECORD_TYPES,
  DEFAULT_COLUMNS,
  STATUS_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  PROVISIONING_TRANSITIONS,
  parseModules,
  createFromEnrollment,
  getByPublicId,
  getEvents,
  listRequests,
  updateStatus,
  updatePayment,
  updateProvisioning,
  createTemporaryAdmin,
  getForUser,
  getRecordTableDraft,
  saveRecordTables,
  completeRecordTables,
  markFirstLoginComplete,
  updateAdminNotes,
  linkCrm,
  getProgressSteps,
  recordEvent,
};
