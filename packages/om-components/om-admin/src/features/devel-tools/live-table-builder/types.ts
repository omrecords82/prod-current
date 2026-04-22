/**
 * Live Table Builder - Type Definitions
 */

export interface TableColumn {
  id: string;
  label: string;
}

export interface TableRow {
  id: string;
  cells: Record<string, string>; // columnId -> cell value
}

export interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
}

export interface TableState {
  data: TableData;
  version: string;
}
