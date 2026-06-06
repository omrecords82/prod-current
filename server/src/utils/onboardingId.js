/**
 * Generate immutable public onboarding identifiers: ONB_<ULID>
 * Crockford Base32 ULID (26 chars) — no external dependency.
 */
const crypto = require('crypto');

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(ms, len) {
  let str = '';
  let t = ms;
  for (let i = len - 1; i >= 0; i--) {
    str = ENCODING.charAt(t % 32) + str;
    t = Math.floor(t / 32);
  }
  return str;
}

function encodeRandom(len) {
  const bytes = crypto.randomBytes(len);
  let str = '';
  for (let i = 0; i < len; i++) {
    str += ENCODING.charAt(bytes[i] % 32);
  }
  return str;
}

function generateUlid() {
  return encodeTime(Date.now(), 10) + encodeRandom(16);
}

function generateOnboardingRequestId() {
  return `ONB_${generateUlid()}`;
}

function isValidOnboardingRequestId(id) {
  return typeof id === 'string' && /^ONB_[0-9A-HJKMNP-TV-Z]{26}$/.test(id);
}

module.exports = {
  generateUlid,
  generateOnboardingRequestId,
  isValidOnboardingRequestId,
};
