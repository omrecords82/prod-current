/**
 * Fusion Types for OCR Vision JSON Processing
 * Used for multi-entry detection, label anchoring, and field mapping
 */

// ============================================================================
// Core Fusion Types
// ============================================================================

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FusionToken {
  id?: string; // Stable ID from visionParser
  text: string;
  bbox: BBox;
  confidence?: number;
}

export interface FusionLine {
  id?: string; // Stable ID from visionParser
  text: string;
  bbox: BBox;
  confidence?: number;
  tokens: FusionToken[];
}

export interface FusionEntry {
  id: string;
  index: number;
  recordNumber?: string;
  displayName?: string; // User-friendly name (e.g., "Row 1 / Peter Pausells")
  recordType?: 'baptism' | 'marriage' | 'funeral'; // Set at FusionTab level, optional in parser
  mapTargetTable?: 'baptism_records' | 'marriage_records' | 'funeral_records'; // Actual table name for commits
  bbox: BBox;
  blocks: any[];
  lines: FusionLine[];
}

export interface DetectedLabel {
  label: string;
  canonicalField: string;
  bbox: BBox;
  confidence: number;
  matchedText: string;
}

export interface MappedField {
  fieldName: string;
  label: string;
  value: string;
  confidence: number;
  valueBbox?: BBox;
  labelBbox?: BBox;
  isManual?: boolean;
}

// Entry area definition - per-entry bounding box
export interface EntryArea {
  entryId: string; // Stable ID matching FusionEntry.id
  label: string; // Display label (e.g., "Entry 1", "Entry 2")
  bbox: BBox; // Image pixel coordinates {x, y, w, h}
  source: 'auto' | 'manual'; // How this area was created
}

// Field selection - OCR tokens selected for a specific field
export interface FieldSelection {
  entryId: string; // Which entry this selection belongs to
  fieldKey: string; // Field name (e.g., "child_name", "date_of_birth")
  tokens: Array<{
    id: string;
    text: string;
    bbox: BBox;
    confidence?: number;
  }>;
  bboxUnionPx: BBox; // Union of all token bboxes in image pixel coords
}

// Field extraction from layout extractor
export interface FieldExtraction {
  fieldKey: string;
  extractedText: string;
  bboxUnionNormalized: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  bboxUnionPixels: BBox;
  bboxUnionNorm?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }; // Alias for bboxUnionNormalized
  tokens?: Array<{
    id: string;
    text: string;
    bbox: BBox;
    confidence?: number;
  }>;
  confidenceAvg: number;
  confidenceMin?: number;
  tokensUsedCount?: number; // Number of tokens used in extraction
  anchorMatched?: string; // Which anchor phrase matched
  anchorBBox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }; // Anchor bounding box in normalized coords
  searchZone?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }; // Search zone used in normalized coords
}

export interface FusionDraft {
  id?: number;
  ocr_job_id: number;
  entry_index: number;
  record_type: 'baptism' | 'marriage' | 'funeral';
  record_number?: string;
  payload_json: Record<string, any>;
  bbox_json?: {
    // Legacy: kept for backward compatibility, but entryAreas is preferred
    entryBbox?: BBox;
    fieldBboxes?: Record<string, { label?: BBox; value?: BBox }>;
    // New: per-entry areas array (single source of truth)
    entryAreas?: EntryArea[];
    // New: selections keyed by entryId, then fieldKey
    selections?: Record<string, Record<string, FieldSelection>>;
    // New: per-entry field extractions from layout extractor
    entries?: Record<string, {
      fields: Record<string, FieldExtraction>;
    }>;
  };
  status: 'draft' | 'committed';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  committed_record_id?: number;
}

// ============================================================================
// Google Vision API Types (subset we use)
// ============================================================================

export interface VisionVertex {
  x: number;
  y: number;
}

export interface VisionBoundingPoly {
  vertices: VisionVertex[];
}

export interface VisionSymbol {
  text: string;
  confidence?: number;
  boundingBox?: VisionBoundingPoly;
  property?: {
    detectedBreak?: {
      type: 'SPACE' | 'SURE_SPACE' | 'EOL_SURE_SPACE' | 'HYPHEN' | 'LINE_BREAK';
    };
  };
}

export interface VisionWord {
  symbols: VisionSymbol[];
  confidence?: number;
  boundingBox?: VisionBoundingPoly;
}

export interface VisionParagraph {
  words: VisionWord[];
  confidence?: number;
  boundingBox?: VisionBoundingPoly;
}

export interface VisionBlock {
  paragraphs: VisionParagraph[];
  blockType?: string;
  confidence?: number;
  boundingBox?: VisionBoundingPoly;
}

export interface VisionPage {
  blocks: VisionBlock[];
  width: number;
  height: number;
  confidence?: number;
}

export interface VisionFullTextAnnotation {
  pages: VisionPage[];
  text: string;
}

export interface VisionTextAnnotation {
  description: string;
  boundingPoly?: VisionBoundingPoly;
  locale?: string;
}

export interface VisionResponse {
  textAnnotations?: VisionTextAnnotation[];
  fullTextAnnotation?: VisionFullTextAnnotation;
}

// ============================================================================
// Label Dictionaries per Record Type
// ============================================================================

export const LABEL_DICTIONARIES: Record<string, Record<string, string>> = {
  baptism: {
    'NAME OF CHILD': 'child_name',
    'NAME OF PARENTS': 'parents_name',
    "FATHER'S NAME": 'father_name',
    "MOTHER'S NAME": 'mother_name',
    'FATHER': 'father_name',
    'MOTHER': 'mother_name',
    'ADDRESS': 'address',
    'DATE OF BIRTH': 'date_of_birth',
    'DATE OF BAPTISM': 'date_of_baptism',
    'DATE OF BAPTISM AND CONFIRMATION': 'date_of_baptism',
    'PLACE OF BIRTH': 'place_of_birth',
    'GOD PARENTS': 'godparents',
    'GODPARENTS': 'godparents',
    'SPONSORS': 'godparents',
    'SACRAMENTS PERFORMED BY': 'performed_by',
    'PERFORMED BY': 'performed_by',
    'PRIEST': 'performed_by',
    'AT': 'church',
    'CHURCH': 'church',
    'PARISH RECORD': 'record_number',
    'NO': 'record_number',
    'N°': 'record_number',
  },
  marriage: {
    'GROOM': 'groom_name',
    'BRIDE': 'bride_name',
    'GROOM NAME': 'groom_name',
    'BRIDE NAME': 'bride_name',
    'DATE OF MARRIAGE': 'date_of_marriage',
    'DATE OF WEDDING': 'date_of_marriage',
    'PLACE OF MARRIAGE': 'place_of_marriage',
    'WITNESSES': 'witnesses',
    'BEST MAN': 'best_man',
    'MAID OF HONOR': 'maid_of_honor',
    'OFFICIANT': 'officiant',
    'PERFORMED BY': 'officiant',
    'PRIEST': 'officiant',
    'CHURCH': 'church',
    'PARISH RECORD': 'record_number',
  },
  funeral: {
    'NAME OF DECEASED': 'deceased_name',
    'DECEASED': 'deceased_name',
    'DATE OF DEATH': 'date_of_death',
    'DATE OF FUNERAL': 'date_of_funeral',
    'DATE OF BURIAL': 'date_of_burial',
    'PLACE OF BURIAL': 'place_of_burial',
    'CEMETERY': 'place_of_burial',
    'AGE': 'age_at_death',
    'CAUSE OF DEATH': 'cause_of_death',
    'NEXT OF KIN': 'next_of_kin',
    'FAMILY': 'next_of_kin',
    'PERFORMED BY': 'officiant',
    'PRIEST': 'officiant',
    'CHURCH': 'church',
    'PARISH RECORD': 'record_number',
  },
};

// ============================================================================
// Field Definitions per Record Type (for UI rendering)
// ============================================================================

// FieldDefinition and RECORD_FIELDS moved to config/recordFields.ts to avoid circular dependencies
// Note: Do not re-export here to avoid circular dependency issues - import directly from config/recordFields.ts

// ============================================================================
// Fusion State for Step Tracking
// ============================================================================

export type FusionStep = 'detect' | 'anchor' | 'map' | 'save';

export interface FusionState {
  step: FusionStep;
  entries: FusionEntry[];
  selectedEntryIndex: number | null;
  detectedLabels: DetectedLabel[];
  mappedFields: Record<string, MappedField>;
  drafts: FusionDraft[];
  isProcessing: boolean;
  error: string | null;
}

export const INITIAL_FUSION_STATE: FusionState = {
  step: 'detect',
  entries: [],
  selectedEntryIndex: null,
  detectedLabels: [],
  mappedFields: {},
  drafts: [],
  isProcessing: false,
  error: null,
};

