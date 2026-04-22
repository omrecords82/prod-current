/**
 * OMAITaskAssignmentWidget.tsx
 * Enhanced dashboard widget for OMAI task assignment management
 * For admin/super_admin users only
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  Badge,
  Avatar,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  RemoveRedEye as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Computer as ComputerIcon,
  Task as TaskIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { omaiAPI } from '@/api/omai.api';
import { useAuth } from '@/context/AuthContext';
import EmailSettingsForm from './EmailSettingsForm';
import CreateTaskDialog from './CreateTaskDialog';
import type { TaskAssignmentData, TaskSubmission } from './OMAITaskAssignmentWidget/types';
import {
  formatDate,
  getStatusColor,
  getStatusIcon,
  getActionIcon,
  getActionLabel,
  parseTasksJson,
  generateSubmissionReport,
} from './OMAITaskAssignmentWidget/helpers';
import ViewSubmissionDialog from './OMAITaskAssignmentWidget/ViewSubmissionDialog';
import HistoryDialog from './OMAITaskAssignmentWidget/HistoryDialog';

const OMAITaskAssignmentWidget: React.FC = () => {
  const { hasRole, isSuperAdmin } = useAuth();
  const [data, setData] = useState<TaskAssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewSubmissionOpen, setViewSubmissionOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  
  // Form states
  const [newLinkEmail, setNewLinkEmail] = useState('');
  const [newLinkNotes, setNewLinkNotes] = useState('');
  const [newLinkExpiry, setNewLinkExpiry] = useState('1440'); // 24 hours default
  
  // Action states
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingType, setDeletingType] = useState<'link' | 'submission' | 'batch'>('link');
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  
  // History and pagination
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(25);
  const [historyFilters, setHistoryFilters] = useState({
    email: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // Selected items
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Check if user has permission to view this widget
  const canView = isSuperAdmin() || hasRole('admin');

  const fetchData = async () => {
    if (!canView) return;
    
    try {
      setError(null);
      setLoading(true);
      const response = await omaiAPI.getTaskLogs(50); // Increased limit
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load task assignment data');
      }
    } catch (err: any) {
      console.error('Error fetching task data:', err);
      setError(err.message || err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (filters = historyFilters, page = historyPage) => {
    setHistoryLoading(true);
    try {
      const response = await omaiAPI.getTaskHistory({
        page: page + 1,
        limit: historyRowsPerPage,
        ...filters
      });
      if (response.success) {
        setHistoryData(response.data.submissions || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [canView]);

  const handleGenerateLink = async () => {
    if (!newLinkEmail || !omaiAPI.validateEmail(newLinkEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await omaiAPI.generateTaskLink(newLinkEmail, {
        notes: newLinkNotes,
        expiresInMinutes: parseInt(newLinkExpiry)
      });
      
      if (response.success) {
        setGenerateDialogOpen(false);
        setNewLinkEmail('');
        setNewLinkNotes('');
        setNewLinkExpiry('1440');
        fetchData();
        showToast('Task link generated successfully', 'success');
      } else {
        setError(response.error || 'Failed to generate task link');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate link');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateLink = async (email: string) => {
    setGenerating(true);
    setError(null);

    try {
      const response = await omaiAPI.generateTaskLink(email, {
        notes: 'Regenerated link',
        expiresInMinutes: parseInt(newLinkExpiry)
      });
      
      if (response.success) {
        fetchData();
        showToast('Task link regenerated successfully', 'success');
        
        // Refresh the page to pull updated logo and assets
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError(response.error || 'Failed to regenerate task link');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate link');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteItem = async (type: 'link' | 'submission' | 'batch', id: number | string | null) => {
    setDeletingType(type);
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    setDeleting(true);
    setError(null);

    try {
      let response;
      
      switch (deletingType) {
        case 'link':
          response = await omaiAPI.deleteTaskLink(deletingId as number);
          break;
        case 'submission':
          response = await omaiAPI.deleteSubmission(deletingId as number);
          break;
        case 'batch':
          response = await omaiAPI.deleteSubmissionsBatch(Array.from(selectedItems));
          break;
      }
      
      if (response?.success) {
        fetchData();
        setSelectedItems(new Set());
        showToast(`${deletingType} deleted successfully`, 'success');
      } else {
        setError(`Failed to delete ${deletingType}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to delete ${deletingType}`);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const handleCopyLink = async (token: string, email: string) => {
    const baseURL = window.location.origin;
    const taskURL = `${baseURL}/assign-task?token=${token}`;
    
    try {
      await navigator.clipboard.writeText(taskURL);
      showToast(`Task link copied to clipboard for ${email}`, 'success');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = taskURL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast(`Task link copied to clipboard for ${email}`, 'success');
    }
  };

  const showToast = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setError(severity === 'error' ? message : null);
    if (severity === 'success') {
      setError(null);
      console.log('✅', message);
    }
  };

  const handleViewSubmission = (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
    setViewSubmissionOpen(true);
  };

  const handleDownloadSubmission = (submission: TaskSubmission) => {
    try {
      const tasks = JSON.parse(submission.tasks_json);
      const filename = `task-submission-${submission.id}-${submission.email.replace('@', '_at_')}.txt`;
      
      const content = generateSubmissionReport(submission, tasks);
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast(`Task submission downloaded as ${filename}`, 'success');
    } catch (error) {
      setError('Failed to download submission');
    }
  };


  const handleHistoryPageChange = (event: unknown, newPage: number) => {
    setHistoryPage(newPage);
    fetchHistory(historyFilters, newPage);
  };

  const handleHistoryRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHistoryRowsPerPage(parseInt(event.target.value, 10));
    setHistoryPage(0);
    fetchHistory(historyFilters, 0);
  };

  const handleHistoryFilterChange = (filter: string, value: string) => {
    const newFilters = { ...historyFilters, [filter]: value };
    setHistoryFilters(newFilters);
    setHistoryPage(0);
    fetchHistory(newFilters, 0);
  };

  // Don't render if user doesn't have permission
  if (!canView) {
    return null;
  }

  if (loading) {
    return (
      <Card sx={{ minHeight: 600 }}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ minHeight: 600 }}>
        <CardContent sx={{ p: 0 }}>
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center">
                <AssignmentIcon sx={{ mr: 2, color: '#8c249d', fontSize: 32 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="#8c249d">
                    OMAI Task Assignment
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage task links, submissions, and activity logs
                  </Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setGenerateDialogOpen(true)}
                  sx={{ bgcolor: '#8c249d', '&:hover': { bgcolor: '#6a1b9a' } }}
                >
                  Generate Link
                </Button>
                <Button
                  variant="contained"
                  startIcon={<TaskIcon />}
                  onClick={() => setCreateTaskDialogOpen(true)}
                  sx={{ bgcolor: '#8c249d', '&:hover': { bgcolor: '#6a1b9a' } }}
                >
                  Create Task
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => setHistoryDialogOpen(true)}
                >
                  Full History
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setSettingsDialogOpen(true)}
                >
                  Settings
                </Button>
                <Tooltip title="Refresh Data">
                  <IconButton onClick={fetchData} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ m: 3 }}>
              {error}
            </Alert>
          )}

          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              label={
                <Box display="flex" alignItems="center">
                  <LinkIcon sx={{ mr: 1 }} />
                  Links
                  <Badge badgeContent={data?.recent_links?.length || 0} color="primary" sx={{ ml: 1 }} />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center">
                  <TaskIcon sx={{ mr: 1 }} />
                  Submissions
                  <Badge badgeContent={data?.recent_submissions?.length || 0} color="secondary" sx={{ ml: 1 }} />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center">
                  <HistoryIcon sx={{ mr: 1 }} />
                  Activity
                  <Badge badgeContent={data?.recent_logs?.length || 0} color="info" sx={{ ml: 1 }} />
                </Box>
              } 
            />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3, minHeight: 400 }}>
            {/* Recent Links Tab */}
            {tabValue === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Task Assignment Links
                </Typography>
                {data?.recent_links?.length === 0 ? (
                  <Alert severity="info">
                    No task links generated yet. Generate your first link to get started.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Email</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>IP Address</TableCell>
                          <TableCell>Notes</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data?.recent_links?.map((link) => (
                          <TableRow key={link.id}>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: '#8c249d' }}>
                                  {link.email.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {link.email}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Token: {link.token ? `${link.token.substring(0, 8)}...` : 'No token'}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(link.status || 'active')}
                                label={link.status || 'active'}
                                color={getStatusColor(link.status || 'active') as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(link.created_at)}
                              </Typography>
                              {link.expires_at && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Expires: {formatDate(link.expires_at)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {link.ip_address ? (
                                <Box display="flex" alignItems="center">
                                  <ComputerIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2" fontFamily="monospace">
                                    {link.ip_address}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  Unknown
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {link.notes ? (
                                <Typography variant="body2" noWrap>
                                  {link.notes}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No notes
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                {link.status === 'active' && (
                                  <>
                                    {link.token && (
                                      <Tooltip title="Copy Link">
                                        <IconButton 
                                          size="small" 
                                          onClick={() => handleCopyLink(link.token, link.email)}
                                        >
                                          <CopyIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    <Tooltip title="Delete Link">
                                      <IconButton 
                                        size="small" 
                                        color="error"
                                        onClick={() => handleDeleteItem('link', link.id)}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Regenerate Link">
                                      <IconButton 
                                        size="small" 
                                        color="primary"
                                        onClick={() => handleRegenerateLink(link.email)}
                                      >
                                        <RefreshIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                                {link.status === 'used' && (
                                  <Tooltip title="View Details">
                                    <IconButton size="small">
                                      <ViewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Recent Submissions Tab */}
            {tabValue === 1 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Task Submissions
                  </Typography>
                  {selectedItems.size > 0 && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteItem('batch', null)}
                    >
                      Delete Selected ({selectedItems.size})
                    </Button>
                  )}
                </Box>
                
                {data?.recent_submissions?.length === 0 ? (
                  <Alert severity="info">
                    No task submissions yet. Task submissions will appear here once users submit tasks.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Switch
                              checked={selectedItems.size === data?.recent_submissions?.length}
                              indeterminate={selectedItems.size > 0 && selectedItems.size < (data?.recent_submissions?.length || 0)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(new Set(data?.recent_submissions?.map(s => s.id) || []));
                                } else {
                                  setSelectedItems(new Set());
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Tasks</TableCell>
                          <TableCell>Submitted</TableCell>
                          <TableCell>IP Address</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data?.recent_submissions?.map((submission) => {
                          const tasks = parseTasksJson(submission.tasks_json);
                          return (
                            <TableRow key={submission.id}>
                              <TableCell padding="checkbox">
                                <Switch
                                  checked={selectedItems.has(submission.id)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedItems);
                                    if (e.target.checked) {
                                      newSelected.add(submission.id);
                                    } else {
                                      newSelected.delete(submission.id);
                                    }
                                    setSelectedItems(newSelected);
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center">
                                  <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: '#8c249d' }}>
                                    {submission.email.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      {submission.email}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {submission.submission_type}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {tasks.slice(0, 2).map(t => t.title).join(', ')}
                                  {tasks.length > 2 && '...'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {formatDate(submission.submitted_at)}
                                </Typography>
                                {submission.sent_to_nick && submission.sent_at && (
                                  <Typography variant="caption" color="success.main" display="block">
                                    Sent: {formatDate(submission.sent_at)}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center">
                                  <ComputerIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2" fontFamily="monospace">
                                    {submission.ip_address}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={getStatusIcon(submission.status)}
                                  label={submission.status}
                                  color={getStatusColor(submission.status) as any}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Box display="flex" gap={1}>
                                  <Tooltip title="View Tasks">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleViewSubmission(submission)}
                                    >
                                      <ViewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Download Report">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleDownloadSubmission(submission)}
                                    >
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete Submission">
                                    <IconButton 
                                      size="small" 
                                      color="error"
                                      onClick={() => handleDeleteItem('submission', submission.id)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Activity Logs Tab */}
            {tabValue === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                {data?.recent_logs?.length === 0 ? (
                  <Alert severity="info">
                    No recent activity. Activity logs will appear here as users interact with the system.
                  </Alert>
                ) : (
                  <List>
                    {data?.recent_logs?.map((log, index) => (
                      <Paper key={index} sx={{ mb: 2, p: 2 }} variant="outlined">
                        <Box display="flex" alignItems="flex-start" gap={2}>
                          <Box sx={{ mt: 0.5 }}>
                            {getActionIcon(log.action)}
                          </Box>
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="body2" fontWeight="medium">
                                {getActionLabel(log.action)}
                              </Typography>
                              {log.email && (
                                <Chip label={log.email} size="small" variant="outlined" />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(log.timestamp)}
                              </Typography>
                            </Box>
                            
                            {log.token && (
                              <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Typography variant="caption" color="text.secondary">
                                  Token: {log.token.substring(0, 8)}...
                                </Typography>
                              </Box>
                            )}
                            
                            {log.data && (
                              <Accordion variant="outlined" sx={{ mt: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Typography variant="caption">View Details</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                  <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                                    {JSON.stringify(log.data, null, 2)}
                                  </pre>
                                </AccordionDetails>
                              </Accordion>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </List>
                )}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Generate Link Dialog */}
      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Task Assignment Link</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter an email address to generate a secure task assignment link. 
            The recipient will receive an email with instructions to assign tasks to Nick.
          </Typography>
          
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={newLinkEmail}
              onChange={(e) => setNewLinkEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
            
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={newLinkNotes}
              onChange={(e) => setNewLinkNotes(e.target.value)}
              placeholder="Add any notes about this task assignment..."
            />
            
            <FormControl fullWidth>
              <InputLabel>Expiration Time</InputLabel>
              <Select
                value={newLinkExpiry}
                onChange={(e) => setNewLinkExpiry(e.target.value)}
                label="Expiration Time"
              >
                <MenuItem value="60">1 hour</MenuItem>
                <MenuItem value="1440">24 hours</MenuItem>
                <MenuItem value="10080">1 week</MenuItem>
                <MenuItem value="43200">1 month</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateLink}
            variant="contained"
            disabled={generating || !newLinkEmail}
            sx={{ bgcolor: '#8c249d', '&:hover': { bgcolor: '#6a1b9a' } }}
          >
            {generating ? 'Generating...' : 'Generate Link'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {deletingType}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Submission Dialog */}
      <ViewSubmissionDialog
        open={viewSubmissionOpen}
        onClose={() => setViewSubmissionOpen(false)}
        submission={selectedSubmission}
        onDownload={handleDownloadSubmission}
      />

      {/* History Dialog */}
      <HistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        historyData={historyData}
        historyLoading={historyLoading}
        historyPage={historyPage}
        historyRowsPerPage={historyRowsPerPage}
        historyFilters={historyFilters}
        onRefresh={() => fetchHistory()}
        onPageChange={handleHistoryPageChange}
        onRowsPerPageChange={handleHistoryRowsPerPageChange}
        onFilterChange={handleHistoryFilterChange}
      />

      {/* Settings Dialog */}
      <Dialog 
        open={settingsDialogOpen} 
        onClose={() => setSettingsDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Email Settings</DialogTitle>
        <DialogContent>
          <EmailSettingsForm />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createTaskDialogOpen}
        onClose={() => setCreateTaskDialogOpen(false)}
        onSave={async (taskData) => {
          try {
            const result = await omaiAPI.createTask(taskData);
            
            // Check if result indicates failure
            if (result && result.success === false) {
              throw new Error(result.error || 'Failed to create task');
            }
            
            // Refresh data after creating task
            await fetchData();
            showToast('Task created successfully', 'success');
          } catch (error: any) {
            // Error will be handled by CreateTaskDialog's error handling
            throw error;
          }
        }}
      />
    </>
  );
};

export default OMAITaskAssignmentWidget;

