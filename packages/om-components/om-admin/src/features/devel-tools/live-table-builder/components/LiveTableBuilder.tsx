/**
 * Live Table Builder - Main Component
 * AG Grid-based editable table with clipboard support
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  PasteStartEvent,
  PasteEndEvent,
  RowDataUpdatedEvent,
} from 'ag-grid-community';
import { Box, Button, TextField, IconButton, Tooltip } from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  SwapHoriz as TransposeIcon,
} from '@mui/icons-material';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import type { TableColumn, TableRow, TableData } from '../types';
import { parseClipboardData } from '../utils/clipboard';
import { EditableHeader } from './EditableHeader';
import { normalizeTableData, validateDimensions } from '../utils/normalize';
import { agGridIconMap } from '@/ui/agGridIcons';

interface LiveTableBuilderProps {
  data: TableData;
  onDataChange: (data: TableData) => void;
  onToast: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 6;

export const LiveTableBuilder: React.FC<LiveTableBuilderProps> = ({
  data,
  onDataChange,
  onToast,
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // Normalize data to ensure consistent dimensions
  // Always ensure we have at least 1 row and 1 column for visible grid
  const normalizedData = useMemo(() => {
    if (!data?.columns || !Array.isArray(data.columns) || data.columns.length === 0 ||
        !data?.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
      // Return minimal normalized data if invalid
      return normalizeTableData(null, 1, 1);
    }
    
    // Ensure data is normalized (all rows have all columns)
    const colCount = Math.max(1, data.columns.length);
    const rowCount = Math.max(1, data.rows.length);
    return normalizeTableData(data, rowCount, colCount);
  }, [data]);

  // Convert table data to AG Grid format
  const { rowData, columnDefs } = useMemo(() => {
    if (!normalizedData?.columns || !normalizedData?.rows) {
      // Fallback: create minimal grid
      const fallback = normalizeTableData(null, 1, 1);
      return {
        rowData: [{ id: fallback.rows[0]?.id || 'row_0', [fallback.columns[0]?.id || 'col_0']: '' }],
        columnDefs: [{
          field: fallback.columns[0]?.id || 'col_0',
          headerName: fallback.columns[0]?.label || 'Column A',
          editable: true,
          sortable: false,
          filter: false,
          resizable: true,
          minWidth: 120,
          flex: 1,
        }],
      };
    }

    const cols: ColDef[] = normalizedData.columns.map((col) => ({
      field: col.id, // Use stable column ID as field key
      headerName: col.label || '', // Display label
      editable: true,
      sortable: false,
      filter: false,
      resizable: true,
      minWidth: 120,
      flex: 1,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: {
        useFormatter: false,
      },
      headerComponent: EditableHeader,
      headerComponentParams: {
        onHeaderValueChange: (newValue: string) => {
          if (newValue && newValue.trim() && col?.id) {
            const updatedColumns = normalizedData.columns.map((c) =>
              c.id === col.id ? { ...c, label: newValue.trim() } : c
            );
            onDataChange({
              ...normalizedData,
              columns: updatedColumns,
            });
          }
        },
      },
    }));

    // Build rowData ensuring all columns are present
    const rows = normalizedData.rows.map((row) => {
      const rowObj: Record<string, any> = { id: row.id };
      normalizedData.columns.forEach((col) => {
        // Always include all columns, defaulting to empty string
        rowObj[col.id] = String(row.cells?.[col.id] || '');
      });
      return rowObj;
    });

    return { rowData: rows, columnDefs: cols };
  }, [normalizedData, onDataChange]);

  // Handle grid ready
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  // Handle cell value change
  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      if (!event?.data || !event?.colDef?.field) return;

      const rowId = event.data.id;
      const colId = event.colDef.field;
      const newValue = event.newValue ?? '';

      if (!normalizedData?.rows || !Array.isArray(normalizedData.rows)) return;

      const updatedRows = normalizedData.rows.map((row) => {
        if (row?.id === rowId) {
          return {
            ...row,
            cells: {
              ...(row.cells || {}),
              [colId]: String(newValue),
            },
          };
        }
        return row;
      });

      onDataChange({
        ...normalizedData,
        rows: updatedRows,
      });
    },
    [normalizedData, onDataChange]
  );


  // Add row
  const handleAddRow = useCallback(() => {
    if (!normalizedData?.columns || !normalizedData?.rows) return;

    const newRowIndex = normalizedData.rows.length;
    const newRowId = `row_${newRowIndex}`;
    const newRow: TableRow = {
      id: newRowId,
      cells: {},
    };

    normalizedData.columns.forEach((col) => {
      newRow.cells[col.id] = '';
    });

    const updatedData = {
      ...normalizedData,
      rows: [...normalizedData.rows, newRow],
    };

    // Normalize to ensure consistency
    const normalized = normalizeTableData(updatedData, updatedData.rows.length, updatedData.columns.length);
    onDataChange(normalized);

    // Focus the first cell of the new row
    setTimeout(() => {
      if (gridApi && normalizedData.columns.length > 0) {
        gridApi.setFocusedCell(newRowIndex, normalizedData.columns[0].id);
        gridApi.startEditingCell({
          rowIndex: newRowIndex,
          colKey: normalizedData.columns[0].id,
        });
      }
    }, 100);
  }, [normalizedData, onDataChange, gridApi]);

  // Remove last row
  const handleRemoveRow = useCallback(() => {
    if (!normalizedData?.rows || !Array.isArray(normalizedData.rows) || normalizedData.rows.length <= 1) {
      onToast('Cannot remove the last row', 'warning');
      return;
    }

    const updatedRows = normalizedData.rows.slice(0, -1);
    const normalized = normalizeTableData(
      { ...normalizedData, rows: updatedRows },
      updatedRows.length,
      normalizedData.columns.length
    );
    onDataChange(normalized);
  }, [normalizedData, onDataChange, onToast]);

  // Add column
  const handleAddColumn = useCallback(() => {
    if (!normalizedData?.columns || !normalizedData?.rows) return;

    const newColCount = normalizedData.columns.length + 1;
    const normalized = normalizeTableData(normalizedData, normalizedData.rows.length, newColCount);
    onDataChange(normalized);
  }, [normalizedData, onDataChange]);

  // Remove last column
  const handleRemoveColumn = useCallback(() => {
    if (!normalizedData?.columns || !normalizedData?.rows || normalizedData.columns.length <= 1) {
      onToast('Cannot remove the last column', 'warning');
      return;
    }

    const newColCount = normalizedData.columns.length - 1;
    const normalized = normalizeTableData(normalizedData, normalizedData.rows.length, newColCount);
    onDataChange(normalized);
  }, [normalizedData, onDataChange, onToast]);

  // Enhanced paste handler using parseClipboardData
  const handleEnhancedPaste = useCallback(
    (clipboardText: string) => {
      if (!gridApi || !normalizedData?.columns || !normalizedData?.rows) return false;

      try {
        const parsed = parseClipboardData(clipboardText);
        if (parsed.rows.length === 0) return false;

        // Get focused cell
        const focusedCell = gridApi.getFocusedCell();
        if (!focusedCell) return false;

        const startRowIndex = focusedCell.rowIndex ?? 0;
        const startColId = focusedCell.column?.getColId() || normalizedData.columns[0]?.id || '';

        // Find column index
        const startColIndex = normalizedData.columns.findIndex((col) => col?.id === startColId);
        if (startColIndex === -1) return false;

        // Expand table if needed
        const neededRows = Math.max(normalizedData.rows.length, startRowIndex + parsed.rows.length);
        const neededCols = Math.max(normalizedData.columns.length, startColIndex + parsed.colCount);

        // Normalize to expanded size first
        let expandedData = normalizeTableData(normalizedData, neededRows, neededCols);

        // Apply pasted data
        parsed.rows.forEach((parsedRow, rowOffset) => {
          const targetRowIndex = startRowIndex + rowOffset;
          if (targetRowIndex >= expandedData.rows.length) return;

          const targetRow = expandedData.rows[targetRowIndex];
          parsedRow.forEach((cellValue, colOffset) => {
            const targetColIndex = startColIndex + colOffset;
            if (targetColIndex < expandedData.columns.length) {
              const colId = expandedData.columns[targetColIndex].id;
              targetRow.cells[colId] = String(cellValue || '');
            }
          });
        });

        // Normalize again to ensure consistency
        const normalized = normalizeTableData(expandedData, expandedData.rows.length, expandedData.columns.length);
        onDataChange(normalized);

        onToast(`Pasted ${parsed.rows.length} rows, ${parsed.colCount} columns`, 'success');
        return true;
      } catch (e) {
        console.error('Paste error:', e);
        return false;
      }
    },
    [normalizedData, onDataChange, gridApi, onToast]
  );

  // Attach paste handler to grid using DOM ref
  useEffect(() => {
    if (!gridWrapRef.current) return;

    const pasteHandler = (e: ClipboardEvent) => {
      const clipboardText = e.clipboardData?.getData('text/plain') || '';
      if (clipboardText.trim()) {
        const handled = handleEnhancedPaste(clipboardText);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const gridElement = gridWrapRef.current;
    gridElement.addEventListener('paste', pasteHandler);
    return () => {
      gridElement.removeEventListener('paste', pasteHandler);
    };
  }, [handleEnhancedPaste]);

  // Handle paste
  const onPasteStartEvent = useCallback(
    (event: PasteStartEvent) => {
      // Allow paste
    },
    []
  );

  const onPasteEnd = useCallback(
    (event: PasteEndEvent) => {
      // AG Grid handles paste automatically, but we need to sync our data
      if (gridApi && normalizedData?.columns && normalizedData?.rows) {
        setTimeout(() => {
          const updatedRows: TableRow[] = [];
          gridApi.forEachNode((node) => {
            if (node?.data?.id) {
              const cells: Record<string, string> = {};
              normalizedData.columns.forEach((col) => {
                cells[col.id] = String(node.data[col.id] || '');
              });
              updatedRows.push({
                id: node.data.id,
                cells,
              });
            }
          });

          if (updatedRows.length > 0) {
            const updatedData = {
              ...normalizedData,
              rows: updatedRows,
            };
            // Normalize to ensure consistency
            const normalized = normalizeTableData(
              updatedData,
              updatedRows.length,
              normalizedData.columns.length
            );
            onDataChange(normalized);
          }
        }, 0);
      }
    },
    [normalizedData, onDataChange, gridApi]
  );

  // Handle row data update (for paste operations)
  const onRowDataUpdated = useCallback(
    (event: RowDataUpdatedEvent) => {
      // Sync data after paste
      if (gridApi && normalizedData?.columns) {
        const updatedRows: TableRow[] = [];
        gridApi.forEachNode((node) => {
          if (node?.data?.id) {
            const cells: Record<string, string> = {};
            normalizedData.columns.forEach((col) => {
              cells[col.id] = String(node.data[col.id] || '');
            });
            updatedRows.push({
              id: node.data.id,
              cells,
            });
          }
        });

        if (updatedRows.length > 0) {
          const updatedData = {
            ...normalizedData,
            rows: updatedRows,
          };
          // Normalize to ensure consistency
          const normalized = normalizeTableData(
            updatedData,
            updatedRows.length,
            normalizedData.columns.length
          );
          onDataChange(normalized);
        }
      }
    },
    [normalizedData, onDataChange, gridApi]
  );

  // Transpose table (swap rows and columns)
  const handleTranspose = useCallback(() => {
    if (!normalizedData?.rows || !normalizedData?.columns || 
        normalizedData.rows.length === 0 || normalizedData.columns.length === 0) {
      onToast('Cannot transpose empty table', 'warning');
      return;
    }

    // Get all cell values as a 2D array
    const cellMatrix: string[][] = normalizedData.rows.map((row) =>
      normalizedData.columns.map((col) => String(row.cells?.[col.id] || ''))
    );

    // Transpose the matrix
    const transposedMatrix: string[][] = [];
    for (let i = 0; i < normalizedData.columns.length; i++) {
      transposedMatrix[i] = [];
      for (let j = 0; j < normalizedData.rows.length; j++) {
        transposedMatrix[i][j] = cellMatrix[j]?.[i] || '';
      }
    }

    // New dimensions: old columns become rows, old rows become columns
    const newRowCount = normalizedData.columns.length;
    const newColCount = normalizedData.rows.length;

    // Create transposed data structure
    const transposedData: TableData = {
      columns: normalizedData.rows.map((row, index) => ({
        id: `col_${index}`, // Stable ID
        label: normalizedData.columns[index]?.label || `Column ${String.fromCharCode(65 + (index % 26))}`,
      })),
      rows: normalizedData.columns.map((col, rowIndex) => {
        const cells: Record<string, string> = {};
        normalizedData.rows.forEach((_, colIndex) => {
          cells[`col_${colIndex}`] = transposedMatrix[rowIndex]?.[colIndex] || '';
        });
        return {
          id: `row_${rowIndex}`, // Stable ID
          cells,
        };
      }),
    };

    // Normalize the transposed data
    const normalized = normalizeTableData(transposedData, newRowCount, newColCount);
    onDataChange(normalized);

    const rowCount = normalized.rows.length;
    const colCount = normalized.columns.length;
    onToast(`Table transposed: ${rowCount} rows ↔ ${colCount} columns`, 'success');
  }, [normalizedData, onDataChange, onToast]);

  // Expose undo/redo capability if needed (handled at page level)

  // Set initial rows/cols - uses normalization to ensure consistent state
  const handleSetDimensions = useCallback(
    (rows: number | string, cols: number | string) => {
      const { rows: safeRows, cols: safeCols } = validateDimensions(rows, cols);
      
      // Normalize current data to new dimensions
      const normalized = normalizeTableData(normalizedData, safeRows, safeCols);
      onDataChange(normalized);
    },
    [normalizedData, onDataChange]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <TextField
          label="Rows"
          type="number"
          size="small"
          value={normalizedData?.rows?.length || 0}
          onChange={(e) => {
            const rows = e.target.value;
            handleSetDimensions(rows, normalizedData?.columns?.length || 0);
          }}
          onBlur={(e) => {
            // Ensure valid value on blur
            const { rows } = validateDimensions(e.target.value, normalizedData?.columns?.length || 0);
            handleSetDimensions(rows, normalizedData?.columns?.length || 0);
          }}
          sx={{ width: 100 }}
          inputProps={{ min: 1, max: 500 }}
        />
        <TextField
          label="Columns"
          type="number"
          size="small"
          value={normalizedData?.columns?.length || 0}
          onChange={(e) => {
            const cols = e.target.value;
            handleSetDimensions(normalizedData?.rows?.length || 0, cols);
          }}
          onBlur={(e) => {
            // Ensure valid value on blur
            const { cols } = validateDimensions(normalizedData?.rows?.length || 0, e.target.value);
            handleSetDimensions(normalizedData?.rows?.length || 0, cols);
          }}
          sx={{ width: 100 }}
          inputProps={{ min: 1, max: 100 }}
        />

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Add Row">
          <IconButton onClick={handleAddRow} size="small">
            <AddIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove Last Row">
          <IconButton onClick={handleRemoveRow} size="small">
            <RemoveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add Column">
          <IconButton onClick={handleAddColumn} size="small">
            <AddIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove Last Column">
          <IconButton onClick={handleRemoveColumn} size="small">
            <RemoveIcon />
          </IconButton>
        </Tooltip>

        <Box sx={{ width: 1, borderTop: 1, borderColor: 'divider', my: 1 }} />

        <Tooltip title="Transpose Table (Swap Rows & Columns)">
          <Button
            variant="outlined"
            startIcon={<TransposeIcon />}
            onClick={handleTranspose}
            size="small"
          >
            Transpose
          </Button>
        </Tooltip>
      </Box>

      {/* Grid */}
      <Box sx={{ flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          className="ag-theme-alpine"
          ref={gridWrapRef}
          style={{
            height: '100%',
            width: '100%',
            minHeight: 400,
            flex: 1,
          }}
        >
          <AgGridReact
            ref={gridRef}
            columnDefs={columnDefs}
            rowData={rowData}
            onGridReady={onGridReady}
            onCellValueChanged={onCellValueChanged}
            onPasteStart={onPasteStartEvent}
            onPasteEnd={onPasteEnd}
            onRowDataUpdated={onRowDataUpdated}
            defaultColDef={{
              editable: true,
              sortable: false,
              filter: false,
              resizable: true,
            }}
            icons={agGridIconMap}
            suppressClipboardPaste={false}
            animateRows={false}
            getRowId={(params) => params.data.id}
            rowSelection={{
              mode: 'multiRow',
              enableClickSelection: true,
            }}
          />
        </div>
      </Box>
    </Box>
  );
};
