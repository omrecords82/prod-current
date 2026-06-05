-- Add review_status column to ocr_jobs for user-facing upload tracking
-- Stages: uploaded → pending_review → in_review → processed → returned
-- Only admins/super_admins advance past pending_review

SET @has_review_status = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'orthodoxmetrics_db'
    AND TABLE_NAME = 'ocr_jobs'
    AND COLUMN_NAME = 'review_status'
);

SET @sql = IF(@has_review_status = 0,
  'ALTER TABLE orthodoxmetrics_db.ocr_jobs ADD COLUMN review_status ENUM(''uploaded'', ''pending_review'', ''in_review'', ''processed'', ''returned'') NOT NULL DEFAULT ''uploaded'' AFTER status',
  'SELECT "review_status column already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill: completed jobs → processed, others → uploaded
UPDATE orthodoxmetrics_db.ocr_jobs SET review_status = 'processed' WHERE status IN ('completed', 'complete') AND review_status = 'uploaded';
UPDATE orthodoxmetrics_db.ocr_jobs SET review_status = 'pending_review' WHERE status IN ('pending', 'queued') AND review_status = 'uploaded';

-- Agent pipeline columns (2026-06-04)
ALTER TABLE orthodoxmetrics_db.ocr_jobs ADD COLUMN IF NOT EXISTS agent_status ENUM('pending','running','complete','failed') NULL DEFAULT NULL;
ALTER TABLE orthodoxmetrics_db.ocr_jobs ADD COLUMN IF NOT EXISTS agent_extract_json LONGTEXT NULL;
ALTER TABLE orthodoxmetrics_db.ocr_jobs ADD COLUMN IF NOT EXISTS ready_to_seed TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE orthodoxmetrics_db.ocr_jobs ADD COLUMN IF NOT EXISTS seeded_at TIMESTAMP NULL;
ALTER TABLE orthodoxmetrics_db.ocr_jobs ADD COLUMN IF NOT EXISTS variation_id INT NULL;
ALTER TABLE orthodoxmetrics_db.ocr_extractors ADD COLUMN IF NOT EXISTS era_label VARCHAR(100) NULL;
ALTER TABLE orthodoxmetrics_db.ocr_extractors ADD COLUMN IF NOT EXISTS year_from SMALLINT NULL;
ALTER TABLE orthodoxmetrics_db.ocr_extractors ADD COLUMN IF NOT EXISTS year_to SMALLINT NULL;

-- Add uploaded_by column to track which user uploaded
SET @has_uploaded_by = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'orthodoxmetrics_db'
    AND TABLE_NAME = 'ocr_jobs'
    AND COLUMN_NAME = 'uploaded_by'
);

SET @sql = IF(@has_uploaded_by = 0,
  'ALTER TABLE orthodoxmetrics_db.ocr_jobs ADD COLUMN uploaded_by INT NULL AFTER church_id',
  'SELECT "uploaded_by column already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add review_notes for admin feedback to users
SET @has_review_notes = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'orthodoxmetrics_db'
    AND TABLE_NAME = 'ocr_jobs'
    AND COLUMN_NAME = 'review_notes'
);

SET @sql = IF(@has_review_notes = 0,
  'ALTER TABLE orthodoxmetrics_db.ocr_jobs ADD COLUMN review_notes TEXT NULL AFTER review_status',
  'SELECT "review_notes column already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
