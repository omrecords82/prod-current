-- OMOD-1502: tenant_portal_config_items
-- Per-tenant portal configuration registry for the OM Church Portal Master Plan
-- Phase 5 of 8 (parent OMSD-1491). Schema follows registry-contracts.md §C.
--
-- Lives in the platform DB (orthodoxmetrics_db). Each row describes ONE config-item
-- for ONE church tenant. OMStudio's preflight validator reads this through the
-- service-token-gated endpoint /api/platform/tenant-config/known-slots — see
-- server/src/routes/platform.js for the read surface.
--
-- Reversal: DROP TABLE IF EXISTS tenant_portal_config_items;

CREATE TABLE IF NOT EXISTS tenant_portal_config_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,

  church_id INT NOT NULL,

  -- Stable machine key per §C ("portal.dashboard.hero_image", etc.). Together
  -- with church_id this is the natural key — UNIQUE below.
  config_key VARCHAR(255) NOT NULL,

  -- Per §C
  display_name VARCHAR(255) DEFAULT NULL,

  -- Per §C category enum, plus 'auth' which §C omits but the OMOD-1498 audit
  -- identified as a real category (9 cross-cutting auth config-items).
  category ENUM(
    'portal',
    'records',
    'branding',
    'church_profile',
    'navigation',
    'permissions',
    'uploads',
    'analytics',
    'layout',
    'notifications',
    'tenant',
    'auth'
  ) NOT NULL,

  owning_system VARCHAR(50) NOT NULL DEFAULT 'OM',

  -- Free-form "page/component/route" identifier per §C
  target_surface VARCHAR(500) DEFAULT NULL,

  -- §C user_roles[] — array of role strings
  user_roles JSON DEFAULT NULL,

  tenant_scope ENUM(
    'global',
    'per_church',
    'per_user',
    'per_role',
    'per_record_type'
  ) NOT NULL DEFAULT 'per_church',

  -- §C current_source: { frontend_file, backend_route, db_table, db_column, hardcoded }
  current_source JSON DEFAULT NULL,

  current_behavior TEXT DEFAULT NULL,

  -- §C configurable_fields[] (default empty array)
  configurable_fields JSON DEFAULT NULL,

  -- §C layout_contract: { slot_name, width_behavior, responsive_behavior,
  --                       dark_mode_requirement, theme_tokens_used, visual_constraints }
  layout_contract JSON DEFAULT NULL,

  -- §C dependencies (default empty object)
  dependencies JSON DEFAULT NULL,

  -- §C omstudio_package_relevance: {
  --   can_be_targeted_by_omstudio, package_slot_candidate,
  --   requires_preflight_validation, risk_level, notes
  -- }
  omstudio_package_relevance JSON DEFAULT NULL,

  -- §C gaps_or_risks[] (default empty array)
  gaps_or_risks JSON DEFAULT NULL,

  -- Soft-disable a row without deleting (preserves audit history for §D resolver
  -- to detect "this slot existed but was retired")
  is_active TINYINT(1) NOT NULL DEFAULT 1,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Audit columns
  created_by_user_id INT DEFAULT NULL,
  updated_by_user_id INT DEFAULT NULL,

  UNIQUE KEY uk_tpci_church_config (church_id, config_key),
  INDEX idx_tpci_church_category (church_id, category),
  INDEX idx_tpci_category (category),
  INDEX idx_tpci_active (is_active),

  CONSTRAINT fk_tpci_church
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
