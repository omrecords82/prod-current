#!/usr/bin/env node

/**
 * Build History Logger
 * Tracks build history with file changes for both backend and frontend
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const HISTORY_FILE = path.join(ROOT, 'build-history.json');
const MAX_HISTORY_ENTRIES = 100; // Keep last 100 builds

/**
 * Get file hash for change detection
 */
function getFileHash(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

/**
 * Get file stats
 */
function getFileStats(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.statSync(filePath);
  } catch (error) {
    return null;
  }
}

/**
 * Recursively find all files in a directory
 */
function findFiles(dir, baseDir = dir, extensions = ['.js', '.ts', '.tsx', '.jsx']) {
  const files = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);
    
    // Skip node_modules, dist, .git, etc.
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }
    
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, baseDir, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.length === 0 || extensions.includes(ext)) {
        files.push(relPath);
      }
    }
  }
  
  return files;
}

/**
 * Compare two file states and return changed files
 */
function compareFileStates(oldState, newState) {
  const changed = [];
  const added = [];
  const removed = [];
  
  // Check for changed and removed files
  for (const [file, hash] of Object.entries(oldState)) {
    if (!(file in newState)) {
      removed.push(file);
    } else if (newState[file] !== hash) {
      changed.push(file);
    }
  }
  
  // Check for added files
  for (const file of Object.keys(newState)) {
    if (!(file in oldState)) {
      added.push(file);
    }
  }
  
  return { changed, added, removed };
}

/**
 * Load build history
 */
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('⚠️  Could not load build history:', error.message);
  }
  
  return {
    builds: [],
    lastState: {}
  };
}

/**
 * Save build history
 */
function saveHistory(history) {
  try {
    // Keep only last N builds
    if (history.builds.length > MAX_HISTORY_ENTRIES) {
      history.builds = history.builds.slice(-MAX_HISTORY_ENTRIES);
    }
    
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Failed to save build history:', error.message);
  }
}

/**
 * Get current file state for a directory
 */
function getFileState(dir, baseDir = dir, extensions = ['.js', '.ts']) {
  const files = findFiles(dir, baseDir, extensions);
  const state = {};
  
  for (const file of files) {
    const fullPath = path.join(baseDir, file);
    const hash = getFileHash(fullPath);
    if (hash) {
      state[file] = hash;
    }
  }
  
  return state;
}

/**
 * Record a build
 */
function recordBuild(type, changedFiles, buildTime, success = true) {
  const history = loadHistory();
  const timestamp = new Date().toISOString();
  
  const buildRecord = {
    id: `build-${Date.now()}`,
    timestamp,
    type, // 'backend', 'frontend', or 'full'
    success,
    buildTime, // in seconds
    files: {
      changed: changedFiles.changed || [],
      added: changedFiles.added || [],
      removed: changedFiles.removed || []
    },
    totalFiles: {
      changed: (changedFiles.changed || []).length,
      added: (changedFiles.added || []).length,
      removed: (changedFiles.removed || []).length
    }
  };
  
  history.builds.push(buildRecord);
  
  // Update last state if build was successful
  if (success && type === 'backend') {
    history.lastState.backend = changedFiles.newState || {};
  } else if (success && type === 'frontend') {
    history.lastState.frontend = changedFiles.newState || {};
  }
  
  saveHistory(history);
  
  return buildRecord;
}

/**
 * Get changed files for backend
 */
function getBackendChanges() {
  const history = loadHistory();
  const lastState = history.lastState.backend || {};
  
  const currentState = getFileState(
    path.join(ROOT, 'routes'),
    path.join(ROOT, 'routes'),
    ['.js']
  );
  
  // Also check src directory for TypeScript files
  const srcState = getFileState(
    path.join(ROOT, 'src'),
    path.join(ROOT, 'src'),
    ['.ts', '.js']
  );
  
  // Merge states
  const newState = { ...currentState, ...srcState };
  
  const changes = compareFileStates(lastState, newState);
  
  return {
    ...changes,
    newState
  };
}

/**
 * Get changed files for frontend
 */
function getFrontendChanges() {
  const history = loadHistory();
  const lastState = history.lastState.frontend || {};
  
  const frontendRoot = path.join(ROOT, '..', 'front-end');
  const currentState = getFileState(
    path.join(frontendRoot, 'src'),
    path.join(frontendRoot, 'src'),
    ['.ts', '.tsx', '.js', '.jsx']
  );
  
  const changes = compareFileStates(lastState, currentState);
  
  return {
    ...changes,
    newState: currentState
  };
}

/**
 * Display build history
 */
function displayHistory(limit = 10) {
  const history = loadHistory();
  const recentBuilds = history.builds.slice(-limit).reverse();
  
  console.log('\n📜 Build History (Last ' + limit + ' builds)\n');
  console.log('═'.repeat(80));
  
  if (recentBuilds.length === 0) {
    console.log('No build history found.\n');
    return;
  }
  
  for (const build of recentBuilds) {
    const date = new Date(build.timestamp);
    const status = build.success ? '✅' : '❌';
    const typeIcon = build.type === 'backend' ? '🔧' : build.type === 'frontend' ? '🎨' : '🚀';
    
    console.log(`${status} ${typeIcon} ${build.type.toUpperCase()} - ${date.toLocaleString()}`);
    console.log(`   Build time: ${build.buildTime.toFixed(2)}s`);
    
    const total = build.totalFiles.changed + build.totalFiles.added + build.totalFiles.removed;
    if (total > 0) {
      console.log(`   Files: ${build.totalFiles.changed} changed, ${build.totalFiles.added} added, ${build.totalFiles.removed} removed`);
      
      // Show first 5 changed files
      if (build.files.changed.length > 0) {
        const preview = build.files.changed.slice(0, 5);
        preview.forEach(file => console.log(`      - ${file}`));
        if (build.files.changed.length > 5) {
          console.log(`      ... and ${build.files.changed.length - 5} more`);
        }
      }
    } else {
      console.log(`   Files: No changes detected`);
    }
    
    console.log('');
  }
  
  console.log('═'.repeat(80) + '\n');
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'history' || command === 'show') {
    const limit = parseInt(process.argv[3]) || 10;
    displayHistory(limit);
  } else if (command === 'backend-changes') {
    const changes = getBackendChanges();
    console.log(JSON.stringify(changes, null, 2));
  } else if (command === 'frontend-changes') {
    const changes = getFrontendChanges();
    console.log(JSON.stringify(changes, null, 2));
  } else {
    console.log('Usage:');
    console.log('  node build-history.js history [limit]  - Show build history');
    console.log('  node build-history.js backend-changes  - Get backend file changes');
    console.log('  node build-history.js frontend-changes  - Get frontend file changes');
  }
}

/**
 * Get history data (without printing)
 */
function getHistory(limit = 10) {
  const history = loadHistory();
  const recentBuilds = history.builds.slice(-limit).reverse();
  
  return recentBuilds.map(build => ({
    type: build.type,
    timestamp: build.timestamp,
    buildTime: build.buildTime,
    success: build.success,
    files: {
      changed: build.totalFiles.changed,
      added: build.totalFiles.added,
      removed: build.totalFiles.removed
    }
  }));
}

module.exports = {
  recordBuild,
  getBackendChanges,
  getFrontendChanges,
  displayHistory,
  loadHistory,
  getHistory
};

