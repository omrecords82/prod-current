/**
 * Column-to-Field Mapping Engine
 *
 * Maps table extraction rows to record field candidates.
 * Supports known layouts (marriage_ledger_v1) with hard-coded mappings
 * and generic layouts (generic_table_v1) with header-text inference.
 *
 * Pure function — no DB dependency.
 */

import { classifyRecordType } from '../utils/ocrClassifier';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RecordCandidate {
  recordType: string;
  confidence: number;
  fields: Record<string, string>;
  sourceRowIndex: number;
  needsReview: boolean;
}

export interface MultiRecordResult {
  candidates: RecordCandidate[];
  detectedType: string;
  typeConfidence: number;
  columnMapping: Record<string, string>;
  unmappedColumns: string[];
  parsedAt: string;
}

// ── Known Layout Mappings ────────────────────────────────────────────────────

/** Marriage ledger column_key → record field key */
const MARRIAGE_COLUMN_MAP: Record<string, string> = {
  groom: 'groom_name',
  bride: 'bride_name',
  date: 'date_of_marriage',
  priest: 'officiant',
  witnesses: 'witnesses',
};

/** Marriage columns that get concatenated into notes */
const MARRIAGE_NOTES_COLUMNS = ['number', 'groom_parents', 'bride_parents', 'license'];

/** Baptism header hints: lowercase keywords → field key */
const BAPTISM_HEADER_HINTS: Record<string, string[]> = {
  child_name: ['child', 'name of child', 'infant', 'baptized', 'christened', 'first name', 'full name', 'name'],
  date_of_birth: ['birth', 'born', 'date of birth'],
  place_of_birth: ['birthplace', 'place of birth', 'born at'],
  father_name: ['father', 'parent'],
  mother_name: ['mother'],
  address: ['address', 'residence', 'domicile'],
  date_of_baptism: ['baptism', 'baptized', 'christened', 'reception'],
  godparents: ['godparent', 'sponsor', 'sponsors', 'godmother', 'godfather'],
  performed_by: ['priest', 'clergy', 'officiant', 'performed', 'administered'],
};

/** Marriage header hints */
const MARRIAGE_HEADER_HINTS: Record<string, string[]> = {
  groom_name: ['groom', 'husband', 'bridegroom'],
  bride_name: ['bride', 'wife'],
  date_of_marriage: ['date', 'marriage date', 'wedding'],
  witnesses: ['witness', 'best man', 'maid'],
  officiant: ['priest', 'clergy', 'officiant', 'performed', 'administered'],
};

/** Funeral header hints */
const FUNERAL_HEADER_HINTS: Record<string, string[]> = {
  deceased_name: ['deceased', 'name', 'decedent', 'full name'],
  date_of_death: ['death', 'died', 'date of death'],
  date_of_funeral: ['funeral'],
  date_of_burial: ['burial', 'interment', 'buried'],
  place_of_burial: ['place of burial', 'cemetery', 'interment place'],
  age_at_death: ['age'],
  cause_of_death: ['cause', 'cause of death'],
  officiant: ['priest', 'clergy', 'officiant', 'performed'],
};

const HEADER_HINTS_BY_TYPE: Record<string, Record<string, string[]>> = {
  baptism: BAPTISM_HEADER_HINTS,
  marriage: MARRIAGE_HEADER_HINTS,
  funeral: FUNERAL_HEADER_HINTS,
};

// ── Structured Cell Lines and Token-Line Clustering ──────────────────────────

export interface CellLine {
  line_index: number;
  text: string;
  bbox: number[];
  confidence: number | null;
  suggested_field: string | null;
}

export function clusterTokensIntoLines(tokens: any[]): CellLine[] {
  if (!tokens || tokens.length === 0) return [];

  // Sort tokens by y_center first
  const sorted = [...tokens].sort((a, b) => a.y_center - b.y_center);

  const linesOfTokens: any[][] = [];
  
  for (const t of sorted) {
    let merged = false;
    // Try to merge with an existing line if it fits vertical center overlap
    for (const line of linesOfTokens) {
      const lineAvgHeight = line.reduce((sum, tok) => sum + ((tok.y_max - tok.y_min) || tok.height || 0.01), 0) / line.length;
      const tokHeight = (t.y_max - t.y_min) || t.height || 0.01;
      const tolerance = Math.max(lineAvgHeight, tokHeight) * 0.75;
      
      const lineYCenter = line.reduce((sum, tok) => sum + tok.y_center, 0) / line.length;
      if (Math.abs(t.y_center - lineYCenter) <= tolerance) {
        line.push(t);
        merged = true;
        break;
      }
    }
    if (!merged) {
      linesOfTokens.push([t]);
    }
  }

  // Sort lines from top to bottom (based on average y_center)
  linesOfTokens.sort((a, b) => {
    const avgA = a.reduce((sum, t) => sum + t.y_center, 0) / a.length;
    const avgB = b.reduce((sum, t) => sum + t.y_center, 0) / b.length;
    return avgA - avgB;
  });

  // Convert each token group to a structured CellLine
  return linesOfTokens.map((lineTokens, idx) => {
    // Sort tokens within the line from left to right (x_center)
    lineTokens.sort((a, b) => a.x_center - b.x_center);

    const text = lineTokens.map(t => t.text).join(' ');
    
    const confs = lineTokens.map(t => t.confidence).filter(c => c != null && typeof c === 'number') as number[];
    const avgConf = confs.length > 0
      ? Math.round((confs.reduce((sum, c) => sum + c, 0) / confs.length) * 100) / 100
      : null;

    const bbox = [
      Math.min(...lineTokens.map(t => t.x_min ?? t.x0 ?? 0)),
      Math.min(...lineTokens.map(t => t.y_min ?? t.y0 ?? 0)),
      Math.max(...lineTokens.map(t => t.x_max ?? t.x1 ?? 1)),
      Math.max(...lineTokens.map(t => t.y_max ?? t.y1 ?? 1)),
    ];

    return {
      line_index: idx,
      text,
      bbox,
      confidence: avgConf,
      suggested_field: null,
    };
  });
}

export function assignDefaultSuggestedFields(
  lines: CellLine[],
  mappedField: string | undefined,
  recordType: string
): void {
  if (!lines || lines.length === 0) return;

  if (recordType === 'baptism') {
    // Baptism Date Column: expected exactly 2 lines
    if (mappedField === 'date_of_birth' || mappedField === 'date_of_baptism') {
      if (lines.length === 2) {
        lines[0].suggested_field = 'date_of_birth';
        lines[1].suggested_field = 'date_of_baptism';
      }
    }
    // Baptism Parents Column: expected exactly 2 lines
    if (mappedField === 'father_name' || mappedField === 'mother_name') {
      if (lines.length === 2) {
        lines[0].suggested_field = 'father_name';
        lines[1].suggested_field = 'mother_name';
      }
    }
  } else if (recordType === 'funeral') {
    // Funeral Date Column: expected exactly 2 lines
    if (mappedField === 'date_of_death' || mappedField === 'date_of_burial' || mappedField === 'deceased_date') {
      if (lines.length === 2) {
        lines[0].suggested_field = 'deceased_date';
        lines[1].suggested_field = 'burial_date';
      }
    }
  }
}

// ── Helper: Get cells from a row as a map ────────────────────────────────────

function rowCellMap(row: any): Record<string, string> {
  const map: Record<string, string> = {};
  if (!row?.cells) return map;
  for (const cell of row.cells) {
    const key = cell.column_key || `col_${cell.column_index}`;
    map[key] = (cell.content || '').trim();
  }
  return map;
}

function rowAvgConfidence(row: any): number {
  if (!row?.cells) return 0;
  const confs = row.cells.map((c: any) => c.confidence).filter((c: any) => c != null);
  if (confs.length === 0) return 0;
  return confs.reduce((a: number, b: number) => a + b, 0) / confs.length;
}

// ── Marriage Ledger: Merge Two Tables ────────────────────────────────────────

/**
 * Marriage ledger extractor outputs two tables with columns indexed 0..5 and 0..2.
 * The cells have `column_index` (numeric) but NO `column_key`.
 * Map by position: Table 0 = [number, date, groom, groom_parents, bride, bride_parents]
 *                  Table 1 = [priest, witnesses, license]
 */
const TABLE0_COL_NAMES = ['number', 'date', 'groom', 'groom_parents', 'bride', 'bride_parents'];
const TABLE1_COL_NAMES = ['priest', 'witnesses', 'license'];

function marriageRowCellMap(row: any, colNames: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  if (!row?.cells) return map;
  for (const cell of row.cells) {
    const idx = cell.column_index ?? 0;
    const name = colNames[idx] || `col_${idx}`;
    map[name] = (cell.content || '').trim();
  }
  return map;
}

function mapMarriageLedger(tableResult: any, detectedType: string): {
  candidates: RecordCandidate[];
  columnMapping: Record<string, string>;
} {
  const tables = tableResult.tables || [];
  if (tables.length === 0) return { candidates: [], columnMapping: MARRIAGE_COLUMN_MAP };

  // Collect data rows from all tables, keyed by row_index
  const mergedRows: Record<number, Record<string, string>> = {};
  const rowConfidences: Record<number, number[]> = {};

  for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
    const table = tables[tableIdx];
    const colNames = tableIdx === 0 ? TABLE0_COL_NAMES : TABLE1_COL_NAMES;

    for (const row of (table.rows || [])) {
      if (row.type === 'header') continue;
      // Marriage ledger: rows 0-1 are headers, data starts at row_index >= 2
      if (row.row_index < 2) continue;

      if (!mergedRows[row.row_index]) {
        mergedRows[row.row_index] = {};
        rowConfidences[row.row_index] = [];
      }

      // Add clustering here to cells inside table.rows
      for (const cell of (row.cells || [])) {
        const idx = cell.column_index ?? 0;
        const name = colNames[idx] || `col_${idx}`;
        const mappedField = MARRIAGE_COLUMN_MAP[name];

        const cellLines = clusterTokensIntoLines(cell.tokens || []);
        assignDefaultSuggestedFields(cellLines, mappedField, detectedType);
        if (cellLines.length > 0) {
          cell.lines = cellLines;
        }
        delete cell.tokens;
      }

      const cellMap = marriageRowCellMap(row, colNames);
      Object.assign(mergedRows[row.row_index], cellMap);
      const conf = rowAvgConfidence(row);
      if (conf > 0) rowConfidences[row.row_index].push(conf);
    }
  }

  const candidates: RecordCandidate[] = [];

  for (const [rowIdxStr, cellMap] of Object.entries(mergedRows)) {
    const rowIdx = parseInt(rowIdxStr);
    const fields: Record<string, string> = {};

    // Map known columns to fields
    for (const [colKey, fieldKey] of Object.entries(MARRIAGE_COLUMN_MAP)) {
      if (cellMap[colKey]) {
        fields[fieldKey] = cellMap[colKey];
      }
    }

    // Concatenate overflow columns into notes
    const noteParts: string[] = [];
    for (const colKey of MARRIAGE_NOTES_COLUMNS) {
      if (cellMap[colKey]) {
        noteParts.push(`${colKey}: ${cellMap[colKey]}`);
      }
    }
    if (noteParts.length > 0) {
      fields.notes = noteParts.join('; ');
    }

    // Skip rows where all mapped fields are empty
    const hasContent = Object.values(fields).some(v => v && v.trim().length > 0);
    if (!hasContent) continue;

    const confs = rowConfidences[rowIdx] || [];
    const avgConf = confs.length > 0
      ? confs.reduce((a, b) => a + b, 0) / confs.length
      : 0.5;

    // Flag needs_review if required fields are missing
    const needsReview = !fields.groom_name || !fields.bride_name;

    candidates.push({
      recordType: detectedType,
      confidence: Math.round(avgConf * 100) / 100,
      fields,
      sourceRowIndex: rowIdx,
      needsReview,
    });
  }

  return { candidates, columnMapping: MARRIAGE_COLUMN_MAP };
}

// ── Generic Table: Header Inference ──────────────────────────────────────────

function inferColumnMappingFromHeaders(
  tableResult: any,
  detectedType: string
): Record<string, string> {
  const hints = HEADER_HINTS_BY_TYPE[detectedType];
  if (!hints) return {};

  const tables = tableResult.tables || [];
  if (tables.length === 0) return {};

  // Find header row
  let headerCells: any[] = [];
  for (const table of tables) {
    for (const row of (table.rows || [])) {
      if (row.type === 'header' && row.cells?.length > 0) {
        headerCells = row.cells;
        break;
      }
    }
    if (headerCells.length > 0) break;
  }

  if (headerCells.length === 0) return {};

  const mapping: Record<string, string> = {};
  const usedFields = new Set<string>();

  for (const cell of headerCells) {
    const colKey = cell.column_key || `col_${cell.column_index}`;
    const headerText = (cell.content || '').toLowerCase().trim();
    if (!headerText) continue;

    // Find best matching field
    let bestField: string | null = null;
    let bestScore = 0;

    for (const [fieldKey, keywords] of Object.entries(hints)) {
      if (usedFields.has(fieldKey)) continue;

      for (const keyword of keywords) {
        if (headerText.includes(keyword)) {
          const score = keyword.length / headerText.length;
          if (score > bestScore) {
            bestScore = score;
            bestField = fieldKey;
          }
        }
      }
    }

    if (bestField && bestScore > 0.1) {
      mapping[colKey] = bestField;
      usedFields.add(bestField);
    }
  }

  return mapping;
}

function mapGenericTable(tableResult: any, detectedType: string): {
  candidates: RecordCandidate[];
  columnMapping: Record<string, string>;
  unmappedColumns: string[];
} {
  const tables = tableResult.tables || [];
  if (tables.length === 0) {
    return { candidates: [], columnMapping: {}, unmappedColumns: [] };
  }

  // Infer column mapping from headers
  const columnMapping = inferColumnMappingFromHeaders(tableResult, detectedType);

  // Collect all column keys
  const allColumnKeys = new Set<string>();
  for (const table of tables) {
    for (const row of (table.rows || [])) {
      for (const cell of (row.cells || [])) {
        allColumnKeys.add(cell.column_key || `col_${cell.column_index}`);
      }
    }
  }
  const unmappedColumns = [...allColumnKeys].filter(k => !columnMapping[k]);

  // Extract data rows
  const candidates: RecordCandidate[] = [];

  for (const table of tables) {
    for (const row of (table.rows || [])) {
      if (row.type === 'header') continue;

      // Add clustering here to cells inside table.rows
      for (const cell of (row.cells || [])) {
        const colKey = cell.column_key || `col_${cell.column_index}`;
        const mappedField = columnMapping[colKey];

        const cellLines = clusterTokensIntoLines(cell.tokens || []);
        assignDefaultSuggestedFields(cellLines, mappedField, detectedType);
        if (cellLines.length > 0) {
          cell.lines = cellLines;
        }
        delete cell.tokens;
      }

      const cellMap = rowCellMap(row);
      const fields: Record<string, string> = {};

      // Map known columns
      for (const [colKey, fieldKey] of Object.entries(columnMapping)) {
        if (cellMap[colKey]) {
          fields[fieldKey] = cellMap[colKey];
        }
      }

      // Put unmapped columns into notes
      const noteParts: string[] = [];
      for (const colKey of unmappedColumns) {
        if (cellMap[colKey] && cellMap[colKey].trim()) {
          noteParts.push(cellMap[colKey]);
        }
      }
      if (noteParts.length > 0) {
        fields.notes = (fields.notes ? fields.notes + '; ' : '') + noteParts.join(' | ');
      }

      // Skip empty rows
      const hasContent = Object.values(fields).some(v => v && v.trim().length > 0);
      if (!hasContent) continue;

      const avgConf = rowAvgConfidence(row);

      candidates.push({
        recordType: detectedType,
        confidence: Math.round((avgConf || 0.5) * 100) / 100,
        fields,
        sourceRowIndex: row.row_index,
        needsReview: unmappedColumns.length > Object.keys(columnMapping).length,
      });
    }
  }

  return { candidates, columnMapping, unmappedColumns };
}

// ── Main Export ──────────────────────────────────────────────────────────────

export function extractRecordCandidates(
  tableExtractionResult: any,
  rawText: string,
  jobRecordType: string
): MultiRecordResult {
  // Step 1: Auto-detect record type from raw text
  let detectedType = jobRecordType || 'unknown';
  let typeConfidence = 0;

  if (rawText) {
    const classResult = classifyRecordType(rawText);
    if (classResult.confidence > 0.3) {
      detectedType = classResult.suggested_type;
      typeConfidence = classResult.confidence;
    }
  }

  // If still unknown/custom, fall back to job record type
  if ((detectedType === 'unknown' || detectedType === 'custom') && jobRecordType && jobRecordType !== 'unknown' && jobRecordType !== 'custom') {
    detectedType = jobRecordType;
  }

  if (!tableExtractionResult || !tableExtractionResult.tables) {
    return {
      candidates: [],
      detectedType,
      typeConfidence,
      columnMapping: {},
      unmappedColumns: [],
      parsedAt: new Date().toISOString(),
    };
  }

  // Step 2: Map based on layout type
  const layoutId = tableExtractionResult.layout_id || '';

  let candidates: RecordCandidate[] = [];
  let columnMapping: Record<string, string> = {};
  let unmappedColumns: string[] = [];

  if (layoutId === 'marriage_ledger_v1' || detectedType === 'marriage') {
    const result = mapMarriageLedger(tableExtractionResult, detectedType === 'unknown' ? 'marriage' : detectedType);
    candidates = result.candidates;
    columnMapping = result.columnMapping;
    // If layout is marriage_ledger_v1, force type to marriage
    if (layoutId === 'marriage_ledger_v1') {
      detectedType = 'marriage';
    }
  } else {
    const result = mapGenericTable(tableExtractionResult, detectedType);
    candidates = result.candidates;
    columnMapping = result.columnMapping;
    unmappedColumns = result.unmappedColumns;
  }

  return {
    candidates,
    detectedType,
    typeConfidence,
    columnMapping,
    unmappedColumns,
    parsedAt: new Date().toISOString(),
  };
}
