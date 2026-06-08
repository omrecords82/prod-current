/**
 * User-facing onboarding API — temporary church admin first-login flow
 * /api/onboarding/*
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const onboarding = require('../services/onboardingService');
const { getAppPool } = require('../config/db');

router.use(requireAuth);

function getUserId(req) {
  return req.session?.user?.id || req.user?.userId || req.user?.id;
}

router.get('/me', async (req, res) => {
  try {
    const userId = getUserId(req);
    const ctx = await onboarding.getForUser(userId);
    if (!ctx) return res.json({ success: true, onboarding: null });
    res.json({
      success: true,
      onboarding: {
        onboarding_request_id: ctx.request.onboarding_request_id,
        status: ctx.request.status,
        must_change_password: ctx.mustChangePassword,
        table_configuration_completed: !!ctx.request.table_configuration_completed,
        layout_configuration_completed: !!ctx.request.layout_configuration_completed,
        first_login_completed: !!ctx.request.first_login_completed,
        selected_record_tables: ctx.request.selected_record_tables_json,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/record-tables', async (req, res) => {
  try {
    const data = await onboarding.getRecordTableDraft(getUserId(req));
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/record-tables', async (req, res) => {
  try {
    const { tables, draft = true } = req.body;
    if (!Array.isArray(tables)) {
      return res.status(400).json({ success: false, message: 'tables array required' });
    }
    const data = await onboarding.saveRecordTables(getUserId(req), tables, { draft });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/record-tables/complete', async (req, res) => {
  try {
    const userId = getUserId(req);
    const ctx = await onboarding.getForUser(userId);
    if (ctx?.mustChangePassword) {
      return res.status(403).json({ success: false, message: 'Password must be changed first' });
    }
    const request = await onboarding.completeRecordTables(userId);
    res.json({ success: true, request, redirectTo: '/onboarding/record-layouts' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/record-layouts', async (req, res) => {
  try {
    const data = await onboarding.getRecordLayoutDraft(getUserId(req));
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/record-layouts', async (req, res) => {
  try {
    const { selections, draft = true } = req.body;
    if (!selections || typeof selections !== 'object') {
      return res.status(400).json({ success: false, message: 'selections object required' });
    }
    const data = await onboarding.saveRecordLayouts(getUserId(req), selections, { draft });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/record-layouts/complete', async (req, res) => {
  try {
    const userId = getUserId(req);
    const ctx = await onboarding.getForUser(userId);
    if (ctx?.mustChangePassword) {
      return res.status(403).json({ success: false, message: 'Password must be changed first' });
    }
    if (!ctx?.request?.table_configuration_completed) {
      return res.status(403).json({ success: false, message: 'Record table configuration must be completed first' });
    }
    const request = await onboarding.completeRecordLayouts(userId);
    res.json({ success: true, request, redirectTo: '/portal' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Valid current and new password (8+ chars) required' });
    }

    const pool = getAppPool();
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });

    const user = users[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE id = ?',
      [hash, userId]
    );

    if (user.onboarding_request_id) {
      await onboarding.recordEvent(pool, user.onboarding_request_id, 'password_changed', {
        actorUserId: userId,
      });
      await onboarding.markFirstLoginComplete(userId);
    }

    res.json({ success: true, message: 'Password updated', redirectTo: '/onboarding/record-tables' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
