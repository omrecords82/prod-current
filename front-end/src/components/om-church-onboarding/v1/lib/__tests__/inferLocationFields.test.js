/**
 * Tests for inferLocationFields. The front-end has no configured test runner
 * (no vitest/jest), so this is a self-contained spec runnable with plain Node:
 *
 *   node src/components/om-church-onboarding/v1/lib/__tests__/inferLocationFields.test.js
 *
 * It uses node:assert and a tiny harness so it needs zero dependencies.
 */
import assert from 'node:assert/strict';
import {
  inferLocationFields,
  reconcileInferredLocation,
  resolveStateCode,
  extractZipFromAddress,
} from '../inferLocationFields.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
}

console.log('inferLocationFields');

// ── Verification cases ──────────────────────────────────────────────
const CASES = [
  { city: 'Anchorage', state: 'AK', tz: 'America/Anchorage', primary: '99501' },
  { city: 'New York', state: 'NY', tz: 'America/New_York', primary: '10001' },
  { city: 'Chicago', state: 'IL', tz: 'America/Chicago', primary: '60601' },
  { city: 'Phoenix', state: 'AZ', tz: 'America/Phoenix', primary: '85001' },
  { city: 'Honolulu', state: 'HI', tz: 'Pacific/Honolulu', primary: '96813' },
];

for (const c of CASES) {
  test(`${c.city}, ${c.state} → US + ${c.tz} + suggested ZIP + multiple alternatives`, () => {
    const r = inferLocationFields({ city: c.city, state: c.state });
    assert.deepEqual(r.country, { value: 'United States', source: 'city_state', confidence: 'high' });
    assert.equal(r.timezone.value, c.tz);
    assert.equal(r.timezone.confidence, 'high');
    assert.equal(r.zip.value, c.primary);
    assert.equal(r.zip.source, 'city_state');
    assert.equal(r.zip.confidence, 'suggested');
    assert.ok(Array.isArray(r.zip.alternatives) && r.zip.alternatives.length > 1, 'multiple ZIP alternatives');
    assert.ok(r.zip.alternatives.includes(c.primary), 'alternatives include the primary');
  });
}

// ── State resolution ────────────────────────────────────────────────
test('resolveStateCode accepts code, lowercase, and full name', () => {
  assert.equal(resolveStateCode('AK'), 'AK');
  assert.equal(resolveStateCode('ak'), 'AK');
  assert.equal(resolveStateCode('Alaska'), 'AK');
  assert.equal(resolveStateCode('Narnia'), null);
});

test('full state name input still infers (Alaska → US + Anchorage TZ)', () => {
  const r = inferLocationFields({ city: 'Anchorage', state: 'Alaska' });
  assert.equal(r.country.value, 'United States');
  assert.equal(r.timezone.value, 'America/Anchorage');
});

// ── Address ZIP precedence (req 5) ──────────────────────────────────
test('extractZipFromAddress pulls a 5-digit ZIP (and +4)', () => {
  assert.equal(extractZipFromAddress('123 Main St, Anchorage, AK 99502'), '99502');
  assert.equal(extractZipFromAddress('123 Main St 99502-1234'), '99502');
  assert.equal(extractZipFromAddress('no zip here'), null);
});

test('address-derived ZIP overrides city/state ZIP, with high confidence', () => {
  const r = inferLocationFields({ city: 'Anchorage', state: 'AK', address: '500 W 5th Ave, Anchorage, AK 99502' });
  assert.equal(r.zip.value, '99502');
  assert.equal(r.zip.source, 'address');
  assert.equal(r.zip.confidence, 'high');
  // still exposes city/state alternatives for manual change
  assert.ok(r.zip.alternatives.length > 1);
});

// ── Graceful no-ops ─────────────────────────────────────────────────
test('unrecognized state → no country/timezone/zip', () => {
  const r = inferLocationFields({ city: 'Toronto', state: 'ON' });
  assert.equal(r.country, undefined);
  assert.equal(r.timezone, undefined);
  assert.equal(r.zip, undefined);
});

test('known state but unknown city → country + timezone, no ZIP suggestion', () => {
  const r = inferLocationFields({ city: 'Nowheresville', state: 'AK' });
  assert.equal(r.country.value, 'United States');
  assert.equal(r.timezone.value, 'America/Anchorage');
  assert.equal(r.zip, undefined);
});

test('empty input → empty result', () => {
  assert.deepEqual(inferLocationFields({}), {});
  assert.deepEqual(inferLocationFields(), {});
});

// ── City-level timezone override ────────────────────────────────────
test('city override beats state default (El Paso, TX → Denver)', () => {
  const r = inferLocationFields({ city: 'El Paso', state: 'TX' });
  assert.equal(r.timezone.value, 'America/Denver');
});

// ── reconcileInferredLocation: overwrite / reset rules (req 4 & 6) ───
test('fresh inference applies all fields and records sources', () => {
  const inferred = inferLocationFields({ city: 'Chicago', state: 'IL' });
  const { values, sources } = reconcileInferredLocation(inferred, {}, { cityStateChanged: true });
  assert.equal(values.country, 'United States');
  assert.equal(values.timezone, 'America/Chicago');
  assert.equal(values.zip, '60601');
  assert.equal(sources.zip, 'city_state');
});

test('user-edited ZIP is NOT overwritten when only address changes', () => {
  const inferred = inferLocationFields({ city: 'Chicago', state: 'IL' });
  const { values, sources } = reconcileInferredLocation(inferred, { zip: 'user' }, { cityStateChanged: false });
  assert.equal(values.zip, undefined, 'ZIP not re-applied');
  assert.equal(sources.zip, 'user', 'still user-owned');
  // country/timezone (not user-owned) still fill
  assert.equal(values.country, 'United States');
});

test('city/state change DOES reset a user-edited ZIP (intentional re-infer)', () => {
  const inferred = inferLocationFields({ city: 'Phoenix', state: 'AZ' });
  const { values, sources } = reconcileInferredLocation(inferred, { zip: 'user' }, { cityStateChanged: true });
  assert.equal(values.zip, '85001');
  assert.equal(sources.zip, 'city_state');
});

test('address-derived ZIP (high) applies over a city_state-sourced field', () => {
  const inferred = inferLocationFields({ city: 'Chicago', state: 'IL', address: '100 N State St, Chicago, IL 60602' });
  const { values, sources } = reconcileInferredLocation(inferred, { zip: 'city_state' }, { cityStateChanged: false });
  assert.equal(values.zip, '60602');
  assert.equal(sources.zip, 'address');
});

// ── Summary ─────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
