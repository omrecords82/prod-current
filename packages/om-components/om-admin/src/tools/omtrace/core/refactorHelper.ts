// Refactor helper for OMTRACE

import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger.js';
import { DepsIndex } from './types.js';
import { findComponentReferences } from './routeAnalyzer.js';

export interface DuplicateComponent {
  path: string;
  mtime: number;
  reverseImports: number;
  size: number;
}

export interface RefactorRecommendation {
  keepFile: string;
  renameFiles: Array<{ from: string; to: string }>;
  impact: number;
  suggestedDestination: string;
}

/**
 * Find duplicate components by name
 */
export function findDuplicateComponents(
  componentName: string,
  index: DepsIndex,
  feRoot: string
): DuplicateComponent[] {
  const duplicates: DuplicateComponent[] = [];
  
  // Find all files that match the component name
  const matchingFiles = index.nodes.filter(node => {
    const basename = path.basename(node.id, path.extname(node.id));
    return basename === componentName || basename.includes(componentName);
  });

  if (matchingFiles.length <= 1) {
    return duplicates;
  }

  // Analyze each duplicate
  for (const file of matchingFiles) {
    const fullPath = path.join(feRoot, file.id);
    const stats = fs.statSync(fullPath);
    
    // Count reverse imports
    const reverseImports = index.nodes.filter(node => 
      node.imports && node.imports.includes(file.id)
    ).length;

    duplicates.push({
      path: file.id,
      mtime: file.mtime || stats.mtime.getTime(),
      reverseImports: reverseImports,
      size: stats.size,
    });
  }

  // Sort by reverse imports (most used first), then by modification time
  duplicates.sort((a, b) => {
    if (a.reverseImports !== b.reverseImports) {
      return b.reverseImports - a.reverseImports;
    }
    return b.mtime - a.mtime;
  });

  return duplicates;
}

/**
 * Generate refactor recommendations
 */
export function generateRefactorRecommendation(
  componentName: string,
  duplicates: DuplicateComponent[],
  feRoot: string
): RefactorRecommendation {
  if (duplicates.length === 0) {
    throw new Error('No duplicates found');
  }

  // Recommend keeping the file with most reverse imports
  const keepFile = duplicates[0].path;
  
  // Suggest renaming other files
  const renameFiles = duplicates.slice(1).map(dup => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ext = path.extname(dup.path);
    const dir = path.dirname(dup.path);
    const newName = `${path.basename(dup.path, ext)}.old.${timestamp}${ext}`;
    
    return {
      from: dup.path,
      to: path.join(dir, newName),
    };
  });

  // Calculate total impact
  const impact = duplicates.reduce((sum, dup) => sum + dup.reverseImports, 0);

  // Suggest final destination using naming conventions
  const suggestedDestination = suggestNamingConvention(componentName, feRoot);

  return {
    keepFile,
    renameFiles,
    impact,
    suggestedDestination,
  };
}

/**
 * Suggest naming convention based on component type
 */
function suggestNamingConvention(componentName: string, feRoot: string): string {
  // Check if it's a page component
  const pagePath = path.join(feRoot, 'src/pages', `${componentName}.tsx`);
  if (fs.existsSync(pagePath)) {
    return `src/pages/${getGroupFromPath(pagePath)}/pg_${getSlugFromName(componentName)}.tsx`;
  }

  // Check if it's a component
  const componentPath = path.join(feRoot, 'src/components', `${componentName}.tsx`);
  if (fs.existsSync(componentPath)) {
    return `src/components/${getGroupFromPath(componentPath)}/com_${getSlugFromName(componentName)}.tsx`;
  }

  // Default to components directory
  return `src/components/general/com_${getSlugFromName(componentName)}.tsx`;
}

/**
 * Extract group from file path
 */
function getGroupFromPath(filePath: string): string {
  const parts = filePath.split(path.sep);
  const srcIndex = parts.indexOf('src');
  if (srcIndex !== -1 && srcIndex + 2 < parts.length) {
    return parts[srcIndex + 2]; // src/[pages|components]/[group]/...
  }
  return 'general';
}

/**
 * Generate slug from component name
 */
function getSlugFromName(componentName: string): string {
  // Convert PascalCase to kebab-case
  return componentName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Execute refactor with rename-legacy option
 */
export function executeRefactor(
  componentName: string,
  duplicates: DuplicateComponent[],
  feRoot: string,
  renameLegacy: boolean = false
): boolean {
  try {
    const recommendation = generateRefactorRecommendation(componentName, duplicates, feRoot);
    
    console.log('🔧 Refactor Recommendation:');
    console.log(`   Keep: ${recommendation.keepFile}`);
    console.log(`   Impact: ${recommendation.impact} reverse imports`);
    console.log(`   Suggested destination: ${recommendation.suggestedDestination}`);
    console.log('');

    if (renameLegacy) {
      console.log('🔄 Renaming legacy files...');
      
      for (const renameOp of recommendation.renameFiles) {
        const fromPath = path.join(feRoot, renameOp.from);
        const toPath = path.join(feRoot, renameOp.to);
        
        if (fs.existsSync(fromPath)) {
          // Ensure destination directory exists
          const toDir = path.dirname(toPath);
          if (!fs.existsSync(toDir)) {
            fs.mkdirSync(toDir, { recursive: true });
          }
          
          fs.renameSync(fromPath, toPath);
          console.log(`   ✓ ${renameOp.from} → ${renameOp.to}`);
        }
      }
      
      console.log('✅ Legacy files renamed successfully');
    }

    return true;
  } catch (error) {
    log.error('Failed to execute refactor', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

/**
 * Check naming convention compliance
 */
export function checkNamingConventions(feRoot: string): void {
  console.log('🔍 Checking naming convention compliance...');
  
  const violations: string[] = [];
  
  // Check pages
  const pagesDir = path.join(feRoot, 'src/pages');
  if (fs.existsSync(pagesDir)) {
    checkDirectoryNaming(pagesDir, 'pg_', violations);
  }
  
  // Check components
  const componentsDir = path.join(feRoot, 'src/components');
  if (fs.existsSync(componentsDir)) {
    checkDirectoryNaming(componentsDir, 'com_', violations);
  }
  
  if (violations.length === 0) {
    console.log('✅ All files follow naming conventions');
  } else {
    console.log(`⚠️  Found ${violations.length} naming convention violations:`);
    violations.forEach(violation => console.log(`   • ${violation}`));
  }
}

/**
 * Check directory for naming convention compliance
 */
function checkDirectoryNaming(dirPath: string, prefix: string, violations: string[]): void {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    
    if (item.isDirectory()) {
      checkDirectoryNaming(fullPath, prefix, violations);
    } else if (item.isFile() && item.name.endsWith('.tsx')) {
      const basename = path.basename(item.name, '.tsx');
      if (!basename.startsWith(prefix)) {
        violations.push(`${fullPath} should start with ${prefix}`);
      }
    }
  }
}
