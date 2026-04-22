/**
 * Table Normalization Utilities
 * Ensures consistent table state with proper dimensions and cell coverage
 */

import type { TableData, TableColumn, TableRow } from '../types';

const MIN_ROWS = 1;
const MAX_ROWS = 500;
const MIN_COLS = 1;
const MAX_COLS = 100;

/**
 * Clamp a number to valid bounds
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value) || min));
}

/**
 * Generate a stable column ID based on index
 * Uses format: col_0, col_1, col_2, ... for stability
 */
function generateStableColumnId(index: number): string {
  return `col_${index}`;
}

/**
 * Generate a stable row ID based on index
 */
function generateStableRowId(index: number): string {
  return `row_${index}`;
}

/**
 * Generate default column label
 */
function generateColumnLabel(index: number): string {
  const colLetter = String.fromCharCode(65 + (index % 26));
  return `Column ${colLetter}`;
}

/**
 * Normalize table data to ensure consistent dimensions
 * 
 * Guarantees:
 * - columns.length === colCount
 * - rows.length === rowCount
 * - Each row has exactly colCount cells (all column IDs present)
 * - All cells are strings (empty string if missing)
 * 
 * @param prevData Previous table data (can be empty/partial)
 * @param rowCount Target number of rows (clamped to MIN_ROWS..MAX_ROWS)
 * @param colCount Target number of columns (clamped to MIN_COLS..MAX_COLS)
 * @returns Normalized TableData
 */
export function normalizeTableData(
  prevData: TableData | null | undefined,
  rowCount: number,
  colCount: number
): TableData {
  // Clamp to valid bounds
  const safeRowCount = clamp(rowCount, MIN_ROWS, MAX_ROWS);
  const safeColCount = clamp(colCount, MIN_COLS, MAX_COLS);

  // Normalize columns
  const columns: TableColumn[] = [];
  const existingColumns = prevData?.columns || [];
  
  for (let i = 0; i < safeColCount; i++) {
    const stableId = generateStableColumnId(i);
    // Try to find by stable ID first, then by index (for migration from old IDs)
    const existingCol = existingColumns.find((col) => col?.id === stableId) || 
                        (i < existingColumns.length ? existingColumns[i] : null);
    
    if (existingCol) {
      // Preserve existing column label, but use stable ID
      columns.push({
        id: stableId,
        label: existingCol.label || generateColumnLabel(i),
      });
    } else {
      // Create new column
      columns.push({
        id: stableId,
        label: generateColumnLabel(i),
      });
    }
  }

  // Normalize rows
  const rows: TableRow[] = [];
  const existingRows = prevData?.rows || [];
  
  // Build mapping from old column IDs to new stable IDs (for data migration)
  // Map by index position: oldColumns[i] -> newColumns[i]
  const oldToNewColMap: Record<string, string> = {};
  existingColumns.forEach((oldCol, oldIndex) => {
    if (oldIndex < columns.length) {
      oldToNewColMap[oldCol.id] = columns[oldIndex].id;
    }
  });
  
  for (let i = 0; i < safeRowCount; i++) {
    const stableId = generateStableRowId(i);
    // Try to find by stable ID first, then by index
    const existingRow = existingRows.find((row) => row?.id === stableId) ||
                        (i < existingRows.length ? existingRows[i] : null);
    
    // Build cells object with all columns
    const cells: Record<string, string> = {};
    columns.forEach((col, colIndex) => {
      // Try to preserve existing cell value
      let cellValue = '';
      
      if (existingRow?.cells) {
        // First try new stable ID directly
        if (col.id in existingRow.cells) {
          cellValue = String(existingRow.cells[col.id] || '');
        } 
        // Then try old column at same index (for migration from old IDs)
        else if (colIndex < existingColumns.length) {
          const oldColId = existingColumns[colIndex].id;
          if (oldColId && oldColId in existingRow.cells) {
            cellValue = String(existingRow.cells[oldColId] || '');
          }
        }
      }
      
      cells[col.id] = cellValue;
    });
    
    rows.push({
      id: stableId,
      cells,
    });
  }

  return { columns, rows };
}

/**
 * Validate and clamp row/column counts
 */
export function validateDimensions(
  rowCount: number | string,
  colCount: number | string
): { rows: number; cols: number } {
  const rows = clamp(Number(rowCount) || MIN_ROWS, MIN_ROWS, MAX_ROWS);
  const cols = clamp(Number(colCount) || MIN_COLS, MIN_COLS, MAX_COLS);
  return { rows, cols };
}
