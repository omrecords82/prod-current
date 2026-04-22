/**
 * Recursive Bundle Resolver
 * 
 * Follows import paths to group Pages, Components, Hooks, and Services
 * into actionable feature bundles.
 */

import { FileComparison, FileAnalysis, FeatureBundle, ImportDependency, EndpointReference } from '@/types/refactorConsole';

// Note: This runs in the browser, so we can't access file system directly
// All file paths are relative paths from the backup source

/**
 * Categorize a file based on its path and name
 */
function categorizeFile(relPath: string): 'page' | 'component' | 'hook' | 'service' | 'other' {
  const lowerPath = relPath.toLowerCase();
  
  if (lowerPath.includes('/pages/') || lowerPath.includes('/page/')) {
    return 'page';
  }
  if (lowerPath.includes('/components/') || lowerPath.includes('/component/')) {
    return 'component';
  }
  if (lowerPath.includes('/hooks/') || lowerPath.includes('/hook/') || lowerPath.includes('use') && relPath.endsWith('.ts')) {
    return 'hook';
  }
  if (lowerPath.includes('/services/') || lowerPath.includes('/service/') || lowerPath.includes('/api/')) {
    return 'service';
  }
  
  return 'other';
}

/**
 * Resolve import path to a relative path within the backup
 */
function resolveImportPath(
  importPath: string,
  fromFile: string,
  availableFiles: Map<string, FileComparison>
): string | null {
  // Skip node_modules and external imports
  if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('@/')) {
    return null;
  }
  
  // Handle alias imports (@/)
  if (importPath.startsWith('@/')) {
    const aliasPath = importPath.replace('@/', '');
    // Try to find in available files
    for (const [relPath] of availableFiles) {
      if (relPath.includes(aliasPath)) {
        return relPath;
      }
    }
    return null;
  }
  
  // Handle relative imports
  const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
  const resolvedPath = importPath.startsWith('/')
    ? importPath.substring(1)
    : `${fromDir}/${importPath}`.replace(/\/\.\//g, '/').replace(/\/[^/]+\/\.\.\//g, '/');
  
  // Try exact match
  if (availableFiles.has(resolvedPath)) {
    return resolvedPath;
  }
  
  // Try with extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    if (availableFiles.has(resolvedPath + ext)) {
      return resolvedPath + ext;
    }
  }
  
  // Try directory index files
  for (const ext of extensions) {
    const indexPath = `${resolvedPath}/index${ext}`;
    if (availableFiles.has(indexPath)) {
      return indexPath;
    }
  }
  
  return null;
}

/**
 * Recursively calculate bundle starting from a root file
 */
export function calculateBundle(
  rootFile: FileComparison,
  allFiles: Map<string, FileComparison>,
  fileAnalyses: Map<string, FileAnalysis>
): FeatureBundle {
  const bundle: FeatureBundle = {
    rootFile,
    files: [rootFile],
    components: [],
    hooks: [],
    services: [],
    pages: [],
    allImportsResolved: true,
    missingImports: [],
    requiredEndpoints: [],
    status: 'unknown'
  };
  
  const processed = new Set<string>([rootFile.relPath]);
  const queue: string[] = [rootFile.relPath];
  
  // BFS traversal of imports
  while (queue.length > 0) {
    const currentRelPath = queue.shift()!;
    const fileAnalysis = fileAnalyses.get(currentRelPath);
    
    if (!fileAnalysis) continue;
    
    // Collect endpoints
    bundle.requiredEndpoints.push(...fileAnalysis.endpoints);
    
    // Process imports
    for (const imp of fileAnalysis.imports) {
      if (!imp.resolved) {
        bundle.allImportsResolved = false;
        
        // Try to resolve in backup
        const resolvedPath = resolveImportPath(imp.importPath, currentRelPath, allFiles);
        
        if (resolvedPath && allFiles.has(resolvedPath)) {
          // Found in backup - add to bundle
          if (!processed.has(resolvedPath)) {
            const depFile = allFiles.get(resolvedPath)!;
            bundle.files.push(depFile);
            processed.add(resolvedPath);
            queue.push(resolvedPath);
            
            // Categorize
            const category = categorizeFile(resolvedPath);
            if (category === 'component') bundle.components.push(depFile);
            else if (category === 'hook') bundle.hooks.push(depFile);
            else if (category === 'service') bundle.services.push(depFile);
            else if (category === 'page') bundle.pages.push(depFile);
          }
        } else {
          // Missing import
          bundle.missingImports.push(imp);
        }
      } else {
        // Import resolved - check if it's in backup and should be included
        if (imp.resolvedPath && allFiles.has(imp.resolvedPath)) {
          const resolvedPath = imp.resolvedPath;
          if (!processed.has(resolvedPath)) {
            const depFile = allFiles.get(resolvedPath)!;
            bundle.files.push(depFile);
            processed.add(resolvedPath);
            queue.push(resolvedPath);
            
            const category = categorizeFile(resolvedPath);
            if (category === 'component') bundle.components.push(depFile);
            else if (category === 'hook') bundle.hooks.push(depFile);
            else if (category === 'service') bundle.services.push(depFile);
            else if (category === 'page') bundle.pages.push(depFile);
          }
        }
      }
    }
  }
  
  // Categorize root file
  const rootCategory = categorizeFile(rootFile.relPath);
  if (rootCategory === 'page') bundle.pages.push(rootFile);
  else if (rootCategory === 'component') bundle.components.push(rootFile);
  else if (rootCategory === 'hook') bundle.hooks.push(rootFile);
  else if (rootCategory === 'service') bundle.services.push(rootFile);
  
  // Determine status
  const missingEndpoints = bundle.requiredEndpoints.filter(ep => !ep.existsInServer);
  if (missingEndpoints.length > 0) {
    bundle.status = 'server_blocker';
  } else if (!bundle.allImportsResolved && bundle.missingImports.length > 0) {
    bundle.status = 'missing_deps';
  } else if (bundle.allImportsResolved) {
    bundle.status = 'ready';
  }
  
  return bundle;
}

/**
 * Calculate bundles for all restorable files
 */
export function calculateAllBundles(
  restorableFiles: FileComparison[],
  fileAnalyses: FileAnalysis[]
): Map<string, FeatureBundle> {
  const bundles = new Map<string, FeatureBundle>();
  const allFiles = new Map<string, FileComparison>();
  const analysesMap = new Map<string, FileAnalysis>();
  
  // Build maps
  restorableFiles.forEach(file => {
    allFiles.set(file.relPath, file);
  });
  
  fileAnalyses.forEach(analysis => {
    analysesMap.set(analysis.file.relPath, analysis);
  });
  
  // Calculate bundle for each root file
  // Group files by their likely root (pages are roots, components/hooks/services are dependencies)
  const processed = new Set<string>();
  
  restorableFiles.forEach(rootFile => {
    if (processed.has(rootFile.relPath)) return;
    
    const category = categorizeFile(rootFile.relPath);
    // Create bundles for pages and top-level files (not already part of another bundle)
    if (category === 'page' || (category === 'other' && !rootFile.relPath.includes('/components/') && !rootFile.relPath.includes('/hooks/') && !rootFile.relPath.includes('/services/'))) {
      const bundle = calculateBundle(rootFile, allFiles, analysesMap);
      bundles.set(rootFile.relPath, bundle);
      
      // Mark all files in bundle as processed
      bundle.files.forEach(file => processed.add(file.relPath));
    }
  });
  
  // For remaining files not in bundles, create individual bundles
  restorableFiles.forEach(rootFile => {
    if (!processed.has(rootFile.relPath)) {
      const bundle = calculateBundle(rootFile, allFiles, analysesMap);
      bundles.set(rootFile.relPath, bundle);
    }
  });
  
  return bundles;
}
