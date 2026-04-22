// Index I/O system for OMTRACE

import * as fs from 'fs';
import * as path from 'path';
import { DepsIndex, IndexStats } from './types.js';
import { IndexError } from './errors.js';
import { log } from './logger.js';

export const DEFAULT_INDEX_PATH = '.cache/omtrace/file-deps.json';
export const MAX_INDEX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface IndexInfo {
  path: string;
  ageMs: number;
  files: number;
  ts: number;
}

/**
 * Read the dependency index or throw if missing/stale
 */
export function readIndexOrThrow(
  indexPath: string,
  maxAgeMs: number = MAX_INDEX_AGE_MS
): DepsIndex {
  log.debug('Reading index', { indexPath, maxAgeMs });

  if (!fs.existsSync(indexPath)) {
    throw new IndexError(
      `Dependency index not found: ${indexPath}`,
      'Run --build-index to create the index'
    );
  }

  try {
    const data = fs.readFileSync(indexPath, 'utf-8');
    const index: DepsIndex = JSON.parse(data);
    
    // Validate index structure
    if (!index.generatedAt || !index.root || !index.nodes) {
      throw new IndexError(
        `Invalid index format: ${indexPath}`,
        'Index appears to be corrupted'
      );
    }

    // Check age
    const ageMs = Date.now() - new Date(index.generatedAt).getTime();
    if (ageMs > maxAgeMs) {
      throw new IndexError(
        `Index is stale (${Math.round(ageMs / (1000 * 60 * 60))}h old): ${indexPath}`,
        'Run --build-index to refresh the index'
      );
    }

    log.debug('Index loaded successfully', { 
      path: indexPath, 
      ageMs, 
      files: index.nodes.length 
    });

    return index;
  } catch (error) {
    if (error instanceof IndexError) {
      throw error;
    }
    
    throw new IndexError(
      `Failed to read index: ${indexPath}`,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Write the dependency index
 */
export function writeIndex(
  index: DepsIndex,
  indexPath: string
): void {
  log.debug('Writing index', { indexPath, files: index.nodes.length });

  try {
    // Ensure directory exists
    const dir = path.dirname(indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Update generation timestamp
    index.generatedAt = new Date().toISOString();
    
    // Write index
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    
    log.info('Index written successfully', { 
      path: indexPath, 
      files: index.nodes.length 
    });
  } catch (error) {
    throw new IndexError(
      `Failed to write index: ${indexPath}`,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Get index information without loading the full content
 */
export function getIndexInfo(indexPath: string): IndexInfo | null {
  if (!fs.existsSync(indexPath)) {
    return null;
  }

  try {
    const stats = fs.statSync(indexPath);
    const ageMs = Date.now() - stats.mtime.getTime();
    
    // Read just the stats portion
    const data = fs.readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(data);
    
    return {
      path: indexPath,
      ageMs,
      files: parsed.nodes?.length || 0,
      ts: parsed.stats?.ts || 0,
    };
  } catch (error) {
    log.warn('Failed to read index info', { indexPath, error });
    return null;
  }
}

/**
 * Check if index needs to be rebuilt
 */
export function shouldRebuildIndex(
  indexPath: string,
  maxAgeMs: number = MAX_INDEX_AGE_MS
): boolean {
  const info = getIndexInfo(indexPath);
  if (!info) {
    return true; // No index exists
  }
  
  return info.ageMs > maxAgeMs;
}

/**
 * Check if index needs to be refreshed
 */
export function needsRefresh(
  feRoot: string,
  maxAgeMs: number = MAX_INDEX_AGE_MS
): boolean {
  const indexPath = getDefaultIndexPath(feRoot);
  return shouldRebuildIndex(indexPath, maxAgeMs);
}

/**
 * Get the default index path relative to front-end root
 */
export function getDefaultIndexPath(feRoot: string): string {
  return path.join(feRoot, DEFAULT_INDEX_PATH);
}
