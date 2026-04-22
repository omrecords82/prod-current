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
