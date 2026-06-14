/**
 * Record Table Configuration Service
 * Centralized helpers for church record table schema and configuration
 */

const { getAppPool } = require('../config/db-compat');

/**
 * Get church database schema name
 * @param {number} churchId
 * @returns {Promise<string|null>} Schema name like "om_church_46" or null if church not found
 */
async function getChurchSchemaName(churchId) {
  const [churches] = await getAppPool().query(
    'SELECT database_name FROM churches WHERE id = ? AND is_active = 1',
    [churchId]
  );

  if (churches.length === 0) {
    return null;
  }

  // Use om_church_${churchId} format (matches interactiveReports pattern)
  const databaseName = churches[0].database_name || `om_church_${churchId}`;
  return databaseName;
}

/**
 * List all tables in a church database
 * @param {number} churchId
 * @returns {Promise<string[]>} Array of table names
 */
async function listChurchTables(churchId) {
  const schemaName = await getChurchSchemaName(churchId);
  if (!schemaName) {
    return [];
  }

  const [tables] = await getAppPool().query(
    `SHOW TABLES FROM \`${schemaName}\``
  );

  const tableNames = tables.map(t => Object.values(t)[0]);
  
  // Filter to record tables if they exist
  const recordTables = ['baptism_records', 'marriage_records', 'funeral_records', 'cemetery_records']
    .filter(t => tableNames.includes(t));
  
  return recordTables.length > 0 ? recordTables : tableNames;
}

/**
 * Get columns for a specific table in a church database
 * @param {number} churchId
 * @param {string} tableName
 * @returns {Promise<Array|null>} Array of column objects or null if table not found
 */
async function getTableColumns(churchId, tableName) {
  const schemaName = await getChurchSchemaName(churchId);
  if (!schemaName) {
    return null;
  }

  // Verify table exists
  const [tableCheck] = await getAppPool().query(
    `SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = ? AND table_name = ?`,
    [schemaName, tableName]
  );

  if (tableCheck.length === 0) {
    return null;
  }

  // Get table columns using SHOW COLUMNS (MySQL native)
  const [columns] = await getAppPool().query(
    `SHOW COLUMNS FROM \`${schemaName}\`.\`${tableName}\``
  );

  if (columns.length === 0) {
    return null;
  }

  return columns.map((c, idx) => ({
    name: c.Field,
    position: idx + 1,
    type: c.Type,
    nullable: c.Null === 'YES',
    default: c.Default,
    key: c.Key,
    extra: c.Extra
  }));
}

/**
 * Infer default configuration from columns
 * @param {Array} columns - Array of column objects with name, type, etc.
 * @returns {Object} Default configuration
 */
function inferDefaultsFromColumns(columns) {
  if (!columns || columns.length === 0) {
    return {
      visibleFields: [],
      displayNameMap: {},
      defaultSortField: null,
      defaultSortDirection: 'asc'
    };
  }

  // System fields to exclude from visible fields
  const systemFields = [
    'created_at', 'updated_at', 'deleted_at', 'password', 'token'
    // Note: 'id' is NOT excluded - it's useful for display
  ];

  // JSON/blob fields to exclude
  const jsonBlobPatterns = /json|blob|text/i;

  // Filter visible fields
  const visibleFields = columns
    .filter(col => {
      const name = col.name.toLowerCase();
      return !systemFields.includes(name) && 
             !jsonBlobPatterns.test(col.type);
    })
    .map(col => col.name);

  // Create display name map (Title Case)
  const displayNameMap = {};
  columns.forEach(col => {
    const name = col.name;
    // Convert snake_case to Title Case: first_name -> First Name
    const displayName = name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    displayNameMap[name] = displayName;
  });

  // Determine default sort field
  let defaultSortField = null;
  let defaultSortDirection = 'desc';

  // Priority: reception_date > date_of_baptism/marriage_date/burial_date > id
  const dateFields = columns
    .map(col => col.name.toLowerCase())
    .filter(name => 
      name.includes('reception_date') ||
      name.includes('date_of_baptism') ||
      name.includes('marriage_date') ||
      name.includes('burial_date') ||
      name.includes('death_date')
    );

  if (dateFields.length > 0) {
    // Find the actual column name (case-sensitive)
    const receptionDate = columns.find(col => 
      col.name.toLowerCase() === 'reception_date'
    );
    if (receptionDate) {
      defaultSortField = receptionDate.name;
    } else {
      const dateField = columns.find(col => dateFields.includes(col.name.toLowerCase()));
      if (dateField) {
        defaultSortField = dateField.name;
      }
    }
  } else {
    // Fallback to id if exists
    const idField = columns.find(col => col.name.toLowerCase() === 'id');
    if (idField) {
      defaultSortField = idField.name;
    }
  }

  // If no sort field found, use first visible field
  if (!defaultSortField && visibleFields.length > 0) {
    defaultSortField = visibleFields[0];
    defaultSortDirection = 'asc';
  }

  return {
    visibleFields,
    displayNameMap,
    defaultSortField,
    defaultSortDirection
  };
}

/**
 * Validate table name format
 * @param {string} tableName
 * @returns {boolean}
 */
function validateTableName(tableName) {
  if (!tableName || typeof tableName !== 'string') {
    return false;
  }
  // Allow alphanumeric, underscore, and common table name patterns
  return /^[a-zA-Z0-9_]+$/.test(tableName);
}

/**
 * Get complete record table configuration
 * This is the canonical function that all routes should use
 * @param {number} churchId
 * @param {string|null} tableName - Optional table name
 * @returns {Promise<Object>} Canonical config object
 */
async function getRecordTableConfig(churchId, tableName = null) {
  const schemaName = await getChurchSchemaName(churchId);
  if (!schemaName) {
    return null; // Church not found
  }

  const tables = await listChurchTables(churchId);

  // If no table specified, return tables list only
  if (!tableName) {
    return {
      churchId,
      schemaName,
      table: null,
      tables,
      columns: [],
      schema: { columns: [] },
      defaults: {
        visibleFields: [],
        displayNameMap: {},
        defaultSortField: null,
        defaultSortDirection: 'asc'
      }
    };
  }

  // Validate table name
  if (!validateTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  // Verify table exists
  if (!tables.includes(tableName)) {
    return null; // Table not found
  }

  // Get columns
  const columns = await getTableColumns(churchId, tableName);
  if (!columns) {
    return null; // Table has no columns
  }

  // Infer defaults
  const defaults = inferDefaultsFromColumns(columns);

  return {
    churchId,
    schemaName,
    table: tableName,
    tables,
    columns,
    schema: { columns },
    defaults
  };
}

/**
 * Get record table bundle for Field Mapper / UI.
 * Same as getRecordTableConfig but adds explicit endpoint URLs so the UI never has to guess.
 * @param {number} churchId
 * @param {string} tableName - Required
 * @returns {Promise<Object|null>} Bundle with columns + endpoints, or null if not found
 */
async function getRecordTableBundle(churchId, tableName) {
  const config = await getRecordTableConfig(churchId, tableName);
  if (!config) return null;

  const base = `/api/admin/churches/${churchId}`;
  const columnsUrl = `${base}/tables/${tableName}/columns`;
  const churchColumnsUrl = `/api/admin/church/${churchId}/tables/${tableName}/columns`;

  return {
    ...config,
    endpoints: {
      columns: columnsUrl,
      columnsLegacy: churchColumnsUrl,
      table: `${base}/tables/${tableName}`
    }
  };
}

module.exports = {
  getChurchSchemaName,
  listChurchTables,
  getTableColumns,
  inferDefaultsFromColumns,
  validateTableName,
  getRecordTableConfig,
  getRecordTableBundle
};
