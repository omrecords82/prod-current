// Route and menu analyzer for OMTRACE

import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger.js';

export interface RouteInfo {
  path: string;
  component: string;
  roles?: string[];
  line?: number;
}

export interface MenuInfo {
  label: string;
  path: string;
  section: string;
  roles?: string[];
  hidden?: boolean;
  line?: number;
}

export interface RouteAnalysisResult {
  routes: RouteInfo[];
  menus: MenuInfo[];
  componentReferences: string[];
}

/**
 * Analyze Router.tsx for route definitions
 */
export function analyzeRouter(routerPath: string): RouteInfo[] {
  const routes: RouteInfo[] = [];
  
  try {
    if (!fs.existsSync(routerPath)) {
      log.warn('Router.tsx not found', { path: routerPath });
      return routes;
    }

    const content = fs.readFileSync(routerPath, 'utf-8');
    const lines = content.split('\n');

    // Look for route patterns like:
    // path: "/admin/users" element={<UserManagement />}
    // path: "/dashboard" element={<Dashboard />}
    // path: "/assign-task" element: <AssignTaskPage />
    const routePattern = /path:\s*["']([^"']+)["'].*?element\s*:?\s*<([^/>\s]+)/g;
    let match;

    while ((match = routePattern.exec(content)) !== null) {
      const [, routePath, component] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      routes.push({
        path: routePath,
        component: component,
        line: lineNumber,
      });
    }

    log.debug('Found routes in Router.tsx', { count: routes.length });
  } catch (error) {
    log.error('Failed to analyze Router.tsx', { error: error instanceof Error ? error.message : 'Unknown error' });
  }

  return routes;
}

/**
 * Analyze menu configuration files
 */
export function analyzeMenuConfigs(feRoot: string): MenuInfo[] {
  const menus: MenuInfo[] = [];
  const menuFiles = [
    'src/menuConfig.ts',
    'src/menuPermissions.ts',
    'src/config/menu.ts',
    'src/config/menuConfig.ts',
  ];

  for (const menuFile of menuFiles) {
    const fullPath = path.join(feRoot, menuFile);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const fileMenus = parseMenuConfig(content, fullPath);
        menus.push(...fileMenus);
      } catch (error) {
        log.warn('Failed to parse menu config', { file: menuFile, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }

  log.debug('Found menu items', { count: menus.length });
  return menus;
}

/**
 * Parse menu configuration content
 */
function parseMenuConfig(content: string, filePath: string): MenuInfo[] {
  const menus: MenuInfo[] = [];
  const lines = content.split('\n');

  // Look for menu patterns like:
  // { label: "Users", path: "/admin/users", section: "admin" }
  // { label: "Dashboard", path: "/dashboard", section: "main" }
  const menuPattern = /{\s*label\s*:\s*["']([^"']+)["'].*?path\s*:\s*["']([^"']+)["'].*?section\s*:\s*["']([^"']+)["']/g;
  let match;

  while ((match = menuPattern.exec(content)) !== null) {
    const [, label, menuPath, section] = match;
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    menus.push({
      label,
      path: menuPath,
      section,
      line: lineNumber,
    });
  }

  return menus;
}

/**
 * Find all route and menu references for a component
 */
export function findComponentReferences(
  componentName: string,
  feRoot: string
): RouteAnalysisResult {
  const routerPath = path.join(feRoot, 'src/routes/Router.tsx');
  const routes = analyzeRouter(routerPath);
  const menus = analyzeMenuConfigs(feRoot);

  log.debug('Route analysis debug', { 
    componentName, 
    totalRoutes: routes.length, 
    totalMenus: menus.length 
  });

  // Find routes that use this component
  const componentRoutes = routes.filter(route => 
    route.component === componentName || 
    route.component.includes(componentName)
  );

  log.debug('Component routes found', { 
    componentRoutes: componentRoutes.map(r => ({ path: r.path, component: r.component }))
  });

  // Find menu items that lead to this component's routes
  const componentMenus = menus.filter(menu => 
    componentRoutes.some(route => route.path === menu.path)
  );

  // Find all references to this component
  const componentReferences: string[] = [];
  
  // Add route references
  componentRoutes.forEach(route => {
    componentReferences.push(`Route: ${route.path} (line ${route.line})`);
  });

  // Add menu references
  componentMenus.forEach(menu => {
    componentReferences.push(`Menu: ${menu.label} in ${menu.section} (line ${menu.line})`);
  });

  log.debug('Final result', { 
    routes: componentRoutes.length, 
    menus: componentMenus.length, 
    references: componentReferences.length 
  });

  return {
    routes: componentRoutes,
    menus: componentMenus,
    componentReferences,
  };
}

/**
 * Get all routes and menus in the system
 */
export function getAllRoutesAndMenus(feRoot: string): { routes: RouteInfo[], menus: MenuInfo[] } {
  const routerPath = path.join(feRoot, 'src/routes/Router.tsx');
  const routes = analyzeRouter(routerPath);
  const menus = analyzeMenuConfigs(feRoot);

  return { routes, menus };
}
