-- ============================================================================
-- Workflow Catalog Phase B — Execution Model (schema v2)
-- 2026-06-15 | church_workflow_executions + events + summary + outbox
-- Prerequisite: 20260613_workflow_hierarchy_phase_a.sql
-- Review: docs/workflow-catalog-phase-b-execution-review.md
-- Rollback: RENAME TABLE church_workflow_executions TO _rollback_cwe_20260615; (child tables)
-- Note: workflow_execution_events partitioning deferred to B-PR10 (MariaDB UNIQUE+partition rules)
-- ============================================================================

-- ─── 1. Subject type registry ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_execution_subject_types (
  subject_type            VARCHAR(32)  NOT NULL PRIMARY KEY,
  description             VARCHAR(256) NULL,
  id_pattern              VARCHAR(128) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO workflow_execution_subject_types (subject_type, description, id_pattern) VALUES
  ('church',            'Church-scoped singleton workflow',           'church:{church_id}'),
  ('onboarding_request','Enrollment onboarding instance',            'ONB_{ULID}'),
  ('ocr_job',           'OCR batch review job instance',             'job:{job_id}'),
  ('crm_lead',          'CRM lead nurture instance (future)',        'lead:{lead_id}'),
  ('email_submission',  'Email intake review instance (future)',     'email:{id}'),
  ('audit_run',         'Data audit run instance (future)',          'audit:{id}'),
  ('import_batch',      'Bulk import batch (future)',                'import:{id}'),
  ('deployment_request','Governance promotion request (future)',     'deploy:{id}')
ON DUPLICATE KEY UPDATE description = VALUES(description), id_pattern = VALUES(id_pattern);

-- ─── 2. Per-church workflow executions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS church_workflow_executions (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  execution_id            VARCHAR(32)  NOT NULL COMMENT 'WEX_<ULID> public ref',
  church_id               INT          NOT NULL,
  workflow_key            VARCHAR(96)  NOT NULL,
  workflow_version        VARCHAR(32)  NOT NULL DEFAULT '1.0.0',
  workflow_version_id     BIGINT UNSIGNED NULL,
  definition_hash         CHAR(64)     NULL COMMENT 'SHA256 of step_key list at create',
  app_family_key          VARCHAR(64)  NULL,
  subject_type            VARCHAR(32)  NOT NULL DEFAULT 'church',
  subject_id              VARCHAR(64)  NOT NULL COMMENT 'Never NULL — church:{id}, job:{id}, ONB_*',
  status                  ENUM('pending','active','blocked','completed','failed','archived')
                          NOT NULL DEFAULT 'pending',
  current_step_key        VARCHAR(96)  NULL,
  current_step_sequence   INT          NULL,
  blocked_reason          VARCHAR(256) NULL,
  blocked_at              TIMESTAMP    NULL,
  source_table            VARCHAR(128) NULL,
  source_row_id           VARCHAR(64)  NULL,
  source_updated_at       TIMESTAMP    NULL,
  context_snapshot        JSON         NULL,
  last_reconciled_at      TIMESTAMP    NULL,
  reconcile_hash          CHAR(64)     NULL,
  lock_version            INT UNSIGNED NOT NULL DEFAULT 0,
  superseded_by_execution_id VARCHAR(32) NULL,
  started_at              TIMESTAMP    NULL,
  completed_at            TIMESTAMP    NULL,
  failed_at               TIMESTAMP    NULL,
  archived_at             TIMESTAMP    NULL,
  started_by_user_id      INT          NULL,
  completed_by_user_id    INT          NULL,
  created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_execution_id (execution_id),
  UNIQUE KEY uq_church_workflow_subject (church_id, workflow_key, subject_type, subject_id),
  KEY idx_cwe_church_goals (church_id, status, workflow_key, current_step_key),
  KEY idx_cwe_workflow_stuck (workflow_key, status, updated_at),
  KEY idx_cwe_workflow_status (workflow_key, status),
  KEY idx_cwe_workflow_step (workflow_key, current_step_key, status),
  KEY idx_cwe_subject (subject_type, subject_id),
  KEY idx_cwe_reconcile_stale (status, last_reconciled_at),
  KEY idx_cwe_family (app_family_key, status),
  KEY idx_cwe_source (source_table, source_row_id),
  CONSTRAINT fk_cwe_subject_type FOREIGN KEY (subject_type)
    REFERENCES workflow_execution_subject_types(subject_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 3. Step-level execution progress ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS church_workflow_step_executions (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  execution_id            VARCHAR(32)  NOT NULL,
  step_key                VARCHAR(96)  NOT NULL,
  step_sequence           INT          NOT NULL,
  step_status             ENUM('pending','active','completed','skipped','failed','blocked')
                          NOT NULL DEFAULT 'pending',
  last_transition_source  ENUM('automatic','user','admin','reconciliation','pipeline','system')
                          NULL,
  entered_at              TIMESTAMP    NULL,
  completed_at            TIMESTAMP    NULL,
  completed_by_user_id    INT          NULL,
  metadata                JSON         NULL,
  created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exec_step (execution_id, step_key),
  KEY idx_cwse_exec_status (execution_id, step_status),
  CONSTRAINT fk_cwse_execution FOREIGN KEY (execution_id)
    REFERENCES church_workflow_executions(execution_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 4. Append-only execution events ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_execution_events (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id                VARCHAR(32)  NOT NULL COMMENT 'WEE_<ULID>',
  execution_id            VARCHAR(32)  NOT NULL,
  church_id               INT          NOT NULL,
  workflow_key            VARCHAR(96)  NOT NULL,
  app_family_key          VARCHAR(64)  NULL,
  event_type              VARCHAR(48)  NOT NULL,
  from_status             VARCHAR(32)  NULL,
  to_status               VARCHAR(32)  NULL,
  from_step_key           VARCHAR(96)  NULL,
  to_step_key             VARCHAR(96)  NULL,
  actor_type              ENUM('system','user','admin','reconciler','pipeline') NOT NULL DEFAULT 'system',
  actor_user_id           INT          NULL,
  correlation_id          VARCHAR(64)  NULL,
  dedupe_key              CHAR(64)     NOT NULL,
  payload                 JSON         NULL,
  created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_id (event_id),
  UNIQUE KEY uq_dedupe (dedupe_key),
  KEY idx_wee_execution (execution_id, created_at),
  KEY idx_wee_church_time (church_id, created_at),
  KEY idx_wee_workflow_funnel (workflow_key, to_step_key, created_at),
  KEY idx_wee_workflow_type (workflow_key, event_type, created_at),
  KEY idx_wee_correlation (correlation_id),
  CONSTRAINT fk_wee_execution FOREIGN KEY (execution_id)
    REFERENCES church_workflow_executions(execution_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 5. Cross-tenant execution summary (materialized) ───────────────────────

CREATE TABLE IF NOT EXISTS workflow_execution_summary (
  workflow_key            VARCHAR(96)  NOT NULL PRIMARY KEY,
  app_family_key          VARCHAR(64)  NULL,
  snapshot_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executions_total        INT          NOT NULL DEFAULT 0,
  executions_pending      INT          NOT NULL DEFAULT 0,
  executions_active       INT          NOT NULL DEFAULT 0,
  executions_blocked      INT          NOT NULL DEFAULT 0,
  executions_completed    INT          NOT NULL DEFAULT 0,
  executions_failed       INT          NOT NULL DEFAULT 0,
  executions_archived     INT          NOT NULL DEFAULT 0,
  step_distribution       JSON         NULL,
  status_distribution     JSON         NULL,
  stale                   TINYINT(1)   NOT NULL DEFAULT 0,
  refresh_duration_ms     INT          NULL,
  updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_wes_family (app_family_key),
  KEY idx_wes_snapshot (snapshot_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 6. Normalized step summary for funnel SQL ──────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_execution_step_summary (
  workflow_key            VARCHAR(96)  NOT NULL,
  step_key                VARCHAR(96)  NOT NULL,
  status_bucket           ENUM('active','completed','blocked','failed') NOT NULL,
  execution_count         INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workflow_key, step_key, status_bucket)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 7. Write-through failure recovery ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_execution_outbox (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  execution_id            VARCHAR(32)  NULL,
  operation               VARCHAR(48)  NOT NULL,
  payload                 JSON         NOT NULL,
  attempts                INT          NOT NULL DEFAULT 0,
  next_retry_at           TIMESTAMP    NULL,
  last_error              VARCHAR(512) NULL,
  created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_outbox_retry (next_retry_at, attempts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 8. Reconcile job bookkeeping ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_execution_reconcile_runs (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id                  VARCHAR(32)  NOT NULL,
  run_type                ENUM('nightly','manual','backfill','workflow_scoped') NOT NULL,
  workflow_key            VARCHAR(96)  NULL,
  churches_scanned        INT          NOT NULL DEFAULT 0,
  executions_updated      INT          NOT NULL DEFAULT 0,
  executions_created      INT          NOT NULL DEFAULT 0,
  drift_corrected         INT          NOT NULL DEFAULT 0,
  errors                  INT          NOT NULL DEFAULT 0,
  cursor_payload          JSON         NULL,
  started_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at            TIMESTAMP    NULL,
  error_log               JSON         NULL,
  UNIQUE KEY uq_run_id (run_id),
  KEY idx_werr_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 9. Seed summary rows for filed workflows ───────────────────────────────

INSERT INTO workflow_execution_summary (workflow_key, app_family_key)
SELECT w.workflow_key, w.app_family_key
FROM app_workflows w
WHERE w.lifecycle_status = 'active'
ON DUPLICATE KEY UPDATE app_family_key = VALUES(app_family_key);
