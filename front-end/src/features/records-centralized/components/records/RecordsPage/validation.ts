/**
 * validation.ts — Per-field validators for baptism / marriage / funeral
 * record forms. Returns structured fieldErrors so the dialog can show
 * inline error+helperText on each TextField instead of a single toast.
 *
 * Used by useRecordSave (the gatekeeper before any API call) and by
 * EditRecordDialog (live validation on blur). Both paths import the
 * same validators so the user can never reach a state where the form
 * looks valid but the save fails.
 *
 * Mirrors shape: server-side validation in
 * server/src/controllers/records.js applies the same rules so a stale
 * client (or a non-browser caller) gets a clean 400 with the same
 * fieldErrors map instead of a 500 + SQL stack.
 */

export type FieldErrors = Record<string, string>;
export type ValidationResult = { ok: true } | { ok: false; fieldErrors: FieldErrors };

const MIN_YEAR = 1850;     // OCA records older than this are vanishingly rare.
const MAX_YEAR = 2100;     // Sanity cap — typo'd "11111" or "20255" gets caught.
const MAX_TEXT = 255;      // Matches DB varchar(255) for first_name, last_name, etc.
const MAX_LONG_TEXT = 500; // sponsors / parents / witnesses can be longer.

// ────────────────────────────────────────────────────────────────────────────
// Primitive checks
// ────────────────────────────────────────────────────────────────────────────

function isBlank(v: any): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

/**
 * Parse a date-ish value to a UTC Date OR return null if unparseable / out of range.
 * Accepts Date, ISO strings, YYYY-MM-DD, and MySQL TIMESTAMPs.
 * Out-of-range years (1850-2100) are rejected — catches typos like "11111-02-11".
 */
function parseDate(raw: any): Date | null {
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
    // Not YYYY-MM-DD — refuse rather than risk Date parser quirks.
    return null;
  }
  return null;
}

function checkText(value: any, label: string, max = MAX_TEXT): string | null {
  if (isBlank(value)) return null; // required-ness handled separately
  const s = String(value).trim();
  if (s.length > max) return `${label} must be ${max} characters or fewer (currently ${s.length}).`;
  return null;
}

function checkDate(value: any, label: string): string | null {
  if (isBlank(value)) return null;
  const d = parseDate(value);
  if (!d) {
    return `${label} must be a valid date between ${MIN_YEAR} and ${MAX_YEAR} (e.g. 2026-02-21).`;
  }
  return null;
}

function checkRequired(value: any, label: string): string | null {
  return isBlank(value) ? `${label} is required.` : null;
}

function setIf(errors: FieldErrors, field: string, msg: string | null) {
  if (msg) errors[field] = msg;
}

// ────────────────────────────────────────────────────────────────────────────
// Per-record-type validators
// ────────────────────────────────────────────────────────────────────────────

export function validateBaptism(form: any): ValidationResult {
  const e: FieldErrors = {};

  setIf(e, 'firstName',     checkRequired(form.firstName, 'First name'));
  setIf(e, 'lastName',      checkRequired(form.lastName,  'Last name'));
  setIf(e, 'dateOfBaptism', checkRequired(form.dateOfBaptism, 'Baptism date'));

  setIf(e, 'firstName',     checkText(form.firstName, 'First name'));
  setIf(e, 'lastName',      checkText(form.lastName,  'Last name'));
  setIf(e, 'placeOfBirth',  checkText(form.placeOfBirth, 'Place of birth'));
  setIf(e, 'fatherName',    checkText(form.fatherName, "Father's name"));
  setIf(e, 'motherName',    checkText(form.motherName, "Mother's name"));
  setIf(e, 'godparentNames',checkText(form.godparentNames, 'Sponsors / godparents', MAX_LONG_TEXT));
  setIf(e, 'priest',        checkText(form.priest, 'Officiating clergy'));
  setIf(e, 'registryNumber',checkText(form.registryNumber, 'Registry number'));

  setIf(e, 'dateOfBirth',   checkDate(form.dateOfBirth, 'Date of birth'));
  setIf(e, 'dateOfBaptism', checkDate(form.dateOfBaptism, 'Baptism date'));

  // Logical ordering: a person can't be baptized before they're born.
  if (!e.dateOfBirth && !e.dateOfBaptism) {
    const birth = parseDate(form.dateOfBirth);
    const baptism = parseDate(form.dateOfBaptism);
    if (birth && baptism && birth.getTime() > baptism.getTime()) {
      e.dateOfBaptism = 'Baptism date must be on or after the date of birth.';
    }
  }

  return Object.keys(e).length === 0 ? { ok: true } : { ok: false, fieldErrors: e };
}

export function validateMarriage(form: any): ValidationResult {
  const e: FieldErrors = {};

  setIf(e, 'groomFirstName', checkRequired(form.groomFirstName, "Groom's first name"));
  setIf(e, 'groomLastName',  checkRequired(form.groomLastName,  "Groom's last name"));
  setIf(e, 'brideFirstName', checkRequired(form.brideFirstName, "Bride's first name"));
  setIf(e, 'brideLastName',  checkRequired(form.brideLastName,  "Bride's last name"));
  setIf(e, 'marriageDate',   checkRequired(form.marriageDate,   'Marriage date'));

  setIf(e, 'groomFirstName', checkText(form.groomFirstName, "Groom's first name"));
  setIf(e, 'groomLastName',  checkText(form.groomLastName,  "Groom's last name"));
  setIf(e, 'brideFirstName', checkText(form.brideFirstName, "Bride's first name"));
  setIf(e, 'brideLastName',  checkText(form.brideLastName,  "Bride's last name"));
  setIf(e, 'groomParents',   checkText(form.groomParents,   "Groom's parents", MAX_LONG_TEXT));
  setIf(e, 'brideParents',   checkText(form.brideParents,   "Bride's parents", MAX_LONG_TEXT));
  setIf(e, 'marriageLocation', checkText(form.marriageLocation, 'Marriage location'));
  setIf(e, 'priest',         checkText(form.priest, 'Officiating clergy'));
  setIf(e, 'witness1',       checkText(form.witness1, 'Witness 1'));
  setIf(e, 'witness2',       checkText(form.witness2, 'Witness 2'));

  setIf(e, 'marriageDate',   checkDate(form.marriageDate, 'Marriage date'));

  return Object.keys(e).length === 0 ? { ok: true } : { ok: false, fieldErrors: e };
}

export function validateFuneral(form: any): ValidationResult {
  const e: FieldErrors = {};

  const first = form.deceasedFirstName ?? form.firstName;
  const last  = form.deceasedLastName  ?? form.lastName;
  const death = form.deathDate         ?? form.dateOfDeath;

  setIf(e, 'firstName',  checkRequired(first, "Deceased's first name"));
  setIf(e, 'lastName',   checkRequired(last,  "Deceased's last name"));
  setIf(e, 'dateOfDeath',checkRequired(death, 'Date of death'));

  setIf(e, 'firstName',  checkText(first, "Deceased's first name"));
  setIf(e, 'lastName',   checkText(last,  "Deceased's last name"));
  setIf(e, 'priest',     checkText(form.priest, 'Officiating clergy'));
  setIf(e, 'burialLocation', checkText(form.burialLocation, 'Burial location'));

  setIf(e, 'dateOfDeath', checkDate(death, 'Date of death'));
  setIf(e, 'burialDate',  checkDate(form.burialDate, 'Burial date'));

  if (!e.dateOfDeath && !e.burialDate) {
    const dDeath = parseDate(death);
    const dBurial = parseDate(form.burialDate);
    if (dDeath && dBurial && dDeath.getTime() > dBurial.getTime()) {
      e.burialDate = 'Burial date must be on or after the date of death.';
    }
  }

  // Age must be a non-negative integer when supplied.
  if (!isBlank(form.age)) {
    const n = Number(form.age);
    if (!Number.isFinite(n) || n < 0 || n > 150 || !Number.isInteger(n)) {
      e.age = 'Age must be a whole number between 0 and 150.';
    }
  }

  return Object.keys(e).length === 0 ? { ok: true } : { ok: false, fieldErrors: e };
}

// ────────────────────────────────────────────────────────────────────────────
// Dispatch
// ────────────────────────────────────────────────────────────────────────────

export function validateRecord(recordType: string, form: any): ValidationResult {
  switch (recordType) {
    case 'marriage': return validateMarriage(form);
    case 'funeral':  return validateFuneral(form);
    case 'baptism':
    default:         return validateBaptism(form);
  }
}
