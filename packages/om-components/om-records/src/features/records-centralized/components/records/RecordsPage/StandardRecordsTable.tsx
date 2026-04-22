import React from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import { Eye, FileText, Pencil, Trash2 } from '@/shared/ui/icons';
import { getRecordRowStyle } from '@/features/records-centralized/common/recordsHighlighting';
import { getCellValue, getColumnDefinitions } from './utils';
import type { BaptismRecord, SortConfig } from './types';
import { useLanguage } from '@/context/LanguageContext';

interface StandardRecordsTableProps {
  records: BaptismRecord[];
  selectedRecordType: string;
  sortConfig: SortConfig;
  loading: boolean;
  searchTerm: string;
  debouncedSearch: string;
  isDarkMode: boolean;
  nowReference: number;
  isRecordSelected: (id: string) => boolean;
  onSort: (key: keyof BaptismRecord) => void;
  onRowSelect: (id: string) => void;
  onViewRecord: (record: BaptismRecord) => void;
  onEditRecord: (record: BaptismRecord) => void;
  onDeleteClick: (record: BaptismRecord) => void;
  onCertificateClick?: (record: BaptismRecord) => void;
  highlightSearchMatch: (text: string, searchTerm: string) => React.ReactNode;
}

const StandardRecordsTable: React.FC<StandardRecordsTableProps> = ({
  records,
  selectedRecordType,
  sortConfig,
  loading,
  searchTerm,
  debouncedSearch,
  isDarkMode,
  nowReference,
  isRecordSelected,
  onSort,
  onRowSelect,
  onViewRecord,
  onEditRecord,
  onDeleteClick,
  onCertificateClick,
  highlightSearchMatch,
}) => {
  const { t } = useLanguage();
  const columns = getColumnDefinitions(selectedRecordType);

  return (
    <TableContainer sx={{
      textAlign: 'left',
      width: '100%',
      overflowX: 'auto',
      bgcolor: isDarkMode ? 'background.paper' : undefined,
      '&::-webkit-scrollbar': { height: '8px' },
      '&::-webkit-scrollbar-track': {
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)',
        borderRadius: '4px',
      },
    }}>
      <Table stickyHeader sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            {columns.map((column: any, index: number) => (
              <TableCell
                key={index}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 'bold',
                  '& .MuiTableSortLabel-root': { color: 'inherit' },
                  '& .MuiTableSortLabel-root.Mui-active': { color: 'inherit' },
                  '& .MuiTableSortLabel-icon': { color: 'inherit !important' },
                }}
              >
                <TableSortLabel
                  active={sortConfig.key === column.field}
                  direction={sortConfig.direction}
                  onClick={() => onSort(column.field)}
                >
                  {column.headerName}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell
              sx={{
                minWidth: '150px',
                position: 'sticky',
                right: 0,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                zIndex: 2,
              }}
              align="center"
            >
              {t('common.actions')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 8 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {t('records.loading_records')}
                </Typography>
              </TableCell>
            </TableRow>
          ) : records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                  {t('records.no_records_found')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {searchTerm ? t('records.no_records_hint_search') : t('records.no_records_hint_add')}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            records.map((record, index) => (
              <TableRow
                key={record.id}
                onClick={() => onRowSelect(record.id)}
                sx={{
                  bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper',
                  ...getRecordRowStyle(record, isRecordSelected(record.id), nowReference, isDarkMode),
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
                title={record._matchSummary || 'Click to select row'}
              >
                {columns.map((column: any, colIndex: number) => {
                  const cellVal = getCellValue(record, column);
                  const cellText = typeof cellVal === 'string' ? cellVal : String(cellVal ?? '');
                  return (
                    <TableCell key={colIndex}>
                      {debouncedSearch ? highlightSearchMatch(cellText, debouncedSearch) : cellVal}
                    </TableCell>
                  );
                })}
                <TableCell
                  sx={{
                    minWidth: '150px',
                    position: 'sticky',
                    right: 0,
                    bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper',
                    zIndex: 1,
                  }}
                  align="center"
                >
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} className="record-actions">
                    <Tooltip title={t('records.tooltip_view')}>
                      <IconButton size="small" onClick={() => onViewRecord(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}>
                        <Eye size={16} strokeWidth={1.5} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('records.tooltip_edit')}>
                      <IconButton size="small" onClick={() => onEditRecord(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}>
                        <Pencil size={16} strokeWidth={1.5} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('records.tooltip_delete')}>
                      <IconButton size="small" onClick={() => onDeleteClick(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'error.main' } }}>
                        <Trash2 size={16} strokeWidth={1.5} />
                      </IconButton>
                    </Tooltip>
                    {onCertificateClick && (selectedRecordType === 'baptism' || selectedRecordType === 'marriage') && (
                      <Tooltip title={t('records.tooltip_certificate')}>
                        <IconButton
                          size="small"
                          onClick={() => onCertificateClick(record)}
                          sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}
                        >
                          <FileText size={16} strokeWidth={1.5} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StandardRecordsTable;
