import * as fs from 'fs';
import * as path from 'path';
import type { RefactorResult, DepsIndex } from '../core/types.js';
import { EXIT_CODES } from '../core/types.js';
import { OMTRACEError } from '../core/errors.js';
import { log } from '../core/logger.js';
import { normalizePath } from '../core/normalizePath.js';
import { resolveCandidates } from '../core/resolver.js';
import { getDefaultIndexPath, readIndexOrThrow } from '../core/indexIO.js';
import { detectDomainAndSlug, generateDestinationPath, checkMixedUsage } from '../slugRules.js';
import { findDuplicateComponents, executeRefactor } from '../core/refactorHelper.js';
import { ImportRewriter, findImportingFiles, validateImportRewrite } from '../core/astRewriter.js';
import type { CLIOptions } from '../cli/types.js';

/**
 * Handle refactor mode (duplicate detection)
 */
export async function handleRefactor(
  target: string,
  feRoot: string,
  options: CLIOptions,
  index: DepsIndex
): Promise<void> {
  const normalized = normalizePath(target, feRoot);
  const candidates = resolveCandidates(normalized.candidate, index, {
    pickFirst: options.pickFirst,
  });

  if (candidates.length === 0) {
    throw new Error(`No components found for target: ${target}`);
  }

  const componentName = path.basename(candidates[0].path, path.extname(candidates[0].path));

  const duplicates = findDuplicateComponents(componentName, index, feRoot);

  if (duplicates.length === 0) {
    console.log(`✅ No duplicates found for ${componentName}`);
    return;
  }

  console.log(`🔍 Found ${duplicates.length} duplicate components for ${componentName}:`);
  duplicates.forEach((dup, index) => {
    console.log(`   ${index + 1}. ${dup.path} (${dup.reverseImports} imports, ${new Date(dup.mtime).toLocaleDateString()})`);
  });
  console.log('');

  executeRefactor(componentName, duplicates, feRoot, options.renameLegacy);
}

/**
 * Run refactor mode (file move with import rewriting)
 */
export async function runRefactor(
  target: string,
  feRoot: string,
  options: CLIOptions
): Promise<RefactorResult> {
  log.info('Running refactor', { target, feRoot, dryRun: options.dryRun });

  const indexPath = options.indexPath || getDefaultIndexPath(feRoot);
  const index = readIndexOrThrow(indexPath);

  const normalized = normalizePath(target, feRoot);

  if (!normalized.exists) {
    throw new OMTRACEError(
      `Target file not found: ${target}`,
      EXIT_CODES.RESOLVER_FAILED
    );
  }

  const componentName = path.basename(normalized.normalized, path.extname(normalized.normalized));

  const filePath = path.join(feRoot, normalized.normalized);
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasDefaultExport = /export\s+default/.test(content);

  if (!hasDefaultExport) {
    log.warn('Component missing default export', { componentName });
  }

  const toPath = generateDestinationPath(componentName, normalized.normalized);
  const fullToPath = path.join(feRoot, toPath);

  if (fs.existsSync(fullToPath)) {
    throw new OMTRACEError(
      `Destination already exists: ${toPath}`,
      EXIT_CODES.REFACTOR_BLOCKED
    );
  }

  const mixedUsage = checkMixedUsage(componentName, normalized.normalized);
  if (mixedUsage.hasMixedUsage && !options.force) {
    throw new OMTRACEError(
      `Component has mixed usage: ${mixedUsage.reason}`,
      EXIT_CODES.REFACTOR_BLOCKED
    );
  }

  const { domain, slug } = detectDomainAndSlug(componentName);

  if (options.dryRun) {
    return {
      from: normalized.normalized,
      to: toPath,
      domain,
      slug,
      importUpdates: 0,
      notes: ['Dry run - no changes made'],
      success: true,
      filesTouched: [],
    };
  }

  try {
    log.info('Finding importing files for AST rewrite');
    const importingFiles = await findImportingFiles(normalized.normalized, feRoot);

    const destDir = path.dirname(fullToPath);
    fs.mkdirSync(destDir, { recursive: true });

    fs.copyFileSync(filePath, fullToPath);
    fs.unlinkSync(filePath);

    log.info('Starting AST-based import rewriting', { importingFiles: importingFiles.length });
    const rewriter = new ImportRewriter(feRoot);
    const rewriteResult = await rewriter.rewriteImports(
      normalized.normalized,
      toPath,
      importingFiles
    );

    const validation = await validateImportRewrite(rewriteResult, feRoot);

    const notes = [
      'File moved successfully',
      `AST import rewriting completed: ${rewriteResult.successfulRewrites}/${rewriteResult.totalFiles} files updated`,
      validation.valid ? 'Import validation passed' : `Import validation issues: ${validation.errors.join(', ')}`,
    ];

    if (rewriteResult.failedRewrites > 0) {
      notes.push(`${rewriteResult.failedRewrites} files had rewrite failures - manual review needed`);
    }

    const refactorLog = path.join(feRoot, 'refactor.md');
    const entry = `\n## ${new Date().toISOString()}\n- from: ${normalized.normalized}\n- to: ${toPath}\n- domain: ${domain}\n- slug: ${slug}\n- import updates: ${rewriteResult.successfulRewrites} successful, ${rewriteResult.failedRewrites} failed\n- files touched: ${importingFiles.length}\n- validation: ${validation.valid ? 'passed' : 'failed'}\n`;

    fs.appendFileSync(refactorLog, entry);

    if (options.verbose) {
      console.log('\n📝 Import Rewrite Details:');
      rewriteResult.details.forEach(detail => {
        const status = detail.success ? '✅' : '❌';
        console.log(`  ${status} ${detail.file}${detail.line ? ` (line ${detail.line})` : ''}`);
        if (!detail.success && detail.error) {
          console.log(`     Error: ${detail.error}`);
        }
      });
    }

    return {
      from: normalized.normalized,
      to: toPath,
      domain,
      slug,
      importUpdates: rewriteResult.successfulRewrites,
      notes,
      success: true,
      filesTouched: [normalized.normalized, toPath, ...importingFiles],
    };
  } catch (error) {
    if (fs.existsSync(fullToPath)) {
      fs.unlinkSync(fullToPath);
    }

    throw new OMTRACEError(
      `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      EXIT_CODES.REFACTOR_BLOCKED
    );
  }
}
