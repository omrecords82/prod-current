import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Storage as StorageIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Key as KeyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface StorageStatus {
  isMounted: boolean;
  mountPath: string;
  sourcePath: string;
  fileCount: number;
  totalSize: number;
  lastChecked: string;
  error?: string;
}

interface StorageFile {
  fileId: string;
  encryptedPath: string;
  relativePath: string;
  originalName: string;
  size: number;
  modifiedAt: string;
  createdAt: string;
}

const EncryptedStoragePanel: React.FC = () => {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadStatus = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await apiClient.get<any>('/bigbook/storage/status');
      
      if (result.success) {
        setStatus(result.status);
      } else {
        setError(result.error || 'Failed to load storage status');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load storage status');
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    if (!status?.isMounted) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await apiClient.get<any>('/bigbook/storage/files');
      
      if (result.success) {
        setFiles(result.files);
      } else {
        setError(result.error || 'Failed to load files');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const mountVolume = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await apiClient.post<any>('/bigbook/storage/mount');
      
      if (result.success) {
        await loadStatus();
        await loadFiles();
      } else {
        setError(result.error || 'Failed to mount volume');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to mount volume');
    } finally {
      setLoading(false);
    }
  };

  const unmountVolume = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await apiClient.post<any>('/bigbook/storage/unmount');
      
      if (result.success) {
        await loadStatus();
        setFiles([]);
      } else {
        setError(result.error || 'Failed to unmount volume');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to unmount volume');
    } finally {
      setLoading(false);
    }
  };

  const rotateKey = async () => {
    if (!window.confirm('Are you sure you want to rotate the encryption key? This will require remounting the volume.')) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await apiClient.post<any>('/bigbook/storage/rotate-key');
      
      if (result.success) {
        await loadStatus();
        await loadFiles();
      } else {
        setError(result.error || 'Failed to rotate key');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to rotate key');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (status?.isMounted) {
      loadFiles();
    }
  }, [status?.isMounted]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = () => {
    if (!status) return <InfoIcon />;
    if (status.error) return <ErrorIcon />;
    if (status.isMounted) return <CheckCircleIcon />;
    return <WarningIcon />;
  };

  const getStatusColor = () => {
    if (!status) return 'default';
    if (status.error) return 'error';
    if (status.isMounted) return 'success';
    return 'warning';
  };

  const getStatusText = () => {
    if (!status) return 'Unknown';
    if (status.error) return 'Error';
    if (status.isMounted) return 'Mounted';
    return 'Not Mounted';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Encrypted Storage Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Storage Status
            </Typography>
            <Box>
              <Tooltip title="Refresh Status">
                <IconButton onClick={loadStatus} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography>Loading...</Typography>
            </Box>
          ) : status ? (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={getStatusIcon()}
                  label={getStatusText()}
                  color={getStatusColor()}
                  variant="outlined"
                />
                {status.isMounted && (
                  <Chip
                    icon={<LockOpenIcon />}
                    label="Unlocked"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Mount Path</Typography>
                  <Typography variant="body1" fontFamily="monospace">{status.mountPath}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Source Path</Typography>
                  <Typography variant="body1" fontFamily="monospace">{status.sourcePath}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">File Count</Typography>
                  <Typography variant="body1">{status.fileCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Size</Typography>
                  <Typography variant="body1">{formatBytes(status.totalSize)}</Typography>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', gap: 1 }}>
                {!status.isMounted ? (
                  <Button
                    variant="contained"
                    startIcon={<LockOpenIcon />}
                    onClick={mountVolume}
                    disabled={loading}
                  >
                    Mount Volume
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<LockIcon />}
                    onClick={unmountVolume}
                    disabled={loading}
                  >
                    Unmount Volume
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  startIcon={<KeyIcon />}
                  onClick={rotateKey}
                  disabled={loading || !status.isMounted}
                >
                  Rotate Key
                </Button>
              </Box>
            </Stack>
          ) : (
            <Typography color="text.secondary">No status available</Typography>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      {status?.isMounted && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Stored Files ({files.length})
              </Typography>
              <Tooltip title="Refresh Files">
                <IconButton onClick={loadFiles} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography>Loading files...</Typography>
              </Box>
            ) : files.length > 0 ? (
              <List>
                {files.map((file) => (
                  <ListItem key={file.fileId} divider>
                    <ListItemIcon>
                      <StorageIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.originalName}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            ID: {file.fileId}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Size: {formatBytes(file.size)} | Created: {new Date(file.createdAt).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize="0.75rem">
                            {file.relativePath}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Download">
                          <IconButton size="small">
                            <CloudDownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" textAlign="center" py={2}>
                No files stored in encrypted storage
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Information */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Security Information
          </Typography>
          
          <Stack spacing={1}>
            <Typography variant="body2">
              • Files are encrypted using eCryptFS with AES-256 encryption
            </Typography>
            <Typography variant="body2">
              • Encryption keys are stored securely and never exposed in plaintext
            </Typography>
            <Typography variant="body2">
              • Files are only accessible through the Big Book Viewer interface
            </Typography>
            <Typography variant="body2">
              • Direct filesystem access is blocked via restrictive permissions
            </Typography>
            <Typography variant="body2">
              • Volume auto-locks when unmounted or service stops
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EncryptedStoragePanel; 