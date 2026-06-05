/**
 * Marriage Ledger v1 — Layout-first table extractor
 *
 * Reads Vision API word-level tokens (already saved in ocr_result_json),
 * clusters them into table rows by Y-position, then scopes each row
 * into column bands to produce structured output matching the
 * HandwritingOCR "Extract Tables" two-table contract.
 *
 * Output shape matches:
 *   Table 1 (6 cols): number, date, groom, groom_parents, bride, bride_parents
 *   Table 2 (3 cols): priest, witnesses, license
 *
 * Column bands are defined as percent-of-page width, calibrated from
 * the standard OCAR Marriage Metrical Book layout.
 */

'use strict';

// ── Layout Config ────────────────────────────────────────────────────────────

const LAYOUT_ID = 'marriage_ledger_v1';

/**
 * Column bands: [x_start, x_end] as fraction of page width (0..1).
 * Derived from the test image (IMG_2024_10_22_11_28_38S.jpg).
 * The marriage ledger has 9 columns separated by vertical rules,
 * split into two logical tables.
 */
const TABLE1_COLUMNS = {
  number:         [0.020, 0.060],
  date:           [0.060, 0.125],
  groom:          [0.125, 0.290],
  groom_parents:  [0.290, 0.345],
  bride:          [0.345, 0.475],
  bride_parents:  [0.475, 0.550],
};

const TABLE2_COLUMNS = {
  priest:         [0.550, 0.645],
  witnesses:      [0.645, 0.825],
  license:        [0.825, 1.000],
};

const TABLE1_KEYS = Object.keys(TABLE1_COLUMNS);
const TABLE2_KEYS = Object.keys(TABLE2_COLUMNS);

// Combined for token extraction
const ALL_COLUMN_BANDS = { ...TABLE1_COLUMNS, ...TABLE2_COLUMNS };
const ALL_COLUMN_KEYS = [...TABLE1_KEYS, ...TABLE2_KEYS];

/**
 * Header region: everything above this Y threshold (fraction of page height)
 * is considered header / title and excluded from data rows.
 * Calibrated from the test image where data starts around y ~0.39.
 */
const HEADER_Y_THRESHOLD = 0.295;

/**
 * Cyrillic header content for each table (from HandwritingOCR golden contract).
 * These are the row_index=0 "header" rows.
 */
const TABLE1_CYRILLIC_HEADERS = [
  'GurTZ BOAKORZ.',
  'M.kcalz H Allb.',
  'Al.keronponexoastatis, nata, samsaid H .kponchon.k panie Kemxa, CROAKKO AKTZ 0TZ 00A8 H KOTOOKIAIZ BOAKOMIZ.',
  'H MATEOH.',
  'M. keroportis Haun, pasHain W KkpoucoR.k MAHie HERKETKI, CKOAKKO AKTZ OTZ 00,48 H \u03ba\u03bf\u03c4\u03cc\u03c1\u03ba\u0399\u039b\u0399\u0396 \u0392\u03a1\u0391\u039a\u039f\u039b\u0399\u0396.',
  'HALEHA OTILA H MATEOH.',
];

const TABLE2_CYRILLIC_HEADERS = [
  'Kro COREpINAAZ. TAHHCTEO.',
  'KTO RMAH HO084HTEAH.',
  '\u041e\u0442 \u043a\u0430\u043a\u043e\u0433\u043e \u0447\u0438\u0441\u043b\u0430 \u0438 \u0437\u0430 \u043a\u0430\u043a\u0438\u043c\u0438 No License.',
];

/**
 * English sub-header content for each table.
 * These are the row_index=1 rows.
 */
const TABLE1_ENGLISH_HEADERS = [
  'NUMBER',
  'DATE',
  'FULL NAME OF GROOM, RESIDENCE, AGE, RELIGION, Ist or 2nd MARRIAGE',
  "FIRST NAMES OF GROOM' S PARENTS",
  'FULL NAME OF BRIDE, RESIDENCE, AGE, RELIGION, Ist or 2nd MARRIAGE',
  "FIRST NAMES OF BRIDE'S PARENTS",
];

const TABLE2_ENGLISH_HEADERS = [
  "PRIEST'S NAME",
  'WITNESSES NAMES',
  'DATE AND NUMBER OF LICENSE',
];

// ── Token Extraction from Vision JSON ────────────────────────────────────────

/**
 * Convert the visionResultJson (as stored in ocr_result_json) into a flat
 * list of word-level tokens with normalized bounding boxes.
 */
function extractWordTokens(visionJson, pageIndex = 0) {
  if (!visionJson || !visionJson.pages || !visionJson.pages[pageIndex]) return [];

  const page = visionJson.pages[pageIndex];
  const W = page.width || 1;
  const H = page.height || 1;
  const tokens = [];

  for (const block of (page.blocks || [])) {
    for (const para of (block.paragraphs || [])) {
      for (const word of (para.words || [])) {
        const text = word.text || '';
        if (!text.trim()) continue;

        const verts = word.boundingBox?.vertices;
        if (!verts || verts.length < 4) continue;

        const xs = verts.map(v => (v.x || 0));
        const ys = verts.map(v => (v.y || 0));
        const x_min = Math.min(...xs) / W;
        const x_max = Math.max(...xs) / W;
        const y_min = Math.min(...ys) / H;
        const y_max = Math.max(...ys) / H;

        tokens.push({
          text,
          confidence: word.confidence ?? null,
          x_min, y_min, x_max, y_max,
          x_center: (x_min + x_max) / 2,
          y_center: (y_min + y_max) / 2,
          height: y_max - y_min,
          page: pageIndex,
        });
      }
    }
  }

  return tokens;
}

// ── Row Segmentation (Y-clustering) ──────────────────────────────────────────

/**
 * Cluster tokens into rows by Y-center.
 * Uses median token height as the merge threshold.
 */
function clusterIntoRows(tokens) {
  if (tokens.length === 0) return [];

  const sorted = [...tokens].sort((a, b) => a.y_center - b.y_center);

  const heights = sorted.map(t => t.height).filter(h => h > 0).sort((a, b) => a - b);
  const medianHeight = heights.length > 0
    ? heights[Math.floor(heights.length / 2)]
    : 0.02;
  const mergeThreshold = medianHeight * 1.2;

  const rows = [];
  let currentRow = [sorted[0]];
  let currentYCenter = sorted[0].y_center;

  for (let i = 1; i < sorted.length; i++) {
    const t = sorted[i];
    if (Math.abs(t.y_center - currentYCenter) <= mergeThreshold) {
      currentRow.push(t);
      currentYCenter = currentRow.reduce((s, r) => s + r.y_center, 0) / currentRow.length;
    } else {
      rows.push(currentRow);
      currentRow = [t];
      currentYCenter = t.y_center;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  return rows;
}

/**
 * Merge text rows that belong to the same ledger entry.
 *
 * Strategy: Two signals for record boundaries:
 * 1. Y-gap threshold (Otsu-style): large gaps between text rows
 * 2. Date column marker: a date-like token in the DATE column band
 *    indicates the start of a new record, even without a large Y gap.
 *
 * The date column approach is critical because marriage ledger entries
 * can be densely packed vertically with no visible gap between them.
 */
// Match full date (M/D/YYYY), or partial date (M/D without year).
// Vision API often splits "6/12/2005" into two tokens: "6/12" + "2005".
const DATE_PATTERN = /^\d{1,2}[-\/]\d{1,2}([-\/]\d{2,4})?$/;
const DATE_COL_BAND = TABLE1_COLUMNS.date; // [0.060, 0.125]

function rowHasDateToken(tokenRow) {
  for (const t of tokenRow) {
    if (t.x_center >= DATE_COL_BAND[0] && t.x_center < DATE_COL_BAND[1]) {
      if (DATE_PATTERN.test(t.text)) return true;
    }
  }
  return false;
}

function mergeLedgerRows(tokenRows, fixedGapThreshold = 0.025) {
  if (tokenRows.length <= 1) return tokenRows;

  const rowYCenters = tokenRows.map(row =>
    row.reduce((s, t) => s + t.y_center, 0) / row.length
  );

  const gaps = [];
  for (let i = 1; i < rowYCenters.length; i++) {
    gaps.push(rowYCenters[i] - rowYCenters[i - 1]);
  }
  if (gaps.length === 0) return tokenRows;

  let threshold;
  if (gaps.length >= 2) {
    const sortedGaps = [...gaps].sort((a, b) => b - a);
    const largest = sortedGaps[0];
    const secondLargest = sortedGaps[1];
    threshold = (largest + secondLargest) / 2;
    if (threshold < 0.01) threshold = fixedGapThreshold;
  } else {
    threshold = fixedGapThreshold;
  }

  const merged = [tokenRows[0]];
  for (let i = 1; i < tokenRows.length; i++) {
    const gap = gaps[i - 1];
    const hasDate = rowHasDateToken(tokenRows[i]);
    // Start a new record if: large Y gap OR a date token appears in this row
    if (gap >= threshold || hasDate) {
      merged.push(tokenRows[i]);
    } else {
      merged[merged.length - 1] = [...merged[merged.length - 1], ...tokenRows[i]];
    }
  }

  return merged;
}

// ── Cell-scoped Extraction ───────────────────────────────────────────────────

/**
 * For a given row (array of tokens) and column band [x_start, x_end],
 * select tokens whose x_center falls within the band,
 * sort left-to-right then top-to-bottom, and join with spaces.
 */
function extractCell(rowTokens, xStart, xEnd) {
  const inBand = rowTokens.filter(t => t.x_center >= xStart && t.x_center < xEnd);
  if (inBand.length === 0) {
    return { text: '', confidence: null, token_count: 0, bbox: null, tokens: [] };
  }

  inBand.sort((a, b) => {
    const yDiff = a.y_center - b.y_center;
    if (Math.abs(yDiff) > (a.height || 0.01)) return yDiff;
    return a.x_center - b.x_center;
  });

  const text = inBand.map(t => t.text).join(' ');
  const confidences = inBand.map(t => t.confidence).filter(c => c != null);
  const avgConf = confidences.length > 0
    ? confidences.reduce((s, c) => s + c, 0) / confidences.length
    : null;
  const minConf = confidences.length > 0 ? Math.min(...confidences) : null;

  const bbox = [
    Math.min(...inBand.map(t => t.x_min)),
    Math.min(...inBand.map(t => t.y_min)),
    Math.max(...inBand.map(t => t.x_max)),
    Math.max(...inBand.map(t => t.y_max)),
  ];

  return {
    text,
    confidence: avgConf != null ? Math.round(avgConf * 100) / 100 : null,
    confidence_min: minConf != null ? Math.round(minConf * 100) / 100 : null,
    token_count: inBand.length,
    bbox,
    tokens: inBand,
  };
}

// ── Validators (Phase 4 — light) ─────────────────────────────────────────────

function validateCell(columnKey, cell) {
  const reasons = [];

  if (!cell.text.trim()) {
    return { needs_review: true, reasons: ['empty'] };
  }

  if (cell.confidence_min != null && cell.confidence_min < 0.5) {
    reasons.push('low_confidence');
  }

  switch (columnKey) {
    case 'number': {
      if (!/^\d+$/.test(cell.text.trim())) {
        reasons.push('expected_integer');
      }
      break;
    }
    case 'date': {
      if (!/^\d{1,2}\/\d{1,2}$/.test(cell.text.trim())) {
        reasons.push('expected_date_md');
      }
      break;
    }
    case 'license': {
      const t = cell.text.trim();
      const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(t);
      const hasNumber = /#/.test(t);
      if (!hasDate && !hasNumber) {
        reasons.push('expected_license_format');
      }
      break;
    }
  }

  return {
    needs_review: reasons.length > 0,
    reasons: reasons.length > 0 ? reasons : undefined,
  };
}

// ── Build HandwritingOCR-compatible table objects ─────────────────────────────

/**
 * Build a single table object matching the HandwritingOCR contract.
 *
 * @param {number} tableNumber — 1 or 2
 * @param {string[]} columnKeys — column names for this table
 * @param {object} columnBands — column band config for this table
 * @param {string[]} cyrillicHeaders — Cyrillic header cell contents
 * @param {string[]} englishHeaders — English sub-header cell contents
 * @param {Array<Array>} ledgerRows — merged token rows (data only)
 * @returns {object} table matching contract shape
 */
function buildTable(tableNumber, columnKeys, columnBands, cyrillicHeaders, englishHeaders, ledgerRows) {
  const rows = [];

  // Row 0: Cyrillic header
  rows.push({
    row_index: 0,
    type: 'header',
    cells: cyrillicHeaders.map((content, colIdx) => ({
      kind: 'columnHeader',
      row_index: 0,
      column_index: colIdx,
      content,
    })),
  });

  // Row 1: English sub-header
  rows.push({
    row_index: 1,
    type: 'row',
    cells: englishHeaders.map((content, colIdx) => ({
      row_index: 1,
      column_index: colIdx,
      content,
    })),
  });

  // Data rows (row_index starts at 2)
  ledgerRows.forEach((rowTokens, dataIdx) => {
    const rowIndex = dataIdx + 2;
    const cells = columnKeys.map((colKey, colIdx) => {
      const [xStart, xEnd] = columnBands[colKey];
      const cell = extractCell(rowTokens, xStart, xEnd);
      const validation = validateCell(colKey, cell);
      return {
        row_index: rowIndex,
        column_index: colIdx,
        content: cell.text,
        confidence: cell.confidence,
        confidence_min: cell.confidence_min,
        token_count: cell.token_count,
        bbox: cell.bbox,
        needs_review: validation.needs_review || false,
        reasons: validation.reasons,
      };
    });
    rows.push({ row_index: rowIndex, type: 'row', cells });
  });

  return {
    row_count: rows.length,
    column_count: columnKeys.length,
    table_number: tableNumber,
    has_header_row: true,
    header_content: cyrillicHeaders.join('|'),
    rows,
  };
}

// ── Main Extractor ───────────────────────────────────────────────────────────

/**
 * Extract tables from a Vision API JSON result.
 * Produces the two-table structure matching the HandwritingOCR contract.
 *
 * @param {object} visionJson — The stored ocr_result_json
 * @param {object} [opts]
 * @param {number} [opts.pageIndex=0] — Which page to process
 * @param {number} [opts.headerY] — Override header Y threshold
 * @returns {object} table_extraction.json shaped output
 */
function extractMarriageLedgerTable(visionJson, opts = {}) {
  const pageIndex = opts.pageIndex || 0;
  const headerY = opts.headerY || HEADER_Y_THRESHOLD;

  // Step 1: Get word tokens
  const allTokens = extractWordTokens(visionJson, pageIndex);

  // Step 2: Filter to data region (below header) and remove header words
  const HEADER_WORDS = new Set([
    'NUMBER', 'DATE', 'FULL', 'NAME', 'OF', 'GROOM', 'RESIDENCE', 'AGE',
    'RELIGION', 'MARRIAGE', 'FIRST', 'NAMES', 'PARENTS', "GROOM'S", "BRIDE'S",
    'BRIDE', 'PRIEST', "PRIEST'S", 'WITNESSES', 'AND', 'LICENSE', 'MARRIAGES',
    'YEAR', 'OR',
  ]);
  const dataTokens = allTokens.filter(t => {
    if (t.y_center <= headerY) return false;
    if (t.y_center < headerY + 0.02 && HEADER_WORDS.has(t.text.toUpperCase().replace(/[^A-Z']/g, ''))) return false;
    return true;
  });

  // Step 3: Cluster into text rows by Y
  const textRows = clusterIntoRows(dataTokens);

  // Step 4: Merge multi-line entries into ledger rows
  const ledgerRows = mergeLedgerRows(textRows);

  // Step 5: Build two-table output matching HandwritingOCR contract
  const table1 = buildTable(
    1, TABLE1_KEYS, TABLE1_COLUMNS,
    TABLE1_CYRILLIC_HEADERS, TABLE1_ENGLISH_HEADERS,
    ledgerRows
  );

  const table2 = buildTable(
    2, TABLE2_KEYS, TABLE2_COLUMNS,
    TABLE2_CYRILLIC_HEADERS, TABLE2_ENGLISH_HEADERS,
    ledgerRows
  );

  // Compute page dimensions
  const page = visionJson?.pages?.[pageIndex];
  const pageWidth = page?.width || null;
  const pageHeight = page?.height || null;

  return {
    layout_id: LAYOUT_ID,
    page_number: pageIndex + 1,
    page_dimensions: pageWidth && pageHeight ? { width: pageWidth, height: pageHeight } : null,
    tables: [table1, table2],
    column_bands: ALL_COLUMN_BANDS,
    header_y_threshold: headerY,
    total_tokens: allTokens.length,
    data_tokens: dataTokens.length,
    data_rows: ledgerRows.length,
    extracted_at: new Date().toISOString(),
  };
}

module.exports = {
  LAYOUT_ID,
  TABLE1_COLUMNS,
  TABLE2_COLUMNS,
  ALL_COLUMN_BANDS,
  TABLE1_KEYS,
  TABLE2_KEYS,
  ALL_COLUMN_KEYS,
  HEADER_Y_THRESHOLD,
  extractWordTokens,
  clusterIntoRows,
  mergeLedgerRows,
  extractCell,
  validateCell,
  buildTable,
  extractMarriageLedgerTable,
};
