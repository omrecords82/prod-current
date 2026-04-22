/**
 * Pipeline artifact types — mirrors backend types exactly.
 *
 * Sources:
 *   server/src/ocr/preprocessing/scoringV2.ts
 *   server/src/ocr/preprocessing/autocommit.ts
 *   server/src/ocr/preprocessing/correctionLog.ts
 *   server/src/ocr/preprocessing/borderDetection.ts
 */

// ── Scoring V2 ──────────────────────────────────────────────────────────────

export type ReasonCode =
  | 'DATE_PARSE_FAIL'
  | 'LOW_OCR_CONF'
  | 'AMBIGUOUS_COLUMN'
  | 'MISSING_REQUIRED'
  | 'SHORT_VALUE'
  | 'SUSPICIOUS_CHARS'
  | 'FIELD_OK';

export interface FieldScore {
  field_name: string;
  cell_confidence: number | null;
  validity_score: number;
  field_score: number;
  needs_review: boolean;
  reasons: ReasonCode[];
  token_ids: number[];
  bbox_union: [number, number, number, number] | null;
}

export interface RowScore {
  candidate_index: number;
  source_row_index: number;
  row_score: number;
  needs_review: boolean;
  reasons: ReasonCode[];
  fields: FieldScore[];
}

export interface ScoringV2Result {
  method: string;
  thresholds: {
    low_ocr_conf: number;
    date_required_types: string[];
    min_value_length: number;
    field_review_threshold: number;
    row_review_threshold: number;
  };
  rows: RowScore[];
  page_score_v2: number;
  routing_recommendation: string;
  summary: {
    total_rows: number;
    rows_need_review: number;
    total_fields: number;
    fields_flagged: number;
    flag_counts: Record<ReasonCode, number>;
  };
  recorded_at: string;
}

// ── Autocommit ──────────────────────────────────────────────────────────────

export interface AutocommitThresholds {
  autoCommitRowThreshold: number;
  requiredProvenanceCoverage: number;
  minStructureScore: number;
}

export interface RowEligibility {
  candidateIndex: number;
  sourceRowIndex: number;
  eligible: boolean;
  rowScore: number;
  reasons: string[];
}

export interface AutocommitPlan {
  method: 'autocommit_v1';
  batch_id: string;
  thresholds: AutocommitThresholds;
  structure_score: number | null;
  template_used: boolean;
  eligible_rows: RowEligibility[];
  skipped_rows: RowEligibility[];
  total_candidates: number;
  eligible_count: number;
  skipped_count: number;
  artifact_refs: Record<string, string | null>;
  created_at: string;
}

export interface AutocommitRowResult {
  candidateIndex: number;
  sourceRowIndex: number;
  outcome: 'committed' | 'skipped' | 'error';
  recordId: number | null;
  recordType: string | null;
  table: string | null;
  error: string | null;
}

export interface AutocommitResults {
  method: 'autocommit_v1';
  batch_id: string;
  job_id: number;
  church_id: number;
  rows: AutocommitRowResult[];
  committed_count: number;
  skipped_count: number;
  error_count: number;
  created_at: string;
}

// ── Correction Log ──────────────────────────────────────────────────────────

export interface CorrectionProvenance {
  token_ids: number[];
  bbox_union_norm: number[] | null;
  bbox_union_px: number[] | null;
  confidence: number | null;
}

export interface CorrectionEvent {
  edit_id: string;
  job_id: number;
  page_id: number | null;
  candidate_index: number;
  row_index: number | null;
  record_type: string;
  template_id: string | null;
  user_id: string;
  timestamp: string;
  field_name: string;
  before_value: string | null;
  after_value: string | null;
  provenance: CorrectionProvenance | null;
  was_flagged: boolean;
  flag_reasons: string[];
  edit_source: 'autosave' | 'finalize' | 'commit';
}

export interface CorrectionsSummary {
  job_id: number;
  total_events: number;
  unique_fields_edited: number;
  unique_candidates_edited: number;
  by_field: Record<string, number>;
  by_source: Record<string, number>;
  flagged_corrections: number;
  first_event_at: string | null;
  last_event_at: string | null;
}

// ── Border Detection ────────────────────────────────────────────────────────

export interface TrimPx {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface BorderGeometry {
  applied: boolean;
  cropBoxPx: { x: number; y: number; w: number; h: number };
  cropBoxNorm: { x: number; y: number; w: number; h: number };
  confidence: number;
  reasons: string[];
  thresholds: {
    blackThreshold: number;
    varianceThreshold: number;
    minBandPx: number;
    scanDepthPx: number;
  };
  trimPx: TrimPx;
  originalDimensions: { width: number; height: number };
  method: string;
}

// ── Commit Batch ────────────────────────────────────────────────────────────

export interface CommitBatch {
  batch_id: string;
  created_at: string;
  plan: AutocommitPlan | null;
  results: AutocommitResults | null;
  rollback: any | null;
  rolled_back: boolean;
}

// ── Artifact Catalog ────────────────────────────────────────────────────────

export interface ArtifactEntry {
  id: number;
  type: string;
  storage_path: string;
  json_blob?: any;
  meta_json?: any;
  created_at: string;
  sha256?: string;
  bytes?: number;
  mime_type?: string;
}
