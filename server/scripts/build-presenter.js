#!/usr/bin/env node

/**
 * Build Output Presenter
 * 
 * Handles all terminal output formatting for professional build presentation
 */

class BuildPresenter {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.quiet = options.quiet || false;
    this.showProgress = options.showProgress !== false;
    this.warnings = [];
    this.stages = [];
  }

  /**
   * Print header banner
   */
  printHeader() {
    if (this.quiet) return;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  OrthodoxMetrics - Full Build & Deploy');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * Print stage table (replaces individual stage start/end lines)
   */
  printStageTable(stageResults) {
    if (this.quiet) return;
    
    console.log('───────────────────────────────────────────────────────────');
    console.log('Stage                          Status        Duration');
    console.log('───────────────────────────────────────────────────────────');
    
    for (const stage of stageResults) {
      const statusText = stage.status === 'Completed' ? '✓ Completed' : '✗ Failed';
      const durationText = `${stage.durationSec.toFixed(2)}s`.padStart(8);
      const stageName = stage.name.padEnd(30);
      const status = statusText.padEnd(12);
      
      console.log(`${stageName}${status}${durationText}`);
    }
    
    console.log('───────────────────────────────────────────────────────────');
  }

  /**
   * Print command output (only in verbose mode or on failure)
   */
  printCommandOutput(stageName, output, isError = false) {
    if (isError || this.verbose) {
      if (output && output.trim()) {
        // Filter out npm verbose headers
        const filtered = this.filterNpmNoise(output);
        
        if (isError) {
          // For errors, show last 120 lines
          const lines = filtered.split('\n');
          const lastLines = lines.slice(-120).join('\n');
          console.error(`\n[${stageName}] Output (last 120 lines):`);
          console.error(lastLines);
        } else {
          console.log(`\n[${stageName}] Output:\n${filtered}`);
        }
      }
    }
  }

  /**
   * Filter npm verbose loglevel noise
   */
  filterNpmNoise(output) {
    if (!output) return output;
    
    const lines = output.split('\n');
    const filtered = lines.filter(line => {
      // Remove npm verbose headers
      if (line.startsWith('npm verbose')) return false;
      if (line.startsWith('npm info using')) return false;
      if (line.startsWith('npm info ok')) return false;
      if (line.startsWith('npm verbose logfile')) return false;
      if (line.startsWith('npm verbose title')) return false;
      if (line.startsWith('npm verbose argv')) return false;
      if (line.startsWith('npm verbose cwd')) return false;
      if (line.startsWith('npm verbose os')) return false;
      if (line.startsWith('npm verbose node')) return false;
      if (line.startsWith('npm verbose npm')) return false;
      if (line.startsWith('npm verbose exit')) return false;
      return true;
    });
    
    return filtered.join('\n');
  }

  /**
   * Record warnings from output
   */
  recordWarnings(stageName, output) {
    if (!output) return;

    const warnings = [];
    const lines = output.split('\n');

    // Detect common warnings
    for (const line of lines) {
      if (line.includes('Browserslist: browsers data (caniuse-lite) is')) {
        warnings.push({
          type: 'browserslist',
          message: 'Browserslist data is outdated',
          suggestion: 'Run: npx update-browserslist-db@latest'
        });
      } else if (line.includes('Some chunks are larger than 500 kB')) {
        warnings.push({
          type: 'chunk-size',
          message: 'Large chunk size detected',
          suggestion: 'Consider code-splitting or manual chunking'
        });
      } else if (line.includes('npm WARN') && !line.includes('npm WARN deprecated')) {
        // Only record non-deprecation warnings
        const match = line.match(/npm WARN (.+)/);
        if (match) {
          warnings.push({
            type: 'npm-warn',
            message: match[1].trim(),
            suggestion: null
          });
        }
      }
    }

    if (warnings.length > 0) {
      this.warnings.push({
        stage: stageName,
        warnings: warnings
      });
    }
  }

  /**
   * Print warnings summary (compact format)
   */
  printWarningsSummary() {
    if (this.warnings.length === 0) return;

    let totalWarnings = 0;
    const uniqueWarnings = [];
    const shownTypes = new Set();

    for (const stageWarnings of this.warnings) {
      for (const warning of stageWarnings.warnings) {
        totalWarnings++;
        if (!shownTypes.has(warning.type)) {
          shownTypes.add(warning.type);
          uniqueWarnings.push(warning);
        }
      }
    }

    console.log(`\n⚠ Warnings (${totalWarnings})`);
    for (const warning of uniqueWarnings.slice(0, 5)) {
      const hint = warning.suggestion ? ` (${warning.suggestion})` : '';
      console.log(`- ${warning.message}${hint}`);
    }
    if (totalWarnings > uniqueWarnings.length && !this.verbose) {
      console.log(`- ... ${totalWarnings - uniqueWarnings.length} more (use --om-verbose for details)`);
    }
  }

  /**
   * Print build summary (compact format)
   */
  printBuildSummary(results) {
    const totalTime = results.totalTime || 0;
    const backendTime = results.backendTime || 0;
    const frontendTime = results.frontendTime || 0;
    const pm2Time = results.pm2Time || 0;
    
    console.log(`\n📊 Build Summary`);
    console.log(`Total: ${totalTime.toFixed(2)}s | Backend: ${backendTime.toFixed(2)}s | Frontend: ${frontendTime.toFixed(2)}s | PM2: ${pm2Time.toFixed(2)}s`);
    
    // Only show file changes if there were any
    const backendTotal = results.backendFiles ? 
      (results.backendFiles.changed || 0) + (results.backendFiles.added || 0) + (results.backendFiles.removed || 0) : 0;
    const frontendTotal = results.frontendFiles ? 
      (results.frontendFiles.changed || 0) + (results.frontendFiles.added || 0) + (results.frontendFiles.removed || 0) : 0;
    
    if (backendTotal > 0 || frontendTotal > 0) {
      const parts = [];
      if (backendTotal > 0) {
        const { changed = 0, added = 0, removed = 0 } = results.backendFiles;
        parts.push(`Backend: ${backendTotal} (${changed}M/${added}A/${removed}D)`);
      }
      if (frontendTotal > 0) {
        const { changed = 0, added = 0, removed = 0 } = results.frontendFiles;
        parts.push(`Frontend: ${frontendTotal} (${changed}M/${added}A/${removed}D)`);
      }
      console.log(`Files: ${parts.join(' | ')}`);
    }
  }

  /**
   * Print OM.nfo banner (single divider style)
   */
  printOmNfo(omNfoPath) {
    try {
      const fs = require('fs');
      if (fs.existsSync(omNfoPath)) {
        const banner = fs.readFileSync(omNfoPath, 'utf8');
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(banner);
        console.log('═══════════════════════════════════════════════════════════');
      }
    } catch (error) {
      // Silently fail if om.nfo doesn't exist
    }
  }

  /**
   * Print build history (compressed single-line format)
   */
  printBuildHistory(history) {
    if (this.quiet) return;
    
    if (!history || history.length === 0) {
      return;
    }
    
    console.log('\n📜 Build History');
    for (const build of history) {
      const icon = build.success ? '✅' : '❌';
      const type = build.type.toUpperCase().padEnd(9);
      const date = new Date(build.timestamp).toISOString().replace('T', ' ').substring(0, 19);
      const time = `${build.buildTime.toFixed(2)}s`.padStart(8);
      
      let line = `${icon} ${type} ${date} ${time}`;
      
      // Only add file info if there were changes
      if (build.files) {
        const { changed = 0, added = 0, removed = 0 } = build.files;
        const total = changed + added + removed;
        if (total > 0) {
          line += ` (${total} files: ${changed}M/${added}A/${removed}D)`;
        } else {
          line += ` (no changes)`;
        }
      }
      
      console.log(line);
    }
  }

  /**
   * Print error summary
   */
  printErrorSummary(error, stageName, output) {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error(`  ❌ Build Failed: ${stageName}`);
    console.error('═══════════════════════════════════════════════════════════\n');
    
    console.error(`Error: ${error.message || error}`);
    
    if (output) {
      this.printCommandOutput(stageName, output, true);
    }
    
    if (!this.verbose) {
      console.error('\n💡 Re-run with --verbose to see full output');
    }
    
    console.error('\n═══════════════════════════════════════════════════════════');
  }

  /**
   * Extract summary from Vite output (for non-verbose mode)
   */
  extractViteSummary(output) {
    if (!output) return null;
    
    const lines = output.split('\n');
    const summary = {
      modulesTransformed: null,
      buildTime: null,
      distSize: null
    };
    
    for (const line of lines) {
      // Match "✓ 24345 modules transformed."
      if (line.includes('modules transformed')) {
        const match = line.match(/(\d+)\s+modules transformed/);
        if (match) summary.modulesTransformed = parseInt(match[1].replace(/,/g, ''));
      }
      // Match "✓ built in 1m 11s"
      if (line.includes('built in')) {
        const match = line.match(/built in ([\d.]+m\s*[\d.]+s|[\d.]+s)/);
        if (match) summary.buildTime = match[1].trim();
      }
    }
    
    return summary;
  }

  /**
   * Get dist directory size
   */
  getDistSize(distPath) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(distPath)) return null;
      
      let totalSize = 0;
      
      function calculateSize(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            calculateSize(fullPath);
          } else {
            const stats = fs.statSync(fullPath);
            totalSize += stats.size;
          }
        }
      }
      
      calculateSize(distPath);
      return totalSize;
    } catch (error) {
      return null;
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return null;
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }

  /**
   * Print Vite summary (non-verbose mode)
   */
  printViteSummary(summary, distPath = null) {
    if (!summary || this.verbose) return;
    
    if (summary.modulesTransformed) {
      console.log(`  ✓ ${summary.modulesTransformed.toLocaleString()} modules transformed`);
    }
    if (summary.buildTime) {
      console.log(`  ✓ Built in ${summary.buildTime}`);
    }
    
    // Calculate and show dist/ size only
    if (distPath) {
      const distSize = this.getDistSize(distPath);
      if (distSize !== null) {
        const formatted = this.formatBytes(distSize);
        if (formatted) {
          console.log(`  ✓ Dist size: ${formatted}`);
        }
      }
    }
  }

  /**
   * Print backend summary (removed - stages print individually)
   */
  printBackendSummary(summary) {
    // Removed to avoid duplication - each stage prints its own completion line
  }
}

module.exports = BuildPresenter;
