#!/usr/bin/env node
/**
 * Fix Router Exports
 * 
 * Ensures churchOcrRoutes.js has both ES module and CommonJS exports
 * This script should be run after TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

const routerFile = path.join(__dirname, '../dist/routes/churchOcrRoutes.js');

console.log('Fixing router exports in:', routerFile);

if (!fs.existsSync(routerFile)) {
  console.log('⏭️  Router file not found (removed during refactor), skipping');
  process.exit(0);
}

let content = fs.readFileSync(routerFile, 'utf8');

// Check if module.exports already exists
if (content.includes('module.exports = router;')) {
  console.log('✅ module.exports already present');
  process.exit(0);
}

// Find the exports.default line and add module.exports after it
const exportPattern = /exports\.default\s*=\s*router\s*;/;
if (!exportPattern.test(content)) {
  console.error('❌ Could not find exports.default = router;');
  process.exit(1);
}

// Replace exports.default = router; with both exports
// IMPORTANT: Avoid overwriting module.exports entirely to prevent circular dependency issues
// The compiled code already has exports.default = router from TypeScript
// We just need to ensure module.exports.default is set for CommonJS compatibility
// DO NOT use module.exports = router as it overwrites the entire exports object
const exportLine = 'exports.default = router;';
if (content.includes(exportLine)) {
  // Check if module.exports assignment already exists
  if (!content.includes('module.exports = router;')) {
    // Add module.exports.default only (don't overwrite module.exports)
    content = content.replace(
      exportLine,
      `${exportLine}\n// CommonJS compatibility: set default without overwriting module.exports\n// This avoids circular dependency warnings\nmodule.exports.default = router;\n// For direct require() compatibility, also set module.exports if it's empty\nif (!module.exports || Object.keys(module.exports).length === 0 || module.exports === exports) {\n    module.exports = router;\n}\n`
    );
  }
}

fs.writeFileSync(routerFile, content, 'utf8');
console.log('✅ Added module.exports to router file');
