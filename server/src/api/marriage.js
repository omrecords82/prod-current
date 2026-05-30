const { getAppPool } = require('../config/db-compat');
// server/routes/marriage.js
const express = require('express');
const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { cleanRecords, cleanRecord, transformMarriageRecords, transformMarriageRecord } = require('../utils/dateFormatter');
const { promisePool } = require('../config/db-compat');
const { safeRequire } = require('../utils/safeRequire');
const { requireAuth } = require('../middleware/auth');
const { getEffectiveSetting } = require('../utils/settingsHelper');

// Safe require for writeSacramentHistory - handles missing module gracefully
const writeSacramentHistoryModule = safeRequire(
  '../utils/writeSacramentHistory',
  () => ({
    writeSacramentHistory: async () => {
      // No-op fallback - history writing is optional for uptime
      return Promise.resolve();
    },
    generateRequestId: () => require('uuid').v4()
  }),
  'writeSacramentHistory'
);

const { writeSacramentHistory, generateRequestId } = writeSacramentHistoryModule;
const router = express.Router();

/**
 * Default search weights for marriage records.
 * Keys match actual marriage_records table columns.
 */
const DEFAULT_SEARCH_WEIGHTS = {
  lname_groom: 12,
  lname_bride: 12,
  fname_groom: 9,
  fname_bride: 9,
  parentsg: 7,
  parentsb: 7,
  witness: 6,
  clergy: 4
};

/**
 * Load effective search weights for a church from the settings registry.
 * Falls back to DEFAULT_SEARCH_WEIGHTS for any key that isn't in the registry.
 */
async function getEffectiveSearchWeights(churchId) {
  const weights = { ...DEFAULT_SEARCH_WEIGHTS };
  try {
    const fields = Object.keys(DEFAULT_SEARCH_WEIGHTS);
    const opts = churchId && churchId !== '0' ? { churchId } : {};
    await Promise.all(fields.map(async (field) => {
      const val = await getEffectiveSetting(`records.search.marriage.${field}`, opts);
      if (val !== undefined) weights[field] = Number(val);
    }));
  } catch (e) {
    console.warn('Failed to load search weights from registry for church', churchId, e.message);
  }
  return weights;
}

/**
 * Get church database name by church_id
 * @param {number} churchId 
 * @returns {Promise<string>} database name
 */
async function getChurchDatabaseName(churchId) {
    try {
        if (!churchId || churchId === '0') {
            // Get the first active church as default
            console.log('🏛️ No church_id provided, looking for default church...');
            const [defaultChurches] = await getAppPool().query(
                'SELECT id, database_name FROM orthodoxmetrics_db.churches WHERE is_active = 1 ORDER BY id LIMIT 1'
            );
            
            if (defaultChurches.length === 0) {
                console.error('❌ No active churches found in database');
                throw new Error('No active churches configured');
            }
            
            const defaultChurch = defaultChurches[0];
            console.log(`🏛️ Using default church ID: ${defaultChurch.id}, database: ${defaultChurch.database_name}`);
            return defaultChurch.database_name || `orthodoxmetrics_ch_${defaultChurch.id}`;
        }
        
        console.log('🔍 Looking up database name for church_id:', churchId);
        
        const [churches] = await getAppPool().query(
            'SELECT database_name FROM orthodoxmetrics_db.churches WHERE id = ? AND database_name IS NOT NULL',
            [churchId]
        );
        
        if (churches.length === 0) {
            console.warn(`⚠️ No active church found with ID: ${churchId}, using default church`);
            // Get the first active church as fallback
            const [defaultChurches] = await getAppPool().query(
                'SELECT id, database_name FROM orthodoxmetrics_db.churches WHERE is_active = 1 ORDER BY id LIMIT 1'
            );
            
            if (defaultChurches.length === 0) {
                throw new Error('No active churches configured');
            }
            
            const defaultChurch = defaultChurches[0];
            return defaultChurch.database_name || `orthodoxmetrics_ch_${defaultChurch.id}`;
        }
        
        if (!churches[0].database_name) {
            console.warn(`⚠️ No database_name configured for church ID: ${churchId}, using generated database name`);
            return `orthodoxmetrics_ch_${churchId}`;
        }
        
        console.log(`✅ Found database: ${churches[0].database_name} for church_id: ${churchId}`);
        return churches[0].database_name;
    } catch (error) {
        console.error('❌ Error in getChurchDatabaseName:', error);
        console.log('🔄 Falling back to orthodoxmetrics_ch_37');
        return 'orthodoxmetrics_ch_37'; // Fallback to known working database
    }
}

async function getChurchInfo(churchId) {
    try {
        if (!churchId || churchId === '0') {
            // Get the first active church as default
            console.log('🏛️ No church_id provided, looking for default church...');
            const [defaultChurches] = await getAppPool().query(
                'SELECT id, database_name FROM orthodoxmetrics_db.churches WHERE is_active = 1 ORDER BY id LIMIT 1'
            );
            
            if (defaultChurches.length === 0) {
                console.error('❌ No active churches found in database');
                throw new Error('No active churches configured');
            }
            
            const defaultChurch = defaultChurches[0];
            console.log(`🏛️ Using default church ID: ${defaultChurch.id}, database: ${defaultChurch.database_name}`);
            return {
                churchId: defaultChurch.id,
                databaseName: defaultChurch.database_name || `orthodoxmetrics_ch_${defaultChurch.id}`
            };
        }
        
        console.log('🔍 Looking up database name for church_id:', churchId);
        
        const [churches] = await getAppPool().query(
            'SELECT id, database_name FROM orthodoxmetrics_db.churches WHERE id = ? AND database_name IS NOT NULL',
            [churchId]
        );
        
        if (churches.length === 0) {
            console.warn(`⚠️ No active church found with ID: ${churchId}, using default church`);
            // Get the first active church as fallback
            const [defaultChurches] = await getAppPool().query(
                'SELECT id, database_name FROM orthodoxmetrics_db.churches WHERE is_active = 1 ORDER BY id LIMIT 1'
            );
            
            if (defaultChurches.length === 0) {
                throw new Error('No active churches configured');
            }
            
            const defaultChurch = defaultChurches[0];
            return {
                churchId: defaultChurch.id,
                databaseName: defaultChurch.database_name || `orthodoxmetrics_ch_${defaultChurch.id}`
            };
        }
        
        if (!churches[0].database_name) {
            console.warn(`⚠️ No database_name configured for church ID: ${churchId}, using generated database name`);
            return {
                churchId: parseInt(churchId),
                databaseName: `orthodoxmetrics_ch_${churchId}`
            };
        }
        
        console.log(`✅ Found database: ${churches[0].database_name} for church_id: ${churchId}`);
        return {
            churchId: parseInt(churchId),
            databaseName: churches[0].database_name
        };
    } catch (error) {
        console.error('❌ Error in getChurchInfo:', error);
        console.log('🔄 Falling back to orthodoxmetrics_ch_37');
        // Try to get church_id from database name
        const fallbackId = 37; // Default fallback
        return {
            churchId: fallbackId,
            databaseName: 'orthodoxmetrics_ch_37'
        };
    }
}

// Test endpoint to verify API is working
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Marriage API is working', 
        timestamp: new Date().toISOString(),
        headers: req.headers 
    });
});

// GET /api/marriage-records - Require authentication
router.get('/', requireAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            church_id = null,
            sortField = 'id', 
            sortDirection = 'desc' 
        } = req.query;

        // Get church_id from session if not provided in query
        const finalChurchId = church_id || req.session?.user?.church_id || req.user?.church_id || null;
        
        console.log('📋 Marriage query parameters:', { page, limit, search, church_id: finalChurchId, sortField, sortDirection });
        console.log('👤 User session:', { userId: req.session?.user?.id, churchId: req.session?.user?.church_id });

        // Dynamically resolve church database name
        const databaseName = await getChurchDatabaseName(finalChurchId);
        console.log(`🏛️ Using database: ${databaseName} for church_id: ${finalChurchId}`);

        const queryParams = [];
        const countParams = [];
        let whereConditions = [];
        const isSearchActive = search && search.trim();

        // Add church filtering
        if (church_id && church_id !== '0') {
            whereConditions.push('church_id = ?');
            queryParams.push(church_id);
            countParams.push(church_id);
            console.log(`🏛️ Filtering marriage records by church_id: ${church_id}`);
        }

        // Add search functionality
        if (isSearchActive) {
            const searchCondition = `(fname_groom LIKE ? 
                OR lname_groom LIKE ? 
                OR fname_bride LIKE ? 
                OR lname_bride LIKE ? 
                OR clergy LIKE ? 
                OR witness LIKE ? 
                OR parentsg LIKE ? 
                OR parentsb LIKE ?)`;
            const searchParam = `%${search.trim()}%`;
            
            whereConditions.push(searchCondition);
            
            queryParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
            console.log(`🔍 Searching marriage records for: "${search.trim()}"`);
        }
        
        // Build WHERE clause
        const whereClause = whereConditions.length > 0
            ? ` WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Count query (unchanged shape)
        const countQuery = `SELECT COUNT(*) as total FROM marriage_records${whereClause}`;

        // Build main query — add relevance_score when searching
        let query;
        let mainQueryParams;
        const pageOffset = (parseInt(page) - 1) * parseInt(limit);

        if (isSearchActive) {
            const searchRaw = search.trim();

            // Tiered relevance: exact → prefix → contains (per field, highest tier wins)
            const relevanceExpr = `(
              (CASE WHEN LOWER(lname_groom) = LOWER(?) THEN 900  WHEN LOWER(lname_groom) LIKE CONCAT(LOWER(?), '%') THEN 350 WHEN LOWER(lname_groom) LIKE CONCAT('%', LOWER(?), '%') THEN 70 ELSE 0 END) +
              (CASE WHEN LOWER(lname_bride) = LOWER(?) THEN 900  WHEN LOWER(lname_bride) LIKE CONCAT(LOWER(?), '%') THEN 350 WHEN LOWER(lname_bride) LIKE CONCAT('%', LOWER(?), '%') THEN 70 ELSE 0 END) +
              (CASE WHEN LOWER(fname_groom) = LOWER(?) THEN 800  WHEN LOWER(fname_groom) LIKE CONCAT(LOWER(?), '%') THEN 300 WHEN LOWER(fname_groom) LIKE CONCAT('%', LOWER(?), '%') THEN 60 ELSE 0 END) +
              (CASE WHEN LOWER(fname_bride) = LOWER(?) THEN 800  WHEN LOWER(fname_bride) LIKE CONCAT(LOWER(?), '%') THEN 300 WHEN LOWER(fname_bride) LIKE CONCAT('%', LOWER(?), '%') THEN 60 ELSE 0 END) +
              (CASE WHEN LOWER(clergy)      = LOWER(?) THEN 300  WHEN LOWER(clergy)      LIKE CONCAT(LOWER(?), '%') THEN 150 WHEN LOWER(clergy)      LIKE CONCAT('%', LOWER(?), '%') THEN 30 ELSE 0 END) +
              (CASE WHEN LOWER(parentsg)    = LOWER(?) THEN 200  WHEN LOWER(parentsg)    LIKE CONCAT(LOWER(?), '%') THEN 100 WHEN LOWER(parentsg)    LIKE CONCAT('%', LOWER(?), '%') THEN 20 ELSE 0 END) +
              (CASE WHEN LOWER(parentsb)    = LOWER(?) THEN 200  WHEN LOWER(parentsb)    LIKE CONCAT(LOWER(?), '%') THEN 100 WHEN LOWER(parentsb)    LIKE CONCAT('%', LOWER(?), '%') THEN 20 ELSE 0 END) +
              (CASE WHEN LOWER(witness)     = LOWER(?) THEN 150  WHEN LOWER(witness)     LIKE CONCAT(LOWER(?), '%') THEN 75  WHEN LOWER(witness)     LIKE CONCAT('%', LOWER(?), '%') THEN 15 ELSE 0 END)
            ) AS relevance_score`;

            query = `SELECT *, ${relevanceExpr} FROM marriage_records${whereClause}`;
            query += ` ORDER BY relevance_score DESC, mdate DESC, id DESC`;
            query += ` LIMIT ? OFFSET ?`;

            // 8 fields × 3 tiers = 24 params (all same value: raw search term)
            const scoreParams = Array(24).fill(searchRaw);
            const whereParams = [...queryParams];
            mainQueryParams = [...scoreParams, ...whereParams, parseInt(limit), pageOffset];
        } else {
            query = `SELECT * FROM marriage_records${whereClause}`;

            const validSortFields = ['id', 'fname_groom', 'lname_groom', 'fname_bride', 'lname_bride', 'mdate', 'clergy', 'parentsg', 'parentsb', 'witness', 'mlicense', 'created_at', 'updated_at'];
            const validSortDirections = ['asc', 'desc'];
            if (sortField && !validSortFields.includes(sortField)) {
                console.warn(`⚠️ marriage-records: invalid sortField "${sortField}" rejected, defaulting to "id"`);
            }
            const finalSortField = validSortFields.includes(sortField) ? sortField : 'id';
            const finalSortDirection = validSortDirections.includes(sortDirection.toLowerCase()) ? sortDirection.toUpperCase() : 'DESC';
            // Push NULL/blank values (e.g. records with no marriage date) to
            // the end regardless of sort direction.
            query += ` ORDER BY (${finalSortField} IS NULL) ASC, ${finalSortField} ${finalSortDirection}`;
            query += ` LIMIT ? OFFSET ?`;
            mainQueryParams = [...queryParams, parseInt(limit), pageOffset];
        }

        // Execute queries
        const churchDbPool = await getChurchDbConnection(databaseName);
        
        const [rows] = await churchDbPool.query(query, mainQueryParams);
        const [countResult] = await churchDbPool.query(countQuery, countParams);
        
        const totalRecords = countResult[0].total;
        
        // Post-process: compute _matchedFields and _topMatchReason for search results
        if (isSearchActive && rows.length > 0) {
            const termLower = search.trim().toLowerCase();
            rows.forEach(row => {
                const matched = [];
                if (row.lname_groom && row.lname_groom.toLowerCase().includes(termLower)) matched.push('lname_groom');
                if (row.lname_bride && row.lname_bride.toLowerCase().includes(termLower)) matched.push('lname_bride');
                if (row.fname_groom && row.fname_groom.toLowerCase().includes(termLower)) matched.push('fname_groom');
                if (row.fname_bride && row.fname_bride.toLowerCase().includes(termLower)) matched.push('fname_bride');
                if (row.clergy && row.clergy.toLowerCase().includes(termLower)) matched.push('clergy');
                if (row.parentsg && row.parentsg.toLowerCase().includes(termLower)) matched.push('parentsg');
                if (row.parentsb && row.parentsb.toLowerCase().includes(termLower)) matched.push('parentsb');
                if (row.witness && row.witness.toLowerCase().includes(termLower)) matched.push('witness');
                row._matchedFields = matched;
            });
            const top = rows[0];
            if (top.fname_groom && top.fname_groom.toLowerCase() === termLower) {
                top._topMatchReason = 'exact groom first name';
            } else if (top.lname_groom && top.lname_groom.toLowerCase() === termLower) {
                top._topMatchReason = 'exact groom last name';
            } else if (top.fname_bride && top.fname_bride.toLowerCase() === termLower) {
                top._topMatchReason = 'exact bride first name';
            } else if (top.lname_bride && top.lname_bride.toLowerCase() === termLower) {
                top._topMatchReason = 'exact bride last name';
            }
        }

        res.json({ 
            records: transformMarriageRecords(rows),
            totalRecords,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalRecords / parseInt(limit))
        });
    } catch (err) {
        console.error('fetch marriage-records error:', err);
        res.status(500).json({ error: 'Could not fetch marriage records' });
    }
});

// POST /api/marriage-records - Create a single record
router.post('/', requireAuth, async (req, res) => {
    try {
        const record = req.body;
        console.log('Received record data:', record);
        
        // Validate required fields - check for both null/undefined and empty strings
        const isValidField = (field) => field && field.toString().trim() !== '';
        
        if (!isValidField(record.fname_groom) || !isValidField(record.lname_groom) || !isValidField(record.fname_bride) || !isValidField(record.lname_bride) || !isValidField(record.mdate) || !isValidField(record.clergy)) {
            console.log('Validation failed:', {
                fname_groom: record.fname_groom,
                lname_groom: record.lname_groom,
                fname_bride: record.fname_bride,
                lname_bride: record.lname_bride,
                mdate: record.mdate,
                clergy: record.clergy
            });
            return res.status(400).json({ 
                error: 'Missing required fields: fname_groom, lname_groom, fname_bride, lname_bride, mdate, clergy',
                received: {
                    fname_groom: !!isValidField(record.fname_groom),
                    lname_groom: !!isValidField(record.lname_groom),
                    fname_bride: !!isValidField(record.fname_bride),
                    lname_bride: !!isValidField(record.lname_bride),
                    mdate: !!isValidField(record.mdate),
                    clergy: !!isValidField(record.clergy)
                }
            });
        }

        console.log('Record validation passed, inserting into database...');
        
        // Convert empty strings to null for optional fields
        const cleanRecord = {
            mdate: record.mdate || null,
            fname_groom: record.fname_groom,
            lname_groom: record.lname_groom,
            parentsg: record.parentsg || null,
            fname_bride: record.fname_bride,
            lname_bride: record.lname_bride,
            parentsb: record.parentsb || null,
            witness: record.witness || null,
            mlicense: record.mlicense || null,
            clergy: record.clergy
        };
        
        console.log('Clean record for database:', cleanRecord);

        // Get church_id from request (body or query)
        const church_id = record.church_id || req.query.church_id || null;
        
        // Get church info (both churchId and databaseName)
        const churchInfo = await getChurchInfo(church_id);
        console.log(`🏛️ Using database: ${churchInfo.databaseName} for church_id: ${churchInfo.churchId}`);
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(churchInfo.databaseName);

        const sql = `INSERT INTO marriage_records 
          (church_id, mdate, fname_groom, lname_groom, parentsg, fname_bride, lname_bride, parentsb, witness, mlicense, clergy) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await churchDbPool.query(sql, [
            churchInfo.churchId,
            cleanRecord.mdate,
            cleanRecord.fname_groom,
            cleanRecord.lname_groom,
            cleanRecord.parentsg,
            cleanRecord.fname_bride,
            cleanRecord.lname_bride,
            cleanRecord.parentsb,
            cleanRecord.witness,
            cleanRecord.mlicense,
            cleanRecord.clergy
        ]);

        const newRecord = { ...cleanRecord, id: result.insertId };
        console.log('Successfully created record:', newRecord);
        
        // Write history
        const requestId = req.requestId || generateRequestId();
        await writeSacramentHistory({
            historyTableName: 'marriage_history',
            churchId: churchInfo.churchId,
            recordId: result.insertId,
            type: 'create',
            description: `Created marriage record for ${cleanRecord.fname_groom} ${cleanRecord.lname_groom} and ${cleanRecord.fname_bride} ${cleanRecord.lname_bride}`,
            before: null,
            after: newRecord,
            actorUserId: req.user?.id || null,
            source: 'ui',
            requestId: requestId,
            ipAddress: req.ip || null,
            databaseName: churchInfo.databaseName
        });
        
        res.json({ success: true, record: newRecord });
    } catch (err) {
        console.error('create marriage-record error:', err);
        res.status(500).json({ error: 'Could not create marriage record' });
    }
});

// PUT /api/marriage-records/:id - Update a single record
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const record = req.body;
        console.log('Updating record ID:', id, 'with data:', record);
        
        // Validate required fields - check for both null/undefined and empty strings
        const isValidField = (field) => field && field.toString().trim() !== '';
        
        if (!isValidField(record.fname_groom) || !isValidField(record.lname_groom) || !isValidField(record.fname_bride) || !isValidField(record.lname_bride) || !isValidField(record.mdate) || !isValidField(record.clergy)) {
            console.log('Update validation failed:', {
                fname_groom: record.fname_groom,
                lname_groom: record.lname_groom,
                fname_bride: record.fname_bride,
                lname_bride: record.lname_bride,
                mdate: record.mdate,
                clergy: record.clergy
            });
            return res.status(400).json({ 
                error: 'Missing required fields: fname_groom, lname_groom, fname_bride, lname_bride, mdate, clergy',
                received: {
                    fname_groom: !!isValidField(record.fname_groom),
                    lname_groom: !!isValidField(record.lname_groom),
                    fname_bride: !!isValidField(record.fname_bride),
                    lname_bride: !!isValidField(record.lname_bride),
                    mdate: !!isValidField(record.mdate),
                    clergy: !!isValidField(record.clergy)
                }
            });
        }

        console.log('Update validation passed, updating database...');
        
        // Convert empty strings to null for optional fields
        const cleanRecord = {
            mdate: record.mdate || null,
            fname_groom: record.fname_groom,
            lname_groom: record.lname_groom,
            parentsg: record.parentsg || null,
            fname_bride: record.fname_bride,
            lname_bride: record.lname_bride,
            parentsb: record.parentsb || null,
            witness: record.witness || null,
            mlicense: record.mlicense || null,
            clergy: record.clergy
        };
        
        console.log('Clean record for update:', cleanRecord);

        // Get church_id from request (body or query)
        const church_id = record.church_id || req.query.church_id || null;
        
        // Get church info (both churchId and databaseName)
        const churchInfo = await getChurchInfo(church_id);
        console.log(`🏛️ Using database: ${churchInfo.databaseName} for church_id: ${churchInfo.churchId}`);
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(churchInfo.databaseName);

        // Fetch before state
        const [beforeRows] = await churchDbPool.query(
            'SELECT * FROM marriage_records WHERE id = ?',
            [id]
        );
        
        if (beforeRows.length === 0) {
            console.log('No record found with ID:', id);
            return res.status(404).json({ error: 'Record not found' });
        }
        
        const beforeRecord = beforeRows[0];

        const sql = `UPDATE marriage_records SET 
          mdate = ?, 
          fname_groom = ?, 
          lname_groom = ?, 
          parentsg = ?, 
          fname_bride = ?, 
          lname_bride = ?, 
          parentsb = ?, 
          witness = ?, 
          mlicense = ?, 
          clergy = ? 
          WHERE id = ?`;

        const [result] = await churchDbPool.query(sql, [
            cleanRecord.mdate,
            cleanRecord.fname_groom,
            cleanRecord.lname_groom,
            cleanRecord.parentsg,
            cleanRecord.fname_bride,
            cleanRecord.lname_bride,
            cleanRecord.parentsb,
            cleanRecord.witness,
            cleanRecord.mlicense,
            cleanRecord.clergy,
            id
        ]);

        if (result.affectedRows === 0) {
            console.log('No record found with ID:', id);
            return res.status(404).json({ error: 'Record not found' });
        }

        // Fetch after state
        const [afterRows] = await churchDbPool.query(
            'SELECT * FROM marriage_records WHERE id = ?',
            [id]
        );
        const afterRecord = afterRows[0];

        console.log('Successfully updated record with ID:', id);
        
        // Write history
        const requestId = req.requestId || generateRequestId();
        await writeSacramentHistory({
            historyTableName: 'marriage_history',
            churchId: churchInfo.churchId,
            recordId: parseInt(id),
            type: 'update',
            description: `Updated marriage record ${id} for ${cleanRecord.fname_groom} ${cleanRecord.lname_groom} and ${cleanRecord.fname_bride} ${cleanRecord.lname_bride}`,
            before: beforeRecord,
            after: afterRecord,
            actorUserId: req.user?.id || null,
            source: 'ui',
            requestId: requestId,
            ipAddress: req.ip || null,
            databaseName: churchInfo.databaseName
        });
        
        res.json({ success: true, record: { ...cleanRecord, id: parseInt(id) } });
    } catch (err) {
        console.error('update marriage-record error:', err);
        res.status(500).json({ error: 'Could not update marriage record' });
    }
});

// POST /api/marriage-records/batch - Create/update multiple records (legacy support)
router.post('/batch', async (req, res) => {
    try {
        const { records } = req.body;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: 'Invalid request format' });
        }

        const updatedRecords = [];
        for (const record of records) {
            if (record.id) {
                // Update existing record
                const sql = `UPDATE marriage_records SET 
                  mdate = ?, 
                  fname_groom = ?, 
                  lname_groom = ?, 
                  parentsg = ?, 
                  fname_bride = ?, 
                  lname_bride = ?, 
                  parentsb = ?, 
                  witness = ?, 
                  mlicense = ?, 
                  clergy = ? 
                  WHERE id = ?`;

                await churchDbPool.query(sql, [
                    record.mdate,
                    record.fname_groom,
                    record.lname_groom,
                    record.parentsg,
                    record.fname_bride,
                    record.lname_bride,
                    record.parentsb,
                    record.witness,
                    record.mlicense,
                    record.clergy,
                    record.id
                ]);
                updatedRecords.push(record);
            } else {
                // Insert new record
                const sql = `INSERT INTO marriage_records 
                  (mdate, fname_groom, lname_groom, parentsg, fname_bride, lname_bride, parentsb, witness, mlicense, clergy) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                const [result] = await churchDbPool.query(sql, [
                    record.mdate,
                    record.fname_groom,
                    record.lname_groom,
                    record.parentsg,
                    record.fname_bride,
                    record.lname_bride,
                    record.parentsb,
                    record.witness,
                    record.mlicense,
                    record.clergy
                ]);

                updatedRecords.push({ ...record, id: result.insertId });
            }
        }

        res.json({ success: true, updatedRecords });
    } catch (err) {
        console.error('save marriage-records error:', err);
        res.status(500).json({ error: 'Could not save marriage records' });
    }
});

// DELETE /api/marriage-records/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ DELETE request for marriage record ID: ${id}`);
        
        // Get church_id from request (body, query, or session)
        let church_id = req.body.church_id || req.query.church_id || req.session?.church_id || null;
        console.log(`🏛️ Initial church_id from request: ${church_id}`);
        
        // If church_id is not provided, try to find the record first to get its church_id
        if (!church_id || church_id === '0' || church_id === 'null') {
            console.log('🔍 church_id not provided, searching for record in default database...');
            try {
                const defaultDatabaseName = await getChurchDatabaseName(null);
                const churchDbPool = await getChurchDbConnection(defaultDatabaseName);
                
                const [recordRows] = await churchDbPool.query('SELECT church_id FROM marriage_records WHERE id = ?', [id]);
                if (recordRows.length > 0) {
                    church_id = recordRows[0].church_id;
                    console.log(`✅ Found church_id ${church_id} for marriage record ${id}`);
                } else {
                    console.log(`⚠️ Record ${id} not found in default database`);
                }
            } catch (queryErr) {
                console.error('❌ Error querying default database:', queryErr);
                console.log('🔄 Will use default church from getChurchInfo');
            }
        }
        
        // Get church info (both churchId and databaseName)
        const churchInfo = await getChurchInfo(church_id);
        console.log(`🏛️ Using database: ${churchInfo.databaseName} for church_id: ${churchInfo.churchId}`);
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(churchInfo.databaseName);
        console.log(`✅ Got database connection for ${churchInfo.databaseName}`);
        
        // Fetch before state
        const [beforeRows] = await churchDbPool.query(
            'SELECT * FROM marriage_records WHERE id = ?',
            [id]
        );
        
        if (beforeRows.length === 0) {
            console.log(`⚠️ No marriage record found with ID: ${id}`);
            return res.status(404).json({ error: 'Marriage record not found' });
        }
        
        const beforeRecord = beforeRows[0];
        
        console.log(`🗑️ Executing DELETE query for marriage record ${id}...`);
        const [result] = await churchDbPool.query('DELETE FROM marriage_records WHERE id = ?', [id]);
        console.log(`📊 Delete result: affectedRows=${result.affectedRows}`);
        
        if (result.affectedRows === 0) {
            console.log(`⚠️ No marriage record found with ID: ${id}`);
            return res.status(404).json({ error: 'Marriage record not found' });
        }
        
        console.log(`✅ Successfully deleted marriage record with ID: ${id}`);
        
        // Write history
        const requestId = req.requestId || generateRequestId();
        await writeSacramentHistory({
            historyTableName: 'marriage_history',
            churchId: churchInfo.churchId,
            recordId: parseInt(id),
            type: 'delete',
            description: `Deleted marriage record ${id} for ${beforeRecord.fname_groom} ${beforeRecord.lname_groom} and ${beforeRecord.fname_bride} ${beforeRecord.lname_bride}`,
            before: beforeRecord,
            after: null,
            actorUserId: req.user?.id || null,
            source: 'ui',
            requestId: requestId,
            ipAddress: req.ip || null,
            databaseName: churchInfo.databaseName
        });
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ delete marriage-record error:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ error: 'Could not delete marriage record', details: err.message });
    }
});

// GET /api/unique-values?table=…&column=…
router.get('/unique-values', async (req, res) => {
    const { table, column } = req.query;
    if (!table || !column) {
        return res.status(400).json({ error: 'table and column query params required' });
    }
    try {
        // **Warning**: ensure table/column come from a whitelist in production!
        const sql = `SELECT DISTINCT TRIM(\`${column}\`) AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND TRIM(\`${column}\`) != ''`;
        const [rows] = await churchDbPool.query(sql);
        
        // Additional deduplication in JavaScript to handle case variations
        const valueSet = new Set();
        const valueList = [];
        
        rows.forEach(row => {
            if (row.value) {
                const trimmedValue = row.value.trim();
                const normalizedValue = trimmedValue.toLowerCase();
                
                // Check if we already have this value (case-insensitive)
                if (!valueSet.has(normalizedValue)) {
                    valueSet.add(normalizedValue);
                    valueList.push(trimmedValue);
                }
            }
        });
        
        // Sort alphabetically
        valueList.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        
        res.json({ values: valueList });
    } catch (err) {
        console.error('fetch unique-values error:', err);
        res.status(500).json({ error: 'Could not fetch unique values' });
    }
});

router.get('/dropdown-options/:column', async (req, res) => {
    const { column } = req.params;
    const { table, church_id } = req.query;
    if (!table) {
        return res.status(400).json({ error: 'table query param required' });
    }
    try {
        // Dynamically resolve church database name
        const databaseName = await getChurchDatabaseName(church_id);
        
        const churchDbPool = await getChurchDbConnection(databaseName);
        // beware SQL-injection in prod—validate table/column against a whitelist!
        const sql = `SELECT DISTINCT \`${column}\` AS value FROM \`${table}\``;
        const [rows] = await churchDbPool.query(sql);
        res.json({ values: rows.map(r => r.value) });
    } catch (err) {
        console.error('fetch dropdown-options error:', err);
        res.status(500).json({ error: 'Could not fetch dropdown options' });
    }
});

// GET /api/marriage-records/autocomplete - Frequency-based autocomplete for text fields
router.get('/autocomplete', requireAuth, async (req, res) => {
    const { column, prefix = '', church_id } = req.query;

    // Whitelist of columns allowed for autocomplete (text fields only, no dates/IDs)
    const ALLOWED_COLUMNS = ['fname_groom', 'lname_groom', 'fname_bride', 'lname_bride', 'parentsg', 'parentsb', 'witness', 'mlicense', 'clergy'];

    if (!column || !ALLOWED_COLUMNS.includes(column)) {
        return res.status(400).json({ error: `Invalid column. Allowed: ${ALLOWED_COLUMNS.join(', ')}` });
    }

    try {
        const databaseName = await getChurchDatabaseName(church_id);
        const churchDbPool = await getChurchDbConnection(databaseName);

        let sql, params;
        if (prefix.trim()) {
            sql = `SELECT \`${column}\` AS value, COUNT(*) AS freq
                   FROM marriage_records
                   WHERE \`${column}\` IS NOT NULL AND TRIM(\`${column}\`) != ''
                     AND \`${column}\` LIKE ?
                   GROUP BY \`${column}\`
                   ORDER BY freq DESC, \`${column}\` ASC
                   LIMIT 20`;
            params = [`${prefix.trim()}%`];
        } else {
            sql = `SELECT \`${column}\` AS value, COUNT(*) AS freq
                   FROM marriage_records
                   WHERE \`${column}\` IS NOT NULL AND TRIM(\`${column}\`) != ''
                   GROUP BY \`${column}\`
                   ORDER BY freq DESC, \`${column}\` ASC
                   LIMIT 20`;
            params = [];
        }

        const [rows] = await churchDbPool.query(sql, params);
        res.json({ suggestions: rows.map(r => ({ value: r.value, count: r.freq })) });
    } catch (err) {
        console.error('autocomplete error (marriage):', err);
        res.status(500).json({ error: 'Could not fetch autocomplete suggestions' });
    }
});

module.exports = router;
