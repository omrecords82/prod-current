#!/usr/bin/env node
/**
 * List OCR layout templates (extractors) per church and record type.
 *
 * Usage:
 *   node server/scripts/ocr-layout-inventory.js
 *   node server/scripts/ocr-layout-inventory.js --church 1
 *   node server/scripts/ocr-layout-inventory.js --church 1 --json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const churchArg = args.find((a) => a.startsWith('--church='));
const churchId = churchArg ? parseInt(churchArg.split('=')[1], 10) : null;
const asJson = args.includes('--json');

async function main() {
  const { getAppPool } = require(path.join(__dirname, '../src/config/db'));
  const pool = getAppPool();

  let sql = `
    SELECT id, church_id, record_type, name, status, extraction_mode, is_default,
           sample_job_id, header_y_threshold, created_at, updated_at, last_used_at
    FROM ocr_extractors WHERE 1=1`;
  const params = [];
  if (churchId) {
    sql += ' AND (church_id = ? OR church_id IS NULL)';
    params.push(churchId);
  }
  sql += ' ORDER BY church_id, record_type, is_default DESC, id DESC';

  const [rows] = await pool.query(sql, params);

  const inventory = rows.map((r) => ({
    church_id: r.church_id,
    record_type: r.record_type,
    extractor_id: r.id,
    name: r.name,
    status: r.status || 'legacy',
    extraction_mode: r.extraction_mode,
    is_default: !!r.is_default,
    sample_job_id: r.sample_job_id,
    has_header_y: r.header_y_threshold != null,
    last_used_at: r.last_used_at,
  }));

  const outDir = path.join(__dirname, '../../reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `ocr-layout-inventory${churchId ? `-church-${churchId}` : ''}-2026-06-08.json`);
  fs.writeFileSync(outPath, JSON.stringify({ generated: new Date().toISOString(), churchId, count: inventory.length, items: inventory }, null, 2));

  if (asJson) {
    console.log(JSON.stringify(inventory, null, 2));
  } else {
    console.log(`OCR layout inventory: ${inventory.length} extractor(s)`);
    for (const item of inventory) {
      console.log(`  [${item.record_type}] id=${item.extractor_id} status=${item.status} default=${item.is_default} church=${item.church_id ?? 'global'}`);
    }
  }
  console.log(`Written: ${outPath}`);
}

main().catch((err) => {
  console.error('ocr-layout-inventory failed:', err.message);
  process.exit(1);
});
