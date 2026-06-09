/**
 * Multi-record upload helpers — detect/split composite photos into per-record jobs.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  cropRecordRegions,
  detectSeparateRecordRegions,
  shouldDisableRecordSnippets,
  shouldSplitIntoMultipleJobs,
} from '../ocr/preprocessing/multiRecordSplit';

export type RecordLayoutMode = 'auto' | 'single' | 'ledger' | 'multi_record_split' | 'multi_form_page';

const VALID_LAYOUT_MODES: RecordLayoutMode[] = [
  'auto',
  'single',
  'ledger',
  'multi_record_split',
  'multi_form_page',
];

export function normalizeRecordLayoutMode(raw: unknown): RecordLayoutMode {
  const mode = String(raw || 'auto').trim() as RecordLayoutMode;
  return VALID_LAYOUT_MODES.includes(mode) ? mode : 'auto';
}

export async function resolveUploadRecordLayoutMode(
  tenantPool: any,
  churchId: number,
  bodyMode?: unknown,
): Promise<RecordLayoutMode> {
  if (bodyMode) return normalizeRecordLayoutMode(bodyMode);
  try {
    const [rows] = await tenantPool.query(
      `SELECT settings_json FROM ocr_settings WHERE church_id = ? LIMIT 1`,
      [churchId],
    );
    if (rows?.[0]?.settings_json) {
      const json = typeof rows[0].settings_json === 'string'
        ? JSON.parse(rows[0].settings_json)
        : rows[0].settings_json;
      if (json.documentProcessing?.recordLayoutMode) {
        return normalizeRecordLayoutMode(json.documentProcessing.recordLayoutMode);
      }
    }
  } catch {
    /* use default */
  }
  return 'auto';
}

export function buildSplitLayoutClassification(
  recordLayoutMode: RecordLayoutMode,
  opts: {
    splitIndex?: number;
    splitTotal?: number;
    sourceFilename?: string;
    parentBatchId?: string;
  } = {},
) {
  const useRecordSnippets = !shouldDisableRecordSnippets(recordLayoutMode);
  return {
    detectedLayoutType: recordLayoutMode === 'multi_form_page' ? 'multi_form' : 'form',
    recordLayoutMode,
    useRecordSnippets,
    userOverridden: false,
    confidence: 0.9,
    ...opts,
  };
}

export interface SplitUploadPlan {
  paths: string[];
  filenames: string[];
  split: boolean;
  regionCount: number;
  batchId: string | null;
  layoutClassification: ReturnType<typeof buildSplitLayoutClassification> | null;
}

export async function planMultiRecordUpload(
  imagePath: string,
  uploadDir: string,
  originalFilename: string,
  recordLayoutMode: RecordLayoutMode,
  gridOpts?: { gridRows?: number; gridCols?: number },
): Promise<SplitUploadPlan> {
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext);
  const timestamp = Date.now();

  const regions = await detectSeparateRecordRegions(imagePath, {
    gridRows: recordLayoutMode === 'multi_record_split'
      ? (gridOpts?.gridRows || 2)
      : gridOpts?.gridRows,
    gridCols: recordLayoutMode === 'multi_record_split'
      ? (gridOpts?.gridCols || 2)
      : gridOpts?.gridCols,
  });
  const split = shouldSplitIntoMultipleJobs(recordLayoutMode, regions.length);

  if (!split) {
    const layoutClassification = shouldDisableRecordSnippets(recordLayoutMode)
      ? buildSplitLayoutClassification(recordLayoutMode, { sourceFilename: originalFilename })
      : null;
    return {
      paths: [imagePath],
      filenames: [path.basename(imagePath)],
      split: false,
      regionCount: regions.length,
      batchId: null,
      layoutClassification,
    };
  }

  const batchId = `msplit_${timestamp}_${crypto.randomBytes(3).toString('hex')}`;
  const cropBase = `${baseName}_${timestamp}`;
  const croppedPaths = await cropRecordRegions(imagePath, regions, uploadDir, cropBase, ext);

  return {
    paths: croppedPaths,
    filenames: croppedPaths.map((p) => path.basename(p)),
    split: true,
    regionCount: regions.length,
    batchId,
    layoutClassification: null,
  };
}

export function buildPerSplitLayoutClassification(
  recordLayoutMode: RecordLayoutMode,
  splitIndex: number,
  splitTotal: number,
  sourceFilename: string,
  parentBatchId: string,
) {
  return buildSplitLayoutClassification(recordLayoutMode, {
    splitIndex,
    splitTotal,
    sourceFilename,
    parentBatchId,
  });
}

export function removeSourceIfSplit(sourcePath: string, split: boolean) {
  if (!split) return;
  try {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
  } catch {
    /* non-blocking */
  }
}
