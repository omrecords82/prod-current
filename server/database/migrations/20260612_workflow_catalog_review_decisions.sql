-- ============================================================================
-- Workflow Catalog Review Decisions — 2026-06-12
-- DB: orthodoxmetrics_db
-- 1. church.ops.setup workflow (#6)
-- 2. Enrollment payment_pending / payment_received step split
-- 3. workflow_runtime_cache (OCR setup summary)
-- 4. workflow_deployment_history + workflow_deployment_queue (governance)
-- Rollback: see docs/workflow-catalog-review-implementation.md §3
-- ============================================================================

-- ─── Runtime cache (platform DB) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_runtime_cache (
  cache_key               VARCHAR(64) NOT NULL PRIMARY KEY,
  payload                 JSON NOT NULL,
  refreshed_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  refresh_error           VARCHAR(512) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Governance foundations ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_deployment_history (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  deployment_id           VARCHAR(36) NOT NULL,
  request_id              VARCHAR(36) NULL,
  workflow_key            VARCHAR(96) NULL,
  component_key           VARCHAR(128) NULL,
  target_app              ENUM('om','omai','omstudio','workshop') NOT NULL DEFAULT 'om',
  full_version            VARCHAR(48) NOT NULL DEFAULT '1.0.0_1',
  deployment_action       ENUM('deploy','rollback','validate','queue') NOT NULL DEFAULT 'deploy',
  status                  ENUM('queued','validating','approved','deployed','rolled_back','failed','rejected') NOT NULL DEFAULT 'queued',
  validation_result       JSON NULL,
  rollback_of_deployment_id VARCHAR(36) NULL,
  decided_by_user_id      INT NULL,
  notes                   TEXT NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at            TIMESTAMP NULL,
  UNIQUE KEY uq_deployment_id (deployment_id),
  KEY idx_wdh_workflow (workflow_key),
  KEY idx_wdh_request (request_id),
  KEY idx_wdh_status (status),
  KEY idx_wdh_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workflow_deployment_queue (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  queue_id                VARCHAR(36) NOT NULL,
  request_id              VARCHAR(36) NOT NULL,
  deployment_id           VARCHAR(36) NULL,
  priority                INT NOT NULL DEFAULT 100,
  status                  ENUM('queued','processing','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  validation_gates        JSON NULL,
  payload                 JSON NULL,
  scheduled_at            TIMESTAMP NULL,
  started_at              TIMESTAMP NULL,
  completed_at            TIMESTAMP NULL,
  error_message           TEXT NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_queue_id (queue_id),
  KEY idx_wdq_status (status),
  KEY idx_wdq_priority (priority),
  KEY idx_wdq_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Enrollment: split payment step ────────────────────────────────────────

SET @wf_enroll_ver_id = (
  SELECT v.id FROM app_workflow_versions v
  JOIN app_workflows w ON w.id = v.workflow_id
  WHERE w.workflow_key = 'church.enrollment' AND v.version = '1.0.0'
  LIMIT 1
);

-- Migrate components from legacy payment step before removal
SET @legacy_payment_step_id = (
  SELECT s.id FROM app_workflow_steps s
  WHERE s.workflow_version_id = @wf_enroll_ver_id AND s.step_key = 'payment'
  LIMIT 1
);

INSERT INTO app_workflow_steps (
  workflow_version_id, step_key, step_name, step_sequence, step_kind,
  runtime_status_field, runtime_status_values, description
) VALUES
(@wf_enroll_ver_id, 'payment_pending', 'Payment Pending', 30, 'human',
 'status', JSON_ARRAY('payment_pending'), 'Awaiting parish payment'),
(@wf_enroll_ver_id, 'payment_received', 'Payment Received', 35, 'human',
 'status', JSON_ARRAY('payment_received'), 'Payment confirmed — proceed to provisioning')
ON DUPLICATE KEY UPDATE
  step_name = VALUES(step_name),
  runtime_status_values = VALUES(runtime_status_values);

SET @payment_pending_id = (
  SELECT s.id FROM app_workflow_steps s
  WHERE s.workflow_version_id = @wf_enroll_ver_id AND s.step_key = 'payment_pending'
  LIMIT 1
);

SET @payment_received_id = (
  SELECT s.id FROM app_workflow_steps s
  WHERE s.workflow_version_id = @wf_enroll_ver_id AND s.step_key = 'payment_received'
  LIMIT 1
);

INSERT INTO app_workflow_step_components (
  workflow_step_id, component_key, component_type, component_sequence,
  source_app, source_path, api_method, api_path, implementation_state
)
SELECT @payment_pending_id, 'onboarding.payment.pending', 'api', 10, 'om',
  'server/src/routes/admin/onboarding.js', 'PATCH', '/api/admin/onboarding/:id/payment', 'exists'
WHERE @payment_pending_id IS NOT NULL
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components (
  workflow_step_id, component_key, component_type, component_sequence,
  source_app, source_path, api_method, api_path, implementation_state
)
SELECT @payment_received_id, 'onboarding.payment.received', 'api', 10, 'om',
  'server/src/routes/admin/onboarding.js', 'PATCH', '/api/admin/onboarding/:id/payment', 'exists'
WHERE @payment_received_id IS NOT NULL
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

-- Copy any other legacy payment components to payment_received
INSERT INTO app_workflow_step_components (
  workflow_step_id, component_key, component_type, component_sequence,
  source_app, source_path, api_method, api_path, data_table, implementation_state
)
SELECT @payment_received_id, c.component_key, c.component_type, c.component_sequence + 10,
  c.source_app, c.source_path, c.api_method, c.api_path, c.data_table, c.implementation_state
FROM app_workflow_step_components c
WHERE c.workflow_step_id = @legacy_payment_step_id
  AND c.component_key NOT IN ('onboarding.payment', 'onboarding.payment.pending', 'onboarding.payment.received')
  AND @payment_received_id IS NOT NULL
ON DUPLICATE KEY UPDATE implementation_state = VALUES(implementation_state);

DELETE FROM app_workflow_step_components WHERE workflow_step_id = @legacy_payment_step_id;
DELETE FROM app_workflow_steps
WHERE workflow_version_id = @wf_enroll_ver_id AND step_key = 'payment';

-- Bump downstream step sequences after split
UPDATE app_workflow_steps SET step_sequence = 40
WHERE workflow_version_id = @wf_enroll_ver_id AND step_key = 'provision_tenant';
UPDATE app_workflow_steps SET step_sequence = 50
WHERE workflow_version_id = @wf_enroll_ver_id AND step_key = 'create_admin_account';
UPDATE app_workflow_steps SET step_sequence = 60
WHERE workflow_version_id = @wf_enroll_ver_id AND step_key = 'await_first_login';
UPDATE app_workflow_steps SET step_sequence = 70
WHERE workflow_version_id = @wf_enroll_ver_id AND step_key = 'configure_record_tables';
UPDATE app_workflow_steps SET step_sequence = 80
WHERE workflow_version_id = @wf_enroll_ver_id AND step_key = 'activate_parish';
UPDATE app_workflow_steps SET step_sequence = 90
WHERE workflow_version_id = @wf_enroll_ver_id AND step_key = 'audit_complete';

-- ─── Workflow: church.ops.setup (#6) ───────────────────────────────────────

INSERT INTO app_workflows (
  workflow_key, workflow_name, description, primary_app, entry_type, system_level_key,
  workflow_sequence, lifecycle_status, completion_state, feature_registry_ids
) VALUES (
  'church.ops.setup',
  'Parish Operations Setup',
  'Post-enrollment parish configuration: database mapping, record settings, staff, and go-live checklist.',
  'om', 'hybrid', 'church_ops', 10, 'active', 'near_complete',
  JSON_ARRAY('parish-management','database-mapping','record-settings')
) ON DUPLICATE KEY UPDATE workflow_name = VALUES(workflow_name);

SET @wf_ops_id = (SELECT id FROM app_workflows WHERE workflow_key = 'church.ops.setup');

INSERT INTO app_workflow_versions (
  workflow_id, version, version_status, change_summary, route_entrypoints,
  runtime_state_source, published_at
) VALUES (
  @wf_ops_id, '1.0.0', 'active',
  'Parish hub operations after enrollment — separate from church.enrollment.',
  JSON_ARRAY('/account/parish-management','/account/parish-management/database-mapping','/account/parish-management/record-settings','/account/parish-management/users'),
  'churches.setup_complete', NOW()
) ON DUPLICATE KEY UPDATE version_status = 'active', route_entrypoints = VALUES(route_entrypoints);

SET @wf_ops_ver_id = (
  SELECT id FROM app_workflow_versions WHERE workflow_id = @wf_ops_id AND version = '1.0.0'
);
UPDATE app_workflows SET active_version_id = @wf_ops_ver_id WHERE id = @wf_ops_id;

INSERT INTO app_workflow_steps (
  workflow_version_id, step_key, step_name, step_sequence, step_kind,
  runtime_status_field, runtime_status_values, description
) VALUES
(@wf_ops_ver_id, 'verify_provision', 'Verify Provision', 10, 'system',
 'onboarding_phase', JSON_ARRAY('2','3'), 'Tenant database provisioned'),
(@wf_ops_ver_id, 'database_mapping', 'Database Mapping', 20, 'human', NULL, NULL,
 'Configure baptism/marriage/funeral field mappings'),
(@wf_ops_ver_id, 'record_settings', 'Record Settings', 30, 'human', NULL, NULL,
 'Record behavior and requirements per type'),
(@wf_ops_ver_id, 'parish_staff', 'Parish Staff', 40, 'human', NULL, NULL,
 'Add and activate parish staff via church_users'),
(@wf_ops_ver_id, 'branding_optional', 'Branding (Optional)', 50, 'human', NULL, NULL,
 'Landing page branding — optional'),
(@wf_ops_ver_id, 'finalize_setup', 'Finalize Setup', 60, 'system',
 'setup_complete', JSON_ARRAY('0'), 'Mark parish operations setup complete'),
(@wf_ops_ver_id, 'audit_complete', 'Audit Complete', 70, 'audit', NULL, NULL,
 'Church onboarding events logged')
ON DUPLICATE KEY UPDATE step_name = VALUES(step_name);

-- Step components
INSERT INTO app_workflow_step_components (
  workflow_step_id, component_key, component_type, component_sequence,
  source_app, source_path, implementation_state
)
SELECT s.id, 'parish.DatabaseMappingPage', 'ui', 10, 'om',
  'front-end/src/features/account/parish-management/DatabaseMappingPage.tsx', 'exists'
FROM app_workflow_steps s
WHERE s.workflow_version_id = @wf_ops_ver_id AND s.step_key = 'database_mapping'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components (
  workflow_step_id, component_key, component_type, component_sequence,
  source_app, source_path, implementation_state
)
SELECT s.id, 'parish.RecordSettingsPage', 'ui', 10, 'om',
  'front-end/src/features/account/parish-management/RecordSettingsPage.tsx', 'exists'
FROM app_workflow_steps s
WHERE s.workflow_version_id = @wf_ops_ver_id AND s.step_key = 'record_settings'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components (
  workflow_step_id, component_key, component_type, component_sequence,
  source_app, source_path, implementation_state
)
SELECT s.id, 'parish.ParishUsersPage', 'ui', 10, 'om',
  'front-end/src/features/account/parish-management/ParishUsersPage.tsx', 'exists'
FROM app_workflow_steps s
WHERE s.workflow_version_id = @wf_ops_ver_id AND s.step_key = 'parish_staff'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components (
  workflow_step_id, component_key, component_type, component_sequence,
  source_app, source_path, api_method, api_path, data_table, implementation_state
)
SELECT s.id, 'church-onboarding.toggle-setup', 'api', 10, 'om',
  'server/src/routes/admin/church-onboarding.js', 'POST', '/api/admin/church-onboarding/:churchId/toggle-setup',
  'churches', 'exists'
FROM app_workflow_steps s
WHERE s.workflow_version_id = @wf_ops_ver_id AND s.step_key = 'finalize_setup'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

-- ─── OCR setup wizard: portal route entrypoint ───────────────────────────────

UPDATE app_workflow_versions v
JOIN app_workflows w ON w.id = v.workflow_id
SET v.route_entrypoints = JSON_ARRAY('/portal/ocr/setup','/devel/ocr-setup-wizard','/portal/ocr')
WHERE w.workflow_key = 'ocr.setup.wizard' AND v.version = '1.0.0';

UPDATE app_workflow_versions v
JOIN app_workflows w ON w.id = v.workflow_id
SET v.route_entrypoints = JSON_ARRAY('/portal/ocr','/portal/upload','/portal/ocr/review/:churchId/:jobId','/devel/ocr-studio')
WHERE w.workflow_key = 'ocr.batch.review' AND v.version = '1.0.0';

-- Seed empty OCR cache row (refreshed on first overview load)
INSERT INTO workflow_runtime_cache (cache_key, payload)
VALUES ('ocr.setup.wizard', JSON_OBJECT(
  'source', 'workflow_runtime_cache',
  'churches_total', 0,
  'setup_complete', 0,
  'setup_in_progress', 0,
  'setup_not_started', 0,
  'stale', true
))
ON DUPLICATE KEY UPDATE cache_key = cache_key;
