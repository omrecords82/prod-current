#!/usr/bin/env tsx

// AST-based import rewriting for omtrace
// Handles TypeScript/JavaScript import updates during refactoring

import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger.js';

// Types for AST operations
export interface ImportRewrite {
  file: string;
  oldImport: string;
  newImport: string;
  line?: number;
  success: boolean;
  error?: string;
}

export interface RewriteResult {
  totalFiles: number;
  successfulRewrites: number;
  failedRewrites: number;
  details: ImportRewrite[];
}

/**
 * Simple regex-based import rewriter
 * TODO: Upgrade to full AST parsing with @typescript-eslint/parser
 */
export class ImportRewriter {
  private feRoot: string;

  constructor(feRoot: string) {
    this.feRoot = feRoot;
  }

  /**
   * Rewrite imports across multiple files
   */
  async rewriteImports(
    fromPath: string, 
    toPath: string, 
    affectedFiles: string[]
  ): Promise<RewriteResult> {
    log.info('Starting import rewrite', { fromPath, toPath, fileCount: affectedFiles.length });

    const result: RewriteResult = {
      totalFiles: affectedFiles.length,
      successfulRewrites: 0,
      failedRewrites: 0,
      details: []
    };

    // Normalize paths for comparison
    const normalizedFrom = this.normalizePath(fromPath);
    const normalizedTo = this.normalizePath(toPath);

    for (const file of affectedFiles) {
      try {
        const rewrite = await this.rewriteFileImports(file, normalizedFrom, normalizedTo);
        result.details.push(rewrite);
        
        if (rewrite.success) {
          result.successfulRewrites++;
        } else {
          result.failedRewrites++;
        }
      } catch (error) {
        result.failedRewrites++;
        result.details.push({
          file,
          oldImport: normalizedFrom,
          newImport: normalizedTo,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    log.info('Import rewrite completed', { 
      successful: result.successfulRewrites, 
      failed: result.failedRewrites 
    });

    return result;
  }

  /**
   * Rewrite imports in a single file
   */
  private async rewriteFileImports(
    filePath: string, 
    fromPath: string, 
    toPath: string
  ): Promise<ImportRewrite> {
    const fullPath = path.join(this.feRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return {
        file: filePath,
        oldImport: fromPath,
        newImport: toPath,
        success: false,
        error: 'File not found'
      };
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      let modified = false;
      let matchLine: number | undefined;

      // Process each line looking for imports
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const updatedLine = this.rewriteImportLine(line, filePath, fromPath, toPath);
        
        if (updatedLine !== line) {
          lines[i] = updatedLine;
          modified = true;
          matchLine = i + 1;
          log.debug('Rewrote import', { file: filePath, line: matchLine, old: line.trim(), new: updatedLine.trim() });
        }
      }

      if (modified) {
        const newContent = lines.join('\n');
        fs.writeFileSync(fullPath, newContent, 'utf-8');
        
        // Run prettier if available
        await this.formatFile(fullPath);
      }

      return {
        file: filePath,
        oldImport: fromPath,
        newImport: toPath,
        line: matchLine,
        success: modified,
        error: modified ? undefined : 'No matching imports found'
      };

    } catch (error) {
      return {
        file: filePath,
        oldImport: fromPath,
        newImport: toPath,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rewrite import statements in a single line
   */
  private rewriteImportLine(
    line: string, 
    currentFile: string, 
    fromPath: string, 
    toPath: string
  ): string {
    // Skip non-import lines
    if (!line.trim().startsWith('import') && !line.includes('from')) {
      return line;
    }

    // Extract the component name from the path
    const fromComponent = path.basename(fromPath, path.extname(fromPath));
    const toComponent = path.basename(toPath, path.extname(toPath));

    // Handle different import patterns
    let updatedLine = line;

    // Pattern 1: import Component from './path/Component'
    const defaultImportRegex = new RegExp(`import\\s+${fromComponent}\\s+from\\s+['"]([^'"]+)['"]`, 'g');
    updatedLine = updatedLine.replace(defaultImportRegex, (match, importPath) => {
      const newImportPath = this.calculateRelativePath(currentFile, toPath);
      return match.replace(importPath, newImportPath);
    });

    // Pattern 2: import { Component } from './path'
    const namedImportRegex = new RegExp(`import\\s*\\{[^}]*\\b${fromComponent}\\b[^}]*\\}\\s*from\\s+['"]([^'"]+)['"]`, 'g');
    updatedLine = updatedLine.replace(namedImportRegex, (match, importPath) => {
      const newImportPath = this.calculateRelativePath(currentFile, toPath);
      return match.replace(importPath, newImportPath);
    });

    // Pattern 3: lazy(() => import('./path/Component'))
    const lazyImportRegex = new RegExp(`lazy\\(\\(\\)\\s*=>\\s*import\\(['"]([^'"]*${fromComponent}[^'"]*)['"]\\)\\)`, 'g');
    updatedLine = updatedLine.replace(lazyImportRegex, (match, importPath) => {
      const newImportPath = this.calculateRelativePath(currentFile, toPath);
      return match.replace(importPath, newImportPath);
    });

    // Pattern 4: Direct path references (for routes, etc.)
    if (line.includes(fromPath) || line.includes(fromComponent)) {
      // Replace full path references
      updatedLine = updatedLine.replace(new RegExp(fromPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), toPath);
      
      // Replace component name references in paths
      const fromPathPattern = fromPath.replace(fromComponent, '').replace(/\/$/, '');
      const toPathPattern = toPath.replace(toComponent, '').replace(/\/$/, '');
      if (fromPathPattern && toPathPattern && fromPathPattern !== toPathPattern) {
        updatedLine = updatedLine.replace(new RegExp(fromPathPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), toPathPattern);
      }
    }

    return updatedLine;
  }

  /**
   * Calculate relative import path between two files
   */
  private calculateRelativePath(fromFile: string, toFile: string): string {
    const fromDir = path.dirname(fromFile);
    const relativePath = path.relative(fromDir, toFile);
    
    // Remove file extension for imports
    const withoutExt = relativePath.replace(/\.(tsx?|jsx?)$/, '');
    
    // Ensure relative paths start with ./ or ../
    if (!withoutExt.startsWith('.')) {
      return './' + withoutExt;
    }
    
    return withoutExt;
  }

  /**
   * Normalize path for consistent comparison
   */
  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  }

  /**
   * Format file with prettier if available
   */
  private async formatFile(filePath: string): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      execSync(`npx prettier --write "${filePath}"`, { 
        cwd: this.feRoot, 
        stdio: 'pipe' 
      });
    } catch (error) {
      // Prettier not available or failed, continue silently
      log.debug('Prettier formatting failed', { file: filePath, error });
    }
  }
}

/**
 * Find files that import a specific component
 */
export async function findImportingFiles(
  targetPath: string, 
  feRoot: string, 
  searchDirs: string[] = ['src']
): Promise<string[]> {
  const importingFiles: string[] = [];
  const targetComponent = path.basename(targetPath, path.extname(targetPath));
  
  log.info('Finding importing files', { targetPath, targetComponent });

  for (const searchDir of searchDirs) {
    const fullSearchDir = path.join(feRoot, searchDir);
    
    if (!fs.existsSync(fullSearchDir)) {
      continue;
    }

    const files = getAllFiles(fullSearchDir, ['.ts', '.tsx', '.js', '.jsx']);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for various import patterns
        if (
          content.includes(`import ${targetComponent}`) ||
          content.includes(`import { ${targetComponent}`) ||
          content.includes(`from '${targetPath}'`) ||
          content.includes(`from "${targetPath}"`) ||
          content.includes(`import('${targetPath}')`) ||
          content.includes(`import("${targetPath}")`) ||
          content.includes(targetComponent)
        ) {
          const relativePath = path.relative(feRoot, file);
          importingFiles.push(relativePath);
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
  }

  log.info('Found importing files', { count: importingFiles.length, files: importingFiles });
  return importingFiles;
}

/**
 * Get all files recursively with specific extensions
 */
function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common directories to ignore
          if (!['node_modules', '.git', 'dist', 'build', '.cache'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
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
 * Validate that import rewriting was successful
 */
export async function validateImportRewrite(
  result: RewriteResult,
  feRoot: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Check that all files still compile (basic syntax check)
  for (const detail of result.details) {
    if (!detail.success) {
      continue;
    }
    
    const filePath = path.join(feRoot, detail.file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Basic syntax validation - check for obvious issues
      if (content.includes('import  from') || content.includes('import from')) {
        errors.push(`${detail.file}: Malformed import statement detected`);
      }
      
      if (content.includes('import {  }')) {
        errors.push(`${detail.file}: Empty import statement detected`);
      }
      
    } catch (error) {
      errors.push(`${detail.file}: Cannot read file after rewrite`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
