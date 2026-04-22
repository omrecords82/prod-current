/**
 * useAgGridConfig.ts — AG Grid theme, column definitions, and cell renderers for RecordsPage.
 */

import React, { useCallback, useMemo } from 'react';
import { Box, Chip, IconButton, Tooltip, useTheme } from '@mui/material';
import { ColDef, ICellRendererParams, themeQuartz } from 'ag-grid-community';
import { Eye, FileText, Pencil, Trash2 } from '@/shared/ui/icons';
import { isRecordNewWithin24Hours, isRecordUpdatedWithin24Hours, getAgGridRowClassRules } from '@/features/records-centralized/common/recordsHighlighting';
import { getCellValue, getColumnDefinitions } from './utils';
import type { BaptismRecord } from './types';

interface UseAgGridConfigOptions {
  selectedRecordType: string;
  debouncedSearch: string;
  nowReference: Date;
  isRecordSelected: (id: any) => boolean;
  handleViewRecord: (record: BaptismRecord) => void;
  handleEditRecord: (record: BaptismRecord) => void;
  handleDeleteClick: (record: any) => void;
  handleGenerateCertificate: () => void;
  highlightSearchMatch: (text: string, searchTerm: string) => React.ReactNode;
  t: (key: string) => string;
}

export function useAgGridConfig({
  selectedRecordType, debouncedSearch, nowReference, isRecordSelected,
  handleViewRecord, handleEditRecord, handleDeleteClick, handleGenerateCertificate,
  highlightSearchMatch, t,
}: UseAgGridConfigOptions) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const agGridTheme = useMemo(() => {
    return themeQuartz.withParams(isDarkMode ? {
      backgroundColor: '#0a0a0a',
      headerBackgroundColor: theme.palette.primary.main,
      headerTextColor: theme.palette.primary.contrastText,
      foregroundColor: '#e0e0e0',
      oddRowBackgroundColor: '#111111',
      rowHoverColor: '#222222',
      selectedRowBackgroundColor: '#333333',
      borderColor: '#333333',
    } : {
      headerBackgroundColor: theme.palette.primary.main,
      headerTextColor: theme.palette.primary.contrastText,
      foregroundColor: '#1a1a1a',
      oddRowBackgroundColor: '#fafafa',
      rowHoverColor: '#eeeeee',
      selectedRowBackgroundColor: '#e0e0e0',
      borderColor: '#e0e0e0',
    });
  }, [isDarkMode, theme.palette.primary.main, theme.palette.primary.contrastText]);

  const agGridStatusRenderer = useCallback((params: ICellRendererParams) => {
    const record = params.data;
    if (!record) return null;
    const isNew = isRecordNewWithin24Hours(record, nowReference);
    const isUpdated = isRecordUpdatedWithin24Hours(record, nowReference);
    if (isNew) {
      return React.createElement(Chip, {
        label: t('records.chip_new'), size: 'small', color: 'success', variant: 'filled',
        sx: { fontSize: '0.65rem', height: 20, fontWeight: 700 },
      });
    }
    if (isUpdated) {
      return React.createElement(Chip, {
        label: t('records.chip_updated'), size: 'small', color: 'warning', variant: 'filled',
        sx: { fontSize: '0.65rem', height: 20, fontWeight: 700 },
      });
    }
    return null;
  }, [nowReference, t]);

  const agGridActionsRenderer = useCallback((params: ICellRendererParams) => {
    const record = params.data;
    if (!record) return null;
    const iconSx = { opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } };
    const deleteSx = { opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'error.main' } };

    return React.createElement(Box, { sx: { display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' } },
      React.createElement(Tooltip, { title: t('records.tooltip_view') },
        React.createElement(IconButton, { size: 'small', onClick: () => handleViewRecord(record), sx: iconSx },
          React.createElement(Eye, { size: 16, strokeWidth: 1.5 }))),
      React.createElement(Tooltip, { title: t('records.tooltip_edit') },
        React.createElement(IconButton, { size: 'small', onClick: () => handleEditRecord(record), sx: iconSx },
          React.createElement(Pencil, { size: 16, strokeWidth: 1.5 }))),
      React.createElement(Tooltip, { title: t('records.tooltip_delete') },
        React.createElement(IconButton, { size: 'small', onClick: () => handleDeleteClick(record), sx: deleteSx },
          React.createElement(Trash2, { size: 16, strokeWidth: 1.5 }))),
      (selectedRecordType === 'baptism' || selectedRecordType === 'marriage')
        ? React.createElement(Tooltip, { title: t('records.tooltip_certificate') },
            React.createElement(IconButton, { size: 'small', onClick: () => handleGenerateCertificate(), sx: iconSx },
              React.createElement(FileText, { size: 16, strokeWidth: 1.5 })))
        : null,
    );
  }, [selectedRecordType, handleViewRecord, handleEditRecord, handleDeleteClick, handleGenerateCertificate, t]);

  const agGridColumnDefs = useMemo(() => {
    const cols: ColDef[] = [];
    cols.push({
      headerName: '', field: 'created_at',
      minWidth: 70, maxWidth: 70, width: 70,
      sortable: false, filter: false,
      cellRenderer: agGridStatusRenderer, pinned: 'left',
    });
    getColumnDefinitions(selectedRecordType).forEach((col: any) => {
      cols.push({
        field: col.field, headerName: col.headerName,
        flex: 1, minWidth: 120, sortable: true, filter: false,
        valueGetter: (params: any) => getCellValue(params.data, col),
        cellRenderer: debouncedSearch
          ? (params: ICellRendererParams) => {
              const text = params.valueFormatted ?? params.value;
              return highlightSearchMatch(text == null ? '' : String(text), debouncedSearch);
            }
          : undefined,
      });
    });
    cols.push({
      headerName: 'Actions', field: 'id',
      minWidth: 180, width: 180, maxWidth: 180,
      sortable: false, filter: false, pinned: 'right',
      cellRenderer: agGridActionsRenderer,
    });
    return cols;
  }, [selectedRecordType, debouncedSearch, agGridStatusRenderer, agGridActionsRenderer]);

  const agGridRowClassRules = useMemo(
    () => getAgGridRowClassRules(isRecordSelected, nowReference),
    [isRecordSelected, nowReference]
  );

  return { agGridTheme, agGridColumnDefs, agGridRowClassRules };
}
