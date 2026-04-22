// Path normalization system for OMTRACE

import * as path from 'path';
import * as fs from 'fs';
import { log } from './logger.js';

export interface NormalizedPath {
  normalized: string;      // "src/components/.../File.tsx"
  exists: boolean;         // Whether the file actually exists
  candidate: string;       // Key for resolver (basename or partial path)
}

/**
 * Normalize various path inputs to front-end relative "src/..." format
 */
export function normalizePath(
  input: string,
  feRoot: string
): NormalizedPath {
  log.debug('Normalizing path', { input, feRoot });

  // Handle absolute paths
  if (path.isAbsolute(input)) {
    return normalizeAbsolutePath(input, feRoot);
  }

  // Handle relative paths
  return normalizeRelativePath(input, feRoot);
}

function normalizeAbsolutePath(
  absolutePath: string,
  feRoot: string
): NormalizedPath {
  log.debug('Normalizing absolute path', { absolutePath, feRoot });

  // Remove repo root and prod/front-end prefixes
  const normalized = absolutePath
    .replace(/^.*\/prod\/front-end\//, '')
    .replace(/^.*\/front-end\//, '')
    .replace(/^.*\/src\//, 'src/');

  // Ensure it starts with src/
  const finalPath = normalized.startsWith('src/') ? normalized : `src/${normalized}`;
  
  const fullPath = path.join(feRoot, finalPath);
  const exists = fs.existsSync(fullPath);

  return {
    normalized: finalPath,
    exists,
    candidate: path.basename(finalPath, path.extname(finalPath)),
  };
}

function normalizeRelativePath(
  relativePath: string,
  feRoot: string
): NormalizedPath {
  log.debug('Normalizing relative path', { relativePath, feRoot });

  // If it already starts with src/, use as-is
  if (relativePath.startsWith('src/')) {
    const fullPath = path.join(feRoot, relativePath);
    const exists = fs.existsSync(fullPath);
    
    return {
      normalized: relativePath,
      exists,
      candidate: path.basename(relativePath, path.extname(relativePath)),
    };
  }

  // If it's just a filename, create src/ path
  if (!relativePath.includes('/')) {
    const candidate = relativePath.replace(/\.[jt]sx?$/, '');
    return {
      normalized: `src/${relativePath}`,
      exists: false, // Will be resolved by candidate finder
      candidate,
    };
  }

  // If it's a partial path, try to make it src/ relative
  const normalized = relativePath.startsWith('src/') ? relativePath : `src/${relativePath}`;
  const fullPath = path.join(feRoot, normalized);
  const exists = fs.existsSync(fullPath);

  return {
    normalized,
    exists,
    candidate: path.basename(normalized, path.extname(normalized)),
  };
}

/**
 * Extract candidate key for resolver from normalized path
 */
export function extractCandidate(path: string): string {
  // Remove src/ prefix and extension
  const withoutSrc = path.replace(/^src\//, '');
  const withoutExt = withoutSrc.replace(/\.[jt]sx?$/, '');
  
  // Use basename as candidate, but handle case where withoutExt might not have path separators
  if (withoutExt.includes('/')) {
    // Split by path separator and take the last part
    const parts = withoutExt.split('/');
    return parts[parts.length - 1];
  }
  return withoutExt;
}

/**
 * Validate that a path is within the front-end src directory
 */
export function validateSrcPath(normalizedPath: string): boolean {
  return normalizedPath.startsWith('src/') && 
         !normalizedPath.includes('..') &&
         !normalizedPath.includes('node_modules');
}

/**
 * Get the file extension from a path
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Check if a file is a TypeScript/JavaScript file
 */
export function isSourceFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
}
