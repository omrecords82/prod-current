/**
 * Interactive Report Jobs Page
 * Shows background job status for interactive report operations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  LinearProgress,
  IconButton,
  Drawer,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageContainer from '@/shared/ui/PageContainer';
import BlankCard from '@/shared/ui/BlankCard';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Interactive Report Jobs',
  },
];

interface Job {
  id: number;
  jobType: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  churchId: number | null;
  reportId: string | null;
  createdByUserId: string | null;
  errorMessage: string | null;
  payload: any;
  result: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const InteractiveReportJobsPage: React.FC = () => {
  const theme = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [churchIdFilter, setChurchIdFilter] = useState('');
  const [reportIdFilter, setReportIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [total, setTotal] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPageVisibleRef = useRef(true);

  // Handle page visibility for polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
      if (isPageVisibleRef.current) {
        fetchJobs();
      } else if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    if (!isPageVisibleRef.current) return;

    try {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const params = new URLSearchParams();
      
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (churchIdFilter) {
        params.append('churchId', churchIdFilter);
      }
      if (reportIdFilter) {
        params.append('reportId', reportIdFilter);
      }
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      params.append('limit', '50');
      params.append('offset', '0');

      const data = await apiClient.get<any>(`/records/interactive-reports/jobs?${params.toString()}`);
      setJobs(data.items || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, churchIdFilter, reportIdFilter, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Polling (every 5 seconds when page is visible)
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      if (isPageVisibleRef.current) {
        fetchJobs();
      }
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchJobs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Fetch job details
  const fetchJobDetails = async (jobId: number) => {
    try {
      const job = await apiClient.get<any>(`/records/interactive-reports/jobs/${jobId}`);
      setSelectedJob(job);
      setDrawerOpen(true);
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Failed to load job details', severity: 'error' });
    }
  };

  // Cancel job
  const handleCancelJob = async (jobId: number) => {
    if (!window.confirm('Are you sure you want to cancel this job?')) {
      return;
    }

    try {
      await apiClient.post<any>(`/records/interactive-reports/jobs/${jobId}/cancel`);

      setSnackbar({ message: 'Job cancelled successfully', severity: 'success' });
      fetchJobs(); // Refresh list
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Failed to cancel job', severity: 'error' });
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'RUNNING':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Filter jobs by status tab
  const filteredJobs = jobs.filter((job) => {
    if (statusFilter === 'ALL') return true;
    return job.status === statusFilter;
  });

  return (
    <PageContainer title="Interactive Report Jobs" description="Monitor background jobs for interactive reports">
      <Breadcrumb title="Interactive Report Jobs" items={BCrumb} />
      
      <BlankCard>
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">Interactive Report Jobs</Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchJobs}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          {/* Filters */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            <TextField
              size="small"
              placeholder="Church ID"
              value={churchIdFilter}
              onChange={(e) => setChurchIdFilter(e.target.value)}
              type="number"
              sx={{ width: 120 }}
            />
            <TextField
              size="small"
              placeholder="Report ID"
              value={reportIdFilter}
              onChange={(e) => setReportIdFilter(e.target.value)}
              sx={{ width: 200 }}
            />
          </Box>

          {/* Status Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={statusFilter === 'ALL' ? 0 : statusFilter === 'PENDING' ? 1 : statusFilter === 'RUNNING' ? 2 : statusFilter === 'FAILED' ? 3 : statusFilter === 'COMPLETED' ? 4 : 5}
              onChange={(_, newValue) => {
                const statusMap = ['ALL', 'PENDING', 'RUNNING', 'FAILED', 'COMPLETED', 'CANCELLED'];
                setStatusFilter(statusMap[newValue]);
              }}
            >
              <Tab label={`All (${total})`} />
              <Tab label="Pending" />
              <Tab label="Running" />
              <Tab label="Failed" />
              <Tab label="Completed" />
              <Tab label="Cancelled" />
            </Tabs>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Loading */}
          {loading && jobs.length === 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Jobs Table */}
          {!loading && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Attempts</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No jobs found. Create an interactive report to see jobs here.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((job) => (
                      <TableRow key={job.id} hover>
                        <TableCell>{job.id}</TableCell>
                        <TableCell>{job.jobType}</TableCell>
                        <TableCell>
                          <Chip
                            label={job.status}
                            color={getStatusColor(job.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                            <LinearProgress
                              variant="determinate"
                              value={job.progress}
                              sx={{ flex: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption" sx={{ minWidth: 35 }}>
                              {job.progress}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {job.attempts} / {job.maxAttempts}
                        </TableCell>
                        <TableCell>{formatDate(job.createdAt)}</TableCell>
                        <TableCell>{formatDate(job.updatedAt)}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => fetchJobDetails(job.id)}
                              title="View Details"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            {(job.status === 'PENDING' || job.status === 'RUNNING') && (
                              <IconButton
                                size="small"
                                onClick={() => handleCancelJob(job.id)}
                                title="Cancel Job"
                                color="error"
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </BlankCard>

      {/* Job Details Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 600 } }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Job Details</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {selectedJob && (
            <Stack spacing={2}>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Job ID
                </Typography>
                <Typography variant="body1">{selectedJob.id}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Type
                </Typography>
                <Typography variant="body1">{selectedJob.jobType}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedJob.status}
                  color={getStatusColor(selectedJob.status) as any}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Progress
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={selectedJob.progress}
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption">{selectedJob.progress}%</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Attempts
                </Typography>
                <Typography variant="body1">
                  {selectedJob.attempts} / {selectedJob.maxAttempts}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">{formatDate(selectedJob.createdAt)}</Typography>
              </Box>
              {selectedJob.startedAt && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Started
                  </Typography>
                  <Typography variant="body1">{formatDate(selectedJob.startedAt)}</Typography>
                </Box>
              )}
              {selectedJob.finishedAt && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Finished
                  </Typography>
                  <Typography variant="body1">{formatDate(selectedJob.finishedAt)}</Typography>
                </Box>
              )}
              {selectedJob.churchId && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Church ID
                  </Typography>
                  <Typography variant="body1">{selectedJob.churchId}</Typography>
                </Box>
              )}
              {selectedJob.reportId && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Report ID
                  </Typography>
                  <Typography variant="body1">{selectedJob.reportId}</Typography>
                </Box>
              )}
              {selectedJob.errorMessage && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Error Message
                  </Typography>
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {selectedJob.errorMessage}
                  </Alert>
                </Box>
              )}
              {selectedJob.payload && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Payload
                  </Typography>
                  <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                      {JSON.stringify(selectedJob.payload, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
              {selectedJob.result && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Result
                  </Typography>
                  <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                      {JSON.stringify(selectedJob.result, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message}
      />
    </PageContainer>
  );
};

export default InteractiveReportJobsPage;
