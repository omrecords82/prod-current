/**
 * Live Table Builder - Page Component
 * Main page wrapper with import/export, reset, and toast functionality
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  IconButton,
  Collapse,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Refresh as ResetIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  HelpOutline as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { LiveTableBuilder } from './components/LiveTableBuilder';
import type { TableData, TableState } from './types';
import { tableDataToCsv, generateCsvFilename } from './utils/csvExport';
import { parseCsvTextToTableData } from './utils/csvImport';
import { HistoryManager } from './utils/history';
import { normalizeTableData } from './utils/normalize';
import { useTemplateManager } from './useTemplateManager';
import {
  ImportDialog,
  ResetDialog,
  SaveTemplateDialog,
  OverwriteTemplateDialog,
  DeleteTemplateDialog,
  LoadTemplateDialog,
  ImportTemplatesDialog,
  ToastSnackbar,
} from './LiveTableDialogs';

const STORAGE_KEY = 'om_live_table_builder_state_v1';
const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 6;

// Generate default table data using normalization
const createDefaultData = (): TableData => {
  return normalizeTableData(null, DEFAULT_ROWS, DEFAULT_COLS);
};

export const LiveTableBuilderPage: React.FC = () => {
  const [tableData, setTableData] = useState<TableData>(createDefaultData());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [csvFirstRowIsHeader, setCsvFirstRowIsHeader] = useState(true);
  const [showTips, setShowTips] = useState(false);
  const historyManagerRef = React.useRef<HistoryManager>(new HistoryManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  const [lastSavedState, setLastSavedState] = useState<string>('');

  // Toast notification handler (defined early to avoid TDZ issues)
  const showToast = useCallback(
    (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      setToast({ open: true, message, severity });
    },
    []
  );

  // Template manager hook
  const tmpl = useTemplateManager({
    tableData,
    showToast,
    setTableData,
    historyManagerRef,
    setCanUndo,
    setCanRedo,
    lastSavedState,
    setLastSavedState,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: TableState = JSON.parse(saved);
        if (parsed?.data?.columns && Array.isArray(parsed.data.columns) && 
            parsed?.data?.rows && Array.isArray(parsed.data.rows)) {
          // Normalize loaded data to ensure consistency
          const normalized = normalizeTableData(
            parsed.data,
            parsed.data.rows.length,
            parsed.data.columns.length
          );
          setTableData(normalized);
          historyManagerRef.current.initialize(normalized);
          setLastSavedState(JSON.stringify(normalized));
        } else {
          showToast('Invalid saved data format, using defaults', 'warning');  
          const defaultData = createDefaultData();
          setTableData(defaultData);
          historyManagerRef.current.initialize(defaultData);
          setLastSavedState(JSON.stringify(defaultData));
        }
      } else {
        const defaultData = createDefaultData();
        setTableData(defaultData);
        historyManagerRef.current.initialize(defaultData);
        setLastSavedState(JSON.stringify(defaultData));
      }
    } catch (e) {
      console.error('Failed to load table data:', e);
      showToast('Failed to load saved data, using defaults', 'warning');
      const defaultData = createDefaultData();
      setTableData(defaultData);
      historyManagerRef.current.initialize(defaultData);
      setLastSavedState(JSON.stringify(defaultData));
    }
    
    // Load templates from database
    tmpl.loadTemplatesFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmpl.loadTemplatesFromDb]);

  // Update undo/redo button states
  useEffect(() => {
    setCanUndo(historyManagerRef.current.canUndo());
    setCanRedo(historyManagerRef.current.canRedo());
  }, [tableData]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      if (tableData?.columns && Array.isArray(tableData.columns) && 
          tableData?.rows && Array.isArray(tableData.rows)) {
        const normalized = normalizeTableData(
          tableData,
          tableData.rows.length,
          tableData.columns.length
        );
        const state: TableState = {
          data: normalized,
          version: '1',
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setLastSavedState(JSON.stringify(normalized));
      }
    } catch (e) {
      console.error('Failed to save table data:', e);
      showToast('Failed to save data to localStorage', 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableData]);

  const handleDataChange = useCallback((data: TableData) => {
    // Normalize data before storing
    const normalized = normalizeTableData(
      data,
      data?.rows?.length || 0,
      data?.columns?.length || 0
    );
    
    // Only push to history if data actually changed
    const currentDataStr = JSON.stringify(tableData);
    const newDataStr = JSON.stringify(normalized);
    
    if (currentDataStr !== newDataStr) {
      setTableData(normalized);
      historyManagerRef.current.push(normalized);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());
    }
  }, [tableData]);

  const handleUndo = useCallback(() => {
    const previousState = historyManagerRef.current.undo();
    if (previousState) {
      setTableData(previousState);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());
      showToast('Undone', 'info');
    }
  }, [showToast]);

  const handleRedo = useCallback(() => {
    const nextState = historyManagerRef.current.redo();
    if (nextState) {
      setTableData(nextState);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());
      showToast('Redone', 'info');
    }
  }, [showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + Z (undo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Check for Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z (redo)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  const handleExport = useCallback(() => {
    try {
      if (!tableData?.columns || !tableData?.rows) {
        showToast('No data to export', 'warning');
        return;
      }

      // Normalize before export to ensure consistency
      const normalized = normalizeTableData(
        tableData,
        tableData.rows.length,
        tableData.columns.length
      );

      const state: TableState = {
        data: normalized,
        version: '1',
      };
      const json = JSON.stringify(state, null, 2);

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(() => {
          showToast('JSON copied to clipboard', 'success');
        }).catch(() => {
          // Clipboard API may fail, continue with download
        });
      }

      // Download file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `live-table-builder-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('JSON exported and copied to clipboard', 'success');
    } catch (e) {
      showToast('Failed to export data', 'error');
      console.error(e);
    }
  }, [tableData, showToast]);

  const handleImport = useCallback(() => {
    setImportDialogOpen(true);
    setImportCsv('');
  }, []);

  const handleImportCsv = useCallback(() => {
    setImportDialogOpen(true);
    setImportJson('');
  }, []);

  const handleImportCsvConfirm = useCallback(() => {
    try {
      if (!importCsv || !importCsv.trim()) {
      showToast('Please paste CSV data', 'warning');
      return;
    }

      const importedData = parseCsvTextToTableData(importCsv, csvFirstRowIsHeader);
      
      if (!importedData.columns || importedData.columns.length === 0) {
        showToast('Invalid CSV format: no columns found', 'error');
        return;
      }

      // Normalize imported data
      const normalized = normalizeTableData(
        importedData,
        importedData.rows?.length || 0,
        importedData.columns.length
      );

      setTableData(normalized);
      historyManagerRef.current.push(normalized);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());
      setImportDialogOpen(false);
      setImportCsv('');
      const rowCount = normalized.rows.length;
      const colCount = normalized.columns.length;
      showToast(`Imported ${rowCount} rows, ${colCount} columns`, 'success');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      showToast('Failed to parse CSV: ' + errorMsg, 'error');
      console.error(e);
    }
  }, [importCsv, csvFirstRowIsHeader, showToast]);

  const handleImportConfirm = useCallback(() => {
    try {
      if (!importJson || !importJson.trim()) {
        showToast('Please paste JSON data', 'warning');
        return;
      }

      const parsed: TableState = JSON.parse(importJson);
          if (parsed?.data?.columns && Array.isArray(parsed.data.columns) && 
              parsed?.data?.rows && Array.isArray(parsed.data.rows)) {
            // Normalize imported data
            const normalized = normalizeTableData(
              parsed.data,
              parsed.data.rows.length,
              parsed.data.columns.length
            );
            setTableData(normalized);
            historyManagerRef.current.push(normalized);
            setCanUndo(historyManagerRef.current.canUndo());
            setCanRedo(historyManagerRef.current.canRedo());
            setImportDialogOpen(false);
            setImportJson('');
            const rowCount = normalized.rows.length;
            const colCount = normalized.columns.length;
            showToast(`JSON imported: ${rowCount} rows, ${colCount} columns`, 'success');
          } else {
            showToast('Invalid JSON format: missing columns or rows', 'error');
          }
    } catch (e) {
      showToast('Failed to parse JSON: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error');
      console.error(e);
    }
  }, [importJson, showToast]);

  const handleImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text || !text.trim()) {
            showToast('File is empty', 'error');
            return;
          }

          const fileName = file.name.toLowerCase();
          const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.tsv');

          if (isCsv) {
            // Try CSV import
            const importedData = parseCsvTextToTableData(text, csvFirstRowIsHeader);
            if (!importedData.columns || importedData.columns.length === 0) {
              showToast('Invalid CSV format: no columns found', 'error');
              return;
            }
            // Normalize imported data
            const normalized = normalizeTableData(
              importedData,
              importedData.rows?.length || 0,
              importedData.columns.length
            );
            setTableData(normalized);
            historyManagerRef.current.push(normalized);
            setCanUndo(historyManagerRef.current.canUndo());
            setCanRedo(historyManagerRef.current.canRedo());
            const rowCount = normalized.rows.length;
            const colCount = normalized.columns.length;
            showToast(`Imported ${rowCount} rows, ${colCount} columns from CSV`, 'success');
          } else {
            // Try JSON import
            const parsed: TableState = JSON.parse(text);
            if (parsed?.data?.columns && Array.isArray(parsed.data.columns) && 
                parsed?.data?.rows && Array.isArray(parsed.data.rows)) {
              // Normalize imported data
              const normalizedJson = normalizeTableData(
                parsed.data,
                parsed.data.rows.length,
                parsed.data.columns.length
              );
              setTableData(normalizedJson);
              historyManagerRef.current.push(normalizedJson);
              setCanUndo(historyManagerRef.current.canUndo());
              setCanRedo(historyManagerRef.current.canRedo());
              const rowCount = normalizedJson.rows.length;
              const colCount = normalizedJson.columns.length;
              showToast(`Imported ${rowCount} rows, ${colCount} columns from JSON`, 'success');
            } else {
              showToast('Invalid JSON format: missing columns or rows', 'error');
            }
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          showToast('Failed to parse file: ' + errorMsg, 'error');
          console.error(err);
        }
      };
      reader.onerror = () => {
        showToast('Failed to read file', 'error');
      };
      reader.readAsText(file);
    },
    [showToast, csvFirstRowIsHeader]
  );

  const handleExportCsv = useCallback(() => {
    try {
      if (!tableData?.columns || !tableData?.rows) {
        showToast('No data to export', 'warning');
        return;
      }

      // Normalize before export to ensure consistency
      const normalized = normalizeTableData(
        tableData,
        tableData.rows.length,
        tableData.columns.length
      );

      const csv = tableDataToCsv(normalized);
      if (!csv) {
        showToast('Failed to generate CSV', 'error');
        return;
      }

      // Download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateCsvFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('CSV exported successfully', 'success');
    } catch (e) {
      showToast('Failed to export CSV', 'error');
      console.error(e);
    }
  }, [tableData, showToast]);

  const handleReset = useCallback(() => {
    setResetDialogOpen(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    try {
      const defaultData = createDefaultData();
      setTableData(defaultData);
      historyManagerRef.current.clear();
      historyManagerRef.current.initialize(defaultData);
      setCanUndo(false);
      setCanRedo(false);
      setResetDialogOpen(false);
      setLastSavedState(JSON.stringify(defaultData));
      showToast('Grid reset to defaults', 'success');
    } catch (e) {
      showToast('Failed to reset table', 'error');
      console.error(e);
    }
  }, [showToast]);
  


  return (
    <Container maxWidth="xl" sx={{ py: 4, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Live Table Builder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create, edit, and manage tables with clipboard paste support. Data is automatically saved.
            </Typography>
          </Box>
          <IconButton
            onClick={() => setShowTips(!showTips)}
            title="Show/hide quick tips"
            sx={{ ml: 2 }}
          >
            {showTips ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            <HelpIcon sx={{ ml: 0.5 }} />
          </IconButton>
        </Box>

        {/* Quick Tips */}
        <Collapse in={showTips}>
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              Quick Tips:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
              <li>Double-click column headers to edit them inline</li>
              <li>Paste data from Excel/Google Sheets directly into cells</li>
              <li>Use <strong>Ctrl+Z</strong> to undo and <strong>Ctrl+Y</strong> to redo</li>
              <li>Export to CSV for Excel compatibility or JSON for data backup</li>
              <li>Import CSV/TSV files with automatic delimiter detection</li>
              <li>All changes are automatically saved to your browser</li>
            </Box>
          </Paper>
        </Collapse>

        {/* Template Management Section */}
        <Box sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1.5 }}>
            Template Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Template Name"
              size="small"
              value={tmpl.templateName}
              onChange={(e) => tmpl.setTemplateName(e.target.value)}
              placeholder="e.g., en_baptism_records"
              sx={{ width: 200 }}
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => tmpl.setSaveTemplateDialogOpen(true)}
              disabled={!tmpl.templateName.trim()}
              size="small"
            >
              Save Template
            </Button>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Load Template</InputLabel>
              <Select
                value={tmpl.selectedTemplate}
                label="Load Template"
                disabled={tmpl.loadingTemplates}
                onChange={(e) => {
                  const slug = e.target.value;
                  tmpl.setSelectedTemplate(slug);
                  if (slug) {
                    tmpl.handleLoadTemplate(slug);
                  }
                }}
              >
                {tmpl.loadingTemplates ? (
                  <MenuItem disabled>Loading templates...</MenuItem>
                ) : tmpl.templates.length === 0 ? (
                  <MenuItem disabled>No templates available</MenuItem>
                ) : (
                  tmpl.templates.map((template) => (
                    <MenuItem key={template.slug} value={template.slug}>
                      {template.name} {template.is_global ? '(Global)' : ''}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (tmpl.selectedTemplate) {
                  tmpl.handleDeleteTemplate(tmpl.selectedTemplate);
                }
              }}
              disabled={!tmpl.selectedTemplate}
              color="error"
              size="small"
            >
              Delete
            </Button>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={tmpl.handleExportTemplates}
              size="small"
            >
              Export Templates
            </Button>
            <Button
              variant="outlined"
              startIcon={<ImportIcon />}
              onClick={tmpl.handleImportTemplates}
              size="small"
            >
              Import Templates
            </Button>
            <input
              accept=".json"
              style={{ display: 'none' }}
              id="import-templates-file-input"
              type="file"
              onChange={tmpl.handleImportTemplatesFile}
            />
            <label htmlFor="import-templates-file-input">
              <Button variant="outlined" component="span" startIcon={<ImportIcon />} size="small">
                Upload Templates
              </Button>
            </label>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={tmpl.handleCreateStandardTemplates}
              size="small"
              color="secondary"
            >
              Create Standard Templates
            </Button>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<UndoIcon />}
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            size="small"
          >
            Undo
          </Button>
          <Button
            variant="outlined"
            startIcon={<RedoIcon />}
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            size="small"
          >
            Redo
          </Button>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={handleReset}
            color="warning"
            size="small"
          >
            Reset
          </Button>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleImport}
            size="small"
          >
            Import JSON
          </Button>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleImportCsv}
            size="small"
          >
            Import CSV
          </Button>
          <input
            accept=".json,.csv,.tsv"
            style={{ display: 'none' }}
            id="import-file-input"
            type="file"
            onChange={handleImportFile}
          />
          <label htmlFor="import-file-input">
            <Button variant="outlined" component="span" startIcon={<ImportIcon />} size="small">
              Upload File
            </Button>
          </label>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            size="small"
          >
            Export JSON
          </Button>
          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            onClick={handleExportCsv}
            size="small"
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Helper Text */}
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Tip:</strong> Paste data from Excel/Google Sheets (Ctrl/Cmd+V) or start typing in any cell. 
          All changes are automatically saved.
        </Typography>
      </Box>

      {/* Table Builder */}
      <Box sx={{ flex: 1, minHeight: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <LiveTableBuilder
          data={tableData}
          onDataChange={handleDataChange}
          onToast={showToast}
        />
      </Box>

      {/* Dialogs */}
      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        importJson={importJson}
        setImportJson={setImportJson}
        importCsv={importCsv}
        setImportCsv={setImportCsv}
        csvFirstRowIsHeader={csvFirstRowIsHeader}
        setCsvFirstRowIsHeader={setCsvFirstRowIsHeader}
        onImportJsonConfirm={handleImportConfirm}
        onImportCsvConfirm={handleImportCsvConfirm}
      />
      <ResetDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleResetConfirm}
      />
      <SaveTemplateDialog
        open={tmpl.saveTemplateDialogOpen}
        onClose={() => tmpl.setSaveTemplateDialogOpen(false)}
        templateName={tmpl.templateName}
        setTemplateName={tmpl.setTemplateName}
        templateRecordType={tmpl.templateRecordType}
        setTemplateRecordType={tmpl.setTemplateRecordType}
        templateDescription={tmpl.templateDescription}
        setTemplateDescription={tmpl.setTemplateDescription}
        templateIsGlobal={tmpl.templateIsGlobal}
        setTemplateIsGlobal={tmpl.setTemplateIsGlobal}
        onSave={tmpl.handleSaveTemplate}
      />
      <OverwriteTemplateDialog
        open={tmpl.overwriteTemplateDialogOpen}
        onClose={() => tmpl.setOverwriteTemplateDialogOpen(false)}
        templateName={tmpl.templateName}
        onOverwrite={tmpl.handleOverwriteTemplate}
        onCancel={() => {
          tmpl.setOverwriteTemplateDialogOpen(false);
          tmpl.setTemplateName('');
          tmpl.setSaveTemplateDialogOpen(false);
        }}
      />
      <DeleteTemplateDialog
        open={tmpl.deleteTemplateDialogOpen}
        onClose={() => {
          tmpl.setDeleteTemplateDialogOpen(false);
          tmpl.setTemplateToDelete('');
        }}
        onConfirm={tmpl.handleConfirmDeleteTemplate}
      />
      <LoadTemplateDialog
        open={tmpl.loadTemplateDialogOpen}
        onClose={() => {
          tmpl.setLoadTemplateDialogOpen(false);
          tmpl.setTemplateToLoad('');
        }}
        onConfirm={tmpl.handleConfirmLoadTemplate}
      />
      <ImportTemplatesDialog
        open={tmpl.importTemplatesDialogOpen}
        onClose={() => tmpl.setImportTemplatesDialogOpen(false)}
        importTemplatesJson={tmpl.importTemplatesJson}
        setImportTemplatesJson={tmpl.setImportTemplatesJson}
        onConfirm={tmpl.handleImportTemplatesConfirm}
      />
      <ToastSnackbar
        toast={toast}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </Container>
  );
};

export default LiveTableBuilderPage;
