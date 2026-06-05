/**
 * ROI Configuration for Layout-Aware Extraction
 * Defines normalized coordinate regions (0..1) for each field type
 */

export interface NormalizedROI {
  x0: number; // 0..1
  y0: number; // 0..1
  x1: number; // 0..1
  y1: number; // 0..1
}

export type RecordType = 'baptism' | 'marriage' | 'funeral';

export interface ROIConfig {
  [recordType: string]: {
    [fieldKey: string]: NormalizedROI;
  };
}

// ============================================================================
// Baptism ROI Definitions (Normalized 0..1)
// ============================================================================

const BAPTISM_ROIS: Record<string, NormalizedROI> = {
  record_number: { x0: 0.0, y0: 0.0, x1: 0.15, y1: 0.08 },
  child_first_name: { x0: 0.15, y0: 0.08, x1: 0.45, y1: 0.18 },
  child_last_name: { x0: 0.45, y0: 0.08, x1: 0.75, y1: 0.18 },
  birth_date: { x0: 0.75, y0: 0.08, x1: 1.0, y1: 0.18 },
  baptism_date: { x0: 0.15, y0: 0.18, x1: 0.45, y1: 0.28 },
  birthplace: { x0: 0.45, y0: 0.18, x1: 0.75, y1: 0.28 },
  sponsors: { x0: 0.15, y0: 0.28, x1: 0.60, y1: 0.40 },
  parents: { x0: 0.60, y0: 0.28, x1: 1.0, y1: 0.40 },
  clergy: { x0: 0.15, y0: 0.40, x1: 0.60, y1: 0.50 },
};

// ============================================================================
// Marriage ROI Definitions (Placeholder - to be defined)
// ============================================================================

const MARRIAGE_ROIS: Record<string, NormalizedROI> = {
  groom_name: { x0: 0.05, y0: 0.10, x1: 0.45, y1: 0.25 },
  bride_name: { x0: 0.50, y0: 0.10, x1: 0.95, y1: 0.25 },
  date_of_marriage: { x0: 0.05, y0: 0.25, x1: 0.35, y1: 0.35 },
  witnesses: { x0: 0.05, y0: 0.35, x1: 0.50, y1: 0.50 },
  officiant: { x0: 0.50, y0: 0.35, x1: 0.95, y1: 0.50 },
};

// ============================================================================
// Funeral ROI Definitions (Placeholder - to be defined)
// ============================================================================

const FUNERAL_ROIS: Record<string, NormalizedROI> = {
  deceased_name: { x0: 0.05, y0: 0.08, x1: 0.50, y1: 0.18 },
  date_of_death: { x0: 0.50, y0: 0.08, x1: 0.95, y1: 0.18 },
  date_of_funeral: { x0: 0.05, y0: 0.18, x1: 0.35, y1: 0.28 },
  date_of_burial: { x0: 0.35, y0: 0.18, x1: 0.65, y1: 0.28 },
  place_of_burial: { x0: 0.65, y0: 0.18, x1: 0.95, y1: 0.28 },
  age_at_death: { x0: 0.05, y0: 0.28, x1: 0.25, y1: 0.38 },
  cause_of_death: { x0: 0.25, y0: 0.28, x1: 0.60, y1: 0.38 },
  officiant: { x0: 0.50, y0: 0.38, x1: 0.95, y1: 0.50 },
};

// ============================================================================
// Export Combined Config
// ============================================================================

export const ROI_CONFIG: ROIConfig = {
  baptism: BAPTISM_ROIS,
  marriage: MARRIAGE_ROIS,
  funeral: FUNERAL_ROIS,
};

// ============================================================================
// Field Lists per Record Type
// ============================================================================

export const FIELD_LISTS: Record<RecordType, string[]> = {
  baptism: [
    'record_number',
    'child_first_name',
    'child_last_name',
    'birth_date',
    'baptism_date',
    'birthplace',
    'sponsors',
    'parents',
    'clergy',
  ],
  marriage: [
    'groom_name',
    'bride_name',
    'date_of_marriage',
    'witnesses',
    'officiant',
  ],
  funeral: [
    'deceased_name',
    'date_of_death',
    'date_of_funeral',
    'date_of_burial',
    'place_of_burial',
    'age_at_death',
    'cause_of_death',
    'officiant',
  ],
};

// ============================================================================
// Per-Church Override Support (Future)
// ============================================================================

export function getROIForChurch(
  churchId: number,
  recordType: RecordType,
  fieldKey: string
): NormalizedROI | null {
  // TODO: Load per-church overrides from database
  // For now, return default
  return ROI_CONFIG[recordType]?.[fieldKey] || null;
}

