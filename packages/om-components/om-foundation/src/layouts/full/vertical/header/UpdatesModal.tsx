/**
 * Updates Modal Component
 * Displays available updates and allows super_admin to trigger updates
 */

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  Alert,
  LinearProgress,
} from '@mui/material';
import { IconCheck, IconX, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';

interface UpdateStatus {
  updatesAvailable: boolean;
  frontend: {
    available: boolean;
    currentSha: string;
    remoteSha: string;
    behind: number;
  };
  backend: {
    available: boolean;
    currentSha: string;
    remoteSha: string;
    behind: number;
  };
  lastCheckedAt: string;
}

interface UpdateJob {
  id: string;
  target: 'frontend' | 'backend' | 'all';
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  logs: string[];
  startedAt?: string;
  endedAt?: string;
  error?: string;
  userId: string;
}

interface UpdatesModalProps {
  open: boolean;
  onClose: () => void;
  updateStatus: UpdateStatus | null;
  onUpdateStatusChange: (status: UpdateStatus | null) => void;
}

const UpdatesModal = ({ open, onClose, updateStatus, onUpdateStatusChange }: UpdatesModalProps) => {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [currentJob, setCurrentJob] = useState<UpdateJob | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  // Poll job status when a job is running
  useEffect(() => {
    if (!currentJob || currentJob.status === 'success' || currentJob.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/system/update/jobs/${currentJob.id}`);
        if (response.data.success) {
          setCurrentJob(response.data.job);

          // If job finished, refresh update status
          if (response.data.job.status === 'success' || response.data.job.status === 'failed') {
            if (response.data.job.status === 'success') {
              enqueueSnackbar('Update completed successfully!', { variant: 'success' });
              // Refresh status after brief delay
              setTimeout(() => {
                checkForUpdates();
                // Reload page after 2 seconds to ensure new code is loaded
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }, 1000);
            } else {
              enqueueSnackbar('Update failed. Check logs for details.', { variant: 'error' });
            }
            setUpdating(false);
          }
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentJob]);

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      const response = await axios.get('/api/system/update-status');
      if (response.data.success) {
        onUpdateStatusChange({
          updatesAvailable: response.data.updatesAvailable,
          frontend: response.data.frontend,
          backend: response.data.backend,
          lastCheckedAt: response.data.lastCheckedAt,
        });
        enqueueSnackbar('Update check complete', { variant: 'success' });
      }
    } catch (error: any) {
      console.error('Failed to check for updates:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to check for updates',
        { variant: 'error' }
      );
    } finally {
      setChecking(false);
    }
  };

  const startUpdate = async (target: 'frontend' | 'backend' | 'all') => {
    try {
      setUpdating(true);
      setShowLogs(true);
      const response = await axios.post('/api/system/update/run', { target });
      
      if (response.data.success) {
        setCurrentJob({
          id: response.data.jobId,
          target,
          status: 'queued',
          logs: [],
          userId: '',
        });
        enqueueSnackbar(`${target.charAt(0).toUpperCase() + target.slice(1)} update started`, {
          variant: 'info',
        });
      }
    } catch (error: any) {
      console.error('Failed to start update:', error);
      setUpdating(false);
      
      if (error.response?.data?.code === 'UPDATE_IN_PROGRESS') {
        enqueueSnackbar('Another update is already in progress', { variant: 'warning' });
      } else {
        enqueueSnackbar(
          error.response?.data?.message || 'Failed to start update',
          { variant: 'error' }
        );
      }
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (available: boolean) => {
    return available ? 'error' : 'success';
  };

  const getStatusIcon = (available: boolean) => {
    return available ? <IconAlertCircle size={16} /> : <IconCheck size={16} />;
  };

  return (
    <Dialog
      open={open}
      onClose={!updating ? onClose : undefined}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '400px',
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">System Updates</Typography>
          {!updating && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <IconX size={20} />
            </IconButton>
          )}
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Stack spacing={3}>
          {/* Update Status Section */}
          {!currentJob && updateStatus && (
            <>
              {/* Backend Status */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={600}>
                      Backend
                    </Typography>
                    <Chip
                      label={updateStatus.backend.available ? 'Update Available' : 'Up to Date'}
                      color={getStatusColor(updateStatus.backend.available)}
                      size="small"
                      icon={getStatusIcon(updateStatus.backend.available)}
                    />
                  </Stack>

                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Current
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {updateStatus.backend.currentSha}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Remote
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {updateStatus.backend.remoteSha}
                      </Typography>
                    </Box>
                    {updateStatus.backend.behind > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Behind
                        </Typography>
                        <Typography variant="body2" color="error">
                          {updateStatus.backend.behind} commit{updateStatus.backend.behind === 1 ? '' : 's'}
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  {updateStatus.backend.available && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => startUpdate('backend')}
                      disabled={updating}
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Update Backend
                    </Button>
                  )}
                </Stack>
              </Paper>

              {/* Frontend Status */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={600}>
                      Frontend
                    </Typography>
                    <Chip
                      label={updateStatus.frontend.available ? 'Update Available' : 'Up to Date'}
                      color={getStatusColor(updateStatus.frontend.available)}
                      size="small"
                      icon={getStatusIcon(updateStatus.frontend.available)}
                    />
                  </Stack>

                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Current
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {updateStatus.frontend.currentSha}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Remote
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {updateStatus.frontend.remoteSha}
                      </Typography>
                    </Box>
                    {updateStatus.frontend.behind > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Behind
                        </Typography>
                        <Typography variant="body2" color="error">
                          {updateStatus.frontend.behind} commit{updateStatus.frontend.behind === 1 ? '' : 's'}
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  {updateStatus.frontend.available && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => startUpdate('frontend')}
                      disabled={updating}
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Update Frontend
                    </Button>
                  )}
                </Stack>
              </Paper>

              {/* Update All Button */}
              {updateStatus.updatesAvailable && (
                <Alert severity="info">
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="body2">
                      Multiple updates are available. You can update both at once:
                    </Typography>
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={() => startUpdate('all')}
                      disabled={updating}
                      size="small"
                    >
                      Update All
                    </Button>
                  </Stack>
                </Alert>
              )}

              {/* Last Checked */}
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Last checked: {formatDateTime(updateStatus.lastCheckedAt)}
              </Typography>
            </>
          )}

          {/* Job Progress Section */}
          {currentJob && (
            <>
              <Alert
                severity={
                  currentJob.status === 'success'
                    ? 'success'
                    : currentJob.status === 'failed'
                    ? 'error'
                    : 'info'
                }
              >
                <Typography variant="body2" fontWeight={600}>
                  {currentJob.status === 'queued' && 'Update queued...'}
                  {currentJob.status === 'running' && `Updating ${currentJob.target}...`}
                  {currentJob.status === 'success' && 'Update completed successfully!'}
                  {currentJob.status === 'failed' && 'Update failed'}
                </Typography>
              </Alert>

              {(currentJob.status === 'queued' || currentJob.status === 'running') && (
                <LinearProgress />
              )}

              {/* Logs Section */}
              {showLogs && currentJob.logs.length > 0 && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    backgroundColor: 'grey.900',
                    color: 'common.white',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                  }}
                >
                  {currentJob.logs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </Paper>
              )}

              {currentJob.error && (
                <Alert severity="error">
                  <Typography variant="caption">{currentJob.error}</Typography>
                </Alert>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions>
        <Button
          onClick={checkForUpdates}
          disabled={checking || updating}
          startIcon={checking ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
        >
          Check Now
        </Button>
        
        {!updating && (
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        )}
        
        {updating && currentJob && currentJob.status === 'running' && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
            Update in progress, please wait...
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UpdatesModal;
