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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  IconRefresh,
  IconSearch,
  IconTrash,
  IconEye,
  IconCalendar,
  IconUser,
  IconActivity,
  IconChevronDown,
  IconDownload,
  IconFilter,
  IconClock,
  IconMapPin,
  IconDevices,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/api/admin.api';
import { metricsAPI } from '@/api/metrics.api';
import PageContainer from '@/shared/ui/PageContainer';
import DashboardCard from '@/shared/ui/DashboardCard';

interface ActivityLogData {
  id: number;
  user_id: number;
  action: string;
  changes: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_email?: string;
  first_name?: string;
  last_name?: string;
  user_role?: string;
}

interface ActivityLogStats {
  total_activities: number;
  unique_users: number;
  active_days: number;
  unique_actions: number;
}

const ActivityLogs: React.FC = () => {
  const { hasRole } = useAuth();
  type ListBucket = {
    activities: ActivityLogData[];
    stats: ActivityLogStats | null;
    topActions: Array<{ action: string; count: number }>;
    loading: boolean;
    search: string;
    actionFilter: string;
    userFilter: string;
    dateFrom: string;
    dateTo: string;
    page: number;
    totalPages: number;
    successMessage: string;
    errorMessage: string;
  };
  const [list, setList] = useState<ListBucket>({
    activities: [],
    stats: null,
    topActions: [],
    loading: true,
    search: '',
    actionFilter: '',
    userFilter: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    totalPages: 1,
    successMessage: '',
    errorMessage: '',
  });
  const setListField = useCallback(<K extends keyof ListBucket>(key: K, value: ListBucket[K]) => {
    setList(prev => ({ ...prev, [key]: value }));
  }, []);
  const { activities, stats, topActions, loading, search, actionFilter, userFilter, dateFrom, dateTo, page, totalPages, successMessage, errorMessage } = list;
  const setActivities = useCallback((v: ActivityLogData[]) => setListField('activities', v), [setListField]);
  const setStats = useCallback((v: ActivityLogStats | null) => setListField('stats', v), [setListField]);
  const setTopActions = useCallback((v: Array<{ action: string; count: number }>) => setListField('topActions', v), [setListField]);
  const setLoading = useCallback((v: boolean) => setListField('loading', v), [setListField]);
  const setSearch = useCallback((v: string) => setListField('search', v), [setListField]);
  const setActionFilter = useCallback((v: string) => setListField('actionFilter', v), [setListField]);
  const setUserFilter = useCallback((v: string) => setListField('userFilter', v), [setListField]);
  const setDateFrom = useCallback((v: string) => setListField('dateFrom', v), [setListField]);
  const setDateTo = useCallback((v: string) => setListField('dateTo', v), [setListField]);
  const setPage = useCallback((v: number) => setListField('page', v), [setListField]);
  const setTotalPages = useCallback((v: number) => setListField('totalPages', v), [setListField]);
  const setSuccessMessage = useCallback((v: string) => setListField('successMessage', v), [setListField]);
  const setErrorMessage = useCallback((v: string) => setListField('errorMessage', v), [setListField]);

  type DialogsBucket = {
    selectedActivity: ActivityLogData | null;
    viewDialog: boolean;
    cleanupDialog: boolean;
    cleanupDays: number;
  };
  const [dialogs, setDialogs] = useState<DialogsBucket>({
    selectedActivity: null,
    viewDialog: false,
    cleanupDialog: false,
    cleanupDays: 90,
  });
  const setDialogsField = useCallback(<K extends keyof DialogsBucket>(key: K, value: DialogsBucket[K]) => {
    setDialogs(prev => ({ ...prev, [key]: value }));
  }, []);
  const { selectedActivity, viewDialog, cleanupDialog, cleanupDays } = dialogs;
  const setSelectedActivity = useCallback((v: ActivityLogData | null) => setDialogsField('selectedActivity', v), [setDialogsField]);
  const setViewDialog = useCallback((v: boolean) => setDialogsField('viewDialog', v), [setDialogsField]);
  const setCleanupDialog = useCallback((v: boolean) => setDialogsField('cleanupDialog', v), [setDialogsField]);
  const setCleanupDays = useCallback((v: number) => setDialogsField('cleanupDays', v), [setDialogsField]);

  const ITEMS_PER_PAGE = 25;

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

  // Check permissions
  if (!hasRole(['super_admin', 'admin'])) {
    return (
      <PageContainer title="Activity Logs" description="View system activity logs">
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="h6">Access Denied</Typography>
          <Typography>You don't have permission to view activity logs.</Typography>
        </Alert>
      </PageContainer>
    );
  }

  // Fetch activity logs
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const filters = {
        search: search || undefined,
        action_filter: actionFilter || undefined,
        user_filter: userFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      };

      const response = await adminAPI.activityLogs.getAll(filters);
      setActivities(response.activities || []);
      setStats(response.stats);
      setTopActions(response.topActions || []);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      showError('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchActivities();
  }, [page, search, actionFilter, userFilter, dateFrom, dateTo]);

  // Handle search
  const handleSearch = () => {
    setPage(1);
    fetchActivities();
  };

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // View activity details
  const handleViewActivity = async (activity: ActivityLogData) => {
    try {
      const detailedActivity = await adminAPI.activityLogs.getById(activity.id);
      setSelectedActivity(detailedActivity);
      setViewDialog(true);
    } catch (error) {
      console.error('Failed to fetch activity details:', error);
      showError('Failed to load activity details');
    }
  };

  // Handle cleanup
  const handleCleanup = async () => {
    try {
      const response = await adminAPI.activityLogs.cleanup(cleanupDays);
      showSuccess(`Successfully cleaned up ${response.records_deleted} old activity log records`);
      setCleanupDialog(false);
      fetchActivities();
    } catch (error) {
      console.error('Failed to cleanup activity logs:', error);
      showError('Failed to cleanup activity logs');
    }
  };

  // Format action name for display
  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get action color
  const getActionColor = (action: string) => {
    if (action.includes('login') || action.includes('authenticate')) return 'success';
    if (action.includes('logout') || action.includes('terminate')) return 'warning';
    if (action.includes('locked') || action.includes('lockout')) return 'error';
    if (action.includes('delete') || action.includes('remove') || action.includes('cleanup')) return 'error';
    if (action.includes('create') || action.includes('add')) return 'primary';
    if (action.includes('update') || action.includes('modify') || action.includes('unlocked')) return 'info';
    return 'default';
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get user display name
  const getUserDisplay = (activity: ActivityLogData) => {
    if (activity.first_name || activity.last_name) {
      return `${activity.first_name || ''} ${activity.last_name || ''}`.trim();
    }
    return activity.user_email || `User ${activity.user_id}`;
  };

  return (
    <PageContainer title="Activity Logs" description="View and manage system activity logs">
      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <IconActivity size={32} color="#1976d2" />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.total_activities.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Activities (30 days)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <IconUser size={32} color="#388e3c" />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.unique_users}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Users
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <IconCalendar size={32} color="#f57c00" />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.active_days}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Days
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <IconFilter size={32} color="#7b1fa2" />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.unique_actions}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Action Types
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Top Actions */}
      {topActions.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Actions (Last 7 Days)
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {topActions.slice(0, 10).map((action) => (
                <Chip
                  key={action.action}
                  label={`${formatAction(action.action)} (${action.count})`}
                  color={getActionColor(action.action) as any}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <DashboardCard title="Activity Logs & Audit Trail">
        {/* Filters */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<IconChevronDown />}>
            <Typography variant="h6">
              <IconFilter size={20} style={{ marginRight: 8 }} />
              Filters & Search
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search"
                  placeholder="Search in actions, users, or changes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <IconSearch size={20} style={{ marginRight: 8 }} />,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Action Filter</InputLabel>
                  <Select
                    value={actionFilter}
                    label="Action Filter"
                    onChange={(e) => setActionFilter(e.target.value)}
                  >
                    <MenuItem value="">All Actions</MenuItem>
                    <MenuItem value="login">Login</MenuItem>
                    <MenuItem value="logout">Logout</MenuItem>
                    <MenuItem value="terminate_session">Terminate Session</MenuItem>
                    <MenuItem value="create_user">Create User</MenuItem>
                    <MenuItem value="update_user">Update User</MenuItem>
                    <MenuItem value="user_locked">Lockout User</MenuItem>
                    <MenuItem value="user_unlocked">Unlock User</MenuItem>
                    <MenuItem value="cleanup_activity_logs">Cleanup Logs</MenuItem>
                    <MenuItem value="invite_user_access">Invite User Access</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="From Date"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="To Date"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    onClick={handleSearch}
                    startIcon={<IconSearch />}
                  >
                    Search
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Actions */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Activity Log Entries ({activities.length} of {totalPages * ITEMS_PER_PAGE})
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<IconRefresh />}
              onClick={fetchActivities}
              disabled={loading}
            >
              Refresh
            </Button>
            
            {hasRole(['super_admin']) && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<IconTrash />}
                onClick={() => setCleanupDialog(true)}
              >
                Cleanup Old Logs
              </Button>
            )}
          </Stack>
        </Box>

        {/* Main Activity Table */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Activity Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell><strong>Timestamp</strong></TableCell>
                    <TableCell><strong>User</strong></TableCell>
                    <TableCell><strong>Action</strong></TableCell>
                    <TableCell><strong>Details</strong></TableCell>
                    <TableCell><strong>IP Address</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body1" color="text.secondary" py={4}>
                          No activity logs found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    activities.map((activity) => (
                      <TableRow key={activity.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {formatDate(activity.created_at)}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {getUserDisplay(activity)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {activity.user_email}
                            </Typography>
                            {activity.user_role && (
                              <Chip
                                label={activity.user_role}
                                size="small"
                                color={activity.user_role === 'super_admin' ? 'error' : 'primary'}
                                variant="outlined"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={formatAction(activity.action)}
                            color={getActionColor(activity.action) as any}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 300 }}>
                            {activity.changes && typeof activity.changes === 'object' ? (
                              Object.keys(activity.changes).length > 0 ? (
                                Object.entries(activity.changes).slice(0, 2).map(([k, v]) =>
                                  `${k}: ${String(v).substring(0, 30)}`
                                ).join(', ') + (Object.keys(activity.changes).length > 2 ? '...' : '')
                              ) : (
                                'No details'
                              )
                            ) : activity.changes ? (
                              String(activity.changes).substring(0, 60)
                            ) : (
                              'No details'
                            )}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <IconMapPin size={16} />
                            <Typography variant="body2">
                              {activity.ip_address || 'Unknown'}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewActivity(activity)}
                            >
                              <IconEye />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </DashboardCard>

      {/* View Activity Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Activity Log Details
        </DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body1">{formatDate(selectedActivity.created_at)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Action</Typography>
                  <Chip
                    label={formatAction(selectedActivity.action)}
                    color={getActionColor(selectedActivity.action) as any}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">User</Typography>
                  <Typography variant="body1">
                    {getUserDisplay(selectedActivity)} ({selectedActivity.user_email})
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Role</Typography>
                  <Typography variant="body1">{selectedActivity.user_role || 'Unknown'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">IP Address</Typography>
                  <Typography variant="body1">{selectedActivity.ip_address || 'Unknown'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">User Agent</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                    {selectedActivity.user_agent || 'Unknown'}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedActivity.changes && (
                <Box mt={3}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Changes/Details
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedActivity.changes, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialog} onClose={() => setCleanupDialog(false)}>
        <DialogTitle>Cleanup Old Activity Logs</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will permanently delete activity log records older than the specified number of days.
          </Typography>
          <TextField
            fullWidth
            label="Days to keep"
            type="number"
            value={cleanupDays}
            onChange={(e) => setCleanupDays(parseInt(e.target.value) || 90)}
            helperText="Records older than this many days will be deleted"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCleanup}
            color="warning"
            variant="contained"
          >
            Delete Old Logs
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={5000}
        onClose={() => setErrorMessage('')}
      >
        <Alert severity="error" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ActivityLogs;
