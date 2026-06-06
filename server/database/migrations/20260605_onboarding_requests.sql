-- ============================================================================
-- Enrollment Onboarding Requests — ONB_<ULID> lifecycle
-- 2026-06-05 | Source of truth for post-enrollment onboarding workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_requests (
  id                          INT AUTO_INCREMENT PRIMARY KEY,
  onboarding_request_id       VARCHAR(32)   NOT NULL UNIQUE COMMENT 'Public ref ONB_<ULID>',
  crm_record_id               INT           NULL COMMENT 'omai_crm_leads.id',
  church_id                   INT           NULL,
  submitted_by_name           VARCHAR(200)  NOT NULL,
  submitted_by_email          VARCHAR(200)  NOT NULL,
  submitted_by_phone          VARCHAR(50)   NULL,
  parish_name                 VARCHAR(200)  NOT NULL,
  jurisdiction                VARCHAR(200)  NULL,
  city                        VARCHAR(120)  NULL,
  state                       VARCHAR(50)   NULL,
  country                     VARCHAR(80)   NOT NULL DEFAULT 'United States',
  postal_code                 VARCHAR(20)   NULL,
  timezone                    VARCHAR(80)   NULL,
  status                      ENUM(
    'submitted','reviewing','payment_pending','payment_received','provisioning',
    'admin_account_created','awaiting_first_login','record_tables_review','active',
    'rejected','cancelled'
  ) NOT NULL DEFAULT 'submitted',
  payment_status              ENUM(
    'not_required','pending','invoice_sent','paid','failed','refunded','waived'
  ) NOT NULL DEFAULT 'pending',
  provisioning_status         ENUM(
    'not_started','queued','in_progress','church_created','admin_created','completed','failed'
  ) NOT NULL DEFAULT 'not_started',
  temporary_admin_user_id     INT           NULL,
  admin_notes                 TEXT          NULL,
  submitted_payload_json      JSON          NOT NULL,
  selected_record_tables_json JSON          NOT NULL,
  first_login_completed       TINYINT(1)    NOT NULL DEFAULT 0,
  table_configuration_completed TINYINT(1)  NOT NULL DEFAULT 0,
  created_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_provisioning_status (provisioning_status),
  INDEX idx_crm_record (crm_record_id),
  INDEX idx_church (church_id),
  INDEX idx_submitted_email (submitted_by_email),
  INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS onboarding_events (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  onboarding_request_id   VARCHAR(32)   NOT NULL COMMENT 'ONB_<ULID> — links to onboarding_requests.onboarding_request_id',
  event_type              VARCHAR(80)   NOT NULL,
  old_status              VARCHAR(50)   NULL,
  new_status              VARCHAR(50)   NULL,
  actor_user_id           INT           NULL,
  actor_role              VARCHAR(50)   NULL,
  notes                   TEXT          NULL,
  metadata_json           JSON          NULL,
  created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_onboarding_request (onboarding_request_id, created_at DESC),
  INDEX idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS church_record_table_configurations (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  church_id               INT           NOT NULL,
  onboarding_request_id   VARCHAR(32)   NOT NULL,
  record_type             ENUM('baptism','marriage','funeral','chrismation','custom','other') NOT NULL,
  table_key               VARCHAR(80)   NOT NULL,
  display_name            VARCHAR(150)  NOT NULL,
  columns_json            JSON          NOT NULL,
  enabled                 TINYINT(1)    NOT NULL DEFAULT 1,
  created_by              INT           NULL,
  created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_church_table (church_id, table_key),
  INDEX idx_onboarding (onboarding_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash,
  ADD COLUMN IF NOT EXISTS onboarding_request_id VARCHAR(32) NULL AFTER church_id;
