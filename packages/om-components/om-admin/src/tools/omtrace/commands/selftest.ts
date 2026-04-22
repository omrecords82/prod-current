import * as fs from 'fs';
import * as path from 'path';
import type { SelfTestResult } from '../core/types.js';
import { EXIT_CODES } from '../core/types.js';
import { log } from '../core/logger.js';
import { withAbort } from '../core/timeout.js';
import { getDefaultIndexPath, readIndexOrThrow } from '../core/indexIO.js';
import { resolveCandidates } from '../core/resolver.js';

/**
 * Run self-test
 */
export async function runSelfTest(feRoot: string): Promise<SelfTestResult> {
  log.info('Running self-test', { feRoot });

  try {
    const indexPath = getDefaultIndexPath(feRoot);
    const indexInfo = await withAbort(
      Promise.resolve().then(() => {
        if (!fs.existsSync(indexPath)) {
          return null;
        }
        const stats = fs.statSync(indexPath);
        const ageMs = Date.now() - stats.mtime.getTime();
        const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        return {
          path: indexPath,
          ageMs,
          files: data.nodes?.length || 0,
        };
      }),
      { timeoutMs: 30000, operation: 'self_test_index_check' }
    );

    if (!indexInfo || indexInfo.ageMs > 24 * 60 * 60 * 1000) {
      log.info('Building fresh index for self-test');
      const { buildIndex } = await import('../build_index.js');
      await buildIndex();
    }

    const testComponent = 'src/components/church-management/ch-wiz/ChurchSetupWizard.tsx';
    let traceProbe: SelfTestResult['traceProbe'];

    if (fs.existsSync(path.join(feRoot, testComponent))) {
      const index = readIndexOrThrow(indexPath);
      const candidates = resolveCandidates(testComponent, index, { pickFirst: true });
      traceProbe = {
        status: 'ok',
        resolvedPath: candidates[0]?.path || testComponent,
      };
    } else {
      traceProbe = {
        status: 'not_found',
      };
    }

    const result: SelfTestResult = {
      ok: true,
      feRoot,
      index: indexInfo || { path: indexPath, ageMs: 0, files: 0 },
      traceProbe,
    };

    const selftestPath = path.join(feRoot, '.cache/omtrace/selftest.json');
    fs.mkdirSync(path.dirname(selftestPath), { recursive: true });
    fs.writeFileSync(selftestPath, JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    const result: SelfTestResult = {
      ok: false,
      feRoot,
      index: { path: '', ageMs: 0, files: 0 },
      traceProbe: { status: 'error' },
      error: {
        code: EXIT_CODES.INDEX_FAILED,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };

    const selftestPath = path.join(feRoot, '.cache/omtrace/selftest.json');
    fs.mkdirSync(path.dirname(selftestPath), { recursive: true });
    fs.writeFileSync(selftestPath, JSON.stringify(result, null, 2));

    throw error;
  }
}
