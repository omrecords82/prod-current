import { Command } from 'commander';
import { CLI_VERSION } from '../types/index.js';
import { registerStatusCommand } from '../commands/status/index.js';
import { registerQueryCommands } from '../commands/query/jobs.js';
import { registerJobCommands } from '../commands/job/index.js';
import { registerProcessCommands } from '../commands/process/index.js';
import { registerTestCommands } from '../commands/test/index.js';
import { registerValidateCommands, registerArtifactsCommands } from '../commands/validate/index.js';
import { registerTemplateCommands } from '../commands/template/index.js';
import { registerConfigCommands, buildConfigContext } from '../commands/config/index.js';
import { registerAnalyzeCommands } from '../commands/analyze/index.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('omocr')
    .description('OrthodoxMetrics OCR Studio CLI — API client for query, process, test, and validate')
    .version(CLI_VERSION, '-V, --version', 'Show version')
    .option('-p, --profile <name>', 'Config profile (see omocr config profiles)')
    .option('--church-id <id>', 'Church ID override', (v) => parseInt(v, 10))
    .option('--json', 'Emit JSON to stdout')
    .option('--ndjson', 'Emit newline-delimited JSON')
    .option('-q, --quiet', 'Suppress stderr messages')
    .option('-v, --verbose', 'Verbose logging to stderr');

  const getCtx = () => {
    const opts = program.opts();
    return buildConfigContext({
      profile: opts.profile,
      churchId: opts.churchId,
      json: opts.json,
      ndjson: opts.ndjson,
      quiet: opts.quiet,
      verbose: opts.verbose,
    });
  };

  registerStatusCommand(program, getCtx);
  registerQueryCommands(program, getCtx);
  registerJobCommands(program, getCtx);
  registerProcessCommands(program, getCtx);
  registerTestCommands(program, getCtx);
  registerValidateCommands(program, getCtx);
  registerArtifactsCommands(program, getCtx);
  registerTemplateCommands(program, getCtx);
  registerConfigCommands(program, getCtx);
  registerAnalyzeCommands(program, getCtx);

  program.showHelpAfterError('(use omocr --help)');
  return program;
}
