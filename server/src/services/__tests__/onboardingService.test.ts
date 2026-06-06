#!/usr/bin/env npx tsx
/**
 * Unit tests for onboarding enrollment lifecycle (ONB_<ULID>)
 * Run: npx tsx server/src/services/__tests__/onboardingService.test.ts
 */

let passed = 0;
let failed = 0;

function assert(cond: unknown, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertThrows(fn: () => void, message: string): void {
  try { fn(); console.error(`  FAIL: ${message} (no throw)`); failed++; }
  catch { console.log(`  PASS: ${message}`); passed++; }
}

const {
  generateOnboardingRequestId,
  isValidOnboardingRequestId,
} = require('../../utils/onboardingId');

const {
  STATUS_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  parseModules,
} = require('../onboardingService');

console.log('\n=== onboardingId ===');
const id = generateOnboardingRequestId();
assert(id.startsWith('ONB_'), 'ONB prefix');
assert(id.length === 30, 'ONB_ + 26 char ULID');
assert(isValidOnboardingRequestId(id), 'valid format');
assert(!isValidOnboardingRequestId('OM-ENR-1'), 'rejects legacy ref');

console.log('\n=== parseModules ===');
assert(JSON.stringify(parseModules({ baptism: true, marriage: false, funeral: true })) === JSON.stringify(['baptism', 'funeral']), 'module filter');
assert(parseModules({}).length === 0, 'empty modules list');

console.log('\n=== status transitions ===');
assert(STATUS_TRANSITIONS.submitted.includes('reviewing'), 'submitted→reviewing');
assert(!STATUS_TRANSITIONS.submitted.includes('active'), 'submitted cannot jump to active');
assert(STATUS_TRANSITIONS.payment_pending.includes('payment_received'), 'payment flow');

console.log('\n=== payment transitions ===');
assert(PAYMENT_TRANSITIONS.pending.includes('paid'), 'pending→paid');
assert(PAYMENT_TRANSITIONS.pending.includes('waived'), 'pending→waived');
assert(!PAYMENT_TRANSITIONS.paid.includes('pending'), 'paid cannot revert to pending');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
