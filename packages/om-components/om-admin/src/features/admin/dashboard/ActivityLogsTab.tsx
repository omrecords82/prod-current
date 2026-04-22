/**
 * ActivityLogsTab — Activity logs tab for the System Logs & Monitoring page.
 * Self-contained with own state, handlers, and dialogs.
 * Extracted from LogSearch.tsx
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert, alpha,
  Box,
  Button,
  Card, CardContent,
  Chip,
  CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconActivity,
  IconCalendar,
  IconEye,
  IconFilter,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { adminAPI } from '@/api/admin.api';
import { useAuth } from '@/context/AuthContext';
import type { ActivityLogData, ActivityLogStats } from './logSearchTypes';
import { STAT_CARD } from './logSearchTypes';

const ACTIVITY_PER_PAGE = 25;

const formatAction = (action: string) => action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const getActionColor = (action: string): any => {
  if (action.includes('login') || action.includes('authenticate')) return 'success';
  if (action.includes('logout') || action.includes('terminate')) return 'warning';
  if (action.includes('delete') || action.includes('remove')) return 'error';
  if (action.includes('create') || action.includes('add')) return 'primary';
  if (action.includes('update') || action.includes('modify')) return 'info';
  return 'default';
};

const getUserDisplay = (a: ActivityLogData) => {
  if (a.first_name || a.last_name) return `${a.first_name || ''} ${a.last_name || ''}`.trim();
  return a.user_email || `User ${a.user_id}`;
};

interface ActivityLogsTabProps {
  active: boolean;
}

const ActivityLogsTab: React.FC<ActivityLogsTabProps> = ({ active }) => {
  const theme = useTheme();
  const { hasRole } = useAuth();

  const [activities, setActivities] = useState<ActivityLogData[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityLogStats | null>(null);
  const [topActions, setTopActions] = useState<Array<{ action: string; count: number }>>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState('');
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogData | null>(null);
  const [activityViewDialog, setActivityViewDialog] = useState(false);
  const [cleanupDialog, setCleanupDialog] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const showSnack = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const fetchActivities = useCallback(async () => {
    setActivityLoading(true);
    try {
      const filters: any = {
        search: activitySearch || undefined,
        action_filter: activityActionFilter || undefined,
        date_from: activityDateFrom || undefined,
        date_to: activityDateTo || undefined,
        limit: ACTIVITY_PER_PAGE,
        offset: (activityPage - 1) * ACTIVITY_PER_PAGE,
      };
      const response: any = await adminAPI.activityLogs.getAll(filters);
      setActivities(response.activities || []);
      setActivityStats(response.stats);
      setTopActions(response.topActions || []);
      setActivityTotalPages(response.pagination?.pages || 1);
    } catch (err) { console.error('Failed to fetch activities:', err); showSnack('Failed to load activity logs', 'error'); }
    finally { setActivityLoading(false); }
  }, [activitySearch, activityActionFilter, activityDateFrom, activityDateTo, activityPage]);

  const handleViewActivity = async (activity: ActivityLogData) => {
    try {
      const detailedActivity: any = await adminAPI.activityLogs.getById(activity.id);
      setSelectedActivity(detailedActivity);
      setActivityViewDialog(true);
    } catch (err) { showSnack('Failed to load activity details', 'error'); }
  };

  const handleActivityCleanup = async () => {
    try {
      const response = await (adminAPI.activityLogs as any).cleanup(cleanupDays);
      showSnack(`Cleaned up ${response.records_deleted || 0} old activity records`);
      setCleanupDialog(false);
      fetchActivities();
    } catch (err) { showSnack('Failed to cleanup activity logs', 'error'); }
  };

  useEffect(() => {
    if (active) fetchActivities();
  }, [active, activityPage, activitySearch, activityActionFilter, activityDateFrom, activityDateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  return (
    <>
      {/* Stats Cards */}
      {activityStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Activities (30d)', value: activityStats.total_activities, color: theme.palette.primary.main, icon: <IconActivity size={28} /> },
            { label: 'Active Users', value: activityStats.unique_users, color: theme.palette.success.main, icon: <IconUser size={28} /> },
            { label: 'Active Days', value: activityStats.active_days, color: theme.palette.warning.main, icon: <IconCalendar size={28} /> },
            { label: 'Action Types', value: activityStats.unique_actions, color: theme.palette.secondary.main, icon: <IconFilter size={28} /> },
          ].map((s, i) => (
            <Grid size={{ xs: 6, md: 3 }} key={i}>
              <Card sx={STAT_CARD(s.color)}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ color: s.color }}>{s.icon}</Box>
                    <Box>
                      <Typography variant="h5" fontWeight={700}>{s.value.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Top Actions */}
      {topActions.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Top Actions (Last 7 Days)</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {topActions.slice(0, 12).map(a => (
                <Chip key={a.action} label={`${formatAction(a.action)} (${a.count})`} color={getActionColor(a.action)} variant="outlined" size="small" />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth size="small" label="Search" placeholder="Actions, users, changes..."
                value={activitySearch} onChange={e => setActivitySearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select value={activityActionFilter} label="Action" onChange={e => setActivityActionFilter(e.target.value)}>
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="login">Login</MenuItem>
                  <MenuItem value="logout">Logout</MenuItem>
                  <MenuItem value="terminate_session">Terminate Session</MenuItem>
                  <MenuItem value="create_user">Create User</MenuItem>
                  <MenuItem value="update_user">Update User</MenuItem>
                  <MenuItem value="lockout_user">Lockout User</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField fullWidth size="small" label="From" type="date" value={activityDateFrom} onChange={e => setActivityDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField fullWidth size="small" label="To" type="date" value={activityDateTo} onChange={e => setActivityDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={fetchActivities} disabled={activityLoading}>Refresh</Button>
              <Button variant="outlined" onClick={() => { setActivitySearch(''); setActivityActionFilter(''); setActivityDateFrom(''); setActivityDateTo(''); setActivityPage(1); }}>Clear</Button>
              {hasRole(['super_admin']) && (
                <Button variant="outlined" color="warning" startIcon={<IconTrash size={18} />} onClick={() => setCleanupDialog(true)}>Cleanup</Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 520px)', overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.06) } }}>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell width={60} />
              </TableRow>
            </TableHead>
            <TableBody>
              {activityLoading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading activities...</Typography></TableCell></TableRow>
              ) : !activities.length ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><IconActivity size={40} style={{ opacity: 0.2 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>No activity logs found</Typography></TableCell></TableRow>
              ) : (
                activities.map(a => (
                  <TableRow key={a.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      <Tooltip title={new Date(a.created_at).toLocaleString()}><span>{dayjs(a.created_at).fromNow()}</span></Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{getUserDisplay(a)}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.user_email}</Typography>
                      {a.user_role && <Chip label={a.user_role} size="small" color={a.user_role === 'super_admin' ? 'error' : 'primary'} variant="outlined" sx={{ ml: 0.5, height: 20, fontSize: '0.65rem' }} />}
                    </TableCell>
                    <TableCell><Chip label={formatAction(a.action)} color={getActionColor(a.action)} variant="outlined" size="small" /></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', maxWidth: 200 }}>
                      {a.changes && typeof a.changes === 'object' && Object.keys(a.changes).length > 0 ? `${Object.keys(a.changes).length} changes` : '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{a.ip_address || '-'}</TableCell>
                    <TableCell>
                      <Tooltip title="View Details"><IconButton size="small" onClick={() => handleViewActivity(a)}><IconEye size={16} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {activityTotalPages > 1 && (
          <Stack direction="row" justifyContent="center" sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Pagination count={activityTotalPages} page={activityPage} onChange={(_, p) => setActivityPage(p)} color="primary" size="small" />
          </Stack>
        )}
      </Card>

      {/* ── Dialogs ───────────────────────────────────────────────────── */}

      {/* Activity View Dialog */}
      <Dialog open={activityViewDialog} onClose={() => setActivityViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Activity Details</DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box>
              <Grid container spacing={2}>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">Timestamp</Typography><Typography>{new Date(selectedActivity.created_at).toLocaleString()}</Typography></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">Action</Typography><Chip label={formatAction(selectedActivity.action)} color={getActionColor(selectedActivity.action)} variant="outlined" /></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">User</Typography><Typography>{getUserDisplay(selectedActivity)} ({selectedActivity.user_email})</Typography></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">Role</Typography><Typography>{selectedActivity.user_role || 'Unknown'}</Typography></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">IP Address</Typography><Typography fontFamily="monospace">{selectedActivity.ip_address || 'Unknown'}</Typography></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">User Agent</Typography><Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{selectedActivity.user_agent || 'Unknown'}</Typography></Grid>
              </Grid>
              {selectedActivity.changes && (
                <Box mt={3}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Changes / Details</Typography>
                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                    {JSON.stringify(selectedActivity.changes, null, 2)}
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setActivityViewDialog(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Activity Cleanup Dialog */}
      <Dialog open={cleanupDialog} onClose={() => setCleanupDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Cleanup Old Activity Logs</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Permanently delete activity log records older than the specified number of days.</Typography>
          <TextField fullWidth label="Days to keep" type="number" value={cleanupDays} onChange={e => setCleanupDays(parseInt(e.target.value) || 90)} helperText="Records older than this will be deleted" sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialog(false)}>Cancel</Button>
          <Button onClick={handleActivityCleanup} color="warning" variant="contained">Delete Old Logs</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default ActivityLogsTab;
