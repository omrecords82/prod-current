#!/usr/bin/env node
/**
 * Verification script to ensure all routes use correct database imports
 * Checks that no routes import '../database' (which doesn't exist in dist)
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ROUTES_DIR = path.join(DIST_DIR, 'routes');

let errors = [];
let warnings = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(DIST_DIR, filePath);
  
  // Check for problematic imports
  if (content.includes("require('../database')") || 
      content.includes('require("../database")') ||
      content.includes("require('../../database')") ||
      content.includes('require("../../database")')) {
    errors.push(`❌ ${relativePath}: Contains require('../database') which doesn't exist in dist`);
  }
  
  // Check for DatabaseManager.getPool() usage (should use getAppPool instead)
  if (content.includes('DatabaseManager.getPool()')) {
    errors.push(`❌ ${relativePath}: Uses DatabaseManager.getPool() - should use getAppPool()`);
  }
  
  // Warn if using '../config/db' instead of '../../config/db-compat' (works but inconsistent)
  if (content.includes("require('../config/db')") && !content.includes('interactiveReports')) {
    warnings.push(`⚠️  ${relativePath}: Uses '../config/db' - consider '../../config/db-compat' for consistency`);
  }
}

function checkDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory does not exist: ${dir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      checkDirectory(fullPath);
    } else if (file.name.endsWith('.js') && !file.name.endsWith('.backup') && !file.name.endsWith('.back')) {
      checkFile(fullPath);
    }
  }
}

// Verify required config files exist
function verifyConfigFiles() {
  const requiredFiles = [
    'dist/config/db.js',
    'dist/config/db-compat.js'
  ];
  
  for (const file of requiredFiles) {
    const fullPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) {
      errors.push(`❌ Missing required file: ${file}`);
    } else {
      console.log(`✅ Found: ${file}`);
    }
  }
}

console.log('🔍 Verifying database imports in dist/routes...\n');

// Check config files first
verifyConfigFiles();
console.log('');

// Check all route files
if (fs.existsSync(ROUTES_DIR)) {
  checkDirectory(ROUTES_DIR);
} else {
  errors.push(`❌ Routes directory does not exist: ${ROUTES_DIR}`);
}

// Report results
console.log('\n📊 Results:\n');

if (warnings.length > 0) {
  console.log('⚠️  Warnings:');
  warnings.forEach(w => console.log(`   ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ Errors found:');
  errors.forEach(e => console.log(`   ${e}`));
  console.log('\n❌ Verification FAILED');
  process.exit(1);
} else {
  console.log('✅ All database imports are correct!');
  console.log('✅ No require("../database") found');
  console.log('✅ No DatabaseManager.getPool() usage found');
  process.exit(0);
}
