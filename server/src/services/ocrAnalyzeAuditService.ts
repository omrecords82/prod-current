/**
 * Batch directory audit for OCR analyze — recursive scan, issue aggregation,
 * and system-improvement recommendations.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AnalyzeFileResult } from './ocrAnalyzeService';
import type { AnalyzeQualityIssue } from './ocrAnalyzeQualityService';
import { UPLOADS_ROOT } from '../utils/ocrPaths';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']);

export interface CollectedImageFile {
  absolutePath: string;
  relativePath: string;
}

export interface AnalyzeAuditRecommendation {
  priority: 'high' | 'medium' | 'low';
  issue: AnalyzeQualityIssue | 'general';
  affectedFiles: number;
  affectedPct: number;
  recommendation: string;
  suggestedFix: string;
}

export interface AnalyzeAuditSubdirectorySummary {
  path: string;
  fileCount: number;
  passedQuality: number;
  avgQualityScore: number;
  issueCounts: Partial<Record<AnalyzeQualityIssue, number>>;
}

export interface AnalyzeAuditFileEntry {
  id: string;
  relativePath: string;
  originalFilename: string;
  qualityScore?: number;
  qualityIssues?: AnalyzeQualityIssue[];
  autoFixesApplied?: string[];
  needsReview: boolean;
  suggestedRecordType: string;
  ocrConfidence: number;
  recordTypeConfidence: number;
  regionsDetected: number;
  error?: string;
}

export interface AnalyzeAuditReport {
  sessionId: string | null;
  churchId: number;
  generatedAt: string;
  rootPath?: string;
  recursive?: boolean;
  summary: {
    totalFiles: number;
    analyzed: number;
    failed: number;
    passedQuality: number;
    needsReview: number;
    avgQualityScore: number;
    issueCounts: Partial<Record<AnalyzeQualityIssue, number>>;
    autoFixCounts: Record<string, number>;
    recordTypeCounts: Record<string, number>;
    subdirectoryCount: number;
  };
  bySubdirectory: AnalyzeAuditSubdirectorySummary[];
  files: AnalyzeAuditFileEntry[];
  systemRecommendations: AnalyzeAuditRecommendation[];
}

const ISSUE_GUIDANCE: Record<AnalyzeQualityIssue, { recommendation: string; suggestedFix: string }> = {
  image_mostly_black: {
    recommendation: 'Optimized previews are mostly black — likely bad composite splits or gutter crops.',
    suggestedFix: 'Keep split opt-in; prefer validated 2×2 grid for composite photos; rebuild from original.',
  },
  over_cropped: {
    recommendation: 'Border trim removed too much of the record on multiple images.',
    suggestedFix: 'Default batch imports to conservative pipeline (skip border trim) or tune trim thresholds.',
  },
  low_text_detected: {
    recommendation: 'Tesseract found very little text across many files.',
    suggestedFix: 'Improve orientation detection (OSD fallback) and surface rotate controls earlier in the flow.',
  },
  low_ocr_confidence: {
    recommendation: 'OCR confidence is low on a significant share of the batch.',
    suggestedFix: 'Prompt for higher-DPI rescans; add denoise/contrast presets for faded ledger pages.',
  },
  split_regions_suspect: {
    recommendation: 'Auto-detected split regions would produce invalid crops.',
    suggestedFix: 'Disable auto-split by default; add split-region preview overlay before commit.',
  },
  orientation_uncertain: {
    recommendation: 'Orientation could not be determined reliably for multiple files.',
    suggestedFix: 'Run Tesseract OSD before border trim; batch-apply rotation from EXIF + OSD consensus.',
  },
  low_classification_confidence: {
    recommendation: 'Record type classification is uncertain across the directory.',
    suggestedFix: 'Expand keyword catalogs per parish; allow subdirectory-level default record type.',
  },
};

function dirnameOfRelative(relativePath: string): string {
  const dir = path.posix.dirname(relativePath.replace(/\\/g, '/'));
  return dir === '.' ? '' : dir;
}

export function assertAllowedScanPath(churchId: number, requestedPath: string): string {
  if (!requestedPath?.trim()) {
    throw new Error('rootPath is required');
  }
  if (!fs.existsSync(requestedPath)) {
    throw new Error(`Path not found: ${requestedPath}`);
  }
  const resolved = fs.realpathSync(path.resolve(requestedPath));
  const churchRoot = path.join(UPLOADS_ROOT, `om_church_${churchId}`);
  const churchRootReal = fs.existsSync(churchRoot) ? fs.realpathSync(churchRoot) : churchRoot;

  if (!resolved.startsWith(churchRootReal + path.sep) && resolved !== churchRootReal) {
    throw new Error(
      `Path must be under church uploads (${churchRootReal}). Got: ${resolved}`,
    );
  }
  return resolved;
}

export function collectImageFiles(
  rootDir: string,
  recursive = true,
): CollectedImageFile[] {
  const results: CollectedImageFile[] = [];

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (recursive) walk(full);
      } else if (ent.isFile() && IMAGE_EXT.has(path.extname(ent.name).toLowerCase())) {
        results.push({
          absolutePath: full,
          relativePath: path.relative(rootDir, full).replace(/\\/g, '/'),
        });
      }
    }
  };

  walk(rootDir);
  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function emptyIssueCounts(): Partial<Record<AnalyzeQualityIssue, number>> {
  return {};
}

function bumpIssue(
  counts: Partial<Record<AnalyzeQualityIssue, number>>,
  issue: AnalyzeQualityIssue,
): void {
  counts[issue] = (counts[issue] || 0) + 1;
}

export function buildAnalyzeAuditReport(
  churchId: number,
  files: AnalyzeFileResult[],
  options: {
    sessionId?: string | null;
    rootPath?: string;
    recursive?: boolean;
    errors?: Record<string, string>;
  } = {},
): AnalyzeAuditReport {
  const errors = options.errors || {};
  const analyzed = files.length;
  const failed = Object.keys(errors).length;
  const totalFiles = analyzed + failed;

  const issueCounts = emptyIssueCounts();
  const autoFixCounts: Record<string, number> = {};
  const recordTypeCounts: Record<string, number> = {};
  const subdirMap = new Map<string, AnalyzeAuditSubdirectorySummary>();

  let qualitySum = 0;
  let qualityCount = 0;
  let passedQuality = 0;
  let needsReview = 0;

  const entries: AnalyzeAuditFileEntry[] = [];

  for (const f of files) {
    const rel = f.originalFilename.replace(/\\/g, '/');
    const subdir = dirnameOfRelative(rel);

    if (!subdirMap.has(subdir)) {
      subdirMap.set(subdir, {
        path: subdir || '(root)',
        fileCount: 0,
        passedQuality: 0,
        avgQualityScore: 0,
        issueCounts: emptyIssueCounts(),
      });
    }
    const sub = subdirMap.get(subdir)!;
    sub.fileCount += 1;

    if (f.needsReview) needsReview += 1;

    const score = f.qualityScore;
    if (typeof score === 'number') {
      qualitySum += score;
      qualityCount += 1;
      sub.avgQualityScore += score;
      if (score >= 0.55 && !(f.qualityIssues || []).includes('image_mostly_black')) {
        passedQuality += 1;
        sub.passedQuality += 1;
      }
    }

    recordTypeCounts[f.suggestedRecordType] = (recordTypeCounts[f.suggestedRecordType] || 0) + 1;

    for (const issue of f.qualityIssues || []) {
      bumpIssue(issueCounts, issue);
      bumpIssue(sub.issueCounts, issue);
    }
    for (const fix of f.autoFixesApplied || []) {
      autoFixCounts[fix] = (autoFixCounts[fix] || 0) + 1;
    }

    entries.push({
      id: f.id,
      relativePath: rel,
      originalFilename: f.originalFilename,
      qualityScore: f.qualityScore,
      qualityIssues: f.qualityIssues,
      autoFixesApplied: f.autoFixesApplied,
      needsReview: f.needsReview,
      suggestedRecordType: f.suggestedRecordType,
      ocrConfidence: f.ocrConfidence,
      recordTypeConfidence: f.recordTypeConfidence,
      regionsDetected: f.regionsDetected,
    });
  }

  for (const [relPath, message] of Object.entries(errors)) {
    const subdir = dirnameOfRelative(relPath);
    if (!subdirMap.has(subdir)) {
      subdirMap.set(subdir, {
        path: subdir || '(root)',
        fileCount: 0,
        passedQuality: 0,
        avgQualityScore: 0,
        issueCounts: emptyIssueCounts(),
      });
    }
    subdirMap.get(subdir)!.fileCount += 1;
    entries.push({
      id: `err_${crypto.randomBytes(4).toString('hex')}`,
      relativePath: relPath,
      originalFilename: relPath,
      needsReview: true,
      suggestedRecordType: 'unknown',
      ocrConfidence: 0,
      recordTypeConfidence: 0,
      regionsDetected: 0,
      error: message,
    });
  }

  const bySubdirectory = [...subdirMap.values()]
    .map((s) => ({
      ...s,
      avgQualityScore: s.fileCount > 0 ? Math.round((s.avgQualityScore / s.fileCount) * 1000) / 1000 : 0,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const systemRecommendations = buildSystemRecommendations(issueCounts, analyzed, needsReview, autoFixCounts);

  return {
    sessionId: options.sessionId ?? null,
    churchId,
    generatedAt: new Date().toISOString(),
    rootPath: options.rootPath,
    recursive: options.recursive,
    summary: {
      totalFiles,
      analyzed,
      failed,
      passedQuality,
      needsReview,
      avgQualityScore: qualityCount > 0 ? Math.round((qualitySum / qualityCount) * 1000) / 1000 : 0,
      issueCounts,
      autoFixCounts,
      recordTypeCounts,
      subdirectoryCount: subdirMap.size,
    },
    bySubdirectory,
    files: entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    systemRecommendations,
  };
}

function buildSystemRecommendations(
  issueCounts: Partial<Record<AnalyzeQualityIssue, number>>,
  analyzed: number,
  needsReview: number,
  autoFixCounts: Record<string, number>,
): AnalyzeAuditRecommendation[] {
  const recs: AnalyzeAuditRecommendation[] = [];

  if (analyzed === 0) return recs;

  for (const [issue, guidance] of Object.entries(ISSUE_GUIDANCE) as Array<
    [AnalyzeQualityIssue, { recommendation: string; suggestedFix: string }]
  >) {
    const affected = issueCounts[issue] || 0;
    if (affected === 0) continue;
    const affectedPct = Math.round((affected / analyzed) * 1000) / 10;
    let priority: AnalyzeAuditRecommendation['priority'] = 'low';
    if (affectedPct >= 25 || affected >= 10) priority = 'high';
    else if (affectedPct >= 10 || affected >= 3) priority = 'medium';

    recs.push({
      priority,
      issue,
      affectedFiles: affected,
      affectedPct,
      recommendation: guidance.recommendation,
      suggestedFix: guidance.suggestedFix,
    });
  }

  if (needsReview > 0) {
    const pct = Math.round((needsReview / analyzed) * 1000) / 10;
    if (pct >= 30) {
      recs.push({
        priority: 'high',
        issue: 'general',
        affectedFiles: needsReview,
        affectedPct: pct,
        recommendation: 'A large share of the directory needs manual review before upload.',
        suggestedFix: 'Review flagged rows in Analyze Records; fix orientation and record type before commit.',
      });
    }
  }

  const autoFixTotal = Object.values(autoFixCounts).reduce((a, b) => a + b, 0);
  if (autoFixTotal >= 3) {
    recs.push({
      priority: 'medium',
      issue: 'general',
      affectedFiles: autoFixTotal,
      affectedPct: Math.round((autoFixTotal / analyzed) * 1000) / 10,
      recommendation: 'Auto-fix retries fired frequently — preprocessing defaults may be too aggressive.',
      suggestedFix: 'Consider conservative pipeline as default for directory imports; log fix outcomes for tuning.',
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export async function scanDirectoryAndAnalyze(
  churchId: number,
  rootPath: string,
  options: { recursive?: boolean; maxFiles?: number; sessionId?: string | null } = {},
): Promise<AnalyzeAuditReport> {
  const recursive = options.recursive !== false;
  const maxFiles = options.maxFiles ?? 500;
  const resolvedRoot = assertAllowedScanPath(churchId, rootPath);

  const {
    createAnalyzeSession,
    analyzeImageFile,
    loadAnalyzeSession,
    saveAnalyzeSession,
  } = require('./ocrAnalyzeService') as typeof import('./ocrAnalyzeService');

  const collected = collectImageFiles(resolvedRoot, recursive);
  if (!collected.length) {
    throw new Error(`No image files found under ${resolvedRoot}`);
  }
  if (collected.length > maxFiles) {
    throw new Error(`Directory contains ${collected.length} images (max ${maxFiles}). Narrow the path or raise maxFiles.`);
  }

  let sessionId = String(options.sessionId || '').trim();
  let manifest = sessionId ? loadAnalyzeSession(churchId, sessionId) : null;
  if (!manifest) {
    sessionId = createAnalyzeSession(churchId);
    manifest = loadAnalyzeSession(churchId, sessionId);
  }
  if (!manifest) throw new Error('Failed to create analyze session');

  const results: AnalyzeFileResult[] = [];
  const errors: Record<string, string> = {};

  for (const file of collected) {
    const fileId = `af_${crypto.randomBytes(6).toString('hex')}`;
    try {
      const result = await analyzeImageFile(
        churchId,
        sessionId,
        fileId,
        file.absolutePath,
        file.relativePath,
      );
      manifest.files.push(result);
      results.push(result);
    } catch (e: any) {
      errors[file.relativePath] = e?.message || 'Analyze failed';
    }
  }

  saveAnalyzeSession(manifest);

  return buildAnalyzeAuditReport(churchId, results, {
    sessionId,
    rootPath: resolvedRoot,
    recursive,
    errors,
  });
}

export function getSessionAuditReport(
  churchId: number,
  sessionId: string,
): AnalyzeAuditReport | null {
  const { loadAnalyzeSession } = require('./ocrAnalyzeService') as typeof import('./ocrAnalyzeService');
  const manifest = loadAnalyzeSession(churchId, sessionId);
  if (!manifest) return null;
  return buildAnalyzeAuditReport(churchId, manifest.files, { sessionId });
}
