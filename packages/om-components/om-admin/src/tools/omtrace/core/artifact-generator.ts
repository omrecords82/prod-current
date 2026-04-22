// Artifact generation for omtrace results
import * as fs from 'fs';
import * as path from 'path';
import { TraceArtifacts, DependencyNode } from './url-tracer.js';
import { log } from './logger.js';

export interface ArtifactOptions {
  outputDir: string;
  filename?: string;
  includeTimestamp?: boolean;
}

export class ArtifactGenerator {
  private outputDir: string;

  constructor(outputDir: string = 'docs/trace') {
    this.outputDir = outputDir;
  }

  /**
   * Generate all artifacts for trace results
   */
  async generateAll(
    artifacts: TraceArtifacts,
    options: ArtifactOptions = { outputDir: this.outputDir }
  ): Promise<{
    json: string;
    markdown: string;
    csv: string;
  }> {
    // Ensure output directory exists
    this.ensureDirectory(options.outputDir);

    const baseFilename = options.filename || this.generateFilename(artifacts.queriedUrl, options.includeTimestamp);

    const results = {
      json: await this.generateJSON(artifacts, options.outputDir, baseFilename),
      markdown: await this.generateMarkdown(artifacts, options.outputDir, baseFilename),
      csv: await this.generateCSV(artifacts, options.outputDir, baseFilename),
    };

    log.info('Artifacts generated', {
      outputDir: options.outputDir,
      files: Object.values(results),
    });

    return results;
  }

  /**
   * Generate trace.json - canonical, machine-readable format
   */
  async generateJSON(
    artifacts: TraceArtifacts,
    outputDir: string,
    baseFilename: string
  ): Promise<string> {
    const filename = path.join(outputDir, `${baseFilename}.json`);
    
    const jsonOutput = {
      queriedUrl: artifacts.queriedUrl,
      routeMatch: artifacts.routeMatch ? {
        pattern: artifacts.routeMatch.pattern,
        specificity: artifacts.routeMatch.specificity,
        params: artifacts.routeMatch.params,
      } : null,
      router: artifacts.router ? {
        componentName: artifacts.router.componentName,
        filePath: artifacts.router.filePath,
        importPath: artifacts.router.importPath,
      } : null,
      menus: artifacts.menus.map(menu => ({
        label: menu.label,
        path: menu.path,
        componentName: menu.componentRef,
        filePath: menu.importPath,
        section: menu.section,
        icon: menu.icon,
        hidden: menu.hidden,
      })),
      truth: artifacts.truth,
      dynamicParams: artifacts.dynamicParams,
      dependencies: artifacts.dependencies.map(dep => ({
        file: dep.file,
        kind: dep.kind,
        importType: dep.importType,
      })),
      warnings: artifacts.warnings,
      httpProbe: artifacts.httpProbe ? this.sanitizeHttpProbeForJson(artifacts.httpProbe) : null,
      metadata: artifacts.metadata,
    };

    fs.writeFileSync(filename, JSON.stringify(jsonOutput, null, 2));
    
    log.debug('Generated JSON artifact', { filename });
    return filename;
  }

  /**
   * Generate trace.md - human-readable summary with tables and mini graph
   */
  async generateMarkdown(
    artifacts: TraceArtifacts,
    outputDir: string,
    baseFilename: string
  ): Promise<string> {
    const filename = path.join(outputDir, `${baseFilename}.md`);
    
    const md: string[] = [];
    
    // Header
    md.push(`# Trace Results: ${artifacts.queriedUrl}`);
    md.push('');
    md.push(`**Generated:** ${artifacts.metadata.timestamp}`);
    md.push(`**Processing Time:** ${artifacts.metadata.processingTime}ms`);
    md.push(`**Truth Status:** \`${artifacts.truth}\``);
    md.push('');

    // Route Information
    md.push('## 🛣️ Route Information');
    md.push('');
    if (artifacts.routeMatch) {
      md.push('| Property | Value |');
      md.push('|----------|-------|');
      md.push(`| URL Pattern | \`${artifacts.routeMatch.pattern}\` |`);
      md.push(`| Specificity | ${artifacts.routeMatch.specificity} |`);
      md.push(`| Component | ${artifacts.router?.componentName || 'Unknown'} |`);
      if (artifacts.router?.filePath) {
        md.push(`| File Path | \`${artifacts.router.filePath}\` |`);
      }
      if (artifacts.router?.importPath) {
        md.push(`| Import Path | \`${artifacts.router.importPath}\` |`);
      }
    } else {
      md.push('❌ **No matching route found**');
    }
    md.push('');

    // Dynamic Parameters
    if (Object.keys(artifacts.dynamicParams).length > 0) {
      md.push('### Dynamic Parameters');
      md.push('');
      md.push('| Parameter | Value |');
      md.push('|-----------|-------|');
      for (const [key, value] of Object.entries(artifacts.dynamicParams)) {
        md.push(`| \`${key}\` | \`${value}\` |`);
      }
      md.push('');
    }

    // Menu Information
    md.push('## 📋 Menu References');
    md.push('');
    if (artifacts.menus.length > 0) {
      md.push('| Label | Path | Section | Component | Hidden |');
      md.push('|-------|------|---------|-----------|--------|');
      for (const menu of artifacts.menus) {
        md.push(`| ${menu.label} | \`${menu.path}\` | ${menu.section || 'N/A'} | ${menu.componentRef || 'N/A'} | ${menu.hidden ? '✅' : '❌'} |`);
      }
    } else {
      md.push('❌ **No menu references found**');
    }
    md.push('');

    // HTTP Probe Results
    if (artifacts.httpProbe) {
      md.push('## 🌐 HTTP Probe Results');
      md.push('');
      md.push(`**Base URL:** ${artifacts.httpProbe.baseUrl}`);
      md.push(`**Authentication:** ${artifacts.httpProbe.auth.mode}`);
      md.push('');

      const probeResults = Object.entries(artifacts.httpProbe.results);
      if (probeResults.length > 0) {
        md.push('| Method | Status | Content-Type | Size | Time (ms) | Redirects |');
        md.push('|--------|--------|-------------|------|-----------|-----------|');
        
        probeResults.forEach(([method, result]) => {
          if (result) {
            const statusIcon = result.status >= 400 ? '❌' : result.status >= 300 ? '⚠️' : '✅';
            const time = result.timings ? `${Math.round(result.timings.total * 1000)}` : 'N/A';
            const size = result.timings ? this.formatBytes(result.timings.size) : 'N/A';
            const redirects = result.redirects.length > 0 ? result.redirects.length.toString() : '0';
            
            md.push(`| ${method.toUpperCase()} | ${statusIcon} ${result.status} | ${result.contentType || 'N/A'} | ${size} | ${time} | ${redirects} |`);
          }
        });
        md.push('');
      }

      // Security Headers
      const securityHeaders = this.getSecurityHeadersSummary(artifacts.httpProbe);
      if (securityHeaders.length > 0) {
        md.push('### Security Headers');
        md.push('');
        md.push('| Header | Value |');
        md.push('|--------|-------|');
        securityHeaders.forEach(([header, value]) => {
          md.push(`| \`${header}\` | \`${value}\` |`);
        });
        md.push('');
      }

      // Timing Summary
      const htmlResult = artifacts.httpProbe.results.html;
      if (htmlResult?.timings) {
        md.push('### Timing Breakdown (HTML Request)');
        md.push('');
        md.push('| Phase | Time (ms) |');
        md.push('|-------|-----------|');
        md.push(`| DNS Lookup | ${Math.round(htmlResult.timings.dns * 1000)} |`);
        md.push(`| Connection | ${Math.round(htmlResult.timings.connect * 1000)} |`);
        if (htmlResult.timings.tls > 0) {
          md.push(`| TLS Handshake | ${Math.round(htmlResult.timings.tls * 1000)} |`);
        }
        md.push(`| Time to First Byte | ${Math.round(htmlResult.timings.ttfb * 1000)} |`);
        md.push(`| Total Time | ${Math.round(htmlResult.timings.total * 1000)} |`);
        md.push('');
      }

      // Errors
      if (artifacts.httpProbe.errors.length > 0) {
        md.push('### HTTP Probe Issues');
        md.push('');
        artifacts.httpProbe.errors.forEach(error => {
          md.push(`- ❌ ${error}`);
        });
        md.push('');
      }
    }

    // Dependencies
    if (artifacts.dependencies.length > 0) {
      md.push('## 🔗 Dependencies');
      md.push('');
      
      const directDeps = artifacts.dependencies.filter(d => d.importType === 'direct');
      const transitiveDeps = artifacts.dependencies.filter(d => d.importType === 'transitive');
      
      if (directDeps.length > 0) {
        md.push('### Direct Dependencies');
        md.push('');
        md.push('| File | Type |');
        md.push('|------|------|');
        for (const dep of directDeps) {
          md.push(`| \`${dep.file}\` | ${dep.kind} |`);
        }
        md.push('');
      }
      
      if (transitiveDeps.length > 0) {
        md.push('### Transitive Dependencies');
        md.push('');
        md.push('| File | Type |');
        md.push('|------|------|');
        for (const dep of transitiveDeps.slice(0, 20)) { // Limit for readability
          md.push(`| \`${dep.file}\` | ${dep.kind} |`);
        }
        if (transitiveDeps.length > 20) {
          md.push(`| ... | *and ${transitiveDeps.length - 20} more* |`);
        }
        md.push('');
      }

      // Dependency graph (Mermaid)
      md.push('### Dependency Graph');
      md.push('');
      md.push('```mermaid');
      md.push('graph TD');
      
      if (artifacts.router?.componentName) {
        md.push(`  A["${artifacts.router.componentName}"]`);
        
        // Add direct dependencies
        directDeps.slice(0, 10).forEach((dep, idx) => {
          const nodeId = String.fromCharCode(66 + idx); // B, C, D, ...
          const fileName = path.basename(dep.file, path.extname(dep.file));
          md.push(`  ${nodeId}["${fileName}<br/>${dep.kind}"]`);
          md.push(`  A --> ${nodeId}`);
        });
      }
      
      md.push('```');
      md.push('');
    }

    // Warnings
    if (artifacts.warnings.length > 0) {
      md.push('## ⚠️ Warnings');
      md.push('');
      for (const warning of artifacts.warnings) {
        md.push(`- ${warning}`);
      }
      md.push('');
    }

    // Summary Statistics
    md.push('## 📊 Summary');
    md.push('');
    md.push(`- **Route Pattern**: ${artifacts.routeMatch?.pattern || 'Not found'}`);
    md.push(`- **Menu Items**: ${artifacts.menus.length}`);
    md.push(`- **Direct Dependencies**: ${artifacts.dependencies.filter(d => d.importType === 'direct').length}`);
    md.push(`- **Total Dependencies**: ${artifacts.dependencies.length}`);
    md.push(`- **Truth Status**: ${artifacts.truth}`);
    
    if (artifacts.httpProbe) {
      const probeResults = Object.values(artifacts.httpProbe.results).filter(Boolean) as any[];
      const successCount = probeResults.filter(r => r.status >= 200 && r.status < 300).length;
      const errorCount = probeResults.filter(r => r.status >= 400).length;
      
      md.push(`- **HTTP Probes**: ${probeResults.length} (${successCount} success, ${errorCount} errors)`);
      md.push(`- **Authentication**: ${artifacts.httpProbe.auth.mode}`);
      
      if (artifacts.httpProbe.results.html?.timings) {
        md.push(`- **Response Time**: ${Math.round(artifacts.httpProbe.results.html.timings.total * 1000)}ms`);
      }
    }

    const content = md.join('\n');
    fs.writeFileSync(filename, content);
    
    log.debug('Generated Markdown artifact', { filename });
    return filename;
  }

  /**
   * Generate trace.csv - flat list of dependencies
   */
  async generateCSV(
    artifacts: TraceArtifacts,
    outputDir: string,
    baseFilename: string
  ): Promise<string> {
    const filename = path.join(outputDir, `${baseFilename}.csv`);
    
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('type,file,kind,importType,section,label,path,componentName,httpStatus,httpMethod,timing');
    
    // Main component
    if (artifacts.router) {
      csvRows.push([
        'component',
        artifacts.router.filePath || '',
        'main',
        'root',
        '',
        '',
        artifacts.queriedUrl,
        artifacts.router.componentName || '',
        '',
        '',
        '',
      ].map(this.escapeCsv).join(','));
    }
    
    // Dependencies
    for (const dep of artifacts.dependencies) {
      csvRows.push([
        'dependency',
        dep.file,
        dep.kind,
        dep.importType,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ].map(this.escapeCsv).join(','));
    }
    
    // Menu items
    for (const menu of artifacts.menus) {
      csvRows.push([
        'menu',
        menu.importPath || '',
        'menu',
        'reference',
        menu.section || '',
        menu.label,
        menu.path,
        menu.componentRef || '',
        '',
        '',
        '',
      ].map(this.escapeCsv).join(','));
    }

    // HTTP probe results
    if (artifacts.httpProbe) {
      Object.entries(artifacts.httpProbe.results).forEach(([method, result]) => {
        if (result) {
          csvRows.push([
            'http_probe',
            artifacts.httpProbe!.baseUrl + artifacts.httpProbe!.requestedPath,
            'http_request',
            'probe',
            '',
            '',
            artifacts.httpProbe!.requestedPath,
            '',
            result.status.toString(),
            method.toUpperCase(),
            result.timings ? `${Math.round(result.timings.total * 1000)}ms` : '',
          ].map(this.escapeCsv).join(','));
        }
      });
    }

    const content = csvRows.join('\n');
    fs.writeFileSync(filename, content);
    
    log.debug('Generated CSV artifact', { filename });
    return filename;
  }

  /**
   * Generate routes.map.json for full route mapping
   */
  async generateRouteMap(
    routeMapData: {
      routes: Array<{ pattern: string; component?: string; file?: string }>;
      menus: Array<{ label: string; path: string; component?: string }>;
      crossReference: Array<{
        route: { urlPattern: string; componentName?: string };
        menus: Array<{ label: string; path: string }>;
        status: string;
      }>;
    },
    outputDir: string
  ): Promise<string> {
    this.ensureDirectory(outputDir);
    const filename = path.join(outputDir, 'routes.map.json');
    
    const routeMapJson = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalRoutes: routeMapData.routes.length,
        totalMenus: routeMapData.menus.length,
        definitive: routeMapData.crossReference.filter(x => x.status === 'definitive').length,
        routerOnly: routeMapData.crossReference.filter(x => x.status === 'router_only').length,
        conflicts: routeMapData.crossReference.filter(x => x.status === 'conflict').length,
      },
      routes: routeMapData.routes.map(route => ({
        pattern: route.pattern,
        component: route.component,
        file: route.file,
      })),
      menus: routeMapData.menus.map(menu => ({
        label: menu.label,
        path: menu.path,
        component: menu.component,
      })),
      crossReference: routeMapData.crossReference.map(ref => ({
        route: {
          pattern: ref.route.urlPattern,
          component: ref.route.componentName,
        },
        menus: ref.menus.map(menu => ({
          label: menu.label,
          path: menu.path,
        })),
        status: ref.status,
      })),
    };

    fs.writeFileSync(filename, JSON.stringify(routeMapJson, null, 2));
    
    log.debug('Generated route map artifact', { filename });
    return filename;
  }

  /**
   * Generate filename based on URL and options
   */
  private generateFilename(url: string, includeTimestamp = false): string {
    // Clean up URL for filename
    let clean = url
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+$/, '') // Remove trailing slashes
      .replace(/[^a-zA-Z0-9\-_]/g, '_') // Replace special chars
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

    if (!clean) clean = 'root';

    if (includeTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      clean = `${clean}_${timestamp}`;
    }

    return clean;
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.debug('Created output directory', { dir });
    }
  }

  /**
   * Escape CSV values
   */
  private escapeCsv(value: string): string {
    if (!value) return '';
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    
    return value;
  }

  /**
   * Get output directory
   */
  getOutputDir(): string {
    return this.outputDir;
  }

  /**
   * Set output directory
   */
  setOutputDir(dir: string): void {
    this.outputDir = dir;
  }

  /**
   * Sanitize HTTP probe data for JSON output (remove sensitive data)
   */
  private sanitizeHttpProbeForJson(httpProbe: any): any {
    return {
      baseUrl: httpProbe.baseUrl,
      requestedPath: httpProbe.requestedPath,
      auth: {
        mode: httpProbe.auth.mode,
        cookiesInitial: httpProbe.auth.cookiesInitial, // Names only, no values
        cookiesAfterLogin: httpProbe.auth.cookiesAfterLogin, // Names only, no values
        // Omit csrfToken for security
      },
      results: Object.fromEntries(
        Object.entries(httpProbe.results).map(([method, result]: [string, any]) => [
          method,
          result ? {
            status: result.status,
            headers: this.sanitizeHeaders(result.headers),
            contentType: result.contentType,
            encoding: result.encoding,
            bodySample: result.bodySample ? this.truncateAndRedact(result.bodySample, 500) : undefined,
            timings: result.timings,
            redirects: result.redirects,
            cookies: result.cookies, // Names only
            securityHeaders: result.securityHeaders,
          } : null
        ])
      ),
      errors: httpProbe.errors,
    };
  }

  /**
   * Sanitize headers by removing sensitive values
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-csrf-token'];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        if (lowerKey === 'set-cookie') {
          // Keep cookie names but redact values
          sanitized[key] = value.replace(/([^=]+)=[^;]+/g, '$1=<redacted>');
        } else {
          sanitized[key] = '<redacted>';
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Truncate and redact sensitive content
   */
  private truncateAndRedact(content: string, maxLength: number): string {
    let truncated = content.length > maxLength 
      ? content.substring(0, maxLength) + '...[truncated]'
      : content;

    // Additional redaction for JSON artifacts
    truncated = truncated.replace(
      /(["'](?:password|token|secret|key|auth)[^"']*["']\s*:\s*["'])[^"']{3,}(["'])/gi,
      '$1<redacted>$2'
    );

    return truncated;
  }

  /**
   * Format bytes in human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get security headers summary for markdown
   */
  private getSecurityHeadersSummary(httpProbe: any): [string, string][] {
    const securityHeaders: [string, string][] = [];
    const results = Object.values(httpProbe.results).filter(Boolean) as any[];
    
    if (results.length > 0) {
      const firstResult = results[0];
      const headers = firstResult.securityHeaders || {};
      
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === 'string' && value.trim()) {
          securityHeaders.push([key, value]);
        }
      }
    }
    
    return securityHeaders;
  }
}
