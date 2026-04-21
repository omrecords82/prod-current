#!/usr/bin/env node

/**
 * Smart Build Script
 * 
 * Analyzes changed files and only rebuilds what's necessary.
 * Skips expensive clean steps when safe.
 * Professional output with progress bars and spinners.
 * 
 * Usage:
 *   node scripts/build-smart.js           # Smart build
 *   node scripts/build-smart.js --restart  # Smart build + restart PM2 if backend rebuilt
 *   node scripts/build-smart.js --om-verbose  # Show detailed output
 *   node scripts/build-smart.js --om-quiet    # Minimal output
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const buildHistory = require('./build-history');
const BuildProgress = require('./build-progress');
const BuildPresenter = require('./build-presenter');

const execAsync = promisify(exec);

const SERVER_DIR = __dirname + '/..';
const REPO_ROOT = path.resolve(SERVER_DIR, '..');
const FRONTEND_DIR = path.join(REPO_ROOT, 'front-end');
const OM_NFO_PATH = path.join(__dirname, 'om.nfo');

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    restart: args.includes('--restart'),
    verbose: args.includes('--om-verbose'),
    quiet: args.includes('--om-quiet'),
    noProgress: args.includes('--om-no-progress'),
    noBanner: args.includes('--no-banner'),
    noAnim: args.includes('--om-no-anim')
  };
}

/**
 * Spinner state and animation
 */
const spinnerState = {
  interval: null,
  frameIndex: 0,
  currentStageName: '',
  stageStartTime: null,
  buildStartTime: null,
  enabled: false
};

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function startSpinner(args) {
  if (!process.stdout.isTTY || args.quiet || args.noAnim) {
    spinnerState.enabled = false;
    return;
  }
  
  spinnerState.enabled = true;
  spinnerState.buildStartTime = Date.now();
  spinnerState.frameIndex = 0;
  
  spinnerState.interval = setInterval(() => {
    if (!spinnerState.enabled) return;
    
    const frame = SPINNER_FRAMES[spinnerState.frameIndex % SPINNER_FRAMES.length];
    spinnerState.frameIndex++;
    
    const totalElapsed = ((Date.now() - spinnerState.buildStartTime) / 1000).toFixed(1);
    const stageName = spinnerState.currentStageName || 'Analyzing';
    
    const cols = process.stdout.columns || 80;
    const statusLine = ` ${frame}  ${stageName}   (elapsed ${totalElapsed}s)`;
    const padding = ' '.repeat(Math.max(0, cols - statusLine.length - 1));
    
    process.stdout.write(`\r${statusLine}${padding}`);
  }, 100);
}

function stopSpinner() {
  if (spinnerState.interval) {
    clearInterval(spinnerState.interval);
    spinnerState.interval = null;
  }
  
  if (spinnerState.enabled) {
    const cols = process.stdout.columns || 80;
    process.stdout.write('\r' + ' '.repeat(cols - 1) + '\r');
  }
  
  spinnerState.enabled = false;
}

function updateSpinnerStage(stageName) {
  spinnerState.currentStageName = stageName;
  spinnerState.stageStartTime = Date.now();
}

// Thresholds
const FAST_BUILD_THRESHOLD = 5; // If <= 5 files changed, use fast paths

// Force full build patterns
const FORCE_FULL_PATTERNS = [
  /^server\/scripts\//,
  /^server\/tsconfig\.json$/,
  /^server\/package.*\.json$/,
  /^front-end\/vite\.config/,
  /^front-end\/package.*\.json$/,
  /^package.*\.json$/,
  /^package-lock\.json$/,
  /^\.github\//,
  /^tools\//
];

// Backend runtime directories (need copy step)
const BACKEND_RUNTIME_DIRS = [
  'routes',
  'middleware',
  'controllers',
  'dal',
  'database',
  'config'
];

/**
 * Get changed files from git (fallback if build history unavailable)
 */
async function getChangedFilesFromGit() {
  try {
    const { stdout } = await execAsync('git diff --name-only HEAD~1..HEAD', {
      cwd: REPO_ROOT,
      maxBuffer: 10 * 1024 * 1024
    });
    
    return stdout.trim().split('\n').filter(f => f.length > 0);
  } catch (error) {
    // Git not available or no previous commit
    return [];
  }
}

/**
 * Get changed files from build history or git
 */
async function getChangedFiles() {
  const history = buildHistory.loadHistory();
  
  // Try to get from last build state
  const backendChanges = buildHistory.getBackendChanges();
  const frontendChanges = buildHistory.getFrontendChanges();
  
  const allChanged = [
    ...backendChanges.changed.map(f => `server/${f}`),
    ...backendChanges.added.map(f => `server/${f}`),
    ...backendChanges.removed.map(f => `server/${f}`),
    ...frontendChanges.changed.map(f => `front-end/${f}`),
    ...frontendChanges.added.map(f => `front-end/${f}`),
    ...frontendChanges.removed.map(f => `front-end/${f}`)
  ];
  
  // If no changes detected from history, try git as fallback
  if (allChanged.length === 0) {
    return await getChangedFilesFromGit();
  }
  
  return allChanged;
}

/**
 * Classify changed files into categories
 */
function classifyChanges(changedFiles) {
  const backend = [];
  const frontend = [];
  let forceFull = false;
  
  for (const file of changedFiles) {
    // Check force-full patterns first
    const matchesForceFull = FORCE_FULL_PATTERNS.some(pattern => pattern.test(file));
    if (matchesForceFull) {
      forceFull = true;
      continue;
    }
    
    // Classify by path
    if (file.startsWith('server/')) {
      backend.push(file);
    } else if (file.startsWith('front-end/')) {
      frontend.push(file);
    } else if (file.startsWith('docs/') || file.startsWith('scripts/')) {
      // Root-level scripts/docs don't require rebuild
      continue;
    } else {
      // Unknown root-level changes - force full build for safety
      forceFull = true;
    }
  }
  
  return {
    backend,
    frontend,
    forceFull,
    total: changedFiles.length
  };
}

/**
 * Determine if backend needs full clean build
 */
function needsBackendClean(changes) {
  // Force full if dependencies changed
  const hasPackageChanges = changes.some(f => 
    f.includes('package.json') || f.includes('package-lock.json')
  );
  
  if (hasPackageChanges) {
    return true;
  }
  
  // Force full if tsconfig changed
  if (changes.some(f => f.includes('tsconfig.json'))) {
    return true;
  }
  
  return false;
}

/**
 * Determine if only TypeScript files changed (can use incremental)
 */
function onlyTypeScriptChanged(changes) {
  if (changes.length === 0) return false;
  
  return changes.every(f => {
    // Remove server/ prefix if present
    const relPath = f.startsWith('server/') ? f.replace(/^server\//, '') : f;
    // Check if it's a TypeScript file in src/
    if (relPath.startsWith('src/') && (relPath.endsWith('.ts') || relPath.endsWith('.tsx'))) {
      return true;
    }
    return false;
  });
}

/**
 * Determine if runtime files changed (need copy step)
 */
function runtimeFilesChanged(changes) {
  return changes.some(f => {
    // Remove server/ prefix if present
    const relPath = f.startsWith('server/') ? f.replace(/^server\//, '') : f;
    return BACKEND_RUNTIME_DIRS.some(dir => relPath.startsWith(dir + '/') || relPath === dir);
  });
}

/**
 * Determine if frontend needs clean build
 */
function needsFrontendClean(changes) {
  // Force clean if dependencies or vite config changed
  return changes.some(f => 
    f.includes('package.json') || 
    f.includes('package-lock.json') ||
    f.includes('vite.config')
  );
}

/**
 * Run command with buffered output and progress tracking
 */
async function runCommand(command, cwd, label, presenter, stageResults = null) {
  const startTime = Date.now();
  
  // Update spinner with current stage name
  updateSpinnerStage(label);
  
  try {
    const { stdout, stderr } = await execAsync(command, { 
      cwd,
      maxBuffer: 10 * 1024 * 1024
    });
    
    const buildTime = (Date.now() - startTime) / 1000;
    const fullOutput = (stdout || '') + (stderr || '');
    
    // Record warnings
    if (presenter) {
      presenter.recordWarnings(label, fullOutput);
    }
    
    // Print output only in verbose mode
    if (presenter && presenter.verbose) {
      presenter.printCommandOutput(label, stdout, false);
      if (stderr && stderr.trim()) {
        presenter.printCommandOutput(label, stderr, false);
      }
    }
    
    // Record stage result for table
    if (stageResults) {
      stageResults.push({
        name: label,
        status: 'Completed',
        durationSec: buildTime
      });
    }
    
    return { 
      success: true, 
      output: stdout, 
      stderr: stderr || '', 
      buildTime,
      fullOutput 
    };
  } catch (error) {
    const buildTime = (Date.now() - startTime) / 1000;
    const errorOutput = (error.stdout || '') + (error.stderr || '');
    
    // Record failed stage for table
    if (stageResults) {
      stageResults.push({
        name: label,
        status: 'Failed',
        durationSec: buildTime
      });
    }
    
    // Print error summary
    if (presenter) {
      presenter.printErrorSummary(error, label, errorOutput);
    }
    
    throw { ...error, buildTime, output: errorOutput };
  }
}

/**
 * Build backend with smart strategy
 */
async function buildBackendSmart(changes, classification, presenter, progress, stageIndices, stageResults) {
  const backendChanges = buildHistory.getBackendChanges();
  
  let buildType = 'full';
  let totalTime = 0;
  
  if (needsBackendClean(changes)) {
    // Full clean build required - run all stages
    buildType = 'full-clean';
    
    // Stage 1: Clean
    const cleanResult = await runCommand('npm run build:clean', SERVER_DIR, 'Backend Clean', presenter, stageResults);
    totalTime += cleanResult.buildTime || 0;
    if (progress && stageIndices.clean !== undefined) {
      progress.updateStep(stageIndices.clean, true);
    }
    
    // Stage 2: TypeScript
    const tsResult = await runCommand('npm run build:ts', SERVER_DIR, 'Backend TypeScript', presenter, stageResults);
    totalTime += tsResult.buildTime || 0;
    if (progress && stageIndices.ts !== undefined) {
      progress.updateStep(stageIndices.ts, true);
    }
    
    // Stage 3: Copy
    const copyResult = await runCommand('npm run build:copy', SERVER_DIR, 'Backend Copy', presenter, stageResults);
    totalTime += copyResult.buildTime || 0;
    if (progress && stageIndices.copy !== undefined) {
      progress.updateStep(stageIndices.copy, true);
    }
    
    // Stage 4: Verify
    const verifyResult = await runCommand('npm run build:verify', SERVER_DIR, 'Backend Verify', presenter, stageResults);
    totalTime += verifyResult.buildTime || 0;
    if (progress && stageIndices.verify !== undefined) {
      progress.updateStep(stageIndices.verify, true);
    }
    
  } else if (onlyTypeScriptChanged(changes) && !runtimeFilesChanged(changes)) {
    // Only TS files changed - incremental compile only
    buildType = 'incremental-ts';
    
    // Skip clean
    if (stageResults) {
      stageResults.push({ name: 'Backend Clean', status: 'Skipped', durationSec: 0 });
    }
    if (progress && stageIndices.clean !== undefined) {
      progress.updateStep(stageIndices.clean, true);
    }
    
    // Stage: TypeScript
    const tsResult = await runCommand('npm run build:ts', SERVER_DIR, 'Backend TypeScript', presenter, stageResults);
    totalTime += tsResult.buildTime || 0;
    if (progress && stageIndices.ts !== undefined) {
      progress.updateStep(stageIndices.ts, true);
    }
    
    // Skip copy
    if (stageResults) {
      stageResults.push({ name: 'Backend Copy', status: 'Skipped', durationSec: 0 });
    }
    if (progress && stageIndices.copy !== undefined) {
      progress.updateStep(stageIndices.copy, true);
    }
    
    // Stage: Verify
    const verifyResult = await runCommand('npm run build:verify', SERVER_DIR, 'Backend Verify', presenter, stageResults);
    totalTime += verifyResult.buildTime || 0;
    if (progress && stageIndices.verify !== undefined) {
      progress.updateStep(stageIndices.verify, true);
    }
    
  } else if (runtimeFilesChanged(changes)) {
    // Runtime files changed - need copy step
    const nonTsChanges = changes.filter(f => {
      const relPath = f.startsWith('server/') ? f.replace(/^server\//, '') : f;
      return !relPath.startsWith('src/') || (!relPath.endsWith('.ts') && !relPath.endsWith('.tsx'));
    });
    
    if (nonTsChanges.length > 0 && nonTsChanges.every(f => runtimeFilesChanged([f])) && !onlyTypeScriptChanged(changes)) {
      // Copy only (no TS changes)
      buildType = 'copy-only';
      
      // Skip clean
      if (stageResults) {
        stageResults.push({ name: 'Backend Clean', status: 'Skipped', durationSec: 0 });
      }
      if (progress && stageIndices.clean !== undefined) {
        progress.updateStep(stageIndices.clean, true);
      }
      
      // Skip TypeScript
      if (stageResults) {
        stageResults.push({ name: 'Backend TypeScript', status: 'Skipped', durationSec: 0 });
      }
      if (progress && stageIndices.ts !== undefined) {
        progress.updateStep(stageIndices.ts, true);
      }
      
      // Stage: Copy
      const copyResult = await runCommand('npm run build:copy', SERVER_DIR, 'Backend Copy', presenter, stageResults);
      totalTime += copyResult.buildTime || 0;
      if (progress && stageIndices.copy !== undefined) {
        progress.updateStep(stageIndices.copy, true);
      }
      
      // Stage: Verify
      const verifyResult = await runCommand('npm run build:verify', SERVER_DIR, 'Backend Verify', presenter, stageResults);
      totalTime += verifyResult.buildTime || 0;
      if (progress && stageIndices.verify !== undefined) {
        progress.updateStep(stageIndices.verify, true);
      }
    } else {
      // Mixed runtime + TS - full build but no clean
      buildType = 'full-no-clean';
      
      // Skip clean
      if (stageResults) {
        stageResults.push({ name: 'Backend Clean', status: 'Skipped', durationSec: 0 });
      }
      if (progress && stageIndices.clean !== undefined) {
        progress.updateStep(stageIndices.clean, true);
      }
      
      // Stage: TypeScript
      const tsResult = await runCommand('npm run build:ts', SERVER_DIR, 'Backend TypeScript', presenter, stageResults);
      totalTime += tsResult.buildTime || 0;
      if (progress && stageIndices.ts !== undefined) {
        progress.updateStep(stageIndices.ts, true);
      }
      
      // Stage: Copy
      const copyResult = await runCommand('npm run build:copy', SERVER_DIR, 'Backend Copy', presenter, stageResults);
      totalTime += copyResult.buildTime || 0;
      if (progress && stageIndices.copy !== undefined) {
        progress.updateStep(stageIndices.copy, true);
      }
      
      // Stage: Verify
      const verifyResult = await runCommand('npm run build:verify', SERVER_DIR, 'Backend Verify', presenter, stageResults);
      totalTime += verifyResult.buildTime || 0;
      if (progress && stageIndices.verify !== undefined) {
        progress.updateStep(stageIndices.verify, true);
      }
    }
  } else {
    // Default: full build without clean
    buildType = 'full-no-clean';
    
    // Skip clean
    if (stageResults) {
      stageResults.push({ name: 'Backend Clean', status: 'Skipped', durationSec: 0 });
    }
    if (progress && stageIndices.clean !== undefined) {
      progress.updateStep(stageIndices.clean, true);
    }
    
    // Stage: TypeScript
    const tsResult = await runCommand('npm run build:ts', SERVER_DIR, 'Backend TypeScript', presenter, stageResults);
    totalTime += tsResult.buildTime || 0;
    if (progress && stageIndices.ts !== undefined) {
      progress.updateStep(stageIndices.ts, true);
    }
    
    // Stage: Copy
    const copyResult = await runCommand('npm run build:copy', SERVER_DIR, 'Backend Copy', presenter, stageResults);
    totalTime += copyResult.buildTime || 0;
    if (progress && stageIndices.copy !== undefined) {
      progress.updateStep(stageIndices.copy, true);
    }
    
    // Stage: Verify
    const verifyResult = await runCommand('npm run build:verify', SERVER_DIR, 'Backend Verify', presenter, stageResults);
    totalTime += verifyResult.buildTime || 0;
    if (progress && stageIndices.verify !== undefined) {
      progress.updateStep(stageIndices.verify, true);
    }
  }
  
  // Record build
  buildHistory.recordBuild('backend', {
    ...backendChanges,
    buildTime: totalTime
  }, totalTime, true);
  
  return { 
    success: true, 
    buildTime: totalTime, 
    buildType,
    files: backendChanges
  };
}

/**
 * Build frontend with smart strategy
 */
async function buildFrontendSmart(changes, classification, presenter, progress, stepIndex, stageResults) {
  if (!fs.existsSync(FRONTEND_DIR)) {
    throw new Error(`Frontend directory not found: ${FRONTEND_DIR}`);
  }
  
  const frontendChanges = buildHistory.getFrontendChanges();
  
  let buildCommand;
  let buildType = 'full';
  
  if (needsFrontendClean(changes)) {
    buildCommand = 'npm run build:clean';
    buildType = 'full-clean';
  } else {
    buildCommand = 'npm run build';
    buildType = 'incremental';
  }
  
  const result = await runCommand(buildCommand, FRONTEND_DIR, 'Frontend Build', presenter, stageResults);
  
  if (progress && stepIndex !== undefined) {
    progress.updateStep(stepIndex, true);
  }
  
  // Record build
  const buildTime = result.buildTime || 0;
  buildHistory.recordBuild('frontend', {
    ...frontendChanges,
    buildTime
  }, buildTime, result.success !== false);
  
  return { 
    ...result, 
    buildType,
    files: frontendChanges
  };
}

/**
 * Restart PM2 service
 */
async function restartPM2(presenter, progress, stepIndex, stageResults) {
  const result = await runCommand('pm2 restart orthodox-backend', SERVER_DIR, 'PM2 Restart', presenter, stageResults);
  
  if (progress && stepIndex !== undefined) {
    progress.updateStep(stepIndex, true);
  }
  
  return result;
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs();
  
  const presenter = new BuildPresenter({
    verbose: args.verbose,
    quiet: args.quiet,
    showProgress: !args.noProgress
  });
  
  // Print custom header for smart build
  if (!args.quiet) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  OrthodoxMetrics - Smart Build');
    console.log('═══════════════════════════════════════════════════════════\n');
  }
  
  const startTime = Date.now();
  
  // Stage results collection
  const stageResults = [];
  
  try {
    // Get changed files
    updateSpinnerStage('Analyzing changes');
    const changedFiles = await getChangedFiles();
    
    if (changedFiles.length === 0) {
      if (!args.quiet) {
        console.log('✅ No changes detected. Nothing to build.\n');
      }
      process.exit(0);
    }
    
    // Classify changes
    const classification = classifyChanges(changedFiles);
    
    if (!args.quiet) {
      console.log('📊 Change Analysis:');
      console.log(`   Total files: ${classification.total} | Backend: ${classification.backend.length} | Frontend: ${classification.frontend.length}`);
      if (classification.forceFull) {
        console.log('   ⚠️  Force full build (config/scripts changed)');
      }
      console.log('');
    }
    
    // Decision logic
    let buildBackend = false;
    let buildFrontend = false;
    
    if (classification.forceFull) {
      buildBackend = true;
      buildFrontend = true;
    } else {
      if (classification.backend.length > 0) buildBackend = true;
      if (classification.frontend.length > 0) buildFrontend = true;
      
      // Safety fallback
      if (!buildBackend && !buildFrontend && changedFiles.length > 0) {
        buildBackend = true;
        buildFrontend = true;
        classification.forceFull = true;
      }
    }
    
    if (!buildBackend && !buildFrontend) {
      if (!args.quiet) {
        console.log('✅ No builds needed.\n');
      }
      process.exit(0);
    }
    
    // Print build decision
    if (!args.quiet) {
      const buildParts = [];
      if (buildBackend) buildParts.push('Backend');
      if (buildFrontend) buildParts.push('Frontend');
      console.log(`🎯 Building: ${buildParts.join(' + ')}\n`);
    }
    
    // Initialize progress bar
    const progress = args.noProgress ? null : new BuildProgress();
    
    // Add steps based on what we're building
    const stageIndices = {};
    let frontendIndex = null;
    let pm2Index = null;
    
    if (buildBackend) {
      stageIndices.clean = progress ? progress.addStep('Backend Clean', 1) : null;
      stageIndices.ts = progress ? progress.addStep('Backend TypeScript', 1) : null;
      stageIndices.copy = progress ? progress.addStep('Backend Copy', 1) : null;
      stageIndices.verify = progress ? progress.addStep('Backend Verify', 1) : null;
    }
    
    if (buildFrontend) {
      frontendIndex = progress ? progress.addStep('Frontend Build', 1) : null;
    }
    
    if (args.restart && buildBackend) {
      pm2Index = progress ? progress.addStep('PM2 Restart', 1) : null;
    }
    
    // Start animated spinner
    startSpinner(args);
    
    // Execute builds
    let backendResult = null;
    let frontendResult = null;
    
    if (buildBackend && buildFrontend) {
      // Build both in parallel
      [backendResult, frontendResult] = await Promise.all([
        buildBackendSmart(classification.backend, classification, presenter, progress, stageIndices, stageResults),
        buildFrontendSmart(classification.frontend, classification, presenter, progress, frontendIndex, stageResults)
      ]);
    } else if (buildBackend) {
      backendResult = await buildBackendSmart(classification.backend, classification, presenter, progress, stageIndices, stageResults);
    } else if (buildFrontend) {
      frontendResult = await buildFrontendSmart(classification.frontend, classification, presenter, progress, frontendIndex, stageResults);
    }
    
    // Restart PM2 if requested and backend was rebuilt
    let pm2Result = null;
    if (args.restart && backendResult && backendResult.success) {
      pm2Result = await restartPM2(presenter, progress, pm2Index, stageResults);
      
      // Give backend a moment to fully start
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Stop spinner before printing final output
    stopSpinner();
    
    // Clear progress bar
    if (progress && presenter.showProgress) {
      progress.clear();
    }
    
    // Print stage table
    if (!args.quiet && stageResults.length > 0) {
      presenter.printStageTable(stageResults);
    }
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Record full build if both were built
    if (backendResult && frontendResult) {
      const backendChanges = buildHistory.getBackendChanges();
      const frontendChanges = buildHistory.getFrontendChanges();
      buildHistory.recordBuild('full', {
        changed: [...backendChanges.changed, ...frontendChanges.changed],
        added: [...backendChanges.added, ...frontendChanges.added],
        removed: [...backendChanges.removed, ...frontendChanges.removed]
      }, duration, true);
    }
    
    // Print warnings summary
    presenter.printWarningsSummary();
    
    // Print build summary
    presenter.printBuildSummary({
      totalTime: duration,
      backendTime: backendResult ? backendResult.buildTime : 0,
      frontendTime: frontendResult ? frontendResult.buildTime : 0,
      pm2Time: pm2Result ? pm2Result.buildTime : 0,
      backendFiles: backendResult ? backendResult.files : null,
      frontendFiles: frontendResult ? frontendResult.files : null
    });
    
    // Print OM.nfo banner
    if (!args.noBanner) {
      presenter.printOmNfo(OM_NFO_PATH);
    }
    
    // Print build history
    const history = buildHistory.getHistory(5);
    presenter.printBuildHistory(history);
    
    if (!args.quiet) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log(`  ✅ Smart Build Complete! (${duration.toFixed(2)}s)`);
      console.log('═══════════════════════════════════════════════════════════\n');
    }
    
    process.exit(0);
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    
    // Stop spinner on failure
    stopSpinner();
    
    // Print stage table even on failure
    if (!args.quiet && stageResults.length > 0) {
      presenter.printStageTable(stageResults);
    }
    
    presenter.printErrorSummary(error, 'Smart Build', error.output || error.message);
    
    if (!args.quiet) {
      console.error('\n═══════════════════════════════════════════════════════════');
      console.error(`  ❌ Smart Build Failed! (${duration.toFixed(2)}s)`);
      console.error('═══════════════════════════════════════════════════════════\n');
    }
    
    process.exit(1);
  }
}

main();
