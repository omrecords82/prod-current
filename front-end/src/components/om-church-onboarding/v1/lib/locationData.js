/**
 * locationData.js — local, deterministic reference data for enrollment
 * location auto-fill. No network access; everything here is a static lookup.
 *
 * Coverage is intentionally curated (major US cities + every state's default
 * timezone). Unknown city/state combinations simply yield no suggestion, which
 * the caller treats as "leave the field for the user".
 */

/** US state/territory abbreviation → full name. */
export const US_STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/**
 * Default canonical IANA timezone per US state (predominant zone). Cities in
 * states that span multiple zones can be refined via CITY_TIMEZONE_OVERRIDES.
 */
export const STATE_TIMEZONES = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix',
  AR: 'America/Chicago', CA: 'America/Los_Angeles', CO: 'America/Denver',
  CT: 'America/New_York', DE: 'America/New_York', DC: 'America/New_York',
  FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago', KS: 'America/Chicago', KY: 'America/New_York',
  LA: 'America/Chicago', ME: 'America/New_York', MD: 'America/New_York',
  MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MS: 'America/Chicago', MO: 'America/Chicago', MT: 'America/Denver',
  NE: 'America/Chicago', NV: 'America/Los_Angeles', NH: 'America/New_York',
  NJ: 'America/New_York', NM: 'America/Denver', NY: 'America/New_York',
  NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York',
  RI: 'America/New_York', SC: 'America/New_York', SD: 'America/Chicago',
  TN: 'America/Chicago', TX: 'America/Chicago', UT: 'America/Denver',
  VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles',
  WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
};

/**
 * City-level timezone overrides for cities that sit in a different zone than
 * their state's default. Keyed `${normalizedCity}|${STATE}`.
 */
export const CITY_TIMEZONE_OVERRIDES = {
  'el paso|TX': 'America/Denver',
  'pensacola|FL': 'America/Chicago',
  "coeur d'alene|ID": 'America/Los_Angeles',
  'sandpoint|ID': 'America/Los_Angeles',
  'bristol|TN': 'America/New_York',
  'kingsport|TN': 'America/New_York',
  'johnson city|TN': 'America/New_York',
  'gary|IN': 'America/Chicago',
  'tell city|IN': 'America/Chicago',
};

/**
 * Curated US postal-code data, keyed `${normalizedCity}|${STATE}`.
 * `primary` is the suggested default ZIP; `alternatives` is the full list of
 * known ZIPs for the city (primary first), used to populate the combobox.
 */
export const US_POSTAL_DATA = {
  'anchorage|AK': {
    primary: '99501',
    alternatives: ['99501', '99502', '99503', '99504', '99507', '99508', '99513', '99515', '99516', '99517', '99518'],
  },
  'new york|NY': {
    primary: '10001',
    alternatives: ['10001', '10002', '10003', '10004', '10005', '10009', '10010', '10011', '10012', '10013', '10014', '10016', '10017', '10018', '10019', '10021', '10022', '10023', '10024', '10025', '10027', '10028', '10029', '10128'],
  },
  'chicago|IL': {
    primary: '60601',
    alternatives: ['60601', '60602', '60603', '60604', '60605', '60606', '60607', '60608', '60610', '60611', '60613', '60614', '60616', '60618', '60622', '60625', '60629', '60634', '60640', '60647', '60657'],
  },
  'phoenix|AZ': {
    primary: '85001',
    alternatives: ['85001', '85003', '85004', '85006', '85007', '85008', '85012', '85013', '85014', '85015', '85016', '85018', '85020', '85021', '85022', '85023', '85027', '85032', '85033', '85035', '85048', '85051'],
  },
  'honolulu|HI': {
    primary: '96813',
    alternatives: ['96813', '96814', '96815', '96816', '96817', '96818', '96819', '96821', '96822', '96825', '96826'],
  },
  'los angeles|CA': {
    primary: '90012',
    alternatives: ['90012', '90001', '90004', '90005', '90006', '90007', '90010', '90011', '90013', '90014', '90015', '90016', '90017', '90018', '90019', '90024', '90025', '90026', '90027', '90028'],
  },
  'boston|MA': {
    primary: '02108',
    alternatives: ['02108', '02109', '02110', '02111', '02113', '02114', '02115', '02116', '02118', '02119', '02120', '02121', '02122', '02124', '02125', '02126', '02127', '02128', '02129', '02130', '02131', '02134', '02135'],
  },
  'seattle|WA': {
    primary: '98101',
    alternatives: ['98101', '98102', '98103', '98104', '98105', '98106', '98107', '98108', '98109', '98112', '98115', '98116', '98117', '98118', '98119', '98121', '98122', '98125', '98126', '98133', '98134', '98136', '98144'],
  },
  'denver|CO': {
    primary: '80202',
    alternatives: ['80202', '80203', '80204', '80205', '80206', '80207', '80209', '80210', '80211', '80212', '80218', '80219', '80220', '80221', '80222', '80223', '80224', '80226', '80227', '80230', '80231', '80246'],
  },
  'washington|DC': {
    primary: '20001',
    alternatives: ['20001', '20002', '20003', '20004', '20005', '20006', '20007', '20008', '20009', '20010', '20011', '20012', '20015', '20016', '20017', '20018', '20019', '20020', '20024', '20036', '20037'],
  },
  'atlanta|GA': {
    primary: '30303',
    alternatives: ['30303', '30305', '30306', '30307', '30308', '30309', '30310', '30311', '30312', '30313', '30314', '30316', '30317', '30318', '30319', '30324', '30326', '30327', '30329', '30331', '30342'],
  },
};
