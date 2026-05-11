#!/usr/bin/env node
/**
 * build-portal-closure.js — read-only.
 *
 * Walks the import graph starting from the 19 lazy components listed in
 * `front-end/src/routes/portalRoutes.tsx` and prints every relative / `@/`
 * import reachable from them. Used to regenerate the 181-file closure that
 * backs the OMD-1560 OM Workshop intake analysis.
 *
 * Usage:
 *   node docs/analysis/portal-workshop-intake/tools/build-portal-closure.js
 *
 * Output: newline-delimited relative paths (sorted).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');
const SRC = path.join(ROOT, 'front-end/src');

const ENTRIES = [
  'front-end/src/routes/portalRoutes.tsx',
  'front-end/src/layouts/portal/ChurchPortalLayout.tsx',
  'front-end/src/features/portal/ChurchPortalHub.tsx',
  'front-end/src/features/portal/PortalSettingsPage.tsx',
  'front-end/src/features/portal/PortalRecordsPage.tsx',
  'front-end/src/features/portal/PortalCertificatesPage.tsx',
  'front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx',
  'front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx',
  'front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx',
  'front-end/src/features/records-centralized/baptism/BaptismRecordEntryPage.tsx',
  'front-end/src/features/records-centralized/marriage/MarriageRecordEntryPage.tsx',
  'front-end/src/features/records-centralized/funeral/FuneralRecordEntryPage.tsx',
  'front-end/src/features/records-centralized/apps/upload-records/UploadRecordsPage.tsx',
  'front-end/src/features/church/apps/om-charts/OMChartsPage.tsx',
  'front-end/src/features/certificates/CertificateGeneratorPage.tsx',
  'front-end/src/features/admin/control-panel/OrthodoxScheduleGuidelinesPage.tsx',
  'front-end/src/features/ocr/pages/OCRStudioPage.tsx',
  'front-end/src/features/devel-tools/om-ocr/pages/OcrReviewPage.tsx',
  'front-end/src/features/help/UserGuide.tsx',
  'front-end/src/features/admin/SiteMapPage.tsx',
];

function tryExt(abs) {
  const exts = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx', ''];
  for (const e of exts) {
    const p = abs + e;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function resolveLocal(fromFile, spec) {
  if (spec.startsWith('.')) return tryExt(path.resolve(path.dirname(fromFile), spec));
  if (spec.startsWith('@/')) return tryExt(path.join(SRC, spec.slice(2)));
  return null;
}

const seen = new Set();
const queue = ENTRIES.map((f) => path.join(ROOT, f));

while (queue.length) {
  const f = queue.shift();
  if (seen.has(f)) continue;
  seen.add(f);
  let body;
  try {
    body = fs.readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  const re = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(body))) {
    const spec = m[1];
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    const r = resolveLocal(f, spec);
    if (r && !seen.has(r)) queue.push(r);
  }
}

const rel = Array.from(seen).map((f) => path.relative(ROOT, f)).sort();
for (const r of rel) console.log(r);
console.error(`# total: ${rel.length}`);
