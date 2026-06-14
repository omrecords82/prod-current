/** Route helpers for OCR Studio shell (devel + portal). */

export type OcrStudioBase = 'devel' | 'portal';

export function ocrStudioBasePath(mode: OcrStudioBase): string {
  return mode === 'portal' ? '/portal/ocr' : '/devel/ocr-studio';
}

export const OCR_STUDIO_SCREEN_PATHS = {
  'command-center': '',
  'analyze-intake': 'analyze',
  'upload-intake': 'upload',
  'batch-history': 'batch-history',
  'job-operations': 'jobs',
  'review-queue': 'review',
  'record-headers': 'record-fields',
  'table-extractor': 'table-extractor',
  'layout-templates': 'layout-templates',
  'ocr-settings': 'settings',
} as const;

export type OcrStudioScreen = keyof typeof OCR_STUDIO_SCREEN_PATHS;

export function ocrStudioScreenPath(mode: OcrStudioBase, screen: OcrStudioScreen): string {
  const base = ocrStudioBasePath(mode);
  const segment = OCR_STUDIO_SCREEN_PATHS[screen];
  return segment ? `${base}/${segment}` : base;
}

export function ocrStudioReviewPath(mode: OcrStudioBase, churchId: number, jobId?: number): string {
  const base = ocrStudioBasePath(mode);
  return jobId ? `${base}/review/${churchId}/${jobId}` : `${base}/review/${churchId}`;
}

/** Resolve active sidebar screen from pathname. */
export function ocrStudioScreenFromPath(pathname: string, base: string): OcrStudioScreen | 'review-detail' | null {
  if (pathname === base || pathname === `${base}/`) return 'command-center';
  const rest = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1) : '';
  if (!rest || rest.startsWith('review/')) {
    return rest.startsWith('review/') ? 'review-detail' : null;
  }
  const segment = rest.split('/')[0];
  const entry = Object.entries(OCR_STUDIO_SCREEN_PATHS).find(([, p]) => p === segment);
  return (entry?.[0] as OcrStudioScreen) ?? null;
}
