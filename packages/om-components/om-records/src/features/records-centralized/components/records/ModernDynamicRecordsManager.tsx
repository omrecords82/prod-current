/**
 * Orthodox Metrics - Modern Dynamic Records Manager
 * Updated to use the new unified configuration system and template-agnostic architecture
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  TableChart as TableIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

// Import new unified hooks and components from local files
import {
  useUnifiedRecords,
  useUnifiedRecordMutations,
  useAvailableTables,
  useTableSchema,
  useFieldDefinitions,
  useSearchableFields,
  useSortableFields,
  useRequiredFields,
} from './useUnifiedRecords';
import { useDynamicRecords, useRecordTables, useTableColumns } from './useDynamicRecords';

// Template helpers (using defaults for now)
const getCurrentTemplate = () => 'default';
const switchTemplate = (_: string) => {};
const getRecordsTableComponent = () => null;
import { RecordsSearch } from './RecordsSearch';
import { RecordsModal } from './RecordsModal';

// Import types
import { RecordData, RecordFilters, UnifiedTableSchema } from './RecordsTypes';

interface ModernDynamicRecordsManagerProps {
  churchId: number;
  initialTableName?: string;
  readOnly?: boolean;
  onTableChange?: (tableName: string) => void;
  onRecordSelect?: (record: RecordData) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ModernDynamicRecordsManager({
  churchId,
  initialTableName = '',
  readOnly = false,
  onTableChange,
  onRecordSelect,
  className,
  style,
}: ModernDynamicRecordsManagerProps) {
  // State management
  const [selectedTable, setSelectedTable] = useState<string>(initialTableName);
  const [isLocked, setIsLocked] = useState(readOnly);
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<RecordData | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Get available tables
  const {
    tables,
    loading: tablesLoading,
    error: tablesError,
    refetch: refetchTables,
  } = useAvailableTables(churchId);

  // Get table schema
  const {
    schema,
    loading: schemaLoading,
    error: schemaError,
  } = useTableSchema(churchId, selectedTable);

  // Get field definitions
  const {
    fields,
    loading: fieldsLoading,
  } = useFieldDefinitions(churchId, selectedTable);

  // Get searchable and sortable fields
  const {
    fields: searchableFields,
  } = useSearchableFields(churchId, selectedTable);

  const {
    fields: sortableFields,
  } = useSortableFields(churchId, selectedTable);

  const {
    fields: requiredFields,
  } = useRequiredFields(churchId, selectedTable);

  // Unified records management
  const {
    records,
    pagination,
    loading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords,
    setFilters,
    setSort,
    setPagination,
  } = useUnifiedRecords({
    churchId,
    tableName: selectedTable,
    enabled: !!selectedTable,
  });

  // Record mutations
  const {
    createRecord,
    updateRecord,
    deleteRecord,
    isCreating,
    isUpdating,
    isDeleting,
    error: mutationError,
  } = useUnifiedRecordMutations({
    churchId,
    tableName: selectedTable,
    onSuccess: (data) => {
      setSnackbar({
        open: true,
        message: 'Record saved successfully',
        severity: 'success',
      });
      refetchRecords();
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error',
      });
    },
  });

  // Get the appropriate table component for current template
  const RecordsTable = useMemo(() => getRecordsTableComponent(), [currentTemplate]);

  // Memoized actions configuration
  const actions = useMemo(() => [
    {
      key: 'view',
      label: 'View',
      icon: <ViewIcon />,
      color: 'primary' as const,
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditIcon />,
      color: 'primary' as const,
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteIcon />,
      color: 'error' as const,
    },
  ], []);

  // Event handlers
  const handleTableChange = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    onTableChange?.(tableName);
    // Reset filters and pagination when switching tables
    setFilters({});
    setPagination({ page: 1, limit: 50 });
  }, [onTableChange, setFilters, setPagination]);

  const handleSearch = useCallback((filters: RecordFilters) => {
    setFilters(filters);
  }, [setFilters]);

  const handleSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSort({ field, direction });
  }, [setSort]);

  const handlePaginationChange = useCallback((page: number, limit: number) => {
    setPagination({ page, limit });
  }, [setPagination]);

  const handleRecordAction = useCallback((action: string, record: RecordData) => {
    switch (action) {
      case 'view':
        setSelectedRecord(record);
        setShowForm(true);
        onRecordSelect?.(record);
        break;
      case 'edit':
        setSelectedRecord(record);
        setShowForm(true);
        break;
      case 'delete':
        setRecordToDelete(record);
        setShowDeleteConfirm(true);
        break;
    }
  }, [onRecordSelect]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!recordToDelete) return;

    try {
      await deleteRecord(recordToDelete.id);
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      setSnackbar({
        open: true,
        message: 'Record deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Error deleting record: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }
  }, [recordToDelete, deleteRecord]);

  const handleFormSuccess = useCallback((record: RecordData) => {
    setShowForm(false);
    setSelectedRecord(null);
    setSnackbar({
      open: true,
      message: 'Record saved successfully',
      severity: 'success',
    });
  }, []);

  const handleFormError = useCallback((error: string) => {
    setSnackbar({
      open: true,
      message: `Form error: ${error}`,
      severity: 'error',
    });
  }, []);

  const handleLockToggle = useCallback(() => {
    setIsLocked(!isLocked);
  }, [isLocked]);

  const handleTemplateSwitch = useCallback((template: string) => {
    switchTemplate(template as any);
    setSnackbar({
      open: true,
      message: `Switched to ${template} template`,
      severity: 'info',
    });
  }, []);

  // Loading state for tables
  if (tablesLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Discovering record tables...</Typography>
      </Box>
    );
  }

  // Error state for tables
  if (tablesError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error discovering tables: {tablesError}
        <Button onClick={() => refetchTables()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  // No tables found
  if (tables.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No record tables found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Tables should be named with pattern: om_church_##_*_records
        </Typography>
        <Button onClick={() => refetchTables()} sx={{ mt: 2 }}>
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <Box className={className} style={style}>
      {/* Header */}
      <Paper elevation={2} sx={{ mb: 2 }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TableIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                Dynamic Records Manager
              </Typography>
              <Chip
                label={currentTemplate.toUpperCase()}
                color="primary"
                size="small"
                sx={{ ml: 1 }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={isLocked ? 'Locked' : 'Unlocked'}
                color={isLocked ? 'error' : 'success'}
                icon={isLocked ? <LockIcon /> : <LockOpenIcon />}
              />
              
              <Tooltip title="Toggle Lock">
                <IconButton onClick={handleLockToggle} disabled={readOnly}>
                  {isLocked ? <LockIcon /> : <LockOpenIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Settings">
                <IconButton onClick={() => setShowSettings(true)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Table Selection */}
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth sx={{ maxWidth: 400 }}>
              <InputLabel>Select Record Table</InputLabel>
              <Select
                value={selectedTable}
                onChange={(e) => handleTableChange(e.target.value)}
                label="Select Record Table"
              >
                {tables.map((table) => (
                  <MenuItem key={table.tableName} value={table.tableName}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TableIcon fontSize="small" />
                      <Box>
                        <Typography variant="body1">{table.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {table.tableName} • {table.fieldCount} fields
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Action Buttons */}
          {selectedTable && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowForm(true)}
                disabled={isLocked}
              >
                Add Record
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setShowImport(true)}
                disabled={isLocked}
              >
                Import
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => {/* Handle export */}}
              >
                Export
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => refetchRecords()}
              >
                Refresh
              </Button>
            </Box>
          )}
        </Box>

        {/* Content */}
        {selectedTable ? (
          <>
            {/* Search and Filters */}
            <Box sx={{ p: 3, pb: 0 }}>
              <RecordsSearch
                churchId={churchId}
                tableName={selectedTable}
                onSearch={handleSearch}
                searchableFields={searchableFields}
                loading={recordsLoading}
              />
            </Box>

            {/* Records Table */}
            <Box sx={{ p: 3, pt: 0 }}>
              {schemaLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : schemaError ? (
                <Alert severity="error">
                  Error loading table schema: {schemaError}
                </Alert>
              ) : (
                <RecordsTable
                  data={records || []}
                  schema={schema!}
                  churchId={churchId}
                  tableName={selectedTable}
                  loading={recordsLoading}
                  error={recordsError}
                  onRecordSelect={onRecordSelect}
                  onRecordEdit={(record) => handleRecordAction('edit', record)}
                  onRecordDelete={(record) => handleRecordAction('delete', record)}
                  onRecordCreate={() => setShowForm(true)}
                  onFiltersChange={handleSearch}
                  onSortChange={handleSort}
                  onPaginationChange={handlePaginationChange}
                  pagination={pagination}
                  enableSelection={!isLocked}
                  enableSorting={true}
                  enableFiltering={true}
                  enablePagination={true}
                  enableSearch={true}
                  enableExport={true}
                  enableBulkActions={!isLocked}
                  enableRowActions={!isLocked}
                />
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Select a table to view records
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Choose from the dropdown above to start managing records
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Form Modal */}
      {selectedTable && (
        <RecordsModal
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedRecord(null);
          }}
          title={selectedRecord ? 'Edit Record' : 'Add New Record'}
          maxWidth="md"
        >
          {/* Form content would go here */}
          <Box sx={{ p: 2 }}>
            <Typography variant="body1">
              Form implementation for {selectedTable} records
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This would contain the dynamic form based on field definitions
            </Typography>
          </Box>
        </RecordsModal>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this record? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Template Settings
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['mui', 'berry', 'antd', 'chakra'].map((template) => (
                <Button
                  key={template}
                  variant={currentTemplate === template ? 'contained' : 'outlined'}
                  onClick={() => handleTemplateSwitch(template)}
                  size="small"
                >
                  {template.toUpperCase()}
                </Button>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
}

export default ModernDynamicRecordsManager;
