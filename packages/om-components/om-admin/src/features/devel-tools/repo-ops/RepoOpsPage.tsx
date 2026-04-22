/**
 * Repository Operations Hub — Build info, git context, branch cleanup.
 * Remote branches (origin/*) are source of truth; comparisons against origin/main.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  Drawer,
  Divider,
  Tooltip,
  useTheme,
  MenuItem,
  Select,
  FormControl,
  Snackbar,
  Checkbox,
} from '@mui/material';
import {
  IconRefresh,
  IconPlayerPlay,
  IconGitBranch,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconGitMerge,
  IconGitFork,
  IconTrash,
  IconTerminal2,
  IconCalendar,
  IconUpload,
  IconCloud,
  IconDeviceDesktop,
  IconCloudOff,
  IconParking,
} from '@tabler/icons-react';
import { getBuildInfo } from '@/shared/lib/buildInfo';
import { useServerVersion } from '@/hooks/useServerVersion';
import apiClient from '@/api/utils/axiosInstance';
import type { BranchAnalysis, BranchClassification, BranchSource, RemoteBranch } from './RepoOpsPage/types';
import { ACTION_ICONS, SOURCE_CONFIG } from './RepoOpsPage/constants';
import DeleteBranchDialog from './RepoOpsPage/DeleteBranchDialog';
import MergeBranchDialog from './RepoOpsPage/MergeBranchDialog';
import BulkDeleteDialog from './RepoOpsPage/BulkDeleteDialog';
import BranchDetailDrawer from './RepoOpsPage/BranchDetailDrawer';
import BuildSummaryCards from './RepoOpsPage/BuildSummaryCards';
import { FONT as f, getThemeColors, getClassChipSx, getSourceChipSx, getClassExplanation } from './RepoOpsPage/helpers';

// ── Component ───────────────────────────────────────────────────

const RepoOpsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Build info
  const buildInfo = getBuildInfo();
  const { serverVersion, isLoading: serverLoading, refetch: refetchServer } = useServerVersion();

  // Deploy Sync: compare deployed source SHA against repo HEAD from analysis
  const repoHeadSha = analysis?.localContext?.headSha || null;
  const deployedSha = serverVersion?.sourceSha || serverVersion?.gitSha || null;
  const buildSynced = repoHeadSha && deployedSha && deployedSha !== 'unknown' && repoHeadSha === deployedSha;

  // Git status
  const [gitStatus, setGitStatus] = useState<string | null>(null);
  const [gitLoading, setGitLoading] = useState(false);

  // Branch analysis
  const [analysis, setAnalysis] = useState<BranchAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // UI state
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [localOnlyOpen, setLocalOnlyOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<RemoteBranch | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');

  // Delete branch
  const [deleteTarget, setDeleteTarget] = useState<RemoteBranch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Merge branch
  const [mergeTarget, setMergeTarget] = useState<RemoteBranch | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  // Bulk delete
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{ succeeded: number; failed: number; total: number } | null>(null);

  // Branch notes
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // ── Data Fetchers ───────────────────────────────────────────

  const fetchGitStatus = useCallback(async () => {
    setGitLoading(true);
    try {
      const res: any = await apiClient.get('/ops/git/status');
      setGitStatus(res.output || '');
    } catch {
      setGitStatus(null);
    } finally {
      setGitLoading(false);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res: any = await apiClient.get('/ops/git/branch-analysis');
      setAnalysis(res);
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    refetchServer();
    fetchGitStatus();
    fetchAnalysis();
  }, [refetchServer, fetchGitStatus, fetchAnalysis]);

  useEffect(() => {
    fetchGitStatus();
    fetchAnalysis();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Branch Deletion ─────────────────────────────────────────

  const SAFE_DELETE_CLASSIFICATIONS: BranchClassification[] = ['Already Merged', 'Safe To Delete', 'Stale / Diverged'];

  const openDeleteDialog = (branch: RemoteBranch) => {
    setDeleteTarget(branch);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBranch = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res: any = await apiClient.delete(`/ops/git/branch/${encodeURIComponent(deleteTarget.name)}`);
      setSnackbar({ open: true, message: res.message || `Branch "${deleteTarget.name}" deleted`, severity: 'success' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      // Close drawer if the deleted branch was selected
      if (selectedBranch?.name === deleteTarget.name) {
        setDrawerOpen(false);
        setSelectedBranch(null);
      }
      // Refresh analysis to reflect the deletion
      fetchAnalysis();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Deletion failed', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // ── Merge Branch ────────────────────────────────────────────

  const openMergeDialog = (branch: RemoteBranch) => {
    setMergeTarget(branch);
    setMergeDialogOpen(true);
  };

  const handleMergeBranch = async () => {
    if (!mergeTarget) return;
    setMerging(true);
    try {
      const res: any = await apiClient.post(`/ops/git/branch/${encodeURIComponent(mergeTarget.name)}/merge`);
      setSnackbar({ open: true, message: res.message || `Branch "${mergeTarget.name}" merged into main`, severity: 'success' });
      setMergeDialogOpen(false);
      setMergeTarget(null);
      if (selectedBranch?.name === mergeTarget.name) {
        setDrawerOpen(false);
        setSelectedBranch(null);
      }
      fetchAnalysis();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Merge failed', severity: 'error' });
    } finally {
      setMerging(false);
    }
  };

  // ── Branch Notes ────────────────────────────────────────────

  const handleSaveNote = async (branch: RemoteBranch) => {
    setSavingNote(true);
    try {
      await apiClient.put(`/ops/git/branch-notes/${encodeURIComponent(branch.name)}`, { note: noteText });
      setSnackbar({ open: true, message: noteText.trim() ? 'Note saved' : 'Note removed', severity: 'success' });
      setEditingNote(false);
      fetchAnalysis(); // refresh to pick up note in data
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save note', severity: 'error' });
    } finally {
      setSavingNote(false);
    }
  };

  // ── Bulk Delete ────────────────────────────────────────────

  const safeBranches = (analysis?.remoteBranches || []).filter(
    b => SAFE_DELETE_CLASSIFICATIONS.includes(b.classification) && !b.isCurrent
  );
  const allSafeSelected = safeBranches.length > 0 && safeBranches.every(b => selectedForDelete.has(b.name));
  const someSafeSelected = safeBranches.some(b => selectedForDelete.has(b.name));

  const toggleBranchSelect = (name: string) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleSelectAllSafe = () => {
    if (allSafeSelected) {
      setSelectedForDelete(new Set());
    } else {
      setSelectedForDelete(new Set(safeBranches.map(b => b.name)));
    }
  };

  const handleBulkDelete = async () => {
    const branches = Array.from(selectedForDelete);
    if (branches.length === 0) return;
    setBulkDeleting(true);
    setBulkDeleteProgress(null);
    try {
      const res: any = await apiClient.post('/ops/git/branches/bulk-delete', { branches });
      setBulkDeleteProgress({ succeeded: res.succeeded, failed: res.failed, total: res.total });
      setSnackbar({
        open: true,
        message: res.message || `Deleted ${res.succeeded} branch(es)`,
        severity: res.failed === 0 ? 'success' : 'error',
      });
      setSelectedForDelete(new Set());
      setBulkDeleteDialogOpen(false);
      fetchAnalysis();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Bulk delete failed', severity: 'error' });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Clear selections when analysis refreshes
  useEffect(() => {
    setSelectedForDelete(new Set());
  }, [analysis]);

  // ── Derived state ────────────────────────────────────────────

  const currentBranch = analysis?.localContext?.currentBranch || '...';
  const isClean = analysis?.localContext?.isClean ?? null;
  const trackingRemote = analysis?.localContext?.trackingRemote || null;

  const filteredBranches = (analysis?.remoteBranches || []).filter(b => {
    if (searchQuery && !b.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterClass !== 'all' && b.classification !== filterClass) return false;
    return true;
  });

  // ── Styling shortcuts (from helpers) ──────────────────────────
  const { cardBg, cardBorder, labelColor, textColor, subBg } = getThemeColors(isDark);
  const classChip = (cls: BranchClassification) => getClassChipSx(cls, isDark);
  const sourceChip = (source: BranchSource) => getSourceChipSx(source, isDark);
  const classExplanation = (branch: RemoteBranch) => getClassExplanation(branch);

  // ── Render ────────────────────────────────────────────────────

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

      {/* ── Page Header ─────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, mb: 2, borderBottom: `1px solid ${cardBorder}` }}>
        <Box>
          <Typography sx={{ fontFamily: f, fontSize: '1.5rem', fontWeight: 600, color: textColor }}>
            Repository Operations
          </Typography>
          <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, mt: 0.25 }}>
            Build status, git context, and remote-authoritative branch cleanup
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconRefresh size={16} />}
            onClick={refreshAll}
            disabled={serverLoading || gitLoading || analysisLoading}
            sx={{ fontFamily: f, fontSize: '0.8125rem', textTransform: 'none' }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconPlayerPlay size={16} />}
            onClick={fetchAnalysis}
            disabled={analysisLoading}
            sx={{ fontFamily: f, fontSize: '0.8125rem', textTransform: 'none' }}
          >
            Run Analysis
          </Button>
        </Box>
      </Box>

      {/* ── Fetch Warning ────────────────────────────────────── */}
      {analysis && !analysis.fetchOk && (
        <Alert severity="warning" sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}>
          Remote fetch failed — analysis may use stale data. Check network connectivity to origin.
        </Alert>
      )}

      {/* ── Status Strip ────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{ p: 2.5, mb: 3, borderRadius: 2, borderColor: cardBorder, bgcolor: cardBg }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 3 }}>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Branch
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={currentBranch}
            >
              {currentBranch}
            </Typography>
            {trackingRemote && (
              <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, mt: 0.25 }}>
                tracking {trackingRemote}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Working Tree
            </Typography>
            {isClean === null ? (
              <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor }}>...</Typography>
            ) : (
              <Chip
                size="small"
                icon={isClean ? <IconCheck size={14} /> : <IconX size={14} />}
                label={isClean ? 'Clean' : 'Dirty'}
                sx={{
                  fontFamily: f, fontSize: '0.75rem', fontWeight: 600, height: 24,
                  bgcolor: isClean
                    ? isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7'
                    : isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                  color: isClean
                    ? isDark ? '#4ade80' : '#16a34a'
                    : isDark ? '#fbbf24' : '#d97706',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            )}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Deploy Sync
            </Typography>
            {(serverLoading || analysisLoading) ? (
              <CircularProgress size={14} />
            ) : !repoHeadSha || !deployedSha || deployedSha === 'unknown' ? (
              <Chip size="small" label="Unknown" sx={{ fontFamily: f, fontSize: '0.75rem', fontWeight: 600, height: 24, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: labelColor }} />
            ) : (
              <Tooltip title={buildSynced ? 'Deployed build matches repo HEAD' : `Deployed: ${deployedSha} · HEAD: ${repoHeadSha}`}>
                <Chip
                  size="small"
                  icon={buildSynced ? <IconCheck size={14} /> : <IconAlertTriangle size={14} />}
                  label={buildSynced ? 'Deployed' : 'Drift'}
                  sx={{
                    fontFamily: f, fontSize: '0.75rem', fontWeight: 600, height: 24,
                    bgcolor: buildSynced
                      ? isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7'
                      : isDark ? 'rgba(249,115,22,0.15)' : '#ffedd5',
                    color: buildSynced
                      ? isDark ? '#4ade80' : '#16a34a'
                      : isDark ? '#fb923c' : '#ea580c',
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
              </Tooltip>
            )}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Comparison Target
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor }}>
              {analysis?.comparisonTarget || 'origin/main'}
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.625rem', color: labelColor, mt: 0.25 }}>
              {analysis?.originMainSha || '...'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Remote Branches
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: textColor }}>
              {analysis?.summary?.totalRemote ?? '...'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Last Build
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor }}>
              {buildInfo.buildTime ? new Date(buildInfo.buildTime).toLocaleString() : 'unknown'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ── Build Summary Cards ───────────────────────────── */}
      <BuildSummaryCards
        isDark={isDark} cardBg={cardBg} cardBorder={cardBorder}
        labelColor={labelColor} textColor={textColor}
        buildInfo={buildInfo} serverVersion={serverVersion}
        serverLoading={serverLoading} refetchServer={refetchServer}
      />

      {/* ── Branch Cleanup Table (Remote-Authoritative) ────── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontFamily: f, fontSize: '1.125rem', fontWeight: 600, color: textColor }}>
              Branch Cleanup
            </Typography>
            <Chip
              size="small"
              icon={<IconCloud size={12} />}
              label="remote-authoritative"
              sx={{ fontFamily: f, fontSize: '0.6rem', height: 20, bgcolor: isDark ? 'rgba(96,165,250,0.12)' : '#dbeafe', color: isDark ? '#93c5fd' : '#2563eb', '& .MuiChip-icon': { color: 'inherit' } }}
            />
          </Box>
          {analysis && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {analysis.summary.alreadyMerged > 0 && (
                <Chip size="small" label={`${analysis.summary.alreadyMerged} merged`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Already Merged') }} />
              )}
              {analysis.summary.safeToDelete > 0 && (
                <Chip size="small" label={`${analysis.summary.safeToDelete} safe delete`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Safe To Delete') }} />
              )}
              {analysis.summary.fastForwardSafe > 0 && (
                <Chip size="small" label={`${analysis.summary.fastForwardSafe} ff-safe`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Fast-Forward Safe') }} />
              )}
              {analysis.summary.needsRebase > 0 && (
                <Chip size="small" label={`${analysis.summary.needsRebase} rebase`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Needs Rebase') }} />
              )}
              {analysis.summary.parkedWork > 0 && (
                <Chip size="small" label={`${analysis.summary.parkedWork} parked`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Parked Work') }} />
              )}
              {analysis.summary.staleDiverged > 0 && (
                <Chip size="small" label={`${analysis.summary.staleDiverged} stale`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Stale / Diverged') }} />
              )}
              {analysis.summary.manualReview > 0 && (
                <Chip size="small" label={`${analysis.summary.manualReview} review`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Manual Review') }} />
              )}
            </Box>
          )}
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>,
              sx: { fontFamily: f, fontSize: '0.8125rem' },
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              sx={{ fontFamily: f, fontSize: '0.8125rem' }}
            >
              <MenuItem value="all">All Classifications</MenuItem>
              <MenuItem value="Already Merged">Already Merged</MenuItem>
              <MenuItem value="Safe To Delete">Safe To Delete</MenuItem>
              <MenuItem value="Fast-Forward Safe">Fast-Forward Safe</MenuItem>
              <MenuItem value="Needs Rebase">Needs Rebase</MenuItem>
              <MenuItem value="Parked Work">Parked Work</MenuItem>
              <MenuItem value="Stale / Diverged">Stale / Diverged</MenuItem>
              <MenuItem value="Manual Review">Manual Review</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Bulk action bar */}
        {selectedForDelete.size > 0 && (
          <Paper
            variant="outlined"
            sx={{
              px: 2, py: 1.25, mb: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              bgcolor: isDark ? 'rgba(139,92,246,0.08)' : '#f5f3ff',
              borderColor: isDark ? 'rgba(139,92,246,0.25)' : '#ddd6fe',
            }}
          >
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#c4b5fd' : '#7c3aed' }}>
              {selectedForDelete.size} branch{selectedForDelete.size !== 1 ? 'es' : ''} selected
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={() => setSelectedForDelete(new Set())}
                sx={{ fontFamily: f, fontSize: '0.75rem', textTransform: 'none', color: labelColor }}
              >
                Clear
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<IconTrash size={14} />}
                onClick={() => setBulkDeleteDialogOpen(true)}
                sx={{
                  fontFamily: f, fontSize: '0.75rem', textTransform: 'none',
                  bgcolor: isDark ? 'rgba(139,92,246,0.8)' : '#7c3aed',
                  '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.95)' : '#6d28d9' },
                }}
              >
                Delete Selected
              </Button>
            </Box>
          </Paper>
        )}

        {analysisError && (
          <Alert severity="error" sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}>{analysisError}</Alert>
        )}

        {analysisLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 4, justifyContent: 'center' }}>
            <CircularProgress size={20} />
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor }}>Fetching remote branches and analyzing...</Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: cardBorder, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${cardBorder}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
                    <th style={{ padding: '10px 4px 10px 12px', width: 36 }}>
                      <Tooltip title={allSafeSelected ? 'Deselect all safe branches' : `Select all safe branches (${safeBranches.length})`} arrow>
                        <Checkbox
                          size="small"
                          checked={allSafeSelected}
                          indeterminate={someSafeSelected && !allSafeSelected}
                          onChange={toggleSelectAllSafe}
                          disabled={safeBranches.length === 0}
                          sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 16 }, color: isDark ? '#c4b5fd' : '#7c3aed', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: isDark ? '#c4b5fd' : '#7c3aed' } }}
                        />
                      </Tooltip>
                    </th>
                    {['Branch', 'Source', 'Ahead / Behind', 'Last Commit', 'Files', 'Classification', 'Action', ''].map(col => (
                      <th
                        key={col || 'view'}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontFamily: f,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          color: labelColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{ padding: '32px 16px', textAlign: 'center', fontFamily: f, fontSize: '0.8125rem', color: labelColor }}
                      >
                        {analysis ? 'No branches match filter' : 'No branch data available'}
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map(branch => {
                      const ActionIcon = ACTION_ICONS[branch.recommendedAction] || IconEye;
                      const isSelected = selectedBranch?.name === branch.name;
                      const sc = sourceChip(branch.source);
                      const isSafeDeletable = SAFE_DELETE_CLASSIFICATIONS.includes(branch.classification) && !branch.isCurrent;
                      const isChecked = selectedForDelete.has(branch.name);
                      return (
                        <tr
                          key={branch.name}
                          onClick={() => { setSelectedBranch(branch); setDrawerOpen(true); setEditingNote(false); }}
                          style={{
                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                            background: isChecked ? (isDark ? 'rgba(139,92,246,0.06)' : '#faf5ff') : isSelected ? (isDark ? 'rgba(255,255,255,0.04)' : '#f0f7ff') : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => { if (!isSelected && !isChecked) (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : '#fafafa'); }}
                          onMouseLeave={e => { if (!isSelected && !isChecked) (e.currentTarget.style.background = 'transparent'); }}
                        >
                          <td style={{ padding: '10px 4px 10px 12px', width: 36 }}>
                            {isSafeDeletable ? (
                              <Checkbox
                                size="small"
                                checked={isChecked}
                                onChange={(e) => { e.stopPropagation(); toggleBranchSelect(branch.name); }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 16 }, color: isDark ? '#c4b5fd' : '#7c3aed', '&.Mui-checked': { color: isDark ? '#c4b5fd' : '#7c3aed' } }}
                              />
                            ) : (
                              <Box sx={{ width: 16 }} />
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: 340 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <IconGitBranch size={14} color={labelColor} style={{ flexShrink: 0 }} />
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor, fontWeight: branch.isCurrent ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={branch.name}
                              >
                                {branch.name}
                              </Typography>
                              {branch.isCurrent && (
                                <Chip size="small" label="current" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, bgcolor: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe', color: isDark ? '#93c5fd' : '#2563eb' }} />
                              )}
                            </Box>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <Chip
                              size="small"
                              label={SOURCE_CONFIG[branch.source]?.label || branch.source}
                              sx={{
                                fontFamily: f, fontSize: '0.55rem', height: 18,
                                bgcolor: sc.bg, color: sc.color,
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: branch.ahead > 0 ? (isDark ? '#4ade80' : '#16a34a') : labelColor }}>
                                +{branch.ahead}
                              </Typography>
                              <Typography sx={{ fontFamily: f, fontSize: '0.7rem', color: labelColor }}>/</Typography>
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: branch.behind > 0 ? (isDark ? '#f87171' : '#dc2626') : labelColor }}>
                                -{branch.behind}
                              </Typography>
                            </Box>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Typography sx={{ fontFamily: f, fontSize: '0.7rem', color: labelColor, whiteSpace: 'nowrap' }}>
                              {branch.lastCommitDate}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 500, color: textColor }}>
                              {branch.changedFiles || '-'}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                size="small"
                                label={branch.classification}
                                sx={{ fontFamily: f, fontSize: '0.625rem', fontWeight: 600, height: 22, ...classChip(branch.classification) }}
                              />
                              {branch.confidence && (
                                <Tooltip title={`Confidence: ${branch.confidence}`} arrow>
                                  <Box sx={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    bgcolor: branch.confidence === 'high' ? '#16a34a' : branch.confidence === 'medium' ? '#d97706' : '#dc2626',
                                    flexShrink: 0,
                                  }} />
                                </Tooltip>
                              )}
                            </Box>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ActionIcon size={13} color={labelColor} />
                              <Typography sx={{ fontFamily: f, fontSize: '0.75rem', fontWeight: 500, color: textColor }}>
                                {branch.recommendedAction}
                              </Typography>
                            </Box>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={(e) => { e.stopPropagation(); setSelectedBranch(branch); setDrawerOpen(true); setEditingNote(false); }}
                                sx={{ fontFamily: f, fontSize: '0.7rem', textTransform: 'none', minWidth: 0, color: labelColor, px: 1 }}
                              >
                                View
                              </Button>
                              {SAFE_DELETE_CLASSIFICATIONS.includes(branch.classification) && (
                                <Tooltip title="Delete branch" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); openDeleteDialog(branch); }}
                                    sx={{ color: isDark ? '#c4b5fd' : '#7c3aed', p: 0.5, '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)' } }}
                                  >
                                    <IconTrash size={14} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Box>
            {analysis && (
              <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${cardBorder}`, bgcolor: subBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor }}>
                  Showing {filteredBranches.length} of {analysis.summary.totalRemote} remote branches
                </Typography>
                <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor }}>
                  Compared against {analysis.comparisonTarget} ({analysis.originMainSha})
                </Typography>
              </Box>
            )}
          </Paper>
        )}
      </Box>

      {/* ── Local-Only Branches Warning ───────────────────────── */}
      {analysis && analysis.localOnlyBranches.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: isDark ? 'rgba(251,191,36,0.2)' : '#fde68a', overflow: 'hidden', mb: 3 }}>
          <Box
            onClick={() => setLocalOnlyOpen(!localOnlyOpen)}
            sx={{
              px: 2.5, py: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
              bgcolor: isDark ? 'rgba(251,191,36,0.06)' : '#fffbeb',
              '&:hover': { bgcolor: isDark ? 'rgba(251,191,36,0.1)' : '#fef3c7' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconCloudOff size={16} color={isDark ? '#fbbf24' : '#d97706'} />
              <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#fbbf24' : '#92400e' }}>
                Local-Only Branches ({analysis.localOnlyBranches.length})
              </Typography>
              <Typography sx={{ fontFamily: f, fontSize: '0.75rem', color: isDark ? '#fcd34d' : '#b45309' }}>
                — no remote counterpart, not in repo cleanup scope
              </Typography>
            </Box>
            {localOnlyOpen ? <IconChevronUp size={16} color={labelColor} /> : <IconChevronDown size={16} color={labelColor} />}
          </Box>
          <Collapse in={localOnlyOpen}>
            <Divider sx={{ borderColor: isDark ? 'rgba(251,191,36,0.15)' : '#fde68a' }} />
            <Box sx={{ p: 2 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${cardBorder}` }}>
                    {['Branch', 'Ahead / Behind', 'Last Commit', 'Status', 'Action'].map(col => (
                      <th key={col} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: f, fontSize: '0.625rem', fontWeight: 600, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.localOnlyBranches.map(branch => (
                    <tr key={branch.name} style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                      <td style={{ padding: '8px 12px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <IconDeviceDesktop size={14} color={isDark ? '#fbbf24' : '#d97706'} />
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor, fontWeight: branch.isCurrent ? 600 : 400 }}>
                            {branch.name}
                          </Typography>
                          {branch.isCurrent && (
                            <Chip size="small" label="current" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, bgcolor: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe', color: isDark ? '#93c5fd' : '#2563eb' }} />
                          )}
                        </Box>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: branch.ahead > 0 ? (isDark ? '#4ade80' : '#16a34a') : labelColor }}>+{branch.ahead}</Typography>
                          <Typography sx={{ fontFamily: f, fontSize: '0.7rem', color: labelColor }}>/</Typography>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: branch.behind > 0 ? (isDark ? '#f87171' : '#dc2626') : labelColor }}>-{branch.behind}</Typography>
                        </Box>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Typography sx={{ fontFamily: f, fontSize: '0.7rem', color: labelColor }}>{branch.lastCommitDate}</Typography>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {branch.isMerged ? (
                          <Chip size="small" label="merged" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, ...classChip('Already Merged') }} />
                        ) : branch.hasUnpushedCommits ? (
                          <Chip size="small" label="unpushed" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, bgcolor: isDark ? 'rgba(251,191,36,0.12)' : '#fef3c7', color: isDark ? '#fbbf24' : '#d97706' }} />
                        ) : (
                          <Chip size="small" label="stale" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: labelColor }} />
                        )}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {React.createElement(ACTION_ICONS[branch.recommendedAction] || IconEye, { size: 13, color: labelColor })}
                          <Typography sx={{ fontFamily: f, fontSize: '0.75rem', fontWeight: 500, color: textColor }}>
                            {branch.recommendedAction}
                          </Typography>
                        </Box>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* ── Raw Diagnostics (Collapsed) ──────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: cardBorder, overflow: 'hidden', mb: 3 }}>
        <Box
          onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
          sx={{
            px: 2.5, py: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
            bgcolor: subBg,
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconTerminal2 size={16} color={labelColor} />
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: textColor }}>
              Raw Diagnostics
            </Typography>
          </Box>
          {diagnosticsOpen ? <IconChevronUp size={16} color={labelColor} /> : <IconChevronDown size={16} color={labelColor} />}
        </Box>
        <Collapse in={diagnosticsOpen}>
          <Divider />
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: textColor, mb: 1 }}>
              Git Status Output
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : '#f9fafb', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', color: textColor, mb: 2 }}
            >
              {gitLoading ? 'Loading...' : gitStatus || 'No data'}
            </Paper>

            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: textColor, mb: 1 }}>
              Build Data
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : '#f9fafb', fontFamily: 'monospace', fontSize: '0.7rem', overflow: 'auto', maxHeight: 200, color: textColor }}>
                <pre style={{ margin: 0 }}>{JSON.stringify(buildInfo, null, 2)}</pre>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : '#f9fafb', fontFamily: 'monospace', fontSize: '0.7rem', overflow: 'auto', maxHeight: 200, color: textColor }}>
                <pre style={{ margin: 0 }}>{JSON.stringify(serverVersion, null, 2)}</pre>
              </Paper>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {/* ── Branch Details Drawer ────────────────────────────── */}
      <BranchDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedBranch={selectedBranch}
        analysis={analysis}
        isDark={isDark}
        fontFamily={f}
        labelColor={labelColor}
        textColor={textColor}
        cardBorder={cardBorder}
        subBg={subBg}
        classChip={classChip}
        sourceChip={sourceChip}
        classExplanation={classExplanation}
        safeDeleteClassifications={SAFE_DELETE_CLASSIFICATIONS}
        editingNote={editingNote}
        setEditingNote={setEditingNote}
        noteText={noteText}
        setNoteText={setNoteText}
        savingNote={savingNote}
        handleSaveNote={handleSaveNote}
        deleting={deleting}
        merging={merging}
        openDeleteDialog={openDeleteDialog}
        openMergeDialog={openMergeDialog}
      />

      {/* ── Confirmation Dialogs ─────────────────────────── */}
      <DeleteBranchDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteBranch}
        target={deleteTarget}
        deleting={deleting}
        isDark={isDark}
        fontFamily={f}
        labelColor={labelColor}
        classChip={classChip}
      />
      <MergeBranchDialog
        open={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
        onConfirm={handleMergeBranch}
        target={mergeTarget}
        merging={merging}
        isDark={isDark}
        fontFamily={f}
        labelColor={labelColor}
      />
      <BulkDeleteDialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
        selectedForDelete={selectedForDelete}
        analysis={analysis}
        bulkDeleting={bulkDeleting}
        isDark={isDark}
        fontFamily={f}
        labelColor={labelColor}
        textColor={textColor}
        classChip={classChip}
      />

      {/* ── Snackbar feedback ─────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ fontFamily: f, fontSize: '0.8125rem' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RepoOpsPage;
