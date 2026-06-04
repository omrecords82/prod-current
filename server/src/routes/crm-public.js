// server/src/routes/crm-public.js — Public CRM inquiry + appointment booking endpoints
const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db');

// ── GET /api/crm-public/available-slots?date=2026-03-25 ────────
// Returns available time slots for a specific date
router.get('/available-slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required.' });

    const targetDate = new Date(date + 'T12:00:00Z'); // avoid TZ shift
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date.' });
    }

    // Don't allow booking in the past or more than 60 days out
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 60);
    const checkDate = new Date(date + 'T00:00:00');

    if (checkDate < today) {
      return res.json({ success: true, slots: [], message: 'Cannot book in the past.' });
    }
    if (checkDate > maxDate) {
      return res.json({ success: true, slots: [], message: 'Cannot book more than 60 days ahead.' });
    }

    const pool = getAppPool();
    const dayOfWeek = targetDate.getUTCDay(); // 0=Sun,...6=Sat

    // Check if date is blocked
    const [blocks] = await pool.query(
      'SELECT id FROM omai_crm_appointment_blocks WHERE block_date = ?',
      [date]
    );
    if (blocks.length > 0) {
      return res.json({ success: true, slots: [], blocked: true, message: 'No availability on this date.' });
    }

    // Get slot config for this day of week
    const [slotConfigs] = await pool.query(
      'SELECT start_time, end_time, slot_duration_min FROM omai_crm_appointment_slots WHERE day_of_week = ? AND is_active = 1',
      [dayOfWeek]
    );

    if (slotConfigs.length === 0) {
      return res.json({ success: true, slots: [] });
    }

    // Get already-booked appointments for this date
    const [booked] = await pool.query(
      `SELECT scheduled_time, duration_min FROM omai_crm_appointments
       WHERE scheduled_date = ? AND status NOT IN ('cancelled')`,
      [date]
    );
    const bookedTimes = new Set(booked.map(b => {
      // Convert TIME to HH:MM string
      const t = String(b.scheduled_time);
      return t.substring(0, 5);
    }));

    // Generate available slots
    const slots = [];
    for (const config of slotConfigs) {
      const startParts = String(config.start_time).split(':').map(Number);
      const endParts = String(config.end_time).split(':').map(Number);
      const startMin = startParts[0] * 60 + startParts[1];
      const endMin = endParts[0] * 60 + endParts[1];
      const duration = config.slot_duration_min;

      for (let m = startMin; m + duration <= endMin; m += duration) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        if (!bookedTimes.has(timeStr)) {
          slots.push({
            time: timeStr,
            duration,
            display: formatTime(m),
          });
        }
      }
    }

    res.json({ success: true, slots });
  } catch (error) {
    console.error('Available slots error:', error);
    res.status(500).json({ success: false, message: 'Failed to load available slots.' });
  }
});

// ── GET /api/crm-public/available-dates?month=2026-03 ──────────
// Returns dates with availability for a given month
router.get('/available-dates', async (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Month required (YYYY-MM).' });
    }

    const pool = getAppPool();
    const [year, mon] = String(month).split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Get active slot configs
    const [slotConfigs] = await pool.query(
      'SELECT day_of_week FROM omai_crm_appointment_slots WHERE is_active = 1'
    );
    const activeDays = new Set(slotConfigs.map(s => s.day_of_week));

    // Get blocked dates
    const [blocks] = await pool.query(
      'SELECT block_date FROM omai_crm_appointment_blocks WHERE block_date >= ? AND block_date <= ?',
      [`${month}-01`, `${month}-${daysInMonth}`]
    );
    const blockedDates = new Set(blocks.map(b => {
      const d = new Date(b.block_date);
      return d.toISOString().split('T')[0];
    }));

    // Get fully booked dates (count booked vs total slots per day)
    const [bookedCounts] = await pool.query(
      `SELECT scheduled_date, COUNT(*) as cnt FROM omai_crm_appointments
       WHERE scheduled_date >= ? AND scheduled_date <= ? AND status NOT IN ('cancelled')
       GROUP BY scheduled_date`,
      [`${month}-01`, `${month}-${daysInMonth}`]
    );
    const bookedMap = {};
    for (const row of bookedCounts) {
      const d = new Date(row.scheduled_date).toISOString().split('T')[0];
      bookedMap[d] = row.cnt;
    }

    // Calculate max slots per day config
    let maxSlotsPerDay = 0;
    const [allConfigs] = await pool.query(
      'SELECT start_time, end_time, slot_duration_min FROM omai_crm_appointment_slots WHERE is_active = 1'
    );
    for (const config of allConfigs) {
      const startParts = String(config.start_time).split(':').map(Number);
      const endParts = String(config.end_time).split(':').map(Number);
      const totalMin = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
      maxSlotsPerDay += Math.floor(totalMin / config.slot_duration_min);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, mon - 1, d);
      const dateStr = dateObj.toISOString().split('T')[0];
      const dow = dateObj.getDay();

      if (dateObj < today) continue;
      if (!activeDays.has(dow)) continue;
      if (blockedDates.has(dateStr)) continue;

      const bookedCount = bookedMap[dateStr] || 0;
      if (bookedCount >= maxSlotsPerDay) continue;

      dates.push({
        date: dateStr,
        slotsRemaining: maxSlotsPerDay - bookedCount,
      });
    }

    res.json({ success: true, dates });
  } catch (error) {
    console.error('Available dates error:', error);
    res.status(500).json({ success: false, message: 'Failed to load available dates.' });
  }
});

// ── POST /api/crm-public/inquiry ───────────────────────────────
// Submit a CRM inquiry (public, no auth required)
router.post('/inquiry', async (req, res) => {
  try {
    const {
      churchId, churchName, stateCode,
      firstName, lastName, email, phone, role,
      maintainsRecords, heardAbout, heardAboutDetail,
      interestedDigitalRecords, wantsMeeting,
      appointmentDate, appointmentTime,
    } = req.body;

    if (!churchName || !firstName || !email) {
      return res.status(400).json({ success: false, message: 'Church name, first name, and email are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const pool = getAppPool();
    let appointmentId = null;

    // Book appointment if requested
    if (wantsMeeting && appointmentDate && appointmentTime) {
      // Verify slot is still available
      const [existing] = await pool.query(
        `SELECT id FROM omai_crm_appointments
         WHERE scheduled_date = ? AND scheduled_time = ? AND status NOT IN ('cancelled')`,
        [appointmentDate, appointmentTime + ':00']
      );
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'This time slot was just taken. Please select another.' });
      }

      const [apptResult] = await pool.query(
        `INSERT INTO omai_crm_appointments
         (church_id, appointment_type, contact_name, contact_email, contact_phone, scheduled_date, scheduled_time, duration_min)
         VALUES (?, 'demo', ?, ?, ?, ?, ?, 30)`,
        [churchId || null, `${firstName} ${lastName || ''}`.trim(), email, phone || null, appointmentDate, appointmentTime + ':00']
      );
      appointmentId = apptResult.insertId;
    }

    let resolvedLeadId = churchId ? parseInt(churchId, 10) : null;
    if (!resolvedLeadId || Number.isNaN(resolvedLeadId)) {
      const [existing] = await pool.query(
        `SELECT id FROM omai_crm_leads
         WHERE LOWER(name) = LOWER(?) AND (state_code = ? OR ? IS NULL OR ? = '')
         ORDER BY id ASC LIMIT 1`,
        [churchName, stateCode || null, stateCode || null, stateCode || '']
      );
      if (existing.length) {
        resolvedLeadId = existing[0].id;
      } else {
        const extId = `web-inq-${Date.now()}`;
        const [leadIns] = await pool.query(
          `INSERT INTO omai_crm_leads (ext_id, name, state_code, pipeline_stage, priority, crm_notes, last_contacted_at)
           VALUES (?, ?, ?, 'prospects', 'medium', ?, NOW())`,
          [
            extId,
            churchName,
            stateCode || '',
            `Auto-created from public web inquiry (${new Date().toISOString().slice(0, 10)})`,
          ]
        );
        resolvedLeadId = leadIns.insertId;
        await pool.query(
          `INSERT INTO omai_crm_contacts (church_id, first_name, last_name, role, email, phone, is_primary, notes)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            resolvedLeadId,
            firstName,
            lastName || null,
            role || 'Web inquiry',
            email,
            phone || null,
            'Submitted via public CRM form',
          ]
        );
        const followDue = new Date();
        followDue.setDate(followDue.getDate() + 2);
        const dueStr = followDue.toISOString().split('T')[0];
        await pool.query(
          `INSERT INTO omai_crm_followups (church_id, due_date, subject, description)
           VALUES (?, ?, ?, ?)`,
          [
            resolvedLeadId,
            dueStr,
            `Follow up: ${churchName} web inquiry`,
            `New public inquiry from ${firstName} ${lastName || ''} (${email}). Review and assign.`,
          ]
        );
        await pool.query(
          'UPDATE omai_crm_leads SET next_follow_up = ? WHERE id = ?',
          [dueStr, resolvedLeadId]
        );
      }
    }

    // Create inquiry record
    const [result] = await pool.query(
      `INSERT INTO omai_crm_inquiries
       (church_id, church_name_entered, state_code, contact_first_name, contact_last_name,
        contact_email, contact_phone, contact_role, maintains_records, heard_about,
        heard_about_detail, interested_digital_records, wants_meeting, appointment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolvedLeadId, churchName, stateCode || null,
        firstName, lastName || null, email, phone || null, role || null,
        maintainsRecords || 'unsure', heardAbout || null, heardAboutDetail || null,
        interestedDigitalRecords || 'maybe', wantsMeeting ? 1 : 0, appointmentId,
      ]
    );

    // Auto-create CRM activity if church matched
    if (resolvedLeadId) {
      try {
        await pool.query(
          `INSERT INTO omai_crm_activities (church_id, activity_type, subject, body, metadata)
           VALUES (?, 'note', ?, ?, ?)`,
          [
            resolvedLeadId,
            `Web inquiry from ${firstName} ${lastName || ''}`.trim(),
            `Inquiry submitted via registration page.\nRole: ${role || 'N/A'}\nMaintains records: ${maintainsRecords || 'unsure'}\nInterested in digital records: ${interestedDigitalRecords || 'maybe'}${wantsMeeting ? '\nMeeting requested' : ''}`,
            JSON.stringify({ source: 'web_inquiry', inquiryId: result.insertId }),
          ]
        );

        // Move prospects to engagement on inbound interest
        await pool.query(
          `UPDATE omai_crm_leads SET pipeline_stage = 'engagement', last_contacted_at = NOW()
           WHERE id = ? AND pipeline_stage IN ('prospects', 'new_lead')`,
          [resolvedLeadId]
        );
      } catch (actErr) {
        console.error('Failed to create CRM activity:', actErr);
      }
    }

    console.log(`✅ CRM inquiry #${result.insertId} from ${email} (church: ${churchName})${appointmentId ? `, appointment #${appointmentId}` : ''}`);

    res.json({
      success: true,
      inquiryId: result.insertId,
      leadId: resolvedLeadId,
      appointmentId,
      message: appointmentId
        ? 'Thank you! Your inquiry has been submitted and your meeting has been scheduled.'
        : 'Thank you! Your inquiry has been submitted. We will be in touch soon.',
    });
  } catch (error) {
    console.error('Inquiry submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit inquiry. Please try again.' });
  }
});

// Helper: format minutes to 12-hour display
function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

module.exports = router;
