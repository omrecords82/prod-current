/**
 * OM-Ops Reports Hub
 * 
 * Browse and view OM-Ops artifacts (reports, logs, analysis) from the admin UI
 */

import React, { useState, useEffect } from 'react';
import { apiClient as axiosApiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  OpenInNew as OpenInNewIcon,
  FileDownload as DownloadIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { apiClient } from '@/shared/lib/apiClient';

interface ArtifactFile {
  name: string;
  size: number;
  type: string;
}

interface Artifact {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  files: ArtifactFile[];
  summary: string;
  tags: string[];
}

interface ArtifactsResponse {
  success: boolean;
  artifacts: Artifact[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const ARTIFACT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'changelog', label: 'Changelog' },
  { value: 'system', label: 'System Summary' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'uploads', label: 'Uploads' },
  { value: 'build', label: 'Build' },
];

export default function OpsReportsHub() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewerContent, setViewerContent] = useState<string>('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTab, setViewerTab] = useState(0);

  useEffect(() => {
    loadArtifacts();
  }, [filterType, searchQuery]);

  const loadArtifacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (searchQuery) params.q = searchQuery;
      
      const response = await apiFetch('/api/admin/ops/artifacts', { params }) as ArtifactsResponse;
      if (response.success) {
        setArtifacts(response.artifacts);
      } else {
        setError('Failed to load artifacts');
      }
    } catch (err: any) {
      console.error('Error loading artifacts:', err);
      setError(err.message || 'Failed to load artifacts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = async (artifact: Artifact, filename: string) => {
    setSelectedArtifact(artifact);
    setSelectedFile(filename);
    setViewerOpen(true);
    setViewerContent('');

    try {
      const fileUrl = `/admin/ops/artifacts/${artifact.id}/file/${filename}`;
      const text = await axiosApiClient.request<string>({ method: 'GET', url: fileUrl, responseType: 'text' });

      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext === 'json') {
        try {
          const json = JSON.parse(text);
          setViewerContent(JSON.stringify(json, null, 2));
        } catch {
          setViewerContent(text);
        }
        setViewerTab(1); // Code view
      } else {
        setViewerContent(text);
        if (ext === 'html') {
          setViewerTab(0); // HTML view
        } else {
          setViewerTab(1); // Code view
        }
      }
    } catch (err: any) {
      setViewerContent(`Error loading file: ${err.message}`);
      setViewerTab(1);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'html':
        return <DescriptionIcon />;
      case 'json':
        return <CodeIcon />;
      default:
        return <DescriptionIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        OM-Ops Reports Hub
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Browse and view OM-Ops artifacts, reports, and analysis outputs
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search artifacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Type"
              >
                {ARTIFACT_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Artifacts List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : artifacts.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              No artifacts found
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <List>
            {artifacts.map((artifact) => (
              <ListItem key={artifact.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{artifact.title}</Typography>
                      <Chip label={artifact.type} size="small" color="primary" />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {artifact.summary}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(artifact.createdAt)} • {artifact.files.length} file(s)
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {artifact.tags.slice(0, 5).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {artifact.files.map((file) => (
                      <IconButton
                        key={file.name}
                        onClick={() => handleViewFile(artifact, file.name)}
                        title={`View ${file.name}`}
                        size="small"
                      >
                        {getFileIcon(file.type)}
                      </IconButton>
                    ))}
                    <IconButton
                      onClick={() => {
                        const fileUrl = `/api/admin/ops/artifacts/${artifact.id}/file/${artifact.files[0]?.name}`;
                        window.open(fileUrl, '_blank');
                      }}
                      title="Open in new tab"
                      size="small"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Card>
      )}

      {/* File Viewer Dialog */}
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedArtifact?.title} - {selectedFile}
        </DialogTitle>
        <DialogContent>
          <Tabs value={viewerTab} onChange={(_, v) => setViewerTab(v)} sx={{ mb: 2 }}>
            {selectedFile?.endsWith('.html') && (
              <Tab label="Preview" />
            )}
            <Tab label="Source" />
          </Tabs>

          {viewerTab === 0 && selectedFile?.endsWith('.html') ? (
            <Box
              component="iframe"
              src={`/api/admin/ops/artifacts/${selectedArtifact?.id}/file/${selectedFile}`}
              sx={{
                width: '100%',
                height: '600px',
                border: '1px solid #ddd',
                borderRadius: 1,
              }}
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <Paper
              sx={{
                p: 2,
                bgcolor: '#f5f5f5',
                maxHeight: '600px',
                overflow: 'auto',
              }}
            >
              <Box
                component="pre"
                sx={{
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {viewerContent}
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (selectedArtifact && selectedFile) {
                const fileUrl = `/api/admin/ops/artifacts/${selectedArtifact.id}/file/${selectedFile}`;
                window.open(fileUrl, '_blank');
              }
            }}
            startIcon={<OpenInNewIcon />}
          >
            Open in New Tab
          </Button>
          <Button onClick={() => setViewerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
