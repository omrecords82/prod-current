-- OM CP policy: only Manville (#46) and Test Church (#278) remain tenant-provisioned.
-- All other CRM-staged rows revert to directory (no database_name) until real enrollment.

-- Reactivate Test Church as demo / validation parish
UPDATE churches SET
  name = 'Test Church',
  church_name = 'Test Church',
  is_demo = 1,
  is_active = 1,
  client_status = 'active_paid',
  billing_status = 'waived',
  onboarding_phase = 3,
  setup_complete = 0,
  database_name = COALESCE(database_name, 'om_church_278'),
  contact_phase = 'none'
WHERE id = 278;

-- Ensure Manville stays canonical production client
UPDATE churches SET
  is_demo = 0,
  is_active = 1,
  client_status = 'active_paid',
  billing_status = 'paid',
  onboarding_phase = 4,
  setup_complete = 1,
  database_name = COALESCE(database_name, 'om_church_46'),
  crm_lead_id = 80,
  contact_phase = 'none'
WHERE id = 46;

UPDATE omai_crm_leads SET
  provisioned_church_id = 46,
  is_client = 1,
  pipeline_stage = 'active_parish'
WHERE id = 80;

-- De-provision all other non-decommissioned churches (keep row for CRM, drop tenant binding)
UPDATE churches SET
  onboarding_phase = 1,
  database_name = NULL,
  db_name = NULL,
  is_active = 0,
  setup_complete = 0,
  is_demo = 0,
  client_status = 'directory',
  billing_status = 'not_configured',
  contact_phase = 'none'
WHERE id NOT IN (46, 278)
  AND client_status != 'decommissioned';

-- Clear CRM lead → church provisioning except Manville
UPDATE omai_crm_leads SET provisioned_church_id = NULL
WHERE provisioned_church_id IS NOT NULL AND provisioned_church_id NOT IN (46, 278);

-- Validation / stray test rows
UPDATE churches SET client_status = 'decommissioned', is_active = 0
WHERE id IN (207, 279)
   OR LOWER(name) LIKE '%cursor validation%';
