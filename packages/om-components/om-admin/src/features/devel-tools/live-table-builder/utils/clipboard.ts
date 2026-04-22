/**
 * Live Table Builder - Clipboard Utilities
 * Handles parsing TSV/CSV data from clipboard
 */

export interface ParsedClipboardData {
  rows: string[][];
  rowCount: number;
  colCount: number;
}

/**
 * Parse clipboard data (TSV or CSV)
 * Detects delimiter automatically (tab, comma, or semicolon)
 */
export function parseClipboardData(clipboardText: string): ParsedClipboardData {
  if (!clipboardText || !clipboardText.trim()) {
    return { rows: [], rowCount: 0, colCount: 0 };
  }

  // Normalize line endings
  const normalized = clipboardText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Detect delimiter (tab, comma, or semicolon)
  const lines = normalized.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { rows: [], rowCount: 0, colCount: 0 };
  }

  // Count occurrences of each delimiter in first few lines
  const sample = lines.slice(0, Math.min(5, lines.length)).join('\n');
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;

  let delimiter = '\t'; // Default to tab
  if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  } else if (commaCount > semicolonCount) {
    delimiter = ',';
  } else if (semicolonCount > 0) {
    delimiter = ';';
  }

  // Parse rows
  const rows: string[][] = [];
  let maxCols = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Handle quoted fields
    const parsedRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if ((char === delimiter || char === '\n') && !inQuotes) {
        // End of field
        parsedRow.push(currentField.trim());
        currentField = '';
        if (char === '\n') break;
      } else {
        currentField += char;
      }
    }
    
    // Add last field
    if (currentField || parsedRow.length > 0) {
      parsedRow.push(currentField.trim());
    }

    if (parsedRow.length > 0) {
      rows.push(parsedRow);
      maxCols = Math.max(maxCols, parsedRow.length);
    }
  }

  // Normalize all rows to have the same number of columns
  const normalizedRows = rows.map(row => {
    const normalized = [...row];
    while (normalized.length < maxCols) {
      normalized.push('');
    }
    return normalized;
  });

  return {
    rows: normalizedRows,
    rowCount: normalizedRows.length,
    colCount: maxCols,
  };
}

/**
 * Convert parsed clipboard data to table cells
 * Returns a 2D array of cell values starting from the focused position
 */
export function convertToTableCells(
  parsedData: ParsedClipboardData,
  startRow: number,
  startCol: number
): string[][] {
  return parsedData.rows.map(row => [...row]);
}
