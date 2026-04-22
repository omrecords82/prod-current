#!/usr/bin/env tsx

// Package Manager Detection for omtrace
// Auto-detects and adapts to project's package manager (npm, pnpm, yarn, bun)

import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger.js';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface PackageManagerInfo {
  name: PackageManager;
  lockFile: string;
  installCommand: string;
  runCommand: string;
  buildCommand: string;
  typecheckCommand?: string;
  available: boolean;
  version?: string;
}

export interface PackageManagerCommands {
  install: string;
  build: string;
  typecheck?: string;
  test?: string;
}

/**
 * Package Manager Detection and Command Generation
 */
export class PackageManagerDetector {
  private feRoot: string;
  private detectedManager?: PackageManagerInfo;

  constructor(feRoot: string) {
    this.feRoot = feRoot;
  }

  /**
   * Detect the project's package manager
   */
  async detectPackageManager(): Promise<PackageManagerInfo> {
    if (this.detectedManager) {
      return this.detectedManager;
    }

    log.info('Detecting package manager', { feRoot: this.feRoot });

    // Check for lock files (most reliable indicator)
    const lockFileChecks: Array<{ manager: PackageManager; lockFile: string }> = [
      { manager: 'pnpm', lockFile: 'pnpm-lock.yaml' },
      { manager: 'yarn', lockFile: 'yarn.lock' },
      { manager: 'bun', lockFile: 'bun.lockb' },
      { manager: 'npm', lockFile: 'package-lock.json' },
    ];

    for (const { manager, lockFile } of lockFileChecks) {
      const lockPath = path.join(this.feRoot, lockFile);
      if (fs.existsSync(lockPath)) {
        const info = await this.createPackageManagerInfo(manager, lockFile);
        if (info.available) {
          this.detectedManager = info;
          log.info('Package manager detected via lock file', { 
            manager: info.name, 
            lockFile: info.lockFile,
            version: info.version 
          });
          return info;
        }
      }
    }

    // Check package.json scripts for hints
    const packageJsonPath = path.join(this.feRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const detectedFromScripts = this.detectFromPackageJson(packageJson);
        
        if (detectedFromScripts) {
          const info = await this.createPackageManagerInfo(detectedFromScripts, '');
          if (info.available) {
            this.detectedManager = info;
            log.info('Package manager detected via package.json', { 
              manager: info.name,
              version: info.version 
            });
            return info;
          }
        }
      } catch (error) {
        log.warn('Failed to parse package.json', { error });
      }
    }

    // Fallback: check which package managers are available
    const fallbackOrder: PackageManager[] = ['pnpm', 'yarn', 'bun', 'npm'];
    
    for (const manager of fallbackOrder) {
      const info = await this.createPackageManagerInfo(manager, '');
      if (info.available) {
        this.detectedManager = info;
        log.info('Package manager detected via availability check', { 
          manager: info.name,
          version: info.version 
        });
        return info;
      }
    }

    // Ultimate fallback to npm (should always be available in Node.js environments)
    const npmInfo = await this.createPackageManagerInfo('npm', '');
    this.detectedManager = npmInfo;
    log.warn('No package manager detected, falling back to npm', { available: npmInfo.available });
    
    return npmInfo;
  }

  /**
   * Get commands for the detected package manager
   */
  async getCommands(): Promise<PackageManagerCommands> {
    const manager = await this.detectPackageManager();
    
    // Check package.json for custom scripts
    const packageJsonPath = path.join(this.feRoot, 'package.json');
    let customScripts: Record<string, string> = {};
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        customScripts = packageJson.scripts || {};
      } catch (error) {
        log.warn('Failed to read package.json scripts', { error });
      }
    }

    const commands: PackageManagerCommands = {
      install: manager.installCommand,
      build: this.getScriptCommand(manager, customScripts, 'build'),
    };

    // Add typecheck if available
    const typecheckCmd = this.getScriptCommand(manager, customScripts, 'typecheck', 'type-check');
    if (typecheckCmd) {
      commands.typecheck = typecheckCmd;
    }

    // Add test if available
    const testCmd = this.getScriptCommand(manager, customScripts, 'test');
    if (testCmd) {
      commands.test = testCmd;
    }

    log.debug('Generated package manager commands', { manager: manager.name, commands });
    return commands;
  }

  /**
   * Execute a command with the detected package manager
   */
  async executeCommand(
    command: string, 
    options: { 
      cwd?: string; 
      stdio?: 'pipe' | 'inherit'; 
      timeout?: number;
    } = {}
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    const { execSync } = await import('child_process');
    const cwd = options.cwd || this.feRoot;
    const stdio = options.stdio || 'pipe';
    const timeout = options.timeout || 300000; // 5 minutes default

    log.debug('Executing package manager command', { command, cwd, stdio });

    try {
      const output = execSync(command, { 
        cwd, 
        stdio: stdio === 'pipe' ? 'pipe' : 'inherit',
        timeout,
        encoding: 'utf-8'
      });

      return { 
        success: true, 
        output: typeof output === 'string' ? output : undefined 
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      log.warn('Package manager command failed', { command, error: errorMessage });
      
      return { 
        success: false, 
        error: errorMessage,
        output: error.stdout ? error.stdout.toString() : undefined
      };
    }
  }

  /**
   * Check if a package manager is available
   */
  private async checkAvailability(manager: PackageManager): Promise<{ available: boolean; version?: string }> {
    try {
      const { execSync } = await import('child_process');
      const versionOutput = execSync(`${manager} --version`, { 
        stdio: 'pipe', 
        encoding: 'utf-8',
        timeout: 10000 // 10 seconds
      });
      
      return { 
        available: true, 
        version: versionOutput.trim() 
      };
    } catch (error) {
      return { available: false };
    }
  }

  /**
   * Create package manager info object
   */
  private async createPackageManagerInfo(
    manager: PackageManager, 
    lockFile: string
  ): Promise<PackageManagerInfo> {
    const availability = await this.checkAvailability(manager);
    
    const baseInfo = {
      name: manager,
      lockFile,
      available: availability.available,
      version: availability.version,
    };

    switch (manager) {
      case 'pnpm':
        return {
          ...baseInfo,
          installCommand: 'pnpm install',
          runCommand: 'pnpm run',
          buildCommand: 'pnpm build',
          typecheckCommand: 'pnpm typecheck',
        };
      
      case 'yarn':
        return {
          ...baseInfo,
          installCommand: 'yarn install',
          runCommand: 'yarn run',
          buildCommand: 'yarn build',
          typecheckCommand: 'yarn typecheck',
        };
      
      case 'bun':
        return {
          ...baseInfo,
          installCommand: 'bun install',
          runCommand: 'bun run',
          buildCommand: 'bun run build',
          typecheckCommand: 'bun run typecheck',
        };
      
      case 'npm':
      default:
        return {
          ...baseInfo,
          installCommand: 'npm install',
          runCommand: 'npm run',
          buildCommand: 'npm run build',
          typecheckCommand: 'npm run typecheck',
        };
    }
  }

  /**
   * Detect package manager from package.json scripts
   */
  private detectFromPackageJson(packageJson: any): PackageManager | null {
    const scripts = packageJson.scripts || {};
    
    // Look for package manager specific patterns in scripts
    const scriptValues = Object.values(scripts).join(' ');
    
    if (scriptValues.includes('pnpm')) return 'pnpm';
    if (scriptValues.includes('yarn')) return 'yarn';
    if (scriptValues.includes('bun')) return 'bun';
    
    // Check for packageManager field (newer standard)
    if (packageJson.packageManager) {
      const pmSpec = packageJson.packageManager.toLowerCase();
      if (pmSpec.includes('pnpm')) return 'pnpm';
      if (pmSpec.includes('yarn')) return 'yarn';
      if (pmSpec.includes('bun')) return 'bun';
    }
    
    return null;
  }

  /**
   * Get script command with fallbacks
   */
  private getScriptCommand(
    manager: PackageManagerInfo, 
    scripts: Record<string, string>, 
    ...scriptNames: string[]
  ): string | undefined {
    // Check if any of the script names exist
    for (const scriptName of scriptNames) {
      if (scripts[scriptName]) {
        return `${manager.runCommand} ${scriptName}`;
      }
    }
    
    return undefined;
  }
}

/**
 * Convenience function to get package manager commands
 */
export async function getPackageManagerCommands(feRoot: string): Promise<PackageManagerCommands> {
  const detector = new PackageManagerDetector(feRoot);
  return detector.getCommands();
}

/**
 * Convenience function to execute a command with auto-detected package manager
 */
export async function executeWithPackageManager(
  command: string,
  feRoot: string,
  options?: { stdio?: 'pipe' | 'inherit'; timeout?: number }
): Promise<{ success: boolean; output?: string; error?: string }> {
  const detector = new PackageManagerDetector(feRoot);
  return detector.executeCommand(command, { cwd: feRoot, ...options });
}

/**
 * Get a safe build command that works across package managers
 */
export async function getSafeBuildCommand(feRoot: string): Promise<string> {
  const commands = await getPackageManagerCommands(feRoot);
  return commands.build || 'npm run build';
}

/**
 * Get a safe typecheck command that works across package managers
 */
export async function getSafeTypecheckCommand(feRoot: string): Promise<string | null> {
  const commands = await getPackageManagerCommands(feRoot);
  return commands.typecheck || null;
}
