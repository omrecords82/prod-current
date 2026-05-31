-- Migration: 2026-05-30 — AI Agent Checkpoint Reports
-- Creates the immutable store for AI agent end-of-day checkpoint submissions.
-- Applied to: orthodoxmetrics_db

CREATE TABLE IF NOT EXISTS agent_checkpoint_reports (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_date DATE NOT NULL,
  agent_name VARCHAR(120) NOT NULL,
  host VARCHAR(120) NOT NULL,
  host_role VARCHAR(255) DEFAULT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  raw_json LONGTEXT NOT NULL,
  rendered_markdown LONGTEXT NOT NULL,
  drift_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  failed_service_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  has_dirty_repos TINYINT(1) NOT NULL DEFAULT 0,
  next_suggestions JSON DEFAULT NULL,
  PRIMARY KEY (id),
  INDEX idx_date (report_date),
  INDEX idx_agent (agent_name),
  INDEX idx_date_agent (report_date, agent_name),
  INDEX idx_host (host)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable store of AI agent end-of-day checkpoint reports';
