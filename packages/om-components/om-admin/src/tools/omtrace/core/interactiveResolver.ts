#!/usr/bin/env tsx

// Interactive Ambiguity Resolution for omtrace
// Provides user-friendly selection when multiple candidates are found

import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger.js';
import type { Candidate } from './types.js';

export interface InteractiveOptions {
  enabled: boolean;
  maxCandidates: number;
  showPreview: boolean;
  rememberChoices: boolean;
}

export interface CandidatePreview {
  candidate: Candidate;
  preview: string;
  context: string;
  lastModified: string;
}

export interface UserChoice {
  selectedIndex: number;
  remember: boolean;
}

/**
 * Interactive Resolver for handling ambiguous file matches
 */
export class InteractiveResolver {
  private feRoot: string;
  private options: InteractiveOptions;
  private choiceCache: Map<string, number> = new Map();
  private cacheFile: string;

  constructor(feRoot: string, options: Partial<InteractiveOptions> = {}) {
    this.feRoot = feRoot;
    this.options = {
      enabled: true,
      maxCandidates: 10,
      showPreview: true,
      rememberChoices: true,
      ...options
    };
    this.cacheFile = path.join(feRoot, '.cache', 'omtrace', 'user-choices.json');
    this.loadChoiceCache();
  }

  /**
   * Resolve ambiguous candidates interactively
   */
  async resolveAmbiguity(
    target: string, 
    candidates: Candidate[]
  ): Promise<Candidate | null> {
    if (!this.options.enabled || candidates.length === 0) {
      return null;
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // Check cache for remembered choice
    const cacheKey = this.getCacheKey(target, candidates);
    if (this.options.rememberChoices && this.choiceCache.has(cacheKey)) {
      const cachedIndex = this.choiceCache.get(cacheKey)!;
      if (cachedIndex >= 0 && cachedIndex < candidates.length) {
        log.info('Using remembered choice', { target, selectedPath: candidates[cachedIndex].path });
        return candidates[cachedIndex];
      }
    }

    // Limit candidates to prevent overwhelming the user
    const limitedCandidates = candidates.slice(0, this.options.maxCandidates);
    
    // Generate previews
    const previews = await this.generatePreviews(limitedCandidates);
    
    // Show interactive selection
    const choice = await this.showInteractiveSelection(target, previews);
    
    if (choice === null) {
      return null;
    }

    const selectedCandidate = limitedCandidates[choice.selectedIndex];

    // Remember choice if requested
    if (choice.remember && this.options.rememberChoices) {
      this.choiceCache.set(cacheKey, choice.selectedIndex);
      await this.saveChoiceCache();
      log.info('Choice remembered for future use', { target, selectedPath: selectedCandidate.path });
    }

    return selectedCandidate;
  }

  /**
   * Show interactive selection prompt
   */
  private async showInteractiveSelection(
    target: string, 
    previews: CandidatePreview[]
  ): Promise<UserChoice | null> {
    console.log(`\n🔍 Multiple candidates found for: ${target}`);
    console.log('━'.repeat(60));

    // Display candidates with previews
    previews.forEach((preview, index) => {
      const num = (index + 1).toString().padStart(2, ' ');
      const pathDisplay = this.formatPath(preview.candidate.path);
      const score = `(score: ${preview.candidate.score})`;
      
      console.log(`${num}. ${pathDisplay} ${score}`);
      
      if (this.options.showPreview && preview.preview) {
        console.log(`    ${preview.context}`);
        console.log(`    Modified: ${preview.lastModified}`);
        if (preview.preview.trim()) {
          console.log(`    Preview: ${preview.preview}`);
        }
      }
      console.log('');
    });

    // Show options
    console.log('Options:');
    console.log('  1-' + previews.length + ': Select candidate');
    console.log('  0: Cancel (no selection)');
    console.log('  r: Remember choice for future use');
    console.log('');

    // Get user input
    const choice = await this.getUserInput('Enter your choice: ');
    
    if (choice === '0' || choice.toLowerCase() === 'cancel') {
      return null;
    }

    // Parse choice
    const remember = choice.toLowerCase().includes('r');
    const numMatch = choice.match(/(\d+)/);
    
    if (!numMatch) {
      console.log('❌ Invalid choice. Please enter a number.');
      return this.showInteractiveSelection(target, previews);
    }

    const selectedIndex = parseInt(numMatch[1]) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= previews.length) {
      console.log('❌ Invalid selection. Please choose a number between 1 and ' + previews.length);
      return this.showInteractiveSelection(target, previews);
    }

    return { selectedIndex, remember };
  }

  /**
   * Generate previews for candidates
   */
  private async generatePreviews(candidates: Candidate[]): Promise<CandidatePreview[]> {
    const previews: CandidatePreview[] = [];

    for (const candidate of candidates) {
      const fullPath = path.join(this.feRoot, candidate.path);
      let preview = '';
      let context = '';
      let lastModified = '';

      try {
        // Get file stats
        const stats = fs.statSync(fullPath);
        lastModified = stats.mtime.toLocaleDateString();

        // Generate context (directory structure)
        const pathParts = candidate.path.split('/');
        context = pathParts.slice(-3, -1).join('/') || 'root';

        // Generate preview (first few lines of file)
        if (this.options.showPreview) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n').slice(0, 3);
          
          // Find the most relevant line (export, class, function, etc.)
          const relevantLine = lines.find(line => 
            line.includes('export') || 
            line.includes('class') || 
            line.includes('function') ||
            line.includes('const') ||
            line.includes('interface')
          );
          
          preview = relevantLine ? relevantLine.trim() : lines[0]?.trim() || '';
          
          // Truncate if too long
          if (preview.length > 80) {
            preview = preview.substring(0, 77) + '...';
          }
        }
      } catch (error) {
        context = 'Error reading file';
        preview = '';
        lastModified = 'Unknown';
      }

      previews.push({
        candidate,
        preview,
        context,
        lastModified
      });
    }

    return previews;
  }

  /**
   * Get user input from stdin
   */
  private async getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      process.stdout.write(prompt);
      
      const stdin = process.stdin;
      stdin.setRawMode(false);
      stdin.resume();
      stdin.setEncoding('utf8');
      
      const onData = (data: string) => {
        stdin.removeListener('data', onData);
        stdin.pause();
        resolve(data.toString().trim());
      };
      
      stdin.on('data', onData);
    });
  }

  /**
   * Format path for display
   */
  private formatPath(filePath: string): string {
    // Highlight the filename
    const parts = filePath.split('/');
    const filename = parts.pop() || '';
    const dir = parts.join('/');
    
    if (dir) {
      return `${dir}/${filename}`;
    }
    return filename;
  }

  /**
   * Generate cache key for target and candidates
   */
  private getCacheKey(target: string, candidates: Candidate[]): string {
    // Create a stable key based on target and candidate paths
    const candidatePaths = candidates.map(c => c.path).sort().join('|');
    return `${target}:${candidatePaths}`;
  }

  /**
   * Load choice cache from disk
   */
  private loadChoiceCache(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        const parsed = JSON.parse(data);
        this.choiceCache = new Map(Object.entries(parsed));
        log.debug('Loaded user choice cache', { entries: this.choiceCache.size });
      }
    } catch (error) {
      log.warn('Failed to load choice cache', { error });
      this.choiceCache = new Map();
    }
  }

  /**
   * Save choice cache to disk
   */
  private async saveChoiceCache(): Promise<void> {
    try {
      // Ensure cache directory exists
      const cacheDir = path.dirname(this.cacheFile);
      fs.mkdirSync(cacheDir, { recursive: true });

      // Convert Map to object for JSON serialization
      const cacheObject = Object.fromEntries(this.choiceCache);
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheObject, null, 2));
      
      log.debug('Saved user choice cache', { entries: this.choiceCache.size });
    } catch (error) {
      log.warn('Failed to save choice cache', { error });
    }
  }

  /**
   * Clear choice cache
   */
  async clearCache(): Promise<void> {
    this.choiceCache.clear();
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
      }
      log.info('User choice cache cleared');
    } catch (error) {
      log.warn('Failed to clear choice cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; file: string; exists: boolean } {
    return {
      entries: this.choiceCache.size,
      file: this.cacheFile,
      exists: fs.existsSync(this.cacheFile)
    };
  }
}

/**
 * Convenience function for interactive resolution
 */
export async function resolveInteractively(
  target: string,
  candidates: Candidate[],
  feRoot: string,
  options?: Partial<InteractiveOptions>
): Promise<Candidate | null> {
  const resolver = new InteractiveResolver(feRoot, options);
  return resolver.resolveAmbiguity(target, candidates);
}

/**
 * Check if interactive mode should be enabled
 */
export function shouldUseInteractiveMode(): boolean {
  // Disable in CI environments
  if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
    return false;
  }

  // Disable if not in a TTY (e.g., piped output)
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  // Check for explicit disable flag
  if (process.env.OMTRACE_NO_INTERACTIVE === '1') {
    return false;
  }

  return true;
}
