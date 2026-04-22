import * as path from 'path';
import type { TraceResult } from '../core/types.js';
import { EXIT_CODES } from '../core/types.js';
import { OMTRACEError } from '../core/errors.js';
import { log } from '../core/logger.js';
import { normalizePath } from '../core/normalizePath.js';
import { resolveCandidates } from '../core/resolver.js';
import { traceDependencies } from '../core/tracer.js';
import { getDefaultIndexPath, readIndexOrThrow } from '../core/indexIO.js';
import { findComponentReferences } from '../core/routeAnalyzer.js';
import { InteractiveResolver, shouldUseInteractiveMode } from '../core/interactiveResolver.js';
import type { CLIOptions } from '../cli/types.js';

/**
 * Run trace mode
 */
export async function runTrace(
  target: string,
  feRoot: string,
  options: CLIOptions
): Promise<TraceResult> {
  log.info('Running trace', { target, feRoot });

  const indexPath = options.indexPath || getDefaultIndexPath(feRoot);
  const index = readIndexOrThrow(indexPath);

  const normalized = normalizePath(target, feRoot);

  if (normalized.exists) {
    const traceResult = await traceDependencies(normalized.normalized, index, {
      reverse: options.reverse,
      deep: options.deep,
      showServer: true,
    });

    if (options.showRoute) {
      const routeAnalysis = findComponentReferences(
        path.basename(normalized.normalized, path.extname(normalized.normalized)),
        feRoot
      );

      traceResult.routes = routeAnalysis.routes.map(route => ({
        path: route.path,
        file: route.component,
        line: route.line,
        roles: route.roles,
      }));
      traceResult.componentReferences = routeAnalysis.componentReferences;
    }

    return traceResult;
  }

  let candidates = resolveCandidates(normalized.candidate, index, {
    pickFirst: options.pickFirst,
  });

  if (candidates.length === 0) {
    throw new OMTRACEError(
      `No candidates found for target: ${target}`,
      EXIT_CODES.RESOLVER_FAILED
    );
  }

  if (candidates.length > 1 && !options.pickFirst) {
    if (shouldUseInteractiveMode()) {
      log.info('Multiple candidates found, using interactive resolution');
      const resolver = new InteractiveResolver(feRoot);
      const selectedCandidate = await resolver.resolveAmbiguity(target, candidates);

      if (selectedCandidate) {
        candidates = [selectedCandidate];
        log.info('User selected candidate', { path: selectedCandidate.path });
      } else {
        return {
          entry: target,
          resolvedPath: '',
          status: 'ambiguous',
          candidates,
          counts: { direct: 0, transitive: 0, reverse: 0 },
          deps: { direct: [], transitive: [], reverse: [] },
        };
      }
    } else {
      return {
        entry: target,
        resolvedPath: '',
        status: 'ambiguous',
        candidates,
        counts: { direct: 0, transitive: 0, reverse: 0 },
        deps: { direct: [], transitive: [], reverse: [] },
      };
    }
  }

  const resolvedPath = candidates[0].path;

  const traceResult = await traceDependencies(resolvedPath, index, {
    reverse: options.reverse,
    deep: options.deep,
    showServer: true,
  });

  log.debug('Options in runTrace', {
    showRoute: options.showRoute,
    reverse: options.reverse,
    deep: options.deep
  });

  if (options.showRoute) {
    log.debug('Route analysis requested', { showRoute: options.showRoute, resolvedPath });

    const routeAnalysis = findComponentReferences(
      path.basename(resolvedPath, path.extname(resolvedPath)),
      feRoot
    );

    log.debug('Route analysis completed', {
      routes: routeAnalysis.routes.length,
      references: routeAnalysis.componentReferences.length
    });

    traceResult.routes = routeAnalysis.routes.map(route => ({
      path: route.path,
      file: route.component,
      line: route.line,
      roles: route.roles,
    }));
    traceResult.componentReferences = routeAnalysis.componentReferences;
  }

  return traceResult;
}

/**
 * Format and print trace output to console
 */
export function formatTraceOutput(result: TraceResult, options: CLIOptions): void {
  console.log(`\n🔍 Trace result for: ${result.entry}`);
  console.log(`📁 Resolved path: ${result.resolvedPath}`);
  console.log(`\n📊 Dependency Summary:`);
  console.log(`  • Direct imports: ${result.counts.direct}`);
  if (options.reverse) {
    console.log(`  • Reverse imports: ${result.counts.reverse}`);
  }
  if (options.deep) {
    console.log(`  • Transitive dependencies: ${result.counts.transitive}`);
  }
  if (result.counts.server > 0) {
    console.log(`  • Server endpoints: ${result.counts.server}`);
  }

  if (result.counts.direct > 0) {
    console.log(`\n📥 Direct imports:`);
    result.deps.direct.forEach(imp => console.log(`  • ${imp}`));
  }

  if (options.reverse && result.counts.reverse > 0) {
    console.log(`\n📤 Reverse imports (who uses this file):`);
    result.deps.reverse.forEach(imp => console.log(`  • ${imp}`));
  }

  if (options.deep && result.counts.transitive > 0) {
    console.log(`\n🔄 Transitive dependencies:`);
    result.deps.transitive.forEach(imp => console.log(`  • ${imp}`));
  }

  if (result.counts.server > 0) {
    console.log(`\n🖥️  Server endpoints:`);
    result.deps.server.forEach(imp => console.log(`  • ${imp}`));
  }

  if (result.candidates && result.candidates.length > 1) {
    console.log(`\n⚠️  Ambiguous candidates:`, result.candidates.map(c => c.path).join(', '));
  }

  if (options.showRoute && result.routes && result.routes.length > 0) {
    console.log(`\n🌐 Route References:`);
    result.routes.forEach(route => {
      console.log(`  • ${route.path} → ${route.file} (line ${route.line})`);
    });
  }

  if (options.showRoute && result.componentReferences && result.componentReferences.length > 0) {
    console.log(`\n📋 Component References:`);
    result.componentReferences.forEach(ref => {
      console.log(`  • ${ref}`);
    });
  }
}
