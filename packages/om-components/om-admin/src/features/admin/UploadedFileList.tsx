import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Stack,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Delete as Trash2Icon,
  Description as FileTextIcon,
  Code as CodeIcon,
  Storage as DatabaseIcon,
  Article as ArticleIcon,
  Javascript as JavaScriptIcon,
  Code as ShellScriptIcon,
  Code as PythonIcon,
  Html as HtmlIcon,
  Css as CssIcon,
  DataObject as JsonIcon,
  Code as XmlIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Archive as ArchiveIcon,
  PictureAsPdf as PdfIcon,
  TextSnippet as TextIcon,
  FolderOpen as FolderOpenIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';

interface FileUpload {
  id: string;
  name: string;
  type: 'sql' | 'script' | 'markdown' | 'javascript' | 'shell' | 'python' | 'html' | 'css' | 'json' | 'xml' | 'text' | 'image' | 'video' | 'audio' | 'archive' | 'pdf' | 'other';
  content: string;
  size: number;
  uploadedAt: Date;
  status: 'pending' | 'uploaded' | 'error';
  extension: string;
  mimeType?: string;
  isQuestionnaire?: boolean;
  questionnaireMetadata?: {
    id: string;
    fileName: string;
    title: string;
    description: string;
    ageGroup: string;
    type: string;
    version: string;
    author: string;
    estimatedDuration: number;
    questions: any[];
    metadata: any;
  };
}

interface UploadedFileListProps {
  files: FileUpload[];
  selectedFile: FileUpload | null;
  onFileSelect: (file: FileUpload) => void;
  onFileExecute: (file: FileUpload) => void;
  onFileDelete: (fileId: string) => void;
  onQuestionnairePreview?: (file: FileUpload) => void;
  isExecuting: boolean;
  settings?: {
    showHiddenFiles?: boolean;
    darkModeConsole?: boolean;
  };
}

const UploadedFileList: React.FC<UploadedFileListProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onFileExecute,
  onFileDelete,
  onQuestionnairePreview,
  isExecuting,
  settings = {}
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'markdown':
      case 'text':
        return <FileTextIcon />;
      case 'javascript':
        return <JavaScriptIcon />;
      case 'sql':
        return <DatabaseIcon />;
      case 'shell':
        return <ShellScriptIcon />;
      case 'python':
        return <PythonIcon />;
      case 'html':
        return <HtmlIcon />;
      case 'css':
        return <CssIcon />;
      case 'json':
        return <JsonIcon />;
      case 'xml':
        return <XmlIcon />;
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <VideoIcon />;
      case 'audio':
        return <AudioIcon />;
      case 'archive':
        return <ArchiveIcon />;
      case 'pdf':
        return <PdfIcon />;
      default:
        return <CodeIcon />;
    }
  };

  const getFileTypeChip = (type: string) => {
    const colorMap: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
      'markdown': 'primary',
      'javascript': 'secondary',
      'sql': 'info',
      'shell': 'warning',
      'python': 'success',
      'html': 'error',
      'css': 'info',
      'json': 'secondary',
      'xml': 'warning',
      'text': 'default',
      'image': 'success',
      'video': 'error',
      'audio': 'info',
      'archive': 'warning',
      'pdf': 'error',
      'other': 'default'
    };

    return (
      <Chip
        label={type.toUpperCase()}
        size="small"
        color={colorMap[type] || 'default'}
        variant="outlined"
      />
    );
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (files.length === 0) {
    return (
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Files</Typography>
        </Box>
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 3
        }}>
          <Stack spacing={2} alignItems="center">
            <FolderOpenIcon sx={{ fontSize: 48, color: 'grey.400' }} />
            <Typography variant="body1" color="text.secondary" textAlign="center">
              No files uploaded yet
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Use the Import tab to upload files
            </Typography>
          </Stack>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack spacing={2}>
          <Typography variant="h6">Files ({files.length})</Typography>
          <TextField
            size="small"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            fullWidth
          />
        </Stack>
      </Box>
      
      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {filteredFiles.map((file, index) => (
          <React.Fragment key={file.id}>
            <ListItem disablePadding>
              <ListItemButton
                selected={selectedFile?.id === file.id}
                onClick={() => onFileSelect(file)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemIcon>
                  {getFileIcon(file.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                        {file.name}
                      </Typography>
                      {getFileTypeChip(file.type)}
                    </Box>
                  }
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        •
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(file.uploadedAt)}
                      </Typography>
                    </Stack>
                  }
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {file.isQuestionnaire && onQuestionnairePreview && (
                    <Tooltip title="Preview Questionnaire">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuestionnairePreview(file);
                        }}
                        color="secondary"
                      >
                        <PsychologyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Execute">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileExecute(file);
                      }}
                      disabled={isExecuting}
                      color="primary"
                    >
                      <PlayIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileDelete(file.id);
                      }}
                      color="error"
                    >
                      <Trash2Icon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItemButton>
            </ListItem>
            {index < filteredFiles.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
      
      {filteredFiles.length === 0 && searchTerm && (
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 3
        }}>
          <Typography variant="body2" color="text.secondary">
            No files match "{searchTerm}"
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default UploadedFileList; 