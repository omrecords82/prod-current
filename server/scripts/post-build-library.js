#!/usr/bin/env node
/**
 * Post-build script to add library router to dist/index.js
 * This runs automatically after the TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

const DIST_INDEX = path.join(__dirname, '../dist/index.js');

console.log('\n📚 [post-build-library] Adding library router to dist/index.js...');

try {
  // Read the compiled index.js
  let content = fs.readFileSync(DIST_INDEX, 'utf8');
  
  // Check if library router is already added (to avoid duplicates)
  if (content.includes('const libraryRouter = require')) {
    console.log('✅ [post-build-library] Library router already present in dist/index.js');
    process.exit(0);
  }
  
  // Add library router import after routerMenuRouter
  const importPattern = /(const routerMenuRouter = require\('\.\/routes\/routerMenu'\);)/;
  if (!importPattern.test(content)) {
    console.error('❌ [post-build-library] Could not find routerMenuRouter import');
    process.exit(1);
  }
  
  content = content.replace(
    importPattern,
    "$1\nconst libraryRouter = require('./routes/library');"
  );
  
  // Add library router mounting after omb router
  const mountPattern = /(app\.use\('\/api\/omb', ombRouter\);)/;
  if (!mountPattern.test(content)) {
    console.error('❌ [post-build-library] Could not find omb router mounting');
    process.exit(1);
  }
  
  content = content.replace(
    mountPattern,
    "$1\n// Library routes for document library management\napp.use('/api/library', libraryRouter);\nconsole.log('✅ [Server] Mounted /api/library routes');"
  );
  
  // Write back to file
  fs.writeFileSync(DIST_INDEX, content, 'utf8');
  
  console.log('✅ [post-build-library] Library router successfully added to dist/index.js');
  process.exit(0);
  
} catch (error) {
  console.error('❌ [post-build-library] Error:', error.message);
  process.exit(1);
}
