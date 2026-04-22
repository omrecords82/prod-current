/**
 * ServiceManagement Component
 * 
 * Service management page for monitoring and controlling system services.
 * Allows viewing service status, starting/stopping services, and monitoring system health.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Stack,
  Button,
  CircularProgress,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  IconRefresh,
  IconPlayerPlay,
  IconPlayerStop,
  IconRotate,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconHelp,
} from '@tabler/icons-react';
import BlankCard from '@/shared/ui/BlankCard';
import { useAuth } from '@/context/AuthContext';

interface ServiceStatus {
  name: string;
  displayName: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  pid?: number;
  uptime?: string;
  cpu?: number;
  memory?: number;
  description: string;
  category: 'core' | 'worker' | 'frontend' | 'database';
  restartable: boolean;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  servicesUp: number;
  servicesTotal: number;
  lastUpdate: string;
}

const ServiceManagement: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    service: string;
    action: string;
  }>({ open: false, service: '', action: '' });

  useEffect(() => {
    loadServices();
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadServices();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      // const response = await adminAPI.services.getStatus();
      // if (response.success) {
      //   setServices(response.services);
      //   setSystemHealth(response.health);
      // }
      
      // Mock data for now
      setServices([
        {
          name: 'api',
          displayName: 'API Server',
          status: 'running',
          pid: 12345,
          uptime: '2d 5h 30m',
          cpu: 15.5,
          memory: 512,
          description: 'Main API server',
          category: 'core',
          restartable: true,
        },
        {
          name: 'database',
          displayName: 'Database',
          status: 'running',
          pid: 12346,
          uptime: '5d 12h 15m',
          cpu: 8.2,
          memory: 1024,
          description: 'PostgreSQL database',
          category: 'database',
          restartable: true,
        },
      ]);
      
      setSystemHealth({
        overall: 'healthy',
        servicesUp: 2,
        servicesTotal: 2,
        lastUpdate: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceAction = async (serviceName: string, action: 'start' | 'stop' | 'restart') => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await adminAPI.services[action](serviceName);
      // if (response.success) {
      //   await loadServices();
      // }
      await loadServices();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} service`);
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, service: '', action: '' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <IconCheck size={20} color="green" />;
      case 'stopped':
        return <IconX size={20} color="red" />;
      case 'error':
        return <IconAlertTriangle size={20} color="red" />;
      default:
        return <IconHelp size={20} color="gray" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'error';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* System Health Overview */}
      {systemHealth && (
        <BlankCard sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">System Health</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                  }
                  label="Auto Refresh"
                />
                <Button
                  variant="outlined"
                  startIcon={<IconRefresh />}
                  onClick={loadServices}
                  disabled={loading}
                  size="small"
                >
                  Refresh
                </Button>
              </Stack>
            </Stack>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="textSecondary">Overall Status</Typography>
                  <Chip
                    label={systemHealth.overall.toUpperCase()}
                    color={getHealthColor(systemHealth.overall) as any}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="textSecondary">Services Running</Typography>
                  <Typography variant="h6">
                    {systemHealth.servicesUp} / {systemHealth.servicesTotal}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(systemHealth.servicesUp / systemHealth.servicesTotal) * 100}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="textSecondary">Last Update</Typography>
                  <Typography variant="body2">
                    {new Date(systemHealth.lastUpdate).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </BlankCard>
      )}

      {/* Services Table */}
      <BlankCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Services
          </Typography>

          {loading && services.length === 0 ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>PID</TableCell>
                    <TableCell>Uptime</TableCell>
                    <TableCell>CPU %</TableCell>
                    <TableCell>Memory (MB)</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.name}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {getStatusIcon(service.status)}
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {service.displayName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {service.description}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={service.status}
                          color={getStatusColor(service.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={service.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{service.pid || '-'}</TableCell>
                      <TableCell>{service.uptime || '-'}</TableCell>
                      <TableCell>{service.cpu ? `${service.cpu.toFixed(1)}%` : '-'}</TableCell>
                      <TableCell>{service.memory || '-'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {service.restartable && (
                            <>
                              {service.status === 'stopped' && (
                                <Tooltip title="Start Service">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      setConfirmDialog({
                                        open: true,
                                        service: service.name,
                                        action: 'start',
                                      });
                                    }}
                                  >
                                    <IconPlayerPlay size={18} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {service.status === 'running' && (
                                <>
                                  <Tooltip title="Restart Service">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => {
                                        setConfirmDialog({
                                          open: true,
                                          service: service.name,
                                          action: 'restart',
                                        });
                                      }}
                                    >
                                      <IconRotate size={18} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Stop Service">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => {
                                        setConfirmDialog({
                                          open: true,
                                          service: service.name,
                                          action: 'stop',
                                        });
                                      }}
                                    >
                                      <IconPlayerStop size={18} />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </BlankCard>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, service: '', action: '' })}
      >
        <DialogTitle>Confirm Service Action</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {confirmDialog.action} the service "{confirmDialog.service}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, service: '', action: '' })}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              handleServiceAction(
                confirmDialog.service,
                confirmDialog.action as 'start' | 'stop' | 'restart'
              )
            }
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceManagement;
