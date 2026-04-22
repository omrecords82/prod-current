/**
 * CSV Export Utilities
 * Handles proper CSV escaping and formatting
 */

import type { TableData } from '../types';

/**
 * Escape a CSV field value
 * - Quotes fields containing commas, quotes, or newlines
 * - Doubles quotes for escaping
 */
function escapeCsvField(field: string): string {
  if (field === null || field === undefined) {
    return '';
  }

  const str = String(field);
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Convert table data to CSV format
 * @param data Table data to export
 * @returns CSV string with \r\n line endings
 */
export function tableDataToCsv(data: TableData): string {
  if (!data?.columns || !data?.rows) {
    return '';
  }

  const lines: string[] = [];

  // Header row
  const headerRow = data.columns.map((col) => escapeCsvField(col?.label || '')).join(',');
  lines.push(headerRow);

  // Data rows
  data.rows.forEach((row) => {
    const rowValues = data.columns.map((col) => {
      const cellValue = row?.cells?.[col?.id || ''] || '';
      return escapeCsvField(String(cellValue));
    });
    lines.push(rowValues.join(','));
  });

  // Join with \r\n (Windows line endings for better compatibility)
  return lines.join('\r\n');
}

/**
 * Generate filename with timestamp
 * Format: live-table-builder_YYYY-MM-DD_HHMM.csv
 */
export function generateCsvFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `live-table-builder_${year}-${month}-${day}_${hours}${minutes}.csv`;
}
