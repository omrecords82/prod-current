import { CustomizerContext } from '@/context/CustomizerContext';
import {
    Box,
    Button,
    CircularProgress,
    Paper,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    AlertCircle,
    Eye,
    FileSearch,
    RefreshCw,
} from '@/ui/icons';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import SessionPulse from '@/features/admin/components/SessionPulse';
import {
    FileAnalysis,
    Phase1Report,
    PreviewRestoreResponse,
    SortOption
} from '@/types/refactorConsole';
import refactorConsoleClient, { DEFAULT_PATH_CONFIG, PathConfig } from './api/refactorConsoleClient';
import DiffViewModal from './components/DiffViewModal';
import Legend from './components/Legend';
import RequirementPreviewModal from './components/RequirementPreviewModal';
import RestoreBundleButton from './components/RestoreBundleButton';
import RestoreHistoryViewer from './components/RestoreHistoryViewer';
import Toolbar from './components/Toolbar';
import Tree from './components/Tree';
import { useRefactorScan } from './hooks/useRefactorScan';
import { useWhitelist } from './hooks/useWhitelist';
import DetailsModal from './RefactorConsole/DetailsModal';
import PathConfigPanel from './RefactorConsole/PathConfigPanel';
import { usePhase1Analysis } from './RefactorConsole/usePhase1Analysis';
import HeaderBar from './RefactorConsole/HeaderBar';

const RefactorConsole: React.FC = () => {
  // Get theme context for dark mode
  const { activeMode } = useContext(CustomizerContext);
  // Get MUI theme for background colors
  const theme = useTheme();
  
  // Diagnostic logging (dev only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[RefactorConsole Theme]', {
        activeMode,
        paletteMode: theme.palette.mode,
        backgroundDefault: theme.palette.background.default,
        backgroundPaper: theme.palette.background.paper,
        hasDarkClass: document.documentElement.classList.contains('dark'),
      });
    }
  }, [activeMode, theme.palette.mode]);
  
  const {
    isWhitelisted,
    toggleWhitelist,
    clearWhitelist,
    whitelistCount,
  } = useWhitelist();

  const {
    scanData,
    isLoading,
    error,
    filterState,
    setFilterState,
    sortOption,
    setSortOption,
    treeItems,
    expandedPaths,
    setExpandedPaths,
    loadScanData,
    refreshScan,
    toggleExpanded,
    expandAll,
    collapseAll,
    filteredCount,
    visibleNodes,
    compareWithBackup,
    setCompareWithBackup,
    phase1Report: hookPhase1Report,
    bundles,
    calculateBundle
  } = useRefactorScan(isWhitelisted);

  // Note: Dark mode is handled by the app's theme provider, not by this component
  // MUI uses theme.palette.mode, Tailwind uses the 'dark' class on documentElement
  // Both should be managed at the app level (CustomizerContext/ThemeProvider)

  type ModalState = { type: 'reasons' | 'duplicates' | 'requirementPreview'; data: any } | null;
  type PathValidation = {
    sourcePath?: { isValid: boolean; exists: boolean; error?: string };
    destinationPath?: { isValid: boolean; exists: boolean; error?: string };
    backupPath?: { isValid: boolean; exists: boolean; error?: string };
  };

  type DialogsBucket = {
    showModal: ModalState;
    showPathConfig: boolean;
    showDiffModal: boolean;
    showHistoryViewer: boolean;
  };
  const [dialogs, setDialogs] = useState<DialogsBucket>({
    showModal: null,
    showPathConfig: false,
    showDiffModal: false,
    showHistoryViewer: false,
  });
  const setDialogsField = useCallback(<K extends keyof DialogsBucket>(key: K, value: DialogsBucket[K]) => {
    setDialogs(prev => ({ ...prev, [key]: value }));
  }, []);
  const { showModal, showPathConfig, showDiffModal, showHistoryViewer } = dialogs;
  const setShowModal = useCallback((v: ModalState) => setDialogsField('showModal', v), [setDialogsField]);
  const setShowPathConfig = useCallback((v: boolean) => setDialogsField('showPathConfig', v), [setDialogsField]);
  const setShowDiffModal = useCallback((v: boolean) => setDialogsField('showDiffModal', v), [setDialogsField]);
  const setShowHistoryViewer = useCallback((v: boolean) => setDialogsField('showHistoryViewer', v), [setDialogsField]);

  // Phase 1 analysis (state, health check, polling)
  const {
    phase1State,
    phase1Report,
    phase1Progress,
    phase1CurrentStep,
    phase1Error,
    healthStatus,
    healthError,
    handlePhase1Analysis,
  } = usePhase1Analysis(hookPhase1Report);

  // ========================================================================
  // Path Configuration State (pathConfig kept standalone — children call
  // setPathConfig with updater fn)
  // ========================================================================
  const [pathConfig, setPathConfig] = useState<PathConfig>(() => refactorConsoleClient.getSavedPaths());

  // ========================================================================
  // Operation state: path validation + multi-source + diff preview/restore
  // ========================================================================
  type OperationBucket = {
    pathValidation: PathValidation;
    isValidatingPaths: boolean;
    sourceType: 'local' | 'remote';
    selectedSnapshot: string | null;
    availableSnapshots: any[];
    isLoadingSnapshots: boolean;
    snapshotError: string | null;
    previewData: PreviewRestoreResponse | null;
    isLoadingPreview: boolean;
    isRestoring: boolean;
    pendingRestorePath: string | null;
  };
  const [op, setOp] = useState<OperationBucket>({
    pathValidation: {},
    isValidatingPaths: false,
    sourceType: 'local',
    selectedSnapshot: null,
    availableSnapshots: [],
    isLoadingSnapshots: false,
    snapshotError: null,
    previewData: null,
    isLoadingPreview: false,
    isRestoring: false,
    pendingRestorePath: null,
  });
  const setOpField = useCallback(<K extends keyof OperationBucket>(key: K, value: OperationBucket[K]) => {
    setOp(prev => ({ ...prev, [key]: value }));
  }, []);
  const { pathValidation, isValidatingPaths, sourceType, selectedSnapshot, availableSnapshots, isLoadingSnapshots, snapshotError, previewData, isLoadingPreview, isRestoring, pendingRestorePath } = op;
  const setPathValidation = useCallback((v: PathValidation) => setOpField('pathValidation', v), [setOpField]);
  const setIsValidatingPaths = useCallback((v: boolean) => setOpField('isValidatingPaths', v), [setOpField]);
  const setSourceType = useCallback((v: 'local' | 'remote') => setOpField('sourceType', v), [setOpField]);
  const setSelectedSnapshot = useCallback((v: string | null) => setOpField('selectedSnapshot', v), [setOpField]);
  const setAvailableSnapshots = useCallback((v: any[]) => setOpField('availableSnapshots', v), [setOpField]);
  const setIsLoadingSnapshots = useCallback((v: boolean) => setOpField('isLoadingSnapshots', v), [setOpField]);
  const setSnapshotError = useCallback((v: string | null) => setOpField('snapshotError', v), [setOpField]);
  const setPreviewData = useCallback((v: PreviewRestoreResponse | null) => setOpField('previewData', v), [setOpField]);
  const setIsLoadingPreview = useCallback((v: boolean) => setOpField('isLoadingPreview', v), [setOpField]);
  const setIsRestoring = useCallback((v: boolean) => setOpField('isRestoring', v), [setOpField]);
  const setPendingRestorePath = useCallback((v: string | null) => setOpField('pendingRestorePath', v), [setOpField]);
  
  // Validate paths on the server
  const validatePaths = useCallback(async (config: PathConfig) => {
    setIsValidatingPaths(true);
    try {
      const result = await refactorConsoleClient.validatePaths(config);
      setPathValidation({
        sourcePath: result.validations.sourcePath,
        destinationPath: result.validations.destinationPath,
        backupPath: result.validations.backupPath
      });
      return result.ok;
    } catch (error) {
      console.error('Path validation error:', error);
      toast.error('Failed to validate paths');
      return false;
    } finally {
      setIsValidatingPaths(false);
    }
  }, []);
  
  // Save path configuration
  const handleSavePaths = useCallback(async () => {
    const isValid = await validatePaths(pathConfig);
    if (isValid) {
      refactorConsoleClient.savePaths(pathConfig);
      toast.success('Path configuration saved');
      setShowPathConfig(false);
    } else {
      toast.warning('Some paths are invalid. Please check the validation messages.');
    }
  }, [pathConfig, validatePaths]);
  
  // Reset paths to defaults
  const handleResetPaths = useCallback(() => {
    setPathConfig({ ...DEFAULT_PATH_CONFIG });
    setPathValidation({});
    refactorConsoleClient.clearSavedPaths();
    toast.info('Paths reset to defaults');
  }, []);
  
  // Initialize sourceType and snapshotId from saved config on mount
  useEffect(() => {
    const savedConfig = refactorConsoleClient.getSavedPaths();
    if (savedConfig.sourceType) {
      setSourceType(savedConfig.sourceType);
    }
    if (savedConfig.snapshotId) {
      setSelectedSnapshot(savedConfig.snapshotId);
    }
  }, []);

  // Load available snapshots when sourceType changes
  useEffect(() => {
    const loadSnapshots = async () => {
      setIsLoadingSnapshots(true);
      setSnapshotError(null);
      try {
        const result = await refactorConsoleClient.fetchSnapshots(sourceType);
        setAvailableSnapshots(result.snapshots);
        
        // Auto-select most recent snapshot if available and no snapshot is currently selected
        if (result.defaultSnapshot && !selectedSnapshot) {
          setSelectedSnapshot(result.defaultSnapshot.id);
          toast.info(`Auto-selected most recent snapshot: ${result.defaultSnapshot.label}`);
        }
      } catch (error) {
        console.error('Failed to load snapshots:', error);
        setSnapshotError(error instanceof Error ? error.message : 'Failed to load snapshots');
        setAvailableSnapshots([]);
        
        // If it's a Samba mount error for remote, show warning
        if (sourceType === 'remote' && error instanceof Error && error.message.includes('mount')) {
          toast.warning('Remote Samba share is not mounted. Please ensure /mnt/refactor-remote is accessible.');
        }
      } finally {
        setIsLoadingSnapshots(false);
      }
    };

    loadSnapshots();
  }, [sourceType]);

  // Sort options configuration
  const sortOptions: SortOption[] = [
    { key: 'score', direction: 'desc', label: 'Usage Score (High to Low)' },
    { key: 'score', direction: 'asc', label: 'Usage Score (Low to High)' },
    { key: 'name', direction: 'asc', label: 'File Name (A-Z)' },
    { key: 'name', direction: 'desc', label: 'File Name (Z-A)' },
    { key: 'mtime', direction: 'desc', label: 'Recently Modified' },
    { key: 'mtime', direction: 'asc', label: 'Oldest Modified' },
    { key: 'classification', direction: 'asc', label: 'Classification Priority' },
    ...(compareWithBackup ? [
      { key: 'recoveryStatus', direction: 'asc', label: 'Recovery Status (Missing First)' },
      { key: 'recoveryStatus', direction: 'desc', label: 'Recovery Status (New First)' },
    ] : []),
  ];

  // Handle toolbar actions
  const handleSearchChange = (query: string) => {
    setFilterState(prev => ({ ...prev, searchQuery: query }));
  };

  const handleFilterChange = (updates: Partial<typeof filterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
  };

  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
  };

  const handleRefresh = async () => {
    try {
      // Save sourceType and snapshotId to pathConfig for persistence
      const updatedPathConfig = {
        ...pathConfig,
        sourceType,
        snapshotId: selectedSnapshot || undefined
      };
      refactorConsoleClient.savePaths(updatedPathConfig);
      
      // Call loadScanData directly with sourceType and snapshotId
      await loadScanData(true, compareWithBackup, sourceType, selectedSnapshot || undefined);
      toast.success('Scan data refreshed');
    } catch (error) {
      toast.error('Failed to refresh scan data');
    }
  };

  const handleToggleRecoveryMode = () => {
    setCompareWithBackup(!compareWithBackup);
    toast.info(`Recovery Mode ${!compareWithBackup ? 'enabled' : 'disabled'}`);
  };

  const handleAnalyze = async () => {
    try {
      await refreshScan(); // This will trigger a rebuild
      toast.success('Codebase analysis completed');
    } catch (error) {
      toast.error('Failed to analyze codebase');
    }
  };

  const handleShowRequirementPreview = (fileAnalysis: FileAnalysis) => {
    // Only allow preview when Phase 1 is done and report is validated
    if (phase1State !== 'done' || !phase1Report || !phase1Report.summary) {
      toast.warning('Phase 1 analysis must be completed before viewing requirements');
      return;
    }
    setShowModal({
      type: 'requirementPreview',
      data: {
        fileAnalysis,
        integrationPoints: phase1Report.integrationPoints ?? { menuItems: null, router: null }
      }
    });
  };

  // Handle tree actions
  const handleNodeAction = async (action: string, node: any) => {
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(node.relPath);
        toast.success('Path copied to clipboard');
        break;
        
      case 'open':
        // In a real implementation, this would integrate with VS Code or similar
        toast.info(`Would open ${node.relPath} in editor`);
        break;
        
      case 'restore':
        // Guard: prevent restoring whitelisted files without explicit confirmation
        if (isWhitelisted(node.relPath)) {
          const confirmed = window.confirm(
            `"${node.relPath}" is whitelisted (protected).\n\nRestoring will overwrite this protected file. Continue?`
          );
          if (!confirmed) {
            toast.info('Restore cancelled — file is protected by whitelist');
            break;
          }
        }
        // Show preview/diff modal before restoring
        if (node.recoveryStatus === 'missing_in_prod' && node.backupPath) {
          handlePreviewRestore(node.relPath);
        }
        break;
        
      case 'reasons':
        setShowModal({ 
          type: 'reasons', 
          data: { 
            node, 
            reasons: node.reasons,
            classification: node.classification,
            usage: node.usage
          } 
        });
        break;
        
      case 'duplicates':
        if (node.similarity?.duplicates.length || node.similarity?.nearMatches.length) {
          setShowModal({ 
            type: 'replicates', 
            data: { 
              node, 
              duplicates: node.similarity?.duplicates || [],
              nearMatches: node.similarity?.nearMatches || []
            } 
          });
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleToggleExpanded = (path: string) => {
    toggleExpanded(path);
  };

  // Handle preview restore (dry run with diff)
  const handlePreviewRestore = async (relPath: string) => {
    setIsLoadingPreview(true);
    setPendingRestorePath(relPath);
    
    try {
      const preview = await refactorConsoleClient.previewRestore(
        relPath,
        undefined,
        sourceType,
        selectedSnapshot || undefined
      );
      
      setPreviewData(preview);
      setShowDiffModal(true);
    } catch (error) {
      console.error('Preview failed:', error);
      toast.error(`Failed to preview file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handle confirmed restore after preview
  const handleConfirmRestore = async () => {
    if (!pendingRestorePath) return;

    // Double-check whitelist guard at restore time
    if (isWhitelisted(pendingRestorePath)) {
      const confirmed = window.confirm(
        `"${pendingRestorePath}" is whitelisted (protected).\n\nAre you sure you want to overwrite this protected file?`
      );
      if (!confirmed) {
        toast.info('Restore cancelled — file is protected by whitelist');
        return;
      }
    }

    setIsRestoring(true);
    
    try {
      await refactorConsoleClient.restore(
        pendingRestorePath,
        undefined,
        sourceType,
        selectedSnapshot || undefined
      );
      
      toast.success(`File restored: ${pendingRestorePath}`);
      
      // Close modal
      setShowDiffModal(false);
      setPreviewData(null);
      setPendingRestorePath(null);
      
      // Refresh scan to update status
      await loadScanData(true, compareWithBackup, sourceType, selectedSnapshot || undefined);
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error(`Failed to restore file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle cancel diff modal
  const handleCancelDiff = () => {
    setShowDiffModal(false);
    setPreviewData(null);
    setPendingRestorePath(null);
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary'
      }}
      className="min-h-screen"
    >
      {/* Header */}
      <HeaderBar
        theme={theme} activeMode={activeMode}
        healthStatus={healthStatus} healthError={healthError}
        sourceType={sourceType} selectedSnapshot={selectedSnapshot}
        showPathConfig={showPathConfig} setShowPathConfig={setShowPathConfig}
        scanData={scanData} isLoading={isLoading}
        phase1State={phase1State} phase1Progress={phase1Progress}
        phase1CurrentStep={phase1CurrentStep} phase1Error={phase1Error}
        handlePhase1Analysis={handlePhase1Analysis} handleRefresh={handleRefresh}
        setShowHistoryViewer={setShowHistoryViewer}
      />

      {/* Session Pulse Dashboard */}
      <Box sx={{ px: 3, pt: 2 }}>
        <SessionPulse refreshInterval={10000} />
      </Box>

      {/* Path Configuration Panel */}
      <PathConfigPanel
        open={showPathConfig}
        theme={theme}
        pathConfig={pathConfig}
        onPathConfigChange={setPathConfig}
        pathValidation={pathValidation}
        isValidatingPaths={isValidatingPaths}
        onSavePaths={handleSavePaths}
        onResetPaths={handleResetPaths}
        sourceType={sourceType}
        onSourceTypeChange={setSourceType}
        selectedSnapshot={selectedSnapshot}
        onSnapshotChange={setSelectedSnapshot}
        isLoadingSnapshots={isLoadingSnapshots}
        availableSnapshots={availableSnapshots}
        snapshotError={snapshotError}
      />

      {/* Main Content */}
      <Box sx={{ px: 3, py: 3 }}>
        {error && (
          <Box sx={{ 
            mb: 3,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            border: 1,
            borderColor: theme.palette.error.main,
            borderRadius: 1,
            p: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertCircle style={{ width: 20, height: 20, color: theme.palette.error.main }} />
              <h3 style={{ fontWeight: 500, color: theme.palette.error.main }}>Error Loading Data</h3>
            </Box>
            <p style={{ color: theme.palette.error.main, marginTop: '0.25rem' }}>{error}</p>
            <Button
              variant="contained"
              color="error"
              onClick={handleRefresh}
              sx={{ mt: 1.5, textTransform: 'none' }}
            >
              Try Again
            </Button>
          </Box>
        )}

        {isLoading && !scanData && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <Box sx={{ textAlign: 'center' }}>
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: theme.palette.primary.main }} />
              <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Analyzing Codebase</h3>
              <p style={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>This may take a few moments...</p>
            </Box>
          </Box>
        )}

        {scanData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Toolbar */}
            <Toolbar
              searchQuery={filterState.searchQuery}
              onSearchChange={handleSearchChange}
              sortOptions={sortOptions}
              currentSort={sortOption}
              onSortChange={handleSortChange}
              filterState={filterState}
              onFilterChange={handleFilterChange}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              onAnalyze={handleAnalyze}
              filteredCount={filteredCount}
              totalCount={scanData.summary.totalFiles + scanData.summary.totalDirs}
              compareWithBackup={compareWithBackup}
              onToggleRecoveryMode={handleToggleRecoveryMode}
              whitelistCount={whitelistCount}
              onClearWhitelist={clearWhitelist}
            />

            {/* Stats Summary */}
            <div className="mb-3 rounded-xl border bg-white/80 px-4 py-3 border-slate-200 dark:border-slate-700/60 dark:bg-slate-900/40 dark:backdrop-blur">
              {/* Phase 1 Results - Only render when explicitly completed, validated, and progress is 100% */}
              {phase1State === 'done' && phase1Report && phase1Report.summary && phase1Progress === 100 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.summary?.missingInTarget ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Restorable Files</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.summary?.modifiedInTarget ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Modified (Protected)</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.summary?.identical ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Identical</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.documentation?.endpointsVerified ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Endpoints Verified</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.documentation?.endpointsMissing ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Endpoints Missing</div>
                    </div>
                  </div>
                  {(phase1Report.documentation?.endpointsFound ?? 0) > 0 && (
                    <div className="text-center text-sm text-slate-500 dark:text-slate-300">
                      Found {phase1Report.documentation?.endpointsFound ?? 0} endpoints in documentation
                    </div>
                  )}
                </div>
              ) : (phase1State === 'running' || phase1State === 'starting') ? (
                // Show loading state while Phase 1 is running
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.palette.secondary.main }}></div>
                    <div className="text-lg font-medium" style={{ color: theme.palette.text.primary }}>
                      {phase1CurrentStep || 'Processing...'}
                    </div>
                    <div className="w-full max-w-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.text.secondary }}>Progress</span>
                        <span className="text-sm font-medium" style={{ color: theme.palette.text.primary }}>{phase1Progress}%</span>
                      </div>
                      <Box sx={{ 
                        width: '100%',
                        bgcolor: 'action.hover',
                        borderRadius: '9999px',
                        height: 8
                      }}>
                        <Box 
                          sx={{
                            bgcolor: theme.palette.secondary.main,
                            height: 8,
                            borderRadius: '9999px',
                            transition: 'width 0.3s'
                          }}
                          style={{ width: `${phase1Progress}%` }}
                        />
                      </Box>
                    </div>
                  </div>
                </Box>
              ) : scanData?.gapAnalysisEnabled ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.missingInProd || 0}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Missing in Prod</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.modifiedSinceBackup || 0}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Modified</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.newFiles || 0}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">New Files</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.likelyInProd}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Production Ready</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.legacyOrDupes}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Legacy/Duplicates</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.likelyInProd}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Production Ready</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.highRisk}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">High Risk</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.inDevelopment}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">In Development</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.legacyOrDupes}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Legacy/Duplicates</div>
                  </div>
                </div>
              )}
            </div>

            {/* Phase 1 Restorable Files Section - Only render when explicitly completed, validated, and progress is 100% */}
            {phase1State === 'done' && phase1Progress === 100 && phase1Report && phase1Report.summary && Array.isArray(phase1Report.restorableFiles) && phase1Report.restorableFiles.length > 0 && (
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  p: 2
                }}
                className="rounded-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.palette.text.primary }}>
                    <FileSearch className="w-5 h-5" style={{ color: theme.palette.secondary.main }} />
                    Restorable Bundles ({bundles.size > 0 ? bundles.size : (phase1Report.restorableFiles?.length ?? 0)} {bundles.size > 0 ? 'bundles' : 'files'})
                  </h3>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      // Only allow export when Phase 1 is done and report is validated
                      if (phase1State !== 'done' || !phase1Report || !phase1Report.summary) {
                        toast.warning('Phase 1 analysis must be completed before exporting');
                        return;
                      }
                      // Export JSON report
                      try {
                        const dataStr = JSON.stringify(phase1Report, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `phase1-report-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        URL.revokeObjectURL(url);
                        toast.success('Report exported successfully');
                      } catch (error) {
                        console.error('Export error:', error);
                        toast.error('Failed to export report');
                      }
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Export JSON Report
                  </Button>
                </div>
                
                {bundles.size > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Array.from(bundles.values()).map((bundle, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          bgcolor: theme.palette.mode === 'dark' ? theme.palette.secondary.dark + '20' : theme.palette.secondary.light,
                          border: 1,
                          borderColor: theme.palette.mode === 'dark' ? theme.palette.secondary.dark : theme.palette.secondary.main,
                          borderRadius: 1
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-mono text-sm font-semibold mb-1" style={{ color: theme.palette.text.primary }}>
                              {bundle.rootFile.relPath}
                            </div>
                            <div className="text-xs space-y-1" style={{ color: theme.palette.text.secondary }}>
                              <div>
                                {bundle.files.length} files • {bundle.components.length} components • {bundle.hooks.length} hooks • {bundle.services.length} services
                              </div>
                              {bundle.requiredEndpoints.length > 0 && (
                                <div>
                                  {bundle.requiredEndpoints.filter(ep => ep.existsInServer).length} / {bundle.requiredEndpoints.length} endpoints verified
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleShowRequirementPreview({
                              file: bundle.rootFile,
                              imports: bundle.missingImports,
                              endpoints: bundle.requiredEndpoints,
                              integrationPoints: (phase1Report.integrationPoints?.menuItems || phase1Report.integrationPoints?.router)
                                ? [phase1Report.integrationPoints.menuItems, phase1Report.integrationPoints.router].filter(Boolean) as any
                                : []
                            })}
                            style={{
                              padding: '0.5rem',
                              color: theme.palette.secondary.main,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: '0.25rem'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.palette.mode === 'dark' 
                                ? theme.palette.secondary.dark + '30'
                                : theme.palette.secondary.light;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="View requirements"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                        <RestoreBundleButton
                          bundle={bundle}
                          onRestoreComplete={() => {
                            handlePhase1Analysis(); // Refresh analysis
                            refreshScan(); // Refresh scan
                          }}
                        />
                      </Box>
                    ))}
                  </div>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    <p>No bundles calculated yet. Bundles are created for page files.</p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Individual files: {phase1Report.restorableFiles?.length ?? 0}</p>
                  </Box>
                )}
              </Paper>
            )}

            {/* Main Layout */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
              {/* Legend */}
              <Box sx={{ gridColumn: { lg: 'span 1' } }}>
                <Legend
                  scanData={scanData}
                  filterState={filterState}
                  onFilterChange={handleFilterChange}
                  whitelistCount={whitelistCount}
                />
              </Box>

              {/* File Tree */}
              <Box sx={{ gridColumn: { lg: 'span 3' } }}>
                <Tree
                  treeItems={treeItems}
                  expandedPaths={expandedPaths}
                  onToggleExpanded={handleToggleExpanded}
                  onNodeAction={handleNodeAction}
                  isDark={activeMode === 'dark'}
                  isWhitelisted={isWhitelisted}
                  onToggleWhitelist={toggleWhitelist}
                />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Details Modal */}
      <DetailsModal showModal={showModal} onClose={() => setShowModal(null)} theme={theme} />
      
      {/* Requirement Preview Modal */}
      {showModal?.type === 'requirementPreview' && (
        <RequirementPreviewModal
          fileAnalysis={showModal.data.fileAnalysis}
          integrationPoints={showModal.data.integrationPoints}
          onClose={() => setShowModal(null)}
        />
      )}
      
      {/* Diff View Modal */}
      <DiffViewModal
        open={showDiffModal}
        onClose={handleCancelDiff}
        onConfirmRestore={handleConfirmRestore}
        preview={previewData?.preview || null}
        dependencies={previewData?.dependencies || null}
        isRestoring={isRestoring}
      />
      
      {/* Restore History Viewer */}
      <RestoreHistoryViewer
        open={showHistoryViewer}
        onClose={() => setShowHistoryViewer(false)}
      />
    </Box>
  );
};

export default RefactorConsole;
