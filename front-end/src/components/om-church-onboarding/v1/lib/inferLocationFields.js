/**
 * inferLocationFields — local, deterministic enrollment location inference.
 *
 * Given a partial address (city / state / address / country) it infers Country,
 * Timezone and Postal code with metadata, so the enrollment form can pre-fill
 * fields while letting the user override. No network access of any kind.
 *
 * @typedef {'city_state' | 'address' | 'user'} InferSource
 * @typedef {'high' | 'suggested'} InferConfidence
 * @typedef {Object} InferredField
 * @property {string} value                 - the inferred value
 * @property {InferSource} source           - where the value came from
 * @property {InferConfidence} confidence   - 'high' for deterministic, 'suggested' for assistive
 * @property {string[]} [alternatives]      - other valid values (e.g. ZIPs), when applicable
 * @typedef {Object} InferredLocation
 * @property {InferredField} [country]
 * @property {InferredField} [timezone]
 * @property {InferredField} [zip]
 */

import {
  US_STATE_NAMES,
  STATE_TIMEZONES,
  CITY_TIMEZONE_OVERRIDES,
  US_POSTAL_DATA,
} from './locationData.js';

const FULL_NAME_TO_CODE = Object.fromEntries(
  Object.entries(US_STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
);

/** Normalize a city name for use as a lookup key. */
export function normalizeCity(city) {
  return String(city || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolve a free-text state value to its canonical 2-letter US code, or null
 * if it isn't a recognized US state/territory. Accepts "AK", "ak", "Alaska".
 */
export function resolveStateCode(state) {
  const s = String(state || '').trim();
  if (!s) return null;
  const upper = s.toUpperCase();
  if (US_STATE_NAMES[upper]) return upper;
  const byName = FULL_NAME_TO_CODE[s.toLowerCase()];
  return byName || null;
}

/** Extract the first US ZIP (5-digit, optional +4) found in an address string. */
export function extractZipFromAddress(address) {
  const m = String(address || '').match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

/**
 * Infer location fields from a partial address. Only fields that can be
 * determined are present on the result.
 *
 * @param {{ city?: string, state?: string, address?: string, country?: string }} [input]
 * @returns {InferredLocation}
 */
export function inferLocationFields(input = {}) {
  const { city = '', state = '', address = '' } = input;
  /** @type {InferredLocation} */
  const result = {};

  const stateCode = resolveStateCode(state);
  const cityKey = normalizeCity(city);

  // 1. Country — recognized US state ⇒ United States (deterministic).
  if (stateCode) {
    result.country = { value: 'United States', source: 'city_state', confidence: 'high' };
  }

  // 2. Timezone — city override first, then state default (deterministic).
  if (stateCode) {
    const tz =
      (cityKey && CITY_TIMEZONE_OVERRIDES[`${cityKey}|${stateCode}`]) ||
      STATE_TIMEZONES[stateCode] ||
      null;
    if (tz) {
      result.timezone = { value: tz, source: 'city_state', confidence: 'high' };
    }
  }

  // 3. Postal code — address-derived ZIP takes precedence over city/state.
  const addressZip = extractZipFromAddress(address);
  const postal = stateCode && cityKey ? US_POSTAL_DATA[`${cityKey}|${stateCode}`] : null;

  if (addressZip) {
    result.zip = {
      value: addressZip,
      source: 'address',
      confidence: 'high',
      // Still expose city/state alternatives so the user can pick another.
      ...(postal ? { alternatives: postal.alternatives } : {}),
    };
  } else if (postal) {
    result.zip = {
      value: postal.primary,
      source: 'city_state',
      confidence: 'suggested',
      alternatives: postal.alternatives,
    };
  }

  return result;
}

/**
 * Decide which inferred values should be applied to the form, honoring user
 * edits. Pure (no React) so the overwrite/reset rules are unit-testable.
 *
 * Rule: apply an inferred field unless the user has taken ownership of it —
 * except when city/state just changed, which is an intentional re-inference
 * that resets prior auto-fills (and user edits to the auto-filled fields).
 *
 * @param {InferredLocation} inferred
 * @param {Partial<Record<'country'|'timezone'|'zip', InferSource>>} [prevSources]
 * @param {{ cityStateChanged?: boolean }} [opts]
 * @returns {{ values: Record<string,string>, sources: Partial<Record<'country'|'timezone'|'zip', InferSource>> }}
 */
export function reconcileInferredLocation(inferred, prevSources = {}, opts = {}) {
  const { cityStateChanged = false } = opts;
  /** @type {Record<string,string>} */
  const values = {};
  /** @type {Partial<Record<'country'|'timezone'|'zip', InferSource>>} */
  const sources = { ...prevSources };
  for (const field of /** @type {const} */ (['country', 'timezone', 'zip'])) {
    const suggestion = inferred[field];
    if (!suggestion) continue;
    if (prevSources[field] === 'user' && !cityStateChanged) continue;
    values[field] = suggestion.value;
    sources[field] = suggestion.source;
  }
  return { values, sources };
}

export default inferLocationFields;
