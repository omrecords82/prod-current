// Auth audit module for detecting JWT usage and security risks
import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { log } from '../core/logger.js';

export interface AuthFinding {
  type: 'client' | 'server';
  risk: 'low' | 'med' | 'high';
  file: string;
  line: number;
  code: string;
  pattern: string;
  why: string;
  hint: string;
  column?: number;
}

export interface AuthAuditSummary {
  filesScanned: number;
  jwtFindings: number;
  clientFindings: number;
  serverFindings: number;
  riskScore: number;
}

export interface AuthAuditResult {
  summary: AuthAuditSummary;
  findings: AuthFinding[];
  recommendedActions: string[];
}

export interface AuthAuditOptions {
  projectRoot: string;
  includeServer?: boolean;
  includeFrontend?: boolean;
  verbose?: boolean;
}

export class AuthAuditor {
  private project: Project;
  private projectRoot: string;
  private findings: AuthFinding[] = [];
  private filesScanned = 0;

  constructor(options: AuthAuditOptions) {
    this.projectRoot = options.projectRoot;
    this.project = new Project({
      useInMemoryFileSystem: true,
    });
  }

  /**
   * Run comprehensive auth audit
   */
  async audit(options: AuthAuditOptions = { projectRoot: this.projectRoot }): Promise<AuthAuditResult> {
    log.info('Starting JWT/Auth security audit');
    
    this.findings = [];
    this.filesScanned = 0;

    // Discover files to audit
    const filesToScan = await this.discoverFiles(options);
    log.debug(`Found ${filesToScan.length} files to scan`);

    // Scan each file
    for (const filePath of filesToScan) {
      try {
        await this.scanFile(filePath);
        this.filesScanned++;
      } catch (error) {
        log.debug(`Failed to scan ${filePath}`, error);
      }
    }

    // Calculate risk score and generate recommendations
    const summary = this.calculateSummary();
    const recommendations = this.generateRecommendations();

    log.info(`Auth audit completed: ${this.findings.length} findings, risk score ${summary.riskScore}/10`);

    return {
      summary,
      findings: this.findings,
      recommendedActions: recommendations,
    };
  }

  /**
   * Discover files to scan based on options
   */
  private async discoverFiles(options: AuthAuditOptions): Promise<string[]> {
    const patterns: string[] = [];
    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.map',
    ];

    if (options.includeFrontend !== false) {
      patterns.push(
        'front-end/src/**/*.{ts,tsx,js,jsx}',
        'front-end/src/**/*.json',
        'client/src/**/*.{ts,tsx,js,jsx}',
        'web/src/**/*.{ts,tsx,js,jsx}',
      );
    }

    if (options.includeServer !== false) {
      patterns.push(
        'server/**/*.{ts,js}',
        'backend/**/*.{ts,js}',
        'api/**/*.{ts,js}',
        '*.{ts,js}', // Root level config files
      );
    }

    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.projectRoot,
          ignore: ignorePatterns,
          absolute: false,
        });
        
        allFiles.push(...files.map(f => path.resolve(this.projectRoot, f)));
      } catch (error) {
        log.debug(`Pattern ${pattern} failed`, error);
      }
    }

    // Remove duplicates and ensure files exist
    const uniqueFiles = [...new Set(allFiles)].filter(f => fs.existsSync(f));
    
    return uniqueFiles;
  }

  /**
   * Scan individual file for JWT/auth patterns
   */
  private async scanFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);
    
    // Determine if this is client or server code
    const isClientFile = this.isClientSideFile(filePath);
    const isServerFile = this.isServerSideFile(filePath);
    
    if (!isClientFile && !isServerFile) {
      return; // Skip files that aren't clearly client or server
    }

    // Use AST parsing for TypeScript/JavaScript files
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      await this.scanWithAST(filePath, content, isClientFile);
    }
    
    // Always do text-based scanning as backup
    await this.scanWithText(filePath, content, isClientFile);
  }

  /**
   * AST-based scanning for TypeScript/JavaScript files
   */
  private async scanWithAST(filePath: string, content: string, isClientFile: boolean): Promise<void> {
    try {
      const sourceFile = this.project.createSourceFile(filePath, content, { overwrite: true });
      
      // Check imports
      this.checkImports(sourceFile, filePath, isClientFile);
      
      // Check function calls and expressions
      this.checkCallExpressions(sourceFile, filePath, isClientFile);
      
      // Check object properties and assignments
      this.checkPropertyAssignments(sourceFile, filePath, isClientFile);
      
      // Check string literals for patterns
      this.checkStringLiterals(sourceFile, filePath, isClientFile);

    } catch (error) {
      log.debug(`AST parsing failed for ${filePath}, falling back to text scan`, error);
    }
  }

  /**
   * Text-based pattern scanning
   */
  private async scanWithText(filePath: string, content: string, isClientFile: boolean): Promise<void> {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check for various JWT patterns
      this.checkTextPatterns(line, lineNum, filePath, isClientFile);
    }
  }

  /**
   * Check import statements for JWT libraries
   */
  private checkImports(sourceFile: SourceFile, filePath: string, isClientFile: boolean): void {
    const imports = sourceFile.getImportDeclarations();
    
    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const line = importDecl.getStartLineNumber();
      
      // JWT libraries
      if (this.isJWTLibrary(moduleSpecifier)) {
        const risk = isClientFile ? 'high' : 'med';
        const why = isClientFile 
          ? 'JWT library imported in client code - tokens exposed to XSS'
          : 'JWT library used in server - consider session cookies for browser clients';
        
        this.addFinding({
          type: isClientFile ? 'client' : 'server',
          risk,
          file: filePath,
          line,
          code: importDecl.getText().trim(),
          pattern: 'jwt-library-import',
          why,
          hint: isClientFile 
            ? 'Remove JWT handling from client. Use server sessions with HTTP-only cookies instead.'
            : 'Keep JWT for API integrations, but prefer sessions for browser clients.',
        });
      }

      // HTTP client libraries that might be configured for auth
      if (this.isHttpClientLibrary(moduleSpecifier)) {
        // We'll check their usage in call expressions
        continue;
      }
    }
  }

  /**
   * Check function calls and method expressions
   */
  private checkCallExpressions(sourceFile: SourceFile, filePath: string, isClientFile: boolean): void {
    sourceFile.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();
        const line = node.getStartLineNumber();
        const code = node.getText().trim();

        // Check for JWT verification/signing methods
        if (Node.isPropertyAccessExpression(expression)) {
          const method = expression.getName();
          
          if (['sign', 'verify', 'decode', 'jwtVerify', 'signJWT'].includes(method)) {
            this.addFinding({
              type: isClientFile ? 'client' : 'server',
              risk: isClientFile ? 'high' : 'med',
              file: filePath,
              line,
              code: code.length > 80 ? code.substring(0, 77) + '...' : code,
              pattern: 'jwt-method-call',
              why: isClientFile ? 'JWT operations in client code' : 'JWT operations detected',
              hint: isClientFile 
                ? 'Move authentication logic to server. Use session cookies.'
                : 'Consider session auth for browser clients, keep JWT for API integrations.',
            });
          }
        }

        // Check for storage operations
        if (isClientFile && Node.isPropertyAccessExpression(expression)) {
          const object = expression.getExpression();
          const method = expression.getName();
          
          if (Node.isIdentifier(object)) {
            const objectName = object.getText();
            
            if (['localStorage', 'sessionStorage'].includes(objectName) && 
                ['setItem', 'getItem'].includes(method)) {
              
              // Check if the key suggests token storage
              const args = node.getArguments();
              if (args.length > 0) {
                const firstArg = args[0];
                if (Node.isStringLiteral(firstArg)) {
                  const key = firstArg.getLiteralValue().toLowerCase();
                  if (this.isTokenStorageKey(key)) {
                    this.addFinding({
                      type: 'client',
                      risk: 'high',
                      file: filePath,
                      line,
                      code: code.length > 80 ? code.substring(0, 77) + '...' : code,
                      pattern: 'token-web-storage',
                      why: 'JWT/token stored in web storage - vulnerable to XSS attacks',
                      hint: 'Remove token storage. Use HTTP-only session cookies instead.',
                    });
                  }
                }
              }
            }
          }
        }

        // Check for fetch/axios with Authorization header
        if (isClientFile) {
          this.checkHttpClientCalls(node, filePath, line, code);
        }
      }
    });
  }

  /**
   * Check property assignments for auth patterns
   */
  private checkPropertyAssignments(sourceFile: SourceFile, filePath: string, isClientFile: boolean): void {
    sourceFile.forEachDescendant((node) => {
      if (Node.isPropertyAssignment(node)) {
        const name = node.getName();
        const line = node.getStartLineNumber();
        const code = node.getText().trim();

        // Check for Authorization headers
        if (name && name.toLowerCase() === 'authorization' && isClientFile) {
          const initializer = node.getInitializer();
          if (initializer && Node.isStringLiteral(initializer)) {
            const value = initializer.getLiteralValue();
            if (value.toLowerCase().includes('bearer')) {
              this.addFinding({
                type: 'client',
                risk: 'high',
                file: filePath,
                line,
                code: code.length > 80 ? code.substring(0, 77) + '...' : code,
                pattern: 'authorization-bearer',
                why: 'Bearer token in client-side request header',
                hint: 'Remove Authorization header. Configure HTTP client to use credentials: "include" for cookies.',
              });
            }
          }
        }
      }
    });
  }

  /**
   * Check string literals for auth patterns
   */
  private checkStringLiterals(sourceFile: SourceFile, filePath: string, isClientFile: boolean): void {
    sourceFile.forEachDescendant((node) => {
      if (Node.isStringLiteral(node)) {
        const value = node.getLiteralValue().toLowerCase();
        const line = node.getStartLineNumber();
        const code = node.getText().trim();

        // Check for Bearer token patterns
        if (value.includes('bearer ') && isClientFile) {
          this.addFinding({
            type: 'client',
            risk: 'high',
            file: filePath,
            line,
            code: code.length > 50 ? code.substring(0, 47) + '...' : code,
            pattern: 'bearer-string',
            why: 'Bearer token string in client code',
            hint: 'Remove bearer token usage. Use session cookies with credentials: "include".',
          });
        }

        // Check for common auth endpoints that might return tokens
        if (!isClientFile && (value.includes('/auth') || value.includes('/login')) && 
            (value.includes('token') || value.includes('jwt'))) {
          this.addFinding({
            type: 'server',
            risk: 'med',
            file: filePath,
            line,
            code: code.length > 50 ? code.substring(0, 47) + '...' : code,
            pattern: 'auth-endpoint',
            why: 'Auth endpoint that may issue tokens',
            hint: 'Consider issuing session cookies instead of tokens for browser clients.',
          });
        }
      }
    });
  }

  /**
   * Check HTTP client calls for authentication patterns
   */
  private checkHttpClientCalls(node: any, filePath: string, line: number, code: string): void {
    const expression = node.getExpression();
    
    // Check if it's fetch, axios, etc.
    if (Node.isIdentifier(expression) && ['fetch', 'axios'].includes(expression.getText()) ||
        Node.isPropertyAccessExpression(expression)) {
      
      // Look for headers configuration in arguments
      const args = node.getArguments();
      for (const arg of args) {
        if (Node.isObjectLiteralExpression(arg)) {
          arg.getProperties().forEach(prop => {
            if (Node.isPropertyAssignment(prop) && prop.getName() === 'headers') {
              const headers = prop.getInitializer();
              if (Node.isObjectLiteralExpression(headers)) {
                headers.getProperties().forEach(headerProp => {
                  if (Node.isPropertyAssignment(headerProp) && 
                      headerProp.getName()?.toLowerCase() === 'authorization') {
                    
                    this.addFinding({
                      type: 'client',
                      risk: 'high',
                      file: filePath,
                      line,
                      code: code.length > 80 ? code.substring(0, 77) + '...' : code,
                      pattern: 'http-auth-header',
                      why: 'HTTP client configured with Authorization header',
                      hint: 'Remove Authorization header. Use credentials: "include" and session cookies.',
                    });
                  }
                });
              }
            }
          });
        }
      }
    }
  }

  /**
   * Check text patterns using regex
   */
  private checkTextPatterns(line: string, lineNum: number, filePath: string, isClientFile: boolean): void {
    const trimmedLine = line.trim();
    
    // Bearer token patterns
    if (/authorization.*bearer/i.test(line) && isClientFile) {
      this.addFinding({
        type: 'client',
        risk: 'high',
        file: filePath,
        line: lineNum,
        code: trimmedLine.length > 80 ? trimmedLine.substring(0, 77) + '...' : trimmedLine,
        pattern: 'authorization-bearer',
        why: 'Bearer token in client request',
        hint: 'Replace with session cookie authentication using credentials: "include".',
      });
    }

    // JWT verification patterns in server
    if ((/jwt\.verify|jsonwebtoken|jose/i.test(line)) && !isClientFile) {
      this.addFinding({
        type: 'server',
        risk: 'med',
        file: filePath,
        line: lineNum,
        code: trimmedLine.length > 80 ? trimmedLine.substring(0, 77) + '...' : trimmedLine,
        pattern: 'server-jwt-usage',
        why: 'JWT verification in server code',
        hint: 'Consider session middleware for browser routes, keep JWT for API integrations.',
      });
    }

    // Token storage patterns
    if (isClientFile && /(localStorage|sessionStorage).*token/i.test(line)) {
      this.addFinding({
        type: 'client',
        risk: 'high',
        file: filePath,
        line: lineNum,
        code: trimmedLine.length > 80 ? trimmedLine.substring(0, 77) + '...' : trimmedLine,
        pattern: 'token-storage',
        why: 'Token stored in web storage - XSS vulnerable',
        hint: 'Remove token storage. Use HTTP-only session cookies.',
      });
    }

    // CORS with credentials patterns
    if (/cors.*credentials.*true/i.test(line) && !isClientFile) {
      this.addFinding({
        type: 'server',
        risk: 'low',
        file: filePath,
        line: lineNum,
        code: trimmedLine.length > 80 ? trimmedLine.substring(0, 77) + '...' : trimmedLine,
        pattern: 'cors-credentials',
        why: 'CORS configured with credentials - ensure proper session security',
        hint: 'Verify SameSite, HttpOnly, and Secure cookie settings when using credentials.',
      });
    }
  }

  /**
   * Helper methods for detection
   */
  private isJWTLibrary(moduleSpecifier: string): boolean {
    const jwtLibs = [
      'jsonwebtoken',
      'jose',
      'jwt-decode',
      'node-jsonwebtoken',
      '@auth0/jwt-decode',
      'jwt-simple',
      'jws',
    ];
    
    return jwtLibs.some(lib => moduleSpecifier === lib || moduleSpecifier.startsWith(lib + '/'));
  }

  private isHttpClientLibrary(moduleSpecifier: string): boolean {
    const httpLibs = ['axios', 'node-fetch', 'isomorphic-fetch', 'apollo-client', 'graphql-request'];
    return httpLibs.some(lib => moduleSpecifier === lib || moduleSpecifier.startsWith(lib + '/'));
  }

  private isTokenStorageKey(key: string): boolean {
    const tokenKeys = [
      'token', 'accesstoken', 'access_token', 'jwt', 'authtoken', 'auth_token',
      'bearertoken', 'bearer_token', 'sessiontoken', 'session_token', 'apikey', 'api_key',
    ];
    
    return tokenKeys.some(tk => key.includes(tk));
  }

  private isClientSideFile(filePath: string): boolean {
    const clientPatterns = [
      /front-end/i,
      /client/i,
      /web/i,
      /src.*components/i,
      /src.*pages/i,
      /src.*hooks/i,
      /\.tsx?$/,
    ];
    
    return clientPatterns.some(pattern => pattern.test(filePath)) && 
           !/server|backend|api|node_modules/.test(filePath);
  }

  private isServerSideFile(filePath: string): boolean {
    const serverPatterns = [
      /server/i,
      /backend/i,
      /api/i,
      /middleware/i,
      /routes/i,
      /controllers/i,
    ];
    
    return serverPatterns.some(pattern => pattern.test(filePath)) ||
           (filePath.includes('.js') && !this.isClientSideFile(filePath));
  }

  /**
   * Add finding to results
   */
  private addFinding(finding: AuthFinding): void {
    // Avoid duplicates
    const exists = this.findings.some(f => 
      f.file === finding.file && 
      f.line === finding.line && 
      f.pattern === finding.pattern
    );
    
    if (!exists) {
      this.findings.push(finding);
    }
  }

  /**
   * Calculate summary statistics and risk score
   */
  private calculateSummary(): AuthAuditSummary {
    const clientFindings = this.findings.filter(f => f.type === 'client').length;
    const serverFindings = this.findings.filter(f => f.type === 'server').length;
    
    // Risk score calculation (1-10 scale)
    let riskScore = 0;
    
    // Client-side risks (higher weight)
    const clientTokenStorage = this.findings.filter(f => 
      f.type === 'client' && (f.pattern === 'token-web-storage' || f.pattern === 'token-storage')
    ).length;
    
    const clientBearerUsage = this.findings.filter(f => 
      f.type === 'client' && (f.pattern === 'authorization-bearer' || f.pattern === 'bearer-string')
    ).length;
    
    const clientJWTLibs = this.findings.filter(f => 
      f.type === 'client' && f.pattern === 'jwt-library-import'
    ).length;
    
    // Server-side risks
    const serverJWTUsage = this.findings.filter(f => 
      f.type === 'server' && f.pattern === 'server-jwt-usage'
    ).length;
    
    const corsIssues = this.findings.filter(f => 
      f.pattern === 'cors-credentials'
    ).length;

    // Score calculation
    riskScore += Math.min(clientTokenStorage * 3, 3); // +3 if client stores JWT in web storage
    riskScore += Math.min(serverJWTUsage > 2 ? 3 : serverJWTUsage, 3); // +3 if server widely accepts bearer
    riskScore += Math.min(clientJWTLibs * 2, 2); // +2 if JWT libs in front-end
    riskScore += Math.min(corsIssues, 1); // +1 if CORS permissive
    riskScore += clientBearerUsage > 0 ? 1 : 0; // +1 for any bearer usage
    
    return {
      filesScanned: this.filesScanned,
      jwtFindings: this.findings.length,
      clientFindings,
      serverFindings,
      riskScore: Math.min(riskScore, 10),
    };
  }

  /**
   * Generate recommended actions based on findings
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const hasClientTokenStorage = this.findings.some(f => 
      f.type === 'client' && (f.pattern === 'token-web-storage' || f.pattern === 'token-storage')
    );
    
    const hasClientBearerAuth = this.findings.some(f => 
      f.type === 'client' && (f.pattern === 'authorization-bearer' || f.pattern === 'bearer-string')
    );
    
    const hasServerJWT = this.findings.some(f => 
      f.type === 'server' && f.pattern === 'server-jwt-usage'
    );

    if (hasClientTokenStorage || hasClientBearerAuth) {
      recommendations.push('Migrate browser authentication from JWT to HTTP-only session cookies');
      recommendations.push('Remove all token storage from localStorage/sessionStorage');
      recommendations.push('Configure HTTP clients with credentials: "include" instead of Authorization headers');
    }

    if (hasServerJWT) {
      recommendations.push('Implement session middleware for browser routes; restrict JWT to API integrations');
      recommendations.push('Add CSRF protection for state-changing routes when using cookies');
    }

    recommendations.push('Set secure cookie attributes: HttpOnly, Secure, SameSite=Lax or Strict');
    recommendations.push('Implement server-side session store with proper logout invalidation');
    recommendations.push('Add security headers: X-Frame-Options, CSP, X-Content-Type-Options');

    if (this.findings.some(f => f.pattern === 'cors-credentials')) {
      recommendations.push('Review CORS configuration - ensure credentials are only allowed for trusted origins');
    }

    return recommendations;
  }

  /**
   * Get findings for a specific file (used for fix hints)
   */
  getFindingsForFile(filePath: string): AuthFinding[] {
    return this.findings.filter(f => f.file === filePath);
  }
}
