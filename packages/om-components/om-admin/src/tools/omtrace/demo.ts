#!/usr/bin/env tsx

// Demo script for enhanced omtrace functionality with authenticated HTTP probing
import { URLTracer } from './core/url-tracer.js';
import { ArtifactGenerator } from './core/artifact-generator.js';
import { log, setLogLevel } from './core/logger.js';
import { loadConfig, getCredentials } from './lib/config.js';
import { AuthManager } from './lib/auth.js';
import { HttpProber } from './lib/probe.js';

async function runDemo() {
  console.log('🚀 OMTrace Enhanced Demo - With Authenticated HTTP Probing');
  console.log('=========================================================');
  
  setLogLevel('info');
  
  const feRoot = process.cwd();
  const tracer = new URLTracer(feRoot);
  const generator = new ArtifactGenerator('demo-output');
  
  // Load configuration
  const config = loadConfig();
  const credentials = getCredentials(config);
  
  console.log(`\n⚙️  Configuration:`);
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Has Credentials: ${credentials ? '✅' : '❌'}`);
  console.log(`   Cookie File: ${config.cookieFile}`);
  console.log(`   Log Level: ${config.logLevel}`);
  
  if (!credentials) {
    console.log('\n⚠️  No superadmin credentials found. HTTP probing will run unauthenticated.');
    console.log('   Set OMTRACE_SUPERADMIN_EMAIL and OMTRACE_SUPERADMIN_PASSWORD for full demo.');
  }
  
  // Example URLs to trace
  const exampleUrls = [
    '/apps/records-ui/46',
    '/admin/users',
    '/dashboards/modern',
    '/tools/omtrace',
    '/social/blog',
  ];

  console.log('\n📋 Demo URLs:');
  exampleUrls.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
  console.log('');

  // Demonstrate authentication if credentials available
  if (credentials) {
    console.log('🔐 Testing Authentication...');
    try {
      const authManager = new AuthManager({
        baseUrl: config.baseUrl,
        jarPath: config.cookieFile,
        timeoutMs: config.curlTimeoutMs,
      });

      const authResult = await authManager.authenticate(credentials);
      console.log(`   Auth Mode: ${authResult.mode}`);
      console.log(`   Initial Cookies: ${authResult.cookiesInitial.length}`);
      console.log(`   Login Cookies: ${authResult.cookiesAfterLogin.length}`);
      
      // Cleanup for demo
      authManager.cleanup(false);
    } catch (error) {
      console.log(`   Auth Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');
  }

  for (const url of exampleUrls) {
    try {
      console.log(`\n🔍 Tracing: ${url}`);
      console.log('─'.repeat(50));
      
      const artifacts = await tracer.traceUrl(url, {
        followImports: true,
      });

      // Add HTTP probing
      try {
        console.log(`🌐 HTTP Probing: ${url}`);
        
        const authManager = new AuthManager({
          baseUrl: config.baseUrl,
          jarPath: config.cookieFile,
          timeoutMs: config.curlTimeoutMs,
        });

        const authResult = await authManager.authenticate(credentials);
        
        const httpProbe = await HttpProber.probe({
          urlPath: url,
          baseUrl: config.baseUrl,
          auth: authResult,
          jarPath: config.cookieFile,
          timeoutMs: config.curlTimeoutMs,
          bodyLimit: config.curlBodyLimit,
        });

        artifacts.httpProbe = httpProbe;
        authManager.cleanup(config.persistCookies);
        
      } catch (error) {
        console.log(`   HTTP Probe Warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Generate artifacts
      const files = await generator.generateAll(artifacts, {
        outputDir: 'demo-output',
        filename: `demo_${url.replace(/[^a-zA-Z0-9]/g, '_')}`,
        includeTimestamp: false,
      });

      // Show summary
      console.log(`📊 Results for ${url}:`);
      console.log(`   Route Pattern: ${artifacts.routeMatch?.pattern || 'Not found'}`);
      console.log(`   Component: ${artifacts.router?.componentName || 'Unknown'}`);
      console.log(`   Truth Status: ${artifacts.truth}`);
      console.log(`   Menu Items: ${artifacts.menus.length}`);
      console.log(`   Dependencies: ${artifacts.dependencies.length}`);
      
      if (artifacts.httpProbe) {
        const probeResults = Object.entries(artifacts.httpProbe.results);
        console.log(`   HTTP Probes: ${probeResults.length} (${artifacts.httpProbe.auth.mode} auth)`);
        
        probeResults.forEach(([method, result]) => {
          if (result) {
            const statusIcon = result.status >= 400 ? '❌' : result.status >= 300 ? '⚠️' : '✅';
            const time = result.timings ? `${Math.round(result.timings.total * 1000)}ms` : 'N/A';
            console.log(`     ${method.toUpperCase()}: ${statusIcon} ${result.status} (${time})`);
          }
        });
      }
      
      if (artifacts.dynamicParams && Object.keys(artifacts.dynamicParams).length > 0) {
        console.log(`   Dynamic Params: ${JSON.stringify(artifacts.dynamicParams)}`);
      }
      
      if (artifacts.warnings.length > 0) {
        console.log(`   Warnings: ${artifacts.warnings.length}`);
        artifacts.warnings.forEach(warning => console.log(`     • ${warning}`));
      }
      
      console.log(`   Generated: ${Object.keys(files).join(', ')}`);
      
    } catch (error) {
      console.error(`❌ Failed to trace ${url}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Generate full route map
  console.log('\n🗺️  Generating full route map...');
  try {
    const routeMap = await tracer.buildFullRouteMap();
    const mapFile = await generator.generateRouteMap(routeMap, 'demo-output');
    
    console.log('✅ Route map generated successfully');
    console.log(`📊 Summary:`);
    console.log(`   Total routes: ${routeMap.routes.length}`);
    console.log(`   Total menus: ${routeMap.menus.length}`);
    console.log(`   Definitive matches: ${routeMap.crossReference.filter(x => x.status === 'definitive').length}`);
    console.log(`   Router-only: ${routeMap.crossReference.filter(x => x.status === 'router_only').length}`);
    console.log(`   Conflicts: ${routeMap.crossReference.filter(x => x.status === 'conflict').length}`);
    console.log(`   Generated: ${mapFile}`);
    
  } catch (error) {
    console.error('❌ Failed to generate route map:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n🎉 Demo completed!');
  console.log('📁 Check the demo-output/ directory for generated artifacts');
  console.log('\n🚀 Usage Examples:');
  console.log('');
  console.log('Basic tracing with HTTP probing:');
  console.log('  npm run omtrace:enhanced trace --url /apps/records-ui/46');
  console.log('');
  console.log('Skip HTTP probing:');
  console.log('  npm run omtrace:enhanced trace --url /admin/users --no-curl');
  console.log('');
  console.log('Skip authentication (unauthenticated probes):');
  console.log('  npm run omtrace:enhanced trace --url /dashboard --no-auth');
  console.log('');
  console.log('CI mode (fail on HTTP errors):');
  console.log('  npm run omtrace:enhanced trace --url /api/endpoint --ci');
  console.log('');
  console.log('Full route consistency check:');
  console.log('  npm run omtrace:enhanced check --fail-on-drift');
  console.log('');
  console.log('Custom timeout and verbose logging:');
  console.log('  npm run omtrace:enhanced trace --url /slow/page --curl-timeout 30000 -v');
  console.log('');
  console.log('📝 Environment Variables (create .env file):');
  console.log('  OMTRACE_BASE_URL=http://localhost:3001');
  console.log('  OMTRACE_SUPERADMIN_EMAIL=admin@orthodoxmetrics.com');
  console.log('  OMTRACE_SUPERADMIN_PASSWORD=your-password');
  console.log('  OMTRACE_PERSIST_COOKIES=1');
  console.log('  OMTRACE_LOG_LEVEL=debug');
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runDemo };
