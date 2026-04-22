/**
 * CodeSafetyPage.tsx — Snapshot & backup safety system UI
 * Located under System & Server > Server & DevOps
 */

import axios from 'axios';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  CheckCircle,
  Delete as DeleteIcon,
  Difference as DiffIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  PhotoCamera as SnapshotIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Snapshot {
  id: string;
  label: string;
  branch: string;
  commit: string;
  timestamp: string;
  user: string;
  fileCount: number;
  files: string[];
}

interface FileDetail {
  path: string;
  status: 'identical' | 'differs' | 'missing' | 'current_only';
  snapLines: number;
  currLines: number;
}

interface SnapshotDetail extends Omit<Snapshot, 'files'> {
  files: FileDetail[];
}

interface GitStatus {
  branch: string;
  commitHash: string;
  commitMsg: string;
  uncommittedCount: number;
  uncommittedFiles: string[];
}

const STATUS_CONFIG = {
  identical: { icon: <CheckCircle fontSize="small" />, color: '#4caf50', label: 'Identical' },
  differs: { icon: <WarningIcon fontSize="small" />, color: '#ff9800', label: 'Differs' },
  missing: { icon: <ErrorIcon fontSize="small" />, color: '#f44336', label: 'Missing' },
  current_only: { icon: <InfoIcon fontSize="small" />, color: '#2196f3', label: 'New' },
  unknown: { icon: <InfoIcon fontSize="small" />, color: '#9e9e9e', label: 'Unknown' },
};

const LABEL_COLORS: Record<string, string> = {
  auto: '#ff9800',
  manual: '#2196f3',
  'manual-ui': '#2196f3',
  'pre-branch-switch': '#f44336',
  'initial-baseline': '#4caf50',
  'pre-bulk-restore': '#9c27b0',
  'post-full-restore-verified': '#4caf50',
};

const CodeSafetyPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const color = '#c62828';

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SnapshotDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLabel, setCreateLabel] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [snapRes, gitRes] = await Promise.all([
        axios.get('/api/snapshots'),
        axios.get('/api/snapshots/system/git-status'),
      ]);
      setSnapshots(snapRes.data.snapshots || []);
      setGitStatus(gitRes.data);
    } catch (err) {
      console.error('Failed to fetch safety data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/snapshots/${id}`);
      setDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch snapshot detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await axios.post('/api/snapshots', { label: createLabel || 'manual-ui' });
      setCreateOpen(false);
      setCreateLabel('');
      fetchData();
    } catch (err) {
      console.error('Failed to create snapshot:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete snapshot ${id}?`)) return;
    try {
      await axios.delete(`/api/snapshots/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    }
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/control-panel/system-server/server-devops')} sx={{ bgcolor: alpha(color, 0.08), color }}>
          <BackIcon />
        </IconButton>
        <Box sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha(color, isDark ? 0.15 : 0.08), color, flexShrink: 0 }}>
          <SnapshotIcon sx={{ fontSize: 32 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Code Safety System</Typography>
          <Typography variant="body2" color="text.secondary">Snapshots, backup verification, and change tracking</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchData}>Refresh</Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ bgcolor: color, '&:hover': { bgcolor: alpha(color, 0.85) } }}>
            New Snapshot
          </Button>
        </Stack>
      </Box>

      {/* Git Status Card */}
      {gitStatus && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1, color: 'text.secondary' }}>
            Current Repository State
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="caption" color="text.secondary">Branch</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{gitStatus.branch}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Last Commit</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{gitStatus.commitHash}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{gitStatus.commitMsg}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Uncommitted Changes</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  size="small"
                  label={`${gitStatus.uncommittedCount} files`}
                  color={gitStatus.uncommittedCount > 0 ? 'warning' : 'success'}
                  sx={{ fontSize: '0.75rem', height: 22 }}
                />
              </Box>
            </Box>
          </Stack>
          {gitStatus.uncommittedCount > 0 && (
            <Box sx={{ mt: 1.5, maxHeight: 120, overflow: 'auto' }}>
              {gitStatus.uncommittedFiles.map(f => (
                <Typography key={f} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.8 }}>
                  {f}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Safety Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Automatic protections active:</strong> Pre-checkout hook saves snapshots before branch switches. Cron job auto-snapshots every 2 hours.
        For borg backup comparison, use: <code>sudo scripts/om-backup-verify.sh review</code>
      </Alert>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={36} />
        </Box>
      )}

      {/* Snapshots List */}
      {!loading && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1, color: 'text.secondary' }}>
            Saved Snapshots ({snapshots.length})
          </Typography>

          {snapshots.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2 }}>
              <Typography color="text.secondary">No snapshots yet. Create one to start tracking changes.</Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {snapshots.map(snap => (
                <Paper
                  key={snap.id}
                  elevation={0}
                  sx={{
                    border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'border-color 0.15s',
                    ...(expandedId === snap.id && { borderColor: color }),
                  }}
                >
                  {/* Snapshot header row */}
                  <Box
                    sx={{ p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, '&:hover': { bgcolor: alpha(color, 0.02) } }}
                    onClick={() => handleExpand(snap.id)}
                  >
                    <DiffIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {snap.id}
                        </Typography>
                        <Chip
                          size="small"
                          label={snap.label}
                          sx={{
                            fontSize: '0.68rem',
                            height: 20,
                            bgcolor: alpha(LABEL_COLORS[snap.label] || '#9e9e9e', 0.15),
                            color: LABEL_COLORS[snap.label] || 'text.secondary',
                            fontWeight: 600,
                          }}
                        />
                        <Chip size="small" label={`${snap.fileCount} files`} variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {snap.branch} @ {snap.commit} &middot; {formatTime(snap.timestamp)}
                      </Typography>
                    </Box>
                    <Tooltip title="Delete snapshot">
                      <IconButton size="small" onClick={(e) => handleDelete(snap.id, e)} sx={{ color: 'text.disabled', '&:hover': { color: '#f44336' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Expanded detail */}
                  <Collapse in={expandedId === snap.id}>
                    <Divider />
                    <Box sx={{ p: 2, bgcolor: isDark ? alpha('#000', 0.2) : alpha('#f5f5f5', 0.5) }}>
                      {detailLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : detail ? (
                        <Box>
                          {/* Summary chips */}
                          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            {['identical', 'differs', 'missing', 'current_only'].map(status => {
                              const count = detail.files.filter(f => f.status === status).length;
                              if (count === 0) return null;
                              const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                              return (
                                <Chip
                                  key={status}
                                  size="small"
                                  icon={cfg.icon}
                                  label={`${count} ${cfg.label}`}
                                  sx={{ fontSize: '0.72rem', height: 24, bgcolor: alpha(cfg.color, 0.1), color: cfg.color, '& .MuiChip-icon': { color: cfg.color } }}
                                />
                              );
                            })}
                          </Stack>

                          {/* File list */}
                          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {detail.files.map(f => {
                              const cfg = STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
                              return (
                                <Box key={f.path} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 1, borderRadius: 1, '&:hover': { bgcolor: alpha(cfg.color, 0.04) } }}>
                                  <Box sx={{ color: cfg.color, display: 'flex', flexShrink: 0 }}>{cfg.icon}</Box>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.path}
                                  </Typography>
                                  {f.status === 'differs' && (
                                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: '0.68rem' }}>
                                      {f.snapLines}L &rarr; {f.currLines}L
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      ) : null}
                    </Box>
                  </Collapse>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create Snapshot</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save a snapshot of all uncommitted changes. You can review and restore from it later.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Label (optional)"
            placeholder="e.g., before-refactor"
            value={createLabel}
            onChange={e => setCreateLabel(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating} sx={{ bgcolor: color, '&:hover': { bgcolor: alpha(color, 0.85) } }}>
            {creating ? <CircularProgress size={20} /> : 'Save Snapshot'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CodeSafetyPage;
