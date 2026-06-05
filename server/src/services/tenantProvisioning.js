/**
 * Tenant Database Provisioning Service
 *
 * Creates new church tenant databases from the approved record_template1 template.
 * Uses mysqldump --no-data to clone the full template schema.
 *
 * Design Decision: Option A (mysqldump clone) chosen over Option B (replay SQL) because:
 * - Single source of truth: record_template1 IS the schema definition
 * - No second artifact to maintain or drift
 * - Preserves all indexes, constraints, FKs, collation in one pass
 * - Already proven in production via provisionSingleTenantDb()
 */

const { execSync } = require('child_process');

// Template source — the only approved template
const TEMPLATE_DB = 'record_template1';
const APPROVED_VERSION = '2.0.0';
const EXPECTED_TABLE_COUNT = 20;

// Tables that MUST exist after provisioning (subset for fast-fail check)
const CRITICAL_TABLES = [
  'baptism_records', 'baptism_history',
  'marriage_records', 'marriage_history',
  'funeral_records', 'funeral_history',
  'activity_log', 'change_log',
  'church_settings', 'ocr_jobs',
  'ocr_fused_drafts', 'ocr_feeder_pages',
  'record_supplements',
];

// All tables expected in a provisioned tenant DB (matches record_template1 v2.0.0)
const EXPECTED_TABLES = [
  'activity_log', 'baptism_history', 'baptism_records',
  'change_log', 'church_settings',
  'funeral_history', 'funeral_records',
  'marriage_history', 'marriage_records',
  'ocr_draft_records', 'ocr_feeder_artifacts', 'ocr_feeder_pages',
  'ocr_finalize_history', 'ocr_fused_drafts', 'ocr_jobs',
  'ocr_mappings', 'ocr_settings', 'ocr_setup_state',
  'record_supplements', 'template_meta',
];

// Tables that need church_id DEFAULT set after cloning
const CHURCH_ID_TABLES = [
  'baptism_records', 'baptism_history',
  'marriage_records', 'marriage_history',
  'funeral_records', 'funeral_history',
  'activity_log', 'change_log',
  'ocr_jobs', 'ocr_draft_records',
  'ocr_fused_drafts', 'ocr_mappings',
  'ocr_settings', 'ocr_setup_state',
];

// ── Error Types ───────────────────────────────────────────────────

const ERROR_TYPES = {
  TEMPLATE_VERSION_MISMATCH: 'TEMPLATE_VERSION_MISMATCH',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_NOT_FROZEN: 'TEMPLATE_NOT_FROZEN',
  TEMPLATE_INVALID: 'TEMPLATE_INVALID',
  DB_ALREADY_EXISTS: 'DB_ALREADY_EXISTS',
  DUPLICATE_PROVISION: 'DUPLICATE_PROVISION',
  SCHEMA_CLONE_FAILED: 'SCHEMA_CLONE_FAILED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Classify an error message into a structured error_type.
 */
function classifyError(message) {
  if (!message) return null;
  if (message.includes('!= approved')) return ERROR_TYPES.TEMPLATE_VERSION_MISMATCH;
  if (message.includes('does not exist') && message.includes('Template')) return ERROR_TYPES.TEMPLATE_NOT_FOUND;
  if (message.includes('not frozen')) return ERROR_TYPES.TEMPLATE_NOT_FROZEN;
  if (message.includes('template_meta')) return ERROR_TYPES.TEMPLATE_INVALID;
  if (message.includes('already exists')) return ERROR_TYPES.DB_ALREADY_EXISTS;
  if (message.includes('already provisioned')) return ERROR_TYPES.DUPLICATE_PROVISION;
  if (message.includes('Schema clone failed')) return ERROR_TYPES.SCHEMA_CLONE_FAILED;
  if (message.includes('ECONNREFUSED') || message.includes('Access denied') || message.includes('connect')) return ERROR_TYPES.CONNECTION_ERROR;
  return ERROR_TYPES.UNKNOWN;
}

// ── Audit Trail ───────────────────────────────────────────────────

/**
 * Insert a row into tenant_provisioning_log. Best-effort — never throws.
 * @returns {number|null} The inserted log row id, or null on failure
 */
async function auditLog(pool, data) {
  try {
    const [result] = await pool.query(
      `INSERT INTO tenant_provisioning_log
       (church_id, db_name, template_version, status, started_at, completed_at, duration_ms,
        error_message, error_type, initiated_by, source, request_id, version_override, warnings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.churchId,
        data.dbName,
        data.templateVersion || null,
        data.status,
        data.startedAt,
        data.completedAt || null,
        data.durationMs || null,
        data.errorMessage || null,
        data.errorType || null,
        data.initiatedBy || null,
        data.source || null,
        data.requestId || null,
        data.versionOverride ? 1 : 0,
        data.warnings && data.warnings.length > 0 ? JSON.stringify(data.warnings) : null,
      ]
    );
    return result.insertId;
  } catch (e) {
    console.error('[Provisioning] Audit log write failed (non-fatal):', e.message);
    return null;
  }
}

/**
 * Update an existing audit log row on completion. Best-effort — never throws.
 */
async function auditLogComplete(pool, logId, data) {
  if (!logId) return;
  try {
    await pool.query(
      `UPDATE tenant_provisioning_log
       SET status = ?, completed_at = ?, duration_ms = ?, error_message = ?, error_type = ?,
           template_version = COALESCE(?, template_version), warnings = ?,
           verification_passed = ?, expected_table_count = ?, actual_table_count = ?,
           missing_tables = ?, extra_tables = ?
       WHERE id = ?`,
      [
        data.status,
        data.completedAt,
        data.durationMs,
        data.errorMessage || null,
        data.errorType || null,
        data.templateVersion || null,
        data.warnings && data.warnings.length > 0 ? JSON.stringify(data.warnings) : null,
        data.verificationPassed != null ? (data.verificationPassed ? 1 : 0) : null,
        data.expectedTableCount != null ? data.expectedTableCount : null,
        data.actualTableCount != null ? data.actualTableCount : null,
        data.missingTables && data.missingTables.length > 0 ? JSON.stringify(data.missingTables) : null,
        data.extraTables && data.extraTables.length > 0 ? JSON.stringify(data.extraTables) : null,
        logId,
      ]
    );
  } catch (e) {
    console.error('[Provisioning] Audit log update failed (non-fatal):', e.message);
  }
}

/**
 * Look up a previous provisioning result by request_id. Returns null if not found.
 */
async function findByRequestId(pool, requestId) {
  if (!requestId) return null;
  try {
    const [rows] = await pool.query(
      `SELECT id, church_id, db_name, template_version, status, duration_ms,
              error_message, error_type, verification_passed, expected_table_count,
              actual_table_count, warnings, version_override
       FROM tenant_provisioning_log WHERE request_id = ? LIMIT 1`,
      [requestId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (e) {
    console.error('[Provisioning] Request ID lookup failed (non-fatal):', e.message);
    return null;
  }
}

// ── Main Provisioning ─────────────────────────────────────────────

/**
 * Provision a new tenant database for a church.
 *
 * @param {number} churchId - The church ID
 * @param {object} pool - Database connection pool (platform DB)
 * @param {object} [options] - Options
 * @param {boolean} [options.allowExisting=false] - If true, skip if DB already exists
 * @param {boolean} [options.skipChurchUpdate=false] - If true, don't update churches table
 * @param {boolean} [options.force=false] - If true, bypass template version check AND duplicate guard
 * @param {string} [options.source] - Provisioning source: onboarding, crm, lifecycle, demo, admin, cli
 * @param {string|number} [options.initiatedBy] - User ID or identifier of who triggered provisioning
 * @param {string} [options.requestId] - Idempotency key — duplicate calls return cached result
 * @returns {Promise<ProvisionResult>}
 */
async function provisionTenantDb(churchId, pool, options = {}) {
  const { allowExisting = false, skipChurchUpdate = false, force = false, source = null, initiatedBy = null, requestId = null } = options;
  const tenantDb = `om_church_${churchId}`;
  const startTime = Date.now();
  const startedAt = new Date();

  const result = {
    success: false,
    churchId,
    targetDb: tenantDb,
    templateVersion: null,
    tablesCreated: 0,
    verified: false,
    dbCreated: false,
    churchIdDefaultsSet: false,
    durationMs: 0,
    error: null,
    errorType: null,
    warnings: [],
    versionOverride: force,
    idempotent: false,
  };

  // ── Idempotency: check if this request_id was already processed ──
  if (requestId) {
    const prev = await findByRequestId(pool, requestId);
    if (prev) {
      result.success = prev.status === 'success';
      result.targetDb = prev.db_name;
      result.templateVersion = prev.template_version;
      result.tablesCreated = prev.actual_table_count || 0;
      result.verified = prev.verification_passed === 1;
      result.durationMs = prev.duration_ms || 0;
      result.error = prev.error_message || null;
      result.errorType = prev.error_type || null;
      result.idempotent = true;
      result.warnings.push(`Idempotent return: request_id=${requestId} already processed (audit log id=${prev.id})`);
      logProvision(result);
      return result;
    }
  }

  // ── Audit: log start ──
  const auditId = await auditLog(pool, {
    churchId,
    dbName: tenantDb,
    templateVersion: null,
    status: 'started',
    startedAt,
    source,
    requestId,
    initiatedBy: initiatedBy != null ? String(initiatedBy) : null,
    versionOverride: force,
  });

  try {
    // ── Step 0: Duplicate provisioning guard ───────────────────────────
    if (!force) {
      // Check churches.db_name
      const [churchRows] = await pool.query(
        'SELECT db_name, database_name FROM churches WHERE id = ?',
        [churchId]
      );
      if (churchRows.length > 0) {
        const existingDb = churchRows[0].db_name || churchRows[0].database_name;
        if (existingDb) {
          throw Object.assign(
            new Error(`Church ${churchId} already provisioned with database ${existingDb}. Use force:true to re-provision.`),
            { errorType: ERROR_TYPES.DUPLICATE_PROVISION }
          );
        }
      }

      // Check audit log for previous success
      const [prevSuccess] = await pool.query(
        'SELECT id, db_name FROM tenant_provisioning_log WHERE church_id = ? AND status = ? LIMIT 1',
        [churchId, 'success']
      );
      if (prevSuccess.length > 0) {
        throw Object.assign(
          new Error(`Church ${churchId} already provisioned (audit log id=${prevSuccess[0].id}, db=${prevSuccess[0].db_name}). Use force:true to re-provision.`),
          { errorType: ERROR_TYPES.DUPLICATE_PROVISION }
        );
      }
    }

    // ── Step 1: Validate template ──────────────────────────────────────
    const templateValidation = await validateTemplate(pool, { force });
    if (!templateValidation.valid) {
      throw Object.assign(
        new Error(`Template validation failed: ${templateValidation.reason}`),
        { errorType: classifyError(templateValidation.reason) }
      );
    }
    result.templateVersion = templateValidation.version;

    if (templateValidation.versionOverride) {
      result.warnings.push(`Template version override: actual=${templateValidation.actualVersion}, approved=${APPROVED_VERSION}`);
      result.versionOverride = true;
    }

    // ── Step 2: Check if target DB already exists ──────────────────────
    const [existing] = await pool.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [tenantDb]
    );

    if (existing.length > 0) {
      if (allowExisting) {
        result.warnings.push(`Database ${tenantDb} already exists — skipped creation`);
        result.success = true;
        result.dbCreated = false;
        // Still update churches table if needed
        if (!skipChurchUpdate) {
          await updateChurchDbName(pool, churchId, tenantDb);
        }
        result.durationMs = Date.now() - startTime;
        logProvision(result);
        await auditLogComplete(pool, auditId, {
          status: 'success',
          completedAt: new Date(),
          durationMs: result.durationMs,
          templateVersion: result.templateVersion,
          warnings: result.warnings,
        });
        return result;
      }
      throw Object.assign(
        new Error(`Database ${tenantDb} already exists. Use allowExisting:true to skip.`),
        { errorType: ERROR_TYPES.DB_ALREADY_EXISTS }
      );
    }

    // ── Step 3: Create database ────────────────────────────────────────
    await pool.query(`CREATE DATABASE \`${tenantDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    result.dbCreated = true;

    // ── Step 4: Clone schema from template via mysqldump ───────────────
    try {
      const dbCfg = getDbConfig();
      const escapedPassword = dbCfg.password.replace(/'/g, "'\\''");
      const dumpCmd = `mysqldump --column-statistics=0 --host=${dbCfg.host} --port=${dbCfg.port} --user=${dbCfg.user} --password='${escapedPassword}' --no-data --skip-lock-tables ${TEMPLATE_DB}`;
      const loadCmd = `mysql --host=${dbCfg.host} --port=${dbCfg.port} --user=${dbCfg.user} --password='${escapedPassword}' ${tenantDb}`;

      execSync(`${dumpCmd} 2>/dev/null | ${loadCmd} 2>/dev/null`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      });
    } catch (dumpError) {
      // Rollback: drop the empty database we just created
      await rollbackDb(pool, tenantDb);
      throw Object.assign(
        new Error(`Schema clone failed: ${dumpError.message}`),
        { errorType: ERROR_TYPES.SCHEMA_CLONE_FAILED }
      );
    }

    // ── Step 5: Set church_id defaults ─────────────────────────────────
    try {
      await setChurchIdDefaults(pool, tenantDb, churchId);
      result.churchIdDefaultsSet = true;
    } catch (defaultError) {
      result.warnings.push(`church_id defaults partially set: ${defaultError.message}`);
    }

    // ── Step 6: Verify provisioned database ────────────────────────────
    const verification = await verifyTenantDb(pool, tenantDb);
    result.tablesCreated = verification.tableCount;
    result.verified = verification.passed;
    result.verification = verification;

    if (!verification.passed) {
      result.warnings.push(...verification.issues);
      // Don't rollback — tables were created, just log the issues
    }

    // ── Step 7: Update churches table ──────────────────────────────────
    if (!skipChurchUpdate) {
      await updateChurchDbName(pool, churchId, tenantDb);
    }

    result.success = true;
    result.durationMs = Date.now() - startTime;
    logProvision(result);

    // ── Audit: log success with verification snapshot ──
    await auditLogComplete(pool, auditId, {
      status: 'success',
      completedAt: new Date(),
      durationMs: result.durationMs,
      templateVersion: result.templateVersion,
      warnings: result.warnings,
      verificationPassed: verification.passed,
      expectedTableCount: verification.expectedTableCount,
      actualTableCount: verification.tableCount,
      missingTables: verification.missingTables,
      extraTables: verification.extraTables,
    });

    return result;

  } catch (error) {
    result.error = error.message;
    result.errorType = error.errorType || classifyError(error.message);
    result.durationMs = Date.now() - startTime;
    logProvision(result);

    // ── Audit: log failure (include verification snapshot if it ran) ──
    const v = result.verification;
    await auditLogComplete(pool, auditId, {
      status: 'failure',
      completedAt: new Date(),
      durationMs: result.durationMs,
      errorMessage: error.message,
      errorType: result.errorType,
      templateVersion: result.templateVersion,
      warnings: result.warnings,
      verificationPassed: v ? v.passed : null,
      expectedTableCount: v ? v.expectedTableCount : null,
      actualTableCount: v ? v.tableCount : null,
      missingTables: v ? v.missingTables : null,
      extraTables: v ? v.extraTables : null,
    });

    return result;
  }
}

/**
 * Validate that record_template1 exists, is the approved version, and has expected tables.
 *
 * @param {object} pool
 * @param {object} [options]
 * @param {boolean} [options.force=false] - If true, allow version mismatch (logged)
 */
async function validateTemplate(pool, options = {}) {
  const { force = false } = options;

  // Check template database exists
  const [schemas] = await pool.query(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [TEMPLATE_DB]
  );
  if (schemas.length === 0) {
    return { valid: false, reason: `Template database ${TEMPLATE_DB} does not exist` };
  }

  // Check template_meta version and frozen status
  let actualVersion = null;
  try {
    const [meta] = await pool.query(
      `SELECT version, frozen_at FROM \`${TEMPLATE_DB}\`.template_meta WHERE id = 1`
    );
    if (meta.length === 0) {
      return { valid: false, reason: 'template_meta row missing (id=1)' };
    }
    actualVersion = meta[0].version;

    if (actualVersion !== APPROVED_VERSION) {
      if (force) {
        // Allow override but flag it
        console.warn(`[Provisioning] VERSION OVERRIDE: template=${actualVersion}, approved=${APPROVED_VERSION}`);
      } else {
        return { valid: false, reason: `Template version ${actualVersion} != approved ${APPROVED_VERSION}. Use force:true to override.` };
      }
    }

    if (!meta[0].frozen_at) {
      return { valid: false, reason: 'Template is not frozen (frozen_at is NULL)' };
    }
  } catch (e) {
    return { valid: false, reason: `Cannot read template_meta: ${e.message}` };
  }

  // Check table count
  const [tables] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [TEMPLATE_DB]
  );
  if (tables[0].cnt < EXPECTED_TABLE_COUNT) {
    return { valid: false, reason: `Template has ${tables[0].cnt} tables, expected ${EXPECTED_TABLE_COUNT}` };
  }

  return {
    valid: true,
    version: actualVersion,
    actualVersion,
    versionOverride: actualVersion !== APPROVED_VERSION && force,
  };
}

/**
 * Verify a newly provisioned tenant database.
 */
async function verifyTenantDb(pool, dbName) {
  const issues = [];

  // Check all tables exist
  const [tables] = await pool.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [dbName]
  );
  const tableNames = new Set(tables.map(t => t.TABLE_NAME));
  const tableCount = tableNames.size;

  // template_meta is cloned but that's fine — it's schema-only, no data
  // Actually mysqldump --no-data won't copy the template_meta DATA, just the structure

  // Check critical tables
  const missingCritical = CRITICAL_TABLES.filter(t => !tableNames.has(t));
  if (missingCritical.length > 0) {
    issues.push(`Missing critical tables: ${missingCritical.join(', ')}`);
  }

  // Check minimum table count (template has 20, tenant should have 20)
  if (tableCount < EXPECTED_TABLE_COUNT) {
    issues.push(`Table count ${tableCount} < expected ${EXPECTED_TABLE_COUNT}`);
  }

  // Check all tables are empty
  for (const table of tables) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM \`${dbName}\`.\`${table.TABLE_NAME}\``
    );
    if (rows[0].cnt > 0) {
      issues.push(`Table ${table.TABLE_NAME} has ${rows[0].cnt} rows (expected 0)`);
    }
  }

  // Check baptism_records.entry_type default
  const [entryTypeCol] = await pool.query(
    `SELECT COLUMN_DEFAULT, IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'baptism_records' AND COLUMN_NAME = 'entry_type'`,
    [dbName]
  );
  if (entryTypeCol.length > 0) {
    // MariaDB may return the default wrapped in quotes: 'Baptism' or Baptism
    const rawDefault = (entryTypeCol[0].COLUMN_DEFAULT || '').replace(/^'|'$/g, '');
    if (rawDefault !== 'Baptism') {
      issues.push(`baptism_records.entry_type default is '${rawDefault}', expected 'Baptism'`);
    }
  }

  // Check baptism_records has OCR columns
  const ocrCols = ['source_scan_id', 'ocr_confidence', 'verified_by', 'verified_at'];
  const [bapCols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'baptism_records' AND COLUMN_NAME IN (?)`,
    [dbName, ocrCols]
  );
  const foundOcrCols = new Set(bapCols.map(c => c.COLUMN_NAME));
  const missingOcr = ocrCols.filter(c => !foundOcrCols.has(c));
  if (missingOcr.length > 0) {
    issues.push(`baptism_records missing OCR columns: ${missingOcr.join(', ')}`);
  }

  // Check history tables have audit columns
  const auditCols = ['diff_data', 'actor_user_id', 'source', 'request_id', 'ip_address'];
  for (const histTable of ['baptism_history', 'marriage_history', 'funeral_history']) {
    if (!tableNames.has(histTable)) continue;
    const [hCols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN (?)`,
      [dbName, histTable, auditCols]
    );
    const foundAudit = new Set(hCols.map(c => c.COLUMN_NAME));
    const missingAudit = auditCols.filter(c => !foundAudit.has(c));
    if (missingAudit.length > 0) {
      issues.push(`${histTable} missing audit columns: ${missingAudit.join(', ')}`);
    }
  }

  // Compute missing/extra vs expected template tables
  const expectedSet = new Set(EXPECTED_TABLES);
  const missingTables = EXPECTED_TABLES.filter(t => !tableNames.has(t));
  const extraTables = [...tableNames].filter(t => !expectedSet.has(t));

  return {
    passed: issues.length === 0,
    tableCount,
    issues,
    expectedTableCount: EXPECTED_TABLE_COUNT,
    missingTables,
    extraTables,
  };
}

/**
 * Set church_id DEFAULT on record and history tables.
 */
async function setChurchIdDefaults(pool, dbName, churchId) {
  for (const table of CHURCH_ID_TABLES) {
    // Check if table exists and has church_id column
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME, COLUMN_KEY FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'church_id'`,
      [dbName, table]
    );
    if (cols.length > 0) {
      // Skip PRIMARY KEY columns (e.g., ocr_setup_state.church_id is PK, no default)
      if (cols[0].COLUMN_KEY === 'PRI') continue;
      try {
        await pool.query(
          `ALTER TABLE \`${dbName}\`.\`${table}\` ALTER COLUMN church_id SET DEFAULT ?`,
          [churchId]
        );
      } catch (e) {
        // Non-fatal — some columns may not support defaults
        console.warn(`[Provisioning] Could not set church_id default on ${dbName}.${table}: ${e.message}`);
      }
    }
  }
}

/**
 * Update churches.db_name and database_name.
 */
async function updateChurchDbName(pool, churchId, dbName) {
  await pool.query(
    'UPDATE churches SET db_name = ?, database_name = ? WHERE id = ?',
    [dbName, dbName, churchId]
  );
}

/**
 * Rollback a failed provisioning — drops the database if it was just created.
 */
async function rollbackDb(pool, dbName) {
  try {
    // Safety: only drop om_church_ prefixed databases
    if (!dbName.startsWith('om_church_')) {
      console.error(`[Provisioning] REFUSING to drop non-tenant DB: ${dbName}`);
      return;
    }
    // Check that it's empty (no data in any table)
    const [tables] = await pool.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [dbName]
    );
    // Only rollback if the DB has 0 or very few tables (partial clone)
    if (tables.length <= EXPECTED_TABLE_COUNT) {
      await pool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      console.log(`[Provisioning] Rolled back: dropped ${dbName}`);
    }
  } catch (e) {
    console.error(`[Provisioning] Rollback failed for ${dbName}:`, e.message);
  }
}

/**
 * Get database connection config for CLI tools (mysqldump/mysql).
 */
function getDbConfig() {
  try {
    const config = require('../config').default || require('../config');
    return {
      host: config.db.app.host || 'localhost',
      port: config.db.app.port || 3306,
      user: config.db.app.user || 'orthodoxapps',
      password: config.db.app.password || '',
    };
  } catch (e) {
    // Fallback to environment variables
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'orthodoxapps',
      password: process.env.DB_PASSWORD || 'Summerof1982@!',
    };
  }
}

/**
 * Log provisioning outcome.
 */
function logProvision(result) {
  const status = result.success ? '✅' : '❌';
  const parts = [
    `[Provisioning] ${status}`,
    `church=${result.churchId}`,
    `db=${result.targetDb}`,
    `template=v${result.templateVersion || '?'}`,
    `tables=${result.tablesCreated}`,
    `verified=${result.verified}`,
    `duration=${result.durationMs}ms`,
  ];
  if (result.dbCreated) parts.push('(new DB)');
  if (result.versionOverride) parts.push('(VERSION OVERRIDE)');
  if (result.error) parts.push(`error="${result.error}"`);
  if (result.warnings.length > 0) parts.push(`warnings=${result.warnings.length}`);

  const logFn = result.success ? console.log : console.error;
  logFn(parts.join(' | '));

  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      console.warn(`  ⚠ ${w}`);
    }
  }
}

/**
 * Standalone verification for an existing tenant database.
 * Can be used to check previously provisioned databases.
 */
async function verifyExistingTenantDb(dbName, pool) {
  const [schemas] = await pool.query(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [dbName]
  );
  if (schemas.length === 0) {
    return { passed: false, tableCount: 0, issues: [`Database ${dbName} does not exist`] };
  }
  return verifyTenantDb(pool, dbName);
}

module.exports = {
  provisionTenantDb,
  validateTemplate,
  verifyTenantDb,
  verifyExistingTenantDb,
  TEMPLATE_DB,
  APPROVED_VERSION,
  EXPECTED_TABLE_COUNT,
};
