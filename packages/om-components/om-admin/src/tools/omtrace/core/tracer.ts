// Dependency tracer for OMTRACE system

import { log } from './logger.js';
import { DepsIndex, TraceResult } from './types.js';

export interface TraceOptions {
  reverse?: boolean;
  deep?: boolean;
  showServer?: boolean; // Show server-side API endpoints
  maxDepth?: number; // Maximum depth for transitive dependencies (1-10)
  baseDir?: string; // Base directory for path resolution
  scanRoot?: string; // Scan root directory
}

/**
 * Trace dependencies for a given file
 */
export async function traceDependencies(
  targetPath: string,
  index: DepsIndex,
  options: TraceOptions = {}
): Promise<TraceResult> {
  log.debug('Tracing dependencies', { targetPath, options });

  // Find the target node
  const targetNode = index.nodes.find(node => node.id === targetPath);
  if (!targetNode) {
    throw new Error(`Target file not found in index: ${targetPath}`);
  }

  // Get direct imports
  const directImports = targetNode.imports || [];
  
  // Get reverse imports (who uses this file)
  const reverseImports = options.reverse ? findReverseImports(targetPath, index) : [];
  
  // Get transitive dependencies if deep tracing is requested
  const maxDepth = options.maxDepth || 10;
  const transitiveImports = options.deep ? findTransitiveImports(targetPath, index, new Set(), 0, maxDepth) : [];
  
    // Get server-side API endpoints if requested
  const serverEndpoints = options.showServer ? await findServerEndpoints(targetPath, index) : [];
  
  log.debug('Server endpoint analysis', { 
    targetPath, 
    showServer: options.showServer, 
    serverEndpointsFound: serverEndpoints.length,
    serverEndpoints 
  });
  
  // Remove duplicates and normalize
  const allDirect = Array.from(new Set(directImports));
  const allReverse = Array.from(new Set(reverseImports));
  const allTransitive = Array.from(new Set(transitiveImports));
  const allServer = Array.from(new Set(serverEndpoints));

  return {
    entry: targetPath,
    resolvedPath: targetPath,
    status: 'ok',
    counts: {
      direct: allDirect.length,
      transitive: allTransitive.length,
      reverse: allReverse.length,
      server: allServer.length,
    },
    deps: {
      direct: allDirect,
      transitive: allTransitive,
      reverse: allReverse,
      server: allServer,
    },
  };
}

/**
 * Find files that import the target file
 */
function findReverseImports(targetPath: string, index: DepsIndex): string[] {
  const reverseImports: string[] = [];
  
  for (const node of index.nodes) {
    if (node.imports && node.imports.includes(targetPath)) {
      reverseImports.push(node.id);
    }
  }
  
  return reverseImports;
}

/**
 * Find transitive dependencies recursively
 */
function findTransitiveImports(
  targetPath: string, 
  index: DepsIndex, 
  visited: Set<string>,
  depth: number = 0,
  maxDepth: number = 10
): string[] {
  if (depth >= maxDepth) {
    log.debug('Max depth reached for transitive tracing', { targetPath, depth, maxDepth });
    return [];
  }
  
  if (visited.has(targetPath)) {
    return [];
  }
  
  visited.add(targetPath);
  const transitiveImports: string[] = [];
  
  const targetNode = index.nodes.find(node => node.id === targetPath);
  if (!targetNode || !targetNode.imports) {
    return [];
  }
  
  for (const importPath of targetNode.imports) {
    if (!visited.has(importPath)) {
      transitiveImports.push(importPath);
      
      // Recursively trace this import
      const nestedImports = findTransitiveImports(importPath, index, visited, depth + 1, maxDepth);
      transitiveImports.push(...nestedImports);
    }
  }
  
  return transitiveImports;
}

/**
 * Find server-side API endpoints that the front-end file calls
 */
async function findServerEndpoints(targetPath: string, index: DepsIndex): Promise<string[]> {
  const serverEndpoints: string[] = [];
  
  log.debug('Starting server endpoint search', { targetPath });
  
  // Find the target node
  const targetNode = index.nodes.find(node => node.id === targetPath);
  if (!targetNode) {
    log.debug('Target node not found', { targetPath });
    return serverEndpoints;
  }
  
  // Read the file content to find API calls
  try {
    const fs = await import('fs');
    const path = await import('path');
    
                 // Determine the full path based on whether it's front-end or server
       let fullPath: string;
       // Use baseDir from options if available, otherwise fall back to default
       const baseDir = index.metadata?.baseDir || '/var/www/orthodoxmetrics/prod';
       
       if (targetPath.startsWith('src/') || targetPath.includes('/admin/') || targetPath.includes('/components/') || targetPath.includes('/api/') || targetPath.includes('/context/')) {
         // This is a front-end file, look for API calls
         const normalizedPath = targetPath.startsWith('src/') ? targetPath : 'src/' + targetPath;
         fullPath = path.default.join(baseDir, 'front-end', normalizedPath);
       } else {
         return serverEndpoints; // Not a front-end file
       }
    
    if (!fs.default.existsSync(fullPath)) {
      return serverEndpoints;
    }
    
    const content = fs.default.readFileSync(fullPath, 'utf-8');
    
             // Look for API endpoint patterns
     const apiPatterns = [
       // Direct HTTP method calls
       /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
       /apiClient\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
       /fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi,
       /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
       // Service layer API calls (like omaiAPI.methodName())
       /omaiAPI\.(\w+)\s*\(/gi,
       /(\w+)API\.(\w+)\s*\(/gi,
     ];
    
    log.debug('Analyzing file content for API patterns', { 
      targetPath, 
      contentLength: content.length,
      patterns: apiPatterns.length 
    });
    
    for (const pattern of apiPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let endpoint = match[2] || match[1];
        log.debug('Found API pattern match', { endpoint, match: match[0] });
        
        // Handle different pattern types
        if (endpoint && endpoint.startsWith('/')) {
          // Direct endpoint URL
          log.debug('Found valid endpoint', { endpoint });
          const serverFiles = await findServerFilesForEndpoint(endpoint, index);
          log.debug('Server files found for endpoint', { endpoint, serverFiles });
          serverEndpoints.push(...serverFiles);
        } else if (match[0].includes('omaiAPI.')) {
          // OMAI API calls - map method names to endpoints
          const methodName = match[1];
          log.debug('Found OMAI API call', { methodName });
          const mappedEndpoints = mapOMAIEndpoints(methodName);
          for (const endpoint of mappedEndpoints) {
            const serverFiles = await findServerFilesForEndpoint(endpoint, index);
            log.debug('Server files found for OMAI endpoint', { endpoint, serverFiles });
            serverEndpoints.push(...serverFiles);
          }
        }
      }
    }
    
  } catch (error) {
    log.warn('Failed to analyze file for server endpoints', { targetPath, error: error instanceof Error ? error.message : 'Unknown error' });
  }
  
  return Array.from(new Set(serverEndpoints)); // Remove duplicates
}

/**
 * Map OMAI API method names to their corresponding endpoints
 */
function mapOMAIEndpoints(methodName: string): string[] {
  const endpointMap: { [key: string]: string[] } = {
    'getTaskLogs': ['/omai/task-logs'],
    'generateTaskLink': ['/omai/task-link'],
    'deleteTaskLink': ['/omai/task-link'],
    'validateToken': ['/omai/validate-token'],
    'submitTasks': ['/omai/submit-task'],
  };
  
  return endpointMap[methodName] || [];
}

/**
 * Find server-side files that handle a specific API endpoint
 */
async function findServerFilesForEndpoint(endpoint: string, index: DepsIndex): Promise<string[]> {
  const serverFiles: string[] = [];
  
  // Look for server-side files that might handle this endpoint
  log.debug('Searching for server files handling endpoint', { endpoint, totalNodes: index.nodes.length });
  
  let serverNodeCount = 0;
  for (const node of index.nodes) {
    if (node.id.startsWith('server/src/')) {
      serverNodeCount++;
      // This is a server file, check if it handles the endpoint
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        // Determine the full path using baseDir from index metadata
        const baseDir = index.metadata?.baseDir || '/var/www/orthodoxmetrics/prod';
        const fullPath = path.default.join(baseDir, node.id);
        
        if (fs.default.existsSync(fullPath)) {
          const content = fs.default.readFileSync(fullPath, 'utf-8');
          
          // Check if this file handles the endpoint
          if (content.includes(endpoint) || 
              content.includes(endpoint.replace('/', '')) ||
              content.includes(`'${endpoint}'`) ||
              content.includes(`"${endpoint}"`)) {
            log.debug('Found server file handling endpoint', { endpoint, serverFile: node.id });
            serverFiles.push(node.id);
          }
        }
      } catch (error) {
        // Skip files we can't read
        continue;
      }
    }
  }
  
  log.debug('Server endpoint search complete', { 
    endpoint, 
    serverNodeCount, 
    serverFilesFound: serverFiles.length 
  });
  
  return serverFiles;
}

/**
 * Get a summary of dependency relationships
 */
export async function getDependencySummary(
  targetPath: string,
  index: DepsIndex,
  options: TraceOptions = {}
): Promise<string> {
  const trace = await traceDependencies(targetPath, index, options);
  
  let summary = `📁 ${targetPath}\n`;
  summary += `├─ Direct imports: ${trace.counts.direct}\n`;
  
  if (options.reverse) {
    summary += `├─ Reverse imports: ${trace.counts.reverse}\n`;
  }
  
  if (options.deep) {
    summary += `├─ Transitive dependencies: ${trace.counts.transitive}\n`;
  }
  
  if (options.showServer && trace.counts.server > 0) {
    summary += `└─ Server endpoints: ${trace.counts.server}\n`;
  }
  
  return summary;
}

/**
 * Format dependency lists for display
 */
export function formatDependencies(
  deps: string[],
  title: string,
  maxItems: number = 10
): string {
  if (deps.length === 0) {
    return `${title}: None`;
  }
  
  const displayDeps = deps.slice(0, maxItems);
  const remaining = deps.length - maxItems;
  
  let result = `${title} (${deps.length}):\n`;
  
  for (const dep of displayDeps) {
    result += `  • ${dep}\n`;
  }
  
  if (remaining > 0) {
    result += `  ... and ${remaining} more\n`;
  }
  
  return result;
}
