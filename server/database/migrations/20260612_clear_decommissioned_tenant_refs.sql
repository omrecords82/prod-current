-- Clear stale tenant DB reference on decommissioned churches (orphan om_church_* on disk).
UPDATE churches
SET database_name = NULL,
    db_name = NULL
WHERE id = 207
  AND client_status = 'decommissioned'
  AND database_name IS NOT NULL;
