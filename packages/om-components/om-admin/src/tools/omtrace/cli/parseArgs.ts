import * as fs from 'fs';
import * as path from 'path';
import { OMTRACEError } from '../core/errors.js';
import { EXIT_CODES } from '../core/types.js';
import type { CLIOptions } from './types.js';

/**
 * Show help information
 */
export function showHelp(): void {
  console.log(`
🔍 OMTRACE - Advanced File Dependency & Route Tracer

Usage:
  npx tsx omtrace.ts <filename> [options]
  npx tsx omtrace.ts --build-index
  npx tsx omtrace.ts menu <command> [options]
  npx tsx omtrace.ts delete <target> [options]

Core Options:
  <filename>              File to trace (case-insensitive, supports partial names)
  --build-index          Rebuild the file dependency index
  --reverse              Show reverse imports (who uses this file)
  --deep                 Show transitive dependencies
  --show-route           Show route and menu references for the component
  --refactor             Show refactor recommendations for duplicate components
  --rename-legacy        Rename legacy files when refactoring
  --json                 Output in JSON format
  --verbose              Enable verbose logging
  --help, -h            Show this help message

Delete Options:
  delete <target>        Auto-delete component/page and patch all references
  --dry-run              Preview deletion plan without applying changes

Interactive Options:
  --interactive          Force interactive mode for ambiguous targets
  --no-interactive       Disable interactive mode (use in CI/scripts)
  --clear-cache          Clear remembered user choices

Menu Commands:
  menu:list              List all menu items grouped by section
  menu:add               Add a new menu item
  menu:remove            Remove a menu item

Menu Options:
  --menu-label <label>   Menu item label (for add command)
  --menu-path <path>     Menu item path (for add/remove commands)
  --menu-role <role>     Required role for menu access
  --menu-section <section> Menu section (default: tools)
  --menu-hidden          Hide menu item from sidebar

Examples:
  # Basic tracing
  npx tsx omtrace.ts AssignTask.tsx
  npx tsx omtrace.ts AssignTask.tsx --reverse --deep
  npx tsx omtrace.ts AssignTask.tsx --show-route

  # Refactoring
  npx tsx omtrace.ts AssignTask --refactor
  npx tsx omtrace.ts AssignTask --refactor --rename-legacy

  # Auto-deletion
  npx tsx omtrace.ts delete ComponentPalette
  npx tsx omtrace.ts delete src/views/records/BaptismRecordsPage.tsx
  npx tsx omtrace.ts delete ComponentPalette --dry-run

  # Menu management
  npx tsx omtrace.ts menu list
  npx tsx omtrace.ts menu add --menu-label "User Management" --menu-path "/admin/users" --menu-role "admin"
  npx tsx omtrace.ts menu remove --menu-path "/admin/users"

  # Index management
  npx tsx omtrace.ts --build-index

Features:
  • Auto-refreshes stale index (>12 hours old)
  • Extended search scope (front-end + server)
  • Route and menu analysis
  • Duplicate component detection
  • Naming convention enforcement
  • Menu management tools
`);
}

/**
 * Parse command line arguments
 */
export function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  const options: CLIOptions = {
    selftest: false,
    buildIndex: false,
    trace: false,
    refactor: false,
    delete: false,
    dryRun: false,
    yes: false,
    force: false,
    pickFirst: false,
    json: false,
    verbose: false,
    timeout: 300000, // 5 minutes default
    reverse: false,
    deep: false,
    showRoute: false,
    showServer: false,
    renameLegacy: false,
    menuHidden: false,
    interactive: false,
    noInteractive: false,
    clearCache: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      case '--selftest':
        options.selftest = true;
        break;
      case '--build-index':
        options.buildIndex = true;
        break;
      case '--trace':
        options.trace = true;
        break;
      case '--refactor':
        options.refactor = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '-y':
      case '--yes':
        options.yes = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--pick-first':
        options.pickFirst = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i] || '300000', 10);
        break;
      case '--reverse':
        options.reverse = true;
        break;
      case '--deep':
        options.deep = true;
        break;
      case '--show-route':
        options.showRoute = true;
        break;
      case '--show-server':
        options.showServer = true;
        break;
      case '--rename-legacy':
        options.renameLegacy = true;
        break;
      case '--interactive':
        options.interactive = true;
        break;
      case '--no-interactive':
        options.noInteractive = true;
        break;
      case '--clear-cache':
        options.clearCache = true;
        break;
      case '--index-path':
        options.indexPath = args[++i];
        break;
      case '--fe-root':
        options.feRoot = args[++i];
        break;
      case '--menu-label':
        options.menuLabel = args[++i];
        break;
      case '--menu-path':
        options.menuPath = args[++i];
        break;
      case '--menu-role':
        options.menuRole = args[++i];
        break;
      case '--menu-section':
        options.menuSection = args[++i];
        break;
      case '--menu-hidden':
        options.menuHidden = true;
        break;
      default:
        // Check for menu or delete commands
        if (arg === 'menu' && i === 0) {
          const nextArg = args[i + 1];
          if (nextArg === 'list' || nextArg === 'add' || nextArg === 'remove') {
            options.menuCommand = nextArg;
            i++;
          } else if (arg.startsWith('menu:')) {
            options.menuCommand = arg.split(':')[1];
          }
        } else if (arg === 'delete' && i === 0) {
          options.delete = true;
          // Next arg is the delete target
          if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
            options.target = args[++i];
          }
        } else if (arg.startsWith('menu:')) {
          options.menuCommand = arg.split(':')[1];
        } else if (!arg.startsWith('-') && !options.target) {
          options.target = arg;
          // If no explicit mode is set, default to trace mode
          if (!options.selftest && !options.buildIndex && !options.refactor && !options.delete && !options.menuCommand) {
            options.trace = true;
          }
        }
    }
  }

  return options;
}

/**
 * Locate front-end root directory
 */
export function locateFERoot(): string {
  let current = process.cwd();

  while (current !== '/' && current !== '') {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(current, 'package.json'), 'utf-8'));
      if (pkg.scripts?.omtrace) {
        return current;
      }
    }
    current = path.dirname(current);
  }

  throw new OMTRACEError(
    'Could not locate front-end directory (no package.json with omtrace script found)',
    EXIT_CODES.RESOLVER_FAILED
  );
}
