import * as fs from 'fs';
import * as path from 'path';
import type { DepsIndex } from '../core/types.js';
import { EXIT_CODES } from '../core/types.js';
import { OMTRACEError } from '../core/errors.js';
import { log } from '../core/logger.js';
import { normalizePath } from '../core/normalizePath.js';
import { resolveCandidates } from '../core/resolver.js';
import { getDefaultIndexPath, readIndexOrThrow } from '../core/indexIO.js';
import { ImportRewriter } from '../core/astRewriter.js';
import { PackageManagerDetector, getSafeBuildCommand, getSafeTypecheckCommand } from '../core/packageManager.js';
import type { CLIOptions, RefHit, DeletePlan, DeleteResult } from '../cli/types.js';

/**
 * Resolve target for deletion
 */
function resolveDeleteTarget(nameOrPath: string, index: DepsIndex, feRoot: string): { target: string; resolvedFiles: string[] } {
  const normalized = normalizePath(nameOrPath, feRoot);

  if (normalized.exists) {
    const targetPath = normalized.normalized;
    const baseName = path.basename(targetPath, path.extname(targetPath));
    const dir = path.dirname(targetPath);

    const colocatedFiles = [targetPath];
    const possibleExtensions = ['.test.tsx', '.test.ts', '.spec.tsx', '.spec.ts', '.module.css', '.scss', '.css'];

    for (const ext of possibleExtensions) {
      const colocatedPath = path.join(dir, baseName + ext);
      if (fs.existsSync(path.join(feRoot, colocatedPath))) {
        colocatedFiles.push(colocatedPath);
      }
    }

    return { target: baseName, resolvedFiles: colocatedFiles };
  }

  const candidates = resolveCandidates(normalized.candidate, index, { pickFirst: false });

  if (candidates.length === 0) {
    throw new OMTRACEError(
      `No candidates found for target: ${nameOrPath}`,
      EXIT_CODES.RESOLVER_FAILED
    );
  }

  if (candidates.length > 1) {
    const best = candidates.sort((a, b) => {
      const aSrc = a.path.includes('/src/') ? 0 : 1;
      const bSrc = b.path.includes('/src/') ? 0 : 1;
      if (aSrc !== bSrc) return aSrc - bSrc;
      return a.path.length - b.path.length;
    })[0];

    log.info(`Multiple candidates found, picking: ${best.path}`);
  }

  const targetPath = candidates[0].path;
  const baseName = path.basename(targetPath, path.extname(targetPath));

  return { target: baseName, resolvedFiles: [targetPath] };
}

/**
 * Get all files recursively
 */
function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  walk(dir);
  return files;
}

/**
 * Find all references to target files
 */
function findReferences(resolvedFiles: string[], feRoot: string): RefHit[] {
  const refs: RefHit[] = [];
  const targetNames = resolvedFiles.map(f => path.basename(f, path.extname(f)));

  const searchDirs = [
    path.join(feRoot, 'src'),
    path.join(feRoot, '../server/src'),
  ].filter(dir => fs.existsSync(dir));

  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.md'];

  for (const searchDir of searchDirs) {
    const files = getAllFiles(searchDir, extensions);

    for (const file of files) {
      if (file.includes('/_archive/') || file.includes('/node_modules/') || file.includes('/.backup')) {
        continue;
      }

      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineIndex) => {
          for (const targetName of targetNames) {
            if (line.includes(targetName)) {
              let kind: RefHit['kind'] = 'import';

              if (line.includes('import') && line.includes(targetName)) {
                kind = 'import';
              } else if (line.includes('lazy(') && line.includes(targetName)) {
                kind = 'route';
              } else if (line.includes('export') && line.includes(targetName)) {
                kind = 'barrel';
              } else if (file.includes('.test.') || file.includes('.spec.')) {
                kind = 'test';
              } else if (file.includes('.css') || file.includes('.scss')) {
                kind = 'style';
              } else if (file.includes('.json')) {
                kind = 'json';
              } else if (line.includes('menu') || line.includes('Menu')) {
                kind = 'menu';
              }

              refs.push({
                file: path.relative(feRoot, file),
                kind,
                line: lineIndex + 1,
                snippet: line.trim(),
              });
            }
          }
        });
      } catch (error) {
        continue;
      }
    }
  }

  return refs;
}

/**
 * Build deletion plan
 */
function buildDeletePlan(resolved: { target: string; resolvedFiles: string[] }, refs: RefHit[], feRoot: string): DeletePlan {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
  const slug = resolved.target.toLowerCase().replace(/[^a-z0-9]/g, '');
  const branchName = `chore/delete-${slug}-${timestamp.slice(0, 12)}`;
  const archiveDir = path.join(feRoot, '_archive', 'omtrace-removed', timestamp, resolved.target);

  const patchGroups = new Map<string, RefHit[]>();
  refs.forEach(ref => {
    if (!patchGroups.has(ref.file)) {
      patchGroups.set(ref.file, []);
    }
    patchGroups.get(ref.file)!.push(ref);
  });

  const patches = Array.from(patchGroups.entries()).map(([file, fileRefs]) => ({
    file,
    kind: fileRefs.map(r => r.kind).join(','),
    preview: `${fileRefs.length} reference(s): ${fileRefs.map(r => `L${r.line}`).join(', ')}`,
  }));

  return {
    target: resolved.target,
    resolvedFiles: resolved.resolvedFiles,
    patches,
    archiveDir,
    branchName,
  };
}

/**
 * Remove imports from content string
 */
async function removeImportsFromContent(
  content: string,
  targetName: string,
  filePath: string,
  feRoot: string
): Promise<string> {
  const lines = content.split('\n');
  const filteredLines: string[] = [];

  for (const line of lines) {
    let shouldRemove = false;

    if (line.trim().startsWith('import') && line.includes(targetName)) {
      const importRegex = new RegExp(`\\b${targetName}\\b`);
      if (importRegex.test(line)) {
        shouldRemove = true;
      }
    }

    if (line.includes('lazy(') && line.includes(targetName)) {
      shouldRemove = true;
    }

    if (line.includes('export') && line.includes(targetName)) {
      shouldRemove = true;
    }

    if (!shouldRemove) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}

/**
 * Apply deletion plan
 */
async function applyDeletePlan(plan: DeletePlan, feRoot: string, dryRun: boolean = false): Promise<{ patched: number; archived: number }> {
  if (dryRun) {
    console.log('🔍 DRY RUN - No changes will be made');
    console.log(`Target: ${plan.target}`);
    console.log(`Files to archive: ${plan.resolvedFiles.length}`);
    console.log(`Files to patch: ${plan.patches.length}`);
    console.log(`Archive destination: ${plan.archiveDir}`);
    console.log(`Git branch: ${plan.branchName}`);
    return { patched: 0, archived: 0 };
  }

  const { execSync } = await import('child_process');
  try {
    execSync(`git checkout -b ${plan.branchName}`, { cwd: feRoot, stdio: 'pipe' });
    log.info(`Created branch: ${plan.branchName}`);
  } catch (error) {
    throw new OMTRACEError(
      `Failed to create git branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      EXIT_CODES.REFACTOR_BLOCKED
    );
  }

  fs.mkdirSync(plan.archiveDir, { recursive: true });
  let archivedCount = 0;

  for (const file of plan.resolvedFiles) {
    const srcPath = path.join(feRoot, file);
    const destPath = path.join(plan.archiveDir, file);

    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      fs.unlinkSync(srcPath);
      archivedCount++;
    }
  }

  let patchedCount = 0;

  const rewriter = new ImportRewriter(feRoot);
  const targetNames = plan.resolvedFiles.map(f => path.basename(f, path.extname(f)));

  for (const patch of plan.patches) {
    const filePath = path.join(feRoot, patch.file);

    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;

        for (const targetName of targetNames) {
          content = await removeImportsFromContent(content, targetName, patch.file, feRoot);
        }

        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          patchedCount++;

          try {
            execSync(`npx prettier --write "${filePath}"`, { cwd: feRoot, stdio: 'pipe' });
          } catch {
            // Prettier not available or failed, continue
          }
        }
      } catch (error) {
        log.warn(`Failed to patch ${patch.file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  try {
    execSync('git add -A', { cwd: feRoot, stdio: 'pipe' });
  } catch (error) {
    log.warn(`Failed to stage changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { patched: patchedCount, archived: archivedCount };
}

/**
 * Verify build after deletion using auto-detected package manager
 */
async function verifyBuild(feRoot: string): Promise<{ typecheckOk: boolean; buildOk: boolean; errors?: string }> {
  log.info('Starting build verification with auto-detected package manager');

  let typecheckOk = true;
  let buildOk = true;
  let errors = '';

  const detector = new PackageManagerDetector(feRoot);

  try {
    const typecheckCommand = await getSafeTypecheckCommand(feRoot);
    if (typecheckCommand) {
      log.debug('Running typecheck', { command: typecheckCommand });
      const result = await detector.executeCommand(typecheckCommand, { timeout: 120000 });
      if (!result.success) {
        typecheckOk = false;
        errors += `Typecheck failed: ${result.error || 'Unknown error'}\n`;
      }
    } else {
      log.info('No typecheck command available, skipping typecheck verification');
    }
  } catch (error) {
    typecheckOk = false;
    errors += `Typecheck failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
  }

  try {
    const buildCommand = await getSafeBuildCommand(feRoot);
    log.debug('Running build', { command: buildCommand });
    const result = await detector.executeCommand(buildCommand, { timeout: 300000 });
    if (!result.success) {
      buildOk = false;
      errors += `Build failed: ${result.error || 'Unknown error'}\n`;
    }
  } catch (error) {
    buildOk = false;
    errors += `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
  }

  log.info('Build verification completed', { typecheckOk, buildOk });
  return { typecheckOk, buildOk, errors: errors || undefined };
}

/**
 * Run delete command
 */
export async function runDelete(target: string, feRoot: string, options: CLIOptions): Promise<DeleteResult> {
  log.info('Running delete', { target, feRoot, dryRun: options.dryRun });

  if (!target) {
    throw new OMTRACEError(
      'Delete command requires a target. Usage: omtrace delete <target>',
      EXIT_CODES.RESOLVER_FAILED
    );
  }

  const indexPath = options.indexPath || getDefaultIndexPath(feRoot);
  const index = readIndexOrThrow(indexPath);

  const resolved = resolveDeleteTarget(target, index, feRoot);
  const refs = findReferences(resolved.resolvedFiles, feRoot);
  const plan = buildDeletePlan(resolved, refs, feRoot);

  if (options.dryRun) {
    await applyDeletePlan(plan, feRoot, true);
    return {
      success: true,
      target: plan.target,
      patched: plan.patches.length,
      archived: plan.resolvedFiles.length,
      branchName: plan.branchName,
      archiveDir: plan.archiveDir,
    };
  }

  const { patched, archived } = await applyDeletePlan(plan, feRoot, false);

  const verifyResult = await verifyBuild(feRoot);

  if (!verifyResult.typecheckOk || !verifyResult.buildOk) {
    const { execSync } = await import('child_process');
    try {
      for (const file of plan.resolvedFiles) {
        const srcPath = path.join(plan.archiveDir, file);
        const destPath = path.join(feRoot, file);

        if (fs.existsSync(srcPath)) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.copyFileSync(srcPath, destPath);
        }
      }

      execSync('git add -A', { cwd: feRoot, stdio: 'pipe' });

      return {
        success: false,
        target: plan.target,
        patched,
        archived,
        branchName: plan.branchName,
        archiveDir: plan.archiveDir,
        errors: ['Verification failed - files restored'],
        verifyResult,
      };
    } catch (restoreError) {
      return {
        success: false,
        target: plan.target,
        patched,
        archived,
        branchName: plan.branchName,
        archiveDir: plan.archiveDir,
        errors: ['Verification failed and restore failed'],
        verifyResult,
      };
    }
  }

  const { execSync } = await import('child_process');
  try {
    const commitMessage = `chore(omtrace): delete ${plan.target}
- patched ${patched} files
- archived ${archived} files → ${plan.archiveDir}
- verify: typecheck/build passed`;

    execSync(`git commit -m "${commitMessage}"`, { cwd: feRoot, stdio: 'pipe' });
  } catch (error) {
    log.warn(`Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    success: true,
    target: plan.target,
    patched,
    archived,
    branchName: plan.branchName,
    archiveDir: plan.archiveDir,
    verifyResult,
  };
}
