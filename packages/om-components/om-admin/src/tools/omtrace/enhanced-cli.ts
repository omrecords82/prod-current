#!/usr/bin/env tsx

// Enhanced OMTRACE CLI with URL-first tracing and Router-as-Truth
import * as path from 'path';
import * as fs from 'fs';
import { URLTracer } from './core/url-tracer.js';
import { ArtifactGenerator } from './core/artifact-generator.js';
import { log, setVerbose, setQuiet, setLogLevel } from './core/logger.js';
import { loadConfig, getCredentials, validateConfig, applyCliOverrides, getConfigHelp } from './lib/config.js';
import { AuthManager } from './lib/auth.js';
import { HttpProber } from './lib/probe.js';
import { AuthAuditor } from './lib/authAudit.js';
import { AuthReportGenerator } from './lib/authReportGenerator.js';
import { startupScanner, reachableScanner, unusedScanner, loadStartupCache, DevUsageOptions } from './lib/devUsage.js';

interface CLIOptions {
  url?: string;
  router?: string;
  menus?: string;
  out?: string;
  failOnDrift?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  help?: boolean;
  version?: boolean;
  noCurl?: boolean;
  noAuth?: boolean;
  curlTimeout?: number;
  ci?: boolean;
  fixHints?: boolean;
  // Usage command options
  mode?: 'startup' | 'reachable' | 'full';
  cache?: string;
}

interface CommandResult {
  success: boolean;
  exitCode: number;
  message?: string;
}

const VERSION = '2.0.0-enhanced';
const DEFAULT_OUTPUT_DIR = 'docs/trace';
const DEFAULT_MENU_GLOB = 'front-end/src/**/*menu*.(ts|tsx)';

/**
 * Enhanced OMTRACE CLI entry point
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
      showHelp();
      process.exit(0);
    }

    if (command === '--version' || command === '-v') {
      console.log(`omtrace enhanced v${VERSION}`);
      process.exit(0);
    }

    const result = await executeCommand(command, args.slice(1));
    
    if (!result.success) {
      if (result.message) {
        console.error(`❌ ${result.message}`);
      }
      process.exit(result.exitCode);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Execute a command with arguments
 */
async function executeCommand(command: string, args: string[]): Promise<CommandResult> {
  const options = parseArgs(args);
  
  // Load configuration
  const baseConfig = loadConfig();
  const config = applyCliOverrides(baseConfig, {
    curlTimeout: options.curlTimeout,
    verbose: options.verbose,
    quiet: options.quiet,
  });

  // Set up logging
  setLogLevel(config.logLevel);
  
  // Validate configuration
  const configErrors = validateConfig(config, !options.noAuth && !options.noCurl);
  if (configErrors.length > 0 && !options.noAuth && !options.noCurl) {
    log.warn('Configuration issues found:');
    configErrors.forEach(error => log.warn(`  • ${error}`));
    log.info('Use --no-auth to skip authentication or set the required environment variables');
  }

  const feRoot = findFrontEndRoot();
  log.debug('Using front-end root', { feRoot });

  switch (command) {
    case 'trace':
      return await executeTrace(options, feRoot, config);
    case 'map':
      return await executeMap(options, feRoot, config);
    case 'check':
      return await executeCheck(options, feRoot, config);
    case 'auth-audit':
      return await executeAuthAudit(options, feRoot, config);
    case 'usage':
      return await executeUsage(options, feRoot, config);
    default:
      return {
        success: false,
        exitCode: 1,
        message: `Unknown command: ${command}. Use --help for usage information.`,
      };
  }
}

/**
 * Execute trace command
 */
async function executeTrace(options: CLIOptions, feRoot: string, config: any): Promise<CommandResult> {
  if (!options.url) {
    return {
      success: false,
      exitCode: 1,
      message: 'trace command requires --url parameter',
    };
  }

  try {
    console.log(`🔍 Tracing URL: ${options.url}`);
    
    const tracer = new URLTracer(feRoot);
    const artifacts = await tracer.traceUrl(options.url, {
      routerPath: options.router,
      menuGlob: options.menus || DEFAULT_MENU_GLOB,
      followImports: true,
    });
    
    // Load dev-startup cache for annotation
    const cacheDir = path.join(feRoot, '.cache/omtrace');
    const startupFiles = await loadStartupCache(cacheDir);
    
    if (startupFiles) {
      // Annotate dependencies with usedAtDevStartup flags
      let hitCount = 0;
      artifacts.dependencies.forEach(dep => {
        const isUsedAtStartup = startupFiles.has(dep.file);
        (dep as any).usedAtDevStartup = isUsedAtStartup;
        if (isUsedAtStartup) hitCount++;
      });
      
      // Add dev startup summary
      (artifacts as any).devStartup = {
        hitCount,
        hitRatio: artifacts.dependencies.length > 0 ? hitCount / artifacts.dependencies.length : 0,
        total: startupFiles.size,
        cache: path.join(cacheDir, 'dev-startup-files.json')
      };
      
      log.debug(`Dev startup annotation: ${hitCount}/${artifacts.dependencies.length} dependencies used at startup`);
    } else {
      log.debug('No dev-startup cache found, skipping annotations');
    }

    // Execute HTTP probing unless disabled
    if (!options.noCurl) {
      try {
        console.log('🌐 Executing HTTP probes...');
        const httpProbe = await executeHttpProbe(options.url, config, options);
        artifacts.httpProbe = httpProbe;
        
        // Check for errors in CI mode
        if (options.ci && httpProbe.errors.length > 0) {
          return {
            success: false,
            exitCode: 2,
            message: `HTTP probe failed: ${httpProbe.errors.join(', ')}`,
          };
        }
        
        // Check for HTTP errors in CI mode
        if (options.ci) {
          const httpErrors = Object.values(httpProbe.results).filter(
            result => result && result.status >= 400
          );
          if (httpErrors.length > 0) {
            return {
              success: false,
              exitCode: 2,
              message: `HTTP errors detected: ${httpErrors.map(r => `${r!.status}`).join(', ')}`,
            };
          }
        }
      } catch (error) {
        log.warn('HTTP probe failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        if (options.ci) {
          return {
            success: false,
            exitCode: 2,
            message: `HTTP probe failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }
    }

    const generator = new ArtifactGenerator(options.out || DEFAULT_OUTPUT_DIR);
    const files = await generator.generateAll(artifacts);

    console.log('✅ Trace completed successfully');
    console.log('');
    console.log('📊 Results:');
    console.log(`   URL: ${artifacts.queriedUrl}`);
    console.log(`   Route: ${artifacts.routeMatch?.pattern || 'Not found'}`);
    console.log(`   Component: ${artifacts.router?.componentName || 'Unknown'}`);
    console.log(`   Truth: ${artifacts.truth}`);
    console.log(`   Menus: ${artifacts.menus.length}`);
    console.log(`   Dependencies: ${artifacts.dependencies.length}`);
    
    if (artifacts.httpProbe) {
      const probeResults = Object.entries(artifacts.httpProbe.results);
      console.log(`   HTTP Probes: ${probeResults.length} (${artifacts.httpProbe.auth.mode} auth)`);
      
      probeResults.forEach(([method, result]) => {
        if (result) {
          const statusIcon = result.status >= 400 ? '❌' : result.status >= 300 ? '⚠️' : '✅';
          console.log(`     ${method.toUpperCase()}: ${statusIcon} ${result.status}`);
        }
      });
    }
    
    console.log('');
    console.log('📁 Generated artifacts:');
    console.log(`   JSON: ${files.json}`);
    console.log(`   Markdown: ${files.markdown}`);
    console.log(`   CSV: ${files.csv}`);

    if (artifacts.warnings.length > 0) {
      console.log('');
      console.log('⚠️  Warnings:');
      artifacts.warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    if (artifacts.httpProbe?.errors.length) {
      console.log('');
      console.log('🌐 HTTP Probe Issues:');
      artifacts.httpProbe.errors.forEach(error => console.log(`   • ${error}`));
    }

    return { success: true, exitCode: 0 };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      message: `Trace failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Execute HTTP probe for a URL
 */
async function executeHttpProbe(url: string, config: any, options: CLIOptions): Promise<any> {
  const credentials = options.noAuth ? undefined : getCredentials(config);
  
  const authManager = new AuthManager({
    baseUrl: config.baseUrl,
    jarPath: config.cookieFile,
    timeoutMs: config.curlTimeoutMs,
  });

  let authResult;
  try {
    authResult = await authManager.authenticate(credentials, options.noAuth);
  } catch (error) {
    log.debug('Authentication failed, proceeding with probe anyway', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    authResult = { mode: 'none', cookiesInitial: [], cookiesAfterLogin: [] };
  }

  try {
    const httpProbe = await HttpProber.probe({
      urlPath: url,
      baseUrl: config.baseUrl,
      auth: authResult,
      jarPath: config.cookieFile,
      timeoutMs: config.curlTimeoutMs,
      bodyLimit: config.curlBodyLimit,
      userAgent: 'omtrace/2.0.0-enhanced',
    });

    return httpProbe;
  } finally {
    // Cleanup cookie jar unless persisting
    authManager.cleanup(config.persistCookies);
  }
}

/**
 * Execute map command
 */
async function executeMap(options: CLIOptions, feRoot: string, config: any): Promise<CommandResult> {
  try {
    console.log('🗺️  Building full route map...');
    
    const tracer = new URLTracer(feRoot);
    const routeMap = await tracer.buildFullRouteMap({
      routerPath: options.router,
      menuGlob: options.menus || DEFAULT_MENU_GLOB,
    });

    // Add dev-startup reference to route map
    const cacheDir = path.join(feRoot, '.cache/omtrace');
    const startupFiles = await loadStartupCache(cacheDir);
    if (startupFiles) {
      (routeMap as any).devStartupRef = {
        total: startupFiles.size,
        cache: path.join(cacheDir, 'dev-startup-files.json')
      };
    }

    const generator = new ArtifactGenerator(options.out || DEFAULT_OUTPUT_DIR);
    const mapFile = await generator.generateRouteMap(routeMap, options.out || DEFAULT_OUTPUT_DIR);

    console.log('✅ Route map generated successfully');
    console.log('');
    console.log('📊 Statistics:');
    console.log(`   Total routes: ${routeMap.routes.length}`);
    console.log(`   Total menus: ${routeMap.menus.length}`);
    console.log(`   Definitive matches: ${routeMap.crossReference.filter(x => x.status === 'definitive').length}`);
    console.log(`   Router-only routes: ${routeMap.crossReference.filter(x => x.status === 'router_only').length}`);
    console.log(`   Conflicts: ${routeMap.crossReference.filter(x => x.status === 'conflict').length}`);
    console.log('');
    console.log(`📁 Generated: ${mapFile}`);

    return { success: true, exitCode: 0 };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      message: `Map generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Execute check command for CI
 */
async function executeCheck(options: CLIOptions, feRoot: string, config: any): Promise<CommandResult> {
  try {
    console.log('🔍 Checking router↔menu↔component consistency...');
    
    const tracer = new URLTracer(feRoot);
    const routeMap = await tracer.buildFullRouteMap({
      routerPath: options.router,
      menuGlob: options.menus || DEFAULT_MENU_GLOB,
    });

    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for router paths with no matching menu
    const routerOnly = routeMap.crossReference.filter(x => x.status === 'router_only');
    routerOnly.forEach(ref => {
      warnings.push(`Router path "${ref.route.urlPattern}" has no matching menu entry`);
    });

    // Check for conflicts
    const conflicts = routeMap.crossReference.filter(x => x.status === 'conflict');
    conflicts.forEach(ref => {
      issues.push(`Router path "${ref.route.urlPattern}" has component mismatch with menu entries`);
    });

    // Check for orphaned menu items
    const allRoutePaths = new Set(routeMap.routes.map(r => r.pattern));
    const orphanedMenus = routeMap.menus.filter(menu => !allRoutePaths.has(menu.path));
    orphanedMenus.forEach(menu => {
      warnings.push(`Menu item "${menu.label}" (${menu.path}) has no matching router entry`);
    });

    // Add dev-startup reference
    const cacheDir = path.join(feRoot, '.cache/omtrace');
    const startupFiles = await loadStartupCache(cacheDir);
    
    // Summary
    console.log('✅ Consistency check completed');
    console.log('');
    console.log('📊 Results:');
    console.log(`   Total routes: ${routeMap.routes.length}`);
    console.log(`   Total menus: ${routeMap.menus.length}`);
    console.log(`   Issues: ${issues.length}`);
    console.log(`   Warnings: ${warnings.length}`);
    if (startupFiles) {
      console.log(`   Dev startup files: ${startupFiles.size}`);
    }

    if (warnings.length > 0) {
      console.log('');
      console.log('⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    if (issues.length > 0) {
      console.log('');
      console.log('❌ Issues:');
      issues.forEach(issue => console.log(`   • ${issue}`));
    }

    // Determine exit code
    let exitCode = 0;
    if (warnings.length > 0) exitCode = 1; // Warnings
    if (issues.length > 0) exitCode = 2; // Drift/errors

    if (options.failOnDrift && (issues.length > 0 || warnings.length > 0)) {
      return {
        success: false,
        exitCode,
        message: 'Consistency check failed with drift detected',
      };
    }

    return { success: true, exitCode };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Execute auth-audit command
 */
async function executeAuthAudit(options: CLIOptions, feRoot: string, config: any): Promise<CommandResult> {
  try {
    const projectRoot = process.cwd(); // Use project root, not just front-end
    
    console.log('🔐 Starting JWT/Auth Security Audit...');
    
    // Create auditor
    const auditor = new AuthAuditor({
      projectRoot,
      includeFrontend: true,
      includeServer: true,
      verbose: options.verbose,
    });

    // Run audit
    const auditResult = await auditor.audit({
      projectRoot,
      includeFrontend: true,
      includeServer: true,
      verbose: options.verbose,
    });

    // Create output directory
    const outputDir = options.out || 'docs/auth';
    
    // Generate reports
    const reportGenerator = new AuthReportGenerator(outputDir);
    const reports = await reportGenerator.generateReports(auditResult, {
      outputDir,
      includeFixHints: options.fixHints,
      projectRoot,
    });

    // Display summary
    const { summary } = auditResult;
    const riskEmoji = summary.riskScore <= 2 ? '🟢' : summary.riskScore <= 5 ? '🟡' : summary.riskScore <= 8 ? '🟠' : '🔴';
    
    console.log('✅ Auth audit completed successfully');
    console.log('');
    console.log('📊 Security Assessment:');
    console.log(`   Risk Score: ${riskEmoji} ${summary.riskScore}/10`);
    console.log(`   Files Scanned: ${summary.filesScanned}`);
    console.log(`   Issues Found: ${summary.jwtFindings}`);
    console.log(`   Client Issues: ${summary.clientFindings}`);
    console.log(`   Server Issues: ${summary.serverFindings}`);
    console.log('');
    
    // Show key findings
    const highRiskFindings = auditResult.findings.filter(f => f.risk === 'high');
    if (highRiskFindings.length > 0) {
      console.log('🚨 High Risk Issues:');
      highRiskFindings.slice(0, 3).forEach(finding => {
        const fileName = path.basename(finding.file);
        console.log(`   • ${fileName}:${finding.line} - ${finding.why}`);
      });
      
      if (highRiskFindings.length > 3) {
        console.log(`   ... and ${highRiskFindings.length - 3} more high-risk issues`);
      }
      console.log('');
    }

    console.log('📁 Generated Reports:');
    console.log(`   JSON Report: ${reports.json}`);
    console.log(`   Markdown Report: ${reports.markdown}`);
    
    if (reports.fixHints) {
      console.log(`   Fix Hints: ${reports.fixHints.length} files`);
      console.log('');
      console.log('💡 Fix hints generated for affected files:');
      reports.fixHints.slice(0, 5).forEach(hintFile => {
        console.log(`   📝 ${path.basename(hintFile)}`);
      });
      if (reports.fixHints.length > 5) {
        console.log(`   ... and ${reports.fixHints.length - 5} more hint files`);
      }
    }
    console.log('');

    // Show top recommendations
    if (auditResult.recommendedActions.length > 0) {
      console.log('🛠️  Priority Actions:');
      auditResult.recommendedActions.slice(0, 3).forEach((action, index) => {
        console.log(`   ${index + 1}. ${action}`);
      });
      console.log('');
    }

    if (summary.riskScore >= 6) {
      console.log('⚠️  HIGH RISK DETECTED - Consider immediate security review');
      console.log('');
    }

    console.log(`📖 View detailed report: ${reports.markdown}`);

    // Exit with appropriate code based on risk level
    if (summary.riskScore >= 8) {
      return {
        success: false,
        exitCode: 2,
        message: `Critical security risk detected (score: ${summary.riskScore}/10)`,
      };
    } else if (summary.riskScore >= 6) {
      return {
        success: true,
        exitCode: 1,
        message: `High security risk detected (score: ${summary.riskScore}/10)`,
      };
    }

    return { success: true, exitCode: 0 };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      message: `Auth audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Execute usage command
 */
async function executeUsage(options: CLIOptions, feRoot: string, config: any): Promise<CommandResult> {
  try {
    const mode = options.mode || 'startup';
    const outDir = options.out || 'docs/usage';
    const cacheDir = options.cache || path.join(feRoot, '.cache/omtrace');
    
    const usageOptions: DevUsageOptions = {
      feRoot,
      outDir,
      cacheDir,
      verbose: options.verbose
    };
    
    if (!options.verbose) {
      console.log(`🔍 Running usage analysis (mode: ${mode})...`);
    }
    
    let startupFiles: Set<string> | null = null;
    let reachableFiles: Set<string> | null = null;
    
    switch (mode) {
      case 'startup':
        startupFiles = await startupScanner(usageOptions);
        if (!options.quiet) {
          console.log(`✅ Startup scan complete: ${startupFiles.size} files`);
        }
        break;
        
      case 'reachable':
        reachableFiles = await reachableScanner(usageOptions);
        if (!options.quiet) {
          console.log(`✅ Reachable scan complete: ${reachableFiles.size} files`);
        }
        break;
        
      case 'full':
        reachableFiles = await reachableScanner(usageOptions);
        const unusedResult = await unusedScanner(usageOptions, reachableFiles);
        
        if (!options.quiet) {
          console.log(`✅ Full usage analysis complete:`);
          console.log(`   Reachable: ${reachableFiles.size} files`);
          console.log(`   Unused candidates: ${unusedResult.count} files`);
        }
        break;
        
      default:
        return {
          success: false,
          exitCode: 1,
          message: `Invalid mode: ${mode}. Use startup, reachable, or full.`
        };
    }
    
    if (!options.quiet) {
      console.log('');
      console.log('📁 Generated artifacts:');
      console.log(`   Output directory: ${outDir}`);
      console.log(`   Cache directory: ${cacheDir}`);
      
      if (mode === 'startup' || mode === 'reachable') {
        console.log(`   ${mode}.json`);
      } else if (mode === 'full') {
        console.log('   reachable.json, unused-candidates.json');
      }
    }
    
    return { success: true, exitCode: 0 };
    
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      message: `Usage analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--url':
        if (i + 1 < args.length) {
          options.url = args[++i];
        }
        break;
      case '--router':
        if (i + 1 < args.length) {
          options.router = args[++i];
        }
        break;
      case '--menus':
        if (i + 1 < args.length) {
          options.menus = args[++i];
        }
        break;
      case '--out':
        if (i + 1 < args.length) {
          options.out = args[++i];
        }
        break;
      case '--fail-on-drift':
        options.failOnDrift = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--quiet':
      case '-q':
        options.quiet = true;
        break;
      case '--no-curl':
        options.noCurl = true;
        break;
      case '--no-auth':
        options.noAuth = true;
        break;
      case '--curl-timeout':
        if (i + 1 < args.length) {
          options.curlTimeout = parseInt(args[++i], 10);
        }
        break;
      case '--ci':
        options.ci = true;
        break;
      case '--fix-hints':
        options.fixHints = true;
        break;
      case '--mode':
        if (i + 1 < args.length) {
          const mode = args[++i] as 'startup' | 'reachable' | 'full';
          if (['startup', 'reachable', 'full'].includes(mode)) {
            options.mode = mode;
          }
        }
        break;
      case '--cache':
        if (i + 1 < args.length) {
          options.cache = args[++i];
        }
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
        options.version = true;
        break;
    }
  }
  
  return options;
}

/**
 * Find front-end root directory
 */
function findFrontEndRoot(): string {
  const possibleRoots = [
    process.cwd(),
    path.join(process.cwd(), 'front-end'),
    path.join(process.cwd(), '..', 'front-end'),
    '/var/www/orthodoxmetrics/prod/front-end',
  ];

  for (const root of possibleRoots) {
    const srcPath = path.join(root, 'src');
    const packagePath = path.join(root, 'package.json');
    
    if (fs.existsSync(srcPath) && fs.existsSync(packagePath)) {
      return root;
    }
  }

  throw new Error('Could not locate front-end root directory');
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
🔍 OMTRACE Enhanced - URL-first Router Tracing with Authenticated HTTP Probing

Usage:
  omtrace <command> [options]

Commands:
  trace --url <path>     Trace a specific URL path with HTTP probing
  map                    Build full route map (all routes)
  check                  Verify router↔menu↔component consistency (CI-safe)
  auth-audit             Scan for JWT usage and recommend session auth migration
  usage [--mode MODE]    Analyze dev-startup files and find unused candidates

Options:
  --url <path>          Required for trace: URL path to trace (e.g., /apps/records-ui/46)
  --router <path>       Router file path (default: auto-detect Router.tsx)
  --menus "<glob>"      Menu files glob pattern (default: front-end/src/**/*menu*.(ts|tsx))
  --out <dir>           Output directory (default: docs/trace)
  --fail-on-drift       Exit with code 2 on router↔menu mismatches (for CI)
  --no-curl             Skip HTTP probing entirely
  --no-auth             Skip authentication, use unauthenticated probes
  --curl-timeout <ms>   HTTP request timeout in milliseconds
  --ci                  CI mode: exit 2 on HTTP errors (4xx/5xx status)
  --fix-hints           Generate per-file fix hints for auth-audit (non-mutating)
  --mode <startup|reachable|full>  Usage analysis mode (default: startup)
  --cache <dir>         Cache directory (default: front-end/.cache/omtrace)
  --verbose, -v         Enable verbose logging (debug level)
  --quiet, -q           Enable quiet mode (errors only)
  --help, -h            Show this help message
  --version             Show version information

Examples:
  # Trace a specific URL
  omtrace trace --url /apps/records-ui/46

  # Trace with custom router and output directory
  omtrace trace --url /admin/users --router src/App.tsx --out ./trace-results

  # Build complete route map
  omtrace map --out ./docs/routes

  # CI consistency check
  omtrace check --fail-on-drift

  # Check with custom menu glob
  omtrace check --menus "src/**/*MenuItems*.(ts|tsx)" --fail-on-drift

  # Run security audit for JWT usage
  omtrace auth-audit

  # Audit with fix hints and verbose output
  omtrace auth-audit --fix-hints --verbose
  
  # Analyze dev-startup files
  omtrace usage
  
  # Find all reachable files from router
  omtrace usage --mode reachable
  
  # Full analysis: startup + reachable + unused candidates
  omtrace usage --mode full --out ./analysis

Features:
  • URL-first tracing: Primary search key is the URL path
  • Router-as-Truth: Router.tsx is the definitive source
  • Authenticated HTTP probing: Tests endpoints with superadmin credentials
  • Cookie jar management: Persistent authentication across probes
  • Security-conscious: Redacts sensitive data in artifacts
  • AST-based parsing: Uses ts-morph for accurate code analysis
  • Menu cross-reference: Validates menu↔router consistency
  • Artifact generation: JSON, Markdown, CSV outputs with HTTP data
  • Dynamic parameter extraction: Handles :id, :churchId patterns
  • Dependency analysis: Traces component imports and usage
  • CI integration: Fails builds on consistency drift or HTTP errors

Exit Codes:
  0 - Success
  1 - Warnings (router/menu inconsistencies)
  2 - Errors/Drift (component mismatches, HTTP 4xx/5xx status)

Generated Artifacts:
  trace.json     - Machine-readable canonical format with HTTP probe data
  trace.md       - Human-readable summary with Mermaid graphs and HTTP results
  trace.csv      - Flat dependency list for spreadsheets
  routes.map.json - Complete route↔menu cross-reference (map command)

${getConfigHelp()}
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { executeCommand, parseArgs, findFrontEndRoot };
