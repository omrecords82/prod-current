// Menu management system for OMTRACE

import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger.js';
import { MenuInfo, RouteInfo, analyzeRouter, analyzeMenuConfigs } from './routeAnalyzer.js';

export interface MenuAddOptions {
  label: string;
  path: string;
  role?: string;
  section?: string;
  hidden?: boolean;
}

export interface MenuRemoveOptions {
  path: string;
  preserve?: boolean;
  delete?: boolean;
}

/**
 * List all menu items grouped by section
 */
export function listAllMenus(feRoot: string): void {
  const menus = analyzeMenuConfigs(feRoot);
  const routes = analyzeRouter(path.join(feRoot, 'src/routes/Router.tsx'));

  if (menus.length === 0) {
    console.log('📋 No menu items found in configuration files');
    return;
  }

  // Group menus by section
  const groupedMenus: { [section: string]: MenuInfo[] } = {};
  menus.forEach(menu => {
    if (!groupedMenus[menu.section]) {
      groupedMenus[menu.section] = [];
    }
    groupedMenus[menu.section].push(menu);
  });

  console.log('📋 Menu Items by Section:');
  console.log('');

  Object.entries(groupedMenus).forEach(([section, sectionMenus]) => {
    console.log(`🔹 ${section.toUpperCase()} (${sectionMenus.length} items):`);
    sectionMenus.forEach(menu => {
      const routeInfo = routes.find(r => r.path === menu.path);
      const componentInfo = routeInfo ? ` → ${routeInfo.component}` : ' → No route';
      const hiddenInfo = menu.hidden ? ' [HIDDEN]' : '';
      console.log(`   • ${menu.label} (${menu.path})${componentInfo}${hiddenInfo}`);
    });
    console.log('');
  });

  // Show orphaned routes (routes without menu items)
  const orphanedRoutes = routes.filter(route => 
    !menus.some(menu => menu.path === route.path)
  );

  if (orphanedRoutes.length > 0) {
    console.log(`⚠️  Orphaned Routes (${orphanedRoutes.length} routes without menu items):`);
    orphanedRoutes.forEach(route => {
      console.log(`   • ${route.path} → ${route.component}`);
    });
    console.log('');
  }
}

/**
 * Add a new menu item
 */
export function addMenuItem(feRoot: string, options: MenuAddOptions): boolean {
  try {
    const { label, path: menuPath, role, section = 'tools', hidden = false } = options;
    
    // Find or create menu config file
    const menuConfigPath = findOrCreateMenuConfig(feRoot);
    const content = fs.readFileSync(menuConfigPath, 'utf-8');
    
    // Create new menu item
    const newMenuItem = `  {
    label: "${label}",
    path: "${menuPath}",
    section: "${section}",
    roles: ${role ? `["${role}"]` : 'undefined'},
    hidden: ${hidden},
  },`;

    // Find insertion point (after last menu item in the section)
    const sectionPattern = new RegExp(`section:\\s*"${section}"[^}]*},?`, 'g');
    const matches = Array.from(content.matchAll(sectionPattern));
    
    if (matches.length > 0) {
      // Insert after the last item in the section
      const lastMatch = matches[matches.length - 1];
      const insertIndex = lastMatch.index! + lastMatch[0].length;
      const newContent = content.slice(0, insertIndex) + '\n' + newMenuItem + content.slice(insertIndex);
      
      fs.writeFileSync(menuConfigPath, newContent);
      log.info('Menu item added successfully', { label, path: menuPath, section });
      
      // Also add route to Router.tsx if not present
      addRouteIfNotPresent(feRoot, menuPath, label);
      
      return true;
    } else {
      log.error('Section not found in menu config', { section });
      return false;
    }
  } catch (error) {
    log.error('Failed to add menu item', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

/**
 * Remove a menu item and optionally its route
 */
export function removeMenuItem(feRoot: string, options: MenuRemoveOptions): boolean {
  try {
    const { path: menuPath, preserve = false, delete: deleteComponent = false } = options;
    
    // Remove from menu config
    const menuConfigPath = findOrCreateMenuConfig(feRoot);
    const content = fs.readFileSync(menuConfigPath, 'utf-8');
    
    // Remove menu item
    const menuPattern = new RegExp(`\\s*{[^}]*path:\\s*"${menuPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^}]*},?\\s*`, 'g');
    const newContent = content.replace(menuPattern, '');
    
    if (newContent !== content) {
      fs.writeFileSync(menuConfigPath, newContent);
      log.info('Menu item removed successfully', { path: menuPath });
    }

    // Remove route from Router.tsx
    removeRoute(feRoot, menuPath);

    // Handle component file
    if (deleteComponent) {
      // Find component file and delete it
      const componentPath = findComponentByRoute(feRoot, menuPath);
      if (componentPath && fs.existsSync(componentPath)) {
        fs.unlinkSync(componentPath);
        log.info('Component file deleted', { path: componentPath });
      }
    }

    return true;
  } catch (error) {
    log.error('Failed to remove menu item', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

/**
 * Find or create menu configuration file
 */
function findOrCreateMenuConfig(feRoot: string): string {
  const possiblePaths = [
    'src/menuConfig.ts',
    'src/config/menu.ts',
    'src/config/menuConfig.ts',
  ];

  for (const configPath of possiblePaths) {
    const fullPath = path.join(feRoot, configPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Create default menu config
  const defaultPath = path.join(feRoot, 'src/menuConfig.ts');
  const defaultContent = `// Menu configuration
export const menuConfig = [
  {
    label: "Dashboard",
    path: "/dashboard",
    section: "main",
  },
  {
    label: "Tools",
    path: "/tools",
    section: "tools",
  },
];

export default menuConfig;
`;

  // Ensure directory exists
  const dir = path.dirname(defaultPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(defaultPath, defaultContent);
  log.info('Created default menu config', { path: defaultPath });
  
  return defaultPath;
}

/**
 * Add route to Router.tsx if not present
 */
function addRouteIfNotPresent(feRoot: string, routePath: string, componentName: string): void {
  const routerPath = path.join(feRoot, 'src/routes/Router.tsx');
  
  if (!fs.existsSync(routerPath)) {
    log.warn('Router.tsx not found, cannot add route', { path: routerPath });
    return;
  }

  const content = fs.readFileSync(routerPath, 'utf-8');
  
  // Check if route already exists
  if (content.includes(`path: "${routePath}"`)) {
    log.info('Route already exists in Router.tsx', { path: routePath });
    return;
  }

  // Add route (this is a simplified implementation)
  log.info('Route should be added to Router.tsx manually', { path: routePath, component: componentName });
}

/**
 * Remove route from Router.tsx
 */
function removeRoute(feRoot: string, routePath: string): void {
  const routerPath = path.join(feRoot, 'src/routes/Router.tsx');
  
  if (!fs.existsSync(routerPath)) {
    return;
  }

  const content = fs.readFileSync(routerPath, 'utf-8');
  
  // Remove route (this is a simplified implementation)
  log.info('Route should be removed from Router.tsx manually', { path: routePath });
}

/**
 * Find component file by route path
 */
function findComponentByRoute(feRoot: string, routePath: string): string | null {
  const routes = analyzeRouter(path.join(feRoot, 'src/routes/Router.tsx'));
  const route = routes.find(r => r.path === routePath);
  
  if (route) {
    // Try to find the component file
    const possiblePaths = [
      `src/pages/${route.component}.tsx`,
      `src/components/${route.component}.tsx`,
      `src/views/${route.component}.tsx`,
    ];

    for (const possiblePath of possiblePaths) {
      const fullPath = path.join(feRoot, possiblePath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}
