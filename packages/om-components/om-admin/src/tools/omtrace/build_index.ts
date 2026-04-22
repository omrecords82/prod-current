#!/usr/bin/env tsx

// Build dependency index for OMTRACE

import * as fs from 'fs';
import { glob } from 'glob';
import * as path from 'path';
import { getDefaultIndexPath, writeIndex } from './core/indexIO.js';
import { log } from './core/logger.js';
import { withAbort } from './core/timeout.js';
import { DepsIndex } from './core/types.js';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Scan source files and extract imports
 */
async function scanSourceFiles(srcDir: string): Promise<DepsIndex['nodes']> {
  log.info('Scanning source files', { srcDir });

  // Determine project root (parent of front-end directory)
  const projectRoot = path.dirname(srcDir);
  const serverDir = path.join(projectRoot, 'server');
  
  log.info('Project structure', { 
    projectRoot, 
    frontEndDir: srcDir, 
    serverDir,
    serverExists: fs.existsSync(serverDir)
  });

  // Find all TypeScript/JavaScript files across front-end and server
  const patterns = [
    path.join(srcDir, 'src/**/*.ts'),
    path.join(srcDir, 'src/**/*.tsx'),
    path.join(srcDir, 'src/**/*.js'),
    path.join(srcDir, 'src/**/*.jsx'),
    path.join(serverDir, 'src/**/*.ts'),
    path.join(serverDir, 'src/**/*.js'),
  ];

  log.info('Glob patterns', { patterns });

  const excludePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.cache/**',
    '**/*.min.*',
    '**/coverage/**',
    '**/.nyc_output/**',
  ];

  log.info('Exclude patterns', { excludePatterns });

  const files = await glob(patterns, {
    ignore: excludePatterns,
    absolute: true,
  });

  // Debug: Check what types of files we found
  const frontEndFiles = files.filter(f => f.includes('/front-end/'));
  const serverFiles = files.filter(f => f.includes('/server/'));
  const otherFiles = files.filter(f => !f.includes('/front-end/') && !f.includes('/server/'));
  
  log.info('File breakdown', { 
    total: files.length,
    frontEnd: frontEndFiles.length,
    server: serverFiles.length,
    other: otherFiles.length
  });
  
  if (serverFiles.length > 0) {
    log.info('Sample server files', { 
      sample: serverFiles.slice(0, 5).map(f => f.replace('/var/www/orthodoxmetrics/prod/', ''))
    });
  }

  log.info('Found source files', { count: files.length });

  const nodes: DepsIndex['nodes'] = [];
  let tsCount = 0;

  for (const file of files) {
    try {
      const stats = fs.statSync(file);
      const ext = path.extname(file).toLowerCase();
      
      if (['.ts', '.tsx'].includes(ext)) {
        tsCount++;
      }

      const imports = await extractImports(file);
      
             // Normalize file path to preserve front-end vs server distinction
       let normalizedPath = file;
       if (file.includes('/front-end/src/')) {
         // Front-end file: normalize to src/...
         const srcIndex = file.indexOf('/front-end/src/');
         normalizedPath = file.substring(srcIndex + 15); // +15 to skip '/front-end/src/'
         log.debug('Front-end path normalization', { 
           original: file, 
           srcIndex, 
           substring: file.substring(srcIndex, srcIndex + 20),
           normalized: normalizedPath 
         });
       } else if (file.includes('/server/src/')) {
         // Server file: normalize to server/src/...
         const srcIndex = file.indexOf('/server/src/');
         normalizedPath = file.substring(srcIndex + 1); // +1 to skip the leading /
         log.debug('Server path normalization', { 
           original: file, 
           srcIndex, 
           substring: file.substring(srcIndex, srcIndex + 20),
           normalized: normalizedPath 
         });
       } else {
         // Fallback: try to find any /src/ pattern
         const srcIndex = file.indexOf('/src/');
         if (srcIndex !== -1) {
           normalizedPath = file.substring(srcIndex + 1); // +1 to skip the leading /
           log.debug('Fallback path normalization', { 
             original: file, 
             srcIndex, 
             substring: file.substring(srcIndex, srcIndex + 20),
             normalized: normalizedPath 
           });
         }
       }
      
      nodes.push({
        id: normalizedPath, // Keep as src/... relative path
        imports,
        kind: ext === '.ts' ? 'ts' : ext === '.tsx' ? 'tsx' : ext === '.js' ? 'js' : 'jsx',
        mtime: stats.mtime.getTime(),
      });

      if (nodes.length % 100 === 0) {
        log.debug('Processed files', { count: nodes.length, total: files.length });
      }
    } catch (error) {
      log.warn('Failed to process file', { file, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  log.info('Processed all source files', { 
    total: files.length, 
    successful: nodes.length,
    ts: tsCount 
  });

  return nodes;
}

/**
 * Extract imports from a source file
 */
async function extractImports(filePath: string): Promise<string[]> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports: string[] = [];

    // Simple regex-based import extraction
    // This is a basic implementation - could be enhanced with AST parsing
    
    // ES6 imports: import ... from '...'
    const importMatches = content.match(/import\s+.*?from\s+['"`]([^'"`]+)['"`]/g);
    if (importMatches) {
      for (const match of importMatches) {
        const pathMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          if (isRelativeImport(importPath)) {
            imports.push(normalizeImportPath(importPath, filePath));
          }
        }
      }
    }

    // Type imports: import type ... from '...'
    const typeImportMatches = content.match(/import\s+type\s+.*?from\s+['"`]([^'"`]+)['"`]/g);
    if (typeImportMatches) {
      for (const match of typeImportMatches) {
        const pathMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          if (isRelativeImport(importPath)) {
            imports.push(normalizeImportPath(importPath, filePath));
          }
        }
      }
    }

    // Export statements: export { ... } from '...'
    const exportMatches = content.match(/export\s+\{[^}]*\}\s+from\s+['"`]([^'"`]+)['"`]/g);
    if (exportMatches) {
      for (const match of exportMatches) {
        const pathMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          if (isRelativeImport(importPath)) {
            imports.push(normalizeImportPath(importPath, filePath));
          }
        }
      }
    }

    // Export all: export * from '...'
    const exportAllMatches = content.match(/export\s+\*\s+from\s+['"`]([^'"`]+)['"`]/g);
    if (exportAllMatches) {
      for (const match of exportAllMatches) {
        const pathMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          if (isRelativeImport(importPath)) {
            imports.push(normalizeImportPath(importPath, filePath));
          }
        }
      }
    }

    return Array.from(new Set(imports)); // Remove duplicates
  } catch (error) {
    log.warn('Failed to extract imports', { filePath, error: error instanceof Error ? error.message : 'Unknown error' });
    return [];
  }
}

/**
 * Check if an import path is relative
 */
function isRelativeImport(importPath: string): boolean {
  return importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('/');
}

/**
 * Normalize import path to src/... format
 */
function normalizeImportPath(importPath: string, sourceFile: string): string {
  try {
    const sourceDir = path.dirname(sourceFile);
    const resolvedPath = path.resolve(sourceDir, importPath);
    
    // Convert back to src/... relative format
    const srcIndex = resolvedPath.indexOf('/src/');
    if (srcIndex !== -1) {
      return resolvedPath.substring(srcIndex + 1); // +1 to skip the leading /
    }
    
    return importPath; // Fallback to original
  } catch (error) {
    return importPath; // Fallback to original
  }
}

/**
 * Options for building dependency index
 */
export interface BuildIndexOptions {
  baseDir: string;
  relativeRoot: string;
  scanRoot: string;
  maxDepth: number;
  mode: 'full' | 'closure';
}

/**
 * Build dependency index with options (for API use)
 */
export async function buildDependencyIndex(scanRoot: string, options: BuildIndexOptions): Promise<DepsIndex> {
  try {
    log.info('Building dependency index with options', { scanRoot, options });

    // Scan source files from the specified scan root
    const nodes = await withAbort(
      scanSourceFiles(scanRoot),
      { timeoutMs: TIMEOUT_MS, operation: 'scan_source_files' }
    );

    // Create index with metadata
    const index: DepsIndex = {
      generatedAt: new Date().toISOString(),
      root: scanRoot,
      stats: {
        files: nodes.length,
        ts: nodes.filter(n => ['ts', 'tsx'].includes(n.kind)).length,
        ageMs: 0,
      },
      nodes,
      metadata: {
        baseDir: options.baseDir,
        scanRoot: options.scanRoot,
        maxDepth: options.maxDepth,
        mode: options.mode,
      },
    };

    log.info('Index built successfully', { 
      files: nodes.length,
      ts: index.stats.ts,
      mode: options.mode,
      maxDepth: options.maxDepth
    });

    return index;
  } catch (error) {
    log.error('Failed to build index', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * Main function to build the index (CLI use)
 */
export async function buildIndex(): Promise<void> {
  try {
    // Determine project root and front-end directory
    const cwd = process.cwd();
    let feRoot: string;
    let projectRoot: string;
    
    if (cwd.includes('/front-end')) {
      feRoot = cwd;
      projectRoot = path.dirname(cwd);
    } else if (cwd.includes('/orthodoxmetrics')) {
      projectRoot = cwd;
      feRoot = path.join(cwd, 'prod/front-end');
    } else {
      feRoot = path.join(cwd, 'front-end');
      projectRoot = cwd;
    }
    
    if (!fs.existsSync(feRoot)) {
      throw new Error(`Front-end directory not found: ${feRoot}`);
    }
    
    if (!fs.existsSync(path.join(projectRoot, 'server'))) {
      throw new Error(`Server directory not found in project root: ${projectRoot}`);
    }

    log.info('Building dependency index', { feRoot, projectRoot });

    // Scan source files
    const nodes = await withAbort(
      scanSourceFiles(feRoot),
      { timeoutMs: TIMEOUT_MS, operation: 'scan_source_files' }
    );

    // Create index
    const index: DepsIndex = {
      generatedAt: new Date().toISOString(),
      root: feRoot,
      stats: {
        files: nodes.length,
        ts: nodes.filter(n => ['ts', 'tsx'].includes(n.kind)).length,
        ageMs: 0,
      },
      nodes,
    };

    // Write index
    const indexPath = getDefaultIndexPath(feRoot);
    writeIndex(index, indexPath);

    log.info('Index built successfully', { 
      path: indexPath, 
      files: nodes.length,
      ts: index.stats.ts 
    });

  } catch (error) {
    log.error('Failed to build index', { error: error instanceof Error ? error.message : 'Unknown error' });
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildIndex();
}
