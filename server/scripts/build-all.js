#!/usr/bin/env node

/**
 * Build script that builds both backend and frontend in parallel,
 * then restarts PM2 orthodox-backend service.
 * 
 * Professional output presentation with --verbose and --quiet modes.
 */

// Load .env file before anything else (so build-event-emitter can access OM_BUILD_EVENT_TOKEN)
try {
    const dotenv = require('dotenv');
    const path = require('path');
    const fs = require('fs');
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const result = dotenv.config({ path: envPath });
        if (result.error) {
            console.warn('⚠️  Failed to load .env file:', result.error.message);
        } else {
            // Verify token was loaded
            const token = process.env.OM_BUILD_EVENT_TOKEN;
            if (token) {
                // Token loaded successfully - trim any whitespace/quotes
                process.env.OM_BUILD_EVENT_TOKEN = token.trim().replace(/^["']|["']$/g, '');
            }
        }
    } else {
        console.warn('⚠️  .env file not found at:', envPath);
    }
} catch (e) {
    // dotenv not available - continue without it
    console.warn('⚠️  dotenv not available:', e.message);
}

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const buildHistory = require('./build-history');
const BuildProgress = require('./build-progress');
const BuildPresenter = require('./build-presenter');
const buildEmitter = require('./build-event-emitter');

const execAsync = promisify(exec);

const SERVER_DIR = __dirname + '/..';
const FRONTEND_DIR = path.join(SERVER_DIR, '..', 'front-end');
const OM_NFO_PATH = path.join(__dirname, 'om.nfo');

/**
 * Parse CLI arguments
 * Uses --om-verbose to avoid npm loglevel conflicts
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
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

/**
 * Spinner frames (Unicode dots)
 */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Start the animated spinner
 */
function startSpinner(args) {
  // Only animate if TTY, not quiet, not noAnim
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
    const stageName = spinnerState.currentStageName || 'Initializing';
    
    // Calculate terminal width (default to 80 if not available)
    const cols = process.stdout.columns || 80;
    const statusLine = ` ${frame}  Running: ${stageName}   (elapsed ${totalElapsed}s)`;
    const padding = ' '.repeat(Math.max(0, cols - statusLine.length - 1));
    
    process.stdout.write(`\r${statusLine}${padding}`);
  }, 100);
}

/**
 * Stop the animated spinner and clear the line
 */
function stopSpinner() {
  if (spinnerState.interval) {
    clearInterval(spinnerState.interval);
    spinnerState.interval = null;
  }
  
  if (spinnerState.enabled) {
    // Clear the spinner line
    const cols = process.stdout.columns || 80;
    process.stdout.write('\r' + ' '.repeat(cols - 1) + '\r');
  }
  
  spinnerState.enabled = false;
}

/**
 * Update the current stage name for the spinner
 */
function updateSpinnerStage(stageName) {
  spinnerState.currentStageName = stageName;
  spinnerState.stageStartTime = Date.now();
}

/**
 * Run command with buffered output (no live printing in default mode)
 */
async function runCommand(command, cwd, label, presenter, progress = null, stageResults = null) {
  const startTime = Date.now();
  
  // Update spinner with current stage name
  updateSpinnerStage(label);
  
  // Emit stage_started event
  await buildEmitter.stageStarted(label).catch(() => {});
  
  try {
    // Buffer all output - don't print live in default mode
    const { stdout, stderr } = await execAsync(command, { 
      cwd,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });
    
    const buildTime = (Date.now() - startTime) / 1000;
    const durationMs = Math.round(buildTime * 1000);
    const fullOutput = (stdout || '') + (stderr || '');
    
    // Emit stage_completed event
    await buildEmitter.stageCompleted(label, durationMs).catch(() => {});
    
    // Record warnings
    presenter.recordWarnings(label, fullOutput);
    
    // Print output only in verbose mode
    if (presenter.verbose) {
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
    
    // Print error summary (always show failures)
    presenter.printErrorSummary(error, label, errorOutput);
    
    throw { ...error, buildTime, output: errorOutput };
  }
}

/**
 * Build backend with buffered output
 */
async function buildBackend(presenter, progress, stageIndices, stageResults) {
  const backendChanges = buildHistory.getBackendChanges();
  const totalBackendTime = { value: 0 };
  let backendOutput = '';
  
  // Stage 1: Clean
  const cleanResult = await runCommand(
    'npm run build:clean', 
    SERVER_DIR, 
    'Backend Clean', 
    presenter, 
    progress,
    stageResults
  );
  totalBackendTime.value += cleanResult.buildTime || 0;
  backendOutput += cleanResult.fullOutput || '';
  if (progress && stageIndices.clean !== undefined) {
    progress.updateStep(stageIndices.clean, true);
  }
  
  // Stage 2: TypeScript Compilation
  const tsResult = await runCommand(
    'npm run build:ts', 
    SERVER_DIR, 
    'Backend TypeScript', 
    presenter, 
    progress,
    stageResults
  );
  totalBackendTime.value += tsResult.buildTime || 0;
  backendOutput += tsResult.fullOutput || '';
  if (progress && stageIndices.ts !== undefined) {
    progress.updateStep(stageIndices.ts, true);
  }
  
  // Stage 3: Copy Files
  const copyResult = await runCommand(
    'npm run build:copy', 
    SERVER_DIR, 
    'Backend Copy', 
    presenter, 
    progress,
    stageResults
  );
  totalBackendTime.value += copyResult.buildTime || 0;
  backendOutput += copyResult.fullOutput || '';
  if (progress && stageIndices.copy !== undefined) {
    progress.updateStep(stageIndices.copy, true);
  }
  
  // Stage 4: Verify Build
  const verifyResult = await runCommand(
    'npm run build:verify', 
    SERVER_DIR, 
    'Backend Verify', 
    presenter, 
    progress,
    stageResults
  );
  totalBackendTime.value += verifyResult.buildTime || 0;
  backendOutput += verifyResult.fullOutput || '';
  if (progress && stageIndices.verify !== undefined) {
    progress.updateStep(stageIndices.verify, true);
  }
  
  // Record build with changes
  buildHistory.recordBuild('backend', {
    ...backendChanges,
    buildTime: totalBackendTime.value
  }, totalBackendTime.value, true);
  
  return { 
    success: true, 
    buildTime: totalBackendTime.value,
    files: backendChanges
  };
}

/**
 * Build frontend with buffered output
 */
async function buildFrontend(presenter, progress, stepIndex, stageResults) {
  if (!fs.existsSync(FRONTEND_DIR)) {
    throw new Error(`Frontend directory not found: ${FRONTEND_DIR}`);
  }
  
  const frontendChanges = buildHistory.getFrontendChanges();
  
  const result = await runCommand(
    'npm run build', 
    FRONTEND_DIR, 
    'Frontend Build', 
    presenter, 
    progress,
    stageResults
  );
  
  // Print Vite summary only in verbose mode (otherwise shown in table)
  if (presenter.verbose) {
    const viteSummary = presenter.extractViteSummary(result.fullOutput);
    presenter.printViteSummary(viteSummary);
  }
  
  if (progress && stepIndex !== undefined) {
    progress.updateStep(stepIndex, true);
  }
  
  // Record build with changes
  const buildTime = result.buildTime || 0;
  buildHistory.recordBuild('frontend', {
    ...frontendChanges,
    buildTime
  }, buildTime, result.success !== false);
  
  return {
    ...result,
    files: frontendChanges
  };
}

/**
 * Restart PM2 with buffered output
 */
async function restartPM2(presenter, progress, stepIndex, stageResults) {
  const stageStartTime = Date.now();
  
  // Emit stage_started for PM2 Restart
  await buildEmitter.stageStarted('PM2 Restart').catch(() => {});
  
  try {
    const result = await runCommand(
      'pm2 restart orthodox-backend', 
      SERVER_DIR, 
      'PM2 Restart', 
      presenter, 
      progress,
      stageResults
    );
    
    if (progress && stepIndex !== undefined) {
      progress.updateStep(stepIndex, true);
    }
    
    // Emit stage_completed for PM2 Restart
    const durationMs = Date.now() - stageStartTime;
    await buildEmitter.stageCompleted('PM2 Restart', durationMs).catch(() => {});
    
    return result;
  } catch (error) {
    // Emit stage failure
    const durationMs = Date.now() - stageStartTime;
    await buildEmitter.emit('stage_completed', {
      stage: 'PM2 Restart',
      message: error.message || 'PM2 restart failed',
      durationMs
    }).catch(() => {});
    throw error;
  }
}

/**
 * Main build function
 */
async function main() {
  const args = parseArgs();
  const presenter = new BuildPresenter({
    verbose: args.verbose,
    quiet: args.quiet,
    showProgress: !args.noProgress
  });
  
  presenter.printHeader();
  
  const startTime = Date.now();
  
  // Emit build_started event and start heartbeat
  try {
    await buildEmitter.startBuild({
      command: process.argv.join(' '),
      env: process.env.NODE_ENV || 'production'
    });
  } catch (err) {
    console.warn('⚠️  Failed to emit build_started event (non-fatal):', err.message);
  }
  
  // Initialize progress bar
  const progress = args.noProgress ? null : new BuildProgress();
  
  // Backend stages (sequential)
  const backendCleanIndex = progress ? progress.addStep('Backend Clean', 1) : null;
  const backendTsIndex = progress ? progress.addStep('Backend TypeScript', 1) : null;
  const backendCopyIndex = progress ? progress.addStep('Backend Copy', 1) : null;
  const backendVerifyIndex = progress ? progress.addStep('Backend Verify', 1) : null;
  
  // Frontend stage (runs in parallel with backend)
  const frontendIndex = progress ? progress.addStep('Frontend Build', 1) : null;
  
  // PM2 restart (runs after both complete)
  const pm2Index = progress ? progress.addStep('PM2 Restart', 1) : null;
  
  const stageIndices = {
    clean: backendCleanIndex,
    ts: backendTsIndex,
    copy: backendCopyIndex,
    verify: backendVerifyIndex
  };
  
  // Stage results collection
  const stageResults = [];
  
  // Start animated spinner (if enabled)
  startSpinner(args);
  
  // Print initial progress bar (0%) - only if not using spinner
  if (!spinnerState.enabled) {
    if (progress && presenter.showProgress && !args.quiet) {
      process.stdout.write(`[${'░'.repeat(50)}] 0%`);
      console.log(' Starting build process…');
    } else if (!args.quiet && !progress) {
      console.log('Starting build process…');
    }
  } else {
    // For non-TTY, print a simple status line
    if (!process.stdout.isTTY && !args.quiet) {
      console.log('Starting build process…');
    }
  }
  
  try {
    // Run backend stages sequentially and frontend build in parallel
    const [backendResult, frontendResult] = await Promise.all([
      buildBackend(presenter, progress, stageIndices, stageResults),
      buildFrontend(presenter, progress, frontendIndex, stageResults)
    ]);
    
    // Restart PM2 service after both builds complete
    const pm2Result = await restartPM2(presenter, progress, pm2Index, stageResults);
    
    // Give backend a moment to fully start after PM2 restart
    // PM2 restart command returns quickly, but backend needs time to bind to port
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Stop spinner before printing final output
    stopSpinner();
    
    // Clear progress bar and print stage table
    if (progress && presenter.showProgress) {
      progress.clear();
    }
    
    // Print stage table
    if (!args.quiet) {
      presenter.printStageTable(stageResults);
    }
    
    // Print final progress bar (100%) - only if not using spinner
    if (!spinnerState.enabled) {
      if (progress && presenter.showProgress && !args.quiet) {
        process.stdout.write(`[${'█'.repeat(50)}] 100%`);
        console.log(' Build & Deploy Complete');
      } else if (!args.quiet && !progress) {
        console.log('Build & Deploy Complete');
      }
    }
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Record full build
    const backendChanges = buildHistory.getBackendChanges();
    const frontendChanges = buildHistory.getFrontendChanges();
    buildHistory.recordBuild('full', {
      changed: [...backendChanges.changed, ...frontendChanges.changed],
      added: [...backendChanges.added, ...frontendChanges.added],
      removed: [...backendChanges.removed, ...frontendChanges.removed]
    }, duration, true);
    
    // Print warnings summary
    presenter.printWarningsSummary();
    
    // Print build summary
    presenter.printBuildSummary({
      totalTime: duration,
      backendTime: backendResult.buildTime,
      frontendTime: frontendResult.buildTime,
      pm2Time: pm2Result.buildTime,
      backendFiles: backendResult.files,
      frontendFiles: frontendResult.files
    });
    
    // Print OM.nfo banner (unless --no-banner)
    if (!args.noBanner) {
      presenter.printOmNfo(OM_NFO_PATH);
    }
    
    // Print build history
    const history = buildHistory.getHistory(5);
    presenter.printBuildHistory(history);
    
    // Emit build_completed event
    try {
      await buildEmitter.buildCompleted({
        durationSeconds: duration
      });
    } catch (err) {
      console.warn('⚠️  Failed to emit build_completed event (non-fatal):', err.message);
    }
    
    process.exit(0);
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    
    // Emit build_failed event
    try {
      await buildEmitter.buildFailed(error, error.stage || null);
    } catch (err) {
      console.warn('⚠️  Failed to emit build_failed event (non-fatal):', err.message);
    }
    
    // Stop spinner immediately on failure
    stopSpinner();
    
    if (progress && presenter.showProgress) {
      progress.clear();
    }
    
    // Print stage table even on failure (shows which stages completed)
    if (!args.quiet && stageResults.length > 0) {
      presenter.printStageTable(stageResults);
    }
    
    presenter.printErrorSummary(error, 'Build Process', error.output || error.message);
    
    process.exit(1);
  }
}

main();
