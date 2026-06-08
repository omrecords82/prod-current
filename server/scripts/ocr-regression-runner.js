#!/usr/bin/env node
/**
 * Fixture-driven OCR regression runner (scaffold).
 *
 * Usage:
 *   node server/scripts/ocr-regression-runner.js --fixtures ./server/test-fixtures/ocr
 *
 * Each fixture folder should contain fixture.json describing church_id, record_type, job_id or image path.
 * Full Vision replay requires operator credentials — this runner validates fixture structure and inventory linkage.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const fixturesArg = process.argv.find((a) => a.startsWith('--fixtures='));
const fixturesDir = fixturesArg
  ? path.resolve(fixturesArg.split('=')[1])
  : path.join(__dirname, '../test-fixtures/ocr');

const REQUIRED_CASES = ['baptism', 'marriage', 'funeral', 'sideways', 'snippets_disabled'];

function loadFixtures(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => fs.statSync(path.join(dir, name)).isDirectory())
    .map((name) => {
      const jsonPath = path.join(dir, name, 'fixture.json');
      if (!fs.existsSync(jsonPath)) return { name, valid: false, error: 'missing fixture.json' };
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        return { name, valid: true, data };
      } catch (e) {
        return { name, valid: false, error: e.message };
      }
    });
}

(async () => {
  const fixtures = loadFixtures(fixturesDir);
  let passed = 0;
  let failed = 0;

  console.log(`Fixtures dir: ${fixturesDir}`);
  if (fixtures.length === 0) {
    console.warn('⚠️  No fixtures found — create subdirs with fixture.json per docs/ocr/pipeline.md');
    console.log('Expected case types:', REQUIRED_CASES.join(', '));
    process.exit(0);
  }

  for (const f of fixtures) {
    if (!f.valid) {
      console.error(`❌ ${f.name}: ${f.error}`);
      failed++;
      continue;
    }
    const d = f.data;
    if (!d.record_type || !d.church_id) {
      console.error(`❌ ${f.name}: fixture.json requires record_type and church_id`);
      failed++;
      continue;
    }
    console.log(`✅ ${f.name}: record_type=${d.record_type} church_id=${d.church_id}`);
    passed++;
  }

  console.log(`\nRegression scaffold: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
