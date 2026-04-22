/**
 * Refactor Console v2 — Scan Engine
 * 
 * Pure functions for scanning scopes with ignore pattern support.
 * Does NOT contain UI logic — this is the "Scanner" in Scanner → Policy → UI.
 */
import { ScanScope, ScanScopeId, ScanInventoryItem } from '@/types/refactorConsole';
import refactorConsoleClient from '../api/refactorConsoleClient';

/**
 * Lightweight glob matcher for gitignore-style patterns.
 * Uses picomatch via the backend scan; this is the client-side filter
 * applied on scan results that already came from the server.
 */
function matchesIgnorePattern(relPath: string, pattern: string): boolean {
  // Normalize to forward slashes
  const normalized = relPath.replace(/\\/g, '/');
  const pat = pattern.replace(/\\/g, '/');

  // Handle **/ prefix (match any depth)
  if (pat.startsWith('**/')) {
    const suffix = pat.slice(3);
    // Check if the suffix appears as a segment boundary in the path
    if (suffix.endsWith('/**')) {
      const dir = suffix.slice(0, -3);
      return normalized.includes('/' + dir + '/') || normalized.startsWith(dir + '/');
    }
    // Extension match: **/*.md
    if (suffix.startsWith('*.')) {
      const ext = suffix.slice(1); // ".md"
      return normalized.endsWith(ext);
    }
    return normalized.includes('/' + suffix) || normalized === suffix || normalized.startsWith(suffix + '/');
  }

  // Simple wildcard at start: *.log
  if (pat.startsWith('*.')) {
    const ext = pat.slice(1);
    return normalized.endsWith(ext);
  }

  // Exact or prefix match
  if (normalized === pat || normalized.startsWith(pat + '/') || normalized.startsWith(pat)) {
    return true;
  }

  return false;
}

/**
 * Filter inventory items by ignore patterns for a scope.
 */
export function applyIgnorePatterns(
  items: ScanInventoryItem[],
  ignorePatterns: string[]
): ScanInventoryItem[] {
  if (!ignorePatterns.length) return items;
  return items.filter(item => {
    return !ignorePatterns.some(pattern => matchesIgnorePattern(item.relPath, pattern));
  });
}

/**
 * Scan a single scope via the backend API and return inventory items.
 */
export async function scanScope(scope: ScanScope): Promise<ScanInventoryItem[]> {
  try {
    const data = await refactorConsoleClient.scan(
      true,   // rebuild
      false,  // no backup comparison
      undefined,
      'local',
      undefined,
      scope.root  // pass the scope root as sourcePath override
    );

    if (!data?.nodes) return [];

    // Map FileNode[] to ScanInventoryItem[]
    const items: ScanInventoryItem[] = data.nodes.map(node => {
      const ext = node.relPath.includes('.') 
        ? '.' + node.relPath.split('.').pop()!.toLowerCase()
        : '';
      return {
        path: node.path,
        relPath: node.relPath,
        scopeId: scope.id,
        ext,
        size: node.size,
        mtime: node.mtimeMs,
        isDir: node.type === 'dir',
      };
    });

    // Apply client-side ignore patterns
    return applyIgnorePatterns(items, scope.ignore);
  } catch (error) {
    console.error(`[ScanEngine] Failed to scan scope ${scope.id}:`, error);
    return [];
  }
}

/**
 * Scan multiple enabled scopes and merge results.
 */
export async function scanScopes(scopes: ScanScope[]): Promise<ScanInventoryItem[]> {
  const enabledScopes = scopes.filter(s => s.enabled);
  if (enabledScopes.length === 0) return [];

  const results = await Promise.all(enabledScopes.map(scanScope));
  return results.flat();
}
