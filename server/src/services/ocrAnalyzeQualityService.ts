/**
 * Analyze-stage quality gates — detect bad crops/splits/OCR and auto-retry
 * from the immutable original before the user commits to OCR.
 */

import fs from 'fs';
import sharp from 'sharp';
import { validateRegionsForCrop, type PixelBBox } from '../ocr/preprocessing/multiRecordSplit';

export type AnalyzeQualityIssue =
  | 'image_mostly_black'
  | 'low_ocr_confidence'
  | 'low_text_detected'
  | 'over_cropped'
  | 'split_regions_suspect'
  | 'orientation_uncertain'
  | 'low_classification_confidence';

export interface AnalyzeQualityInput {
  originalPath: string;
  optimizedPath: string;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number;
  optimizedHeight: number;
  ocrConfidence: number;
  ocrTextLength: number;
  recordTypeConfidence: number;
  regions: PixelBBox[];
  optimizationsApplied: string[];
  manualRotationDegrees?: number;
}

export interface AnalyzeQualityReport {
  score: number;
  issues: AnalyzeQualityIssue[];
  passed: boolean;
  autoFixesSuggested: string[];
}

export interface OptimizePipelineOptions {
  skipBorderTrim?: boolean;
  skipDeskew?: boolean;
  skipDenoise?: boolean;
  preRotateDegrees?: number;
}

const ISSUE_PENALTY: Record<AnalyzeQualityIssue, number> = {
  image_mostly_black: 0.55,
  low_ocr_confidence: 0.25,
  low_text_detected: 0.2,
  over_cropped: 0.35,
  split_regions_suspect: 0.2,
  orientation_uncertain: 0.15,
  low_classification_confidence: 0.15,
};

async function brightPixelFraction(imagePath: string): Promise<number> {
  const { data, info } = await sharp(imagePath)
    .resize(128, 128, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  if (!pixels) return 0;
  let bright = 0;
  for (let i = 0; i < pixels; i += 1) {
    const lum = 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2];
    if (lum > 40) bright += 1;
  }
  return bright / pixels;
}

export async function assessAnalyzeQuality(input: AnalyzeQualityInput): Promise<AnalyzeQualityReport> {
  const issues: AnalyzeQualityIssue[] = [];
  const autoFixesSuggested: string[] = [];

  if (fs.existsSync(input.optimizedPath)) {
    const brightFrac = await brightPixelFraction(input.optimizedPath);
    if (brightFrac < 0.1) {
      issues.push('image_mostly_black');
      autoFixesSuggested.push('rebuild_from_original_conservative');
    }
  }

  if (input.originalWidth > 0 && input.originalHeight > 0) {
    const origArea = input.originalWidth * input.originalHeight;
    const optArea = input.optimizedWidth * input.optimizedHeight;
    if (origArea > 0 && optArea / origArea < 0.45) {
      issues.push('over_cropped');
      autoFixesSuggested.push('rebuild_from_original_skip_border');
    }
  }

  if (input.ocrTextLength < 40) {
    issues.push('low_text_detected');
    autoFixesSuggested.push('retry_orientation_from_original');
  }
  if (input.ocrConfidence < 0.35) {
    issues.push('low_ocr_confidence');
    autoFixesSuggested.push('retry_orientation_from_original');
  }
  if (input.recordTypeConfidence < 0.45) {
    issues.push('low_classification_confidence');
  }

  if (input.regions.length > 1) {
    const validated = await validateRegionsForCrop(input.optimizedPath, input.regions);
    if (validated.length < 2 || validated.length !== input.regions.length) {
      issues.push('split_regions_suspect');
      autoFixesSuggested.push('disable_auto_split');
    }
  }

  if (
    !input.optimizationsApplied.some((o) => o.startsWith('auto_rotate'))
    && input.ocrTextLength < 80
    && input.ocrConfidence < 0.5
  ) {
    issues.push('orientation_uncertain');
    autoFixesSuggested.push('retry_orientation_from_original');
  }

  let score = 1;
  for (const issue of issues) {
    score -= ISSUE_PENALTY[issue];
  }
  score = Math.max(0, Math.min(1, score));

  return {
    score: Math.round(score * 1000) / 1000,
    issues,
    passed: score >= 0.55 && !issues.includes('image_mostly_black'),
    autoFixesSuggested: [...new Set(autoFixesSuggested)],
  };
}
