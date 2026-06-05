/**
 * Generic Table Extractor — Layout-agnostic table structure detector
 *
 * Works for any record type (baptism, funeral, unknown) by:
 *   1. Extracting word tokens from Vision API JSON
 *   2. Filtering out header region
 *   3. Y-clustering tokens into text rows
 *   4. Auto-detecting column boundaries via X-gap analysis
 *   5. Extracting cells from each row × column intersection
 *
 * Does NOT assume a specific layout — column positions are inferred
 * from vertical whitespace gaps in the data itself.
 */

'use strict';

const LAYOUT_ID = 'generic_table_v1';

/**
 * Header Y threshold — tokens above this fraction of page height
 * are treated as headers/titles. Adjustable per call.
 */
const DEFAULT_HEADER_Y = 0.15;

// ── Token Extraction ─────────────────────────────────────────────────────────

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
          width: x_max - x_min,
          page: pageIndex,
        });
      }
    }
  }

  return tokens;
}

// ── Auto-detect header boundary ──────────────────────────────────────────────

/**
 * Scan the first few rows of text to find where column headers end and data begins.
 * Returns the Y threshold (fractional) just below the last header row, or null if
 * no header rows are detected.
 */
function autoDetectHeaderY(textRows) {
  const HEADER_KEYWORDS = /\b(NUMBER|DATE|NAME|MALE|FEMALE|AGE|RELIGION|MARRIAGE|DEATH|BURIAL|YEAR|PRIEST|WITNESS|CAUSE|RESIDENCE|PARENTS|FULL|INTERNMENT|SACRAMENT|PLACE|BORN|BAPTISM|RECORD|REMARKS|SPONSOR|GODPARENT|CHURCH|PARISH)\b/i;
  const DATA_PATTERN = /\b\d{1,2}[-\/]\d{1,2}\b/; // Date patterns like "1-03", "2/25"

  let lastHeaderRowIdx = -1;
  const limit = Math.min(textRows.length, 8); // Only check first 8 rows

  for (let i = 0; i < limit; i++) {
    const rowText = textRows[i].map(t => t.text).join(' ');
    const hasHeaders = HEADER_KEYWORDS.test(rowText);
    const hasData = DATA_PATTERN.test(rowText);
    if (hasHeaders && !hasData) {
      lastHeaderRowIdx = i;
    }
  }

  if (lastHeaderRowIdx >= 0) {
    // headerY = just below the last header row
    const lastHeaderYMax = Math.max(...textRows[lastHeaderRowIdx].map(t => t.y_max));
    return lastHeaderYMax + 0.005; // Small margin
  }
  return null;
}

// ── Row Clustering (Y-axis) ──────────────────────────────────────────────────

function clusterIntoRows(tokens, mergeThresholdOverride = null) {
  if (tokens.length === 0) return [];

  const sorted = [...tokens].sort((a, b) => a.y_center - b.y_center);

  const heights = sorted.map(t => t.height).filter(h => h > 0).sort((a, b) => a - b);
  const medianHeight = heights.length > 0
    ? heights[Math.floor(heights.length / 2)]
    : 0.02;
  const mergeThreshold = mergeThresholdOverride || (medianHeight * 1.2);

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

// ── Column Detection (X-gap analysis) ────────────────────────────────────────

/**
 * Detect column boundaries by finding consistent vertical gaps.
 *
 * Strategy:
 *   1. Collect all token X extents across all rows
 *   2. Build a 1D coverage histogram (100 bins across page width)
 *   3. Find consecutive empty bins → column separators
 *   4. Return column bands as [x_start, x_end] pairs
 */
function detectColumns(tokenRows, minGapWidth = 0.02) {
  if (tokenRows.length === 0) return [];

  const BINS = 200;
  const coverage = new Float32Array(BINS);

  // Count how many rows have tokens in each X bin
  for (const row of tokenRows) {
    const rowBins = new Set();
    for (const t of row) {
      const startBin = Math.max(0, Math.floor(t.x_min * BINS));
      const endBin = Math.min(BINS - 1, Math.floor(t.x_max * BINS));
      for (let b = startBin; b <= endBin; b++) {
        rowBins.add(b);
      }
    }
    for (const b of rowBins) {
      coverage[b]++;
    }
  }

  // Threshold: a bin is "occupied" if more than 10% of rows have tokens there
  const occupiedThreshold = tokenRows.length * 0.1;

  // Find column regions (consecutive occupied bins) and gaps (consecutive empty bins)
  const minGapBins = Math.max(1, Math.floor(minGapWidth * BINS));

  // Identify gaps
  const gaps = [];
  let gapStart = null;
  for (let b = 0; b < BINS; b++) {
    if (coverage[b] < occupiedThreshold) {
      if (gapStart === null) gapStart = b;
    } else {
      if (gapStart !== null) {
        const gapLen = b - gapStart;
        if (gapLen >= minGapBins) {
          gaps.push({ start: gapStart / BINS, end: b / BINS, center: ((gapStart + b) / 2) / BINS });
        }
        gapStart = null;
      }
    }
  }

  // Build column bands from gaps
  if (gaps.length === 0) {
    // No gaps found — treat as single column
    return [{ key: 'col_1', band: [0.0, 1.0] }];
  }

  const columns = [];
  let prevEnd = 0.0;
  for (let i = 0; i < gaps.length; i++) {
    const colStart = prevEnd;
    const colEnd = gaps[i].center;
    if (colEnd - colStart > 0.01) { // Min column width
      columns.push({ key: `col_${columns.length + 1}`, band: [colStart, colEnd] });
    }
    prevEnd = gaps[i].center;
  }
  // Last column
  if (1.0 - prevEnd > 0.01) {
    columns.push({ key: `col_${columns.length + 1}`, band: [prevEnd, 1.0] });
  }

  return columns;
}

// ── Cell Extraction ──────────────────────────────────────────────────────────

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

  const bbox = [
    Math.min(...inBand.map(t => t.x_min)),
    Math.min(...inBand.map(t => t.y_min)),
    Math.max(...inBand.map(t => t.x_max)),
    Math.max(...inBand.map(t => t.y_max)),
  ];

  return {
    text,
    confidence: avgConf != null ? Math.round(avgConf * 100) / 100 : null,
    token_count: inBand.length,
    bbox,
    tokens: inBand,
  };
}

// ── Merge multi-line ledger rows ─────────────────────────────────────────────

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

  function mergeWithThreshold(threshold) {
    const result = [tokenRows[0]];
    for (let i = 1; i < tokenRows.length; i++) {
      const gap = gaps[i - 1];
      if (gap < threshold) {
        result[result.length - 1] = [...result[result.length - 1], ...tokenRows[i]];
      } else {
        result.push(tokenRows[i]);
      }
    }
    return result;
  }

  // Use percentile-based threshold: gaps above 75th percentile are row separators
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const p75 = sortedGaps[Math.floor(sortedGaps.length * 0.75)];
  const threshold = Math.max(fixedGapThreshold, p75 * 1.3);

  let merged = mergeWithThreshold(threshold);

  // Safeguard: if many text rows collapsed into too few merged rows, retry with a tighter threshold
  if (tokenRows.length >= 4 && merged.length <= 2) {
    const median = sortedGaps[Math.floor(sortedGaps.length / 2)];
    const tighterThreshold = Math.max(fixedGapThreshold, median * 0.8);
    if (tighterThreshold < threshold) {
      const retried = mergeWithThreshold(tighterThreshold);
      if (retried.length > merged.length) {
        merged = retried;
      }
    }
  }

  // Continuation merge: rows with NO content in the left region (x < 0.20)
  // are continuation lines that belong to the previous record.
  function hasLeftContent(row) {
    return row.some(t => t.x_center < 0.20);
  }

  const emptyLeftFlags = merged.map(row => !hasLeftContent(row));
  const emptyLeftCount = emptyLeftFlags.filter(Boolean).length;

  // Only apply if there are some continuation rows (but not all)
  if (emptyLeftCount > 0 && emptyLeftCount < merged.length) {
    const contMerged = [];
    for (let i = 0; i < merged.length; i++) {
      if (!emptyLeftFlags[i] || contMerged.length === 0) {
        contMerged.push([...merged[i]]);
      } else {
        contMerged[contMerged.length - 1].push(...merged[i]);
      }
    }
    if (contMerged.length >= 3) {
      return contMerged;
    }
  }

  return merged;
}

// ── Main Extractor ───────────────────────────────────────────────────────────

/**
 * Extract table structure from Vision API JSON using auto-detected columns.
 *
 * @param {object} visionJson — Vision API result (pages[].blocks[].paragraphs[].words[])
 * @param {object} [opts]
 * @param {number} [opts.pageIndex=0]
 * @param {number} [opts.headerY] — Y threshold for header region
 * @param {number} [opts.minGapWidth] — Minimum X gap to consider a column separator
 * @param {Array} [opts.columnBands] — Custom column bands as [[x_start, x_end], ...] fractions (0..1). Skips auto-detection.
 * @param {number} [opts.headerYThreshold] — Alias for headerY (template-style naming)
 * @returns {object} Structured table extraction result
 */
function extractGenericTable(visionJson, opts = {}) {
  const pageIndex = opts.pageIndex || 0;
  const headerY = opts.headerY || opts.headerYThreshold || DEFAULT_HEADER_Y;
  const minGapWidth = opts.minGapWidth || 0.02;

  // Step 1: Get all word tokens
  const allTokens = extractWordTokens(visionJson, pageIndex);

  if (allTokens.length === 0) {
    return {
      layout_id: LAYOUT_ID,
      page_number: pageIndex + 1,
      tables: [],
      total_tokens: 0,
      data_tokens: 0,
      data_rows: 0,
      columns_detected: 0,
      extracted_at: new Date().toISOString(),
    };
  }

  // Step 2: Auto-detect header boundary from content
  // Cluster ALL tokens first to analyze row content for header detection
  const prelimRows = clusterIntoRows(allTokens, opts.mergeThreshold || null);
  const detectedHeaderY = autoDetectHeaderY(prelimRows);
  const effectiveHeaderY = Math.max(headerY, detectedHeaderY || 0);

  // Step 3: Separate header tokens from data tokens using effective threshold
  const headerTokens = allTokens.filter(t => t.y_center <= effectiveHeaderY);
  const dataTokens = allTokens.filter(t => t.y_center > effectiveHeaderY);

  // Step 4: Cluster data tokens into text rows
  const textRows = clusterIntoRows(dataTokens, opts.mergeThreshold || null);

  // Step 5: Merge multi-line entries
  const ledgerRows = mergeLedgerRows(textRows);

  // Step 6: Detect columns — use custom bands if provided, otherwise auto-detect
  let columns;
  if (opts.columnBands && Array.isArray(opts.columnBands) && opts.columnBands.length > 0) {
    // Custom bands from layout template: [[x_start, x_end], ...]
    columns = opts.columnBands.map((band, i) => ({
      key: `col_${i + 1}`,
      band: Array.isArray(band) ? band : [band.start || 0, band.end || 1],
    }));
  } else {
    columns = detectColumns(textRows, minGapWidth);
  }

  // Step 7: Build header row from header tokens (if any)
  const headerRow = headerTokens.length > 0 ? {
    row_index: 0,
    type: 'header',
    cells: columns.map((col, colIdx) => {
      const cell = extractCell(headerTokens, col.band[0], col.band[1]);
      return {
        row_index: 0,
        column_index: colIdx,
        column_key: col.key,
        content: cell.text,
      };
    }),
  } : null;

  // Step 8: Build data rows
  const dataRowObjects = ledgerRows.map((rowTokens, dataIdx) => {
    const rowIndex = headerRow ? dataIdx + 1 : dataIdx;
    const cells = columns.map((col, colIdx) => {
      const cell = extractCell(rowTokens, col.band[0], col.band[1]);
      return {
        row_index: rowIndex,
        column_index: colIdx,
        column_key: col.key,
        content: cell.text,
        confidence: cell.confidence,
        token_count: cell.token_count,
        bbox: cell.bbox,
      };
    });
    return { row_index: rowIndex, type: 'row', cells };
  });

  const finalRows = headerRow ? [headerRow, ...dataRowObjects] : dataRowObjects;

  // Build column bands map
  const columnBands = {};
  columns.forEach(col => { columnBands[col.key] = col.band; });

  // Page dimensions
  const page = visionJson?.pages?.[pageIndex];

  return {
    layout_id: LAYOUT_ID,
    page_number: pageIndex + 1,
    page_dimensions: page ? { width: page.width, height: page.height } : null,
    tables: [{
      row_count: finalRows.length,
      column_count: columns.length,
      table_number: 1,
      has_header_row: !!headerRow,
      rows: finalRows,
    }],
    column_bands: columnBands,
    columns_detected: columns.length,
    header_y_threshold: effectiveHeaderY,
    total_tokens: allTokens.length,
    data_tokens: dataTokens.length,
    data_rows: ledgerRows.length,
    extracted_at: new Date().toISOString(),
  };
}

/**
 * Convert a table extraction result into structured plain text.
 * Each row becomes a line with columns separated by " | ".
 * This produces readable, structured text instead of the raw Vision flattened text.
 */
function tableToStructuredText(extractionResult) {
  if (!extractionResult || !extractionResult.tables || extractionResult.tables.length === 0) {
    return null;
  }

  const lines = [];
  lines.push(`=== Structured Table Extraction (${extractionResult.layout_id}) ===`);
  lines.push(`Columns: ${extractionResult.columns_detected || '?'} | Rows: ${extractionResult.data_rows || '?'}`);
  lines.push('');

  for (const table of extractionResult.tables) {
    if (table.table_number) {
      lines.push(`--- Table ${table.table_number} (${table.column_count} columns, ${table.row_count} rows) ---`);
    }

    for (const row of (table.rows || [])) {
      const cellTexts = (row.cells || []).map(c => (c.content || '').trim());
      if (row.type === 'header') {
        lines.push(cellTexts.join(' | '));
        lines.push('-'.repeat(cellTexts.join(' | ').length));
      } else {
        lines.push(cellTexts.join(' | '));
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  LAYOUT_ID,
  extractWordTokens,
  autoDetectHeaderY,
  clusterIntoRows,
  mergeLedgerRows,
  detectColumns,
  extractCell,
  extractGenericTable,
  tableToStructuredText,
};
