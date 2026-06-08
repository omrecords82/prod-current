-- Onboarding: church record layout catalog selections (first-login step 2b)
ALTER TABLE onboarding_requests
  ADD COLUMN IF NOT EXISTS layout_configuration_completed TINYINT(1) NOT NULL DEFAULT 0
    AFTER table_configuration_completed,
  ADD COLUMN IF NOT EXISTS selected_layout_catalog_json JSON NULL
    COMMENT 'Map record_type -> [catalog_layout_id, ...]'
    AFTER selected_record_tables_json;
