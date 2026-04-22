import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Schedule as ScheduleIcon,
  Folder as FolderIcon,
  Description as FileIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  Assessment as StatsIcon,
  Timeline as TimelineIcon,
  AutoMode as AutoIcon
} from '@mui/icons-material';

interface DiscoveryStatus {
  status: string;
  version?: string;
  totalFiles?: number;
  categories?: number;
  lastDiscovery?: string;
  indexPath?: string;
  message?: string;
  error?: string;
}

interface DiscoverySummary {
  timestamp: string;
  totalFiles: number;
  categories: Record<string, number>;
  types: Record<string, number>;
  topCategories: Array<{ category: string; count: number }>;
  averageFileSize: number;
  totalSize: number;
}

interface BigBookIndex {
  version: string;
  createdAt: string;
  totalFiles: number;
  categories: Record<string, { files: any[]; count: number }>;
  files: Record<string, any>;
}

interface FileMetadata {
  id: string;
  originalPath: string;
  name: string;
  extension: string;
  size: number;
  classification: {
    type: string;
    category: string;
    confidence: number;
  };
  metadata: {
    fileStats: {
      lines: number;
      characters: number;
      words: number;
    };
    dependencies: any[];
    security: {
      findings: any[];
      hasSecurityIssues: boolean;
    };
    complexity: any;
  };
}

const OMAIDiscoveryPanel: React.FC = () => {
  const [status, setStatus] = useState<DiscoveryStatus | null>(null);
  const [summary, setSummary] = useState<DiscoverySummary | null>(null);
  const [index, setIndex] = useState<BigBookIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryFiles, setCategoryFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleHours, setScheduleHours] = useState(24);
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningStatus, setLearningStatus] = useState<any>(null);
  const [learningDialogOpen, setLearningDialogOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadStatus();
    loadSummary();
    loadIndex();
    loadLearningStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await apiClient.get<any>('/bigbook/omai/status');
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to load OMAI status:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await apiClient.get<any>('/bigbook/omai/summary');
      if (data.success && data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to load discovery summary:', error);
    }
  };

  const loadIndex = async () => {
    try {
      const data = await apiClient.get<any>('/bigbook/omai/index');
      if (data.success && data.index) {
        setIndex(data.index);
      }
    } catch (error) {
      console.error('Failed to load Big Book index:', error);
    }
  };

  const initializeOMAI = async () => {
    setLoading(true);
    try {
      const data = await apiClient.post<any>('/bigbook/omai/initialize');
      if (data.success) {
        await loadStatus();
      }
    } catch (error) {
      console.error('Failed to initialize OMAI:', error);
    } finally {
      setLoading(false);
    }
  };

  const startDiscovery = async () => {
    setDiscovering(true);
    try {
      const data = await apiClient.post<any>('/bigbook/omai/discover');
      if (data.success) {
        // Poll for completion
        const pollInterval = setInterval(async () => {
          await loadStatus();
          await loadSummary();
          await loadIndex();
        }, 5000);

        // Stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setDiscovering(false);
        }, 300000);
      }
    } catch (error) {
      console.error('Failed to start discovery:', error);
      setDiscovering(false);
    }
  };

  const loadCategoryFiles = async (category: string) => {
    try {
      const encodedCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const data = await apiClient.get<any>(`/bigbook/omai/category/${encodedCategory}`);
      if (data.success) {
        setCategoryFiles(data.files);
        setSelectedCategory(category);
      }
    } catch (error) {
      console.error('Failed to load category files:', error);
    }
  };

  const loadFileDetails = async (fileId: string) => {
    try {
      const [metadataData, contentData] = await Promise.all([
        apiClient.get<any>(`/bigbook/omai/file/${fileId}`),
        apiClient.get<any>(`/bigbook/omai/file/${fileId}/content`)
      ]);

      if (metadataData.success && contentData.success) {
        setSelectedFile(metadataData.file);
        setFileContent(contentData.content);
        setFileDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to load file details:', error);
    }
  };

  const scheduleDiscovery = async () => {
    try {
      const data = await apiClient.post<any>('/bigbook/omai/schedule', { intervalHours: scheduleHours });
      if (data.success) {
        setScheduleDialogOpen(false);
        await loadStatus();
      }
    } catch (error) {
      console.error('Failed to schedule discovery:', error);
    }
  };

  const loadLearningStatus = async () => {
    try {
      const data = await apiClient.get<any>('/omai/learning-status');
      if (data.success) {
        setLearningStatus(data);
      }
    } catch (error) {
      console.error('Failed to load learning status:', error);
    }
  };

  const refreshLearning = async () => {
    setLearningLoading(true);
    try {
      const data = await apiClient.post<any>('/omai/learn-now', { forceRefresh: true });
      
      if (data.success) {
        setLearningDialogOpen(true);
        await loadLearningStatus();
      } else {
        console.error('Learning refresh failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to refresh learning:', error);
    } finally {
      setLearningLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'success';
      case 'not_initialized': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('DevOps')) return <CodeIcon />;
    if (category.includes('Documentation')) return <FileIcon />;
    if (category.includes('Backend')) return <CodeIcon />;
    if (category.includes('Frontend')) return <CodeIcon />;
    return <FolderIcon />;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h2">
              <AutoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              OMAI Path Discovery
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadStatus}
                sx={{ mr: 1 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={learningLoading ? <CircularProgress size={16} /> : <AutoIcon />}
                onClick={refreshLearning}
                disabled={learningLoading}
                sx={{ mr: 1 }}
              >
                {learningLoading ? 'Learning...' : 'Refresh Learning'}
              </Button>
              <Button
                variant="contained"
                startIcon={<ScheduleIcon />}
                onClick={() => setScheduleDialogOpen(true)}
              >
                Schedule
              </Button>
            </Box>
          </Box>

          {/* Status */}
          {status && (
            <Alert 
              severity={getStatusColor(status.status) as any}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                <strong>Status:</strong> {status.status}
                {status.message && ` - ${status.message}`}
                {status.totalFiles && ` | ${status.totalFiles} files indexed`}
                {status.lastDiscovery && ` | Last discovery: ${new Date(status.lastDiscovery).toLocaleString()}`}
              </Typography>
            </Alert>
          )}

          {/* Control Buttons */}
          <Box display="flex" gap={2}>
            {status?.status === 'not_initialized' && (
              <Button
                variant="contained"
                startIcon={<StartIcon />}
                onClick={initializeOMAI}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Initialize OMAI'}
              </Button>
            )}
            
            {status?.status === 'ready' && (
              <Button
                variant="contained"
                startIcon={discovering ? <CircularProgress size={20} /> : <SearchIcon />}
                onClick={startDiscovery}
                disabled={discovering}
              >
                {discovering ? 'Discovering...' : 'Start Discovery'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Discovery Summary */}
      {summary && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <StatsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Discovery Summary
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {summary.totalFiles}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Files
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {Object.keys(summary.categories).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Categories
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {formatFileSize(summary.totalSize)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Size
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {formatFileSize(summary.averageFileSize)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg File Size
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Top Categories */}
            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Top Categories
              </Typography>
              <Grid container spacing={1}>
                {summary.topCategories.slice(0, 6).map((category, index) => (
                  <Grid item key={index}>
                    <Chip
                      label={`${category.category}: ${category.count}`}
                      variant="outlined"
                      size="small"
                      clickable
                      onClick={() => loadCategoryFiles(category.category)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* File Index */}
      {index && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <FolderIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              File Index - {index.totalFiles} Files
            </Typography>

            {/* Categories */}
            <Box mb={2}>
              {Object.entries(index.categories).map(([category, data]) => (
                <Accordion key={category}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" width="100%">
                      {getCategoryIcon(category)}
                      <Typography sx={{ ml: 1, flex: 1 }}>
                        {category}
                      </Typography>
                      <Badge badgeContent={data.count} color="primary" sx={{ mr: 2 }} />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Size</TableCell>
                            <TableCell>Modified</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.files.slice(0, 10).map((file) => (
                            <TableRow key={file.id}>
                              <TableCell>
                                <Typography variant="body2" noWrap>
                                  {file.name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip label={file.type} size="small" variant="outlined" />
                              </TableCell>
                              <TableCell>{formatFileSize(file.size)}</TableCell>
                              <TableCell>
                                {new Date(file.modified).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => loadFileDetails(file.id)}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {data.files.length > 10 && (
                      <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                        Showing 10 of {data.files.length} files
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* File Details Dialog */}
      <Dialog 
        open={fileDialogOpen} 
        onClose={() => setFileDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedFile?.name}
          {selectedFile?.metadata.security.hasSecurityIssues && (
            <Chip
              icon={<SecurityIcon />}
              label="Security Redacted"
              color="warning"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {selectedFile && (
            <Box>
              {/* Metadata */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Classification</Typography>
                  <Typography variant="body2">{selectedFile.classification.type}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedFile.classification.category}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">File Stats</Typography>
                  <Typography variant="body2">
                    {selectedFile.metadata.fileStats.lines} lines, {' '}
                    {selectedFile.metadata.fileStats.words} words, {' '}
                    {formatFileSize(selectedFile.size)}
                  </Typography>
                </Grid>
              </Grid>

              {/* Content */}
              <Typography variant="subtitle2" gutterBottom>
                Content Preview
              </Typography>
              <TextField
                multiline
                rows={20}
                fullWidth
                variant="outlined"
                value={fileContent}
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Learning Status Dialog */}
      <Dialog 
        open={learningDialogOpen} 
        onClose={() => setLearningDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <AutoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          OMAI Learning Refresh Complete
        </DialogTitle>
        <DialogContent>
          {learningStatus && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Learning refresh completed successfully! OMAI has updated its knowledge base.
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Learning Status</Typography>
                  <Typography variant="body2">
                    Active: {learningStatus.learning?.isActive ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="body2">
                    Last Run: {learningStatus.learning?.lastRun ? 
                      new Date(learningStatus.learning.lastRun).toLocaleString() : 'Never'}
                  </Typography>
                  <Typography variant="body2">
                    Files Processed: {learningStatus.learning?.totalFilesProcessed || 0}
                  </Typography>
                  <Typography variant="body2">
                    Memory Cache: {learningStatus.learning?.memoryCacheSize || 0} entries
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Learning Sources</Typography>
                  <List dense>
                    {learningStatus.sources && Object.entries(learningStatus.sources).map(([key, source]: [string, any]) => (
                      <ListItem key={key} divider>
                        <ListItemText 
                          primary={source.path}
                          secondary={`${source.type} (${source.priority} priority)`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
              
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>Registered OMAI Agents</Typography>
                <Box>
                  {learningStatus.agents?.registered?.map((agentId: string) => (
                    <Chip key={agentId} label={agentId} size="small" sx={{ mr: 1, mb: 1 }} />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLearningDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)}>
        <DialogTitle>Schedule Discovery</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Interval (hours)"
            type="number"
            fullWidth
            variant="outlined"
            value={scheduleHours}
            onChange={(e) => setScheduleHours(parseInt(e.target.value) || 24)}
            helperText="How often should OMAI scan for new/changed files?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button onClick={scheduleDiscovery} variant="contained">
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OMAIDiscoveryPanel; 