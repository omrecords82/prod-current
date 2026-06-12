const { getAppPool } = require('../config/db-compat');
// server/routes/churches.js - REFACTORED for API v2 consistency
const express = require('express');
const { promisePool } = require('../config/db-compat');
const { requireAuth, requireRole } = require('../middleware/auth');
const { cleanRecords, cleanRecord } = require('../utils/dateFormatter');
const { validateChurchData, sanitizeChurchData, generateChurchId } = require('../utils/churchValidation');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();
const { operationalClientsSql } = require('../utils/churchVisibility');

function churchesListWhere(user, includeDirectory) {
  const isSuperAdmin = user.role === 'super_admin';
  if (isSuperAdmin && includeDirectory) {
    return { clause: "client_status != 'decommissioned'", params: [] };
  }
  return { clause: operationalClientsSql(), params: [] };
}

// Create middleware using requireRole - allows admin, super_admin, and manager access
const requireChurchAccess = requireRole(['admin', 'super_admin', 'manager', 'church_admin', 'priest']);

/**
 * Validate church access for user - ensures proper church_id scoping
 */
function validateChurchAccess(user, churchId = null) {
  // Super admins can access all churches
  if (user.role === 'super_admin') {
    return { allowed: true };
  }

  // Admins can access churches (allow access even without church assignment for Records Management)
  if (user.role === 'admin') {
    // If no church_id specified, allow access to see available churches
    if (!churchId) {
      return { allowed: true, church_id: user.church_id };
    }

    // If church_id specified, check if user has access to that specific church
    if (!user.church_id) {
      return { allowed: false, reason: 'Admin user has no church assignment' };
    }
    if (parseInt(churchId) !== user.church_id) {
      return { allowed: false, reason: 'Access denied to church outside your assignment' };
    }
    return { allowed: true, church_id: user.church_id };
  }

  // Managers can access their assigned church only
  if (user.role === 'church_admin') {
    // If no church_id specified, allow access to see their assigned church
    if (!churchId) {
      return { allowed: true, church_id: user.church_id };
    }

    // If church_id specified, check if user has access to that specific church
    if (!user.church_id) {
      return { allowed: false, reason: 'Manager user has no church assignment' };
    }
    if (parseInt(churchId) !== user.church_id) {
      return { allowed: false, reason: 'Access denied to church outside your assignment' };
    }
    return { allowed: true, church_id: user.church_id };
  }

  // Priests can access their assigned church only
  if (user.role === 'priest') {
    if (!churchId) {
      return { allowed: true, church_id: user.church_id };
    }
    if (!user.church_id) {
      return { allowed: false, reason: 'Priest user has no church assignment' };
    }
    if (parseInt(churchId) !== user.church_id) {
      return { allowed: false, reason: 'Access denied to church outside your assignment' };
    }
    return { allowed: true, church_id: user.church_id };
  }

  return { allowed: false, reason: 'Insufficient role for church management' };
}

// GET /api/my/churches - Get churches the current user has access to
// Allowed roles: priest, admin, manager, super_admin
router.get('/my/churches', requireAuth, async (req, res) => {
  try {
    // Ensure auth middleware has run and set req.user
    const user = req.user || req.session?.user;
    if (!user) {
      console.error('[GET /api/my/churches] No user found in req.user or req.session.user');
      return res.status(401).json(ApiResponse(false, null, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }));
    }
    
    // Ensure user has required fields (id might be userId in some cases)
    if (!user.id && !user.userId) {
      // Try to infer from session if available
      if (req.session?.user?.id) {
        user.id = req.session.user.id;
      } else if (req.session?.userId) {
        user.id = req.session.userId;
      }
    }

    // Operational clients only (Manville + Test Church) unless include_directory=1
    const includeDirectory = req.query.include_directory === '1' || req.query.include_directory === 'true';
    const isSuperAdmin = user.role === 'super_admin';
    const listWhere = churchesListWhere(user, includeDirectory);
    let query = `
      SELECT
        id,
        name,
        church_name,
        email,
        city,
        state_province,
        country,
        database_name,
        is_active,
        client_status,
        is_demo
      FROM churches
      WHERE ${listWhere.clause}
    `;

    const params = [...listWhere.params];

    // Super admins can see all provisioned churches
    if (isSuperAdmin) {
      // No additional WHERE clause needed - return all provisioned churches
    }
    // Admins and managers see their assigned church
    else if (user.role === 'admin' || user.role === 'manager' || user.role === 'church_admin') {
      if (user.church_id) {
        query += ' AND id = ?';
        params.push(user.church_id);
      } else {
        // User has no church assignment, return empty array
        return res.json(ApiResponse(true, { churches: [] }, {
          total: 0,
          user_role: user.role,
          message: 'No church assignment found'
        }));
      }
    }
    // Priests see their assigned church
    else if (user.role === 'priest') {
      if (user.church_id) {
        query += ' AND id = ?';
        params.push(user.church_id);
      } else {
        // Priest has no church assignment, return empty array
        return res.json(ApiResponse(true, { churches: [] }, {
          total: 0,
          user_role: user.role,
          message: 'No church assignment found'
        }));
      }
    }
    // Other roles: return empty (no access)
    else {
      return res.json(ApiResponse(true, { churches: [] }, {
        total: 0,
        user_role: user.role,
        message: 'Insufficient permissions'
      }));
    }

    query += ' ORDER BY name ASC';

    // Execute query
    const [churches] = await getAppPool().query(query, params);

    console.log(`✅ [GET /api/my/churches] Found ${churches.length} churches for user ${user.email} (role: ${user.role})`);

    // Fetch record counts per church (baptism, marriage, funeral)
    const includeRecordCounts = req.query.include_record_counts === '1';
    if (includeRecordCounts && churches.length > 0) {
      const pool = getAppPool();
      const countPromises = churches.map(async (church) => {
        if (!church.database_name) return;
        const db = pool.escapeId(church.database_name);
        try {
          const [[counts]] = await pool.query(
            `SELECT
               (SELECT COUNT(*) FROM ${db}.baptism_records) AS baptism_count,
               (SELECT COUNT(*) FROM ${db}.marriage_records) AS marriage_count,
               (SELECT COUNT(*) FROM ${db}.funeral_records) AS funeral_count`
          );
          church.baptism_count = counts.baptism_count || 0;
          church.marriage_count = counts.marriage_count || 0;
          church.funeral_count = counts.funeral_count || 0;
        } catch (err) {
          console.warn(`⚠️ Could not fetch record counts for ${church.database_name}:`, err.message);
          church.baptism_count = 0;
          church.marriage_count = 0;
          church.funeral_count = 0;
        }
      });
      await Promise.all(countPromises);
    }

    // Clean records
    const cleanedChurches = cleanRecords(churches);

    res.json(ApiResponse(true, { churches: cleanedChurches }, {
      total: churches.length,
      user_role: user.role
    }));
  } catch (error) {
    console.error('❌ Error fetching user churches:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch churches',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// GET /api/my/church-settings - Full church data for the authenticated user's own church
// Used by portal Parish Settings page. No admin role required — user can only read their own church.
router.get('/church-settings', requireAuth, async (req, res) => {
  try {
    const user = req.user || req.session?.user;
    if (!user) {
      return res.status(401).json(ApiResponse(false, null, { message: 'Authentication required', code: 'AUTH_REQUIRED' }));
    }

    const churchId = user.church_id;
    if (!churchId) {
      return res.status(400).json(ApiResponse(false, null, { message: 'No church assignment found', code: 'CHURCH_ID_MISSING' }));
    }

    const [churches] = await getAppPool().query(`
      SELECT
        c.id, c.name, c.church_name, c.email, c.phone, c.address, c.city, c.state_province,
        c.postal_code, c.country, c.preferred_language, c.timezone, c.currency,
        c.calendar_type, c.tax_id, c.website, c.description_multilang, c.is_active,
        c.database_name, c.setup_complete, c.has_baptism_records, c.has_marriage_records,
        c.has_funeral_records, c.jurisdiction, c.jurisdiction_id, c.short_name,
        c.logo_path, c.logo_dark_path, c.favicon_path,
        c.primary_color, c.secondary_color,
        c.created_at, c.updated_at,
        j.name AS jurisdiction_name, j.abbreviation AS jurisdiction_abbr,
        j.calendar_type AS jurisdiction_calendar_type
      FROM churches c
      LEFT JOIN jurisdictions j ON c.jurisdiction_id = j.id
      WHERE c.id = ? AND c.is_active = 1
    `, [churchId]);

    if (churches.length === 0) {
      return res.status(404).json(ApiResponse(false, null, { message: 'Church not found', code: 'CHURCH_NOT_FOUND' }));
    }

    const church = cleanRecord(churches[0]);

    // Look up CRM match to provide jurisdiction suggestions
    let crm_match = null;
    try {
      // First try direct link via provisioned_church_id
      let [crmRows] = await getAppPool().query(`
        SELECT uc.id, uc.jurisdiction, uc.jurisdiction_id,
               j.name AS jurisdiction_name, j.abbreviation AS jurisdiction_abbr,
               j.calendar_type AS jurisdiction_calendar_type
        FROM us_churches uc
        LEFT JOIN jurisdictions j ON uc.jurisdiction_id = j.id
        WHERE uc.provisioned_church_id = ?
        LIMIT 1
      `, [churchId]);

      // Fallback: match by city + state if no direct link
      if (crmRows.length === 0 && church.city && church.state_province) {
        [crmRows] = await getAppPool().query(`
          SELECT uc.id, uc.jurisdiction, uc.jurisdiction_id,
                 j.name AS jurisdiction_name, j.abbreviation AS jurisdiction_abbr,
                 j.calendar_type AS jurisdiction_calendar_type
          FROM us_churches uc
          LEFT JOIN jurisdictions j ON uc.jurisdiction_id = j.id
          WHERE uc.city = ? AND uc.state_code = ?
          LIMIT 1
        `, [church.city, church.state_province]);
      }

      if (crmRows.length > 0) {
        const match = crmRows[0];
        // If CRM has text jurisdiction but no jurisdiction_id, resolve from jurisdictions table
        if (!match.jurisdiction_id && match.jurisdiction) {
          const [jRows] = await getAppPool().query(
            'SELECT id, name, abbreviation, calendar_type FROM jurisdictions WHERE abbreviation = ? OR name LIKE ? LIMIT 1',
            [match.jurisdiction, `%${match.jurisdiction}%`]
          );
          if (jRows.length > 0) {
            match.jurisdiction_id = jRows[0].id;
            match.jurisdiction_name = jRows[0].name;
            match.jurisdiction_abbr = jRows[0].abbreviation;
            match.jurisdiction_calendar_type = jRows[0].calendar_type;
          }
        }
        crm_match = match;
      }
    } catch (_) { /* CRM lookup is best-effort */ }

    res.json(ApiResponse(true, { settings: church, crm_match }));
  } catch (error) {
    console.error('❌ Error fetching church settings:', error);
    res.status(500).json(ApiResponse(false, null, { message: 'Failed to fetch church settings', code: 'DATABASE_ERROR' }));
  }
});

// PUT /api/my/church-settings - Update church data for the authenticated user's own church
// Portal users (church_admin, priest) can update their own church's basic info.
router.put('/church-settings', requireAuth, async (req, res) => {
  try {
    const user = req.user || req.session?.user;
    if (!user) {
      return res.status(401).json(ApiResponse(false, null, { message: 'Authentication required', code: 'AUTH_REQUIRED' }));
    }

    // Only church_admin and above can update settings
    const allowedRoles = ['super_admin', 'admin', 'church_admin', 'priest'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json(ApiResponse(false, null, { message: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' }));
    }

    const churchId = user.church_id;
    if (!churchId) {
      return res.status(400).json(ApiResponse(false, null, { message: 'No church assignment found', code: 'CHURCH_ID_MISSING' }));
    }

    const body = req.body;

    // Validate color format if provided
    const colorRegex = /^#[0-9a-fA-F]{6}$/;
    if (body.primary_color && !colorRegex.test(body.primary_color)) {
      return res.status(400).json(ApiResponse(false, null, { message: 'Invalid primary_color format. Use #RRGGBB.', code: 'VALIDATION_ERROR' }));
    }
    if (body.secondary_color && !colorRegex.test(body.secondary_color)) {
      return res.status(400).json(ApiResponse(false, null, { message: 'Invalid secondary_color format. Use #RRGGBB.', code: 'VALIDATION_ERROR' }));
    }

    // Build dynamic SET clause — only update fields present in request body
    const allowedFields = [
      'name', 'email', 'phone', 'website', 'address', 'city', 'state_province',
      'postal_code', 'country', 'description_multilang', 'preferred_language',
      'timezone', 'currency', 'calendar_type', 'tax_id', 'jurisdiction', 'jurisdiction_id',
      'has_baptism_records', 'has_marriage_records', 'has_funeral_records',
      'short_name', 'primary_color', 'secondary_color',
    ];
    const booleanFields = ['has_baptism_records', 'has_marriage_records', 'has_funeral_records'];
    const nullableFields = ['short_name', 'primary_color', 'secondary_color', 'description_multilang', 'timezone', 'currency', 'tax_id', 'jurisdiction_id'];

    const setClauses = [];
    const params = [];
    for (const field of allowedFields) {
      if (body[field] === undefined) continue;
      setClauses.push(`${field} = ?`);
      if (booleanFields.includes(field)) {
        params.push(body[field] ? 1 : 0);
      } else if (nullableFields.includes(field)) {
        params.push(body[field] || null);
      } else {
        params.push(body[field]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json(ApiResponse(false, null, { message: 'No fields to update', code: 'VALIDATION_ERROR' }));
    }

    setClauses.push('updated_at = NOW()');
    params.push(churchId);

    await getAppPool().query(
      `UPDATE churches SET ${setClauses.join(', ')} WHERE id = ?`,
      params,
    );

    console.log(`✅ Church ${churchId} settings updated by ${user.email}`);
    res.json(ApiResponse(true, { message: 'Church settings updated successfully' }));
  } catch (error) {
    console.error('❌ Error updating church settings:', error);
    res.status(500).json(ApiResponse(false, null, { message: 'Failed to update church settings', code: 'DATABASE_ERROR' }));
  }
});

// GET /api/my/churches - Alias route for when router is mounted at /api/my
// This handles /api/my/churches requests
router.get('/churches', requireAuth, async (req, res) => {
  try {
    const user = req.user || req.session?.user;
    if (!user) {
      console.error('[GET /churches] No user found');
      return res.status(401).json(ApiResponse(false, null, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }));
    }

    // Operational clients only unless include_directory=1
    const includeDirectory = req.query.include_directory === '1' || req.query.include_directory === 'true';
    const isSuperAdmin = user.role === 'super_admin';
    const listWhere = churchesListWhere(user, includeDirectory);
    let query = `
      SELECT
        id,
        name,
        church_name,
        email,
        city,
        state_province,
        country,
        database_name,
        is_active,
        client_status,
        is_demo
      FROM churches
      WHERE ${listWhere.clause}
    `;

    const params = [...listWhere.params];

    // Super admins can see all provisioned churches
    if (isSuperAdmin) {
      console.log(`🔍 [GET /churches] Super admin ${user.email} requesting churches (directory=${includeDirectory})`);
    }
    // Other roles see their assigned church
    else if (user.church_id) {
      query += ' AND id = ?';
      params.push(user.church_id);
      console.log(`🔍 [GET /churches] User ${user.email} (${user.role}) requesting church ${user.church_id}`);
    } else {
      // User has no church assignment
      console.log(`⚠️ [GET /churches] User ${user.email} has no church assignment`);
      return res.json(ApiResponse(true, { churches: [] }, {
        total: 0,
        user_role: user.role,
        message: 'No church assignment found'
      }));
    }

    query += ' ORDER BY name ASC';

    const [churches] = await getAppPool().query(query, params);

    console.log(`✅ [GET /churches] Found ${churches.length} churches for user ${user.email}`);

    // Fetch record counts per church if requested
    const includeRecordCounts = req.query.include_record_counts === '1';
    if (includeRecordCounts && churches.length > 0) {
      const pool = getAppPool();
      const countPromises = churches.map(async (church) => {
        if (!church.database_name) return;
        const db = pool.escapeId(church.database_name);
        try {
          const [[counts]] = await pool.query(
            `SELECT
               (SELECT COUNT(*) FROM ${db}.baptism_records) AS baptism_count,
               (SELECT COUNT(*) FROM ${db}.marriage_records) AS marriage_count,
               (SELECT COUNT(*) FROM ${db}.funeral_records) AS funeral_count`
          );
          church.baptism_count = counts.baptism_count || 0;
          church.marriage_count = counts.marriage_count || 0;
          church.funeral_count = counts.funeral_count || 0;
        } catch (err) {
          console.warn(`⚠️ Could not fetch record counts for ${church.database_name}:`, err.message);
          church.baptism_count = 0;
          church.marriage_count = 0;
          church.funeral_count = 0;
        }
      });
      await Promise.all(countPromises);
    }

    // Map to consistent format
    const formattedChurches = churches.map(church => ({
      id: church.id,
      church_name: church.church_name || church.name,
      name: church.name || church.church_name,
      email: church.email,
      city: church.city,
      state_province: church.state_province,
      country: church.country,
      database_name: church.database_name,
      is_active: church.is_active,
      ...(includeRecordCounts && {
        baptism_count: church.baptism_count || 0,
        marriage_count: church.marriage_count || 0,
        funeral_count: church.funeral_count || 0,
      }),
    }));

    res.json(ApiResponse(true, { churches: formattedChurches }, {
      total: churches.length,
      user_role: user.role
    }));
  } catch (error) {
    console.error('❌ Error fetching churches:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch churches',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// GET /api/church-info - Get current user's church info (convenience endpoint)
router.get('/church-info', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json(ApiResponse(false, null, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }));
    }

    // Get church_id from user session or request
    const churchId = user.church_id || req.query.church_id || null;
    
    if (!churchId) {
      // For super_admin without church_id, return first active church or null
      if (user.role === 'super_admin') {
        const [defaultChurches] = await getAppPool().query(
          'SELECT id, name, email, is_active FROM churches WHERE is_active = 1 ORDER BY id LIMIT 1'
        );
        if (defaultChurches.length > 0) {
          return res.json(ApiResponse(true, { church: cleanRecord(defaultChurches[0]) }));
        }
      }
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Church ID not found in session',
        code: 'CHURCH_ID_MISSING'
      }));
    }

    // Get church by ID
    const [churches] = await getAppPool().query(
      'SELECT id, name, email, is_active FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    res.json(ApiResponse(true, { church: cleanRecord(churches[0]) }));
  } catch (error) {
    console.error('❌ Error fetching church info:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch church info',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// GET /api/churches - Get all churches (admin, super_admin, and manager roles)
router.get('/', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    console.log('🔍 Churches GET endpoint - User:', req.user?.email, 'Role:', req.user?.role);

    // 🔧 SAFETY CHECK: Ensure req.user exists (should be set by auth middleware)
    if (!req.user) {
      console.error('❌ req.user is missing after auth middleware');
      return res.status(401).json(
        ApiResponse.error('Authentication error - user context missing', 'USER_CONTEXT_MISSING', 401)
      );
    }

    // Validate user access
    const access = validateChurchAccess(req.user);
    if (!access.allowed) {
      console.log('❌ Access denied:', access.reason);
      return res.status(403).json(
        ApiResponse.error('Access denied', 'INSUFFICIENT_PERMISSIONS', 403, { reason: access.reason })
      );
    }

    // Build query based on user permissions
    let query = `
      SELECT 
        id,
        name,
        email,
        phone,
        address,
        city,
        state_province,
        postal_code,
        country,
        preferred_language,
        timezone,
        currency,
        tax_id,
        website,
        description_multilang,
        settings,
        is_active,
        database_name,
        setup_complete,
        created_at,
        updated_at
      FROM churches 
      WHERE is_active = 1
    `;

    const params = [];

    // If admin or manager (not super_admin), restrict to their church only
    if ((req.user.role === 'admin' || req.user.role === 'church_admin') && access.church_id) {
      query += ' AND id = ?';
      params.push(access.church_id);
    }

    query += ' ORDER BY name ASC';

    // Execute query against orthodoxmetrics_db (via promisePool)
    const [churches] = await getAppPool().query(query, params);

    console.log(`✅ Found ${churches.length} churches from orthodoxmetrics_db`);

    // Clean records using dateFormatter
    const cleanedChurches = cleanRecords(churches);

    const response = ApiResponse.success({ churches: cleanedChurches }, {
      total: churches.length,
      user_role: req.user.role,
      access_level: req.user.role === 'super_admin' ? 'all_churches' : 'assigned_church'
    });

    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching churches:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch churches',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// GET /api/churches/:id - Get church by ID
router.get('/:id', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    console.log('🔍 GET church by ID - User:', req.user?.email, 'Church ID:', churchId);

    // 🔧 SAFETY CHECK: Ensure req.user exists (should be set by auth middleware)
    if (!req.user) {
      console.error('❌ req.user is missing after auth middleware');
      return res.status(401).json(
        ApiResponse.error('Authentication error - user context missing', 'USER_CONTEXT_MISSING', 401)
      );
    }

    if (isNaN(churchId)) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid church ID format',
        code: 'INVALID_CHURCH_ID'
      }));
    }

    // Validate user access to this specific church
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      console.log('❌ Access denied to church:', access.reason);
      return res.status(403).json(
        ApiResponse.error('Access denied', 'INSUFFICIENT_PERMISSIONS', 403, { reason: access.reason })
      );
    }

    // Query orthodoxmetrics_db for church details
    const [churches] = await getAppPool().query(`
      SELECT 
        id,
        name,
        email,
        phone,
        address,
        city,
        state_province,
        postal_code,
        country,
        preferred_language,
        timezone,
        currency,
        tax_id,
        website,
        description_multilang,
        is_active,
        database_name,
        setup_complete,
        created_at,
        updated_at
      FROM churches 
      WHERE id = ? AND is_active = 1
    `, [churchId]);

    if (churches.length === 0) {
      console.log('❌ Church not found with ID:', churchId);
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    console.log('✅ Church found:', churches[0].name);
    const cleanedChurch = cleanRecord(churches[0]);

    res.json(ApiResponse(true, { church: cleanedChurch }));
  } catch (error) {
    console.error('❌ Error fetching church by ID:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch church',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// POST /api/churches/create - Create new church (super_admin only)
router.post('/create', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    console.log('🏛️ Creating new church - User:', req.user?.email);
    console.log('📝 Church data received:', req.body);

    // Validate church data
    const validation = validateChurchData(req.body);
    if (!validation.isValid) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.errors,
        warnings: validation.warnings
      }));
    }

    // Sanitize church data
    const churchData = sanitizeChurchData(req.body);
    console.log('🧹 Sanitized church data');

    // Check for existing church name in orthodoxmetrics_db
    const [existingChurch] = await getAppPool().query(
      'SELECT id FROM churches WHERE name = ?',
      [churchData.name]
    );

    if (existingChurch.length > 0) {
      return res.status(409).json(ApiResponse(false, null, {
        message: 'Church name already exists',
        code: 'DUPLICATE_CHURCH_NAME',
        field: 'name'
      }));
    }

    // Check for existing email
    const [existingEmail] = await getAppPool().query(
      'SELECT id FROM churches WHERE email = ?',
      [churchData.email]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json(ApiResponse(false, null, {
        message: 'Email already in use',
        code: 'DUPLICATE_EMAIL',
        field: 'email'
      }));
    }

    // Generate unique church identifier
    const church_id = generateChurchId(churchData.name);

    // Insert new church into orthodoxmetrics_db.churches
    const [result] = await getAppPool().query(`
      INSERT INTO churches (
        name,
        email,
        phone,
        website,
        address,
        city,
        state_province,
        postal_code,
        country,
        description_multilang,
        preferred_language,
        timezone,
        currency,
        tax_id,
        is_active,
        database_name,
        created_by,
        setup_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      churchData.name,
      churchData.email,
      churchData.phone || null,
      churchData.website || null,
      churchData.address || null,
      churchData.city || null,
      churchData.state_province || null,
      churchData.postal_code || null,
      churchData.country || 'US',
      churchData.description || null,
      churchData.preferred_language || 'en',
      churchData.timezone || 'America/New_York',
      churchData.currency || 'USD',
      churchData.tax_id || null,
      true, // is_active
      null, // database_name (will be set if/when church-specific DB is created)
      req.user.id, // created_by
      false // setup_complete
    ]);

    const newChurchId = result.insertId;
    console.log('✅ Church created with ID:', newChurchId);

    // Get the created church for response
    const [newChurch] = await getAppPool().query(
      'SELECT * FROM churches WHERE id = ?',
      [newChurchId]
    );

    const cleanedChurch = cleanRecord(newChurch[0]);

    res.status(201).json(ApiResponse(true, {
      church: cleanedChurch,
      message: 'Church created successfully'
    }, null, {
      church_id: newChurchId,
      created_by: req.user.email
    }));

  } catch (error) {
    console.error('❌ Error creating church:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to create church',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// PUT /api/churches/:id - Update church (admin for own church, super_admin for any)
router.put('/:id', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    console.log('🔧 Updating church ID:', churchId, 'User:', req.user?.email);

    if (isNaN(churchId)) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid church ID format',
        code: 'INVALID_CHURCH_ID'
      }));
    }

    // Validate user access to this church
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(
        ApiResponse.error('Access denied', 'INSUFFICIENT_PERMISSIONS', 403, { reason: access.reason })
      );
    }

    // Validate update data
    const validation = validateChurchData(req.body, true); // true = update mode
    if (!validation.isValid) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      }));
    }

    // Sanitize update data
    const updateData = sanitizeChurchData(req.body, true);

    // Check if church exists
    const [existing] = await getAppPool().query(
      'SELECT id, name, email FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (existing.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Check for name conflicts (if name is being changed)
    if (updateData.name && updateData.name !== existing[0].name) {
      const [nameConflict] = await getAppPool().query(
        'SELECT id FROM churches WHERE name = ? AND id != ?',
        [updateData.name, churchId]
      );

      if (nameConflict.length > 0) {
        return res.status(409).json(ApiResponse(false, null, {
          message: 'Church name already exists',
          code: 'DUPLICATE_CHURCH_NAME'
        }));
      }
    }

    // Check for email conflicts (if email is being changed)
    if (updateData.email && updateData.email !== existing[0].email) {
      const [emailConflict] = await getAppPool().query(
        'SELECT id FROM churches WHERE email = ? AND id != ?',
        [updateData.email, churchId]
      );

      if (emailConflict.length > 0) {
        return res.status(409).json(ApiResponse(false, null, {
          message: 'Email already in use',
          code: 'DUPLICATE_EMAIL'
        }));
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'No valid fields to update',
        code: 'NO_UPDATE_DATA'
      }));
    }

    // Add updated_at and updated_by
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateFields.push('updated_by = ?');
    updateValues.push(req.user.id);
    updateValues.push(churchId); // for WHERE clause

    // Execute update
    await getAppPool().query(
      `UPDATE churches SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated church
    const [updatedChurch] = await getAppPool().query(
      'SELECT * FROM churches WHERE id = ?',
      [churchId]
    );

    const cleanedChurch = cleanRecord(updatedChurch[0]);

    console.log('✅ Church updated successfully');

    res.json(ApiResponse(true, {
      church: cleanedChurch,
      message: 'Church updated successfully'
    }, null, {
      updated_by: req.user.email,
      fields_updated: Object.keys(updateData)
    }));

  } catch (error) {
    console.error('❌ Error updating church:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to update church',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// DELETE /api/churches/:id - Soft delete church (super_admin only)
router.delete('/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    console.log('🗑️ Soft deleting church ID:', churchId, 'User:', req.user?.email);

    if (isNaN(churchId)) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid church ID format',
        code: 'INVALID_CHURCH_ID'
      }));
    }

    // Check if church exists
    const [existing] = await getAppPool().query(
      'SELECT id, name FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (existing.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Soft delete (set is_active = 0)
    await getAppPool().query(
      'UPDATE churches SET is_active = 0, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?',
      [req.user.id, churchId]
    );

    console.log('✅ Church soft deleted successfully');

    res.json(ApiResponse(true, {
      message: 'Church deleted successfully',
      church_name: existing[0].name
    }, null, {
      deleted_by: req.user.email,
      church_id: churchId
    }));

  } catch (error) {
    console.error('❌ Error deleting church:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to delete church',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// GET /api/admin/churches/:id/field-mapper - Get field mapper settings for a church table
router.get('/:id/field-mapper', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = req.query.table || 'baptism_records';

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Get church database name
    const [churches] = await getAppPool().query(
      'SELECT database_name FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    const databaseName = churches[0].database_name || `orthodoxmetrics_ch_${churchId}`;
    const { getChurchDbConnection } = require('../config/db-compat');
    const churchDbPool = await getChurchDbConnection(databaseName);

    // Get table columns
    const [columns] = await churchDbPool.query(
      `SELECT column_name, ordinal_position 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = ? 
       ORDER BY ordinal_position`,
      [databaseName, tableName]
    );

    // Get existing field mapper settings from a settings table (if it exists)
    // For now, return just the columns - mappings can be stored in a separate table
    res.json(ApiResponse(true, {
      columns: columns.map(c => ({
        column_name: c.column_name,
        ordinal_position: c.ordinal_position
      })),
      mappings: {},
      field_settings: {
        visibility: {},
        sortable: {},
        default_sort_field: null,
        default_sort_direction: 'asc'
      }
    }));

  } catch (error) {
    console.error('❌ Error fetching field mapper:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch field mapper settings',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// POST /api/admin/churches/:id/field-mapper - Save field mapper settings for a church table
router.post('/:id/field-mapper', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const { table, mappings, field_settings } = req.body;
    const tableName = table || 'baptism_records';

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Get church database name
    const [churches] = await getAppPool().query(
      'SELECT database_name FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Store field mapper settings in the main database (orthodoxmetrics_db)
    // Create table if it doesn't exist
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.field_mapper_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        mappings JSON,
        field_settings JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church_table (church_id, table_name),
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Upsert the settings
    await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.field_mapper_settings 
        (church_id, table_name, mappings, field_settings)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        mappings = VALUES(mappings),
        field_settings = VALUES(field_settings),
        updated_at = CURRENT_TIMESTAMP
    `, [
      churchId,
      tableName,
      JSON.stringify(mappings || {}),
      JSON.stringify(field_settings || {})
    ]);

    res.json(ApiResponse(true, {
      message: 'Field mapper settings saved successfully',
      church_id: churchId,
      table_name: tableName
    }));

  } catch (error) {
    console.error('❌ Error saving field mapper:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to save field mapper settings',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// ============================================================================
// CHURCH BRANDING — Logo upload / delete
// ============================================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const BRANDING_ROOT = path.resolve(__dirname, '../../storage/church-branding');
const BRANDING_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const BRANDING_MAX_SIZE = 2 * 1024 * 1024; // 2 MB

function ensureBrandingDir(churchId) {
  const dir = path.join(BRANDING_ROOT, String(churchId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeBrandingUpload(fieldName) {
  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const churchId = req.user?.church_id;
      if (!churchId) return cb(new Error('No church assignment'));
      cb(null, ensureBrandingDir(churchId));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${fieldName}${ext}`);
    },
  });
  return multer({
    storage,
    limits: { fileSize: BRANDING_MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (BRANDING_ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
      cb(new Error('Only PNG, JPEG, SVG, and WebP images are allowed'));
    },
  }).single(fieldName);
}

function removeBrandingFile(churchId, currentPath) {
  if (!currentPath) return;
  // currentPath is like /church-branding/46/logo.png
  const resolved = path.resolve(BRANDING_ROOT, '..', currentPath.replace(/^\//, ''));
  if (fs.existsSync(resolved)) {
    try { fs.unlinkSync(resolved); } catch (e) { console.error('Failed to delete old branding file:', e.message); }
  }
}

// Allowed branding image fields
const BRANDING_FIELDS = ['logo', 'logo-dark', 'favicon'];
const BRANDING_DB_COLUMNS = { 'logo': 'logo_path', 'logo-dark': 'logo_dark_path', 'favicon': 'favicon_path' };

// POST /api/my/church-branding/:field — Upload a branding image (logo, logo-dark, favicon)
router.post('/church-branding/:field', requireAuth, (req, res) => {
  const user = req.user || req.session?.user;
  if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

  const allowedRoles = ['super_admin', 'admin', 'church_admin'];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  const fieldName = req.params.field;
  if (!BRANDING_FIELDS.includes(fieldName)) {
    return res.status(400).json({ success: false, error: `Invalid field. Must be one of: ${BRANDING_FIELDS.join(', ')}` });
  }

  const churchId = user.church_id;
  if (!churchId) return res.status(400).json({ success: false, error: 'No church assignment found' });

  makeBrandingUpload(fieldName)(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, error: uploadErr.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    try {
      const dbCol = BRANDING_DB_COLUMNS[fieldName];
      const newPath = `/church-branding/${churchId}/${req.file.filename}`;

      // Remove old file if exists
      const [existing] = await getAppPool().query(
        `SELECT ${dbCol} FROM churches WHERE id = ?`, [churchId]
      );
      if (existing.length > 0 && existing[0][dbCol]) {
        removeBrandingFile(churchId, existing[0][dbCol]);
      }

      // Update DB
      await getAppPool().query(
        `UPDATE churches SET ${dbCol} = ?, updated_at = NOW() WHERE id = ?`,
        [newPath, churchId]
      );

      console.log(`✅ Church ${churchId} ${fieldName} uploaded by ${user.email}`);
      res.json({ success: true, path: newPath });
    } catch (err) {
      console.error(`Error uploading church ${fieldName}:`, err);
      res.status(500).json({ success: false, error: `Failed to save ${fieldName}` });
    }
  });
});

// DELETE /api/my/church-branding/:field — Remove a branding image
router.delete('/church-branding/:field', requireAuth, async (req, res) => {
  try {
    const user = req.user || req.session?.user;
    if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

    const allowedRoles = ['super_admin', 'admin', 'church_admin'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const fieldName = req.params.field;
    if (!BRANDING_FIELDS.includes(fieldName)) {
      return res.status(400).json({ success: false, error: `Invalid field. Must be one of: ${BRANDING_FIELDS.join(', ')}` });
    }

    const churchId = user.church_id;
    if (!churchId) return res.status(400).json({ success: false, error: 'No church assignment found' });

    const dbCol = BRANDING_DB_COLUMNS[fieldName];

    // Get current path and remove file
    const [existing] = await getAppPool().query(
      `SELECT ${dbCol} FROM churches WHERE id = ?`, [churchId]
    );
    if (existing.length > 0 && existing[0][dbCol]) {
      removeBrandingFile(churchId, existing[0][dbCol]);
    }

    // Clear in DB
    await getAppPool().query(
      `UPDATE churches SET ${dbCol} = NULL, updated_at = NOW() WHERE id = ?`,
      [churchId]
    );

    console.log(`✅ Church ${churchId} ${fieldName} removed by ${user.email}`);
    res.json({ success: true, message: `${fieldName} removed` });
  } catch (err) {
    console.error(`Error removing church branding:`, err);
    res.status(500).json({ success: false, error: 'Failed to remove branding image' });
  }
});

// ============================================================================
// FEATURE FLAGS MANAGEMENT (GLOBAL + PER-CHURCH OVERRIDES)
// ============================================================================

const {
  parseSettings,
  stringifySettings,
  mergeFeatures,
  validateFeatures
} = require('../utils/churchSettings');

const {
  getEffectiveFeatures
} = require('../utils/featureFlags');

/**
 * GET /api/churches/:id/features - Get feature flags for a church
 * Returns global defaults, church overrides, and effective (resolved) flags
 * Resolution: churchOverride ?? globalDefault ?? false
 * Accessible by: super_admin, admin (own church), church_admin (own church)
 */
router.get('/:id/features', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    if (isNaN(churchId)) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid church ID format',
        code: 'INVALID_CHURCH_ID'
      }));
    }

    // Validate user access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(
        ApiResponse.error('Access denied', 'INSUFFICIENT_PERMISSIONS', 403, { reason: access.reason })
      );
    }

    // Verify church exists
    const [rows] = await getAppPool().query(
      'SELECT id, name FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (rows.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    const church = rows[0];

    // Get effective features (global + overrides)
    const { global, overrides, effective } = await getEffectiveFeatures(getAppPool(), churchId);

    // Super admin sees all details; others see only effective
    const responseData = {
      churchId: church.id,
      churchName: church.name,
      effective
    };

    if (req.user.role === 'super_admin') {
      responseData.globalDefaults = global;
      responseData.overrides = overrides;
    }

    res.json(ApiResponse.success(responseData));

  } catch (error) {
    console.error('❌ Error fetching church features:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch church features',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * PUT /api/churches/:id/features - Update feature flags for a church
 * Merges provided features into churches.settings JSON (preserves other settings)
 * Accessible by: super_admin only
 */
router.put('/:id/features', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    if (isNaN(churchId)) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid church ID format',
        code: 'INVALID_CHURCH_ID'
      }));
    }

    const { features } = req.body;

    if (!features) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Missing features object in request body',
        code: 'MISSING_FEATURES'
      }));
    }

    // Validate features
    const validation = validateFeatures(features);
    if (!validation.isValid) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid feature flags',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      }));
    }

    // Fetch current settings
    const [rows] = await getAppPool().query(
      'SELECT id, name, settings FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (rows.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    const church = rows[0];
    const currentSettings = parseSettings(church.settings);
    
    // Merge features (preserves other settings like liturgical_enabled)
    const updatedSettings = mergeFeatures(currentSettings, features);
    const settingsString = stringifySettings(updatedSettings);

    // Update database
    await getAppPool().query(
      'UPDATE churches SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [settingsString, churchId]
    );

    // Get effective features after update
    const { global, overrides, effective } = await getEffectiveFeatures(getAppPool(), churchId);

    // Log the change
    console.log(`✅ Updated feature overrides for church ${churchId} (${church.name}) by ${req.user.email}`, {
      overrides,
      effective
    });

    // Return effective features
    res.json(ApiResponse.success({
      churchId: church.id,
      churchName: church.name,
      globalDefaults: global,
      overrides,
      effective,
      message: 'Feature overrides updated successfully'
    }));

  } catch (error) {
    console.error('❌ Error updating church features:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to update church features',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

module.exports = router;
