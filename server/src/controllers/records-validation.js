/**
 * records-validation.js — Server-side mirror of
 * front-end/src/features/records-centralized/components/records/RecordsPage/validation.ts.
 *
 * Same rules, same fieldErrors shape, so a stale or non-browser client
 * gets a clean 400 with the same structure the FE renders inline —
 * never a 500 + SQL stack trace.
 *
 * Operates on the body shape that mapFields() expects (camelCase keys
 * AND snake_case keys both pass through). Required-field checks read
 * either form, since both shapes are valid input to the controller.
 */

'use strict';

const MIN_YEAR = 1850;
const MAX_YEAR = 2100;
const MAX_TEXT = 255;
const MAX_LONG_TEXT = 500;

function isBlank(v) {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

// Pull a value from either the camelCase or snake_case key, whichever
// exists. The controller's mapFields normalizes both, so accept both
// at validation time too.
function pick(body, ...keys) {
  for (const k of keys) {
    if (body[k] != null && body[k] !== '') return body[k];
  }
  return undefined;
}

function parseDate(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const y = raw.getUTCFullYear();
    return y >= MIN_YEAR && y <= MAX_YEAR ? raw : null;
  }
  if (typeof raw === 'string') {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
    if (m) {
      const y = +m[1];
      if (y < MIN_YEAR || y > MAX_YEAR) return null;
      const d = new Date(Date.UTC(y, +m[2] - 1, +m[3]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  return null;
}

function checkText(value, label, max = MAX_TEXT) {
  if (isBlank(value)) return null;
  const s = String(value).trim();
  if (s.length > max) return `${label} must be ${max} characters or fewer (currently ${s.length}).`;
  return null;
}

function checkDate(value, label) {
  if (isBlank(value)) return null;
  const d = parseDate(value);
  if (!d) return `${label} must be a valid date between ${MIN_YEAR} and ${MAX_YEAR} (e.g. 2026-02-21).`;
  return null;
}

function checkRequired(value, label) {
  return isBlank(value) ? `${label} is required.` : null;
}

function setIf(errors, field, msg) {
  if (msg) errors[field] = msg;
}

function validateBaptism(body) {
  const e = {};
  const firstName = pick(body, 'firstName', 'first_name');
  const lastName  = pick(body, 'lastName',  'last_name');
  const baptism   = pick(body, 'dateOfBaptism', 'reception_date', 'baptism_date');
  const birth     = pick(body, 'dateOfBirth', 'birth_date');

  setIf(e, 'firstName',     checkRequired(firstName, 'First name'));
  setIf(e, 'lastName',      checkRequired(lastName,  'Last name'));
  setIf(e, 'dateOfBaptism', checkRequired(baptism,   'Baptism date'));

  setIf(e, 'firstName',     checkText(firstName, 'First name'));
  setIf(e, 'lastName',      checkText(lastName,  'Last name'));
  setIf(e, 'placeOfBirth',  checkText(pick(body, 'placeOfBirth', 'birthplace'), 'Place of birth'));
  setIf(e, 'fatherName',    checkText(pick(body, 'fatherName'), "Father's name"));
  setIf(e, 'motherName',    checkText(pick(body, 'motherName'), "Mother's name"));
  setIf(e, 'godparentNames',checkText(pick(body, 'godparentNames', 'sponsors'), 'Sponsors / godparents', MAX_LONG_TEXT));
  setIf(e, 'priest',        checkText(pick(body, 'priest', 'clergy'), 'Officiating clergy'));
  setIf(e, 'registryNumber',checkText(pick(body, 'registryNumber', 'source_scan_id'), 'Registry number'));

  setIf(e, 'dateOfBirth',   checkDate(birth, 'Date of birth'));
  setIf(e, 'dateOfBaptism', checkDate(baptism, 'Baptism date'));

  if (!e.dateOfBirth && !e.dateOfBaptism) {
    const b = parseDate(birth);
    const bp = parseDate(baptism);
    if (b && bp && b.getTime() > bp.getTime()) {
      e.dateOfBaptism = 'Baptism date must be on or after the date of birth.';
    }
  }
  return e;
}

function validateMarriage(body) {
  const e = {};
  const groomFirst = pick(body, 'groomFirstName', 'fname_groom');
  const groomLast  = pick(body, 'groomLastName',  'lname_groom');
  const brideFirst = pick(body, 'brideFirstName', 'fname_bride');
  const brideLast  = pick(body, 'brideLastName',  'lname_bride');
  const mDate      = pick(body, 'marriageDate', 'mdate');

  setIf(e, 'groomFirstName', checkRequired(groomFirst, "Groom's first name"));
  setIf(e, 'groomLastName',  checkRequired(groomLast,  "Groom's last name"));
  setIf(e, 'brideFirstName', checkRequired(brideFirst, "Bride's first name"));
  setIf(e, 'brideLastName',  checkRequired(brideLast,  "Bride's last name"));
  setIf(e, 'marriageDate',   checkRequired(mDate,      'Marriage date'));

  setIf(e, 'groomFirstName', checkText(groomFirst, "Groom's first name"));
  setIf(e, 'groomLastName',  checkText(groomLast,  "Groom's last name"));
  setIf(e, 'brideFirstName', checkText(brideFirst, "Bride's first name"));
  setIf(e, 'brideLastName',  checkText(brideLast,  "Bride's last name"));
  setIf(e, 'groomParents',   checkText(pick(body, 'groomParents', 'parentsg'), "Groom's parents", MAX_LONG_TEXT));
  setIf(e, 'brideParents',   checkText(pick(body, 'brideParents', 'parentsb'), "Bride's parents", MAX_LONG_TEXT));
  setIf(e, 'marriageLocation', checkText(pick(body, 'marriageLocation', 'mlicense'), 'Marriage location'));
  setIf(e, 'priest',         checkText(pick(body, 'priest', 'clergy'), 'Officiating clergy'));
  setIf(e, 'witness1',       checkText(pick(body, 'witness1'), 'Witness 1'));
  setIf(e, 'witness2',       checkText(pick(body, 'witness2'), 'Witness 2'));

  setIf(e, 'marriageDate',   checkDate(mDate, 'Marriage date'));
  return e;
}

function validateFuneral(body) {
  const e = {};
  const first = pick(body, 'deceasedFirstName', 'firstName', 'name');
  const last  = pick(body, 'deceasedLastName',  'lastName',  'lastname');
  const death = pick(body, 'dateOfDeath', 'deathDate', 'deceased_date');
  const burial = pick(body, 'burialDate', 'burial_date');

  setIf(e, 'firstName',  checkRequired(first, "Deceased's first name"));
  setIf(e, 'lastName',   checkRequired(last,  "Deceased's last name"));
  setIf(e, 'dateOfDeath',checkRequired(death, 'Date of death'));

  setIf(e, 'firstName',  checkText(first, "Deceased's first name"));
  setIf(e, 'lastName',   checkText(last,  "Deceased's last name"));
  setIf(e, 'priest',     checkText(pick(body, 'priest', 'clergy'), 'Officiating clergy'));
  setIf(e, 'burialLocation', checkText(pick(body, 'burialLocation', 'burial_location'), 'Burial location'));

  setIf(e, 'dateOfDeath', checkDate(death, 'Date of death'));
  setIf(e, 'burialDate',  checkDate(burial, 'Burial date'));

  if (!e.dateOfDeath && !e.burialDate) {
    const d = parseDate(death);
    const b = parseDate(burial);
    if (d && b && d.getTime() > b.getTime()) {
      e.burialDate = 'Burial date must be on or after the date of death.';
    }
  }

  const age = pick(body, 'age');
  if (age != null && age !== '') {
    const n = Number(age);
    if (!Number.isFinite(n) || n < 0 || n > 150 || !Number.isInteger(n)) {
      e.age = 'Age must be a whole number between 0 and 150.';
    }
  }
  return e;
}

function validateRecord(recordType, body) {
  let fieldErrors;
  switch (recordType) {
    case 'marriage': fieldErrors = validateMarriage(body); break;
    case 'funeral':  fieldErrors = validateFuneral(body); break;
    case 'baptism':
    default:         fieldErrors = validateBaptism(body); break;
  }
  return Object.keys(fieldErrors).length === 0
    ? { ok: true }
    : { ok: false, fieldErrors };
}

module.exports = { validateRecord };
