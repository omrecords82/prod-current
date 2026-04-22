#!/usr/bin/env tsx

// Main OMTRACE CLI entry point — dispatches to command modules

import { EXIT_CODES } from './core/types.js';
import { OMTRACEError, exitWithError } from './core/errors.js';
import { setVerbose } from './core/logger.js';
import { withAbort } from './core/timeout.js';
import { needsRefresh } from './core/indexIO.js';
import { checkNamingConventions } from './core/refactorHelper.js';
import { InteractiveResolver } from './core/interactiveResolver.js';
import { getDefaultIndexPath, readIndexOrThrow } from './core/indexIO.js';
import { parseArgs, showHelp, locateFERoot } from './cli/parseArgs.js';
import { runSelfTest } from './commands/selftest.js';
import { runTrace, formatTraceOutput } from './commands/trace.js';
import { handleMenuCommand } from './commands/menu.js';
import { handleRefactor } from './commands/refactor.js';
import { runDelete } from './commands/delete.js';

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();

    setVerbose(options.verbose);

    const feRoot = options.feRoot || locateFERoot();

    // Auto-refresh stale index
    if (!options.buildIndex && needsRefresh(feRoot)) {
      console.log('🔄 Index is stale, auto-refreshing...');
      try {
        const { buildIndex } = await import('./build_index.js');
        await buildIndex();
        console.log('✅ Index auto-refreshed successfully');
      } catch (error) {
        console.warn('⚠️  Auto-refresh failed, using existing index:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Dispatch to command handlers
    if (options.selftest) {
      const result = await withAbort(
        runSelfTest(feRoot),
        { timeoutMs: options.timeout, operation: 'self_test' }
      );

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('✅ Self-test passed');
        console.log(`Front-end: ${result.feRoot}`);
        console.log(`Index: ${result.index.files} files, ${Math.round(result.index.ageMs / (1000 * 60 * 60))}h old`);
      }

      if (!result.ok) {
        process.exit(1);
      }
      return;
    }

    if (options.buildIndex) {
      const { buildIndex } = await import('./build_index.js');
      await withAbort(
        buildIndex(),
        { timeoutMs: options.timeout, operation: 'build_index' }
      );
      console.log('✅ Index built successfully');
      return;
    }

    if (options.clearCache) {
      const resolver = new InteractiveResolver(feRoot);
      await resolver.clearCache();
      console.log('✅ User choice cache cleared');
      return;
    }

    if (options.menuCommand) {
      await handleMenuCommand(options.menuCommand, feRoot, options);
      return;
    }

    if (options.delete) {
      const result = await withAbort(
        runDelete(options.target!, feRoot, options),
        { timeoutMs: options.timeout, operation: 'delete' }
      );

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.success) {
          console.log(`\n🗑️ Successfully deleted: ${result.target}`);
          console.log(`📁 Archived ${result.archived} files to: ${result.archiveDir}`);
          console.log(`🔧 Patched ${result.patched} files`);
          console.log(`🌿 Created branch: ${result.branchName}`);

          if (result.verifyResult) {
            console.log(`✅ Verification: typecheck=${result.verifyResult.typecheckOk}, build=${result.verifyResult.buildOk}`);
          }

          console.log(`\n📋 Undo instructions:`);
          console.log(`  git switch -`);
          console.log(`  git branch -D ${result.branchName}`);
        } else {
          console.log(`\n❌ Deletion failed: ${result.target}`);
          if (result.errors) {
            result.errors.forEach(error => console.log(`  • ${error}`));
          }
          if (result.verifyResult?.errors) {
            console.log(`\nVerification errors:\n${result.verifyResult.errors}`);
          }
        }
      }

      if (!result.success) {
        process.exit(1);
      }
      return;
    }

    if (options.target === 'check') {
      checkNamingConventions(feRoot);
      return;
    }

    if (!options.target) {
      showHelp();
      throw new OMTRACEError(
        'No target specified. Use --help for usage information.',
        EXIT_CODES.RESOLVER_FAILED
      );
    }

    if (options.refactor) {
      const indexPath = options.indexPath || getDefaultIndexPath(feRoot);
      const index = readIndexOrThrow(indexPath);
      await handleRefactor(options.target, feRoot, options, index);
      return;
    }

    // Default: trace mode
    const result = await withAbort(
      runTrace(options.target, feRoot, options),
      { timeoutMs: options.timeout, operation: 'trace' }
    );

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      formatTraceOutput(result, options);
    }

    if (result.status === 'ambiguous') {
      process.exit(EXIT_CODES.AMBIGUOUS);
    }

  } catch (error) {
    if (error instanceof OMTRACEError) {
      exitWithError(error, parseArgs().json);
    } else {
      const genericError = new OMTRACEError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        EXIT_CODES.RESOLVER_FAILED
      );
      exitWithError(genericError, parseArgs().json);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
