/**
 * Pre-upload OCR analyze — local preprocessing, Tesseract OCR, type/layout classification.
 * No OCR jobs created until the user commits the analyze session.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { classifyLayout, classifyRecordType } from '../utils/ocrClassifier';
import { detectAndRemoveBorder } from '../ocr/preprocessing/borderDetection';
import { detectAndCorrectSkew } from '../ocr/preprocessing/deskew';
import { gridPreserveDenoise } from '../ocr/preprocessing/denoise';
import { detectAndCorrectOrientation } from '../ocr/preprocessing/orientation';
import {
  cropRecordRegions,
  detectSeparateRecordRegions,
  type PixelBBox,
} from '../ocr/preprocessing/multiRecordSplit';
import { getOcrUploadDir, UPLOADS_ROOT } from '../utils/ocrPaths';

const { getAllLayouts } = require('./ocrLayoutCatalogService') as {
  getAllLayouts: () => Array<{
    id: string;
    record_type: string;
    title: string;
    description: string;
    extraction_mode: string;
  }>;
};

export type AnalyzeRecordType = 'baptism' | 'marriage' | 'funeral' | 'custom' | 'unknown';
export type AnalyzeLayoutType = 'tabular' | 'form' | 'narrative';

export interface AnalyzeRegion {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnalyzeFileResult {
  id: string;
  originalFilename: string;
  suggestedRecordType: AnalyzeRecordType;
  recordTypeConfidence: number;
  keywordHits: Record<string, string[]>;
  detectedLayoutType: AnalyzeLayoutType;
  layoutConfidence: number;
  layoutSignals: Record<string, number>;
  matchedCatalogLayoutId: string | null;
  matchedCatalogLayoutTitle: string | null;
  catalogMatchConfidence: number;
  regionsDetected: number;
  regions: AnalyzeRegion[];
  shouldSplit: boolean;
  optimizationsApplied: string[];
  warnings: string[];
  ocrTextPreview: string;
  ocrConfidence: number;
  imageWidth: number;
  imageHeight: number;
  needsReview: boolean;
}

export interface AnalyzeSessionManifest {
  sessionId: string;
  churchId: number;
  createdAt: string;
  files: AnalyzeFileResult[];
}

function getAnalyzeRoot(churchId: number): string {
  const dir = path.join(UPLOADS_ROOT, `om_church_${churchId}`, 'analyze');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getAnalyzeSessionDir(churchId: number, sessionId: string): string {
  const dir = path.join(getAnalyzeRoot(churchId), sessionId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function layoutTypeToExtractionModes(layoutType: AnalyzeLayoutType): string[] {
  if (layoutType === 'tabular') return ['tabular'];
  if (layoutType === 'narrative') return ['narrative_block'];
  return ['form', 'multi_form'];
}

function matchCatalogLayout(
  recordType: AnalyzeRecordType,
  layoutType: AnalyzeLayoutType,
  ocrText: string,
): { layoutId: string | null; title: string | null; confidence: number } {
  if (recordType === 'unknown' || recordType === 'custom') {
    return { layoutId: null, title: null, confidence: 0 };
  }
  const modes = layoutTypeToExtractionModes(layoutType);
  const textLower = ocrText.toLowerCase();
  const layouts = getAllLayouts().filter(
    (l) => l.record_type === recordType && modes.includes(l.extraction_mode),
  );
  if (!layouts.length) return { layoutId: null, title: null, confidence: 0 };

  let best: { layoutId: string; title: string; score: number } | null = null;
  for (const layout of layouts) {
    let score = 0.55;
    const titleTokens = layout.title.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
    for (const token of titleTokens) {
      if (textLower.includes(token)) score += 0.04;
    }
    if (layout.extraction_mode === 'tabular' && /\b(number|date|name)\b/i.test(ocrText)) score += 0.05;
    if (layout.extraction_mode === 'form' && /parish\s+record|certificate/i.test(ocrText)) score += 0.08;
    if (layout.extraction_mode === 'narrative_block' && /\bno\.?\s*\d+\b/i.test(ocrText)) score += 0.05;
    if (!best || score > best.score) {
      best = { layoutId: layout.id, title: layout.title, score: Math.min(score, 0.95) };
    }
  }
  return best
    ? { layoutId: best.layoutId, title: best.title, confidence: Math.round(best.score * 1000) / 1000 }
    : { layoutId: null, title: null, confidence: 0 };
}

function tesseractWordsToVisionPages(
  words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>,
  imgW: number,
  imgH: number,
): any[] {
  const visionWords = words
    .filter((w) => w.text?.trim())
    .map((w) => ({
      text: w.text,
      boundingBox: {
        vertices: [
          { x: w.bbox.x0, y: w.bbox.y0 },
          { x: w.bbox.x1, y: w.bbox.y0 },
          { x: w.bbox.x1, y: w.bbox.y1 },
          { x: w.bbox.x0, y: w.bbox.y1 },
        ],
      },
    }));
  return [{
    width: imgW,
    height: imgH,
    blocks: [{
      paragraphs: [{ words: visionWords }],
    }],
  }];
}

async function runTesseractOcr(imagePath: string): Promise<{
  text: string;
  confidence: number;
  words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>;
}> {
  const { createWorker } = require('tesseract.js');
  const worker = await createWorker('eng+ell+rus', 1, {
    logger: () => {},
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '3',
      preserve_interword_spaces: '1',
    });
    const { data } = await worker.recognize(imagePath);
    const words = (data.words || [])
      .filter((w: any) => w.text?.trim())
      .map((w: any) => ({
        text: String(w.text),
        bbox: {
          x0: w.bbox.x0,
          y0: w.bbox.y0,
          x1: w.bbox.x1,
          y1: w.bbox.y1,
        },
      }));
    let confSum = 0;
    let confN = 0;
    for (const w of data.words || []) {
      if (w.confidence > 0) {
        confSum += w.confidence;
        confN += 1;
      }
    }
    const confidence = confN > 0 ? confSum / confN / 100 : (data.confidence || 0) / 100;
    return {
      text: String(data.text || '').trim(),
      confidence: Math.max(0, Math.min(1, confidence)),
      words,
    };
  } finally {
    await worker.terminate();
  }
}

async function optimizeImage(
  inputPath: string,
  outputPath: string,
): Promise<{ applied: string[]; warnings: string[]; width: number; height: number }> {
  const applied: string[] = [];
  const warnings: string[] = [];
  let buffer: Buffer = Buffer.from(fs.readFileSync(inputPath));

  try {
    const border = await detectAndRemoveBorder(buffer);
    if (border.applied && border.croppedBuffer) {
      buffer = Buffer.from(border.croppedBuffer);
      applied.push('border_trim');
    }
  } catch (e: any) {
    warnings.push(`Border trim skipped: ${e.message}`);
  }

  try {
    const orient = await detectAndCorrectOrientation(buffer);
    if (orient.applied && orient.correctedBuffer) {
      buffer = Buffer.from(orient.correctedBuffer);
      applied.push('auto_rotate');
    }
  } catch (e: any) {
    warnings.push(`Orientation check skipped: ${e.message}`);
  }

  try {
    const deskew = await detectAndCorrectSkew(buffer);
    if (deskew.applied && deskew.deskewedBuffer) {
      buffer = Buffer.from(deskew.deskewedBuffer);
      applied.push('deskew');
    }
  } catch (e: any) {
    warnings.push(`Deskew skipped: ${e.message}`);
  }

  try {
    const denoise = await gridPreserveDenoise(buffer);
    if (denoise.applied && denoise.denoisedBuffer) {
      buffer = Buffer.from(denoise.denoisedBuffer);
      applied.push('denoise');
    }
  } catch (e: any) {
    warnings.push(`Denoise skipped: ${e.message}`);
  }

  const meta = await sharp(buffer).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  if (width < 800 || height < 600) {
    warnings.push('Low resolution — 300 DPI scans improve classification accuracy.');
  }

  await sharp(buffer).jpeg({ quality: 92 }).toFile(outputPath);
  if (!applied.length) applied.push('normalize');

  return { applied, warnings, width, height };
}

function regionsToAnalyzeRegions(regions: PixelBBox[]): AnalyzeRegion[] {
  return regions.map((r, index) => ({
    index,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
  }));
}

export async function analyzeImageFile(
  churchId: number,
  sessionId: string,
  fileId: string,
  sourcePath: string,
  originalFilename: string,
): Promise<AnalyzeFileResult> {
  const fileDir = path.join(getAnalyzeSessionDir(churchId, sessionId), fileId);
  fs.mkdirSync(fileDir, { recursive: true });

  const originalCopy = path.join(fileDir, 'original' + path.extname(originalFilename).toLowerCase() || '.jpg');
  fs.copyFileSync(sourcePath, originalCopy);

  const optimizedPath = path.join(fileDir, 'optimized.jpg');
  const { applied, warnings, width, height } = await optimizeImage(originalCopy, optimizedPath);

  let regions: PixelBBox[] = [];
  try {
    regions = await detectSeparateRecordRegions(optimizedPath);
  } catch (e: any) {
    warnings.push(`Region detection skipped: ${e.message}`);
  }

  const ocr = await runTesseractOcr(optimizedPath);
  if (ocr.text.length < 40) {
    warnings.push('Very little text detected — record type may need manual selection.');
  }
  if (ocr.confidence < 0.35) {
    warnings.push('Low OCR confidence — consider rescanning at higher DPI.');
  }

  const classResult = classifyRecordType(ocr.text);
  const suggestedType = (classResult.suggested_type === 'unknown'
    ? 'custom'
    : classResult.suggested_type) as AnalyzeRecordType;

  let layoutType: AnalyzeLayoutType = 'form';
  let layoutConfidence = 0.4;
  let layoutSignals: Record<string, number> = {};
  if (ocr.words.length > 0) {
    const visionPages = tesseractWordsToVisionPages(ocr.words, width, height);
    const layoutResult = classifyLayout(visionPages, ocr.text);
    layoutType = layoutResult.detectedLayoutType;
    layoutConfidence = layoutResult.layoutConfidence;
    layoutSignals = layoutResult.classificationSignals as Record<string, number>;
  }

  const catalog = matchCatalogLayout(suggestedType, layoutType, ocr.text);
  const shouldSplit = regions.length > 1 && regions.length <= 8;

  const needsReview = classResult.confidence < 0.45
    || layoutConfidence < 0.45
    || ocr.confidence < 0.35
    || (shouldSplit && classResult.suggested_type === 'unknown');

  const result: AnalyzeFileResult = {
    id: fileId,
    originalFilename,
    suggestedRecordType: suggestedType,
    recordTypeConfidence: classResult.confidence,
    keywordHits: classResult.keyword_hits,
    detectedLayoutType: layoutType,
    layoutConfidence,
    layoutSignals,
    matchedCatalogLayoutId: catalog.layoutId,
    matchedCatalogLayoutTitle: catalog.title,
    catalogMatchConfidence: catalog.confidence,
    regionsDetected: regions.length,
    regions: regionsToAnalyzeRegions(regions),
    shouldSplit,
    optimizationsApplied: applied,
    warnings,
    ocrTextPreview: ocr.text.slice(0, 400),
    ocrConfidence: Math.round(ocr.confidence * 1000) / 1000,
    imageWidth: width,
    imageHeight: height,
    needsReview,
  };

  fs.writeFileSync(path.join(fileDir, 'result.json'), JSON.stringify(result, null, 2));
  return result;
}

export function createAnalyzeSession(churchId: number): string {
  const sessionId = `as_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const dir = getAnalyzeSessionDir(churchId, sessionId);
  const manifest: AnalyzeSessionManifest = {
    sessionId,
    churchId,
    createdAt: new Date().toISOString(),
    files: [],
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return sessionId;
}

export function loadAnalyzeSession(churchId: number, sessionId: string): AnalyzeSessionManifest | null {
  const manifestPath = path.join(getAnalyzeSessionDir(churchId, sessionId), 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

export function saveAnalyzeSession(manifest: AnalyzeSessionManifest): void {
  const dir = getAnalyzeSessionDir(manifest.churchId, manifest.sessionId);
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

export function getAnalyzePreviewPath(
  churchId: number,
  sessionId: string,
  fileId: string,
  variant: 'optimized' | 'original',
): string | null {
  const fileDir = path.join(getAnalyzeSessionDir(churchId, sessionId), fileId);
  if (variant === 'optimized') {
    const p = path.join(fileDir, 'optimized.jpg');
    return fs.existsSync(p) ? p : null;
  }
  const entries = fs.readdirSync(fileDir).filter((f) => f.startsWith('original'));
  if (!entries.length) return null;
  return path.join(fileDir, entries[0]);
}

export interface AnalyzeCommitItem {
  fileId: string;
  recordType: string;
  recordLayoutMode?: string;
  splitRegions?: boolean;
  language?: string;
}

export async function commitAnalyzeSession(
  churchId: number,
  sessionId: string,
  items: AnalyzeCommitItem[],
  uploadedBy: number | null,
): Promise<{ jobs: Array<{ id: number; filename: string }> }> {
  const manifest = loadAnalyzeSession(churchId, sessionId);
  if (!manifest) throw new Error('Analyze session not found');

  const { promisePool: platformPool, assertTenantOcrTablesExist } = require('../config/db');
  await assertTenantOcrTablesExist(churchId);
  const tenantPool = require('../config/db').getTenantPool(churchId);

  const uploadDir = getOcrUploadDir(churchId);
  const {
    normalizeRecordLayoutMode,
    buildPerSplitLayoutClassification,
    buildSplitLayoutClassification,
  } = require('./ocrMultiRecordUploadService');

  const createdJobs: Array<{ id: number; filename: string }> = [];
  const validTypes = ['baptism', 'marriage', 'funeral', 'custom'];

  try {
    await platformPool.query(`ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS classifier_suggested_type VARCHAR(32) NULL`);
    await platformPool.query(`ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS classifier_confidence DECIMAL(5,4) NULL`);
    await platformPool.query(`ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS layout_classification_json TEXT NULL`);
    await platformPool.query(`ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS batch_id VARCHAR(64) NULL`);
  } catch {
    /* columns may exist */
  }

  for (const item of items) {
    const fileResult = manifest.files.find((f) => f.id === item.fileId);
    if (!fileResult) continue;

    const optimizedPath = getAnalyzePreviewPath(churchId, sessionId, item.fileId, 'optimized');
    if (!optimizedPath) continue;

    const recordType = validTypes.includes(item.recordType) ? item.recordType : fileResult.suggestedRecordType;
    const language = item.language || 'en';
    const layoutMode = normalizeRecordLayoutMode(item.recordLayoutMode || 'auto');
    const timestamp = Date.now();
    const baseName = path.basename(fileResult.originalFilename, path.extname(fileResult.originalFilename));
    const ext = '.jpg';

    const layoutClassification = {
      detectedLayoutType: fileResult.detectedLayoutType,
      layoutConfidence: fileResult.layoutConfidence,
      matchedCatalogLayoutId: fileResult.matchedCatalogLayoutId,
      analyzeSessionId: sessionId,
      analyzeFileId: item.fileId,
      userOverridden: item.recordType !== fileResult.suggestedRecordType,
    };

    const doSplit = !!item.splitRegions && fileResult.shouldSplit && fileResult.regions.length > 1;
    let paths: string[] = [optimizedPath];
    let filenames: string[] = [`${baseName}_analyzed_${timestamp}${ext}`];
    let batchId: string | null = null;

    if (doSplit) {
      batchId = `asplit_${timestamp}_${crypto.randomBytes(3).toString('hex')}`;
      const regions = fileResult.regions.map((r) => ({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      }));
      paths = await cropRecordRegions(optimizedPath, regions, uploadDir, `${baseName}_${timestamp}`, ext);
      filenames = paths.map((p) => path.basename(p));
    } else {
      const dest = path.join(uploadDir, filenames[0]);
      fs.copyFileSync(optimizedPath, dest);
      paths = [dest];
    }

    let uploadLayoutTemplateId: number | null = null;
    if (recordType !== 'custom') {
      try {
        const onboardingLayoutExtractor = require('./onboardingLayoutExtractorService');
        await onboardingLayoutExtractor.ensureOnboardingLayoutCandidates(churchId, recordType);
        uploadLayoutTemplateId = await onboardingLayoutExtractor.resolveUploadLayoutTemplateId(churchId, recordType);
      } catch {
        /* non-blocking */
      }
    }

    for (let splitIdx = 0; splitIdx < paths.length; splitIdx += 1) {
      const jobPath = paths[splitIdx];
      const storedFilename = filenames[splitIdx];
      const fileBuffer = fs.readFileSync(jobPath);
      const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const fileStats = fs.statSync(jobPath);

      let layoutJson: string;
      if (doSplit && batchId) {
        layoutJson = JSON.stringify(
          buildPerSplitLayoutClassification(
            layoutMode,
            splitIdx + 1,
            paths.length,
            fileResult.originalFilename,
            batchId,
          ),
        );
      } else {
        layoutJson = JSON.stringify({
          ...buildSplitLayoutClassification(layoutMode, { sourceFilename: fileResult.originalFilename }),
          ...layoutClassification,
        });
      }

      const classifierSuggested = fileResult.suggestedRecordType !== 'custom' && fileResult.suggestedRecordType !== 'unknown'
        ? fileResult.suggestedRecordType
        : null;

      const insertParams: any[] = [
        churchId,
        batchId,
        uploadedBy,
        storedFilename,
        5,
        recordType,
        language,
        classifierSuggested,
        fileResult.recordTypeConfidence,
        layoutJson,
      ];
      let insertSql = `INSERT INTO ocr_jobs (
        church_id, batch_id, uploaded_by, filename, status, priority, review_status,
        record_type, language, classifier_suggested_type, classifier_confidence,
        layout_classification_json, created_at, source_pipeline`;
      if (uploadLayoutTemplateId) {
        insertSql += `, layout_template_id`;
        insertParams.push(uploadLayoutTemplateId);
      }
      insertSql += `) VALUES (?, ?, ?, ?, 'pending', ?, 'uploaded', ?, ?, ?, ?, ?, NOW(), 'analyze'`;
      if (uploadLayoutTemplateId) insertSql += `, ?`;
      insertSql += `)`;

      const [result] = await platformPool.query(insertSql, insertParams);
      const jobId = (result as any).insertId;

      const [pageResult] = await tenantPool.query(
        `INSERT INTO ocr_feeder_pages (job_id, page_index, status, input_path, created_at, updated_at)
         VALUES (?, 0, 'queued', ?, NOW(), NOW())`,
        [jobId, jobPath],
      );
      const pageId = (pageResult as any).insertId;

      await tenantPool.query(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type, created_at)
         VALUES (?, 'source_image', ?, ?, ?, ?, ?, NOW())`,
        [
          pageId,
          jobPath,
          JSON.stringify({
            original_filename: fileResult.originalFilename,
            analyze_session_id: sessionId,
            analyze_file_id: item.fileId,
            split_index: doSplit ? splitIdx + 1 : null,
            split_total: doSplit ? paths.length : null,
          }),
          sha256Hash,
          fileStats.size,
          'image/jpeg',
        ],
      );

      createdJobs.push({ id: jobId, filename: storedFilename });
    }
  }

  return { jobs: createdJobs };
}

export function deleteAnalyzeSession(churchId: number, sessionId: string): void {
  const dir = path.join(getAnalyzeRoot(churchId), sessionId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
