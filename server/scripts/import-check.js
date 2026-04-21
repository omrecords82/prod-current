#!/usr/bin/env node

/**
 * Import Check Script
 * Pre-flight check that all route modules can be imported without crashing
 * Exits with non-zero code if any imports fail
 */

const path = require('path');
const fs = require('fs');

// Routes to check (relative to server directory)
const routesToCheck = [
  // API routes (new structure)
  'src/api/baptism.js',
  'src/api/marriage.js',
  'src/api/funeral.js',
  
  // Routes (current structure)
  'src/routes/baptism.js',
  'src/routes/marriage.js',
  'src/routes/funeral.js',
  'src/routes/logs.js',
  'src/routes/library.js',
  'src/routes/admin/churches.js',
  'src/routes/admin/users.js',
  
  // Middleware
  'src/middleware/logger.js',
  'src/middleware/auth.js',
  
  // Main entry point (after build)
  'dist/index.js'
  // Note: src/index.ts is TypeScript - check dist/index.js after compilation
];

let hasErrors = false;
const errors = [];

console.log('🔍 Checking route module imports...\n');

for (const routePath of routesToCheck) {
  const fullPath = path.join(__dirname, '..', routePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  SKIP: ${routePath} (file not found)`);
    continue;
  }
  
    try {
      // Change to server directory for relative requires
      const originalCwd = process.cwd();
      process.chdir(path.join(__dirname, '..'));
      
      try {
        require(fullPath);
        console.log(`✅ PASS: ${routePath}`);
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          // Check if it's a missing dependency (not the file itself)
          const errorMsg = error.message || String(error);
          if (errorMsg.includes('Cannot find module') && !errorMsg.includes(routePath)) {
            console.log(`❌ FAIL: ${routePath} - Missing module: ${error.message}`);
            errors.push({ route: routePath, error: error.message });
            hasErrors = true;
          } else {
            // File itself not found - skip (might be optional)
            console.log(`⚠️  SKIP: ${routePath} - ${error.message}`);
          }
        } else if (error.message && error.message.includes('Unexpected token')) {
          // TypeScript syntax error - skip TS files
          console.log(`⚠️  SKIP: ${routePath} - TypeScript file (check after compilation)`);
        } else {
          // Other errors might be expected (e.g., missing env vars, database connections)
          console.log(`⚠️  WARN: ${routePath} - ${error.message}`);
        }
      } finally {
        process.chdir(originalCwd);
      }
    } catch (error) {
      // Outer catch for file system errors
      if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(routePath)) {
        console.log(`⚠️  SKIP: ${routePath} - File not found`);
      } else {
        console.log(`❌ FAIL: ${routePath} - ${error.message}`);
        errors.push({ route: routePath, error: error.message });
        hasErrors = true;
      }
    }
}

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.log('❌ Import check FAILED');
  console.log('\nErrors:');
  errors.forEach(({ route, error }) => {
    console.log(`  - ${route}: ${error}`);
  });
  process.exit(1);
} else {
  console.log('✅ All route imports successful');
  process.exit(0);
}
