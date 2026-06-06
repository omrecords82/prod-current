/**
 * Enrollment submission API
 * POST /api/enrollment/submit — public enrollment (alias for wizard submit)
 * POST /api/enroll — legacy minimal form
 */
const express = require('express');
const router = express.Router();

// Forward full wizard submissions to CRM public enroll handler
router.post('/submit', (req, res) => {
  const { handlePublicEnroll } = require('./crm-public');
  return handlePublicEnroll(req, res);
});

router.post('/', async (req, res) => {
  try {
    const parishName = String(req.body?.parishName || req.body?.churchName || '').trim();
    const contactName = String(req.body?.contactName || '').trim()
      || [req.body?.firstName, req.body?.lastName].filter(Boolean).join(' ').trim();
    const email = String(req.body?.email || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const modules = req.body?.modules || { baptism: true };

    if (!parishName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Parish name and email are required.',
      });
    }
    if (!contactName && !req.body?.firstName) {
      return res.status(400).json({
        success: false,
        message: 'Contact name is required.',
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    const onboardingService = require('../services/onboardingService');
    const {
      sendEnrollmentConfirmationEmail,
      sendEnrollmentInternalNotificationEmail,
    } = require('../utils/emailService');
    const { getAppPool } = require('../config/db');

    const [firstName, ...rest] = contactName.split(' ');
    const payload = {
      churchName: parishName,
      firstName: req.body?.firstName || firstName,
      lastName: req.body?.lastName || rest.join(' '),
      email,
      phone: phone || null,
      modules,
      notes: req.body?.notes || null,
    };

    const { request } = await onboardingService.createFromEnrollment(payload, { sourcePage: '/api/enroll' });
    const onboardingRequestId = request.onboarding_request_id;
    const pool = getAppPool();

    const confirmResult = await sendEnrollmentConfirmationEmail({
      firstName: payload.firstName,
      email,
      churchName: parishName,
      reference: onboardingRequestId,
      modules: onboardingService.parseModules(modules).map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
    });

    await onboardingService.recordEvent(
      pool,
      onboardingRequestId,
      confirmResult.success ? 'confirmation_email_sent' : 'confirmation_email_failed',
      confirmResult.success ? { metadata: { messageId: confirmResult.messageId } } : { notes: confirmResult.error }
    );

    const internalResult = await sendEnrollmentInternalNotificationEmail({
      onboardingRequestId,
      parishName,
      submitterName: contactName,
      submitterEmail: email,
      submitterPhone: phone,
      location: null,
      recordTables: onboardingService.parseModules(modules),
      notes: req.body?.notes,
    });

    await onboardingService.recordEvent(
      pool,
      onboardingRequestId,
      internalResult.success ? 'internal_email_sent' : 'internal_email_failed',
      internalResult.success ? { metadata: { messageId: internalResult.messageId } } : { notes: internalResult.error }
    );

    if (!confirmResult.success) {
      return res.status(502).json({
        success: false,
        message: 'Enrollment saved but confirmation email could not be sent. Our team has been notified.',
        onboarding_request_id: onboardingRequestId,
      });
    }

    res.json({
      success: true,
      onboarding_request_id: onboardingRequestId,
      message: 'Thank you! We received your enrollment and will be in touch shortly.',
    });
  } catch (error) {
    console.error('Enrollment route error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit enrollment. Please try again.',
    });
  }
});

module.exports = router;
