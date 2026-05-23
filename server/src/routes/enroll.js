/**
 * Enrollment Form Route
 * POST /api/enroll — Public parish enrollment submission (no auth required)
 *
 * Powers the "Enroll Now" CTA on the public homepage. Sends a single email
 * to the founder (ENROLLMENT_EMAIL env var, default nparsells82@gmail.com).
 * No DB writes by design — keep the funnel surface minimal pre-launch.
 */
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const parishName = String(req.body?.parishName || '').trim();
    const contactName = String(req.body?.contactName || '').trim();
    const email = String(req.body?.email || '').trim();
    const phone = String(req.body?.phone || '').trim();

    if (!parishName || !contactName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Parish name, contact name, and email are required.',
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }
    // Cap field lengths to keep the email reasonable + spam-resistant.
    if (parishName.length > 200 || contactName.length > 200 || email.length > 200 || phone.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'One or more fields exceed the maximum length.',
      });
    }

    const { sendEnrollmentEmail } = require('../utils/emailService');
    const result = await sendEnrollmentEmail({ parishName, contactName, email, phone });

    if (!result.success) {
      console.error('Enrollment email send failed:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Could not deliver your enrollment. Please email info@orthodoxmetrics.com directly.',
      });
    }

    res.json({
      success: true,
      message: 'Thank you! We received your enrollment and will be in touch shortly.',
    });
  } catch (error) {
    console.error('Enrollment route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit enrollment. Please try again.',
    });
  }
});

module.exports = router;
