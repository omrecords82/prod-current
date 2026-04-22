// Candidate resolver system for OMTRACE

import * as path from 'path';
import * as fs from 'fs';
import { DepsIndex, Candidate, ResolverError, AmbiguousTargetError } from './types.js';
import { log } from './logger.js';

export interface ResolveOptions {
  pickFirst?: boolean;
  maxCandidates?: number;
}

/**
 * Resolve a target to a list of candidates with deterministic scoring
 */
export function resolveCandidates(
  target: string,
  index: DepsIndex,
  options: ResolveOptions = {}
): Candidate[] {
  const { pickFirst = false, maxCandidates = 10 } = options;
  
  log.debug('Resolving candidates', { target, pickFirst, maxCandidates });

  // Extract candidate key (basename without extension)
  const candidateKey = path.basename(target, path.extname(target));
  
  // Check for exact filename match first (highest priority)
  const exactFilenameMatch = index.nodes.find(node => 
    node.id.endsWith(target) || 
    node.id.endsWith(target + '.tsx') || 
    node.id.endsWith(target + '.ts')
  );
  
  if (exactFilenameMatch) {
    return [{
      path: exactFilenameMatch.id,
      score: 20000, // Highest possible score
      reason: 'exact filename match',
      mtime: exactFilenameMatch.mtime || 0,
    }];
  }
  
  // Find all matching candidates
  const candidates: Candidate[] = [];
  
  for (const node of index.nodes) {
    const score = calculateScore(node, candidateKey, target);
    if (score > 0) {
      candidates.push({
        path: node.id,
        score,
        reason: getScoreReason(score, node, candidateKey),
        mtime: node.mtime || 0,
      });
    }
  }

  // Sort by score (highest first), then by path length, then by mtime
  candidates.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    if (a.path.length !== b.path.length) {
      return a.path.length - b.path.length;
    }
    return b.mtime - a.mtime;
  });

  // Limit results
  const limitedCandidates = candidates.slice(0, maxCandidates);
  
  log.debug('Resolved candidates', { 
    target, 
    total: candidates.length, 
    limited: limitedCandidates.length 
  });

  // Handle ambiguity
  if (limitedCandidates.length > 1 && !pickFirst) {
    const topCandidates = limitedCandidates.slice(0, 5);
    throw new AmbiguousTargetError(`Multiple candidates found for target: ${target}. Candidates: ${topCandidates.map(c => c.path).join(', ')}`);
  }

  // Return top candidate or empty array
  return limitedCandidates.length > 0 ? [limitedCandidates[0]] : [];
}

/**
 * Calculate score for a candidate based on multiple factors
 */
function calculateScore(
  node: DepsIndex['nodes'][0],
  candidateKey: string,
  originalTarget: string
): number {
  let score = 0;
  const nodePath = node.id;
  const nodeBasename = path.basename(nodePath, path.extname(nodePath));

  // Exact basename match (highest priority)
  if (nodeBasename === candidateKey) {
    score += 10000; // Much higher priority for exact matches
  }

  // Partial basename match (much lower priority)
  if (nodeBasename.includes(candidateKey) || candidateKey.includes(nodeBasename)) {
    score += 50; // Reduced from 500 to 50
  }

  // Path segment matches
  const targetSegments = originalTarget.split('/');
  const nodeSegments = nodePath.split('/');
  
  for (const segment of targetSegments) {
    if (nodeSegments.includes(segment)) {
      score += 100;
    }
  }

  // Boost for components directory
  if (nodePath.includes('/components/')) {
    score += 200;
  }

  // Boost for specific domains
  const domainBoosts: { [key: string]: number } = {
    'church': 150,
    'user': 150,
    'record': 150,
    'dashboard': 150,
    'admin': 100,
  };

  for (const [domain, boost] of Object.entries(domainBoosts)) {
    if (nodePath.includes(domain)) {
      score += boost;
      break;
    }
  }

  // Penalty for longer paths (prefer shorter, more specific paths)
  score -= nodeSegments.length * 10;

  // Boost for newer files (prefer recently modified)
  if (node.mtime) {
    const ageHours = (Date.now() - node.mtime) / (1000 * 60 * 60);
    if (ageHours < 24) {
      score += 50; // Boost for files modified in last 24h
    }
  }

  return Math.max(0, score);
}

/**
 * Get human-readable reason for a score
 */
function getScoreReason(score: number, node: DepsIndex['nodes'][0], candidateKey: string): string {
  const reasons: string[] = [];
  const nodeBasename = path.basename(node.id, path.extname(node.id));

  if (nodeBasename === candidateKey) {
    reasons.push('exact basename match');
  } else if (nodeBasename.includes(candidateKey) || candidateKey.includes(nodeBasename)) {
    reasons.push('partial basename match');
  }

  if (node.id.includes('/components/')) {
    reasons.push('in components directory');
  }

  if (node.id.includes('/admin/')) {
    reasons.push('admin component');
  }

  if (reasons.length === 0) {
    reasons.push('path similarity');
  }

  return reasons.join(', ');
}

/**
 * Resolve a single target (throws on ambiguity unless pickFirst)
 */
export function resolveTarget(
  target: string,
  index: DepsIndex,
  options: ResolveOptions = {}
): string {
  const candidates = resolveCandidates(target, index, options);
  
  if (candidates.length === 0) {
    throw new ResolverError(`No matching files found for target: ${target}`);
  }

  return candidates[0].path;
}

/**
 * Check if a target is ambiguous
 */
export function isAmbiguous(
  target: string,
  index: DepsIndex
): boolean {
  try {
    resolveCandidates(target, index, { pickFirst: false });
    return false;
  } catch (error) {
    return error instanceof AmbiguousTargetError;
  }
}
