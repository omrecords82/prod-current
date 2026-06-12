/**
 * Which churches appear in OM Ops surfaces (admin pickers, ChurchHeader, OM CP embeds).
 *
 * Policy: only tenant-provisioned, active clients — Manville (#46) and Test Church (#278).
 * CRM directory / staged rows live in Church Command Center, not OM parish admin flows.
 */

const PRODUCTION_CHURCH_ID = 46;
const TEST_CHURCH_ID = 278;

const OPERATIONAL_CHURCH_IDS = [PRODUCTION_CHURCH_ID, TEST_CHURCH_ID];

function isOperationalChurchId(id) {
  return OPERATIONAL_CHURCH_IDS.includes(Number(id));
}

/** SQL predicate: churches with an active tenant DB (post-migration = operational only). */
function operationalClientsSql(prefix = '') {
  const c = prefix ? `${prefix}.` : '';
  return `(${c}database_name IS NOT NULL AND ${c}is_active = 1 AND ${c}client_status NOT IN ('decommissioned', 'directory'))`;
}

/** SQL predicate: CRM directory rows (staged, not tenant-provisioned). */
function directoryClientsSql(prefix = '') {
  const c = prefix ? `${prefix}.` : '';
  return `(${c}database_name IS NULL AND ${c}client_status NOT IN ('decommissioned', 'active_paid'))`;
}

module.exports = {
  PRODUCTION_CHURCH_ID,
  TEST_CHURCH_ID,
  OPERATIONAL_CHURCH_IDS,
  isOperationalChurchId,
  operationalClientsSql,
  directoryClientsSql,
};
