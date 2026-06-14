import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { OcrApiClient } from '../../api/ocrApiClient.js';
import { resolveOutputFormat, writeError, writeJson, writeVerbose } from '../../output/format.js';
import type { GlobalCliFlags, OmocrProfile } from '../../types/index.js';
import { ExitCode } from '../../types/index.js';

interface AuditSummary {
  totalFiles: number;
  analyzed: number;
  failed: number;
  passedQuality: number;
  needsReview: number;
  avgQualityScore: number;
}

interface AuditReport {
  sessionId: string | null;
  rootPath?: string;
  summary: AuditSummary;
  systemRecommendations: Array<{
    priority: string;
    recommendation: string;
    affectedFiles: number;
  }>;
}

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']);

function collectLocalImages(dir: string, recursive: boolean): string[] {
  const results: string[] = [];
  const walk = (current: string) => {
    for (const ent of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        if (recursive) walk(full);
      } else if (ent.isFile() && IMAGE_EXT.has(path.extname(ent.name).toLowerCase())) {
        results.push(full);
      }
    }
  };
  walk(dir);
  return results.sort();
}

export function registerAnalyzeCommands(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags }) {
  const analyze = program.command('analyze').description('Pre-upload analyze — quality audit without creating OCR jobs');

  analyze
    .command('directory')
    .argument('<dir>', 'Directory under church uploads (recursive scan)')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .option('--no-recursive', 'Only scan the top-level directory')
    .option('--max-files <n>', 'Maximum images to analyze', (v) => parseInt(v, 10), 500)
    .option('--output <path>', 'Write audit report JSON to this file')
    .option('--session-id <id>', 'Append to an existing analyze session')
    .action(async (dir, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;

      const resolved = path.resolve(dir);
      if (!fs.existsSync(resolved)) {
        writeError(`Directory not found: ${resolved}`, flags);
        process.exit(ExitCode.USAGE);
      }

      const recursive = opts.recursive !== false;
      const localCount = collectLocalImages(resolved, recursive).length;
      writeVerbose(`Found ${localCount} image(s) under ${resolved}`, flags);

      const client = new OcrApiClient({ profile, flags });
      try {
        const { report: rawReport } = await client.scanAnalyzeDirectory(resolved, {
          churchId: flags.churchId,
          recursive,
          maxFiles: opts.maxFiles,
          sessionId: opts.sessionId,
        });
        const report = rawReport as AuditReport;

        if (opts.output) {
          fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
          fs.writeFileSync(opts.output, JSON.stringify(report, null, 2));
          if (!flags.quiet) process.stderr.write(`Wrote ${opts.output}\n`);
        }

        if (resolveOutputFormat(flags) === 'json') {
          writeJson(report, flags);
        } else {
          const s = report.summary;
          console.log(`Analyze audit  session=${report.sessionId}`);
          console.log(`  path:     ${report.rootPath}`);
          console.log(`  files:    ${s.totalFiles} total · ${s.analyzed} analyzed · ${s.failed} failed`);
          console.log(`  quality:  ${s.passedQuality} passed · ${s.needsReview} need review · avg ${Math.round(s.avgQualityScore * 100)}%`);
          if (report.systemRecommendations.length) {
            console.log('  recommendations:');
            for (const rec of report.systemRecommendations) {
              console.log(`    [${rec.priority}] ${rec.recommendation} (${rec.affectedFiles} files)`);
            }
          }
        }
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  analyze
    .command('report')
    .argument('<sessionId>', 'Analyze session ID')
    .option('--church-id <id>', 'Church ID', (v) => parseInt(v, 10))
    .option('--output <path>', 'Write audit report JSON to this file')
    .action(async (sessionId, opts) => {
      const { profile, flags } = getCtx();
      if (opts.churchId) flags.churchId = opts.churchId;

      const client = new OcrApiClient({ profile, flags });
      try {
        const { report: rawReport } = await client.getAnalyzeAuditReport(sessionId, flags.churchId);
        const report = rawReport as AuditReport;
        if (opts.output) {
          fs.writeFileSync(opts.output, JSON.stringify(report, null, 2));
        }
        if (resolveOutputFormat(flags) === 'json') writeJson(report, flags);
        else console.log(JSON.stringify(report.summary, null, 2));
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });
}
