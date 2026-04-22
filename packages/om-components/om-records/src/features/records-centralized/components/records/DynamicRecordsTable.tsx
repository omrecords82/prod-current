/**
 * Dynamic Records Table Component
 * Works with any table schema using column positions
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableHead,
  
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Skeleton,
  IconButton,
  Tooltip,
  Chip,
  Box,
  Typography,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  FileDownload as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Types
export interface DynamicTableColumn {
  key: string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  position: number;
  type: string;
  render?: (value: any, record: any) => React.ReactNode;
}

export interface DynamicRecordsTableProps {
  records: any[];
  columns: DynamicTableColumn[];
  loading?: boolean;
  error?: string | null;
  selectedRecords?: string[];
  onRecordSelect?: (recordId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onRecordAction?: (action: string, record: any) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  actions?: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    disabled?: (record: any) => boolean;
  }>;
  emptyMessage?: string;
  className?: string;
  showCheckboxes?: boolean;
  showActions?: boolean;
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number;
  primaryKeyField?: string;
}

export function DynamicRecordsTable({
  records,
  columns,
  loading = false,
  error = null,
  selectedRecords = [],
  onRecordSelect,
  onSelectAll,
  onRecordAction,
  onSort,
  sortField,
  sortDirection = 'asc',
  actions = [],
  emptyMessage = 'No records found',
  className = '',
  showCheckboxes = false,
  showActions = true,
  dense = false,
  stickyHeader = true,
  maxHeight = 600,
  primaryKeyField = 'id',
}: DynamicRecordsTableProps) {
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

  // Handle sort
  const handleSort = (field: string) => {
    if (!onSort) return;
    
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  };

  // Handle action menu
  const handleActionClick = (event: React.MouseEvent<HTMLElement>, recordId: string) => {
    setAnchorEl(prev => ({ ...prev, [recordId]: event.currentTarget }));
  };

  const handleActionClose = (recordId: string) => {
    setAnchorEl(prev => ({ ...prev, [recordId]: null }));
  };

  const handleActionSelect = (action: string, record: any) => {
    onRecordAction?.(action, record);
    // Close all menus
    setAnchorEl({});
  };

  // Handle selection
  const handleRecordSelect = (recordId: string, selected: boolean) => {
    onRecordSelect?.(recordId, selected);
  };

  const handleSelectAll = (selected: boolean) => {
    onSelectAll?.(selected);
  };

  // Get record ID (try multiple possible fields)
  const getRecordId = (record: any): string => {
    return record[primaryKeyField] || 
           record.id || 
           record._id || 
           record[`${primaryKeyField}_id`] ||
           String(record._columnPositions?.[0] || '');
  };

  // Check if all records are selected
  const allSelected = records.length > 0 && selectedRecords.length === records.length;
  const someSelected = selectedRecords.length > 0 && selectedRecords.length < records.length;

  // Sort columns by position
  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.position - b.position);
  }, [columns]);

  // Loading skeleton
  if (loading) {
    return <DynamicRecordsTableSkeleton columns={columns.length} rows={10} />;
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  // Empty state
  if (records.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        maxHeight: stickyHeader ? maxHeight : undefined,
        borderRadius: 2,
        boxShadow: 1,
      }}
      className={className}
    >
      <Table stickyHeader={stickyHeader} size={dense ? 'small' : 'medium'}>
        <TableHead>
          <TableRow>
            {showCheckboxes && (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
            )}
            {sortedColumns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align || 'left'}
                sx={{
                  width: column.width,
                  cursor: column.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  fontWeight: 600,
                  backgroundColor: 'grey.50',
                }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {column.label}
                  {column.sortable && sortField === column.key && (
                    <Chip
                      label={sortDirection === 'asc' ? '↑' : '↓'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </TableCell>
            ))}
            {showActions && actions.length > 0 && (
              <TableCell align="right" sx={{ width: 60, backgroundColor: 'grey.50' }}>
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record, index) => {
            const recordId = getRecordId(record);
            const isSelected = selectedRecords.includes(recordId);
            const menuAnchor = anchorEl[recordId];

            return (
              <motion.tr
                key={recordId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                asChild
              >
                <TableRow
                  hover
                  selected={isSelected}
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: 'grey.50',
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  {showCheckboxes && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleRecordSelect(recordId, e.target.checked)}
                      />
                    </TableCell>
                  )}
                  {sortedColumns.map((column) => {
                    const value = column.render 
                      ? column.render(null, record)
                      : getColumnValue(record, column);

                    return (
                      <TableCell
                        key={column.key}
                        align={column.align || 'left'}
                        sx={{ width: column.width }}
                      >
                        {value}
                      </TableCell>
                    );
                  })}
                  {showActions && actions.length > 0 && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleActionClick(e, recordId)}
                      >
                        <MoreIcon />
                      </IconButton>
                      <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={() => handleActionClose(recordId)}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                      >
                        {actions.map((action) => {
                          const isDisabled = action.disabled?.(record) || false;
                          
                          return (
                            <MenuItem
                              key={action.key}
                              onClick={() => handleActionSelect(action.key, record)}
                              disabled={isDisabled}
                              sx={{
                                color: isDisabled ? 'text.disabled' : `${action.color}.main`,
                              }}
                            >
                              <ListItemIcon>
                                {action.icon}
                              </ListItemIcon>
                              <ListItemText>{action.label}</ListItemText>
                            </MenuItem>
                          );
                        })}
                      </Menu>
                    </TableCell>
                  )}
                </TableRow>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Get column value from record using position or name
 */
function getColumnValue(record: any, column: DynamicTableColumn): any {
  // Try to get value by column position first
  if (record._displayData && record._displayData[column.position] !== undefined) {
    return record._displayData[column.position];
  }
  
  if (record._columnPositions && record._columnPositions[column.position] !== undefined) {
    return formatValue(record._columnPositions[column.position], column.type);
  }
  
  // Fallback to column name
  const columnName = column.key.replace('col_', '');
  const value = record[columnName];
  return formatValue(value, column.type);
}

/**
 * Format value based on column type
 */
function formatValue(value: any, type: string): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  switch (type) {
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'number':
      return value.toString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'json':
      return typeof value === 'string' ? value : JSON.stringify(value);
    default:
      return String(value);
  }
}

/**
 * Loading skeleton for dynamic records table
 */
export function DynamicRecordsTableSkeleton({ 
  columns = 5, 
  rows = 10 
}: { 
  columns?: number; 
  rows?: number; 
}) {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableCell key={index}>
                <Skeleton animation="wave" width="100%" height={24} />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton 
                    animation="wave" 
                    width={colIndex === 0 ? 60 : colIndex === 1 ? 120 : 100} 
                    height={20} 
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Default actions for dynamic records table
 */
export const DEFAULT_DYNAMIC_ACTIONS = [
  {
    key: 'view',
    label: 'View',
    icon: <ViewIcon fontSize="small" />,
    color: 'primary' as const,
  },
  {
    key: 'edit',
    label: 'Edit',
    icon: <EditIcon fontSize="small" />,
    color: 'primary' as const,
  },
  {
    key: 'history',
    label: 'History',
    icon: <HistoryIcon fontSize="small" />,
    color: 'info' as const,
  },
  {
    key: 'download',
    label: 'Download',
    icon: <DownloadIcon fontSize="small" />,
    color: 'secondary' as const,
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: <DeleteIcon fontSize="small" />,
    color: 'error' as const,
  },
];

export default DynamicRecordsTable;
