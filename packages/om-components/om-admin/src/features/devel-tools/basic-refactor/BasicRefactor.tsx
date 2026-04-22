import { apiClient } from '@/api/utils/axiosInstance';
import { CustomizerContext } from '@/context/CustomizerContext';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    IconButton,
    Paper,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Download,
    FileText,
    FolderOpen,
    Plus,
    RefreshCw,
    Save,
    Settings,
    Trash2
} from '@/ui/icons';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import {
    PolicyEvaluationResult,
} from '@/types/refactorConsole';
import { loadPolicy } from '../refactor-console/engine/policy';
import { evaluatePolicy } from '../refactor-console/engine/evaluate';
import refactorConsoleClient, {
    DEFAULT_SCOPES,
    ScanScope
} from '../refactor-console/api/refactorConsoleClient';

// ============================================================================
// Types
// ============================================================================
interface PolicyFileEntry {
  filename: string;
  path: string;
  size: number;
  modified: string;
}

// ============================================================================
// Default YAML template for new policies
// ============================================================================
const NEW_POLICY_TEMPLATE = `# New Refactor Policy
# Edit rules below. Reload via the UI after saving.

version: 1

rules:
  - id: example-rule
    enabled: true
    scope: prod_root
    description: "Example: find stray markdown files"
    when:
      any_dir_exists: ["**"]
      not_under: []
    match:
      extensions: [".md"]
    suggest:
      action: move
      dest: "/var/www/orthodoxmetrics/prod/ops/docs/{rel_parent}/"
      confidence: 0.5
`;

// ============================================================================
// Component
// ============================================================================
const BasicRefactor: React.FC = () => {
  const { activeMode } = useContext(CustomizerContext);
  const theme = useTheme();

  // Standalone: scopes uses updater-fn callsites
  const [scopes, setScopes] = useState<ScanScope[]>(() => refactorConsoleClient.getSavedScopes());

  // Bucketed state: UI (scopes panel + evaluation UI) — 7 fields
  interface UiState {
    showScopesPanel: boolean;
    editingIgnoreScope: string | null;
    ignoreEditValue: string;
    policyFindings: PolicyEvaluationResult | null;
    isEvaluating: boolean;
    evalError: string | null;
    showFindings: boolean;
  }
  const [uiState, setUiState] = useState<UiState>({
    showScopesPanel: false,
    editingIgnoreScope: null,
    ignoreEditValue: '',
    policyFindings: null,
    isEvaluating: false,
    evalError: null,
    showFindings: false,
  });
  const setUiField = useCallback(<K extends keyof UiState>(key: K, value: UiState[K]) => {
    setUiState(prev => ({ ...prev, [key]: value }));
  }, []);
  const { showScopesPanel, editingIgnoreScope, ignoreEditValue, policyFindings, isEvaluating, evalError, showFindings } = uiState;
  const setShowScopesPanel = useCallback((v: boolean) => setUiField('showScopesPanel', v), [setUiField]);
  const setEditingIgnoreScope = useCallback((v: string | null) => setUiField('editingIgnoreScope', v), [setUiField]);
  const setIgnoreEditValue = useCallback((v: string) => setUiField('ignoreEditValue', v), [setUiField]);
  const setPolicyFindings = useCallback((v: PolicyEvaluationResult | null) => setUiField('policyFindings', v), [setUiField]);
  const setIsEvaluating = useCallback((v: boolean) => setUiField('isEvaluating', v), [setUiField]);
  const setEvalError = useCallback((v: string | null) => setUiField('evalError', v), [setUiField]);
  const setShowFindings = useCallback((v: boolean) => setUiField('showFindings', v), [setUiField]);

  // Bucketed state: policy files editor — 8 fields
  interface PolicyFilesState {
    policyFiles: PolicyFileEntry[];
    isLoadingFiles: boolean;
    selectedPolicyPath: string;
    editorContent: string;
    editorDirty: boolean;
    isSaving: boolean;
    newFileName: string;
    showNewFileInput: boolean;
  }
  const [policyFilesState, setPolicyFilesState] = useState<PolicyFilesState>({
    policyFiles: [],
    isLoadingFiles: false,
    selectedPolicyPath: '',
    editorContent: '',
    editorDirty: false,
    isSaving: false,
    newFileName: '',
    showNewFileInput: false,
  });
  const setPolicyFilesField = useCallback(<K extends keyof PolicyFilesState>(key: K, value: PolicyFilesState[K]) => {
    setPolicyFilesState(prev => ({ ...prev, [key]: value }));
  }, []);
  const { policyFiles, isLoadingFiles, selectedPolicyPath, editorContent, editorDirty, isSaving, newFileName, showNewFileInput } = policyFilesState;
  const setPolicyFiles = useCallback((v: PolicyFileEntry[]) => setPolicyFilesField('policyFiles', v), [setPolicyFilesField]);
  const setIsLoadingFiles = useCallback((v: boolean) => setPolicyFilesField('isLoadingFiles', v), [setPolicyFilesField]);
  const setSelectedPolicyPath = useCallback((v: string) => setPolicyFilesField('selectedPolicyPath', v), [setPolicyFilesField]);
  const setEditorContent = useCallback((v: string) => setPolicyFilesField('editorContent', v), [setPolicyFilesField]);
  const setEditorDirty = useCallback((v: boolean) => setPolicyFilesField('editorDirty', v), [setPolicyFilesField]);
  const setIsSaving = useCallback((v: boolean) => setPolicyFilesField('isSaving', v), [setPolicyFilesField]);
  const setNewFileName = useCallback((v: string) => setPolicyFilesField('newFileName', v), [setPolicyFilesField]);
  const setShowNewFileInput = useCallback((v: boolean) => setPolicyFilesField('showNewFileInput', v), [setPolicyFilesField]);

  // ========================================================================
  // Load policy file list
  // ========================================================================
  const loadPolicyFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const data = await apiClient.get<any>('/refactor-console/policy/list');
      if (data.ok) {
        setPolicyFiles(data.files);
        // Auto-select first if none selected
        if (!selectedPolicyPath && data.files.length > 0) {
          setSelectedPolicyPath(data.files[0].path);
        }
      }
    } catch (err) {
      toast.error('Failed to load policy files');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [selectedPolicyPath]);

  useEffect(() => {
    loadPolicyFiles();
  }, []);

  // ========================================================================
  // Load selected policy content
  // ========================================================================
  const loadPolicyContent = useCallback(async (policyPath: string) => {
    if (!policyPath) return;
    try {
      const data = await apiClient.get<any>(`/refactor-console/policy?path=${encodeURIComponent(policyPath)}`);
      if (data.ok) {
        setEditorContent(data.content);
        setEditorDirty(false);
      } else {
        toast.error(data.message || 'Failed to load policy');
      }
    } catch (err) {
      toast.error('Failed to load policy content');
    }
  }, []);

  useEffect(() => {
    if (selectedPolicyPath) {
      loadPolicyContent(selectedPolicyPath);
    }
  }, [selectedPolicyPath, loadPolicyContent]);

  // ========================================================================
  // Save policy content
  // ========================================================================
  const handleSave = useCallback(async () => {
    if (!selectedPolicyPath) return;
    setIsSaving(true);
    try {
      const data = await apiClient.put<any>('/refactor-console/policy', { path: selectedPolicyPath, content: editorContent });
      if (data.ok) {
        setEditorDirty(false);
        toast.success('Policy saved');
        loadPolicyFiles();
      } else {
        toast.error(data.message || 'Save failed');
      }
    } catch (err) {
      toast.error('Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  }, [selectedPolicyPath, editorContent, loadPolicyFiles]);

  // ========================================================================
  // Create new policy file
  // ========================================================================
  const handleCreateNew = useCallback(async () => {
    let filename = newFileName.trim();
    if (!filename) {
      toast.warning('Enter a filename');
      return;
    }
    if (!filename.endsWith('.yml') && !filename.endsWith('.yaml')) {
      filename += '.yml';
    }
    const fullPath = `/var/www/orthodoxmetrics/prod/ops/refactor/${filename}`;
    setIsSaving(true);
    try {
      const data = await apiClient.put<any>('/refactor-console/policy', { path: fullPath, content: NEW_POLICY_TEMPLATE });
      if (data.ok) {
        toast.success(`Created: ${filename}`);
        setNewFileName('');
        setShowNewFileInput(false);
        await loadPolicyFiles();
        setSelectedPolicyPath(fullPath);
      } else {
        toast.error(data.message || 'Create failed');
      }
    } catch (err) {
      toast.error('Failed to create policy file');
    } finally {
      setIsSaving(false);
    }
  }, [newFileName, loadPolicyFiles]);

  // ========================================================================
  // Delete policy file
  // ========================================================================
  const handleDelete = useCallback(async (filePath: string) => {
    if (!window.confirm(`Delete policy file?\n${filePath}`)) return;
    try {
      const data = await apiClient.delete<any>(`/refactor-console/policy?path=${encodeURIComponent(filePath)}`);
      if (data.ok) {
        toast.success('Policy deleted');
        if (selectedPolicyPath === filePath) {
          setSelectedPolicyPath('');
          setEditorContent('');
        }
        loadPolicyFiles();
      } else {
        toast.error(data.message || 'Delete failed');
      }
    } catch (err) {
      toast.error('Failed to delete policy file');
    }
  }, [selectedPolicyPath, loadPolicyFiles]);

  // ========================================================================
  // Scope handlers
  // ========================================================================
  const handleToggleScope = useCallback((scopeId: string) => {
    setScopes(prev => {
      const updated = prev.map(s => s.id === scopeId ? { ...s, enabled: !s.enabled } : s);
      refactorConsoleClient.saveScopes(updated);
      return updated;
    });
  }, []);

  const handleSaveIgnorePatterns = useCallback((scopeId: string, patterns: string[]) => {
    setScopes(prev => {
      const updated = prev.map(s => s.id === scopeId ? { ...s, ignore: patterns } : s);
      refactorConsoleClient.saveScopes(updated);
      return updated;
    });
    setEditingIgnoreScope(null);
  }, []);

  // ========================================================================
  // Evaluate policy against scan data
  // ========================================================================
  const handleEvaluate = useCallback(async () => {
    if (!selectedPolicyPath) {
      toast.warning('Select a policy file first');
      return;
    }
    setIsEvaluating(true);
    setEvalError(null);
    try {
      // If dirty, save first
      if (editorDirty) {
        await handleSave();
      }
      const policy = await loadPolicy(selectedPolicyPath);

      // Fetch scan data for enabled scopes
      const enabledScopes = scopes.filter(s => s.enabled);
      if (enabledScopes.length === 0) {
        toast.warning('Enable at least one scope before evaluating');
        setIsEvaluating(false);
        return;
      }

      // Use the existing scan endpoint for the first enabled scope
      const scope = enabledScopes[0];
      const scanData = await apiClient.get<any>(`/refactor-console/scan?sourcePath=${encodeURIComponent(scope.root)}&sourceType=local`);

      if (!scanData.ok || !scanData.nodes || scanData.nodes.length === 0) {
        toast.warning('Scan returned no data. Run a scan in the Refactor Console first, or check the scope root path.');
        setIsEvaluating(false);
        return;
      }

      const inventory = scanData.nodes.map((node: any) => ({
        path: node.path,
        relPath: node.relPath,
        scopeId: scope.id,
        ext: node.relPath.includes('.') ? '.' + node.relPath.split('.').pop()!.toLowerCase() : '',
        size: node.size,
        mtime: node.mtimeMs,
        isDir: node.type === 'dir',
      }));

      const result = evaluatePolicy(inventory, policy);
      setPolicyFindings(result);
      setShowFindings(true);
      toast.success(`Evaluated: ${result.summary.totalFindings} findings from ${policy.rules.length} rules`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Evaluation failed';
      setEvalError(msg);
      toast.error(msg);
    } finally {
      setIsEvaluating(false);
    }
  }, [selectedPolicyPath, editorDirty, handleSave, scopes]);

  // ========================================================================
  // Export findings
  // ========================================================================
  const handleExportFindings = useCallback((format: 'json' | 'csv') => {
    if (!policyFindings) return;
    try {
      let content: string;
      let mimeType: string;
      let ext: string;
      if (format === 'json') {
        content = JSON.stringify(policyFindings, null, 2);
        mimeType = 'application/json';
        ext = 'json';
      } else {
        const header = 'ruleId,scopeId,path,relPath,reason,action,dest,confidence';
        const rows = policyFindings.findings.map(f =>
          [f.ruleId, f.scopeId, f.path, f.relPath, `"${f.reason}"`, f.suggested.action, f.suggested.dest || '', f.suggested.confidence].join(',')
        );
        content = [header, ...rows].join('\n');
        mimeType = 'text/csv';
        ext = 'csv';
      }
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `refactor-findings-${new Date().toISOString().split('T')[0]}.${ext}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${ext.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed');
    }
  }, [policyFindings]);

  // ========================================================================
  // Render
  // ========================================================================
  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: theme.palette.background.default,
      color: theme.palette.text.primary,
    }}>
      {/* Header */}
      <Box sx={{
        px: 3, py: 2,
        bgcolor: theme.palette.background.paper,
        borderBottom: 1,
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FolderOpen className="w-6 h-6" style={{ color: theme.palette.primary.main }} />
            <Typography variant="h5" fontWeight={700}>Basic Refactor</Typography>
            <Chip label="Policy Editor" size="small" color="primary" variant="outlined" sx={{ height: 22 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Settings className="w-3.5 h-3.5" />}
              onClick={() => setShowScopesPanel(!showScopesPanel)}
              sx={{ textTransform: 'none' }}
            >
              Scopes
            </Button>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={handleEvaluate}
              disabled={isEvaluating || !selectedPolicyPath}
              startIcon={isEvaluating ? <CircularProgress size={14} /> : <RefreshCw className="w-3.5 h-3.5" />}
              sx={{ textTransform: 'none' }}
            >
              {isEvaluating ? 'Evaluating...' : 'Evaluate Policy'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Scopes Panel (collapsible) */}
      <Collapse in={showScopesPanel}>
        <Paper elevation={0} sx={{ mx: 3, mt: 2, p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), border: 1, borderColor: alpha(theme.palette.info.main, 0.2), borderRadius: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Scan Scopes</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {scopes.map(scope => (
              <Box key={scope.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 1, bgcolor: scope.enabled ? alpha(theme.palette.success.main, 0.08) : 'transparent', border: 1, borderColor: scope.enabled ? alpha(theme.palette.success.main, 0.3) : 'divider' }}>
                <Button size="small" variant={scope.enabled ? 'contained' : 'outlined'} color={scope.enabled ? 'success' : 'inherit'} onClick={() => handleToggleScope(scope.id)} sx={{ minWidth: 36, px: 1, textTransform: 'none', fontSize: '0.7rem' }}>
                  {scope.enabled ? 'ON' : 'OFF'}
                </Button>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>{scope.label}</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{scope.root}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip label={`${scope.ignore.length} ignores`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                  <Button size="small" sx={{ textTransform: 'none', fontSize: '0.65rem', minWidth: 'auto' }} onClick={() => {
                    setEditingIgnoreScope(scope.id);
                    setIgnoreEditValue(scope.ignore.join('\n'));
                  }}>
                    Edit
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>

          {editingIgnoreScope && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                Ignore patterns for: {scopes.find(s => s.id === editingIgnoreScope)?.label}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                size="small"
                value={ignoreEditValue}
                onChange={(e) => setIgnoreEditValue(e.target.value)}
                placeholder="One pattern per line, e.g.:\n**/node_modules/**\n**/dist/**"
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button size="small" variant="contained" onClick={() => handleSaveIgnorePatterns(editingIgnoreScope, ignoreEditValue.split('\n').map(s => s.trim()).filter(Boolean))} sx={{ textTransform: 'none' }}>Save</Button>
                <Button size="small" variant="outlined" onClick={() => setEditingIgnoreScope(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Collapse>

      {/* Main Content — 2-column layout: File list | Editor */}
      <Box sx={{ display: 'flex', gap: 2, px: 3, pt: 2, pb: 3, minHeight: 500 }}>

        {/* Left: Policy File List */}
        <Paper elevation={0} sx={{ width: 280, flexShrink: 0, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>Policy Files</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Refresh list">
                <IconButton size="small" onClick={loadPolicyFiles} disabled={isLoadingFiles}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
              <Tooltip title="New policy">
                <IconButton size="small" onClick={() => setShowNewFileInput(!showNewFileInput)} color="primary">
                  <Plus className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* New file input */}
          <Collapse in={showNewFileInput}>
            <Box sx={{ mb: 1.5, display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="filename.yml"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNew(); }}
                sx={{ flex: 1 }}
                InputProps={{ sx: { fontSize: '0.8rem' } }}
              />
              <Button size="small" variant="contained" onClick={handleCreateNew} disabled={isSaving} sx={{ textTransform: 'none', minWidth: 'auto', px: 1.5 }}>
                Create
              </Button>
            </Box>
          </Collapse>

          {isLoadingFiles ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : policyFiles.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No policy files found. Create one to get started.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflow: 'auto' }}>
              {policyFiles.map(file => (
                <Box
                  key={file.path}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: selectedPolicyPath === file.path ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                    border: 1,
                    borderColor: selectedPolicyPath === file.path ? theme.palette.primary.main : 'transparent',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                  }}
                  onClick={() => {
                    if (editorDirty && !window.confirm('Discard unsaved changes?')) return;
                    setSelectedPolicyPath(file.path);
                  }}
                >
                  <FileText className="w-4 h-4" style={{ color: theme.palette.text.secondary, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file.size / 1024).toFixed(1)} KB
                    </Typography>
                  </Box>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.path); }}
                      sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* Right: YAML Editor */}
        <Paper elevation={0} sx={{ flex: 1, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedPolicyPath ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {selectedPolicyPath.split('/').pop()}
                  </Typography>
                  {editorDirty && (
                    <Chip label="unsaved" size="small" color="warning" sx={{ height: 18, fontSize: '0.6rem' }} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Save className="w-3.5 h-3.5" />}
                    onClick={handleSave}
                    disabled={!editorDirty || isSaving}
                    sx={{ textTransform: 'none' }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => loadPolicyContent(selectedPolicyPath)}
                    sx={{ textTransform: 'none' }}
                  >
                    Revert
                  </Button>
                </Box>
              </Box>
              <TextField
                fullWidth
                multiline
                value={editorContent}
                onChange={(e) => { setEditorContent(e.target.value); setEditorDirty(true); }}
                InputProps={{
                  sx: {
                    fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", monospace',
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                    p: 1.5,
                  }
                }}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': {
                    alignItems: 'flex-start',
                    height: '100%',
                  },
                  '& textarea': {
                    height: '100% !important',
                    overflow: 'auto !important',
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {selectedPolicyPath}
              </Typography>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Typography variant="body1" color="text.secondary">
                Select a policy file from the left, or create a new one.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Evaluation Error */}
      {evalError && (
        <Box sx={{ mx: 3, mb: 2, p: 1.5, bgcolor: alpha(theme.palette.error.main, 0.1), border: 1, borderColor: theme.palette.error.main, borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlertCircle className="w-4 h-4" style={{ color: theme.palette.error.main }} />
            <Typography variant="body2" color="error">{evalError}</Typography>
          </Box>
        </Box>
      )}

      {/* Policy Findings Panel */}
      {showFindings && policyFindings && (
        <Paper elevation={0} sx={{ mx: 3, mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>Policy Findings</Typography>
              <Chip label={`${policyFindings.summary.totalFindings} total`} size="small" color="secondary" sx={{ height: 20, fontSize: '0.7rem' }} />
              {Object.entries(policyFindings.summary.byAction).map(([action, count]) => (
                <Chip key={action} label={`${action}: ${count}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" startIcon={<Download className="w-3 h-3" />} onClick={() => handleExportFindings('json')} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>JSON</Button>
              <Button size="small" startIcon={<Download className="w-3 h-3" />} onClick={() => handleExportFindings('csv')} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>CSV</Button>
              <Button size="small" onClick={() => setShowFindings(false)} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>Hide</Button>
            </Box>
          </Box>

          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {policyFindings.summary.totalFindings === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No findings. The policy rules did not match any files in the scanned scope.
              </Typography>
            ) : (
              Object.entries(policyFindings.summary.byRule).map(([ruleId, count]) => {
                const ruleFindings = policyFindings.findings.filter(f => f.ruleId === ruleId);
                const first = ruleFindings[0];
                return (
                  <Box key={ruleId} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>{ruleId}</Typography>
                      <Chip label={count} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                      {first && <Typography variant="caption" color="text.secondary">{first.reason}</Typography>}
                    </Box>
                    {ruleFindings.slice(0, 10).map((finding, idx) => (
                      <Box key={idx} sx={{ pl: 2, py: 0.25, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={finding.suggested.action}
                          size="small"
                          sx={{
                            height: 16, fontSize: '0.6rem',
                            bgcolor: finding.suggested.action === 'move' ? alpha(theme.palette.info.main, 0.15) :
                              finding.suggested.action === 'delete' ? alpha(theme.palette.error.main, 0.15) :
                              finding.suggested.action === 'archive' ? alpha(theme.palette.warning.main, 0.15) :
                              alpha(theme.palette.success.main, 0.15)
                          }}
                        />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{finding.relPath}</Typography>
                        {finding.suggested.dest && <Typography variant="caption" color="info.main">→ {finding.suggested.dest}</Typography>}
                      </Box>
                    ))}
                    {ruleFindings.length > 10 && (
                      <Typography variant="caption" sx={{ pl: 2, color: 'text.secondary' }}>...and {ruleFindings.length - 10} more</Typography>
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default BasicRefactor;
