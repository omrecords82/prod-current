'use strict';

// Audit writer for the legacy PNG certificate endpoints.
//
// The new template-driven path (POST /api/certificate-templates/generate)
// already inserts into orthodoxmetrics_db.generated_certificates. The
// older per-sacrament endpoints (baptismCertificates.js, marriageCertificates.js,
// funeralCertificates.js) used to deliver a PNG without leaving any
// audit trail — so /api/platform/resource-usage/certificates couldn't
// see them. This helper closes that gap.
//
// Failure mode: an audit insert MUST NOT break the user-facing response.
// If the INSERT throws (DB hiccup, FK violation, anything), we log and
// move on. The user still gets their certificate.

const { getAppPool } = require('../config/db-compat');

const VALID_RECORD_TYPES = new Set(['baptism', 'marriage', 'funeral', 'reception']);
const VALID_STATUSES = new Set(['generated', 'downloaded', 'voided']);

async function recordCertificateGeneration({
  churchId,
  recordType,
  recordId,
  status = 'generated',
  filePath = null,
  fileSize = null,
  userId = null,
  metadata = null,
} = {}) {
  try {
    const cid = Number(churchId);
    const rid = Number(recordId);
    if (!Number.isFinite(cid) || cid <= 0) return;
    if (!Number.isFinite(rid) || rid <= 0) return;
    if (!VALID_RECORD_TYPES.has(recordType)) return;
    const safeStatus = VALID_STATUSES.has(status) ? status : 'generated';
    const uid = Number.isFinite(Number(userId)) && Number(userId) > 0 ? Number(userId) : null;
    const metadataJson = metadata == null ? null : JSON.stringify(metadata);

    await getAppPool().query(
      `INSERT INTO generated_certificates
         (church_id, record_type, record_id, template_id, file_path, file_size, generated_by, status, metadata_json)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
      [cid, recordType, rid, filePath, fileSize, uid, safeStatus, metadataJson],
    );
  } catch (err) {
    // Audit failure must never break the certificate download.
    console.error('[cert-audit] failed to write generated_certificates row:', err && err.message ? err.message : err);
  }
}

function churchIdFromReq(req) {
  if (!req || !req.user) return null;
  return req.user.church_id || req.user.churchId || null;
}

function userIdFromReq(req) {
  if (!req || !req.user) return null;
  return req.user.id || req.user.user_id || req.user.userId || null;
}

module.exports = {
  recordCertificateGeneration,
  churchIdFromReq,
  userIdFromReq,
};
