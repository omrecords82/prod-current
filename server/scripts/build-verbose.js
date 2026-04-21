#!/usr/bin/env node
/**
 * Verbose Build Script
 * Shows detailed progress like deploy-config-updates.sh
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator(color = 'green') {
  log(color, '━'.repeat(70));
}

function runCommand(cmd, description) {
  try {
    console.log();
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log('red', `✗ ${description} failed`);
    return false;
  }
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    log('green', `✓ ${description}`);
    return true;
  } else {
    log('red', `✗ ${description}`);
    return false;
  }
}

async function build() {
  separator('green');
  log('green', '  OrthodoxMetrics Backend - Verbose Build');
  separator('green');
  console.log();

  // Step 1: Clean
  log('yellow', '1/7 Cleaning previous build...');
  if (!runCommand('npm run build:clean', 'Clean')) {
    process.exit(1);
  }
  log('green', '✓ Build directory cleaned');
  console.log();

  // Step 2: TypeScript compilation
  log('yellow', '2/7 Compiling TypeScript...');
  if (!runCommand('npm run build:ts', 'TypeScript compilation')) {
    process.exit(1);
  }
  log('green', '✓ TypeScript compiled successfully');
  console.log();

  // Step 3: Copy assets
  log('yellow', '3/7 Copying assets and resources...');
  if (!runCommand('npm run build:copy', 'Copy assets')) {
    process.exit(1);
  }
  log('green', '✓ Assets copied');
  console.log();

  // Step 4: Post-build library
  log('yellow', '4/7 Running post-build library tasks...');
  if (!runCommand('npm run build:post-library', 'Post-build library')) {
    process.exit(1);
  }
  log('green', '✓ Library tasks completed');
  console.log();

  // Step 5: Verify build
  log('yellow', '5/7 Verifying build output...');
  if (!runCommand('npm run build:verify', 'Build verification')) {
    process.exit(1);
  }
  log('green', '✓ Build verification passed');
  console.log();

  // Step 6: Import checks
  log('yellow', '6/7 Checking imports...');
  if (!runCommand('npm run build:verify:imports', 'Import verification')) {
    process.exit(1);
  }
  log('green', '✓ Import checks passed');
  console.log();

  // Step 7: Flush sessions
  log('yellow', '7/7 Flushing sessions...');
  if (!runCommand('npm run build:flush-sessions', 'Session flush')) {
    process.exit(1);
  }
  log('green', '✓ Sessions flushed');
  console.log();

  // Verify critical files
  separator('blue');
  log('blue', '  Verifying Critical Files');
  separator('blue');
  console.log();

  checkFile('dist/index.js', 'Main entry point (dist/index.js)');
  checkFile('dist/config/index.js', 'Config module (dist/config/index.js)');
  checkFile('dist/config/schema.js', 'Config schema (dist/config/schema.js)');
  checkFile('dist/config/redact.js', 'Config redact (dist/config/redact.js)');
  checkFile('dist/routes/library.js', 'Library routes (dist/routes/library.js)');
  console.log();

  // Success summary
  separator('green');
  log('green', '  Build Complete!');
  separator('green');
  console.log();
  
  log('blue', 'Build artifacts:');
  console.log('  • Compiled files: dist/');
  console.log('  • Entry point: dist/index.js');
  console.log('  • Config module: dist/config/');
  console.log();
  
  log('yellow', 'Next steps:');
  console.log('  1. Restart backend: pm2 restart orthodox-backend');
  console.log('  2. Check logs: pm2 logs orthodox-backend --lines 30');
  console.log('  3. Test endpoints:');
  console.log('     - curl http://127.0.0.1:3001/api/system/health');
  console.log('     - curl http://127.0.0.1:3001/api/library/files');
  console.log();
}

// Run the build
build().catch(error => {
  console.error();
  log('red', '✗ Build failed with error:');
  console.error(error);
  process.exit(1);
});
