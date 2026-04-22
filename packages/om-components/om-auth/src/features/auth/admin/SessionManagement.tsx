import React, { useCallback, useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Pagination,
  Snackbar,
  Grid,
  useTheme,
} from '@mui/material';
import {
  IconRefresh,
  IconSearch,
  IconTrash,
  IconShieldX,
  IconShieldOff,
  IconLock,
  IconClock,
  IconUsers,
  IconDevices,
  IconX,
  IconEye,
  IconAlertTriangle,
  IconMessage,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/api/admin.api';
import PageContainer from '@/shared/ui/PageContainer';
import DashboardCard from '@/shared/ui/DashboardCard';

interface SessionData {
  session_id: string;
  user_id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  church_name?: string;
  ip_address?: string;
  user_agent?: string;
  login_time: string;
  expires?: string;
  is_active: boolean;
  minutes_until_expiry: number;
}

interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  expired_sessions: number;
  unique_users: number;
  unique_ips: number;
  latest_login: string;
  earliest_login: string;
}

const SessionManagement: React.FC = () => {
  const theme = useTheme();
  const { user, authenticated, loading: authLoading, hasRole } = useAuth();
  type DialogState = { open: boolean; session: SessionData | null };
  type ListBucket = {
    sessions: SessionData[];
    stats: SessionStats | null;
    loading: boolean;
    search: string;
    statusFilter: 'all' | 'active' | 'expired';
    page: number;
    totalPages: number;
    successMessage: string;
    errorMessage: string;
  };
  const [list, setList] = useState<ListBucket>({
    sessions: [],
    stats: null,
    loading: true,
    search: '',
    statusFilter: 'all',
    page: 1,
    totalPages: 1,
    successMessage: '',
    errorMessage: '',
  });
  const setListField = useCallback(<K extends keyof ListBucket>(key: K, value: ListBucket[K]) => {
    setList(prev => ({ ...prev, [key]: value }));
  }, []);
  const { sessions, stats, loading, search, statusFilter, page, totalPages, successMessage, errorMessage } = list;
  const setSessions = useCallback((v: SessionData[]) => setListField('sessions', v), [setListField]);
  const setStats = useCallback((v: SessionStats | null) => setListField('stats', v), [setListField]);
  const setLoading = useCallback((v: boolean) => setListField('loading', v), [setListField]);
  const setSearch = useCallback((v: string) => setListField('search', v), [setListField]);
  const setStatusFilter = useCallback((v: 'all' | 'active' | 'expired') => setListField('statusFilter', v), [setListField]);
  const setPage = useCallback((v: number) => setListField('page', v), [setListField]);
  const setTotalPages = useCallback((v: number) => setListField('totalPages', v), [setListField]);
  const setSuccessMessage = useCallback((v: string) => setListField('successMessage', v), [setListField]);
  const setErrorMessage = useCallback((v: string) => setListField('errorMessage', v), [setListField]);

  type DialogsBucket = {
    terminateDialog: DialogState;
    lockoutDialog: DialogState;
    terminateAllDialog: DialogState;
    cleanupDialog: boolean;
    killAllDialog: boolean;
    messageDialog: DialogState;
    messageText: string;
    sendingMessage: boolean;
  };
  const [dialogs, setDialogs] = useState<DialogsBucket>({
    terminateDialog: { open: false, session: null },
    lockoutDialog: { open: false, session: null },
    terminateAllDialog: { open: false, session: null },
    cleanupDialog: false,
    killAllDialog: false,
    messageDialog: { open: false, session: null },
    messageText: '',
    sendingMessage: false,
  });
  const setDialogsField = useCallback(<K extends keyof DialogsBucket>(key: K, value: DialogsBucket[K]) => {
    setDialogs(prev => ({ ...prev, [key]: value }));
  }, []);
  const { terminateDialog, lockoutDialog, terminateAllDialog, cleanupDialog, killAllDialog, messageDialog, messageText, sendingMessage } = dialogs;
  const setTerminateDialog = useCallback((v: DialogState) => setDialogsField('terminateDialog', v), [setDialogsField]);
  const setLockoutDialog = useCallback((v: DialogState) => setDialogsField('lockoutDialog', v), [setDialogsField]);
  const setTerminateAllDialog = useCallback((v: DialogState) => setDialogsField('terminateAllDialog', v), [setDialogsField]);
  const setCleanupDialog = useCallback((v: boolean) => setDialogsField('cleanupDialog', v), [setDialogsField]);
  const setKillAllDialog = useCallback((v: boolean) => setDialogsField('killAllDialog', v), [setDialogsField]);
  const setMessageDialog = useCallback((v: DialogState) => setDialogsField('messageDialog', v), [setDialogsField]);
  const setMessageText = useCallback((v: string) => setDialogsField('messageText', v), [setDialogsField]);
  const setSendingMessage = useCallback((v: boolean) => setDialogsField('sendingMessage', v), [setDialogsField]);

  const ITEMS_PER_PAGE = 20;

  // Show success message
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Show error message
  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <PageContainer title="Session Management" description="Manage user sessions">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  // Check permissions - only check after auth is loaded
  if (!authenticated || !user || !hasRole(['super_admin', 'admin'])) {
    return (
      <PageContainer title="Session Management" description="Manage user sessions">
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="h6">Access Denied</Typography>
          <Typography>You don't have permission to access session management.</Typography>
        </Alert>
      </PageContainer>
    );
  }

  // Fetch sessions data
  const fetchSessions = async () => {
    // Don't fetch if not authenticated or doesn't have permission
    if (!authenticated || !user || !hasRole(['super_admin', 'admin'])) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const filters = {
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      };

      const response = await adminAPI.sessions.getAll(filters);
      // Transform backend response to match frontend SessionData interface
      const transformedSessions = (response.sessions || []).map((session: any) => {
        const user = session.user || {};
        return {
          session_id: session.session_id,
          user_id: user.id || user.user_id || 0,
          email: user.email || 'Unknown',
          first_name: user.first_name || user.firstName || '',
          last_name: user.last_name || user.lastName || '',
          role: user.role || 'unknown',
          church_name: user.church_name || user.churchName || user.church_name || '',
          ip_address: session.ip_address || 'N/A',
          user_agent: session.user_agent || 'Unknown',
          login_time: session.login_time || session.created_at || new Date().toISOString(),
          expires: session.expires || session.expires_readable,
          is_active: session.is_active === 1 || session.is_active === true,
          minutes_until_expiry: session.minutes_until_expiry || 0,
        };
      });
      setSessions(transformedSessions);
      setTotalPages(Math.ceil((response.total || transformedSessions.length) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      showError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch session statistics
  const fetchStats = async () => {
    // Don't fetch if not authenticated or doesn't have permission
    if (!authenticated || !user || !hasRole(['super_admin', 'admin'])) {
      return;
    }

    try {
      const response = await adminAPI.sessions.getStats();
      // Transform backend response to match frontend SessionStats interface
      const backendStats = response.stats || response.statistics || response;
      if (backendStats) {
        setStats({
          total_sessions: backendStats.total_sessions || 0,
          active_sessions: backendStats.active_sessions || 0,
          expired_sessions: backendStats.expired_sessions || 0,
          unique_users: backendStats.unique_users || 0, // May need to be calculated separately
          unique_ips: backendStats.unique_ips || 0, // May need to be calculated separately
          latest_login: backendStats.newest_session || backendStats.latest_login || '',
          earliest_login: backendStats.oldest_session || backendStats.earliest_login || '',
        });
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('Failed to fetch session stats:', error);
    }
  };

  // Terminate session
  const handleTerminateSession = async (session: SessionData) => {
    try {
      await adminAPI.sessions.terminate(session.session_id);
      showSuccess(`Session terminated for ${session.email}`);
      setTerminateDialog({ open: false, session: null });
      fetchSessions();
      fetchStats();
    } catch (error) {
      console.error('Failed to terminate session:', error);
      showError('Failed to terminate session');
    }
  };

  // Lockout user
  const handleLockoutUser = async (session: SessionData) => {
    try {
      // First terminate any active sessions
      if (session.is_active) {
        await adminAPI.sessions.terminate(session.session_id);
      }
      
      // Then deactivate the user account
      await adminAPI.users.toggleStatus(session.user_id);
      showSuccess(`User ${session.email} has been deactivated and all sessions terminated`);
      setLockoutDialog({ open: false, session: null });
      fetchSessions();
      fetchStats();
    } catch (error) {
      console.error('Failed to lockout user:', error);
      showError('Failed to lockout user');
    }
  };

  // Terminate all sessions for a user
  const handleTerminateAllUserSessions = async (session: SessionData) => {
    try {
      await adminAPI.sessions.terminateAllForUser(session.user_id);
      showSuccess(`All sessions terminated for ${session.email}`);
      setTerminateAllDialog({ open: false, session: null });
      fetchSessions();
      fetchStats();
    } catch (error) {
      console.error('Failed to terminate all user sessions:', error);
      showError('Failed to terminate all user sessions');
    }
  };

  // Cleanup expired sessions
  const handleCleanup = async () => {
    try {
      const response = await adminAPI.sessions.cleanup(7);
      showSuccess('Cleanup completed successfully');
      setCleanupDialog(false);
      fetchSessions();
      fetchStats();
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
      showError('Failed to cleanup sessions');
    }
  };

  // Kill all active sessions
  const handleKillAllSessions = async () => {
    try {
      const response = await adminAPI.sessions.terminateAll();
      showSuccess('All active sessions terminated successfully');
      setKillAllDialog(false);
      fetchSessions();
      fetchStats();
    } catch (error) {
      console.error('Failed to terminate all sessions:', error);
      showError('Failed to terminate all sessions');
    }
  };

  // Send message to user
  const handleSendMessage = async () => {
    if (!messageDialog.session || !messageText.trim()) {
      showError('Please enter a message');
      return;
    }

    try {
      setSendingMessage(true);
      await adminAPI.messages.sendToSession(messageDialog.session.session_id, messageText);
      showSuccess(`Message sent to ${messageDialog.session.email}`);
      setMessageDialog({ open: false, session: null });
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      showError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Format date for display
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status chip
  const getStatusChip = (session: SessionData) => {
    if (session.is_active) {
      return <Chip label="Active" color="success" size="small" />;
    } else {
      return <Chip label="Expired" color="default" size="small" />;
    }
  };

  // Get role chip color
  const getRoleChipColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'warning';
      case 'manager':
        return 'info';
      case 'user':
        return 'primary';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    // Only fetch data when authenticated and has proper role
    if (!authLoading && authenticated && user && hasRole(['super_admin', 'admin'])) {
      fetchSessions();
      fetchStats();
    } else if (!authLoading) {
      // If auth is done loading but user is not authenticated, stop loading state
      setLoading(false);
    }
  }, [search, statusFilter, page, authenticated, user, authLoading]);

  return (
    <PageContainer title="Session Management" description="Monitor and manage user sessions">
      <Box>
        {/* Success/Error Messages */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {/* Statistics Cards */}
        {stats && (
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <IconUsers size={40} color="#1976d2" />
                <Typography variant="h4">{stats.active_sessions}</Typography>
                <Typography color="textSecondary">Active Sessions</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <IconClock size={40} color="#ed6c02" />
                <Typography variant="h4">{stats.expired_sessions}</Typography>
                <Typography color="textSecondary">Expired Sessions</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <IconUsers size={40} color="#2e7d32" />
                <Typography variant="h4">{stats.unique_users}</Typography>
                <Typography color="textSecondary">Unique Users</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <IconDevices size={40} color="#9c27b0" />
                <Typography variant="h4">{stats.unique_ips}</Typography>
                <Typography color="textSecondary">Unique IPs</Typography>
              </CardContent>
            </Card>
          </Stack>
        )}

        {/* Main Sessions Table */}
        <DashboardCard title="Active Sessions & Session Logs">
          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Search by email, name, or IP"
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <IconSearch size={20} />,
              }}
              sx={{ minWidth: 250 }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<IconRefresh />}
              onClick={() => {
                fetchSessions();
                fetchStats();
              }}
            >
              Refresh
            </Button>

            <Button
              variant="outlined"
              color="warning"
              startIcon={<IconX />}
              onClick={() => setCleanupDialog(true)}
            >
              Cleanup Expired
            </Button>

            <Button
              variant="contained"
              color="error"
              startIcon={<IconAlertTriangle />}
              onClick={() => setKillAllDialog(true)}
            >
              Kill All Sessions
            </Button>
          </Box>

          {/* Sessions Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#f5f5f5' }}>
                <TableRow>
                  <TableCell><strong>User</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Church</strong></TableCell>
                  <TableCell><strong>IP Address</strong></TableCell>
                  <TableCell><strong>Login Time</strong></TableCell>
                  <TableCell><strong>Expires</strong></TableCell>
                  <TableCell><strong>User Agent</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                      <Typography sx={{ mt: 2 }}>Loading sessions...</Typography>
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="textSecondary">No sessions found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session, index) => (
                    <TableRow
                      key={session.session_id}
                      sx={{
                        backgroundColor: index % 2 === 0 
                          ? (theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#ffffff')
                          : (theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#f9f9f9'),
                        '&:hover': { 
                          backgroundColor: theme.palette.mode === 'dark' 
                            ? theme.palette.grey[700] 
                            : '#f0f0f0' 
                        },
                      }}
                    >
                      <TableCell>
                        {session.first_name && session.last_name
                          ? `${session.first_name} ${session.last_name}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{session.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={session.role}
                          color={getRoleChipColor(session.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {session.church_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {session.ip_address || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDateTime(session.login_time)}</TableCell>
                      <TableCell>
                        <Box>
                          {session.expires ? formatDateTime(session.expires) : 'No active session'}
                          {session.is_active && session.minutes_until_expiry > 0 && (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                              Expires in {session.minutes_until_expiry} min
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: '200px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={session.user_agent || 'Unknown'}
                        >
                          {session.user_agent || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(session)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {session.is_active && (
                            <Tooltip title="Terminate Session">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => setTerminateDialog({ open: true, session })}
                              >
                                <IconShieldX size={18} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Terminate All User Sessions">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => setTerminateAllDialog({ open: true, session })}
                            >
                              <IconShieldOff size={18} />
                            </IconButton>
                          </Tooltip>
                          {session.is_active && (
                            <Tooltip title="Send Message">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => setMessageDialog({ open: true, session })}
                              >
                                <IconMessage size={18} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Lockout User">
                            <IconButton
                              color="warning"
                              size="small"
                              onClick={() => setLockoutDialog({ open: true, session })}
                            >
                              <IconLock size={18} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </DashboardCard>

        {/* Terminate Session Dialog */}
        <Dialog
          open={terminateDialog.open}
          onClose={() => setTerminateDialog({ open: false, session: null })}
        >
          <DialogTitle>Terminate Session</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to terminate the session for{' '}
              <strong>{terminateDialog.session?.email}</strong>?
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              This will immediately log out the user and they will need to log in again.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setTerminateDialog({ open: false, session: null })}
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => terminateDialog.session && handleTerminateSession(terminateDialog.session)}
              color="error"
              variant="contained"
            >
              Terminate Session
            </Button>
          </DialogActions>
        </Dialog>

        {/* Lockout User Dialog */}
        <Dialog
          open={lockoutDialog.open}
          onClose={() => setLockoutDialog({ open: false, session: null })}
        >
          <DialogTitle>Lockout User Account</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to lockout the account for{' '}
              <strong>{lockoutDialog.session?.email}</strong>?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              ⚠️ This will:
            </Typography>
            <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1, ml: 2 }}>
              • Immediately terminate all active sessions<br/>
              • Prevent the user from logging in<br/>
              • Require admin intervention to unlock the account
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setLockoutDialog({ open: false, session: null })}
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => lockoutDialog.session && handleLockoutUser(lockoutDialog.session)}
              color="error"
              variant="contained"
            >
              Lockout User
            </Button>
          </DialogActions>
        </Dialog>

        {/* Terminate All User Sessions Dialog */}
        <Dialog
          open={terminateAllDialog.open}
          onClose={() => setTerminateAllDialog({ open: false, session: null })}
        >
          <DialogTitle>Terminate All User Sessions</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to terminate ALL sessions for{' '}
              <strong>{terminateAllDialog.session?.email}</strong>?
            </Typography>
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              ⚠️ This will:
            </Typography>
            <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1, ml: 2 }}>
              • Immediately terminate all active sessions for this user<br/>
              • Log out the user from all devices<br/>
              • The user can log back in immediately after termination
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setTerminateAllDialog({ open: false, session: null })}
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => terminateAllDialog.session && handleTerminateAllUserSessions(terminateAllDialog.session)}
              color="warning"
              variant="contained"
            >
              Terminate All Sessions
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cleanup Dialog */}
        <Dialog open={cleanupDialog} onClose={() => setCleanupDialog(false)}>
          <DialogTitle>Cleanup Expired Sessions</DialogTitle>
          <DialogContent>
            <Typography>
              This will permanently delete all expired sessions older than 7 days from the database.
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCleanupDialog(false)} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleCleanup} color="warning" variant="contained">
              Cleanup Sessions
            </Button>
          </DialogActions>
        </Dialog>

        {/* Send Message Dialog */}
        <Dialog
          open={messageDialog.open}
          onClose={() => {
            setMessageDialog({ open: false, session: null });
            setMessageText('');
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Send Message to User</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Send an instant message to <strong>{messageDialog.session?.email}</strong>
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={4}
              label="Message"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Enter your message here..."
              sx={{ mt: 1 }}
            />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              The message will appear instantly if the user is online, or be saved for when they log in.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setMessageDialog({ open: false, session: null });
                setMessageText('');
              }}
              color="inherit"
              disabled={sendingMessage}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              color="primary"
              variant="contained"
              disabled={!messageText.trim() || sendingMessage}
              startIcon={sendingMessage ? <CircularProgress size={16} /> : <IconMessage size={18} />}
            >
              {sendingMessage ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Kill All Sessions Dialog */}
        <Dialog open={killAllDialog} onClose={() => setKillAllDialog(false)}>
          <DialogTitle>Kill All Active Sessions</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to terminate ALL active sessions for ALL users?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              ⚠️ This will:
            </Typography>
            <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1, ml: 2 }}>
              • Immediately log out ALL users from ALL devices<br/>
              • Terminate ALL admin sessions (including your own)<br/>
              • Force everyone to log in again<br/>
              • This action affects the entire system
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
              Use this only in emergency situations!
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setKillAllDialog(false)} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleKillAllSessions} color="error" variant="contained">
              Kill All Sessions
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default SessionManagement;
