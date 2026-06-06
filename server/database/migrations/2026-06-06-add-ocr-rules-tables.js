/**
 * Migration: Create OCR Rules and Configuration Tables in platform DB (orthodoxmetrics_db).
 *
 * Tables:
 * 1. ocr_parish_configuration_entities
 * 2. ocr_parish_rules
 * 3. ocr_rule_evaluation_logs
 *
 * Run: DB_HOST=192.168.1.241 DB_USER=orthodoxapps DB_PASSWORD='...' node server/database/migrations/2026-06-06-add-ocr-rules-tables.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '192.168.1.241',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'orthodoxapps',
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME || 'orthodoxmetrics_db',
  });

  console.log('Connected to orthodoxmetrics_db database. Running migrations...');

  try {
    // 1. Create ocr_parish_configuration_entities
    console.log('Creating ocr_parish_configuration_entities table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ocr_parish_configuration_entities (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        entity_type VARCHAR(50) NOT NULL, -- 'clergy', 'location', 'spelling_variant', 'family_name_rule'
        canonical_value VARCHAR(255) NOT NULL,
        display_label VARCHAR(255) NULL,
        role VARCHAR(100) NULL,
        active_from DATE NULL,
        active_to DATE NULL,
        confidence_level DECIMAL(5,2) NULL,
        source_label VARCHAR(100) NULL,
        source_notes TEXT NULL,
        metadata_json TEXT NULL,
        variants_json TEXT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_by VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_church_type (church_id, entity_type),
        CONSTRAINT fk_config_entities_church FOREIGN KEY (church_id) REFERENCES churches (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create ocr_parish_rules
    console.log('Creating ocr_parish_rules table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ocr_parish_rules (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NULL, -- NULL for global fallback rules
        scope VARCHAR(30) DEFAULT 'church', -- 'global', 'church'
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        record_type VARCHAR(50) NOT NULL, -- 'baptism', 'marriage', 'funeral', 'chrismation', 'all'
        conditions_json LONGTEXT NOT NULL,
        actions_json LONGTEXT NOT NULL,
        severity VARCHAR(30) DEFAULT 'suggestion', -- 'info', 'suggestion', 'warning', 'error', 'blocker'
        is_active TINYINT(1) DEFAULT 1,
        priority INT DEFAULT 100,
        created_by VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_church_active (church_id, is_active),
        CONSTRAINT fk_parish_rules_church FOREIGN KEY (church_id) REFERENCES churches (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Create ocr_rule_evaluation_logs
    console.log('Creating ocr_rule_evaluation_logs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ocr_rule_evaluation_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        ocr_job_id INT NULL, -- Aligned type with ocr_jobs.id (int(11))
        ocr_draft_id BIGINT NULL,
        record_index INT DEFAULT 0,
        rule_id BIGINT NULL,
        rule_name VARCHAR(255) NOT NULL,
        field_path VARCHAR(255) NULL,
        target_field VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL, -- 'suggest_value', 'normalize_value', etc.
        severity VARCHAR(30) NOT NULL, -- 'info', 'suggestion', etc.
        original_value TEXT NULL,
        suggested_value TEXT NULL,
        resolved_value TEXT NULL,
        confidence_score DECIMAL(5,2) NULL,
        explanation TEXT NOT NULL,
        auto_applied TINYINT(1) DEFAULT 0,
        reviewer_decision VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'overridden', 'auto_applied', 'corrected_by_user'
        decision_notes TEXT NULL,
        decided_by VARCHAR(255) NULL,
        decided_at DATETIME NULL,
        overridden_by_rule_id BIGINT NULL,
        created_by_engine_version VARCHAR(50) DEFAULT '1.0.0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_job_record (ocr_job_id, record_index),
        CONSTRAINT fk_eval_logs_church FOREIGN KEY (church_id) REFERENCES churches (id) ON DELETE CASCADE,
        CONSTRAINT fk_eval_logs_job FOREIGN KEY (ocr_job_id) REFERENCES ocr_jobs (id) ON DELETE SET NULL,
        CONSTRAINT fk_eval_logs_rule FOREIGN KEY (rule_id) REFERENCES ocr_parish_rules (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Error running migrations:', err);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
