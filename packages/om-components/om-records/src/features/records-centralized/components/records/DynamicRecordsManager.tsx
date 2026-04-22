/**
 * Dynamic Records Manager
 * Automatically discovers and works with any om_church_## tables ending in _records
 * Uses column positions instead of field names
 */

import React, { useState, useMemo } from 'react';
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
} from '@mui/icons-material';

// Import dynamic components
import {
  
  
  
  useRecordTables,
  useDynamicRecords,
  useDynamicRecordMutations,
  useDynamicRecordImportExport,
  useTableColumns,
  useFormFields,
  useSearchFilters,
  
  
} from './useDynamicRecords';

import DynamicRecordForm from './DynamicRecordForm';
import { RecordsSearch } from "./RecordsSearch";
import { RecordsModal } from "./RecordsModal";
import { DynamicRecordsTable } from "./DynamicRecordsTable";
import { THEME_COLORS } from '../constants';

// Types
interface DynamicRecordsManagerProps {
  churchId: string;
  PDFDocument?: any;
  ReadOnlyView?: React.ComponentType;
}

export function DynamicRecordsManager({
  churchId,
  PDFDocument,
  ReadOnlyView,
}: DynamicRecordsManagerProps) {
  // State management
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ field: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  
  

  // Discover available tables
  const { 
    tables, 
    isLoading: tablesLoading, 
    error: tablesError, 
    refetch: refetchTables 
  } = useRecordTables(churchId);

  // Get table schema and columns
  const { 
    columns, 
    isLoading: columnsLoading, 
    error: columnsError, 
    schema 
  } = useTableColumns(churchId, selectedTable);

  // Get form fields
  const { 
    fields, 
    isLoading: fieldsLoading 
  } = useFormFields(churchId, selectedTable);

  // Get search filters
  const { 
    filters: searchFilters 
  } = useSearchFilters(churchId, selectedTable);

  // Data fetching
  const {
    records,
    total,
    page,
    totalPages,
    isLoading,
    error,
    refetch,
  } = useDynamicRecords(churchId, selectedTable, {
    filters: filters,
    sort: sort,
    pagination: { page: currentPage, limit: pageSize },
    enabled: !!selectedTable,
  });

  // Mutations
  const { create, update, delete: deleteRecord } = useDynamicRecordMutations(churchId, selectedTable);
  const { import: importMutation, export: exportMutation } = useDynamicRecordImportExport(churchId, selectedTable);

  // Theme colors (use default theme)
  const themeColors = THEME_COLORS.baptism; // Use consistent theme

  // Actions configuration
  const actions = useMemo(() => [
    {
      key: 'view',
      label: 'View',
      icon: <span>👁️</span>,
      color: 'primary' as const,
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <span>✏️</span>,
      color: 'primary' as const,
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <span>🗑️</span>,
      color: 'error' as const,
    },
  ], []);

  // Event handlers
  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setSearchTerm(""); setFilters({}); setSort({ field: "", direction: "asc" });
    setCurrentPage(1);
  };

  const handleSearch = () => {
    refetch();
  };

  const handleClear = () => {
    setSearchTerm(""); setFilters({}); setSort({ field: "", direction: "asc" });
    refetch();
  };

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSort({ field, direction });
  };

  const handleRecordAction = (action: string, record: any) => {
    switch (action) {
      case 'view':
        setSelectedRecord(record);
        setShowForm(true);
        break;
      case 'edit':
        setSelectedRecord(record);
        setShowForm(true);
        break;
      case 'delete':
        handleDeleteRecord(record);
        break;
    }
  };

  const handleDeleteRecord = async (record: any) => {
    const recordId = record.id || record._id || record[Object.keys(record)[0]];
    if (window.confirm(`Are you sure you want to delete this record?`)) {
      try {
        await deleteRecord.mutateAsync(recordId);
        refetch();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const handleFormSuccess = (record: any) => {
    setShowForm(false);
    setSelectedRecord(null);
    refetch();
  };

  const handleFormError = (error: string) => {
    console.error('Form error:', error);
  };

  const handleImport = async (file: File) => {
    try {
      await importMutation.mutateAsync({ file });
      setShowImport(false);
      refetch();
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const result = await exportMutation.mutateAsync({ 
        format, 
        filters: filters 
      });
      
      if (result.success && result.data) {
        // Create download link
        const url = window.URL.createObjectURL(result.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedTable}-export.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleLockToggle = () => {
    setIsLocked(!isLocked);
  };

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
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: themeColors.gradient,
        minHeight: '100vh',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            background: themeColors.header,
            borderBottom: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TableIcon sx={{ color: 'white', fontSize: 32 }} />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'white' }}>
                Dynamic Records Manager
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={isLocked ? 'Locked' : 'Unlocked'}
                color={isLocked ? 'error' : 'success'}
                icon={isLocked ? <LockIcon /> : <LockOpenIcon />}
                sx={{ color: 'white' }}
              />
              
              <Tooltip title="Toggle Lock">
                <IconButton onClick={handleLockToggle} sx={{ color: 'white' }}>
                  {isLocked ? <LockIcon /> : <LockOpenIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Table Selection */}
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth sx={{ maxWidth: 400 }}>
              <InputLabel sx={{ color: 'white' }}>Select Record Table</InputLabel>
              <Select
                value={selectedTable}
                onChange={(e) => handleTableChange(e.target.value)}
                label="Select Record Table"
                sx={{ 
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
              >
                {tables.map((table) => (
                  <MenuItem key={table.tableName} value={table.tableName}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TableIcon fontSize="small" />
                      <Box>
                        <Typography variant="body1">{table.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {table.tableName}
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
                sx={{
                  background: themeColors.addButton,
                  '&:hover': { background: themeColors.addButton, opacity: 0.9 }
                }}
              >
                Add Record
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setShowImport(true)}
                disabled={isLocked}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Import
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleExport('csv')}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Export CSV
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => refetch()}
                sx={{ color: 'white', borderColor: 'white' }}
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
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSearch={handleSearch}
                onClear={handleClear}
                filters={searchFilters}
                activeFilters={filters}
                onFilterChange={setFilters}
                onClearFilters={setFilters({})}
                loading={isLoading}
                resultsCount={total}
                showFilters={true}
                showResultsCount={true}
                searchPlaceholder={`Search ${schema?.displayName || selectedTable} records...`}
              />
            </Box>

            {/* Records Table */}
            <Box sx={{ p: 3, pt: 0 }}>
              {columnsLoading ? (
                <DynamicRecordsTable 
                  columns={[]} 
                  records={[]} 
                  loading={true} 
                />
              ) : columnsError ? (
                <Alert severity="error">
                  Error loading table schema: {columnsError}
                </Alert>
              ) : (
                <DynamicRecordsTable
                  records={records}
                  columns={columns}
                  loading={isLoading}
                  error={error}
                  onRecordAction={handleRecordAction}
                  onSort={handleSort}
                  sortField={sort?.field}
                  sortDirection={sort?.direction}
                  actions={actions}
                  showCheckboxes={!isLocked}
                  showActions={!isLocked}
                  emptyMessage={`No ${schema?.displayName || selectedTable} records found`}
                  primaryKeyField={schema?.primaryKey}
                />
              )}
            </Box>

            {/* Pagination */}
            <Box sx={{ p: 3, pt: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {records.length} of {total} records
                (Page {page} of {totalPages})
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={pagination.prevPage}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={pagination.nextPage}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </Box>
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
        <DynamicRecordForm
          churchId={churchId}
          tableName={selectedTable}
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedRecord(null);
          }}
          currentRecord={selectedRecord}
          onSuccess={handleFormSuccess}
          onError={handleFormError}
        />
      )}

      {/* Import Modal */}
      <RecordsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title={`Import ${selectedTable} Records`}
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Select a file to import records into {selectedTable}. Supported formats: CSV, Excel.
          </Typography>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </Box>
      </RecordsModal>
    </Box>
  );
}

export default DynamicRecordsManager;
