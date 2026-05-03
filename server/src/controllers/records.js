/**
 * Orthodox Metrics - Records Controller
 * CRUD operations for church records (baptism, marriage, funeral)
 *
 * Queries the correct church-specific database (e.g., om_church_46)
 * using database-qualified table names.
 */

const { promisePool } = require('../config/db');
const { validateRecord: validateRecordFields } = require('./records-validation');

// Cache: churchId -> database_name
const churchDbCache = new Map();

/**
 * Resolve the church database name from the request.
 */
const resolveChurchDb = async (req) => {
  const churchId = req.params.churchId || req.user?.church_id;
  if (!churchId) {
    throw new Error('No church context: churchId missing from URL and user session');
  }
  const key = String(churchId);
  if (churchDbCache.has(key)) return churchDbCache.get(key);

  const [rows] = await promisePool.execute(
    'SELECT database_name FROM churches WHERE id = ?', [churchId]
  );
  if (rows.length === 0 || !rows[0].database_name) {
    throw new Error(`No database configured for church ID: ${churchId}`);
  }
  churchDbCache.set(key, rows[0].database_name);
  return rows[0].database_name;
};

const getTableName = (recordType) => {
  const map = { baptism: 'baptism_records', marriage: 'marriage_records', funeral: 'funeral_records' };
  return map[recordType];
};

const qt = (dbName, tableName) => `\`${dbName}\`.\`${tableName}\``;

// ============================================================================
// Field mappings: frontend field name → DB column name
// Supports both camelCase (inline dialog) and snake_case (FIELD_DEFINITIONS)
// ============================================================================
const FIELD_MAP = {
  baptism: {
    // camelCase (inline dialog / Path A)
    firstName: 'first_name',
    lastName: 'last_name',
    dateOfBirth: 'birth_date',
    dateOfBaptism: 'reception_date',
    placeOfBirth: 'birthplace',
    godparentNames: 'sponsors',
    priest: 'clergy',
    registryNumber: 'source_scan_id',
    entryType: 'entry_type',
    // snake_case (FIELD_DEFINITIONS / Path B) — pass through
    first_name: 'first_name',
    last_name: 'last_name',
    birth_date: 'birth_date',
    reception_date: 'reception_date',
    birthplace: 'birthplace',
    entry_type: 'entry_type',
    sponsors: 'sponsors',
    parents: 'parents',
    clergy: 'clergy',
    source_scan_id: 'source_scan_id',
    ocr_confidence: 'ocr_confidence',
  },
  marriage: {
    // camelCase
    groomFirstName: 'fname_groom',
    groomLastName: 'lname_groom',
    brideFirstName: 'fname_bride',
    brideLastName: 'lname_bride',
    groomParents: 'parentsg',
    brideParents: 'parentsb',
    marriageDate: 'mdate',
    marriageLocation: 'mlicense',
    priest: 'clergy',
    // snake_case
    fname_groom: 'fname_groom',
    lname_groom: 'lname_groom',
    parentsg: 'parentsg',
    fname_bride: 'fname_bride',
    lname_bride: 'lname_bride',
    parentsb: 'parentsb',
    mdate: 'mdate',
    witness: 'witness',
    mlicense: 'mlicense',
    clergy: 'clergy',
  },
  funeral: {
    // camelCase
    firstName: 'name',
    lastName: 'lastname',
    deceasedFirstName: 'name',
    deceasedLastName: 'lastname',
    dateOfDeath: 'deceased_date',
    deathDate: 'deceased_date',
    burialDate: 'burial_date',
    burialLocation: 'burial_location',
    priest: 'clergy',
    // snake_case
    name: 'name',
    lastname: 'lastname',
    deceased_date: 'deceased_date',
    burial_date: 'burial_date',
    age: 'age',
    clergy: 'clergy',
    burial_location: 'burial_location',
  },
};

// Fields to ignore (UI-only, not DB columns)
const IGNORE_FIELDS = new Set([
  'customPriest', 'churchName', 'createdAt', 'updatedAt', 'notes',
  'id', 'churchId', 'church_id', 'recordType', 'record_type',
]);

/**
 * Map incoming request body to { column: value } pairs for the DB.
 *
 * Combined-field handling (fatherName+motherName → parents,
 * witness1+witness2 → witness) runs AFTER the main loop so that an
 * explicit edit on the split fields always wins over an out-of-date
 * snake_case `parents` / `witness` value the frontend also happens to
 * spread into the body. (When the frontend opens an edit form it
 * pre-populates both shapes — without this ordering, the loop would
 * overwrite the user's just-edited combined value.)
 */
const mapFields = (recordType, body, churchId) => {
  const mapping = FIELD_MAP[recordType] || {};
  const cols = {};

  for (const [key, value] of Object.entries(body)) {
    if (IGNORE_FIELDS.has(key)) continue;
    if (key === 'fatherName' || key === 'motherName') continue; // handled below
    if (key === 'witness1' || key === 'witness2') continue;     // handled below
    const dbCol = mapping[key];
    if (dbCol && value !== undefined && value !== null && value !== '') {
      cols[dbCol] = value;
    }
  }

  // Combined parents (baptism) — overrides anything the loop wrote to cols.parents.
  if (recordType === 'baptism' && (body.fatherName || body.motherName)) {
    const parts = [body.fatherName, body.motherName].filter(Boolean);
    if (parts.length) cols.parents = parts.join(', ');
  }

  // Combined witness (marriage) — overrides anything the loop wrote to cols.witness.
  if (recordType === 'marriage' && (body.witness1 || body.witness2)) {
    const parts = [body.witness1, body.witness2].filter(Boolean);
    if (parts.length) cols.witness = parts.join(', ');
  }

  // Always set church_id
  cols.church_id = parseInt(churchId, 10);

  return cols;
};

// ============================================================================
// CRUD Handlers
// ============================================================================

const listRecords = async (req, res) => {
  try {
    const dbName = await resolveChurchDb(req);
    const { recordType } = req;
    const table = qt(dbName, getTableName(recordType));

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      // Search across common text columns
      if (recordType === 'baptism') {
        whereClause += ' AND (first_name LIKE ? OR last_name LIKE ?)';
      } else if (recordType === 'marriage') {
        whereClause += ' AND (fname_groom LIKE ? OR lname_groom LIKE ?)';
      } else if (recordType === 'funeral') {
        whereClause += ' AND (name LIKE ? OR lastname LIKE ?)';
      }
      params.push(`%${search}%`, `%${search}%`);
    }

    const [countRows] = await promisePool.execute(
      `SELECT COUNT(*) as total FROM ${table} ${whereClause}`, params
    );

    const [rows] = await promisePool.execute(
      `SELECT * FROM ${table} ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        records: rows,
        pagination: {
          page, limit,
          total: countRows[0].total,
          totalPages: Math.ceil(countRows[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error listing records:', error);
    res.status(500).json({ error: 'Database error', message: 'Failed to retrieve records' });
  }
};

const getRecordById = async (req, res) => {
  try {
    const dbName = await resolveChurchDb(req);
    const { recordType } = req;
    const { id } = req.params;
    const table = qt(dbName, getTableName(recordType));

    const [rows] = await promisePool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: 'Database error', message: 'Failed to retrieve record' });
  }
};

const createRecord = async (req, res) => {
  try {
    const dbName = await resolveChurchDb(req);
    const { recordType } = req;
    const churchId = req.params.churchId || req.user?.church_id;
    const table = qt(dbName, getTableName(recordType));

    // Field-level validation BEFORE the SQL — turns malformed input
    // (e.g. 5-digit year typo) into a clean 400 with structured
    // fieldErrors instead of a 500 + SQL stack trace.
    const v = validateRecordFields(recordType, req.body || {});
    if (!v.ok) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'One or more fields are invalid.',
        fieldErrors: v.fieldErrors,
      });
    }

    const cols = mapFields(recordType, req.body, churchId);

    // Set entry_type default for baptism
    if (recordType === 'baptism' && !cols.entry_type) {
      cols.entry_type = 'Baptism';
    }

    const colNames = Object.keys(cols);
    const placeholders = colNames.map(() => '?').join(', ');
    const values = colNames.map(c => cols[c]);

    const sql = `INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`;
    const [result] = await promisePool.execute(sql, values);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        recordType,
        message: `${recordType} record created successfully`
      }
    });
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Database error', message: 'Failed to create record' });
  }
};

const updateRecord = async (req, res) => {
  try {
    const dbName = await resolveChurchDb(req);
    const { recordType } = req;
    const { id } = req.params;
    const churchId = req.params.churchId || req.user?.church_id;
    const table = qt(dbName, getTableName(recordType));

    // Verify record exists
    const [existing] = await promisePool.execute(`SELECT id FROM ${table} WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Field-level validation BEFORE the SQL — same defense as create.
    const v = validateRecordFields(recordType, req.body || {});
    if (!v.ok) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'One or more fields are invalid.',
        fieldErrors: v.fieldErrors,
      });
    }

    const cols = mapFields(recordType, req.body, churchId);
    // Don't update church_id on update
    delete cols.church_id;

    const setClause = Object.keys(cols).map(c => `${c} = ?`).join(', ');
    const values = [...Object.values(cols), id];

    if (!setClause) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await promisePool.execute(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);

    // Return the FULL updated row so the front-end can replace the grid
    // entry without losing all its other fields. Previously we returned
    // only { id, recordType, message } — RecordsPage's setRecords map
    // would then overwrite the row with that stub and the cells would
    // appear blank until the next refresh. Re-SELECT after UPDATE keeps
    // the response consistent with whatever just landed (including
    // computed columns like updated_at).
    const [updatedRows] = await promisePool.execute(
      `SELECT * FROM ${table} WHERE id = ?`,
      [id],
    );
    const updated = updatedRows[0] || { id };

    res.json({
      success: true,
      data: { ...updated, recordType, message: `${recordType} record updated successfully` },
    });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Database error', message: 'Failed to update record' });
  }
};

const deleteRecord = async (req, res) => {
  try {
    const dbName = await resolveChurchDb(req);
    const { recordType } = req;
    const { id } = req.params;
    const table = qt(dbName, getTableName(recordType));

    const [existing] = await promisePool.execute(`SELECT id FROM ${table} WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await promisePool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);

    res.json({
      success: true,
      data: { id, recordType, message: `${recordType} record deleted successfully` }
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Database error', message: 'Failed to delete record' });
  }
};

const getRecordHistory = async (req, res) => {
  try {
    const dbName = await resolveChurchDb(req);
    const { recordType } = req;
    const { id } = req.params;

    // Try church DB first, fall back to empty if table doesn't exist
    try {
      const auditTable = qt(dbName, 'record_audit_log');
      const [rows] = await promisePool.execute(
        `SELECT * FROM ${auditTable} WHERE record_type = ? AND record_id = ? ORDER BY created_at DESC`,
        [recordType, id]
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      // Table may not exist — return empty
      res.json({ success: true, data: [] });
    }
  } catch (error) {
    console.error('Error fetching record history:', error);
    res.status(500).json({ error: 'Database error', message: 'Failed to retrieve record history' });
  }
};

const validateRecord = async (req, res) => {
  try {
    const { recordType } = req;
    const body = req.body;
    const errors = [];

    if (recordType === 'baptism') {
      if (!body.firstName && !body.first_name) errors.push({ field: 'firstName', message: 'First name is required' });
      if (!body.lastName && !body.last_name) errors.push({ field: 'lastName', message: 'Last name is required' });
    } else if (recordType === 'marriage') {
      if (!body.groomFirstName && !body.fname_groom) errors.push({ field: 'groomFirstName', message: 'Groom first name is required' });
      if (!body.brideFirstName && !body.fname_bride) errors.push({ field: 'brideFirstName', message: 'Bride first name is required' });
    } else if (recordType === 'funeral') {
      if (!body.lastName && !body.lastname) errors.push({ field: 'lastName', message: 'Last name is required' });
    }

    res.json({ success: true, data: { isValid: errors.length === 0, errors } });
  } catch (error) {
    console.error('Error validating record:', error);
    res.status(500).json({ error: 'Validation error', message: 'Failed to validate record' });
  }
};

const getRecordStats = async (req, res) => {
  try {
    const dbName = await resolveChurchDb(req);
    const stats = {};

    for (const recordType of ['baptism', 'marriage', 'funeral']) {
      const table = qt(dbName, getTableName(recordType));
      const [totalRows] = await promisePool.execute(`SELECT COUNT(*) as total FROM ${table}`);
      stats[recordType] = { total: totalRows[0].total };
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching record stats:', error);
    res.status(500).json({ error: 'Database error', message: 'Failed to retrieve statistics' });
  }
};

module.exports = {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  getRecordHistory,
  validateRecord,
  getRecordStats
};
