/**
 * Vision JSON Parser Utilities
 * Barrel re-export — all logic extracted into focused modules.
 *
 * Modules:
 *   bboxUtils.ts       — BBox geometry (vertices, merge, overlap, IoU, containment, screen conversion)
 *   visionParsing.ts   — Google Vision JSON → FusionLine/FusionToken parsing
 *   entryDetection.ts  — Multi-record segmentation (quadrant, gap, NMS, text-based fallback)
 *   labelDetection.ts  — Fuzzy label anchoring, value extraction, field auto-mapping
 */

// --- BBox Utilities ---
export {
  verticesToBBox,
  getBBoxCentroid,
  mergeBBoxes,
  bboxesOverlap,
  isInSameYBand,
  isToRightOf,
  isBelow,
  isBboxWithinContainer,
  filterEntryByBbox,
  calculateIoU,
  calculateContainment,
  calculateAspectRatio,
  visionToScreenBBox,
} from './bboxUtils';

// --- Vision JSON Parsing ---
export {
  parseVisionResponse,
  getVisionPageSize,
} from './visionParsing';

// --- Entry Detection ---
export {
  detectEntriesQuadrant,
  detectEntriesGap,
  extractRecordNumber,
  detectEntries,
  detectEntriesFromText,
} from './entryDetection';

// --- Label Detection & Field Mapping ---
export {
  normalizeText,
  levenshteinDistance,
  similarity,
  detectLabels,
  extractValueForLabel,
  autoMapFields,
} from './labelDetection';

