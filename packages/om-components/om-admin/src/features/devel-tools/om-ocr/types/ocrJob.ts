/**
 * OCR Job types for the Record Uploader
 */

export type OCRJobStatus = 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
export type RecordType = 'baptism' | 'marriage' | 'funeral' | 'unknown';

export type WorkflowStatus = 'draft' | 'in_review' | 'finalized' | 'committed';

export interface OCRJobRow {
  id: number;
  church_id: number;
  original_filename: string;
  filename?: string;
  status: OCRJobStatus;
  record_type: RecordType;
  confidence_score?: number | null;
  language?: string | null;
  created_at?: string;
  updated_at?: string;
  ocr_text_preview?: string | null;
  has_ocr_text?: boolean;
  error_message?: string | null;
  // Workflow status from fusion drafts
  workflow_status?: WorkflowStatus | null;
  draft_count?: number;
  // Classifier results
  classifier_suggested_type?: string | null;
  classifier_confidence?: number | null;
}

export interface FeederPage {
  pageId: number;
  pageIndex: number;
  sourceImagePath?: string | null;
  rawText: string | null;
  rawTextArtifactId: number | null;
  recordCandidates?: any | null;
  tableExtractionJson?: any | null;
  scoringV2?: any | null;
  meta?: any | null;
  ocrConfidence?: number | null;
  status?: string;
}

export interface OCRJobDetail extends OCRJobRow {
  ocr_text: string | null;
  ocr_result: any | null;
  file_path?: string;
  mapping?: any | null;
  // Feeder artifact data
  pages?: FeederPage[];
  feeder_source?: boolean;
}

