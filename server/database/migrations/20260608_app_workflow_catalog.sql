-- ============================================================================
-- App Workflow Catalog v1 — parish/business process definitions (OM-owned)
-- 2026-06-08 | Replaces legacy prompt_workflows / platform_workflows for catalog
-- DB: orthodoxmetrics_db
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_workflow_system_levels (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  level_key               VARCHAR(64)  NOT NULL,
  level_name              VARCHAR(128) NOT NULL,
  system_level            ENUM('GLOBAL','APP_FAMILY','APP_SERVER','APP_DATABASE',
                               'WORKFLOW_GROUP','WORKFLOW','WORKFLOW_STEP','COMPONENT')
                          NOT NULL DEFAULT 'WORKFLOW_GROUP',
  workflow_group_sequence INT NOT NULL DEFAULT 0,
  parent_level_key        VARCHAR(64) NULL,
  description             TEXT NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_level_key (level_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_workflow_pipelines (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pipeline_key            VARCHAR(96) NOT NULL,
  pipeline_name           VARCHAR(128) NOT NULL,
  primary_app             ENUM('om','omai','omstudio','workshop') NOT NULL DEFAULT 'om',
  owner_database          VARCHAR(64) NOT NULL DEFAULT 'orthodoxmetrics_db',
  active_version          VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  runtime_state_source    VARCHAR(128) NOT NULL,
  step_definitions        JSON NOT NULL,
  lifecycle_status        ENUM('draft','active','deprecated') NOT NULL DEFAULT 'active',
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pipeline_key (pipeline_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_workflows (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_key            VARCHAR(96)  NOT NULL,
  workflow_name           VARCHAR(128) NOT NULL,
  description             TEXT NULL,
  primary_app             ENUM('om','omai','omstudio','workshop') NOT NULL DEFAULT 'om',
  owner_database          VARCHAR(64)  NOT NULL DEFAULT 'orthodoxmetrics_db',
  entry_type              ENUM('workflow','pipeline','hybrid','surface') NOT NULL DEFAULT 'workflow',
  system_level_key        VARCHAR(64)  NOT NULL,
  workflow_sequence       INT NOT NULL DEFAULT 0,
  active_version_id       BIGINT UNSIGNED NULL,
  lifecycle_status        ENUM('draft','staged','active','deprecated') NOT NULL DEFAULT 'draft',
  completion_state        ENUM('identified','mapped','in_progress','near_complete','production','blocked')
                          NOT NULL DEFAULT 'identified',
  feature_registry_ids    JSON NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_workflow_key (workflow_key),
  KEY idx_system_level (system_level_key),
  KEY idx_completion (completion_state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_workflow_versions (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id             BIGINT UNSIGNED NOT NULL,
  version                 VARCHAR(32)  NOT NULL,
  version_status          ENUM('draft','staged','active','deprecated','rolled_back') NOT NULL DEFAULT 'draft',
  change_summary          TEXT NULL,
  route_entrypoints       JSON NOT NULL,
  required_permissions    JSON NULL,
  runtime_state_source    VARCHAR(128) NULL,
  published_at            TIMESTAMP NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_workflow_version (workflow_id, version),
  CONSTRAINT fk_awv_workflow FOREIGN KEY (workflow_id) REFERENCES app_workflows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_workflow_steps (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_version_id     BIGINT UNSIGNED NOT NULL,
  step_key                VARCHAR(96)  NOT NULL,
  step_name               VARCHAR(128) NOT NULL,
  step_sequence           INT NOT NULL,
  step_kind               ENUM('human','system','approval','pipeline_trigger','audit','notify') NOT NULL,
  description             TEXT NULL,
  pipeline_key            VARCHAR(96) NULL,
  pipeline_primary_app    ENUM('om','omai','omstudio','workshop') NULL,
  runtime_status_field    VARCHAR(128) NULL,
  runtime_status_values   JSON NULL,
  is_required             TINYINT(1) NOT NULL DEFAULT 1,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_version_step (workflow_version_id, step_key),
  UNIQUE KEY uq_version_seq (workflow_version_id, step_sequence),
  CONSTRAINT fk_aws_version FOREIGN KEY (workflow_version_id) REFERENCES app_workflow_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_workflow_step_components (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_step_id        BIGINT UNSIGNED NOT NULL,
  component_key           VARCHAR(128) NOT NULL,
  component_type          ENUM('ui','api','job','data','policy','audit') NOT NULL,
  component_sequence      INT NOT NULL DEFAULT 10,
  required                TINYINT(1) NOT NULL DEFAULT 1,
  source_app              ENUM('om','omai','omstudio','workshop') NOT NULL DEFAULT 'om',
  source_path             VARCHAR(512) NULL,
  api_method              VARCHAR(8) NULL,
  api_path                VARCHAR(256) NULL,
  job_handler             VARCHAR(128) NULL,
  data_table              VARCHAR(128) NULL,
  implementation_state    ENUM('exists','partial','planned','missing') NOT NULL DEFAULT 'planned',
  notes                   TEXT NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_step_component (workflow_step_id, component_key),
  CONSTRAINT fk_awsc_step FOREIGN KEY (workflow_step_id) REFERENCES app_workflow_steps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE app_workflows
  ADD CONSTRAINT fk_aw_active_version
  FOREIGN KEY (active_version_id) REFERENCES app_workflow_versions(id) ON DELETE SET NULL;

-- ─── System levels ───────────────────────────────────────────────────────────

INSERT INTO app_workflow_system_levels (level_key, level_name, system_level, workflow_group_sequence, description) VALUES
('enrollment', 'Enrollment & Onboarding', 'WORKFLOW_GROUP', 10, 'Parish enrollment through first-login setup'),
('ocr',        'OCR & Digitization',      'WORKFLOW_GROUP', 20, 'Sacramental ledger upload, processing, review, seed')
ON DUPLICATE KEY UPDATE level_name = VALUES(level_name);

-- ─── Pipelines ───────────────────────────────────────────────────────────────

INSERT INTO app_workflow_pipelines (pipeline_key, pipeline_name, primary_app, runtime_state_source, step_definitions) VALUES
('provisioning.church_create', 'Church Provisioning Pipeline', 'om', 'onboarding_requests.provisioning_status',
 JSON_ARRAY(
   JSON_OBJECT('key','queued','sequence',10),
   JSON_OBJECT('key','in_progress','sequence',20),
   JSON_OBJECT('key','church_created','sequence',30),
   JSON_OBJECT('key','admin_created','sequence',40),
   JSON_OBJECT('key','completed','sequence',50)
 )),
('ocr.feeder.process', 'OCR Feeder Worker Pipeline', 'om', 'ocr_jobs.status',
 JSON_ARRAY(
   JSON_OBJECT('key','preprocess','sequence',10),
   JSON_OBJECT('key','vision_ocr','sequence',20),
   JSON_OBJECT('key','table_extract','sequence',30),
   JSON_OBJECT('key','record_assembly','sequence',40),
   JSON_OBJECT('key','score_route','sequence',50)
 )),
('ocr.agent.extract', 'OCR Agent Extraction Pipeline', 'om', 'ocr_jobs.agent_status',
 JSON_ARRAY(
   JSON_OBJECT('key','assembler','sequence',10),
   JSON_OBJECT('key','vision_llm','sequence',20),
   JSON_OBJECT('key','heuristic_fallback','sequence',30)
 ))
ON DUPLICATE KEY UPDATE pipeline_name = VALUES(pipeline_name);

-- ─── Workflow: church.enrollment ─────────────────────────────────────────────

INSERT INTO app_workflows (
  workflow_key, workflow_name, description, primary_app, entry_type, system_level_key,
  workflow_sequence, lifecycle_status, completion_state, feature_registry_ids
) VALUES (
  'church.enrollment',
  'Parish Enrollment & Onboarding',
  'Public enrollment through staff review, payment, provisioning, first login, and record table setup.',
  'om', 'hybrid', 'enrollment', 10, 'active', 'near_complete',
  JSON_ARRAY('enrollment-onboarding','enrollment-onboarding-detail','onboarding-pipeline')
) ON DUPLICATE KEY UPDATE workflow_name = VALUES(workflow_name);

SET @wf_enroll_id = (SELECT id FROM app_workflows WHERE workflow_key = 'church.enrollment');

INSERT INTO app_workflow_versions (
  workflow_id, version, version_status, change_summary, route_entrypoints,
  runtime_state_source, published_at
) VALUES (
  @wf_enroll_id, '1.0.0', 'active',
  'Initial catalog definition mapped to onboardingService status machine.',
  JSON_ARRAY('/enroll','/admin/onboarding','/admin/onboarding/:onboarding_request_id','/onboarding/change-password','/onboarding/record-tables'),
  'onboarding_requests.status', NOW()
) ON DUPLICATE KEY UPDATE version_status = 'active';

SET @wf_enroll_ver_id = (
  SELECT id FROM app_workflow_versions WHERE workflow_id = @wf_enroll_id AND version = '1.0.0'
);

UPDATE app_workflows SET active_version_id = @wf_enroll_ver_id WHERE id = @wf_enroll_id;

INSERT INTO app_workflow_steps (
  workflow_version_id, step_key, step_name, step_sequence, step_kind,
  runtime_status_field, runtime_status_values, pipeline_key, description
) VALUES
(@wf_enroll_ver_id, 'submit_enrollment', 'Submit Enrollment', 10, 'human', 'status', JSON_ARRAY('submitted'), NULL, 'Public wizard / CRM inquiry'),
(@wf_enroll_ver_id, 'staff_review', 'Staff Review', 20, 'approval', 'status', JSON_ARRAY('reviewing'), NULL, 'Admin reviews enrollment request'),
(@wf_enroll_ver_id, 'payment', 'Payment', 30, 'human', 'status', JSON_ARRAY('payment_pending','payment_received'), NULL, 'Optional payment branch'),
(@wf_enroll_ver_id, 'provision_tenant', 'Provision Tenant', 40, 'pipeline_trigger', 'provisioning_status', JSON_ARRAY('queued','in_progress','church_created','admin_created','completed'), 'provisioning.church_create', 'Creates church DB and admin user'),
(@wf_enroll_ver_id, 'create_admin_account', 'Create Admin Account', 50, 'system', 'status', JSON_ARRAY('admin_account_created'), NULL, NULL),
(@wf_enroll_ver_id, 'await_first_login', 'Await First Login', 60, 'human', 'status', JSON_ARRAY('awaiting_first_login'), NULL, 'Password change on first login'),
(@wf_enroll_ver_id, 'configure_record_tables', 'Configure Record Tables', 70, 'human', 'status', JSON_ARRAY('record_tables_review'), NULL, 'First-login record table column setup'),
(@wf_enroll_ver_id, 'activate_parish', 'Activate Parish', 80, 'system', 'status', JSON_ARRAY('active'), NULL, 'Parish marked active'),
(@wf_enroll_ver_id, 'audit_complete', 'Audit Complete', 90, 'audit', NULL, NULL, NULL, 'onboarding_events audit trail')
ON DUPLICATE KEY UPDATE step_name = VALUES(step_name);

-- ─── Workflow: ocr.batch.review ──────────────────────────────────────────────

INSERT INTO app_workflows (
  workflow_key, workflow_name, description, primary_app, entry_type, system_level_key,
  workflow_sequence, lifecycle_status, completion_state, feature_registry_ids
) VALUES (
  'ocr.batch.review',
  'OCR Batch Upload → Confirm & Seed',
  'Upload scanned ledger pages, run feeder/agent pipelines, human review, and seed parish records.',
  'om', 'hybrid', 'ocr', 10, 'active', 'near_complete',
  JSON_ARRAY('ocr-studio','upload-records','ocr-workbench')
) ON DUPLICATE KEY UPDATE workflow_name = VALUES(workflow_name);

SET @wf_ocr_id = (SELECT id FROM app_workflows WHERE workflow_key = 'ocr.batch.review');

INSERT INTO app_workflow_versions (
  workflow_id, version, version_status, change_summary, route_entrypoints,
  runtime_state_source, published_at
) VALUES (
  @wf_ocr_id, '1.0.0', 'active',
  'Initial catalog definition mapped to ocr_jobs and OcrReviewPage.',
  JSON_ARRAY('/portal/ocr','/devel/ocr-studio/upload','/portal/ocr/review/:churchId/:jobId','/devel/ocr-studio/review/:churchId/:jobId'),
  'ocr_jobs.status', NOW()
) ON DUPLICATE KEY UPDATE version_status = 'active';

SET @wf_ocr_ver_id = (
  SELECT id FROM app_workflow_versions WHERE workflow_id = @wf_ocr_id AND version = '1.0.0'
);

UPDATE app_workflows SET active_version_id = @wf_ocr_ver_id WHERE id = @wf_ocr_id;

INSERT INTO app_workflow_steps (
  workflow_version_id, step_key, step_name, step_sequence, step_kind,
  runtime_status_field, runtime_status_values, pipeline_key, description
) VALUES
(@wf_ocr_ver_id, 'upload_batch', 'Upload Batch', 10, 'human', 'review_status', JSON_ARRAY('uploaded'), NULL, 'Staff uploads images'),
(@wf_ocr_ver_id, 'queue_processing', 'Queue Processing', 20, 'pipeline_trigger', 'status', JSON_ARRAY('pending','processing','completed'), 'ocr.feeder.process', 'Feeder worker pipeline'),
(@wf_ocr_ver_id, 'agent_extract', 'Agent Extract', 30, 'pipeline_trigger', 'agent_status', JSON_ARRAY('pending','running','complete','failed'), 'ocr.agent.extract', 'LLM/heuristic field extraction'),
(@wf_ocr_ver_id, 'human_review', 'Human Review', 40, 'human', 'review_status', JSON_ARRAY('in_review','reviewed'), NULL, 'OcrReviewPage confirm fields'),
(@wf_ocr_ver_id, 'confirm_seed', 'Confirm & Seed', 50, 'approval', 'ready_to_seed', JSON_ARRAY('1'), NULL, 'Human approves seeding'),
(@wf_ocr_ver_id, 'write_records', 'Write Records', 60, 'system', 'seeded_at', NULL, NULL, 'Tenant baptism/marriage/funeral tables'),
(@wf_ocr_ver_id, 'audit_complete', 'Audit Complete', 70, 'audit', NULL, NULL, NULL, 'ocr_correction_log and audit events')
ON DUPLICATE KEY UPDATE step_name = VALUES(step_name);

-- ─── v1.1: governance tables (OMStudio refs + Workshop submit loop) ─────────

CREATE TABLE IF NOT EXISTS omstudio_workflow_refs (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  app_key                 ENUM('om','omai') NOT NULL DEFAULT 'om',
  workflow_key            VARCHAR(96) NOT NULL,
  workflow_name           VARCHAR(128) NOT NULL,
  active_version          VARCHAR(32) NULL,
  completion_state        VARCHAR(32) NULL,
  entry_type              VARCHAR(32) NULL,
  last_synced_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_app_workflow (app_key, workflow_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workshop_deployment_requests (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id              VARCHAR(36) NOT NULL,
  component_key           VARCHAR(128) NOT NULL,
  semantic_version        VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  workshop_build_number   INT UNSIGNED NOT NULL DEFAULT 1,
  full_version            VARCHAR(48) NOT NULL,
  target_app              ENUM('om','omai','omstudio','workshop') NOT NULL DEFAULT 'om',
  target_workflow_key     VARCHAR(96) NULL,
  change_summary          TEXT NULL,
  status                  ENUM('submitted','approved','rejected','deployed','failed') NOT NULL DEFAULT 'submitted',
  submitted_by_user_id    INT NULL,
  submitted_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by_user_id      INT NULL,
  decided_at              TIMESTAMP NULL,
  UNIQUE KEY uq_request_id (request_id),
  KEY idx_wdr_status (status),
  KEY idx_wdr_workflow (target_workflow_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS omstudio_deployment_audit_log (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type              VARCHAR(64) NOT NULL,
  request_id              VARCHAR(36) NULL,
  actor_user_id           INT NULL,
  actor_email             VARCHAR(255) NULL,
  payload                 JSON NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_request (request_id),
  KEY idx_audit_event (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── v1.1: additional system levels ────────────────────────────────────────

INSERT INTO app_workflow_system_levels (level_key, level_name, system_level, workflow_group_sequence, description) VALUES
('records',  'Records & Sacraments',  'WORKFLOW_GROUP', 30, 'Sacramental records, certificates, manual entry'),
('identity', 'Identity & Access',     'WORKFLOW_GROUP', 40, 'User and role administration'),
('church_ops','Church Administration','WORKFLOW_GROUP', 15, 'Manual church setup and configuration')
ON DUPLICATE KEY UPDATE level_name = VALUES(level_name);

-- ─── v1.1: fix OCR review_status vocabulary + production state ───────────────

UPDATE app_workflow_steps SET
  runtime_status_values = JSON_ARRAY('uploaded','ocr_complete','agent_extracted','human_confirmed','ready_to_seed','seeded'),
  description = 'OcrReviewPage — review_status enum from ocr/jobs.ts'
WHERE step_key = 'human_review'
  AND workflow_version_id = (SELECT active_version_id FROM app_workflows WHERE workflow_key = 'ocr.batch.review');

UPDATE app_workflow_steps SET
  runtime_status_field = 'review_status',
  runtime_status_values = JSON_ARRAY('ready_to_seed'),
  description = 'Staff confirms fields ready for seed'
WHERE step_key = 'confirm_seed'
  AND workflow_version_id = (SELECT active_version_id FROM app_workflows WHERE workflow_key = 'ocr.batch.review');

UPDATE app_workflow_steps SET
  runtime_status_field = 'review_status',
  runtime_status_values = JSON_ARRAY('seeded'),
  description = 'Tenant record tables populated'
WHERE step_key = 'write_records'
  AND workflow_version_id = (SELECT active_version_id FROM app_workflows WHERE workflow_key = 'ocr.batch.review');

UPDATE app_workflows SET completion_state = 'production', lifecycle_status = 'active'
WHERE workflow_key IN ('church.enrollment', 'ocr.batch.review');

-- ─── v1.1: workflow records.certificate.generate ─────────────────────────────

INSERT INTO app_workflows (
  workflow_key, workflow_name, description, primary_app, entry_type, system_level_key,
  workflow_sequence, lifecycle_status, completion_state, feature_registry_ids
) VALUES (
  'records.certificate.generate',
  'Sacramental Certificate Generation',
  'Select record, choose template, preview and print parish certificates.',
  'om', 'hybrid', 'records', 10, 'active', 'near_complete',
  JSON_ARRAY('certificates','certificate-templates')
) ON DUPLICATE KEY UPDATE workflow_name = VALUES(workflow_name);

SET @wf_cert_id = (SELECT id FROM app_workflows WHERE workflow_key = 'records.certificate.generate');

INSERT INTO app_workflow_versions (
  workflow_id, version, version_status, change_summary, route_entrypoints, runtime_state_source, published_at
) VALUES (
  @wf_cert_id, '1.0.0', 'active', 'Certificate generator + template library.',
  JSON_ARRAY('/apps/certificates/generate','/admin/control-panel/certificate-templates'),
  NULL, NOW()
) ON DUPLICATE KEY UPDATE version_status = 'active';

SET @wf_cert_ver_id = (SELECT id FROM app_workflow_versions WHERE workflow_id = @wf_cert_id AND version = '1.0.0');
UPDATE app_workflows SET active_version_id = @wf_cert_ver_id WHERE id = @wf_cert_id;

INSERT INTO app_workflow_steps (workflow_version_id, step_key, step_name, step_sequence, step_kind, description) VALUES
(@wf_cert_ver_id, 'select_record', 'Select Record', 10, 'human', 'Pick baptism/marriage/chrismation record'),
(@wf_cert_ver_id, 'choose_template', 'Choose Template', 20, 'human', 'Jurisdiction template from library'),
(@wf_cert_ver_id, 'preview_certificate', 'Preview', 30, 'human', 'PDF/HTML preview'),
(@wf_cert_ver_id, 'print_or_download', 'Print / Download', 40, 'system', 'Certificate output'),
(@wf_cert_ver_id, 'audit_complete', 'Audit Complete', 50, 'audit', 'Certificate generation logged')
ON DUPLICATE KEY UPDATE step_name = VALUES(step_name);

-- ─── v1.1: workflow identity.user.admin ────────────────────────────────────

INSERT INTO app_workflows (
  workflow_key, workflow_name, description, primary_app, entry_type, system_level_key,
  workflow_sequence, lifecycle_status, completion_state, feature_registry_ids
) VALUES (
  'identity.user.admin',
  'User & Role Administration',
  'Create and manage parish users, roles, and access within OM.',
  'om', 'workflow', 'identity', 10, 'active', 'mapped',
  JSON_ARRAY('user-management')
) ON DUPLICATE KEY UPDATE workflow_name = VALUES(workflow_name);

SET @wf_user_id = (SELECT id FROM app_workflows WHERE workflow_key = 'identity.user.admin');

INSERT INTO app_workflow_versions (
  workflow_id, version, version_status, change_summary, route_entrypoints, published_at
) VALUES (
  @wf_user_id, '1.0.0', 'active', 'Admin user CRUD and role assignment.',
  JSON_ARRAY('/admin/users','/admin/control-panel/users'),
  NOW()
) ON DUPLICATE KEY UPDATE version_status = 'active';

SET @wf_user_ver_id = (SELECT id FROM app_workflow_versions WHERE workflow_id = @wf_user_id AND version = '1.0.0');
UPDATE app_workflows SET active_version_id = @wf_user_ver_id WHERE id = @wf_user_id;

INSERT INTO app_workflow_steps (workflow_version_id, step_key, step_name, step_sequence, step_kind, description) VALUES
(@wf_user_ver_id, 'list_users', 'List Users', 10, 'human', 'Parish user directory'),
(@wf_user_ver_id, 'create_or_edit', 'Create / Edit User', 20, 'human', 'User form'),
(@wf_user_ver_id, 'assign_roles', 'Assign Roles', 30, 'approval', 'Role + church scope'),
(@wf_user_ver_id, 'notify_user', 'Notify User', 40, 'notify', 'Welcome / reset email'),
(@wf_user_ver_id, 'audit_complete', 'Audit Complete', 50, 'audit', 'user_activity_logs')
ON DUPLICATE KEY UPDATE step_name = VALUES(step_name);

-- ─── v1.1: workflow ocr.setup.wizard ───────────────────────────────────────

INSERT INTO app_workflows (
  workflow_key, workflow_name, description, primary_app, entry_type, system_level_key,
  workflow_sequence, lifecycle_status, completion_state, feature_registry_ids
) VALUES (
  'ocr.setup.wizard',
  'OCR Church Setup Wizard',
  'First-time per-church OCR configuration: record types, layout, feeder settings.',
  'om', 'workflow', 'ocr', 20, 'active', 'near_complete',
  JSON_ARRAY('ocr-setup-wizard')
) ON DUPLICATE KEY UPDATE workflow_name = VALUES(workflow_name);

SET @wf_setup_id = (SELECT id FROM app_workflows WHERE workflow_key = 'ocr.setup.wizard');

INSERT INTO app_workflow_versions (
  workflow_id, version, version_status, change_summary, route_entrypoints, published_at
) VALUES (
  @wf_setup_id, '1.0.0', 'active', 'OcrSetupWizardPage devel route.',
  JSON_ARRAY('/devel/ocr-setup-wizard','/portal/ocr/settings'),
  NOW()
) ON DUPLICATE KEY UPDATE version_status = 'active';

SET @wf_setup_ver_id = (SELECT id FROM app_workflow_versions WHERE workflow_id = @wf_setup_id AND version = '1.0.0');
UPDATE app_workflows SET active_version_id = @wf_setup_ver_id WHERE id = @wf_setup_id;

INSERT INTO app_workflow_steps (workflow_version_id, step_key, step_name, step_sequence, step_kind, description) VALUES
(@wf_setup_ver_id, 'select_church', 'Select Church', 10, 'human', 'Church context'),
(@wf_setup_ver_id, 'record_types', 'Record Types', 20, 'human', 'Baptism/marriage/funeral enablement'),
(@wf_setup_ver_id, 'layout_template', 'Layout Template', 30, 'human', 'Register layout binding'),
(@wf_setup_ver_id, 'feeder_settings', 'Feeder Settings', 40, 'system', 'Per-church OCR settings saved'),
(@wf_setup_ver_id, 'audit_complete', 'Audit Complete', 50, 'audit', 'Setup completion flag')
ON DUPLICATE KEY UPDATE step_name = VALUES(step_name);

-- ─── v1.1: step components (enrollment + OCR core steps) ─────────────────────

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, api_method, api_path, implementation_state)
SELECT s.id, 'enroll.wizard', 'ui', 10, 'om', 'front-end/src/features/pages/frontend-pages/Enrollment.tsx', NULL, NULL, 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'church.enrollment' AND s.step_key = 'submit_enrollment'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, api_method, api_path, implementation_state)
SELECT s.id, 'enroll.api.submit', 'api', 20, 'om', 'server/src/routes/enroll.js', 'POST', '/api/enroll', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'church.enrollment' AND s.step_key = 'submit_enrollment'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, api_method, api_path, data_table, implementation_state)
SELECT s.id, 'onboarding.admin.list', 'ui', 10, 'om', 'front-end/src/features/admin/control-panel/OnboardingEnrollmentPage.tsx', NULL, NULL, NULL, 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'church.enrollment' AND s.step_key = 'staff_review'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, api_method, api_path, data_table, implementation_state)
SELECT s.id, 'onboarding.api', 'api', 20, 'om', 'server/src/routes/admin/onboarding.js', 'PATCH', '/api/admin/onboarding/:id/status', 'onboarding_requests', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'church.enrollment' AND s.step_key = 'staff_review'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, job_handler, data_table, implementation_state)
SELECT s.id, 'tenant.provision', 'job', 10, 'om', 'server/src/services/tenantProvisioning.js', 'provisionTenantDb', 'churches', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'church.enrollment' AND s.step_key = 'provision_tenant'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, api_method, api_path, implementation_state)
SELECT s.id, 'onboarding.first_login', 'ui', 10, 'om', 'front-end/src/features/account/OnboardingSetupPage.tsx', 'GET', '/api/onboarding/me', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'church.enrollment' AND s.step_key = 'await_first_login'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, api_method, api_path, data_table, implementation_state)
SELECT s.id, 'onboarding.record_tables', 'ui', 10, 'om', 'front-end/src/features/account/OnboardingSetupPage.tsx', 'PUT', '/api/onboarding/record-tables', 'church_record_table_configurations', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'church.enrollment' AND s.step_key = 'configure_record_tables'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, data_table, implementation_state)
SELECT s.id, 'onboarding.events', 'audit', 10, 'om', 'server/src/services/onboardingService.js', 'onboarding_events', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'church.enrollment' AND s.step_key = 'audit_complete'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, implementation_state)
SELECT s.id, 'ocr.upload.page', 'ui', 10, 'om', 'front-end/src/features/records-centralized/apps/upload-records/UploadRecordsPage.tsx', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'ocr.batch.review' AND s.step_key = 'upload_batch'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, job_handler, data_table, implementation_state)
SELECT s.id, 'ocr.feeder.worker', 'job', 10, 'om', 'server/src/workers/ocrFeederWorker.ts', 'ocrFeederWorkerMain', 'ocr_jobs', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'ocr.batch.review' AND s.step_key = 'queue_processing'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, api_method, api_path, implementation_state)
SELECT s.id, 'ocr.review.page', 'ui', 10, 'om', 'front-end/src/features/devel-tools/om-ocr/pages/OcrReviewPage.tsx', NULL, NULL, 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'ocr.batch.review' AND s.step_key = 'human_review'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, api_method, api_path, data_table, implementation_state)
SELECT s.id, 'ocr.review.seed', 'api', 20, 'om', 'server/src/routes/ocr/review.ts', 'POST', '/api/church/:churchId/ocr/jobs/:jobId/seed', 'ocr_jobs', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'ocr.batch.review' AND s.step_key = 'confirm_seed'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

-- Sync OMStudio workflow refs from catalog
INSERT INTO omstudio_workflow_refs (app_key, workflow_key, workflow_name, active_version, completion_state, entry_type)
SELECT w.primary_app, w.workflow_key, w.workflow_name, v.version, w.completion_state, w.entry_type
FROM app_workflows w
LEFT JOIN app_workflow_versions v ON v.id = w.active_version_id
ON DUPLICATE KEY UPDATE
  workflow_name = VALUES(workflow_name),
  active_version = VALUES(active_version),
  completion_state = VALUES(completion_state),
  entry_type = VALUES(entry_type),
  last_synced_at = CURRENT_TIMESTAMP;

SELECT 'app_workflow_catalog v1.1 seeded' AS message;
