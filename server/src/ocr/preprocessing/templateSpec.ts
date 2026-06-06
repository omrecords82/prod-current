/**
 * Template-Locked Table Extraction — Phase 3.1
 *
 * Provides:
 *   1. TemplateSpec type for describing ledger column layouts
 *   2. Template selection logic (explicit ID → classifier → fallback)
 *   3. Template-locked extraction engine (fixed column bands, adaptive row clustering)
 *
 * Algorithm: template_locked_extract_v1
 *
 * Backward-compatible: produces same table_extraction.json schema as
 * generic_table.js / marriage_ledger_v1.js.
 *
 * Pure function (extraction engine): no DB access, no side effects.
 */

// ── Public types ─────────────────────────────────────────────────────────────

export interface TemplateColumn {
  /** Column key (e.g. 'number', 'date', 'groom') */
  key: string;
  /** Left edge as fraction of page width [0..1] */
  x0Norm: number;
  /** Right edge as fraction of page width [0..1] */
  x1Norm: number;
  /** Whether this column is required (for quality metrics) */
  required?: boolean;
  /** Alternate header labels that might appear in OCR text */
  aliases?: string[];
}

export interface RowModel {
  /** Merge rows whose Y-gap is below this fraction of median row height. Default 0.6. */
  mergeGapFrac?: number;
  /** Stop extracting rows when a row contains ONLY these keywords (normalized). */
  stopKeywords?: string[];
  /** Maximum rows to extract. Default 200. */
  maxRows?: number;
}

export interface TemplateSpec {
  /** Template identifier (DB id or file name) */
  templateId: string | number;
  /** Human-readable name */
  name: string;
  /** Record type this template applies to */
  recordType: string;
  /** Page side: 'full', 'left', 'right'. Default 'full'. */
  pageSide?: string;
  /** Y-threshold for header region as fraction [0..1]. Content above this is header. */
  headerCutNorm: number;
  /** Column definitions (ordered left to right) */
  columns: TemplateColumn[];
  /** Row clustering and merge rules */
  rowModel?: RowModel;
}

export interface TemplateMatchResult {
  method: string;
  selectedTemplateId: string | number | null;
  confidence: number;
  reasons: string[];
  candidates: Array<{ templateId: string | number; score: number }>;
}

export interface TemplateExtractionResult {
  layout_id: string;
  page_number: number;
  page_dimensions: { width: number; height: number };
  tables: Array<{
    row_count: number;
    column_count: number;
    table_number: number;
    has_header_row: boolean;
    rows: Array<{
      row_index: number;
      type: 'header' | 'row';
      cells: Array<{
        row_index: number;
        column_index: number;
        column_key: string;
        content: string;
        confidence?: number;
        token_count?: number;
        bbox?: number[];
      }>;
    }>;
  }>;
  column_bands: Record<string, [number, number]>;
  columns_detected: number;
  header_y_threshold: number;
  total_tokens: number;
  data_tokens: number;
  data_rows: number;
  extracted_at: string;
  _template_locked?: boolean;
  _template_id?: string | number;
  _ambiguous_tokens?: number;
  _total_assigned_tokens?: number;
}

// ── Token type (matches generic_table.js output) ─────────────────────────────

export interface WordToken {
  text: string;
  confidence: number;
  /** Normalized bounding box [x_min, y_min, x_max, y_max] in [0..1] */
  bbox: [number, number, number, number];
  /** Center X normalized */
  cx: number;
  /** Center Y normalized */
  cy: number;
}

// ── Built-in templates for known ledger formats ──────────────────────────────

const BUILTIN_TEMPLATES: TemplateSpec[] = [
  {
    templateId: 'baptism_1950_v1',
    name: 'Baptism Ledger (1950+)',
    recordType: 'baptism',
    headerCutNorm: 0.12,
    columns: [
      { key: 'number', x0Norm: 0.000, x1Norm: 0.060, required: true, aliases: ['no', '#', 'αρ', 'номер'] },
      { key: 'date', x0Norm: 0.060, x1Norm: 0.150, required: true, aliases: ['date', 'ημερ', 'дата'] },
      { key: 'child_name', x0Norm: 0.150, x1Norm: 0.350, required: true, aliases: ['name', 'child', 'όνομα', 'имя'] },
      { key: 'parents', x0Norm: 0.350, x1Norm: 0.550, required: false, aliases: ['parents', 'father', 'γονείς', 'родител'] },
      { key: 'sponsors', x0Norm: 0.550, x1Norm: 0.750, required: false, aliases: ['sponsor', 'godparent', 'ανάδοχ', 'крестн'] },
      { key: 'priest', x0Norm: 0.750, x1Norm: 0.900, required: false, aliases: ['priest', 'clergy', 'ιερεύς', 'священ'] },
      { key: 'notes', x0Norm: 0.900, x1Norm: 1.000, required: false, aliases: ['notes', 'remarks', 'σημειώσ', 'примеч'] },
    ],
    rowModel: { mergeGapFrac: 0.6, maxRows: 200 },
  },
  {
    templateId: 'marriage_1950_v1',
    name: 'Marriage Ledger (1950+)',
    recordType: 'marriage',
    headerCutNorm: 0.15,
    columns: [
      { key: 'number', x0Norm: 0.020, x1Norm: 0.060, required: true, aliases: ['no', '#', 'αρ'] },
      { key: 'date', x0Norm: 0.060, x1Norm: 0.125, required: true, aliases: ['date', 'ημερ', 'дата'] },
      { key: 'groom', x0Norm: 0.125, x1Norm: 0.290, required: true, aliases: ['groom', 'husband', 'γαμβρός'] },
      { key: 'groom_parents', x0Norm: 0.290, x1Norm: 0.345, required: false, aliases: ['parents'] },
      { key: 'bride', x0Norm: 0.345, x1Norm: 0.475, required: true, aliases: ['bride', 'wife', 'νύφη'] },
      { key: 'bride_parents', x0Norm: 0.475, x1Norm: 0.550, required: false, aliases: ['parents'] },
      { key: 'priest', x0Norm: 0.550, x1Norm: 0.645, required: false, aliases: ['priest', 'ιερεύς'] },
      { key: 'witnesses', x0Norm: 0.645, x1Norm: 0.825, required: false, aliases: ['witness', 'μάρτυρ'] },
      { key: 'license', x0Norm: 0.825, x1Norm: 1.000, required: false, aliases: ['license', 'permit'] },
    ],
    rowModel: { mergeGapFrac: 0.6, maxRows: 200 },
  },
  {
    templateId: 'funeral_1950_v1',
    name: 'Funeral Ledger (1950+)',
    recordType: 'funeral',
    headerCutNorm: 0.26,
    columns: [
      { key: 'number', x0Norm: 0.000, x1Norm: 0.060, required: true, aliases: ['no', '#'] },
      { key: 'date', x0Norm: 0.060, x1Norm: 0.150, required: true, aliases: ['date', 'ημερ', 'дата'] },
      { key: 'deceased_name', x0Norm: 0.150, x1Norm: 0.350, required: true, aliases: ['name', 'deceased', 'θανόντ', 'усопш'] },
      { key: 'age', x0Norm: 0.350, x1Norm: 0.420, required: false, aliases: ['age', 'ηλικία', 'возраст'] },
      { key: 'cause', x0Norm: 0.420, x1Norm: 0.600, required: false, aliases: ['cause', 'αιτία', 'причин'] },
      { key: 'burial_place', x0Norm: 0.600, x1Norm: 0.780, required: false, aliases: ['burial', 'cemetery', 'ταφή', 'кладбищ'] },
      { key: 'priest', x0Norm: 0.780, x1Norm: 0.900, required: false, aliases: ['priest', 'ιερεύς', 'священ'] },
      { key: 'notes', x0Norm: 0.900, x1Norm: 1.000, required: false, aliases: ['notes', 'remarks'] },
    ],
    rowModel: { mergeGapFrac: 0.6, maxRows: 200 },
  },
];

// ── Template loading ─────────────────────────────────────────────────────────

/**
 * Load a TemplateSpec from a DB extractor row.
 * Adapts the existing column_bands format into TemplateSpec.
 */
export function templateFromExtractorRow(row: any): TemplateSpec | null {
  if (!row || !row.column_bands) return null;

  let bands: any = row.column_bands;
  if (typeof bands === 'string') {
    try { bands = JSON.parse(bands); } catch { return null; }
  }

  // Bands can be [[x0, x1], ...] or {key: [x0, x1], ...}
  let columns: TemplateColumn[];

  if (Array.isArray(bands)) {
    columns = bands.map((b: any, i: number) => {
      const arr = Array.isArray(b) ? b : [b.start ?? b.x0 ?? 0, b.end ?? b.x1 ?? 1];
      return {
        key: b.key ?? `col_${i + 1}`,
        x0Norm: arr[0],
        x1Norm: arr[1],
        required: b.required ?? false,
        aliases: b.aliases ?? [],
      };
    });
  } else if (typeof bands === 'object') {
    columns = Object.entries(bands).map(([key, val]: [string, any]) => {
      const arr = Array.isArray(val) ? val : [val.start ?? val.x0 ?? 0, val.end ?? val.x1 ?? 1];
      return {
        key,
        x0Norm: arr[0],
        x1Norm: arr[1],
        required: false,
      };
    });
  } else {
    return null;
  }

  return {
    templateId: row.id ?? 'db_unknown',
    name: row.name ?? `Template ${row.id}`,
    recordType: row.record_type ?? 'unknown',
    headerCutNorm: row.header_y_threshold ?? 0.12,
    columns,
    rowModel: { mergeGapFrac: 0.6, maxRows: 200 },
  };
}

/**
 * Get a built-in template by record type. Returns null if no match.
 */
export function getBuiltinTemplate(recordType: string): TemplateSpec | null {
  return BUILTIN_TEMPLATES.find(t => t.recordType === recordType) ?? null;
}

/**
 * Get all built-in template specs.
 */
export function getBuiltinTemplates(): TemplateSpec[] {
  return [...BUILTIN_TEMPLATES];
}

// ── Template selection ───────────────────────────────────────────────────────

/**
 * Select best template for a page.
 *
 * Priority:
 *   1. Explicit template (from DB extractor row)
 *   2. Built-in template matching record type
 *   3. null (fallback to generic extraction)
 */
export function selectTemplate(
  recordType: string,
  extractorRow: any | null,
): TemplateMatchResult {
  const candidates: Array<{ templateId: string | number; score: number }> = [];
  const reasons: string[] = [];

  // Priority 1: Explicit DB template
  if (extractorRow) {
    const dbTemplate = templateFromExtractorRow(extractorRow);
    if (dbTemplate) {
      candidates.push({ templateId: dbTemplate.templateId, score: 1.0 });
      reasons.push(`DB_TEMPLATE:${dbTemplate.templateId}`);
      return {
        method: 'template_selector_v1',
        selectedTemplateId: dbTemplate.templateId,
        confidence: 1.0,
        reasons,
        candidates,
      };
    }
  }

  // Priority 2: Built-in template for record type
  const builtin = getBuiltinTemplate(recordType);
  if (builtin) {
    candidates.push({ templateId: builtin.templateId, score: 0.85 });
    reasons.push(`BUILTIN_MATCH:${builtin.templateId}`);
    return {
      method: 'template_selector_v1',
      selectedTemplateId: builtin.templateId,
      confidence: 0.85,
      reasons,
      candidates,
    };
  }

  // Priority 3: No match — fallback
  reasons.push('NO_TEMPLATE_MATCH');
  return {
    method: 'template_selector_v1',
    selectedTemplateId: null,
    confidence: 0,
    reasons,
    candidates,
  };
}

/**
 * Resolve the TemplateSpec to use from selection result + available sources.
 */
export function resolveTemplate(
  matchResult: TemplateMatchResult,
  extractorRow: any | null,
  recordType: string,
): TemplateSpec | null {
  if (matchResult.selectedTemplateId === null) return null;

  // Try DB extractor first
  if (extractorRow) {
    const t = templateFromExtractorRow(extractorRow);
    if (t) return t;
  }

  // Fall back to built-in
  return getBuiltinTemplate(recordType);
}

// ── Template-locked extraction engine ────────────────────────────────────────

/**
 * Extract tokens from a Vision API result (same as generic_table.js extractWordTokens).
 */
export function extractTokens(visionJson: any, pageIndex: number = 0): WordToken[] {
  const tokens: WordToken[] = [];
  const pages = visionJson?.pages || [];
  if (pageIndex >= pages.length) return tokens;

  const page = pages[pageIndex];
  const pageW = page.width || 1;
  const pageH = page.height || 1;

  for (const block of page.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const word of paragraph.words || []) {
        const text = word.text || (word.symbols || []).map((s: any) => s.text).join('');
        if (!text.trim()) continue;

        const vertices = word.boundingBox?.vertices || [];
        if (vertices.length < 4) continue;

        const xs = vertices.map((v: any) => (v.x || 0) / pageW);
        const ys = vertices.map((v: any) => (v.y || 0) / pageH);

        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        const yMin = Math.min(...ys);
        const yMax = Math.max(...ys);

        tokens.push({
          text,
          confidence: word.confidence ?? 0,
          bbox: [xMin, yMin, xMax, yMax],
          cx: (xMin + xMax) / 2,
          cy: (yMin + yMax) / 2,
        });
      }
    }
  }

  return tokens;
}

/**
 * Cluster tokens into rows by Y-center proximity.
 * Uses adaptive epsilon based on median token height.
 */
export function clusterRows(tokens: WordToken[], mergeGapFrac: number = 0.6): WordToken[][] {
  if (tokens.length === 0) return [];

  // Compute median token height
  const heights = tokens.map(t => t.bbox[3] - t.bbox[1]).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 0.01;
  const epsilon = medianH * mergeGapFrac;

  // Sort by Y-center
  const sorted = [...tokens].sort((a, b) => a.cy - b.cy);

  const rows: WordToken[][] = [];
  let currentRow: WordToken[] = [sorted[0]];
  let currentCy = sorted[0].cy;

  for (let i = 1; i < sorted.length; i++) {
    const t = sorted[i];
    if (Math.abs(t.cy - currentCy) <= epsilon) {
      currentRow.push(t);
    } else {
      // Sort row by X position
      currentRow.sort((a, b) => a.cx - b.cx);
      rows.push(currentRow);
      currentRow = [t];
      currentCy = t.cy;
    }
  }

  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.cx - b.cx);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Assign tokens to template columns based on bbox overlap.
 * Returns cells and ambiguity count.
 */
function assignTokensToColumns(
  rowTokens: WordToken[],
  columns: TemplateColumn[],
): { cells: Array<{ key: string; tokens: WordToken[]; content: string; confidence: number; tokenCount: number; bbox: number[] | null }>; ambiguousCount: number } {
  const cells = columns.map(col => ({
    key: col.key,
    tokens: [] as WordToken[],
    content: '',
    confidence: 0,
    tokenCount: 0,
    bbox: null as number[] | null,
  }));

  let ambiguousCount = 0;

  for (const token of rowTokens) {
    const tokenCx = token.cx;
    const tokenXMin = token.bbox[0];
    const tokenXMax = token.bbox[2];

    // Find best column by center overlap
    let bestColIdx = -1;
    let bestOverlap = 0;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      // Overlap between token bbox and column band
      const overlapStart = Math.max(tokenXMin, col.x0Norm);
      const overlapEnd = Math.min(tokenXMax, col.x1Norm);
      const overlap = Math.max(0, overlapEnd - overlapStart);

      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestColIdx = i;
      }
    }

    // Check if center falls in a different column (ambiguity)
    if (bestColIdx >= 0) {
      const bestCol = columns[bestColIdx];
      const centerInBest = tokenCx >= bestCol.x0Norm && tokenCx <= bestCol.x1Norm;

      if (!centerInBest) {
        // Center is in a different column than max overlap — ambiguous
        ambiguousCount++;
      }

      cells[bestColIdx].tokens.push(token);
    }
  }

  // Build cell content
  for (const cell of cells) {
    if (cell.tokens.length > 0) {
      cell.content = cell.tokens.map(t => t.text).join(' ');
      cell.confidence = cell.tokens.reduce((s, t) => s + t.confidence, 0) / cell.tokens.length;
      cell.tokenCount = cell.tokens.length;

      const xs = cell.tokens.flatMap(t => [t.bbox[0], t.bbox[2]]);
      const ys = cell.tokens.flatMap(t => [t.bbox[1], t.bbox[3]]);
      cell.bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
  }

  return { cells, ambiguousCount };
}

/**
 * Adapt template coordinates dynamically to the actual page contents (scaling & gap-snapping).
 */
export function adaptTemplateSpec(
  visionJson: any,
  template: TemplateSpec,
  pageIndex: number = 0
): TemplateSpec {
  const allTokens = extractTokens(visionJson, pageIndex);
  if (allTokens.length < 10) return template;

  // Filter out headers and marginal noise
  const dataTokens = allTokens.filter(t => t.cy >= template.headerCutNorm && t.cx > 0.01 && t.cx < 0.98);
  if (dataTokens.length < 5) return template;

  // 1. Estimate table horizontal bounds using percentiles of token centers
  const sortedXs = dataTokens.map(t => t.cx).sort((a, b) => a - b);
  const tableLeft = sortedXs[Math.floor(sortedXs.length * 0.02)] || 0.01;
  const tableRight = sortedXs[Math.floor(sortedXs.length * 0.98)] || 0.99;

  // 2. Cluster data tokens into Y-axis rows to build occupancy histogram
  const rowTol = 0.015;
  const sortedByY = [...dataTokens].sort((a, b) => a.cy - b.cy);
  const rows: WordToken[][] = [];
  let curRow = [sortedByY[0]];
  let curCy = sortedByY[0].cy;
  for (let i = 1; i < sortedByY.length; i++) {
    const t = sortedByY[i];
    if (Math.abs(t.cy - curCy) <= rowTol) {
      curRow.push(t);
    } else {
      rows.push(curRow);
      curRow = [t];
      curCy = t.cy;
    }
  }
  if (curRow.length > 0) rows.push(curRow);

  const BINS = 200;
  const coverage = new Float32Array(BINS);
  for (const row of rows) {
    const rowBins = new Set<number>();
    for (const t of row) {
      const startBin = Math.max(0, Math.floor(t.bbox[0] * BINS));
      const endBin = Math.min(BINS - 1, Math.floor(t.bbox[2] * BINS));
      for (let b = startBin; b <= endBin; b++) {
        rowBins.add(b);
      }
    }
    for (const b of rowBins) {
      coverage[b]++;
    }
  }

  const threshold = rows.length * 0.12;
  const gaps: Array<{ start: number; end: number; center: number }> = [];
  let gapStart: number | null = null;
  for (let b = 0; b < BINS; b++) {
    if (coverage[b] < threshold) {
      if (gapStart === null) gapStart = b;
    } else {
      if (gapStart !== null) {
        gaps.push({ start: gapStart / BINS, end: b / BINS, center: ((gapStart + b) / 2) / BINS });
        gapStart = null;
      }
    }
  }
  if (gapStart !== null) {
    gaps.push({ start: gapStart / BINS, end: 1.0, center: ((gapStart + BINS) / 2) / BINS });
  }

  // 3. Map & snap template coordinates
  const snapWindow = 0.04;
  const boundaries: number[] = [];
  for (let i = 0; i <= template.columns.length; i++) {
    let originalX = i === 0 ? 0.0 : template.columns[i - 1].x1Norm;
    let scaledX = tableLeft + originalX * (tableRight - tableLeft);
    if (i === 0) scaledX = 0.0;
    if (i === template.columns.length) scaledX = 1.0;
    boundaries.push(scaledX);
  }

  for (let i = 1; i < boundaries.length - 1; i++) {
    const target = boundaries[i];
    let closestGap: number | null = null;
    let minDist = snapWindow;
    for (const gap of gaps) {
      const dist = Math.abs(gap.center - target);
      if (dist < minDist) {
        minDist = dist;
        closestGap = gap.center;
      }
    }
    if (closestGap !== null) {
      boundaries[i] = closestGap;
    }
  }

  // Re-assign boundaries to template columns
  const adaptedColumns = template.columns.map((col, i) => ({
    ...col,
    x0Norm: boundaries[i],
    x1Norm: boundaries[i + 1],
  }));

  console.log(`  [AdaptiveTemplateSpec] Adapted coordinates for template ${template.templateId} using width [${tableLeft.toFixed(3)}, ${tableRight.toFixed(3)}]`);

  return {
    ...template,
    columns: adaptedColumns,
  };
}

/**
 * Template-locked table extraction.
 *
 * Extracts tokens from Vision JSON, clusters into rows, assigns to
 * fixed column bands from the template, and produces a table_extraction.json
 * compatible output.
 */
export function extractWithTemplate(
  visionJson: any,
  template: TemplateSpec,
  opts?: { pageIndex?: number },
): TemplateExtractionResult {
  const pageIndex = opts?.pageIndex ?? 0;
  const pages = visionJson?.pages || [];
  const page = pages[pageIndex];
  const pageW = page?.width || 1;
  const pageH = page?.height || 1;

  // Try to adapt the template coordinates dynamically to the page
  let activeTemplate = template;
  try {
    activeTemplate = adaptTemplateSpec(visionJson, template, pageIndex);
  } catch (adaptErr: any) {
    console.warn(`  [AdaptiveTemplateSpec] Coordinate scaling failed (using default): ${adaptErr.message}`);
  }

  // 1. Extract tokens
  const allTokens = extractTokens(visionJson, pageIndex);
  const totalTokens = allTokens.length;

  // 2. Filter tokens below header cut
  const headerCut = activeTemplate.headerCutNorm;
  const headerTokens = allTokens.filter(t => t.cy < headerCut);
  const dataTokens = allTokens.filter(t => t.cy >= headerCut);

  // 3. Cluster data tokens into rows
  const mergeGapFrac = activeTemplate.rowModel?.mergeGapFrac ?? 0.6;
  const maxRows = activeTemplate.rowModel?.maxRows ?? 200;
  let dataRows = clusterRows(dataTokens, mergeGapFrac);

  // Apply stop keywords
  const stopKw = activeTemplate.rowModel?.stopKeywords;
  if (stopKw && stopKw.length > 0) {
    const stopSet = new Set(stopKw.map(k => k.toLowerCase()));
    const stopIdx = dataRows.findIndex(row => {
      const rowText = row.map(t => t.text).join(' ').toLowerCase().trim();
      return stopSet.has(rowText);
    });
    if (stopIdx >= 0) {
      dataRows = dataRows.slice(0, stopIdx);
    }
  }

  // Cap rows
  if (dataRows.length > maxRows) {
    dataRows = dataRows.slice(0, maxRows);
  }

  // 4. Build header row from header tokens
  const headerRow = clusterRows(headerTokens, mergeGapFrac);
  const headerAssignment = headerRow.length > 0
    ? assignTokensToColumns(headerRow.flat(), activeTemplate.columns)
    : { cells: activeTemplate.columns.map(c => ({ key: c.key, tokens: [], content: '', confidence: 0, tokenCount: 0, bbox: null })), ambiguousCount: 0 };

  // 5. Assign data tokens to columns per row
  let totalAmbiguous = headerAssignment.ambiguousCount;
  let totalAssigned = headerAssignment.cells.reduce((s, c) => s + c.tokenCount, 0);
  let dataTokenCount = 0;

  const tableRows: any[] = [];

  // Header row
  tableRows.push({
    row_index: 0,
    type: 'header',
    cells: headerAssignment.cells.map((cell, ci) => ({
      row_index: 0,
      column_index: ci,
      column_key: cell.key,
      content: cell.content,
    })),
  });

  // Data rows
  for (let ri = 0; ri < dataRows.length; ri++) {
    const row = dataRows[ri];
    const { cells, ambiguousCount } = assignTokensToColumns(row, activeTemplate.columns);
    totalAmbiguous += ambiguousCount;
    totalAssigned += cells.reduce((s, c) => s + c.tokenCount, 0);
    dataTokenCount += cells.reduce((s, c) => s + c.tokenCount, 0);

    tableRows.push({
      row_index: ri + 1,
      type: 'row',
      cells: cells.map((cell, ci) => ({
        row_index: ri + 1,
        column_index: ci,
        column_key: cell.key,
        content: cell.content,
        ...(cell.confidence > 0 ? { confidence: Math.round(cell.confidence * 1000) / 1000 } : {}),
        ...(cell.tokenCount > 0 ? { token_count: cell.tokenCount } : {}),
        ...(cell.bbox ? { bbox: cell.bbox } : {}),
      })),
    });
  }

  // 6. Build column_bands
  const columnBands: Record<string, [number, number]> = {};
  for (const col of activeTemplate.columns) {
    columnBands[col.key] = [col.x0Norm, col.x1Norm];
  }

  return {
    layout_id: `template_locked_${activeTemplate.templateId}`,
    page_number: pageIndex + 1,
    page_dimensions: { width: pageW, height: pageH },
    tables: [{
      row_count: tableRows.length,
      column_count: activeTemplate.columns.length,
      table_number: 1,
      has_header_row: true,
      rows: tableRows,
    }],
    column_bands: columnBands,
    columns_detected: activeTemplate.columns.length,
    header_y_threshold: headerCut,
    total_tokens: totalTokens,
    data_tokens: dataTokenCount,
    data_rows: dataRows.length,
    extracted_at: new Date().toISOString(),
    _template_locked: true,
    _template_id: activeTemplate.templateId,
    _ambiguous_tokens: totalAmbiguous,
    _total_assigned_tokens: totalAssigned,
  };
}
