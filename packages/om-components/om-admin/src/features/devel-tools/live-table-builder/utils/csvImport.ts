/**
 * CSV Import Utilities
 * Handles parsing CSV/TSV data and converting to table format
 */

import type { TableData, TableColumn, TableRow } from '../types';
import { parseClipboardData } from './clipboard';

/**
 * Convert parsed CSV data to TableData format
 * @param parsedData Parsed clipboard/CSV data
 * @param firstRowIsHeader Whether the first row should be treated as headers
 * @returns TableData object
 */
export function parsedDataToTableData(
  parsedData: { rows: string[][]; rowCount: number; colCount: number },
  firstRowIsHeader: boolean = true
): TableData {
  if (!parsedData.rows || parsedData.rows.length === 0) {
    return { columns: [], rows: [] };
  }

  let headerRow: string[] = [];
  let dataRows: string[][] = [];

  if (firstRowIsHeader && parsedData.rows.length > 0) {
    headerRow = parsedData.rows[0];
    dataRows = parsedData.rows.slice(1);
  } else {
    // Generate default headers
    const maxCols = Math.max(...parsedData.rows.map(row => row.length));
    headerRow = Array.from({ length: maxCols }, (_, i) => {
      const colLetter = String.fromCharCode(65 + (i % 26));
      return `Column ${colLetter}`;
    });
    dataRows = parsedData.rows;
  }

  // Normalize all rows to have the same number of columns
  const maxCols = Math.max(headerRow.length, ...dataRows.map(row => row.length));
  
  // Pad header row if needed
  while (headerRow.length < maxCols) {
    const colIndex = headerRow.length;
    const colLetter = String.fromCharCode(65 + (colIndex % 26));
    headerRow.push(`Column ${colLetter}`);
  }

  // Create columns with stable IDs
  const columns: TableColumn[] = headerRow.map((label, index) => ({
    id: `col_${index}`, // Stable ID based on index
    label: label || `Column ${String.fromCharCode(65 + (index % 26))}`,
  }));

  // Create rows with stable IDs
  const rows: TableRow[] = dataRows.map((rowData, rowIndex) => {
    const rowId = `row_${rowIndex}`; // Stable ID based on index
    const cells: Record<string, string> = {};
    
    columns.forEach((col, colIndex) => {
      cells[col.id] = String(rowData[colIndex] || '');
    });
    
    return {
      id: rowId,
      cells,
    };
  });

  return { columns, rows };
}

/**
 * Parse CSV/TSV text and convert to TableData
 */
export function parseCsvTextToTableData(
  csvText: string,
  firstRowIsHeader: boolean = true
): TableData {
  const parsed = parseClipboardData(csvText);
  return parsedDataToTableData(parsed, firstRowIsHeader);
}
