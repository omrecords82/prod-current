/**
 * computeRecordHighlightBoxes — Compute overlay boxes for record highlighting on the image viewer.
 * Extracted from OcrWorkbench.tsx
 */

import type { BBox } from '../types/fusion';
import type { OverlayBox } from '../components/FusionOverlay';
import { FIELD_ENTITY_MAP, type SuggestionResult } from './fieldSuggestions';

// Convert fractional bbox [x_min, y_min, x_max, y_max] to Vision pixel BBox
export function cellBboxToVision(
  fractionalBbox: number[],
  pageDims: { width: number; height: number },
): BBox {
  const [x_min, y_min, x_max, y_max] = fractionalBbox;
  return {
    x: x_min * pageDims.width,
    y: y_min * pageDims.height,
    w: (x_max - x_min) * pageDims.width,
    h: (y_max - y_min) * pageDims.height,
  };
}

interface ComputeHighlightBoxesParams {
  tableExtractionJson: any;
  recordCandidates: any;
  selectedRecordIndex: number | null;
  focusedField: string | null;
  fieldSuggestions: SuggestionResult | null;
  scoringV2: any;
  handleRecordBboxAdjusted: (idx: number, newBbox: BBox) => void;
  setSelectedRecordIndex: (idx: number) => void;
  setExternalFieldUpdate: (update: { fieldKey: string; text: string; mode: 'append' | 'replace' } | null) => void;
}

const HUES = [210, 30, 120, 280, 60, 330, 180, 0];

export function computeRecordHighlightBoxes({
  tableExtractionJson,
  recordCandidates,
  selectedRecordIndex,
  focusedField,
  fieldSuggestions,
  scoringV2,
  handleRecordBboxAdjusted,
  setSelectedRecordIndex,
  setExternalFieldUpdate,
}: ComputeHighlightBoxesParams): OverlayBox[] {
  if (!tableExtractionJson || !recordCandidates?.candidates?.length) return [];

  const pageDims = tableExtractionJson.page_dimensions;
  if (!pageDims?.width || !pageDims?.height) return [];

  const tables = tableExtractionJson.tables;
  if (!tables || tables.length === 0) return [];

  // Get columnMapping to reverse-map focusedField -> column_index
  const columnMapping = recordCandidates.columnMapping || {};
  // Reverse: fieldKey -> columnKey(s)
  const fieldToColumns: Record<string, string[]> = {};
  for (const [colKey, fieldKey] of Object.entries(columnMapping)) {
    if (!fieldToColumns[fieldKey as string]) fieldToColumns[fieldKey as string] = [];
    fieldToColumns[fieldKey as string].push(colKey);
  }

  const boxes: OverlayBox[] = [];

  recordCandidates.candidates.forEach((candidate: any, idx: number) => {
    const rowIndex = candidate.sourceRowIndex;
    if (rowIndex < 0) return;
    // For assembled records, sourceRowEnd marks the last row in the group
    const rowEnd = candidate.sourceRowEnd ?? rowIndex;

    const isSelected = idx === selectedRecordIndex;
    const hue = HUES[idx % HUES.length];

    // Collect all cells from sourceRowIndex through sourceRowEnd across all tables
    let unionXMin = Infinity, unionYMin = Infinity, unionXMax = -Infinity, unionYMax = -Infinity;
    let hasBbox = false;

    for (const table of tables) {
      for (const row of table.rows || []) {
        if (row.row_index < rowIndex || row.row_index > rowEnd) continue;
        for (const cell of row.cells || []) {
          if (cell.bbox && cell.bbox.length === 4) {
            hasBbox = true;
            unionXMin = Math.min(unionXMin, cell.bbox[0]);
            unionYMin = Math.min(unionYMin, cell.bbox[1]);
            unionXMax = Math.max(unionXMax, cell.bbox[2]);
            unionYMax = Math.max(unionYMax, cell.bbox[3]);
          }
        }
      }
    }

    if (!hasBbox) return;

    const unionBbox = cellBboxToVision([unionXMin, unionYMin, unionXMax, unionYMax], pageDims);
    boxes.push({
      bbox: unionBbox,
      color: `hsl(${hue}, 70%, 50%)`,
      label: `Record ${idx + 1}`,
      selected: isSelected,
      emphasized: false,
      onClick: () => setSelectedRecordIndex(idx),
      editable: isSelected,
      onBboxChangeEnd: isSelected
        ? (newBbox: BBox) => handleRecordBboxAdjusted(idx, newBbox)
        : undefined,
    });

    // If this record is selected and a field is focused, add emphasized cell highlight
    if (isSelected && focusedField) {
      // Try scoring_v2 provenance first (bbox_union from token-level provenance)
      const scoringRow = scoringV2?.rows?.find((r: any) => r.candidate_index === idx);
      const scoringField = scoringRow?.fields?.find((sf: any) => sf.field_name === focusedField);
      const fieldScore = scoringField?.field_score;

      // Color by field_score: green for good, orange for medium, red for bad
      const highlightColor = fieldScore !== undefined
        ? (fieldScore >= 0.85 ? `hsl(120, 80%, 45%)` : fieldScore >= 0.60 ? `hsl(40, 90%, 55%)` : `hsl(0, 80%, 55%)`)
        : `hsl(${hue}, 90%, 60%)`;

      if (scoringField?.bbox_union) {
        // Use scoring_v2 provenance bbox_union (normalized [x, y, w, h] — convert to pixel coords)
        const [nx, ny, nw, nh] = scoringField.bbox_union;
        const provBbox: BBox = {
          x: nx * pageDims.width,
          y: ny * pageDims.height,
          w: nw * pageDims.width,
          h: nh * pageDims.height,
        };
        boxes.push({
          bbox: provBbox,
          color: highlightColor,
          label: `${focusedField}${fieldScore !== undefined ? ` (${Math.round(fieldScore * 100)}%)` : ''}`,
          selected: true,
          emphasized: true,
        });
      } else if (fieldToColumns[focusedField]) {
        // Fallback to table extraction cell bbox
        const targetColKeys = fieldToColumns[focusedField];
        for (const table of tables) {
          for (const row of table.rows || []) {
            if (row.row_index !== rowIndex) continue;
            for (const cell of row.cells || []) {
              const cellColKey = cell.column_key || `col_${cell.column_index}`;
              if (targetColKeys.includes(cellColKey) && cell.bbox?.length === 4) {
                const cellBbox = cellBboxToVision(cell.bbox, pageDims);
                boxes.push({
                  bbox: cellBbox,
                  color: highlightColor,
                  label: focusedField,
                  selected: true,
                  emphasized: true,
                });
              }
            }
          }
        }
      }
    }
  });

  // Add gold dashed suggestion highlight boxes
  if (fieldSuggestions?.suggestions && tableExtractionJson?.page_dimensions) {
    const pd = tableExtractionJson.page_dimensions;
    const expectedType = focusedField ? FIELD_ENTITY_MAP[focusedField] : undefined;
    for (const suggestion of fieldSuggestions.suggestions) {
      if (!suggestion.bbox || suggestion.entityType === 'text') continue;
      // Only show boxes for suggestions that match the expected entity type
      if (expectedType && suggestion.entityType !== expectedType) continue;
      if (suggestion.score < 0.4) continue;
      const visionBbox = cellBboxToVision(suggestion.bbox, pd);
      boxes.push({
        bbox: visionBbox,
        color: '#FFD700', // gold
        label: suggestion.text.substring(0, 30),
        selected: false,
        emphasized: true,
        dashed: true,
        onClick: () => {
          // Fill the focused field with this suggestion
          if (focusedField) {
            setExternalFieldUpdate({ fieldKey: focusedField, text: suggestion.text, mode: 'replace' });
          }
        },
      });
    }
  }

  return boxes;
}

// ── Review page: per-field color map (coordinated with confirm form) ─────────

export const REVIEW_FIELD_COLORS: Record<string, string> = {
  record_number: '#546e7a',
  child_name: '#1565c0',
  date_of_birth: '#2e7d32',
  date_of_baptism: '#00838f',
  place_of_birth: '#6a1b9a',
  father_name: '#e65100',
  mother_name: '#ad1457',
  parents_name: '#bf360c',
  address: '#5d4037',
  godparents: '#7b1fa2',
  performed_by: '#455a64',
  church: '#3949ab',
  notes: '#795548',
  groom_name: '#1565c0',
  bride_name: '#ad1457',
  date_of_marriage: '#00838f',
  place_of_marriage: '#6a1b9a',
  witnesses: '#7b1fa2',
  best_man: '#5e35b1',
  maid_of_honor: '#8e24aa',
  officiant: '#455a64',
  deceased_name: '#1565c0',
  date_of_death: '#c62828',
  date_of_funeral: '#6d4c41',
  date_of_burial: '#4e342e',
  place_of_burial: '#6a1b9a',
  age_at_death: '#ef6c00',
  cause_of_death: '#5d4037',
  next_of_kin: '#7b1fa2',
};

const FIELD_EXTRA_COLUMNS: Record<string, string[]> = {
  mother_name: ['parents', 'mother'],
  father_name: ['parents', 'father'],
  parents_name: ['parents'],
  date_of_baptism: ['date', 'baptism_date'],
  date_of_birth: ['date', 'birth_date'],
  date_of_death: ['date', 'death_date'],
  date_of_funeral: ['date', 'funeral_date'],
  date_of_burial: ['date', 'burial_date'],
  groom_name: ['groom', 'bridegroom'],
  bride_name: ['bride'],
  groom_parents: ['groom_parents', 'parentsg', 'parents'],
  bride_parents: ['bride_parents', 'parentsb', 'parents'],
  marriage_license: ['marriage_license', 'mlicense', 'license'],
  deceased_name: ['deceased_name', 'deceased'],
  godparents: ['sponsors', 'godparents'],
  performed_by: ['priest', 'officiant', 'clergy'],
  officiant: ['priest', 'officiant'],
};

function unionFractionalBboxes(bboxes: number[][]): number[] | null {
  if (!bboxes.length) return null;
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const b of bboxes) {
    if (!b || b.length !== 4) continue;
    xMin = Math.min(xMin, b[0]);
    yMin = Math.min(yMin, b[1]);
    xMax = Math.max(xMax, b[2]);
    yMax = Math.max(yMax, b[3]);
  }
  if (!Number.isFinite(xMin)) return null;
  return [xMin, yMin, xMax, yMax];
}

function fieldColumnKeys(fieldName: string, columnMapping: Record<string, string>): string[] {
  const keys = new Set<string>();
  for (const [colKey, mappedField] of Object.entries(columnMapping)) {
    if (mappedField === fieldName) keys.add(colKey);
  }
  for (const alias of FIELD_EXTRA_COLUMNS[fieldName] || []) keys.add(alias);
  return Array.from(keys);
}

function findFieldCellBboxes(
  tables: any[],
  rowIndex: number,
  rowEnd: number,
  columnKeys: string[],
): number[][] {
  const bboxes: number[][] = [];
  for (const table of tables) {
    for (const row of table.rows || []) {
      if (row.type === 'header') continue;
      if (row.row_index < rowIndex || row.row_index > rowEnd) continue;
      for (const cell of row.cells || []) {
        const colKey = cell.column_key || `col_${cell.column_index}`;
        if (columnKeys.includes(colKey) && cell.bbox?.length === 4) {
          bboxes.push(cell.bbox);
        }
      }
    }
  }
  return bboxes;
}

export interface ReviewHighlightParams {
  tableExtractionJson: any;
  recordCandidates: any;
  scoringV2?: any;
  selectedRecordIndex: number;
  focusedField?: string | null;
  fieldKeys?: string[];
}

/** Field-level highlight boxes for the OCR review confirm page. */
export function computeReviewFieldHighlightBoxes({
  tableExtractionJson,
  recordCandidates,
  scoringV2,
  selectedRecordIndex,
  focusedField = null,
  fieldKeys = [],
}: ReviewHighlightParams): OverlayBox[] {
  if (!tableExtractionJson || !recordCandidates?.candidates?.length) return [];

  const pageDims = tableExtractionJson.page_dimensions;
  if (!pageDims?.width || !pageDims?.height) return [];

  const candidate = recordCandidates.candidates[selectedRecordIndex];
  if (!candidate) return [];

  const rowIndex = candidate.sourceRowIndex;
  if (rowIndex < 0) return [];
  const rowEnd = candidate.sourceRowEnd ?? rowIndex;
  const tables = tableExtractionJson.tables || [];
  const columnMapping = recordCandidates.columnMapping || {};
  const boxes: OverlayBox[] = [];

  // Faint record region outline
  const recordCells = findFieldCellBboxes(tables, rowIndex, rowEnd, Object.keys(columnMapping));
  const recordUnion = unionFractionalBboxes(recordCells);
  if (recordUnion) {
    boxes.push({
      bbox: cellBboxToVision(recordUnion, pageDims),
      color: '#90a4ae',
      label: `Record ${selectedRecordIndex + 1}`,
      selected: true,
      emphasized: false,
    });
  }

  const keysToShow = fieldKeys.length
    ? fieldKeys
    : Object.keys(candidate.fields || {}).filter((k) => candidate.fields[k]?.trim());

  const scoringRow = scoringV2?.rows?.find((r: any) => r.candidate_index === selectedRecordIndex);

  for (const fieldName of keysToShow) {
    const color = REVIEW_FIELD_COLORS[fieldName] || '#1976d2';
    const isFocused = focusedField === fieldName;
    let visionBbox: BBox | null = null;

    const scoringField = scoringRow?.fields?.find((sf: any) => sf.field_name === fieldName);
    if (scoringField?.bbox_union?.length === 4) {
      const [nx, ny, nw, nh] = scoringField.bbox_union;
      visionBbox = {
        x: nx * pageDims.width,
        y: ny * pageDims.height,
        w: nw * pageDims.width,
        h: nh * pageDims.height,
      };
    } else {
      const colKeys = fieldColumnKeys(fieldName, columnMapping);
      const cellBboxes = findFieldCellBboxes(tables, rowIndex, rowEnd, colKeys);
      const union = unionFractionalBboxes(cellBboxes);
      if (union) visionBbox = cellBboxToVision(union, pageDims);
    }

    if (!visionBbox || visionBbox.w <= 0 || visionBbox.h <= 0) continue;

    boxes.push({
      bbox: visionBbox,
      color,
      label: fieldName.replace(/_/g, ' '),
      selected: isFocused,
      emphasized: isFocused,
    });
  }

  return boxes;
}

/** Fractional bbox [x0,y0,x1,y1] for header rows + one record's row span. */
export function computeReviewCropBbox(
  tableExtractionJson: any,
  recordCandidates: any,
  selectedRecordIndex: number,
): number[] | null {
  if (!tableExtractionJson?.tables?.length || !recordCandidates?.candidates?.length) return null;
  const candidate = recordCandidates.candidates[selectedRecordIndex];
  if (!candidate) return null;
  const rowStart = candidate.sourceRowIndex;
  const rowEnd = candidate.sourceRowEnd ?? rowStart;
  if (typeof rowStart !== 'number' || rowStart < 0) return null;

  const parts: number[][] = [];
  for (const table of tableExtractionJson.tables) {
    for (const row of table.rows || []) {
      const isHeader = row.type === 'header';
      const inRecord = !isHeader && row.row_index >= rowStart && row.row_index <= rowEnd;
      if (!isHeader && !inRecord) continue;
      for (const cell of row.cells || []) {
        if (cell.bbox?.length === 4) parts.push(cell.bbox);
      }
    }
  }
  return unionFractionalBboxes(parts);
}

/** Shift highlight boxes from full-page coords into a review-crop coordinate space. */
export function adjustHighlightBoxesForCrop(
  boxes: OverlayBox[],
  pageDims: { width: number; height: number },
  cropBbox: number[],
): OverlayBox[] {
  const [cx0, cy0, cx1, cy1] = cropBbox;
  const cropW = Math.max(1, (cx1 - cx0) * pageDims.width);
  const cropH = Math.max(1, (cy1 - cy0) * pageDims.height);
  const offsetX = cx0 * pageDims.width;
  const offsetY = cy0 * pageDims.height;

  return boxes
    .map((box) => ({
      ...box,
      bbox: {
        x: box.bbox.x - offsetX,
        y: box.bbox.y - offsetY,
        w: box.bbox.w,
        h: box.bbox.h,
      },
    }))
    .filter((box) => {
      const b = box.bbox;
      return b.x + b.w > 0 && b.y + b.h > 0 && b.x < cropW && b.y < cropH;
    });
}

export function cropVisionPageSize(
  pageDims: { width: number; height: number },
  cropBbox: number[],
): { width: number; height: number } {
  const [cx0, cy0, cx1, cy1] = cropBbox;
  return {
    width: Math.max(1, (cx1 - cx0) * pageDims.width),
    height: Math.max(1, (cy1 - cy0) * pageDims.height),
  };
}

// ── Column-based review model ────────────────────────────────────────────────
// Highlights and click-to-map regions derive from the table's column bands
// (x ranges) intersected with the selected record's row y-span. This keeps the
// overlay aligned with the (user-adjustable) column dividers.

export type ColumnBands = Record<string, number[]>;

export interface OrderedBand {
  key: string;
  x0: number;
  x1: number;
}

/** Bands sorted left-to-right. */
export function orderColumnBands(bands: ColumnBands | null | undefined): OrderedBand[] {
  if (!bands) return [];
  return Object.entries(bands)
    .filter(([, v]) => Array.isArray(v) && v.length === 2)
    .map(([key, v]) => ({ key, x0: v[0], x1: v[1] }))
    .sort((a, b) => a.x0 - b.x0);
}

/** Interior boundary x positions (shared edges between adjacent columns). */
export function columnBoundaryEdges(bands: ColumnBands | null | undefined): Array<{ x: number; leftKey: string; rightKey: string }> {
  const ordered = orderColumnBands(bands);
  const edges: Array<{ x: number; leftKey: string; rightKey: string }> = [];
  for (let i = 0; i < ordered.length - 1; i++) {
    edges.push({ x: ordered[i].x1, leftKey: ordered[i].key, rightKey: ordered[i + 1].key });
  }
  return edges;
}

/** Move a shared boundary, returning a new bands object. */
export function moveColumnBoundary(
  bands: ColumnBands,
  leftKey: string,
  rightKey: string,
  newX: number,
): ColumnBands {
  const next: ColumnBands = {};
  for (const [k, v] of Object.entries(bands)) next[k] = [v[0], v[1]];
  if (next[leftKey]) next[leftKey][1] = newX;
  if (next[rightKey]) next[rightKey][0] = newX;
  return next;
}

function recordRowCells(tableExtractionJson: any, rowStart: number, rowEnd: number): any[] {
  const cells: any[] = [];
  for (const table of tableExtractionJson.tables || []) {
    for (const row of table.rows || []) {
      if (row.type === 'header') continue;
      if (row.row_index < rowStart || row.row_index > rowEnd) continue;
      for (const cell of row.cells || []) cells.push(cell);
    }
  }
  return cells;
}

export interface ColumnRegion {
  columnKey: string;
  frac: [number, number, number, number];
  text: string;
}

/** One clickable region per column for the selected record (text = column cells joined). */
export function computeColumnTokens({
  tableExtractionJson,
  recordCandidates,
  selectedRecordIndex,
  columnBands,
}: {
  tableExtractionJson: any;
  recordCandidates: any;
  selectedRecordIndex: number;
  columnBands?: ColumnBands | null;
}): ColumnRegion[] {
  if (!tableExtractionJson?.tables?.length || !recordCandidates?.candidates?.length) return [];
  const cand = recordCandidates.candidates[selectedRecordIndex];
  if (!cand) return [];
  const rowStart = cand.sourceRowIndex;
  const rowEnd = cand.sourceRowEnd ?? rowStart;
  if (typeof rowStart !== 'number' || rowStart < 0) return [];

  const bands = columnBands || tableExtractionJson.column_bands || {};
  const cells = recordRowCells(tableExtractionJson, rowStart, rowEnd);

  let recY0 = Infinity, recY1 = -Infinity;
  for (const c of cells) {
    if (c.bbox?.length === 4) { recY0 = Math.min(recY0, c.bbox[1]); recY1 = Math.max(recY1, c.bbox[3]); }
  }
  if (!Number.isFinite(recY0)) { recY0 = 0; recY1 = 1; }

  const regions: ColumnRegion[] = [];
  for (const { key, x0, x1 } of orderColumnBands(bands)) {
    let y0 = Infinity, y1 = -Infinity;
    const texts: string[] = [];
    for (const c of cells) {
      if (c.column_key !== key) continue;
      if (c.content?.trim()) texts.push(c.content.trim());
      if (c.bbox?.length === 4) { y0 = Math.min(y0, c.bbox[1]); y1 = Math.max(y1, c.bbox[3]); }
    }
    if (!Number.isFinite(y0)) { y0 = recY0; y1 = recY1; }
    regions.push({ columnKey: key, frac: [x0, y0, x1, y1], text: texts.join(' ').replace(/\s+/g, ' ').trim() });
  }
  return regions;
}

/** One clickable token per OCR cell (precise text fragments) for the record. */
export function computeCellTokens({
  tableExtractionJson,
  recordCandidates,
  selectedRecordIndex,
}: {
  tableExtractionJson: any;
  recordCandidates: any;
  selectedRecordIndex: number;
}): ColumnRegion[] {
  if (!tableExtractionJson?.tables?.length || !recordCandidates?.candidates?.length) return [];
  const cand = recordCandidates.candidates[selectedRecordIndex];
  if (!cand) return [];
  const rowStart = cand.sourceRowIndex;
  const rowEnd = cand.sourceRowEnd ?? rowStart;
  if (typeof rowStart !== 'number' || rowStart < 0) return [];

  const out: ColumnRegion[] = [];
  for (const c of recordRowCells(tableExtractionJson, rowStart, rowEnd)) {
    if (!c.content?.trim() || c.bbox?.length !== 4) continue;
    out.push({
      columnKey: c.column_key || `col_${c.column_index}`,
      frac: [c.bbox[0], c.bbox[1], c.bbox[2], c.bbox[3]],
      text: c.content.replace(/\s+/g, ' ').trim(),
    });
  }
  return out;
}

export interface FieldRegion {
  fieldName: string;
  frac: [number, number, number, number];
  text: string;
}

/** Column-aligned highlight region per field (x from band, y from field's cells). */
export function computeFieldRegions({
  tableExtractionJson,
  recordCandidates,
  selectedRecordIndex,
  fieldKeys = [],
  columnBands,
}: {
  tableExtractionJson: any;
  recordCandidates: any;
  selectedRecordIndex: number;
  fieldKeys?: string[];
  columnBands?: ColumnBands | null;
}): FieldRegion[] {
  if (!tableExtractionJson?.tables?.length || !recordCandidates?.candidates?.length) return [];
  const cand = recordCandidates.candidates[selectedRecordIndex];
  if (!cand) return [];
  const rowStart = cand.sourceRowIndex;
  const rowEnd = cand.sourceRowEnd ?? rowStart;
  if (typeof rowStart !== 'number' || rowStart < 0) return [];

  const bands = columnBands || tableExtractionJson.column_bands || {};
  const columnMapping = recordCandidates.columnMapping || {};
  const cells = recordRowCells(tableExtractionJson, rowStart, rowEnd);

  let recY0 = Infinity, recY1 = -Infinity;
  for (const c of cells) {
    if (c.bbox?.length === 4) { recY0 = Math.min(recY0, c.bbox[1]); recY1 = Math.max(recY1, c.bbox[3]); }
  }
  if (!Number.isFinite(recY0)) { recY0 = 0; recY1 = 1; }

  const keys = fieldKeys.length ? fieldKeys : Array.from(new Set(Object.values(columnMapping))) as string[];

  // Resolve each field to its primary column band; collect the field's text/y.
  type Resolved = { fieldName: string; bandKey: string; colKeys: string[]; y0: number; y1: number; text: string };
  const resolved: Resolved[] = [];
  for (const fieldName of keys) {
    const colKeys = fieldColumnKeys(fieldName, columnMapping).filter((k) => bands[k]);
    if (!colKeys.length) continue;
    let y0 = Infinity, y1 = -Infinity;
    const texts: string[] = [];
    for (const c of cells) {
      if (!colKeys.includes(c.column_key)) continue;
      if (c.content?.trim()) texts.push(c.content.trim());
      if (c.bbox?.length === 4) { y0 = Math.min(y0, c.bbox[1]); y1 = Math.max(y1, c.bbox[3]); }
    }
    if (!Number.isFinite(y0)) { y0 = recY0; y1 = recY1; }
    resolved.push({ fieldName, bandKey: colKeys[0], colKeys, y0, y1, text: texts.join(' ').replace(/\s+/g, ' ').trim() });
  }

  // Group fields that share a column band so their boxes don't perfectly overlap
  // (e.g. date_of_birth + date_of_baptism, or father_name + mother_name). The
  // shared column's y-span is split into stacked slices, one per field.
  const groups = new Map<string, Resolved[]>();
  for (const r of resolved) {
    if (!groups.has(r.bandKey)) groups.set(r.bandKey, []);
    groups.get(r.bandKey)!.push(r);
  }

  const regions: FieldRegion[] = [];
  for (const [bandKey, members] of groups) {
    const band = bands[bandKey];
    // Shared y-span = union of all members' y-spans for this band.
    let gy0 = Infinity, gy1 = -Infinity;
    for (const m of members) { gy0 = Math.min(gy0, m.y0); gy1 = Math.max(gy1, m.y1); }
    if (!Number.isFinite(gy0)) { gy0 = recY0; gy1 = recY1; }
    const n = members.length;
    members.forEach((m, i) => {
      let y0 = m.y0, y1 = m.y1;
      if (n > 1) {
        const h = (gy1 - gy0) / n;
        y0 = gy0 + i * h;
        y1 = gy0 + (i + 1) * h;
      }
      regions.push({ fieldName: m.fieldName, frac: [band[0], y0, band[1], y1], text: m.text });
    });
  }
  return regions;
}

/** Convert a fractional region to an OverlayBox (vision space, crop-adjusted). */
export function fieldRegionsToBoxes(
  regions: FieldRegion[],
  pageDims: { width: number; height: number },
  focusedField: string | null,
  cropBbox?: number[] | null,
): OverlayBox[] {
  const ordered = focusedField
    ? [...regions].sort((a, b) => (a.fieldName === focusedField ? 1 : 0) - (b.fieldName === focusedField ? 1 : 0))
    : regions;
  const boxes: OverlayBox[] = ordered.map((r) => ({
    bbox: cellBboxToVision(r.frac, pageDims),
    color: REVIEW_FIELD_COLORS[r.fieldName] || '#1976d2',
    label: r.fieldName.replace(/_/g, ' '),
    selected: focusedField === r.fieldName,
    emphasized: focusedField === r.fieldName,
  }));
  if (cropBbox && pageDims.width && pageDims.height) {
    return adjustHighlightBoxesForCrop(boxes, pageDims, cropBbox);
  }
  return boxes;
}
