// URL-first tracing with Router-as-Truth logic
import * as path from 'path';
import { ASTParser, RouteRecord, MenuRecord } from './ast-parser.js';
import { log } from './logger.js';

export interface RouteMatch {
  pattern: string;
  specificity: number;
  route: RouteRecord;
  params: Record<string, string>;
}

export interface TraceTruthResult {
  status: 'definitive' | 'router_only' | 'conflict' | 'not_found';
  router?: {
    componentName?: string;
    filePath?: string;
    importPath?: string;
  };
  menus: MenuRecord[];
  conflicts?: string[];
  warnings: string[];
}

export interface DependencyNode {
  file: string;
  kind: 'hook' | 'api' | 'component' | 'style' | 'util' | 'store' | 'type';
  importType: 'direct' | 'transitive';
}

export interface TraceArtifacts {
  queriedUrl: string;
  routeMatch?: RouteMatch;
  router?: {
    componentName?: string;
    filePath?: string;
    importPath?: string;
  };
  menus: MenuRecord[];
  truth: 'definitive' | 'router_only' | 'conflict' | 'not_found';
  dynamicParams: Record<string, string>;
  dependencies: DependencyNode[];
  warnings: string[];
  httpProbe?: import('../lib/probe.js').HttpProbeData;
  metadata: {
    timestamp: string;
    version: string;
    processingTime: number;
  };
}

export class URLTracer {
  private astParser: ASTParser;
  private feRoot: string;

  constructor(feRoot: string) {
    this.feRoot = feRoot;
    this.astParser = new ASTParser(feRoot);
  }

  /**
   * Main tracing function - URL-first approach
   */
  async traceUrl(
    url: string,
    options: {
      routerPath?: string;
      menuGlob?: string;
      followImports?: boolean;
    } = {}
  ): Promise<TraceArtifacts> {
    const startTime = Date.now();
    
    log.info('Starting URL trace', { url, options });

    try {
      // Step 1: Parse router to get all routes
      const { routes, components } = await this.astParser.parseRouter(options.routerPath);
      
      // Step 2: Parse menus to get menu items
      const { menus } = await this.astParser.parseMenus(options.menuGlob);
      
      // Step 3: Find matching route by URL
      const routeMatch = this.findRouteMatch(url, routes);
      
      // Step 4: Cross-reference with menus
      const truthResult = this.determineTruth(url, routeMatch, routes, menus);
      
      // Step 5: Build dependency graph if component found
      const dependencies = await this.buildDependencyGraph(
        truthResult.router?.filePath,
        options.followImports
      );
      
      // Step 6: Extract dynamic parameters
      const dynamicParams = routeMatch 
        ? this.extractDynamicParams(url, routeMatch.route.urlPattern)
        : {};

      const artifacts: TraceArtifacts = {
        queriedUrl: url,
        routeMatch,
        router: truthResult.router,
        menus: truthResult.menus,
        truth: truthResult.status,
        dynamicParams,
        dependencies,
        warnings: truthResult.warnings,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '2.0.0-enhanced',
          processingTime: Date.now() - startTime,
        },
      };

      log.info('URL trace completed', { 
        url, 
        truth: truthResult.status,
        dependencies: dependencies.length,
        processingTime: artifacts.metadata.processingTime 
      });

      return artifacts;
    } catch (error) {
      log.error('URL trace failed', { 
        url, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Find the best matching route for a URL
   */
  private findRouteMatch(url: string, routes: RouteRecord[]): RouteMatch | undefined {
    const matches: RouteMatch[] = [];

    for (const route of routes) {
      const match = this.matchRoute(url, route);
      if (match) {
        matches.push(match);
      }
    }

    if (matches.length === 0) {
      return undefined;
    }

    // Sort by specificity (higher is more specific)
    matches.sort((a, b) => b.specificity - a.specificity);
    
    log.debug('Route matching', { 
      url, 
      totalRoutes: routes.length,
      matches: matches.length,
      bestMatch: matches[0]?.pattern 
    });

    return matches[0];
  }

  /**
   * Match a URL against a route pattern
   */
  private matchRoute(url: string, route: RouteRecord): RouteMatch | null {
    const pattern = route.urlPattern;
    let specificity = 0;
    const params: Record<string, string> = {};

    // Handle exact matches
    if (url === pattern) {
      return {
        pattern,
        specificity: 1000, // Highest priority
        route,
        params,
      };
    }

    // Handle dynamic routes
    const patternParts = pattern.split('/').filter(Boolean);
    const urlParts = url.split('/').filter(Boolean);

    // Different number of parts means no match (unless wildcard)
    if (patternParts.length !== urlParts.length && !pattern.includes('*')) {
      return null;
    }

    let dynamicParams = 0;
    let staticSegments = 0;

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const urlPart = urlParts[i];

      if (!urlPart) break;

      if (patternPart.startsWith(':')) {
        // Dynamic parameter
        const paramName = patternPart.slice(1);
        params[paramName] = urlPart;
        dynamicParams++;
      } else if (patternPart === urlPart) {
        // Static segment match
        staticSegments++;
        specificity += 100; // Static segments are more specific
      } else if (patternPart === '*' || patternPart.includes('*')) {
        // Wildcard match
        specificity += 1;
      } else {
        // No match
        return null;
      }
    }

    // Calculate final specificity
    specificity += staticSegments * 100;
    specificity -= dynamicParams * 10; // Dynamic params reduce specificity

    return {
      pattern,
      specificity,
      route,
      params,
    };
  }

  /**
   * Determine the source of truth based on router and menu analysis
   */
  private determineTruth(
    url: string,
    routeMatch: RouteMatch | undefined,
    routes: RouteRecord[],
    menus: MenuRecord[]
  ): TraceTruthResult {
    const warnings: string[] = [];
    const conflicts: string[] = [];

    if (!routeMatch) {
      return {
        status: 'not_found',
        menus: [],
        warnings: [`No route found for URL: ${url}`],
      };
    }

    const router = {
      componentName: routeMatch.route.componentName,
      filePath: routeMatch.route.filePath,
      importPath: routeMatch.route.importPath,
    };

    // Find matching menu items
    const matchingMenus = this.findMatchingMenus(url, routeMatch, menus);

    if (matchingMenus.length === 0) {
      warnings.push('No menu items found for this route');
      return {
        status: 'router_only',
        router,
        menus: [],
        warnings,
      };
    }

    // Check for consistency between router and menus
    const menuComponents = new Set(
      matchingMenus
        .map(menu => menu.componentRef)
        .filter(Boolean)
    );

    if (menuComponents.size > 0) {
      const routerComponent = router.componentName;
      const hasMatchingComponent = Array.from(menuComponents).some(
        menuComp => menuComp === routerComponent || 
                   menuComp?.includes(routerComponent || '') ||
                   (routerComponent && routerComponent.includes(menuComp || ''))
      );

      if (!hasMatchingComponent) {
        conflicts.push(
          `Router component "${routerComponent}" doesn't match menu components: ${Array.from(menuComponents).join(', ')}`
        );
        return {
          status: 'conflict',
          router,
          menus: matchingMenus,
          conflicts,
          warnings,
        };
      }
    }

    return {
      status: 'definitive',
      router,
      menus: matchingMenus,
      warnings,
    };
  }

  /**
   * Find menu items that match the current route
   */
  private findMatchingMenus(
    url: string,
    routeMatch: RouteMatch,
    menus: MenuRecord[]
  ): MenuRecord[] {
    const matching: MenuRecord[] = [];

    for (const menu of menus) {
      // Direct path match
      if (menu.path === url || menu.path === routeMatch.pattern) {
        matching.push(menu);
        continue;
      }

      // Pattern-based match (handle dynamic segments)
      if (this.menuPathMatches(menu.path, routeMatch.pattern)) {
        matching.push(menu);
        continue;
      }

      // Base path match (for nested routes)
      const basePath = url.split('/').slice(0, -1).join('/');
      if (basePath && menu.path === basePath) {
        matching.push(menu);
      }
    }

    return matching;
  }

  /**
   * Check if menu path matches route pattern
   */
  private menuPathMatches(menuPath: string, routePattern: string): boolean {
    // Handle dynamic parameters
    const menuParts = menuPath.split('/').filter(Boolean);
    const routeParts = routePattern.split('/').filter(Boolean);

    if (menuParts.length !== routeParts.length) return false;

    for (let i = 0; i < menuParts.length; i++) {
      const menuPart = menuParts[i];
      const routePart = routeParts[i];

      if (routePart.startsWith(':')) {
        // Dynamic parameter - any value matches
        continue;
      }

      if (menuPart !== routePart) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract dynamic parameter values from URL
   */
  private extractDynamicParams(url: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};
    const urlParts = url.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);

    for (let i = 0; i < patternParts.length && i < urlParts.length; i++) {
      const patternPart = patternParts[i];
      const urlPart = urlParts[i];

      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1);
        params[paramName] = urlPart;
      }
    }

    return params;
  }

  /**
   * Build dependency graph for a component
   */
  private async buildDependencyGraph(
    filePath?: string,
    followImports = true
  ): Promise<DependencyNode[]> {
    if (!filePath || !followImports) {
      return [];
    }

    const dependencies: DependencyNode[] = [];
    const visited = new Set<string>();

    await this.analyzeDependencies(filePath, dependencies, visited, 'direct', 0, 3);

    return dependencies;
  }

  /**
   * Recursively analyze dependencies
   */
  private async analyzeDependencies(
    filePath: string,
    dependencies: DependencyNode[],
    visited: Set<string>,
    importType: 'direct' | 'transitive',
    depth: number,
    maxDepth: number
  ): Promise<void> {
    if (depth >= maxDepth || visited.has(filePath)) {
      return;
    }

    visited.add(filePath);

    try {
      const sourceFile = this.astParser['project'].addSourceFileAtPath(filePath);
      const imports = sourceFile.getImportDeclarations();

      for (const importDecl of imports) {
        const importPath = importDecl.getModuleSpecifierValue();
        const resolvedPath = await this.astParser.resolveComponentPath(
          importPath,
          undefined,
          sourceFile
        );

        if (resolvedPath) {
          const kind = this.classifyDependency(resolvedPath, importPath);
          
          dependencies.push({
            file: path.relative(this.feRoot, resolvedPath),
            kind,
            importType: depth === 0 ? 'direct' : 'transitive',
          });

          // Recurse for transitive dependencies
          await this.analyzeDependencies(
            resolvedPath,
            dependencies,
            visited,
            'transitive',
            depth + 1,
            maxDepth
          );
        } else {
          // External or unresolved dependency
          const kind = this.classifyDependency(importPath, importPath);
          dependencies.push({
            file: importPath,
            kind,
            importType: importType,
          });
        }
      }
    } catch (error) {
      log.debug('Failed to analyze dependencies', { 
        filePath, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Classify dependency type based on file path and import
   */
  private classifyDependency(filePath: string, importPath: string): DependencyNode['kind'] {
    const lowerPath = filePath.toLowerCase();
    const lowerImport = importPath.toLowerCase();

    // API/Service layer
    if (lowerPath.includes('api') || lowerPath.includes('service') || 
        lowerImport.includes('api') || lowerImport.includes('service')) {
      return 'api';
    }

    // Hooks
    if (lowerPath.includes('hook') || lowerImport.includes('hook') ||
        lowerPath.includes('use') || lowerImport.includes('use')) {
      return 'hook';
    }

    // State/Store
    if (lowerPath.includes('store') || lowerPath.includes('state') ||
        lowerPath.includes('context') || lowerPath.includes('redux')) {
      return 'store';
    }

    // Styles
    if (lowerPath.includes('.css') || lowerPath.includes('.scss') ||
        lowerPath.includes('.less') || lowerPath.includes('style')) {
      return 'style';
    }

    // Types
    if (lowerPath.includes('type') || lowerPath.includes('.d.ts') ||
        lowerImport.includes('type')) {
      return 'type';
    }

    // Components (React components)
    if (lowerPath.includes('component') || lowerPath.endsWith('.tsx') ||
        lowerPath.includes('ui') || lowerPath.includes('widget')) {
      return 'component';
    }

    // Default to util
    return 'util';
  }

  /**
   * Build full routes map for all routes in the system
   */
  async buildFullRouteMap(options: {
    routerPath?: string;
    menuGlob?: string;
  } = {}): Promise<{
    routes: RouteRecord[];
    menus: MenuRecord[];
    crossReference: Array<{
      route: RouteRecord;
      menus: MenuRecord[];
      status: 'definitive' | 'router_only' | 'conflict';
    }>;
  }> {
    const { routes } = await this.astParser.parseRouter(options.routerPath);
    const { menus } = await this.astParser.parseMenus(options.menuGlob);

    const crossReference = routes.map(route => {
      const routeMenus = this.findMatchingMenus('', { pattern: route.urlPattern, route, specificity: 0, params: {} }, menus);
      const status = routeMenus.length > 0 ? 'definitive' : 'router_only';

      return { route, menus: routeMenus, status };
    });

    return { routes, menus, crossReference };
  }
}
