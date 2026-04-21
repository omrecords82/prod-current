/*
  Post-build verification script
  Verifies that the dist folder contains updated code by:
  1. Checking that critical files exist
  2. Comparing modification times of source vs dist files
  3. Verifying recently modified files are in dist
*/

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Files to verify (source -> dist mapping)
// All source code lives under src/
const CRITICAL_FILES = [
  { src: 'src/routes/gallery.js', dist: 'routes/gallery.js', description: 'Gallery routes' },
  { src: 'src/routes/docs.js', dist: 'routes/docs.js', description: 'Documentation routes' },
  { src: 'src/config/db.js', dist: 'config/db.js', description: 'Database config' },
  { src: 'src/config/session.js', dist: 'config/session.js', description: 'Session config' },
];

// Directories to verify exist
const CRITICAL_DIRS = [
  'routes',
  'middleware',
  'config',
  'controllers',
];

function getFileStats(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.statSync(filePath);
  } catch (error) {
    return null;
  }
}

function formatTime(ms) {
  const date = new Date(ms);
  return date.toISOString();
}

function verifyFile(srcPath, distPath, description) {
  const fullSrcPath = path.join(ROOT, srcPath);
  const fullDistPath = path.join(DIST, distPath);
  
  const srcStats = getFileStats(fullSrcPath);
  const distStats = getFileStats(fullDistPath);
  
  if (!srcStats) {
    console.warn(`⚠️  Source file not found: ${srcPath}`);
    return { success: false, reason: 'source_not_found' };
  }
  
  if (!distStats) {
    console.error(`❌ Dist file missing: ${distPath} (${description})`);
    return { success: false, reason: 'dist_missing', file: distPath };
  }
  
  // Check if dist file is newer or same age as source (within 5 seconds tolerance for build time)
  const timeDiff = distStats.mtime.getTime() - srcStats.mtime.getTime();
  const tolerance = 5000; // 5 seconds
  
  if (timeDiff < -tolerance) {
    console.error(`❌ Dist file is older than source: ${distPath} (${description})`);
    console.error(`   Source: ${formatTime(srcStats.mtime.getTime())}`);
    console.error(`   Dist:   ${formatTime(distStats.mtime.getTime())}`);
    return { success: false, reason: 'dist_outdated', file: distPath };
  }
  
  console.log(`✅ ${description}: ${distPath} (${(distStats.size / 1024).toFixed(2)} KB)`);
  return { success: true, file: distPath };
}

function verifyDirectory(dirName) {
  const distDir = path.join(DIST, dirName);
  if (!fs.existsSync(distDir)) {
    console.error(`❌ Dist directory missing: ${dirName}/`);
    return false;
  }
  
  const stats = fs.statSync(distDir);
  if (!stats.isDirectory()) {
    console.error(`❌ Dist path is not a directory: ${dirName}/`);
    return false;
  }
  
  console.log(`✅ Directory exists: ${dirName}/`);
  return true;
}

function main() {
  console.log('\n🔍 Verifying build output...\n');
  console.log(`Source: ${ROOT}`);
  console.log(`Dist:   ${DIST}\n`);
  
  if (!fs.existsSync(DIST)) {
    console.error('❌ Dist directory does not exist!');
    process.exit(1);
  }
  
  let allPassed = true;
  const results = {
    files: [],
    dirs: [],
    errors: []
  };
  
  // Verify critical directories
  console.log('📁 Checking directories...');
  for (const dir of CRITICAL_DIRS) {
    const passed = verifyDirectory(dir);
    results.dirs.push({ dir, passed });
    if (!passed) allPassed = false;
  }
  
  console.log('\n📄 Checking critical files...');
  for (const { src, dist, description } of CRITICAL_FILES) {
    const result = verifyFile(src, dist, description);
    results.files.push({ src, dist, description, ...result });
    if (!result.success) {
      allPassed = false;
      results.errors.push({ file: dist, reason: result.reason });
    }
  }
  
  // Check for recently modified files that might not be in dist
  console.log('\n🔎 Checking for recently modified source files...');
  const routesDir = path.join(ROOT, 'src', 'routes');
  if (fs.existsSync(routesDir)) {
    // Recursively find all .js files in routes directory
    function findJsFiles(dir, baseDir = dir) {
      const files = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath);
        
        if (entry.isDirectory()) {
          files.push(...findJsFiles(fullPath, baseDir));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          files.push({
            name: relPath,
            srcPath: fullPath,
            distPath: path.join(DIST, 'routes', relPath)
          });
        }
      }
      return files;
    }
    
    const routeFiles = findJsFiles(routesDir);
    
    let recentFilesFound = false;
    let checkedCount = 0;
    let upToDateCount = 0;
    
    for (const { name, srcPath, distPath } of routeFiles) {
      checkedCount++;
      const srcStats = getFileStats(srcPath);
      const distStats = getFileStats(distPath);
      
      if (!srcStats) continue;
      
      if (!distStats) {
        const age = Date.now() - srcStats.mtime.getTime();
        if (age < 3600000) {
          console.warn(`⚠️  Missing in dist: routes/${name} (modified ${Math.round(age / 60000)} min ago)`);
          recentFilesFound = true;
        }
      } else if (distStats.mtime < srcStats.mtime) {
        const age = Date.now() - srcStats.mtime.getTime();
        const timeDiff = srcStats.mtime.getTime() - distStats.mtime.getTime();
        // Only warn about files modified in the last hour
        if (age < 3600000) {
          console.warn(`⚠️  Outdated in dist: routes/${name} (source is ${Math.round(timeDiff / 1000)}s newer)`);
          recentFilesFound = true;
        }
      } else {
        upToDateCount++;
      }
    }
    
    if (!recentFilesFound) {
      console.log(`✅ No recently modified files found that are missing from dist`);
      console.log(`   Checked ${checkedCount} route files, ${upToDateCount} are up-to-date in dist`);
    } else {
      console.log(`   Checked ${checkedCount} route files, ${upToDateCount} are up-to-date`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ Build verification PASSED');
    console.log(`   Verified ${results.files.length} files and ${results.dirs.length} directories`);
  } else {
    console.log('❌ Build verification FAILED');
    console.log(`   ${results.errors.length} error(s) found:`);
    results.errors.forEach(err => {
      console.log(`   - ${err.file}: ${err.reason}`);
    });
    console.log('\n💡 Tip: Run "npm run build" again to update dist folder');
  }
  console.log('='.repeat(60) + '\n');
  
  process.exit(allPassed ? 0 : 1);
}

main();

