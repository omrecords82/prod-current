-- Remove one-off migration backup snapshots (2 rows each, superseded by live tables).
DROP TABLE IF EXISTS user_profiles_backup;
DROP TABLE IF EXISTS user_settings_backup;
