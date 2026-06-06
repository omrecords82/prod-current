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

// Affiliation labels for public parish map (enrollment)
const AFFILIATION_NORMALIZE = {
  'greek orthodox': 'Greek Orthodox',
  goarch: 'Greek Orthodox',
  oca: 'OCA',
  'orthodox church in america': 'OCA',
  rocor: 'ROCOR',
  antiochian: 'Antiochian',
  aocana: 'Antiochian',
  serbian: 'Serbian',
  romanian: 'Romanian',
  ukrainian: 'Ukrainian',
  bulgarian: 'Bulgarian',
  albanian: 'Albanian',
  'carpatho-russian': 'Carpatho-Russian',
  georgian: 'Georgian',
};

function normalizeAffiliation(raw) {
  if (!raw) return 'Other';
  const key = String(raw).trim().toLowerCase();
  return AFFILIATION_NORMALIZE[key] || String(raw).trim();
}

// ── GET /api/crm-public/parishes-geo?state=NY ──────────────────
// GeoJSON parish pins for enrollment map (public, CRM leads)
router.get('/parishes-geo', async (req, res) => {
  try {
    const { state } = req.query;
    if (!state || typeof state !== 'string' || state.length !== 2) {
      return res.status(400).json({ success: false, message: 'state query param required (2-letter code)' });
    }

    const stateUpper = state.toUpperCase();
    const pool = getAppPool();
    const [rows] = await pool.query(
      `SELECT uc.id, uc.name, uc.street, uc.city, uc.state_code, uc.zip,
              uc.phone, uc.website, uc.latitude, uc.longitude,
              COALESCE(j.abbreviation, j.name, uc.jurisdiction, '') AS jurisdiction
       FROM omai_crm_leads uc
       LEFT JOIN jurisdictions j ON uc.jurisdiction_id = j.id
       WHERE uc.state_code = ?
       ORDER BY uc.name`,
      [stateUpper]
    );

    const features = [];
    const affiliationCounts = {};

    for (const r of rows) {
      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0;
      const affNorm = normalizeAffiliation(r.jurisdiction);
      affiliationCounts[affNorm] = (affiliationCounts[affNorm] || 0) + 1;

      const properties = {
        id: r.id,
        name: r.name,
        city: r.city || null,
        state: r.state_code,
        street: r.street || null,
        zip: r.zip || null,
        phone: r.phone || null,
        website: r.website || null,
        affiliation: r.jurisdiction || null,
        affiliation_normalized: affNorm,
        has_coordinates: hasCoords,
      };

      features.push({
        type: 'Feature',
        geometry: hasCoords ? { type: 'Point', coordinates: [lng, lat] } : null,
        properties,
      });
    }

    const affiliations = Object.entries(affiliationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      type: 'FeatureCollection',
      features,
      metadata: {
        state: stateUpper,
        total: features.length,
        withCoordinates: features.filter((f) => f.geometry !== null).length,
        withoutCoordinates: features.filter((f) => f.geometry === null).length,
        affiliations,
      },
    });
  } catch (error) {
    console.error('Enrollment parishes-geo error:', error);
    res.status(500).json({ success: false, message: 'Failed to load parish map data.' });
  }
});

// ── POST /api/crm-public/enroll ────────────────────────────────
// Parish enrollment wizard — creates CRM inquiry + follow-up (no auth)
async function handlePublicEnroll(req, res) {
  try {
    const {
      churchId,
      churchName,
      stateCode,
      firstName,
      lastName,
      email,
      phone,
      website,
      address,
      city,
      state,
      zip,
      country,
      timezone,
      jurisdiction,
      parishSize,
      referral,
      modules,
      recordImportMethod,
      startTimeline,
      adminFirstName,
      adminLastName,
      adminEmail,
      secondAdmin,
    } = req.body;

    if (!churchName || !firstName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Church name, contact first name, and email are required.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const pool = getAppPool();
    const effectiveState = stateCode || state || '';

    let resolvedLeadId = churchId ? parseInt(churchId, 10) : null;
    if (!resolvedLeadId || Number.isNaN(resolvedLeadId)) {
      const [existing] = await pool.query(
        `SELECT id FROM omai_crm_leads
         WHERE LOWER(name) = LOWER(?) AND (state_code = ? OR ? IS NULL OR ? = '')
         ORDER BY id ASC LIMIT 1`,
        [churchName, effectiveState || null, effectiveState || null, effectiveState || '']
      );
      if (existing.length) {
        resolvedLeadId = existing[0].id;
      } else {
        const extId = `web-enroll-${Date.now()}`;
        const [leadIns] = await pool.query(
          `INSERT INTO omai_crm_leads (ext_id, name, state_code, pipeline_stage, priority, crm_notes, last_contacted_at)
           VALUES (?, ?, ?, 'prospects', 'medium', ?, NOW())`,
          [
            extId,
            churchName,
            effectiveState,
            `Auto-created from public enrollment wizard (${new Date().toISOString().slice(0, 10)})`,
          ]
        );
        resolvedLeadId = leadIns.insertId;
      }
    }

    const leadUpdates = [];
    const leadParams = [];
    const setLead = (col, val) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        leadUpdates.push(`${col} = ?`);
        leadParams.push(val);
      }
    };
    setLead('street', address);
    setLead('city', city);
    setLead('state_code', effectiveState);
    setLead('zip', zip);
    setLead('phone', phone);
    setLead('website', website);
    if (jurisdiction) {
      leadUpdates.push('jurisdiction = ?');
      leadParams.push(jurisdiction);
    }
    if (leadUpdates.length) {
      leadParams.push(resolvedLeadId);
      await pool.query(`UPDATE omai_crm_leads SET ${leadUpdates.join(', ')} WHERE id = ?`, leadParams);
    }

    const [primaryRows] = await pool.query(
      'SELECT id FROM omai_crm_contacts WHERE church_id = ? AND is_primary = 1 LIMIT 1',
      [resolvedLeadId]
    );
    if (primaryRows.length) {
      await pool.query(
        `UPDATE omai_crm_contacts SET first_name = ?, last_name = ?, email = ?, phone = ?, notes = ?
         WHERE id = ?`,
        [
          firstName,
          lastName || null,
          email,
          phone || null,
          'Updated via public enrollment wizard',
          primaryRows[0].id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO omai_crm_contacts (church_id, first_name, last_name, role, email, phone, is_primary, notes)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          resolvedLeadId,
          firstName,
          lastName || null,
          'Enrollment — parish contact',
          email,
          phone || null,
          'Submitted via public enrollment wizard',
        ]
      );
    }

    const moduleLabels = {
      baptism: 'Baptism',
      marriage: 'Marriage',
      funeral: 'Funeral',
      custom: 'Custom Records',
    };
    const moduleList = modules && typeof modules === 'object'
      ? Object.entries(modules).filter(([, v]) => v).map(([k]) => moduleLabels[k] || k)
      : [];
    const importLabels = {
      om_full_service: 'Have Orthodox Metrics handle everything',
      self_service: 'Self Service',
    };
    const timelineLabels = {
      asap: 'As Soon As Possible',
      few_weeks: 'A few weeks from now',
      month_plus: "A month or more before I'm ready",
    };
    const enrollmentNote = [
      `Enrollment wizard submission`,
      `Modules: ${moduleList.length ? moduleList.join(', ') : 'none'}`,
      recordImportMethod
        ? `Record import: ${importLabels[recordImportMethod] || recordImportMethod}`
        : null,
      startTimeline
        ? `Start timeline: ${timelineLabels[startTimeline] || startTimeline}`
        : null,
      parishSize ? `Parish size: ${parishSize}` : null,
      country ? `Country: ${country}` : null,
      timezone ? `Timezone: ${timezone}` : null,
      referral ? `Referral: ${referral}` : null,
      adminEmail
        ? `Requested admin: ${adminFirstName || ''} ${adminLastName || ''} (${adminEmail})${secondAdmin ? ' + second admin later' : ''}`
        : null,
    ].filter(Boolean).join('\n');

    const followDue = new Date();
    followDue.setDate(followDue.getDate() + 2);
    const dueStr = followDue.toISOString().split('T')[0];
    await pool.query(
      `INSERT INTO omai_crm_followups (church_id, due_date, subject, description)
       VALUES (?, ?, ?, ?)`,
      [
        resolvedLeadId,
        dueStr,
        `Review enrollment: ${churchName}`,
        `New enrollment from ${firstName} ${lastName || ''} (${email}). ${enrollmentNote}`,
      ]
    );
    await pool.query(
      'UPDATE omai_crm_leads SET next_follow_up = ?, last_contacted_at = NOW() WHERE id = ?',
      [dueStr, resolvedLeadId]
    );

    const heardAbout = referral ? String(referral).slice(0, 100) : 'enrollment_wizard';
    const [result] = await pool.query(
      `INSERT INTO omai_crm_inquiries
       (church_id, church_name_entered, state_code, contact_first_name, contact_last_name,
        contact_email, contact_phone, contact_role, maintains_records, heard_about,
        heard_about_detail, interested_digital_records, wants_meeting, appointment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
      [
        resolvedLeadId,
        churchName,
        effectiveState || null,
        firstName,
        lastName || null,
        email,
        phone || null,
        'Enrollment wizard — parish contact',
        'yes',
        heardAbout,
        enrollmentNote.slice(0, 2000),
        'yes',
      ]
    );

    const reference = `OM-ENR-${result.insertId}`;

    // Create onboarding request (ONB_<ULID>) — source of truth for enrollment lifecycle
    let onboardingRequestId = null;
    try {
      const onboardingService = require('../services/onboardingService');
      const { request: obReq } = await onboardingService.createFromEnrollment(
        {
          churchName,
          firstName,
          lastName,
          email,
          phone,
          website,
          address,
          city,
          state,
          stateCode: effectiveState,
          zip,
          country,
          timezone,
          jurisdiction,
          parishSize,
          referral,
          modules,
          recordImportMethod,
          startTimeline,
          adminFirstName,
          adminLastName,
          adminEmail,
          secondAdmin,
          crmInquiryId: result.insertId,
        },
        { crmRecordId: resolvedLeadId, sourcePage: '/enroll' }
      );
      onboardingRequestId = obReq.onboarding_request_id;

      if (obReq.crm_record_id !== resolvedLeadId) {
        await pool.query(
          'UPDATE onboarding_requests SET crm_record_id = ? WHERE onboarding_request_id = ?',
          [resolvedLeadId, onboardingRequestId]
        );
      }
    } catch (obErr) {
      console.error('Onboarding request creation failed (CRM enrollment still saved):', obErr);
    }

    try {
      await pool.query(
        `INSERT INTO omai_crm_activities (church_id, activity_type, subject, body, metadata)
         VALUES (?, 'note', ?, ?, ?)`,
        [
          resolvedLeadId,
          `Enrollment request from ${firstName} ${lastName || ''}`.trim(),
          enrollmentNote,
          JSON.stringify({
            source: 'enrollment_wizard',
            inquiryId: result.insertId,
            reference,
            onboarding_request_id: onboardingRequestId || null,
            modules: moduleList,
            recordImportMethod: recordImportMethod || null,
            startTimeline: startTimeline || null,
            adminEmail: adminEmail || null,
          }),
        ]
      );
      await pool.query(
        `UPDATE omai_crm_leads SET pipeline_stage = 'engagement', last_contacted_at = NOW()
         WHERE id = ? AND pipeline_stage IN ('prospects', 'new_lead')`,
        [resolvedLeadId]
      );
    } catch (actErr) {
      console.error('Failed to create enrollment CRM activity:', actErr);
    }

    console.log(`✅ CRM enrollment ${onboardingRequestId || reference} from ${email} (church: ${churchName}, lead #${resolvedLeadId})`);

    const moduleListForEmail = moduleList;
    const locationParts = [city, effectiveState, country].filter(Boolean).join(', ');

    try {
      const { sendEnrollmentConfirmationEmail, sendEnrollmentInternalNotificationEmail } = require('../utils/emailService');
      const publicRef = onboardingRequestId || reference;
      const confirmResult = await sendEnrollmentConfirmationEmail({
        firstName,
        email,
        churchName,
        reference: publicRef,
        modules: moduleListForEmail,
        recordImportMethod: importLabels[recordImportMethod] || recordImportMethod || null,
        startTimeline: timelineLabels[startTimeline] || startTimeline || null,
      });
      if (onboardingRequestId) {
        const onboardingService = require('../services/onboardingService');
        const { getAppPool } = require('../config/db');
        const obPool = getAppPool();
        if (confirmResult.success) {
          await onboardingService.recordEvent(obPool, onboardingRequestId, 'confirmation_email_sent', {
            metadata: { messageId: confirmResult.messageId },
          });
        } else {
          await onboardingService.recordEvent(obPool, onboardingRequestId, 'confirmation_email_failed', {
            notes: confirmResult.error,
          });
        }
      }
    } catch (confirmEmailErr) {
      console.error('Enrollment confirmation email failed (enrollment still saved):', confirmEmailErr);
    }

    if (onboardingRequestId) {
      try {
        const { sendEnrollmentInternalNotificationEmail } = require('../utils/emailService');
        const onboardingService = require('../services/onboardingService');
        const { getAppPool } = require('../config/db');
        const internalResult = await sendEnrollmentInternalNotificationEmail({
          onboardingRequestId,
          parishName: churchName,
          submitterName: `${firstName} ${lastName || ''}`.trim(),
          submitterEmail: email,
          submitterPhone: phone,
          location: locationParts,
          recordTables: moduleListForEmail,
          modules: moduleListForEmail,
          notes: enrollmentNote,
        });
        const obPool = getAppPool();
        if (internalResult.success) {
          await onboardingService.recordEvent(obPool, onboardingRequestId, 'internal_email_sent', {
            metadata: { messageId: internalResult.messageId },
          });
        } else {
          await onboardingService.recordEvent(obPool, onboardingRequestId, 'internal_email_failed', {
            notes: internalResult.error,
          });
        }
      } catch (internalEmailErr) {
        console.error('Internal enrollment notification failed:', internalEmailErr);
      }
    }

    res.json({
      success: true,
      onboarding_request_id: onboardingRequestId || undefined,
      reference: onboardingRequestId || reference,
      message: 'Thank you! Your enrollment request has been received. Our team will review it within 1–2 business days.',
    });
  } catch (error) {
    console.error('Enrollment submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit enrollment. Please try again.' });
  }
}

router.post('/enroll', handlePublicEnroll);

// Helper: format minutes to 12-hour display
function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

module.exports = router;
module.exports.handlePublicEnroll = handlePublicEnroll;
