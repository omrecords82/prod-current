/**
 * SessionsTab — Session management tab for the System Logs & Monitoring page.
 * Self-contained with own state, handlers, and dialogs.
 * Extracted from LogSearch.tsx
 *
 * State is split across helpers to keep this file focused on rendering:
 *   - useSessionsData    → list/stats/filter/pagination state + fetching
 *   - sessionsTabDialogs → 6 dialogs collapsed into a single reducer
 */
import React, { useReducer, useState } from 'react';
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
  IconAlertTriangle,
  IconClock,
  IconDevices,
  IconLock,
  IconMessage,
  IconRefresh,
  IconSearch,
  IconShieldOff,
  IconShieldX,
  IconUser,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { adminAPI } from '@/api/admin.api';
import type { SessionData } from './logSearchTypes';
import { STAT_CARD } from './logSearchTypes';
import { useSessionsData } from './useSessionsData';
import { dialogReducer, initialDialogState } from './sessionsTabDialogs';

interface SessionsTabProps {
  active: boolean;
}

const SessionsTab: React.FC<SessionsTabProps> = ({ active }) => {
  const theme = useTheme();

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const showSnack = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const data = useSessionsData({ active, onError: msg => showSnack(msg, 'error') });
  const { sessions, stats: sessionStats, loading: sessionLoading, search: sessionSearch, setSearch: setSessionSearch,
          statusFilter: sessionStatusFilter, setStatusFilter: setSessionStatusFilter,
          page: sessionPage, setPage: setSessionPage, totalPages: sessionTotalPages, refresh } = data;

  const [dialog, dispatchDialog] = useReducer(dialogReducer, initialDialogState);
  const closeDialog = () => dispatchDialog({ type: 'close' });

  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleTerminateSession = async (session: SessionData) => {
    try {
      await adminAPI.sessions.terminate(session.session_id);
      showSnack(`Session terminated for ${session.email}`);
      closeDialog();
      refresh();
    } catch (err) { showSnack('Failed to terminate session', 'error'); }
  };

  const handleTerminateAllUserSessions = async (session: SessionData) => {
    try {
      await adminAPI.sessions.terminateAllForUser(session.user_id);
      showSnack(`All sessions terminated for ${session.email}`);
      closeDialog();
      refresh();
    } catch (err) { showSnack('Failed to terminate sessions', 'error'); }
  };

  const handleLockoutUser = async (session: SessionData) => {
    try {
      if (session.is_active) await adminAPI.sessions.terminate(session.session_id);
      await adminAPI.users.toggleStatus(session.user_id);
      showSnack(`User ${session.email} deactivated`);
      closeDialog();
      refresh();
    } catch (err) { showSnack('Failed to lockout user', 'error'); }
  };

  const handleSessionCleanup = async () => {
    try {
      await adminAPI.sessions.cleanup(7);
      showSnack('Expired sessions cleaned up');
      closeDialog();
      refresh();
    } catch (err) { showSnack('Failed to cleanup sessions', 'error'); }
  };

  const handleKillAllSessions = async () => {
    try {
      await adminAPI.sessions.terminateAll();
      showSnack('All sessions terminated');
      closeDialog();
      refresh();
    } catch (err) { showSnack('Failed to terminate all sessions', 'error'); }
  };

  const handleSendMessage = async () => {
    if (dialog.kind !== 'message' || !messageText.trim()) return;
    const session = dialog.session;
    try {
      setSendingMessage(true);
      await adminAPI.messages.sendToSession(session.session_id, messageText);
      showSnack(`Message sent to ${session.email}`);
      closeDialog();
      setMessageText('');
    } catch (err) { showSnack('Failed to send message', 'error'); }
    finally { setSendingMessage(false); }
  };

  const getRoleColor = (role: string): any => {
    switch (role) {
      case 'super_admin': return 'error';
      case 'admin': return 'warning';
      case 'manager': return 'info';
      default: return 'primary';
    }
  };

  if (!active) return null;

  return (
    <>
      {/* Stats Cards */}
      {sessionStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Active Sessions', value: sessionStats.active_sessions, color: theme.palette.success.main, icon: <IconUsers size={28} /> },
            { label: 'Expired Sessions', value: sessionStats.expired_sessions, color: theme.palette.warning.main, icon: <IconClock size={28} /> },
            { label: 'Unique Users', value: sessionStats.unique_users, color: theme.palette.primary.main, icon: <IconUser size={28} /> },
            { label: 'Unique IPs', value: sessionStats.unique_ips, color: theme.palette.secondary.main, icon: <IconDevices size={28} /> },
          ].map((s, i) => (
            <Grid size={{ xs: 6, md: 3 }} key={i}>
              <Card sx={STAT_CARD(s.color)}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ color: s.color }}>{s.icon}</Box>
                    <Box>
                      <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Controls */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth size="small" label="Search by email, name, or IP"
                value={sessionSearch} onChange={e => setSessionSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={sessionStatusFilter} label="Status" onChange={e => setSessionStatusFilter(e.target.value as any)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={() => refresh()}>Refresh</Button>
              <Button variant="outlined" color="warning" startIcon={<IconX size={18} />} onClick={() => dispatchDialog({ type: 'open', dialog: { kind: 'cleanup' } })}>Cleanup Expired</Button>
              <Button variant="contained" color="error" startIcon={<IconAlertTriangle size={18} />} onClick={() => dispatchDialog({ type: 'open', dialog: { kind: 'killAll' } })}>Kill All Sessions</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 520px)', overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.06) } }}>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Church</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Login</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Status</TableCell>
                <TableCell width={140}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessionLoading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><CircularProgress /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading sessions...</Typography></TableCell></TableRow>
              ) : !sessions.length ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><IconUsers size={40} style={{ opacity: 0.2 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>No sessions found</Typography></TableCell></TableRow>
              ) : (
                sessions.map(s => (
                  <TableRow key={s.session_id} hover>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : 'N/A'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{s.email}</TableCell>
                    <TableCell><Chip label={s.role} color={getRoleColor(s.role)} size="small" sx={{ fontSize: '0.7rem' }} /></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{s.church_name || '-'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{s.ip_address || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      <Tooltip title={new Date(s.login_time).toLocaleString()}><span>{dayjs(s.login_time).fromNow()}</span></Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      {s.expires ? dayjs(s.expires).fromNow() : '-'}
                      {s.is_active && s.minutes_until_expiry > 0 && (
                        <Typography variant="caption" display="block" color="text.secondary">{s.minutes_until_expiry}m left</Typography>
                      )}
                    </TableCell>
                    <TableCell>{s.is_active ? <Chip label="Active" color="success" size="small" sx={{ fontSize: '0.7rem' }} /> : <Chip label="Expired" size="small" sx={{ fontSize: '0.7rem' }} />}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {s.is_active && (
                          <Tooltip title="Terminate Session"><IconButton size="small" color="error" onClick={() => dispatchDialog({ type: 'open', dialog: { kind: 'terminate', session: s } })}><IconShieldX size={16} /></IconButton></Tooltip>
                        )}
                        <Tooltip title="Terminate All User Sessions"><IconButton size="small" color="error" onClick={() => dispatchDialog({ type: 'open', dialog: { kind: 'terminateAll', session: s } })}><IconShieldOff size={16} /></IconButton></Tooltip>
                        {s.is_active && (
                          <Tooltip title="Send Message"><IconButton size="small" color="primary" onClick={() => dispatchDialog({ type: 'open', dialog: { kind: 'message', session: s } })}><IconMessage size={16} /></IconButton></Tooltip>
                        )}
                        <Tooltip title="Lockout User"><IconButton size="small" color="warning" onClick={() => dispatchDialog({ type: 'open', dialog: { kind: 'lockout', session: s } })}><IconLock size={16} /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {sessionTotalPages > 1 && (
          <Stack direction="row" justifyContent="center" sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Pagination count={sessionTotalPages} page={sessionPage} onChange={(_, p) => setSessionPage(p)} color="primary" size="small" />
          </Stack>
        )}
      </Card>

      {/* ── Dialogs ───────────────────────────────────────────────────── */}

      {/* Terminate Session Dialog */}
      <Dialog open={dialog.kind === 'terminate'} onClose={closeDialog}>
        <DialogTitle sx={{ fontWeight: 700 }}>Terminate Session</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to terminate the session for <strong>{dialog.kind === 'terminate' ? dialog.session.email : ''}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This will immediately log out the user.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={() => dialog.kind === 'terminate' && handleTerminateSession(dialog.session)} color="error" variant="contained">Terminate</Button>
        </DialogActions>
      </Dialog>

      {/* Terminate All User Sessions Dialog */}
      <Dialog open={dialog.kind === 'terminateAll'} onClose={closeDialog}>
        <DialogTitle sx={{ fontWeight: 700 }}>Terminate All Sessions</DialogTitle>
        <DialogContent>
          <Typography>Terminate ALL sessions for <strong>{dialog.kind === 'terminateAll' ? dialog.session.email : ''}</strong>?</Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>This will log out the user from all devices. They can log back in immediately.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={() => dialog.kind === 'terminateAll' && handleTerminateAllUserSessions(dialog.session)} color="warning" variant="contained">Terminate All</Button>
        </DialogActions>
      </Dialog>

      {/* Lockout User Dialog */}
      <Dialog open={dialog.kind === 'lockout'} onClose={closeDialog}>
        <DialogTitle sx={{ fontWeight: 700 }}>Lockout User</DialogTitle>
        <DialogContent>
          <Typography>Deactivate <strong>{dialog.kind === 'lockout' ? dialog.session.email : ''}</strong> and terminate all their sessions?</Typography>
          <Alert severity="error" sx={{ mt: 2 }}>The user will not be able to log in until reactivated by an admin.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={() => dialog.kind === 'lockout' && handleLockoutUser(dialog.session)} color="error" variant="contained">Lockout</Button>
        </DialogActions>
      </Dialog>

      {/* Session Cleanup Dialog */}
      <Dialog open={dialog.kind === 'cleanup'} onClose={closeDialog}>
        <DialogTitle sx={{ fontWeight: 700 }}>Cleanup Expired Sessions</DialogTitle>
        <DialogContent>
          <Typography>Permanently delete all expired sessions older than 7 days.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={handleSessionCleanup} color="warning" variant="contained">Cleanup</Button>
        </DialogActions>
      </Dialog>

      {/* Kill All Sessions Dialog */}
      <Dialog open={dialog.kind === 'killAll'} onClose={closeDialog}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Kill All Active Sessions</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This will terminate ALL active sessions for ALL users, including your own. Everyone will be forced to log in again.
          </Alert>
          <Typography variant="body2" fontWeight={700} color="error">Use this only in emergency situations!</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={handleKillAllSessions} color="error" variant="contained">Kill All Sessions</Button>
        </DialogActions>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={dialog.kind === 'message'} onClose={() => { closeDialog(); setMessageText(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Send Message</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Send an instant message to <strong>{dialog.kind === 'message' ? dialog.session.email : ''}</strong></Typography>
          <TextField autoFocus fullWidth multiline rows={4} label="Message" value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Enter your message..." sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { closeDialog(); setMessageText(''); }} disabled={sendingMessage}>Cancel</Button>
          <Button onClick={handleSendMessage} color="primary" variant="contained" disabled={!messageText.trim() || sendingMessage}
            startIcon={sendingMessage ? <CircularProgress size={16} /> : <IconMessage size={18} />}>
            {sendingMessage ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default SessionsTab;
