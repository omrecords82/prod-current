// AST-based parser for Router and menu analysis using ts-morph
import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { log } from './logger.js';

export interface RouteRecord {
  urlPattern: string;
  element?: string;
  lazy?: string;
  importPath?: string;
  componentName?: string;
  filePath?: string;
  dynamicParams?: string[];
  nested?: boolean;
  layoutWrapped?: boolean;
}

export interface MenuRecord {
  label: string;
  path: string;
  icon?: string;
  componentRef?: string;
  importPath?: string;
  section?: string;
  roles?: string[];
  hidden?: boolean;
}

export interface ParsedRoutes {
  routes: RouteRecord[];
  components: Map<string, string>; // componentName -> filePath
}

export interface ParsedMenus {
  menus: MenuRecord[];
  sections: Set<string>;
}

export class ASTParser {
  private project: Project;
  private feRoot: string;

  constructor(feRoot: string) {
    this.feRoot = feRoot;
    this.project = new Project({
      tsConfigFilePath: path.join(feRoot, 'tsconfig.json'),
      addFilesFromTsConfig: false, // We'll add files manually for better control
    });
  }

  /**
   * Parse Router.tsx file to extract route definitions
   */
  async parseRouter(routerPath?: string): Promise<ParsedRoutes> {
    const routes: RouteRecord[] = [];
    const components = new Map<string, string>();

    // Auto-detect router file if not provided
    if (!routerPath) {
      const possibleRouters = [
        path.join(this.feRoot, 'src/routes/Router.tsx'),
        path.join(this.feRoot, 'src/app/Router.tsx'),
        path.join(this.feRoot, 'src/Router.tsx'),
        path.join(this.feRoot, 'Router.tsx'),
      ];

      routerPath = possibleRouters.find(p => fs.existsSync(p));
      if (!routerPath) {
        throw new Error('Router.tsx not found in common locations');
      }
    }

    log.info('Parsing router file', { routerPath });

    try {
      const sourceFile = this.project.addSourceFileAtPath(routerPath);
      
      // Parse route definitions
      await this.parseRouteDefinitions(sourceFile, routes, components);
      
      // Parse lazy imports
      this.parseLazyImports(sourceFile, components);

      log.info('Router parsing completed', { 
        routesFound: routes.length, 
        componentsFound: components.size 
      });

      return { routes, components };
    } catch (error) {
      log.error('Failed to parse router', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Parse menu configuration files
   */
  async parseMenus(menuGlob = 'front-end/src/**/*menu*.(ts|tsx)'): Promise<ParsedMenus> {
    const menus: MenuRecord[] = [];
    const sections = new Set<string>();

    // Find menu files using glob pattern
    const menuFiles = this.findMenuFiles(menuGlob);
    
    log.info('Found menu files', { count: menuFiles.length, files: menuFiles });

    for (const menuFile of menuFiles) {
      try {
        const sourceFile = this.project.addSourceFileAtPath(menuFile);
        const fileMenus = await this.parseMenuFile(sourceFile);
        
        menus.push(...fileMenus);
        fileMenus.forEach(menu => {
          if (menu.section) sections.add(menu.section);
        });

        log.debug('Parsed menu file', { 
          file: path.relative(this.feRoot, menuFile), 
          menusFound: fileMenus.length 
        });
      } catch (error) {
        log.warn('Failed to parse menu file', { 
          file: menuFile, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    log.info('Menu parsing completed', { 
      menusFound: menus.length, 
      sectionsFound: sections.size 
    });

    return { menus, sections };
  }

  /**
   * Find component file path from import/lazy statements
   */
  async resolveComponentPath(
    importPath: string, 
    componentName?: string,
    sourceFile?: SourceFile
  ): Promise<string | null> {
    try {
      // Handle relative imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const baseDir = sourceFile ? path.dirname(sourceFile.getFilePath()) : this.feRoot;
        const resolvedPath = path.resolve(baseDir, importPath);
        return this.findActualFile(resolvedPath);
      }

      // Handle absolute imports with tsconfig paths
      if (importPath.startsWith('@/') || importPath.startsWith('~/')) {
        const srcPath = importPath.replace(/^[@~]\//, 'src/');
        const fullPath = path.join(this.feRoot, srcPath);
        return this.findActualFile(fullPath);
      }

      // Handle node_modules or other imports
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return null; // External module
      }

      // Direct path resolution
      const fullPath = path.join(this.feRoot, importPath);
      return this.findActualFile(fullPath);
    } catch (error) {
      log.debug('Failed to resolve component path', { 
        importPath, 
        componentName, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Parse route definitions from Router source file
   */
  private async parseRouteDefinitions(
    sourceFile: SourceFile, 
    routes: RouteRecord[], 
    components: Map<string, string>
  ): Promise<void> {
    // Look for route objects in various patterns
    const routeObjects = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);

    for (const routeObj of routeObjects) {
      const route = this.parseRouteObject(routeObj, sourceFile);
      if (route) {
        routes.push(route);
        
        // Try to resolve component path
        if (route.componentName && route.importPath) {
          const resolvedPath = await this.resolveComponentPath(
            route.importPath, 
            route.componentName, 
            sourceFile
          );
          if (resolvedPath) {
            components.set(route.componentName, resolvedPath);
            route.filePath = resolvedPath;
          }
        }
      }
    }

    // Also look for nested route arrays
    this.parseNestedRoutes(sourceFile, routes, components);
  }

  /**
   * Parse a single route object
   */
  private parseRouteObject(routeObj: Node, sourceFile: SourceFile): RouteRecord | null {
    if (!Node.isObjectLiteralExpression(routeObj)) return null;

    const properties = routeObj.getProperties();
    const route: Partial<RouteRecord> = {};

    for (const prop of properties) {
      if (!Node.isPropertyAssignment(prop)) continue;

      const name = prop.getName();
      const value = prop.getInitializer();

      switch (name) {
        case 'path':
          if (Node.isStringLiteral(value)) {
            route.urlPattern = value.getLiteralValue();
          }
          break;

        case 'element':
          // Handle JSX elements like <ComponentName />
          if (Node.isJsxElement(value) || Node.isJsxSelfClosingElement(value)) {
            const tagName = this.extractJSXTagName(value);
            if (tagName) {
              route.element = tagName;
              route.componentName = tagName;
            }
          }
          break;

        case 'lazy':
          // Handle lazy(() => import('...'))
          if (Node.isArrowFunction(value)) {
            const importCall = this.extractLazyImport(value);
            if (importCall) {
              route.lazy = importCall.path;
              route.importPath = importCall.path;
              route.componentName = importCall.component;
            }
          }
          break;
      }
    }

    // Extract dynamic parameters from path
    if (route.urlPattern) {
      route.dynamicParams = this.extractDynamicParams(route.urlPattern);
    }

    return route.urlPattern ? (route as RouteRecord) : null;
  }

  /**
   * Parse lazy import statements
   */
  private parseLazyImports(sourceFile: SourceFile, components: Map<string, string>): void {
    // Look for Loadable(lazy(() => import(...))) patterns
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      if (callExpr.getExpression().getText() === 'Loadable') {
        const arg = callExpr.getArguments()[0];
        if (Node.isCallExpression(arg) && arg.getExpression().getText() === 'lazy') {
          const lazyArg = arg.getArguments()[0];
          if (Node.isArrowFunction(lazyArg)) {
            const importCall = this.extractLazyImport(lazyArg);
            if (importCall) {
              components.set(importCall.component, importCall.path);
            }
          }
        }
      }
    }
  }

  /**
   * Parse menu configuration file
   */
  private async parseMenuFile(sourceFile: SourceFile): Promise<MenuRecord[]> {
    const menus: MenuRecord[] = [];

    // Look for menu item arrays or objects
    const arrays = sourceFile.getDescendantsOfKind(SyntaxKind.ArrayLiteralExpression);
    
    for (const array of arrays) {
      const elements = array.getElements();
      for (const element of elements) {
        if (Node.isObjectLiteralExpression(element)) {
          const menu = this.parseMenuObject(element);
          if (menu) menus.push(menu);
        }
      }
    }

    // Also look for direct object exports
    const objects = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
    for (const obj of objects) {
      const menu = this.parseMenuObject(obj);
      if (menu) menus.push(menu);
    }

    return menus;
  }

  /**
   * Parse a single menu object
   */
  private parseMenuObject(menuObj: Node): MenuRecord | null {
    if (!Node.isObjectLiteralExpression(menuObj)) return null;

    const properties = menuObj.getProperties();
    const menu: Partial<MenuRecord> = {};

    for (const prop of properties) {
      if (!Node.isPropertyAssignment(prop)) continue;

      const name = prop.getName();
      const value = prop.getInitializer();

      switch (name) {
        case 'title':
        case 'label':
          if (Node.isStringLiteral(value)) {
            menu.label = value.getLiteralValue();
          }
          break;

        case 'href':
        case 'path':
          if (Node.isStringLiteral(value)) {
            menu.path = value.getLiteralValue();
          }
          break;

        case 'icon':
          menu.icon = value?.getText();
          break;

        case 'section':
          if (Node.isStringLiteral(value)) {
            menu.section = value.getLiteralValue();
          }
          break;

        case 'hidden':
          if (Node.isBooleanLiteral(value)) {
            menu.hidden = value.getLiteralValue();
          }
          break;
      }
    }

    return menu.label && menu.path ? (menu as MenuRecord) : null;
  }

  /**
   * Extract dynamic parameters from route path
   */
  private extractDynamicParams(path: string): string[] {
    const params: string[] = [];
    const paramRegex = /:(\w+)/g;
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      params.push(match[1]);
    }

    return params;
  }

  /**
   * Extract JSX tag name from JSX element
   */
  private extractJSXTagName(jsxNode: Node): string | null {
    if (Node.isJsxElement(jsxNode)) {
      return jsxNode.getOpeningElement().getTagNameNode().getText();
    }
    if (Node.isJsxSelfClosingElement(jsxNode)) {
      return jsxNode.getTagNameNode().getText();
    }
    return null;
  }

  /**
   * Extract import path and component name from lazy import
   */
  private extractLazyImport(arrowFunc: Node): { path: string; component: string } | null {
    if (!Node.isArrowFunction(arrowFunc)) return null;

    const body = arrowFunc.getBody();
    if (!Node.isCallExpression(body)) return null;

    if (body.getExpression().getText() === 'import') {
      const arg = body.getArguments()[0];
      if (Node.isStringLiteral(arg)) {
        const importPath = arg.getLiteralValue();
        const component = path.basename(importPath, path.extname(importPath));
        return { path: importPath, component };
      }
    }

    return null;
  }

  /**
   * Parse nested route structures
   */
  private parseNestedRoutes(
    sourceFile: SourceFile, 
    routes: RouteRecord[], 
    components: Map<string, string>
  ): void {
    // Look for children arrays in route objects
    const arrays = sourceFile.getDescendantsOfKind(SyntaxKind.ArrayLiteralExpression);
    
    for (const array of arrays) {
      const parent = array.getParent();
      if (Node.isPropertyAssignment(parent) && parent.getName() === 'children') {
        const elements = array.getElements();
        for (const element of elements) {
          if (Node.isObjectLiteralExpression(element)) {
            const route = this.parseRouteObject(element, sourceFile);
            if (route) {
              route.nested = true;
              routes.push(route);
            }
          }
        }
      }
    }
  }

  /**
   * Find menu files based on glob pattern
   */
  private findMenuFiles(globPattern: string): string[] {
    const files: string[] = [];
    
    // Simple glob implementation - in production, use a proper glob library
    const basePattern = globPattern.replace(/\*\*/g, '').replace(/\*/g, '');
    const searchDirs = [
      path.join(this.feRoot, 'src/layouts'),
      path.join(this.feRoot, 'src/config'),
      path.join(this.feRoot, 'src'),
    ];

    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        this.findFilesRecursive(dir, /menu.*\.(ts|tsx)$/i, files);
      }
    }

    return files;
  }

  /**
   * Recursively find files matching pattern
   */
  private findFilesRecursive(dir: string, pattern: RegExp, results: string[]): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this.findFilesRecursive(fullPath, pattern, results);
        } else if (entry.isFile() && pattern.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  /**
   * Find actual file with common extensions
   */
  private findActualFile(basePath: string): string | null {
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    
    // Try exact path first
    if (fs.existsSync(basePath)) {
      return basePath;
    }

    // Try with extensions
    for (const ext of extensions) {
      const withExt = basePath + ext;
      if (fs.existsSync(withExt)) {
        return withExt;
      }
    }

    // Try index files
    for (const ext of extensions) {
      const indexFile = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexFile)) {
        return indexFile;
      }
    }

    return null;
  }
}
