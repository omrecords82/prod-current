#!/usr/bin/env npx tsx
/**
 * Unit tests for routes/ocr/helpers.ts (OMD-878)
 *
 * Covers the pure helpers used by OCR route handlers:
 *   - validateChurchAccess (auth/role gating)
 *   - splitName (private, via __test__)
 *   - mapFieldsToDbColumns (baptism/marriage/funeral mappings)
 *   - buildInsertQuery (SQL builder)
 *
 * resolveChurchDb is NOT tested here — it requires a real DB pool.
 *
 * Run: npx tsx server/src/routes/ocr/__tests__/helpers.test.ts
 *
 * Exits non-zero on any failure.
 */

import {
  validateChurchAccess,
  mapFieldsToDbColumns,
  buildInsertQuery,
  __test__,
} from '../helpers';

const { splitName } = __test__;

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ============================================================================
// validateChurchAccess
// ============================================================================
console.log('\n── validateChurchAccess ──────────────────────────────────');

// No user → reject
assertEq(validateChurchAccess({}, 1), false, 'no session/user → false');
assertEq(validateChurchAccess({ session: {} }, 1), false, 'session without user → false');
assertEq(validateChurchAccess({ session: { user: null } }, 1), false, 'null session.user → false');

// SuperAdmin: allowed for any church
assertEq(
  validateChurchAccess({ session: { user: { role: 'superadmin', church_id: 99 } } }, 1),
  true,
  'superadmin → access any church'
);

// Admin: allowed for any church
assertEq(
  validateChurchAccess({ session: { user: { role: 'admin', church_id: 99 } } }, 1),
  true,
  'admin → access any church'
);

// Regular user: must match their church
assertEq(
  validateChurchAccess({ session: { user: { role: 'user', church_id: 5 } } }, 5),
  true,
  'user accessing own church → true'
);
assertEq(
  validateChurchAccess({ session: { user: { role: 'user', church_id: 5 } } }, 6),
  false,
  'user accessing different church → false'
);

// Falls back to req.user when session.user not present
assertEq(
  validateChurchAccess({ user: { role: 'user', church_id: 7 } }, 7),
  true,
  'falls back to req.user'
);

// req.user with admin role
assertEq(
  validateChurchAccess({ user: { role: 'admin', church_id: 99 } }, 1),
  true,
  'req.user admin → access any church'
);

// Other roles (priest, etc.) without church match → false
assertEq(
  validateChurchAccess({ session: { user: { role: 'priest', church_id: 5 } } }, 6),
  false,
  'priest accessing different church → false'
);
assertEq(
  validateChurchAccess({ session: { user: { role: 'priest', church_id: 5 } } }, 5),
  true,
  'priest accessing own church → true'
);

// ============================================================================
// splitName
// ============================================================================
console.log('\n── splitName ─────────────────────────────────────────────');

assertEq(splitName('John Smith'), { first: 'John', last: 'Smith' }, 'simple two-part name');
assertEq(splitName('John'), { first: 'John', last: null }, 'single-part name → first only, no last');
assertEq(splitName('John Quincy Adams'), { first: 'John Quincy', last: 'Adams' }, 'three-part name → last is final word');
assertEq(splitName(''), { first: null, last: null }, 'empty string → both null');
assertEq(splitName('  '), { first: null, last: null }, 'whitespace only → both null');
assertEq(splitName(null), { first: null, last: null }, 'null → both null');
assertEq(splitName(undefined), { first: null, last: null }, 'undefined → both null');
assertEq(splitName('  John  Smith  '), { first: 'John', last: 'Smith' }, 'whitespace trimmed and collapsed');
assertEq(
  splitName('Mary Jane Watson Parker'),
  { first: 'Mary Jane Watson', last: 'Parker' },
  'four-part name'
);
assertEq(splitName('Madonna'), { first: 'Madonna', last: null }, 'mononym → first only');

// ============================================================================
// mapFieldsToDbColumns — baptism
// ============================================================================
console.log('\n── mapFieldsToDbColumns: baptism ─────────────────────────');

const baptismIn = {
  child_name: 'John Doe',
  date_of_birth: '1985-05-12',
  date_of_baptism: '1985-06-15',
  place_of_birth: 'Boston',
  father_name: 'Michael Doe',
  mother_name: 'Sarah Doe',
  godparents: 'Peter & Anna',
  performed_by: 'Fr. George',
};
const baptismOut = mapFieldsToDbColumns('baptism', baptismIn);
assertEq(baptismOut.first_name, 'John', 'baptism: child first_name');
assertEq(baptismOut.last_name, 'Doe', 'baptism: child last_name');
assertEq(baptismOut.birth_date, '1985-05-12', 'baptism: birth_date');
assertEq(baptismOut.reception_date, '1985-06-15', 'baptism: reception_date from date_of_baptism');
assertEq(baptismOut.birthplace, 'Boston', 'baptism: birthplace');
assertEq(baptismOut.parents, 'Michael Doe, Sarah Doe', 'baptism: parents joined with comma');
assertEq(baptismOut.sponsors, 'Peter & Anna', 'baptism: sponsors');
assertEq(baptismOut.clergy, 'Fr. George', 'baptism: clergy from performed_by');

// Missing optional fields → null
const baptismMin = mapFieldsToDbColumns('baptism', { child_name: 'Jane' });
assertEq(baptismMin.first_name, 'Jane', 'baptism min: first_name');
assertEq(baptismMin.last_name, null, 'baptism min: last_name null when single name');
assertEq(baptismMin.birth_date, null, 'baptism min: missing birth_date → null');
assertEq(baptismMin.parents, null, 'baptism min: no parents → null');

// Only one parent
const baptismOneParent = mapFieldsToDbColumns('baptism', {
  child_name: 'Bob',
  father_name: 'Tom',
});
assertEq(baptismOneParent.parents, 'Tom', 'baptism: single parent (no comma)');

// Empty child_name → both null
const baptismEmpty = mapFieldsToDbColumns('baptism', { child_name: '' });
assertEq(baptismEmpty.first_name, null, 'baptism empty: first_name null');
assertEq(baptismEmpty.last_name, null, 'baptism empty: last_name null');

// ============================================================================
// mapFieldsToDbColumns — marriage
// ============================================================================
console.log('\n── mapFieldsToDbColumns: marriage ────────────────────────');

const marriageIn = {
  groom_name: 'John Smith',
  bride_name: 'Mary Jones',
  date_of_marriage: '2020-06-15',
  groom_parents: 'Tom & Anna Smith',
  bride_parents: 'Bob & Lisa Jones',
  witnesses: 'Peter, Paul',
  license: 'L-1234',
  officiant: 'Fr. George',
};
const marriageOut = mapFieldsToDbColumns('marriage', marriageIn);
assertEq(marriageOut.fname_groom, 'John', 'marriage: groom first');
assertEq(marriageOut.lname_groom, 'Smith', 'marriage: groom last');
assertEq(marriageOut.fname_bride, 'Mary', 'marriage: bride first');
assertEq(marriageOut.lname_bride, 'Jones', 'marriage: bride last');
assertEq(marriageOut.mdate, '2020-06-15', 'marriage: date');
assertEq(marriageOut.parentsg, 'Tom & Anna Smith', 'marriage: groom parents');
assertEq(marriageOut.parentsb, 'Bob & Lisa Jones', 'marriage: bride parents');
assertEq(marriageOut.witness, 'Peter, Paul', 'marriage: witnesses');
assertEq(marriageOut.mlicense, 'L-1234', 'marriage: license');
assertEq(marriageOut.clergy, 'Fr. George', 'marriage: clergy from officiant');

// notes maps to notes column
const marriageNotes = mapFieldsToDbColumns('marriage', {
  groom_name: 'A B',
  bride_name: 'C D',
  notes: 'noted',
});
assertEq(marriageNotes.notes, 'noted', 'marriage: notes maps to notes column');
assertEq(marriageNotes.mlicense, null, 'marriage: license is null when missing');

// priest used as clergy fallback
const marriagePriest = mapFieldsToDbColumns('marriage', {
  groom_name: 'A B',
  bride_name: 'C D',
  priest: 'Fr. Andrew',
});
assertEq(marriagePriest.clergy, 'Fr. Andrew', 'marriage: priest is clergy fallback when officiant missing');

// ============================================================================
// mapFieldsToDbColumns — funeral
// ============================================================================
console.log('\n── mapFieldsToDbColumns: funeral ─────────────────────────');

const funeralIn = {
  deceased_name: 'Robert Brown',
  date_of_death: '2023-01-15',
  date_of_burial: '2023-01-20',
  date_of_funeral: '2023-01-19',
  age_at_death: '85',
  officiant: 'Fr. George',
  place_of_burial: 'Holy Cross Cemetery',
};
const funeralOut = mapFieldsToDbColumns('funeral', funeralIn);
assertEq(funeralOut.name, 'Robert', 'funeral: first name → name');
assertEq(funeralOut.lastname, 'Brown', 'funeral: last name → lastname');
assertEq(funeralOut.deceased_date, '2023-01-15', 'funeral: deceased_date');
assertEq(funeralOut.burial_date, '2023-01-20', 'funeral: burial_date prefers date_of_burial');
assertEq(funeralOut.age, 85, 'funeral: age parsed to number');
assertEq(funeralOut.clergy, 'Fr. George', 'funeral: clergy');
assertEq(funeralOut.burial_location, 'Holy Cross Cemetery', 'funeral: burial location');

// burial_date falls back to date_of_funeral
const funeralFuneralDate = mapFieldsToDbColumns('funeral', {
  deceased_name: 'X Y',
  date_of_funeral: '2024-02-02',
});
assertEq(funeralFuneralDate.burial_date, '2024-02-02', 'funeral: burial_date falls back to date_of_funeral');

// age non-numeric → null
const funeralBadAge = mapFieldsToDbColumns('funeral', {
  deceased_name: 'X Y',
  age_at_death: 'unknown',
});
assertEq(funeralBadAge.age, null, 'funeral: non-numeric age → null');

// age missing → null
const funeralNoAge = mapFieldsToDbColumns('funeral', { deceased_name: 'X Y' });
assertEq(funeralNoAge.age, null, 'funeral: missing age → null');

// ============================================================================
// mapFieldsToDbColumns — unknown record type
// ============================================================================
console.log('\n── mapFieldsToDbColumns: unknown type ────────────────────');

const customFields = { foo: 1, bar: 'baz' };
assertEq(
  mapFieldsToDbColumns('custom', customFields),
  customFields,
  'unknown record type → fields returned unchanged'
);

// ============================================================================
// buildInsertQuery
// ============================================================================
console.log('\n── buildInsertQuery ──────────────────────────────────────');

const q1 = buildInsertQuery('baptism_records', 5, {
  first_name: 'John',
  last_name: 'Doe',
  birth_date: '1985-05-12',
});
assertEq(
  q1.sql,
  'INSERT INTO baptism_records (church_id, first_name, last_name, birth_date) VALUES (?, ?, ?, ?)',
  'INSERT SQL has church_id first, then mapped columns'
);
assertEq(q1.params, [5, 'John', 'Doe', '1985-05-12'], 'INSERT params: churchId then values');

// Empty mapped fields → just church_id
const q2 = buildInsertQuery('foo', 10, {});
assertEq(q2.sql, 'INSERT INTO foo (church_id) VALUES (?)', 'empty mapped → only church_id column');
assertEq(q2.params, [10], 'empty mapped → only churchId param');

// Null values pass through (no filtering)
const q3 = buildInsertQuery('marriage_records', 1, { mdate: null, witness: 'A' });
assertEq(q3.params, [1, null, 'A'], 'null values preserved in params');
assertEq(q3.sql, 'INSERT INTO marriage_records (church_id, mdate, witness) VALUES (?, ?, ?)', 'SQL preserves null columns');

// Column order matches Object.keys order
const q4 = buildInsertQuery('t', 1, { z: 1, a: 2, m: 3 });
assertEq(
  q4.sql,
  'INSERT INTO t (church_id, z, a, m) VALUES (?, ?, ?, ?)',
  'column order matches Object.keys insertion order'
);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
