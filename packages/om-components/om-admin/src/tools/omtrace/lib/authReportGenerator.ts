// Auth audit report generator
import * as fs from 'fs';
import * as path from 'path';
import { AuthAuditResult, AuthFinding } from './authAudit.js';
import { log } from '../core/logger.js';

export interface ReportOptions {
  outputDir: string;
  includeFixHints?: boolean;
  projectRoot?: string;
}

export interface GeneratedReports {
  json: string;
  markdown: string;
  fixHints?: string[];
}

export class AuthReportGenerator {
  private outputDir: string;

  constructor(outputDir: string = 'docs/auth') {
    this.outputDir = outputDir;
  }

  /**
   * Generate all auth audit reports
   */
  async generateReports(
    auditResult: AuthAuditResult, 
    options: ReportOptions
  ): Promise<GeneratedReports> {
    // Ensure output directory exists
    this.ensureDirectory(options.outputDir);

    // Generate JSON report
    const jsonPath = await this.generateJsonReport(auditResult, options.outputDir);
    
    // Generate Markdown report
    const markdownPath = await this.generateMarkdownReport(auditResult, options.outputDir);
    
    const reports: GeneratedReports = {
      json: jsonPath,
      markdown: markdownPath,
    };

    // Generate fix hints if requested
    if (options.includeFixHints && options.projectRoot) {
      reports.fixHints = await this.generateFixHints(auditResult, options);
    }

    return reports;
  }

  /**
   * Generate JSON audit report
   */
  private async generateJsonReport(auditResult: AuthAuditResult, outputDir: string): Promise<string> {
    const filePath = path.join(outputDir, 'audit.json');
    
    const jsonOutput = {
      summary: auditResult.summary,
      findings: auditResult.findings.map(finding => ({
        type: finding.type,
        risk: finding.risk,
        file: finding.file,
        line: finding.line,
        code: finding.code,
        pattern: finding.pattern,
        why: finding.why,
        hint: finding.hint,
        column: finding.column,
      })),
      recommendedActions: auditResult.recommendedActions,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '2.0.0-enhanced',
        generator: 'omtrace auth-audit',
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(jsonOutput, null, 2));
    log.debug('Generated JSON audit report', { filePath });
    
    return filePath;
  }

  /**
   * Generate Markdown audit report
   */
  private async generateMarkdownReport(auditResult: AuthAuditResult, outputDir: string): Promise<string> {
    const filePath = path.join(outputDir, 'audit.md');
    
    const md: string[] = [];
    
    // Header
    md.push('# 🔐 JWT/Auth Security Audit Report');
    md.push('');
    md.push(`Generated: ${new Date().toISOString()}`);
    md.push(`Tool: omtrace auth-audit v2.0.0`);
    md.push('');

    // Executive Summary
    md.push('## 📊 Executive Summary');
    md.push('');
    
    const riskLevel = this.getRiskLevelDescription(auditResult.summary.riskScore);
    const riskEmoji = this.getRiskEmoji(auditResult.summary.riskScore);
    
    md.push(`**Overall Risk Score:** ${riskEmoji} ${auditResult.summary.riskScore}/10 (${riskLevel})`);
    md.push('');
    md.push('| Metric | Count |');
    md.push('|--------|-------|');
    md.push(`| Files Scanned | ${auditResult.summary.filesScanned} |`);
    md.push(`| Total Findings | ${auditResult.summary.jwtFindings} |`);
    md.push(`| Client-side Issues | ${auditResult.summary.clientFindings} |`);
    md.push(`| Server-side Issues | ${auditResult.summary.serverFindings} |`);
    md.push('');

    // Risk Assessment
    md.push('### 🎯 Risk Assessment');
    md.push('');
    md.push('**Score Breakdown:**');
    md.push('- **0-2**: Low risk - Minor improvements recommended');
    md.push('- **3-5**: Medium risk - Authentication improvements needed');  
    md.push('- **6-8**: High risk - Significant security vulnerabilities');
    md.push('- **9-10**: Critical risk - Immediate action required');
    md.push('');

    // Key Findings
    md.push('## 🚨 Key Security Issues');
    md.push('');
    
    const highRiskFindings = auditResult.findings.filter(f => f.risk === 'high');
    const medRiskFindings = auditResult.findings.filter(f => f.risk === 'med');
    const lowRiskFindings = auditResult.findings.filter(f => f.risk === 'low');

    if (highRiskFindings.length > 0) {
      md.push('### 🔴 High Risk Issues');
      md.push('');
      this.addFindingsTable(md, highRiskFindings);
      md.push('');
    }

    if (medRiskFindings.length > 0) {
      md.push('### 🟠 Medium Risk Issues');
      md.push('');
      this.addFindingsTable(md, medRiskFindings);
      md.push('');
    }

    if (lowRiskFindings.length > 0) {
      md.push('### 🟡 Low Risk Issues');
      md.push('');
      this.addFindingsTable(md, lowRiskFindings);
      md.push('');
    }

    // Findings by Category
    md.push('## 📂 Findings by Category');
    md.push('');
    
    const patterns = this.groupFindingsByPattern(auditResult.findings);
    
    for (const [pattern, findings] of Object.entries(patterns)) {
      md.push(`### ${this.getPatternDisplayName(pattern)} (${findings.length})`);
      md.push('');
      md.push(this.getPatternDescription(pattern));
      md.push('');
      
      if (findings.length <= 5) {
        // Show all findings if there are few
        findings.forEach(finding => {
          md.push(`- **${path.basename(finding.file)}:${finding.line}** - ${finding.why}`);
          md.push(`  \`${finding.code}\``);
          md.push('');
        });
      } else {
        // Show sample findings if many
        md.push(`**Sample findings (${Math.min(3, findings.length)} of ${findings.length}):**`);
        md.push('');
        findings.slice(0, 3).forEach(finding => {
          md.push(`- **${path.basename(finding.file)}:${finding.line}** - ${finding.why}`);
        });
        md.push('');
        md.push(`*See full details in [audit.json](audit.json) for all ${findings.length} instances.*`);
        md.push('');
      }
    }

    // Recommended Actions
    md.push('## 🛠️ Recommended Actions');
    md.push('');
    
    auditResult.recommendedActions.forEach((action, index) => {
      md.push(`${index + 1}. **${action}**`);
    });
    md.push('');

    // Migration Playbook
    md.push('## 📚 Migration Playbook');
    md.push('');
    md.push(this.generateMigrationPlaybook(auditResult));

    // Files with Issues
    md.push('## 📁 Affected Files');
    md.push('');
    
    const fileGroups = this.groupFindingsByFile(auditResult.findings);
    const sortedFiles = Object.entries(fileGroups)
      .sort((a, b) => b[1].length - a[1].length) // Sort by finding count
      .slice(0, 20); // Show top 20 files

    md.push('| File | Issues | High | Med | Low |');
    md.push('|------|--------|------|-----|-----|');
    
    sortedFiles.forEach(([file, findings]) => {
      const high = findings.filter(f => f.risk === 'high').length;
      const med = findings.filter(f => f.risk === 'med').length;
      const low = findings.filter(f => f.risk === 'low').length;
      
      const relativePath = path.relative(process.cwd(), file);
      md.push(`| \`${relativePath}\` | ${findings.length} | ${high} | ${med} | ${low} |`);
    });
    md.push('');

    if (Object.keys(fileGroups).length > 20) {
      md.push(`*Showing top 20 files. See audit.json for complete list of ${Object.keys(fileGroups).length} affected files.*`);
      md.push('');
    }

    // Next Steps
    md.push('## 🚀 Next Steps');
    md.push('');
    md.push('1. **Review high-risk findings immediately** - these represent active security vulnerabilities');
    md.push('2. **Plan authentication migration** - move from JWT to session cookies for browser clients');
    md.push('3. **Audit dependencies** - review and remove unnecessary JWT libraries from client code');
    md.push('4. **Update HTTP clients** - configure for cookie-based authentication');
    md.push('5. **Add security headers** - implement CSP, X-Frame-Options, etc.');
    md.push('6. **Test thoroughly** - ensure authentication flows work after migration');
    md.push('');
    
    if (auditResult.summary.riskScore >= 6) {
      md.push('⚠️ **High risk score detected** - consider treating this as a security incident requiring immediate attention.');
      md.push('');
    }

    // Footer
    md.push('---');
    md.push('');
    md.push('*Generated by OMTrace Enhanced Auth Audit - Use `omtrace auth-audit --fix-hints` for specific migration guidance.*');

    const content = md.join('\n');
    fs.writeFileSync(filePath, content);
    
    log.debug('Generated Markdown audit report', { filePath });
    return filePath;
  }

  /**
   * Generate per-file fix hints
   */
  private async generateFixHints(auditResult: AuthAuditResult, options: ReportOptions): Promise<string[]> {
    const fileGroups = this.groupFindingsByFile(auditResult.findings);
    const hintsFiles: string[] = [];
    
    for (const [filePath, findings] of Object.entries(fileGroups)) {
      const hintsPath = await this.generateFileFixHints(filePath, findings, options.outputDir);
      hintsFiles.push(hintsPath);
    }
    
    log.debug(`Generated fix hints for ${hintsFiles.length} files`);
    return hintsFiles;
  }

  /**
   * Generate fix hints for a specific file
   */
  private async generateFileFixHints(filePath: string, findings: AuthFinding[], outputDir: string): Promise<string> {
    const relativePath = path.relative(process.cwd(), filePath);
    const safeFileName = relativePath.replace(/[^a-zA-Z0-9.-]/g, '_');
    const hintsPath = path.join(outputDir, `${safeFileName}.hints.md`);
    
    const md: string[] = [];
    
    md.push(`# 🔧 Fix Hints: ${relativePath}`);
    md.push('');
    md.push(`**File:** \`${relativePath}\``);
    md.push(`**Issues Found:** ${findings.length}`);
    md.push('');

    // Group findings by line for better organization
    const lineGroups = findings.reduce((acc, finding) => {
      if (!acc[finding.line]) acc[finding.line] = [];
      acc[finding.line].push(finding);
      return acc;
    }, {} as Record<number, AuthFinding[]>);

    const sortedLines = Object.keys(lineGroups).map(Number).sort((a, b) => a - b);

    md.push('## 🎯 Issues and Solutions');
    md.push('');

    for (const lineNum of sortedLines) {
      const lineFindings = lineGroups[lineNum];
      
      md.push(`### Line ${lineNum}`);
      md.push('');
      
      lineFindings.forEach(finding => {
        md.push(`**Issue:** ${finding.why} (${finding.risk} risk)`);
        md.push('');
        md.push('```typescript');
        md.push(`// ❌ Current (Line ${finding.line})`);
        md.push(finding.code);
        md.push('```');
        md.push('');
        md.push('**Solution:**');
        md.push(`${finding.hint}`);
        md.push('');
        
        // Add specific migration examples
        md.push('```typescript');
        md.push('// ✅ Recommended');
        md.push(this.generateFixExample(finding));
        md.push('```');
        md.push('');
      });
    }

    // Add file-level recommendations
    md.push('## 📋 File-Level Recommendations');
    md.push('');
    
    const isClientFile = findings.some(f => f.type === 'client');
    const isServerFile = findings.some(f => f.type === 'server');
    
    if (isClientFile) {
      md.push('### Client-Side Changes');
      md.push('');
      md.push('1. **Remove token storage** - eliminate localStorage/sessionStorage usage');
      md.push('2. **Update HTTP client** - configure for cookie-based auth:');
      md.push('   ```typescript');
      md.push('   // Configure axios/fetch with credentials');
      md.push('   const api = axios.create({');
      md.push('     baseURL: "/api",');
      md.push('     withCredentials: true, // Include cookies');
      md.push('   });');
      md.push('   ');
      md.push('   // Remove Authorization header interceptors');
      md.push('   // api.interceptors.request.use(config => {');
      md.push('   //   config.headers.Authorization = `Bearer ${token}`;');
      md.push('   //   return config;');
      md.push('   // });');
      md.push('   ```');
      md.push('3. **Remove JWT handling** - delete decode/verify logic from client');
      md.push('');
    }

    if (isServerFile) {
      md.push('### Server-Side Changes');
      md.push('');
      md.push('1. **Add session middleware** - implement cookie-based sessions:');
      md.push('   ```typescript');
      md.push('   import session from "express-session";');
      md.push('   ');
      md.push('   app.use(session({');
      md.push('     secret: process.env.SESSION_SECRET,');
      md.push('     resave: false,');
      md.push('     saveUninitialized: false,');
      md.push('     cookie: {');
      md.push('       httpOnly: true,');
      md.push('       secure: process.env.NODE_ENV === "production",');
      md.push('       sameSite: "lax",');
      md.push('       maxAge: 24 * 60 * 60 * 1000 // 24 hours');
      md.push('     }');
      md.push('   }));');
      md.push('   ```');
      md.push('2. **Replace JWT middleware** - use session-based auth checks');
      md.push('3. **Add CSRF protection** - protect state-changing routes');
      md.push('');
    }

    md.push('---');
    md.push('');
    md.push('*Generated by OMTrace Auth Audit - Review and test all changes before deployment.*');

    const content = md.join('\n');
    fs.writeFileSync(hintsPath, content);
    
    return hintsPath;
  }

  /**
   * Generate fix example for a specific finding
   */
  private generateFixExample(finding: AuthFinding): string {
    switch (finding.pattern) {
      case 'authorization-bearer':
        return `// Remove Authorization header, use cookies instead
fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include cookies
  body: JSON.stringify(data)
});`;
      
      case 'token-web-storage':
      case 'token-storage':
        return `// Remove token storage entirely
// localStorage.setItem('token', token); ❌
// Use server sessions with HTTP-only cookies instead`;
      
      case 'jwt-library-import':
        if (finding.type === 'client') {
          return `// Remove JWT library from client code
// import jwt from 'jsonwebtoken'; ❌
// Handle authentication on server-side only`;
        } else {
          return `// Keep JWT for API integrations, add session auth for browsers
import session from 'express-session';

// Session auth for browser clients
const requireSession = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// JWT auth for API integrations only
const requireJWT = (req, res, next) => {
  // Keep JWT verification for /api/integrations/* routes
};`;
        }
      
      case 'http-auth-header':
        return `// Configure HTTP client for cookie auth
const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // Send cookies
  headers: {
    'Content-Type': 'application/json',
    // Remove: 'Authorization': 'Bearer ...'
  }
});`;
      
      default:
        return '// Apply the recommended changes above';
    }
  }

  /**
   * Helper methods
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private getRiskLevelDescription(score: number): string {
    if (score <= 2) return 'Low Risk';
    if (score <= 5) return 'Medium Risk';
    if (score <= 8) return 'High Risk';
    return 'Critical Risk';
  }

  private getRiskEmoji(score: number): string {
    if (score <= 2) return '🟢';
    if (score <= 5) return '🟡';
    if (score <= 8) return '🟠';
    return '🔴';
  }

  private addFindingsTable(md: string[], findings: AuthFinding[]): void {
    md.push('| File | Line | Issue | Pattern |');
    md.push('|------|------|-------|---------|');
    
    findings.slice(0, 10).forEach(finding => { // Limit to 10 entries per table
      const fileName = path.basename(finding.file);
      const truncatedWhy = finding.why.length > 50 ? finding.why.substring(0, 47) + '...' : finding.why;
      md.push(`| \`${fileName}\` | ${finding.line} | ${truncatedWhy} | \`${finding.pattern}\` |`);
    });
    
    if (findings.length > 10) {
      md.push(`| ... | ... | *${findings.length - 10} more issues* | ... |`);
    }
  }

  private groupFindingsByPattern(findings: AuthFinding[]): Record<string, AuthFinding[]> {
    return findings.reduce((acc, finding) => {
      if (!acc[finding.pattern]) acc[finding.pattern] = [];
      acc[finding.pattern].push(finding);
      return acc;
    }, {} as Record<string, AuthFinding[]>);
  }

  private groupFindingsByFile(findings: AuthFinding[]): Record<string, AuthFinding[]> {
    return findings.reduce((acc, finding) => {
      if (!acc[finding.file]) acc[finding.file] = [];
      acc[finding.file].push(finding);
      return acc;
    }, {} as Record<string, AuthFinding[]>);
  }

  private getPatternDisplayName(pattern: string): string {
    const names: Record<string, string> = {
      'authorization-bearer': '🔑 Bearer Token Headers',
      'token-web-storage': '💾 Token Storage in Web Storage',
      'token-storage': '💾 Token Storage',
      'jwt-library-import': '📦 JWT Library Imports',
      'jwt-method-call': '🔧 JWT Method Calls',
      'http-auth-header': '🌐 HTTP Authorization Headers',
      'server-jwt-usage': '⚙️ Server JWT Usage',
      'cors-credentials': '🔐 CORS Credentials Configuration',
      'bearer-string': '📝 Bearer Token Strings',
      'auth-endpoint': '🚪 Authentication Endpoints',
    };
    
    return names[pattern] || `🔍 ${pattern}`;
  }

  private getPatternDescription(pattern: string): string {
    const descriptions: Record<string, string> = {
      'authorization-bearer': 'JWT bearer tokens sent in Authorization headers from client-side code are vulnerable to XSS attacks.',
      'token-web-storage': 'Storing JWTs in localStorage or sessionStorage exposes them to XSS attacks. Use HTTP-only cookies instead.',
      'jwt-library-import': 'JWT libraries imported in client-side code indicate token handling that should be moved to the server.',
      'server-jwt-usage': 'Server-side JWT usage should be limited to API integrations. Use sessions for browser clients.',
      'cors-credentials': 'CORS configured with credentials requires proper cookie security settings.',
      'http-auth-header': 'HTTP clients configured with Authorization headers should use cookie-based authentication instead.',
    };
    
    return descriptions[pattern] || 'Review this authentication pattern for security implications.';
  }

  private generateMigrationPlaybook(auditResult: AuthAuditResult): string {
    const playbook: string[] = [];
    
    playbook.push('### 🎯 Migration Strategy');
    playbook.push('');
    playbook.push('**Policy:** Browser clients → session cookies only; API integrations → JWT/API keys under `/api/integrations/*`');
    playbook.push('');
    
    playbook.push('### 🖥️ Server Changes');
    playbook.push('');
    playbook.push('1. **Session Middleware Setup**');
    playbook.push('   ```javascript');
    playbook.push('   import session from "express-session";');
    playbook.push('   import MongoStore from "connect-mongo";');
    playbook.push('   ');
    playbook.push('   app.use(session({');
    playbook.push('     secret: process.env.SESSION_SECRET,');
    playbook.push('     resave: false,');
    playbook.push('     saveUninitialized: false,');
    playbook.push('     store: MongoStore.create({ mongoUrl: process.env.MONGO_URL }),');
    playbook.push('     cookie: {');
    playbook.push('       httpOnly: true,');
    playbook.push('       secure: process.env.NODE_ENV === "production",');
    playbook.push('       sameSite: "lax",');
    playbook.push('       maxAge: 24 * 60 * 60 * 1000');
    playbook.push('     }');
    playbook.push('   }));');
    playbook.push('   ```');
    playbook.push('');
    
    playbook.push('2. **Authentication Middleware**');
    playbook.push('   ```javascript');
    playbook.push('   // Session-based auth for browser routes');
    playbook.push('   const requireSession = (req, res, next) => {');
    playbook.push('     if (!req.session?.userId) {');
    playbook.push('       return res.status(401).json({ error: "Authentication required" });');
    playbook.push('     }');
    playbook.push('     req.user = { id: req.session.userId };');
    playbook.push('     next();');
    playbook.push('   };');
    playbook.push('   ');
    playbook.push('   // JWT auth for API integrations only');
    playbook.push('   const requireJWT = (req, res, next) => {');
    playbook.push('     // Keep existing JWT logic for /api/integrations/* routes');
    playbook.push('   };');
    playbook.push('   ```');
    playbook.push('');
    
    playbook.push('3. **CSRF Protection**');
    playbook.push('   ```javascript');
    playbook.push('   import csrf from "csurf";');
    playbook.push('   ');
    playbook.push('   const csrfProtection = csrf({ cookie: false }); // Use session store');
    playbook.push('   app.use(csrfProtection);');
    playbook.push('   ```');
    playbook.push('');
    
    playbook.push('### 🌐 Client Changes');
    playbook.push('');
    playbook.push('1. **HTTP Client Configuration**');
    playbook.push('   ```typescript');
    playbook.push('   // Replace token-based API client');
    playbook.push('   const api = axios.create({');
    playbook.push('     baseURL: "/api",');
    playbook.push('     withCredentials: true, // Include cookies');
    playbook.push('     headers: {');
    playbook.push('       "Content-Type": "application/json",');
    playbook.push('       // Remove: "Authorization": `Bearer ${token}`');
    playbook.push('     }');
    playbook.push('   });');
    playbook.push('   ```');
    playbook.push('');
    
    playbook.push('2. **Remove Token Management**');
    playbook.push('   ```typescript');
    playbook.push('   // ❌ Remove all token storage');
    playbook.push('   // localStorage.removeItem("token");');
    playbook.push('   // sessionStorage.removeItem("accessToken");');
    playbook.push('   ');
    playbook.push('   // ❌ Remove JWT decode logic');
    playbook.push('   // import jwtDecode from "jwt-decode";');
    playbook.push('   // const user = jwtDecode(token);');
    playbook.push('   ');
    playbook.push('   // ✅ Get user info from API instead');
    playbook.push('   const getCurrentUser = async () => {');
    playbook.push('     const response = await api.get("/auth/me");');
    playbook.push('     return response.data.user;');
    playbook.push('   };');
    playbook.push('   ```');
    playbook.push('');
    
    playbook.push('### 🔒 Security Headers');
    playbook.push('');
    playbook.push('```javascript');
    playbook.push('app.use((req, res, next) => {');
    playbook.push('  res.setHeader("X-Frame-Options", "DENY");');
    playbook.push('  res.setHeader("X-Content-Type-Options", "nosniff");');
    playbook.push('  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");');
    playbook.push('  res.setHeader("Content-Security-Policy", "default-src \'self\'; ...");');
    playbook.push('  next();');
    playbook.push('});');
    playbook.push('```');
    playbook.push('');
    
    playbook.push('### 🧪 Testing Strategy');
    playbook.push('');
    playbook.push('1. **Authentication Flow Testing**');
    playbook.push('   - Login/logout functionality');
    playbook.push('   - Session persistence across page refreshes');
    playbook.push('   - Automatic session expiration');
    playbook.push('');
    playbook.push('2. **CSRF Protection Testing**');
    playbook.push('   - State-changing operations require valid CSRF tokens');
    playbook.push('   - Cross-origin requests are properly blocked');
    playbook.push('');
    playbook.push('3. **Security Testing**');
    playbook.push('   - Verify HTTP-only cookie settings');
    playbook.push('   - Test SameSite cookie behavior');
    playbook.push('   - Validate secure cookie settings in production');
    
    return playbook.join('\n');
  }
}
