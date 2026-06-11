-- ============================================================================
-- Workflow Catalog Phase A — Workflow System Hierarchy
-- 2026-06-13 | GLOBAL → APP_FAMILY → WORKFLOW_GROUP tree
-- Prerequisite: 20260608_app_workflow_catalog.sql, 20260612_* review decisions
-- Rollback: docs/workflow-catalog-phase-a-hierarchy-design.md §14.1
-- ============================================================================

-- ─── 1. Extend app_workflow_system_levels ───────────────────────────────────

ALTER TABLE app_workflow_system_levels
  ADD COLUMN tree_depth TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER workflow_group_sequence;

ALTER TABLE app_workflow_system_levels
  ADD COLUMN hierarchy_path VARCHAR(256) NULL AFTER tree_depth;

ALTER TABLE app_workflow_system_levels
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER hierarchy_path;

CREATE INDEX idx_awsl_parent ON app_workflow_system_levels (parent_level_key);
CREATE INDEX idx_awsl_level_seq ON app_workflow_system_levels (system_level, workflow_group_sequence);

-- ─── 2. GLOBAL root ─────────────────────────────────────────────────────────

INSERT INTO app_workflow_system_levels
  (level_key, level_name, system_level, workflow_group_sequence, tree_depth, parent_level_key, hierarchy_path, description)
VALUES
  ('om_platform', 'OrthodoxMetrics Platform', 'GLOBAL', 0, 0, NULL,
   '/om_platform', 'Root taxonomy node for all OM workflow systems')
ON DUPLICATE KEY UPDATE
  system_level = 'GLOBAL',
  tree_depth = 0,
  hierarchy_path = '/om_platform',
  level_name = VALUES(level_name);

-- ─── 3. APP_FAMILY nodes ────────────────────────────────────────────────────

INSERT INTO app_workflow_system_levels
  (level_key, level_name, system_level, workflow_group_sequence, tree_depth, parent_level_key, hierarchy_path, description)
VALUES
  ('parish_lifecycle', 'Parish Lifecycle', 'APP_FAMILY', 100, 1, 'om_platform',
   '/om_platform/parish_lifecycle', 'Enrollment, ops setup, decommission'),
  ('digitization', 'Digitization', 'APP_FAMILY', 200, 1, 'om_platform',
   '/om_platform/digitization', 'OCR setup, batch review, bulk import'),
  ('records_sacraments', 'Records & Sacraments', 'APP_FAMILY', 300, 1, 'om_platform',
   '/om_platform/records_sacraments', 'Manual entry, certificates, audits'),
  ('identity_access', 'Identity & Access', 'APP_FAMILY', 400, 1, 'om_platform',
   '/om_platform/identity_access', 'Users, roles, email intake'),
  ('commercial_crm', 'Commercial & CRM', 'APP_FAMILY', 500, 1, 'om_platform',
   '/om_platform/commercial_crm', 'Leads, billing, contact nurture'),
  ('platform_governance', 'Platform Governance', 'APP_FAMILY', 600, 1, 'om_platform',
   '/om_platform/platform_governance', 'Workshop promotion, rollback, catalog ops')
ON DUPLICATE KEY UPDATE
  system_level = 'APP_FAMILY',
  tree_depth = 1,
  parent_level_key = VALUES(parent_level_key),
  hierarchy_path = VALUES(hierarchy_path),
  workflow_group_sequence = VALUES(workflow_group_sequence),
  level_name = VALUES(level_name);

-- ─── 4. Reparent existing WORKFLOW_GROUP rows ───────────────────────────────

UPDATE app_workflow_system_levels SET
  parent_level_key = 'parish_lifecycle',
  tree_depth = 2,
  workflow_group_sequence = 110,
  hierarchy_path = '/om_platform/parish_lifecycle/enrollment'
WHERE level_key = 'enrollment' AND system_level = 'WORKFLOW_GROUP';

UPDATE app_workflow_system_levels SET
  parent_level_key = 'parish_lifecycle',
  tree_depth = 2,
  workflow_group_sequence = 115,
  hierarchy_path = '/om_platform/parish_lifecycle/church_ops'
WHERE level_key = 'church_ops' AND system_level = 'WORKFLOW_GROUP';

UPDATE app_workflow_system_levels SET
  parent_level_key = 'digitization',
  tree_depth = 2,
  workflow_group_sequence = 210,
  hierarchy_path = '/om_platform/digitization/ocr'
WHERE level_key = 'ocr' AND system_level = 'WORKFLOW_GROUP';

UPDATE app_workflow_system_levels SET
  parent_level_key = 'records_sacraments',
  tree_depth = 2,
  workflow_group_sequence = 310,
  hierarchy_path = '/om_platform/records_sacraments/records'
WHERE level_key = 'records' AND system_level = 'WORKFLOW_GROUP';

UPDATE app_workflow_system_levels SET
  parent_level_key = 'identity_access',
  tree_depth = 2,
  workflow_group_sequence = 410,
  hierarchy_path = '/om_platform/identity_access/identity'
WHERE level_key = 'identity' AND system_level = 'WORKFLOW_GROUP';

-- ─── 5. Planned WORKFLOW_GROUP placeholders ─────────────────────────────────

INSERT INTO app_workflow_system_levels
  (level_key, level_name, system_level, workflow_group_sequence, tree_depth, parent_level_key, hierarchy_path, description, is_active)
VALUES
  ('decommission', 'Decommission', 'WORKFLOW_GROUP', 120, 2, 'parish_lifecycle',
   '/om_platform/parish_lifecycle/decommission', 'Parish export, disable, cleanup', 1),
  ('ocr_import', 'OCR Bulk Import', 'WORKFLOW_GROUP', 220, 2, 'digitization',
   '/om_platform/digitization/ocr_import', 'Historical bulk digitization', 1),
  ('certificates', 'Certificates', 'WORKFLOW_GROUP', 320, 2, 'records_sacraments',
   '/om_platform/records_sacraments/certificates', 'Certificate templates and generation', 1),
  ('email_intake', 'Email Intake', 'WORKFLOW_GROUP', 420, 2, 'identity_access',
   '/om_platform/identity_access/email_intake', 'Email submission review and auth', 1),
  ('crm', 'CRM & Leads', 'WORKFLOW_GROUP', 510, 2, 'commercial_crm',
   '/om_platform/commercial_crm/crm', 'Lead nurture through enrollment', 1),
  ('billing', 'Billing & Subscriptions', 'WORKFLOW_GROUP', 520, 2, 'commercial_crm',
   '/om_platform/commercial_crm/billing', 'Client billing lifecycle', 1),
  ('governance', 'Governance & Promotion', 'WORKFLOW_GROUP', 610, 2, 'platform_governance',
   '/om_platform/platform_governance/governance', 'Component promotion and rollback', 1)
ON DUPLICATE KEY UPDATE
  parent_level_key = VALUES(parent_level_key),
  tree_depth = 2,
  hierarchy_path = VALUES(hierarchy_path),
  workflow_group_sequence = VALUES(workflow_group_sequence),
  level_name = VALUES(level_name);

-- ─── 6. Denormalize app_family_key on app_workflows ─────────────────────────

ALTER TABLE app_workflows
  ADD COLUMN app_family_key VARCHAR(64) NULL AFTER system_level_key;

CREATE INDEX idx_aw_app_family ON app_workflows (app_family_key, workflow_sequence);

UPDATE app_workflows w
JOIN app_workflow_system_levels g ON g.level_key = w.system_level_key
JOIN app_workflow_system_levels f ON f.level_key = g.parent_level_key AND f.system_level = 'APP_FAMILY'
SET w.app_family_key = f.level_key;

UPDATE app_workflows SET app_family_key = 'parish_lifecycle'
WHERE workflow_key IN ('church.enrollment', 'church.ops.setup');

UPDATE app_workflows SET app_family_key = 'digitization'
WHERE workflow_key IN ('ocr.setup.wizard', 'ocr.batch.review');

UPDATE app_workflows SET app_family_key = 'records_sacraments'
WHERE workflow_key = 'records.certificate.generate';

UPDATE app_workflows SET app_family_key = 'identity_access'
WHERE workflow_key = 'identity.user.admin';

-- ─── 7. OMStudio refs family scope ───────────────────────────────────────────

ALTER TABLE omstudio_workflow_refs
  ADD COLUMN app_family_key VARCHAR(64) NULL AFTER workflow_key;

UPDATE omstudio_workflow_refs r
JOIN app_workflows w ON w.workflow_key = r.workflow_key
SET r.app_family_key = w.app_family_key;

-- ─── 8. Global hierarchy policy seed ────────────────────────────────────────

INSERT INTO app_workflow_policies (policy_key, policy_name, policy_rules, lifecycle_status)
VALUES (
  'catalog.hierarchy.v1',
  'Workflow Catalog Hierarchy v1',
  JSON_OBJECT(
    'schema_version', '1.0.0',
    'global_key', 'om_platform',
    'app_families', JSON_ARRAY(
      'parish_lifecycle', 'digitization', 'records_sacraments',
      'identity_access', 'commercial_crm', 'platform_governance'
    ),
    'inheritance_enabled', false,
    'org_policy_enabled', false
  ),
  'active'
)
ON DUPLICATE KEY UPDATE
  policy_rules = VALUES(policy_rules),
  lifecycle_status = 'active';

INSERT INTO app_workflow_policy_assignments (policy_id, workflow_key, assignment_scope, scope_key)
SELECT p.id, 'church.enrollment', 'workflow', NULL
FROM app_workflow_policies p WHERE p.policy_key = 'catalog.hierarchy.v1'
ON DUPLICATE KEY UPDATE policy_id = VALUES(policy_id);

-- ─── 9. Metadata schema version marker ────────────────────────────────────────

INSERT INTO workflow_runtime_cache (cache_key, payload)
VALUES ('catalog.hierarchy.v1', JSON_OBJECT(
  'schema_version', '1.0.0',
  'phase', 'A',
  'migrated_at', NOW(),
  'global_key', 'om_platform',
  'app_family_count', 6,
  'workflow_group_count', 12
))
ON DUPLICATE KEY UPDATE
  payload = VALUES(payload),
  refreshed_at = CURRENT_TIMESTAMP;
