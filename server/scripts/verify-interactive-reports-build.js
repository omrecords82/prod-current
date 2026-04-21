/**
 * Verification script for interactive reports build
 * Checks that all required files exist in dist/ after build
 */

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

const requiredFiles = [
  'routes/interactiveReports.js',
  'utils/tokenUtils.js',
  'utils/emailService.js',
  'middleware/rateLimiter.js',
  'config/db.js',
  'middleware/auth.js',
];

console.log('🔍 Verifying interactive reports build...\n');

let allFound = true;

for (const file of requiredFiles) {
  const fullPath = path.join(DIST, file);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFound = false;
  }
}

console.log('');

if (allFound) {
  console.log('✅ All required files found in dist/');
  console.log('✅ Build verification passed');
  process.exit(0);
} else {
  console.log('❌ Some required files are missing');
  console.log('❌ Run: npm run build');
  process.exit(1);
}
