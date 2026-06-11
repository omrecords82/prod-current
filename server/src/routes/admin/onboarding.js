/**
 * Admin onboarding request API — /api/admin/onboarding
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const onboarding = require('../../services/onboardingService');
const workflowGoals = require('../../services/workflowGoalsService');
const {
  sendEnrollmentConfirmationEmail,
  sendEnrollmentInternalNotificationEmail,
  sendTemporaryAdminInstructionsEmail,
} = require('../../utils/emailService');

const ADMIN_ROLES = ['super_admin', 'admin'];

router.use(requireAuth, requireRole(ADMIN_ROLES));

router.get('/', async (req, res) => {
  try {
    const rows = await onboarding.listRequests({
      status: req.query.status,
      search: req.query.search,
      limit: parseInt(req.query.limit || '100', 10),
      offset: parseInt(req.query.offset || '0', 10),
    });
    res.json({ success: true, requests: rows });
  } catch (err) {
    console.error('[admin/onboarding] list error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:onboarding_request_id/checklist', async (req, res) => {
  try {
    const id = req.params.onboarding_request_id;
    const request = await onboarding.getByPublicId(id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    const { checklist, summary } = await onboarding.getProvisioningChecklist(id);
    res.json({ success: true, onboarding_request_id: id, checklist, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:onboarding_request_id/checklist/:step_key', async (req, res) => {
  try {
    const { status, error_message, details_json, retry } = req.body || {};
    if (!status) return res.status(400).json({ success: false, message: 'status required' });
    const result = await onboarding.updateChecklistStep(
      req.params.onboarding_request_id,
      req.params.step_key,
      { status, error_message, details_json, retry },
      req
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:onboarding_request_id', async (req, res) => {
  try {
    const id = req.params.onboarding_request_id;
    const request = await onboarding.getByPublicId(id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    const events = await onboarding.getEvents(id);
    const enrollmentWorkflow = await workflowGoals.resolveEnrollmentByRequestId(id);
    const workflow = enrollmentWorkflow?.workflow || null;
    const progress = workflow
      ? workflowGoals.workflowStepsToLegacyProgress(workflow)
      : onboarding.getProgressSteps(request, events).map((s) => ({
        key: s.key,
        label: s.label || s.key.replace(/_/g, ' '),
        done: s.completed,
        current: s.current,
      }));
    res.json({ success: true, request, events, progress, workflow });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:onboarding_request_id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status required' });
    const request = await onboarding.updateStatus(req.params.onboarding_request_id, status, req, notes);
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:onboarding_request_id/payment', async (req, res) => {
  try {
    const { payment_status, notes } = req.body;
    if (!payment_status) return res.status(400).json({ success: false, message: 'payment_status required' });
    const request = await onboarding.updatePayment(req.params.onboarding_request_id, payment_status, req, notes);
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:onboarding_request_id/provisioning', async (req, res) => {
  try {
    const { provisioning_status, notes } = req.body;
    if (!provisioning_status) return res.status(400).json({ success: false, message: 'provisioning_status required' });
    const request = await onboarding.updateProvisioning(req.params.onboarding_request_id, provisioning_status, req, notes);
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:onboarding_request_id/crm', async (req, res) => {
  try {
    const { crm_record_id } = req.body;
    if (!crm_record_id) return res.status(400).json({ success: false, message: 'crm_record_id required' });
    const request = await onboarding.linkCrm(req.params.onboarding_request_id, parseInt(crm_record_id, 10), req);
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:onboarding_request_id/notes', async (req, res) => {
  try {
    const request = await onboarding.updateAdminNotes(req.params.onboarding_request_id, req.body.notes || '', req);
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:onboarding_request_id/create-temporary-admin', async (req, res) => {
  try {
    const result = await onboarding.createTemporaryAdmin(req.params.onboarding_request_id, req);
    const { request, tempPassword, loginEmail } = result;
    const emailResult = await sendTemporaryAdminInstructionsEmail({
      email: loginEmail,
      firstName: request.submitted_payload_json?.firstName || request.submitted_by_name,
      churchName: request.parish_name,
      onboardingRequestId: request.onboarding_request_id,
      tempPassword,
    });

    const { getAppPool } = require('../../config/db');
    const pool = getAppPool();
    if (!emailResult.success) {
      await onboarding.recordEvent(pool, request.onboarding_request_id, 'temporary_admin_email_failed', {
        notes: emailResult.error,
        metadata: { userId: result.userId },
      });
      return res.status(502).json({
        success: false,
        message: 'Admin created but email failed to send',
        request,
        emailError: emailResult.error,
      });
    }

    await onboarding.recordEvent(pool, request.onboarding_request_id, 'temporary_admin_email_sent', {
      metadata: { userId: result.userId },
    });

    res.json({ success: true, request, emailSent: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:onboarding_request_id/resend-admin-instructions', async (req, res) => {
  try {
    const { getAppPool } = require('../../config/db');
    const pool = getAppPool();

    const { request, tempPassword, loginEmail } = await onboarding.resetTemporaryAdminCredentials(
      req.params.onboarding_request_id,
      req
    );

    const emailResult = await sendTemporaryAdminInstructionsEmail({
      email: loginEmail,
      firstName: request.submitted_payload_json?.firstName || request.submitted_by_name,
      churchName: request.parish_name,
      onboardingRequestId: request.onboarding_request_id,
      tempPassword,
    });

    if (!emailResult.success) {
      await onboarding.recordEvent(pool, request.onboarding_request_id, 'temporary_admin_email_failed', {
        notes: emailResult.error,
      });
      return res.status(502).json({ success: false, message: emailResult.error });
    }

    await onboarding.recordEvent(pool, request.onboarding_request_id, 'temporary_admin_email_sent', {
      notes: 'Instructions resent with new temporary password',
    });

    res.json({ success: true, emailSent: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Convenience action endpoints
const ACTION_MAP = {
  'mark-reviewing': { type: 'status', value: 'reviewing' },
  'payment-pending': { type: 'status', value: 'payment_pending' },
  'mark-active': { type: 'status', value: 'active' },
  reject: { type: 'status', value: 'rejected' },
  cancel: { type: 'status', value: 'cancelled' },
  'invoice-sent': { type: 'payment', value: 'invoice_sent' },
  'payment-received': { type: 'payment', value: 'paid' },
  'payment-waived': { type: 'payment', value: 'waived' },
  'queue-provisioning': { type: 'provisioning', value: 'queued' },
  'provisioning-failed': { type: 'provisioning', value: 'failed' },
};

router.post('/:onboarding_request_id/actions/:action', async (req, res) => {
  try {
    const action = ACTION_MAP[req.params.action];
    if (!action) return res.status(400).json({ success: false, message: 'Unknown action' });
    const id = req.params.onboarding_request_id;
    const notes = req.body?.notes;
    let request;
    const adminOverride = true;
    if (action.type === 'status') {
      request = await onboarding.updateStatus(id, action.value, req, notes, { adminOverride });
    } else if (action.type === 'payment') {
      request = await onboarding.updatePayment(id, action.value, req, notes, { adminOverride });
    } else {
      request = await onboarding.updateProvisioning(id, action.value, req, notes, { adminOverride });
    }
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
