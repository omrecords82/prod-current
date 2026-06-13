/**
 * OMDailyChangelogPage — Changelog tab for OM Daily.
 * Shows daily commit changelogs with file diffs, pipeline matching, and email/push actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box, Paper, Typography, TextField, Button, Chip, Collapse,
  List, ListItemButton, ListItemText, Badge, CircularProgress,
  Tooltip, Snackbar, Alert, alpha, useTheme,
} from '@mui/material';
import {
  ChangelogEntry, ChangelogCommit, BuildInfo,
  parseJson, formatDate, formatShortDate,
  STATUS_LABELS, STATUS_COLORS,
} from '../omDailyTypes';
import { StatusChip } from '../components/chips';
import { useToast } from '../hooks/useToast';

const FILE_STATUS_COLORS: Record<string, string> = {
  A: '#4caf50',
  M: '#ff9800',
  D: '#f44336',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const OMDailyChangelogPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { toast, showToast, closeToast } = useToast();

  // ─── State ───────────────────────────────────────────────────────
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([]);
  const [changelogDetail, setChangelogDetail] = useState<ChangelogEntry | null>(null);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [selectedChangelogDate, setSelectedChangelogDate] = useState(todayISO());
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [pushing, setPushing] = useState(false);

  // ─── API helpers ─────────────────────────────────────────────────
  const fetchChangelog = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/omai-daily/changelog?limit=30');
      setChangelogEntries(Array.isArray(data) ? data : data.entries ?? []);
    } catch {
      /* silent */
    }
  }, []);

  const fetchChangelogDetail = useCallback(async (date: string) => {
    setChangelogLoading(true);
    try {
      const data = await apiClient.get<any>(`/omai-daily/changelog/${date}`);
      setChangelogDetail(data);
    } catch {
      setChangelogDetail(null);
    } finally {
      setChangelogLoading(false);
    }
  }, []);

  const fetchBuildInfo = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/omai-daily/build-info');
      setBuildInfo(data);
    } catch {
      /* silent */
    }
  }, []);

  // ─── Mount ───────────────────────────────────────────────────────
  useEffect(() => {
    fetchChangelog();
    fetchChangelogDetail(todayISO());
    fetchBuildInfo();
  }, [fetchChangelog, fetchChangelogDetail, fetchBuildInfo]);

  // ─── Actions ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setChangelogLoading(true);
    try {
      await apiClient.post<any>('/omai-daily/changelog/generate');
      showToast('Changelog generated', 'success');
      await fetchChangelog();
      await fetchChangelogDetail(selectedChangelogDate);
    } catch (err: any) {
      showToast(err.message || 'Generate failed', 'error');
    } finally {
      setChangelogLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      await apiClient.post<any>(`/omai-daily/changelog/email/${selectedChangelogDate}`);
      showToast('Email sent', 'success');
      await fetchChangelogDetail(selectedChangelogDate);
    } catch (err: any) {
      showToast(err.message || 'Email failed', 'error');
    }
  };

  const handlePush = async () => {
    setPushing(true);
    try {
      await apiClient.post<any>('/omai-daily/push-to-origin');
      showToast('Pushed to origin', 'success');
    } catch (err: any) {
      showToast(err.message || 'Push failed', 'error');
    } finally {
      setPushing(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedChangelogDate(date);
    setExpandedCommit(null);
    fetchChangelogDetail(date);
  };

  // ─── Derived ─────────────────────────────────────────────────────
  const detail = changelogDetail;
  const commits: ChangelogCommit[] = detail ? (parseJson(detail.commits) as ChangelogCommit[] ?? []) : [];
  const filesChanged = detail ? parseJson(detail.files_changed) as { added: number; modified: number; deleted: number; list: any[] } | null : null;
  const matchedCount = commits.filter(c => c.matchedItem).length;
  const unmatchedCount = commits.length - matchedCount;
  const matchRate = commits.length > 0 ? Math.round((matchedCount / commits.length) * 100) : 0;
  const emailSent = !!detail?.email_sent_at;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, minHeight: 400 }}>
      {/* LEFT — Main Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Action Bar */}
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date"
            size="small"
            value={selectedChangelogDate}
            onChange={e => handleDateChange(e.target.value)}
            sx={{ width: 170 }}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" size="small" onClick={handleGenerate} disabled={changelogLoading}>
            Generate Now
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleSendEmail}
            disabled={emailSent || !detail}
          >
            {emailSent ? 'Email Sent' : 'Send Email'}
          </Button>
          {buildInfo && (
            <Chip
              size="small"
              label={`v${buildInfo.fullVersion || buildInfo.version}`}
              sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 22 }}
            />
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={handlePush}
            disabled={pushing}
            startIcon={pushing ? <CircularProgress size={14} /> : undefined}
          >
            Push to Origin
          </Button>
          {changelogLoading && <CircularProgress size={20} sx={{ ml: 1 }} />}
        </Paper>

        {/* Summary Cards */}
        {detail && filesChanged && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Paper sx={{ p: 1.5, flex: '1 1 120px', textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700}>{commits.length}</Typography>
              <Typography variant="caption" color="text.secondary">Commits</Typography>
            </Paper>
            <Paper sx={{ p: 1.5, flex: '1 1 180px', textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700}>
                <Box component="span" sx={{ color: '#4caf50' }}>+{filesChanged.added}</Box>
                {' '}
                <Box component="span" sx={{ color: '#ff9800' }}>~{filesChanged.modified}</Box>
                {' '}
                <Box component="span" sx={{ color: '#f44336' }}>-{filesChanged.deleted}</Box>
              </Typography>
              <Typography variant="caption" color="text.secondary">Files Changed</Typography>
            </Paper>
            <Paper sx={{ p: 1.5, flex: '1 1 120px', textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700}>{matchRate}%</Typography>
              <Typography variant="caption" color="text.secondary">Pipeline Match</Typography>
            </Paper>
          </Box>
        )}

        {/* Commit List */}
        {changelogLoading && !detail ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !detail ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No changelog for this date. Click "Generate Now" to create one.
            </Typography>
          </Paper>
        ) : commits.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No commits on {formatDate(selectedChangelogDate)}.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {commits.map(commit => {
              const isExpanded = expandedCommit === commit.hash;
              const files = commit.files ?? [];
              return (
                <Paper
                  key={commit.hash}
                  sx={{
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s',
                    '&:hover': { boxShadow: 3 },
                  }}
                  onClick={() => setExpandedCommit(isExpanded ? null : commit.hash)}
                >
                  {/* Commit row */}
                  <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={commit.hash}
                      sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 22 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, flex: 1, minWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {commit.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {commit.author}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {new Date(commit.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${files.length} file${files.length !== 1 ? 's' : ''}`}
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                    {commit.matchedItem ? (
                      <StatusChip status={commit.matchedItem.status} />
                    ) : (
                      <Chip
                        size="small"
                        label="Unmatched"
                        sx={{
                          bgcolor: alpha('#9e9e9e', 0.15),
                          color: '#9e9e9e',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          height: 20,
                        }}
                      />
                    )}
                  </Box>

                  {/* Expanded detail */}
                  <Collapse in={isExpanded}>
                    <Box sx={{ px: 2, pb: 1.5, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                      {commit.matchedItem && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 0.5, color: 'text.secondary' }}>
                          Matched: <strong>{commit.matchedItem.title}</strong>
                        </Typography>
                      )}
                      {files.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {files.map((f, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                              <Chip
                                size="small"
                                label={f.status}
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                  height: 18,
                                  minWidth: 22,
                                  bgcolor: alpha(FILE_STATUS_COLORS[f.status] || '#999', 0.15),
                                  color: FILE_STATUS_COLORS[f.status] || '#999',
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{ fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}
                              >
                                {f.path}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>

      {/* RIGHT — Sidebar */}
      <Paper sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0, alignSelf: 'flex-start' }}>
        <Typography variant="subtitle2" sx={{ px: 2, pt: 1.5, pb: 0.5, fontWeight: 700 }}>
          Recent Days
        </Typography>
        <List dense disablePadding>
          {changelogEntries.length === 0 && (
            <Box sx={{ px: 2, py: 2 }}>
              <Typography variant="caption" color="text.secondary">No entries yet.</Typography>
            </Box>
          )}
          {changelogEntries.map(entry => {
            const entryCommits = parseJson(entry.commits);
            const count = Array.isArray(entryCommits) ? entryCommits.length : 0;
            const isSelected = entry.date === selectedChangelogDate;
            return (
              <ListItemButton
                key={entry.id}
                selected={isSelected}
                onClick={() => handleDateChange(entry.date)}
                sx={{ py: 0.75 }}
              >
                <ListItemText
                  primary={formatShortDate(entry.date)}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: isSelected ? 700 : 400 }}
                />
                <Badge
                  badgeContent={count}
                  color="primary"
                  max={999}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 18, minWidth: 18 } }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Paper>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OMDailyChangelogPage;
