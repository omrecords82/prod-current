/*
  Post-build copy step to make dist/ self-contained.
  - Copies JS runtime modules that are not emitted by tsc
  - Preserves directory structure under dist/
*/

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

async function copyDir(srcRel, destRel, { filter } = {}) {
  const src = path.join(ROOT, srcRel);
  const dest = path.join(DIST, destRel);
  if (!exists(src)) return; // nothing to copy
  await fse.ensureDir(dest);
  await fse.copy(src, dest, {
    overwrite: true,
    filter: (srcPath) => {
      if (typeof filter === 'function') return filter(srcPath);
      // default: exclude TypeScript sources from copy
      return !srcPath.endsWith('.ts') && !srcPath.endsWith('.tsx');
    }
  });
  console.log(`[build-copy] Copied ${srcRel} -> ${destRel}`);
}

async function copyFile(srcRel, destRel, { required = false } = {}) {
  const src = path.join(ROOT, srcRel);
  const dest = path.join(DIST, destRel);
  if (!exists(src)) {
    if (required) {
      throw new Error(`Required file not found: ${srcRel}`);
    }
    return; // optional
  }
  await fse.ensureDir(path.dirname(dest));
  await fse.copy(src, dest, { overwrite: true });
  console.log(`[build-copy] Copied ${srcRel} -> ${destRel}`);
}

async function main() {
  // Ensure dist exists
  await fse.ensureDir(DIST);

  // All source code now lives under src/. TypeScript files are compiled by tsc,
  // but plain .js files need to be copied into dist/ since allowJs may be off.
  // The dist/ layout mirrors src/ but without the src/ prefix:
  //   src/routes/    -> dist/routes/
  //   src/api/       -> dist/api/
  //   src/middleware/ -> dist/middleware/
  //   etc.

  // Core JS modules from src/
  await copyDir('src/api', 'api');
  await copyDir('src/routes', 'routes');
  await copyDir('src/middleware', 'middleware');
  await copyDir('src/controllers', 'controllers');
  await copyDir('src/services', 'services');
  await copyDir('src/utils', 'utils');
  await copyDir('src/config', 'config');
  await copyDir('src/models', 'models');
  await copyDir('src/dal', 'dal');
  await copyDir('src/integrations', 'integrations');
  await copyDir('src/webhooks', 'webhooks');
  await copyDir('src/websockets', 'websockets');
  await copyDir('src/certificates', 'certificates');
  await copyDir('src/modules', 'modules');
  await copyDir('src/ocr', 'ocr');
  await copyDir('src/workers', 'workers');
  await copyDir('src/features', 'features');
  await copyDir('src/logs', 'logs');
  await copyDir('src/agents', 'agents');
  await copyDir('src/db', 'db');
  await copyDir('src/maintenance', 'maintenance');

  // Database schemas/migrations (not in src/, stays at root)
  await copyDir('database', 'database');

  // Verify critical files in dist/
  const sessionFile = path.join(DIST, 'config/session.js');
  if (!exists(sessionFile)) {
    console.error('[build-copy] ❌ ERROR: dist/config/session.js not found after copy');
  } else {
    console.log('[build-copy] ✅ Verified dist/config/session.js exists');
  }

  const dbFile = path.join(DIST, 'config/db.js');
  if (exists(dbFile)) {
    const dbContent = fs.readFileSync(dbFile, 'utf8');
    if (!dbContent.includes('getAppPool')) {
      console.warn('[build-copy] ⚠️  WARNING: dist/config/db.js may not have getAppPool export');
    } else {
      console.log('[build-copy] ✅ Verified dist/config/db.js has getAppPool export');
    }
  }

  // Static assets to serve from dist/assets
  await copyDir('src/assets', 'assets', {
    filter: () => true // copy everything under assets
  });
}

main().catch((err) => {
  console.error('[build-copy] Failed:', err);
  process.exit(1);
});
