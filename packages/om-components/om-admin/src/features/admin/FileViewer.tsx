import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Alert
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Code as CodeIcon,
  Description as FileTextIcon,
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
  FolderOpen as FolderOpenIcon
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
}

interface FileViewerProps {
  file: FileUpload | null;
  onExecute: (file: FileUpload) => void;
  isExecuting: boolean;
  settings?: {
    defaultPreviewMode?: 'auto' | 'raw' | 'markdown' | 'code';
    autoExpandJson?: boolean;
    enableSyntaxHighlighting?: boolean;
    maxPreviewFileSize?: number;
    lineWrapInPreview?: boolean;
    darkModeConsole?: boolean;
  };
}

const FileViewer: React.FC<FileViewerProps> = ({
  file,
  onExecute,
  isExecuting,
  settings = {}
}) => {
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const copyToClipboard = async () => {
    if (file) {
      try {
        await navigator.clipboard.writeText(file.content);
        // You could add a toast notification here
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  const downloadFile = () => {
    if (file) {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering - you could use react-markdown for better support
    return (
      <Box sx={{ 
        '& h1': { fontSize: '2rem', fontWeight: 'bold', mb: 2 },
        '& h2': { fontSize: '1.5rem', fontWeight: 'bold', mb: 1.5 },
        '& h3': { fontSize: '1.25rem', fontWeight: 'bold', mb: 1 },
        '& p': { mb: 1 },
        '& code': { 
          backgroundColor: 'grey.100', 
          padding: '2px 4px', 
          borderRadius: '4px',
          fontFamily: 'monospace'
        },
        '& pre': { 
          backgroundColor: 'grey.100', 
          padding: 2, 
          borderRadius: '4px',
          overflow: 'auto',
          fontFamily: 'monospace'
        },
        '& ul, & ol': { pl: 2 },
        '& li': { mb: 0.5 }
      }}>
        {content.split('\n').map((line, index) => {
          if (line.startsWith('# ')) {
            return <Typography key={index} variant="h4" component="h1">{line.substring(2)}</Typography>;
          } else if (line.startsWith('## ')) {
            return <Typography key={index} variant="h5" component="h2">{line.substring(3)}</Typography>;
          } else if (line.startsWith('### ')) {
            return <Typography key={index} variant="h6" component="h3">{line.substring(4)}</Typography>;
          } else if (line.startsWith('```')) {
            return <Box key={index} component="pre" sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1 }}>{line.substring(3)}</Box>;
          } else if (line.startsWith('- ')) {
            return <Typography key={index} component="li">• {line.substring(2)}</Typography>;
          } else if (line.trim() === '') {
            return <Box key={index} sx={{ height: 8 }} />;
          } else {
            return <Typography key={index} paragraph>{line}</Typography>;
          }
        })}
      </Box>
    );
  };

  const renderJson = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      const formattedJson = settings.autoExpandJson 
        ? JSON.stringify(parsed, null, 2)
        : JSON.stringify(parsed);
      
      return (
        <Box component="pre" sx={{ 
          backgroundColor: settings.darkModeConsole ? '#1e1e1e' : 'grey.50', 
          color: settings.darkModeConsole ? '#ffffff' : 'text.primary',
          p: 2, 
          borderRadius: 1,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          whiteSpace: settings.lineWrapInPreview ? 'pre-wrap' : 'pre'
        }}>
          {formattedJson}
        </Box>
      );
    } catch (error) {
      return (
        <Alert severity="error">
          Invalid JSON format
        </Alert>
      );
    }
  };

  const renderCode = (content: string, language: string) => {
    const useDarkTheme = settings.darkModeConsole !== false;
    const useSyntaxHighlighting = settings.enableSyntaxHighlighting !== false;
    
    return (
      <Box component="pre" sx={{ 
        backgroundColor: useDarkTheme ? '#1e1e1e' : '#f8f9fa', 
        color: useDarkTheme ? '#ffffff' : '#212529',
        p: 2, 
        borderRadius: 1,
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        whiteSpace: settings.lineWrapInPreview ? 'pre-wrap' : 'pre',
        border: useDarkTheme ? '1px solid #404040' : '1px solid #dee2e6',
        '& .keyword': { color: useDarkTheme ? '#569cd6' : '#d73a49' },
        '& .string': { color: useDarkTheme ? '#ce9178' : '#032f62' },
        '& .comment': { color: useDarkTheme ? '#6a9955' : '#6a737d' },
        '& .number': { color: useDarkTheme ? '#b5cea8' : '#005cc5' },
        '& .function': { color: useDarkTheme ? '#dcdcaa' : '#6f42c1' },
        '& .operator': { color: useDarkTheme ? '#d4d4d4' : '#d73a49' }
      }}>
        {useSyntaxHighlighting ? applyBasicSyntaxHighlighting(content, language) : content}
      </Box>
    );
  };

  const applyBasicSyntaxHighlighting = (content: string, language: string) => {
    if (!settings.enableSyntaxHighlighting) return content;
    
    // Basic syntax highlighting for common languages
    let highlighted = content;
    
    // JavaScript/TypeScript highlighting
    if (language === 'javascript' || language === 'typescript') {
      highlighted = highlighted
        .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await)\b/g, '<span class="keyword">$1</span>')
        .replace(/\b(console|log|error|warn|info)\b/g, '<span class="function">$1</span>')
        .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
        .replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>')
        .replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
        .replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    }
    
    // SQL highlighting
    if (language === 'sql') {
      highlighted = highlighted
        .replace(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|TABLE|INDEX|PRIMARY|FOREIGN|KEY|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP|BY|ORDER|HAVING|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MAX|MIN)\b/gi, '<span class="keyword">$1</span>')
        .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
        .replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>')
        .replace(/--.*$/gm, '<span class="comment">$&</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    }
    
    // Python highlighting
    if (language === 'python') {
      highlighted = highlighted
        .replace(/\b(def|class|import|from|as|if|elif|else|for|while|try|except|finally|with|return|yield|True|False|None)\b/g, '<span class="keyword">$1</span>')
        .replace(/\b(print|len|range|str|int|float|list|dict|set)\b/g, '<span class="function">$1</span>')
        .replace(/("""[\s\S]*?""")/g, '<span class="comment">$1</span>')
        .replace(/('''[\s\S]*?''')/g, '<span class="comment">$1</span>')
        .replace(/#.*$/gm, '<span class="comment">$&</span>')
        .replace(/("([^"]*)")/g, '<span class="string">$1</span>')
        .replace(/('([^']*)')/g, '<span class="string">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    }
    
    return highlighted;
  };

  const renderContent = () => {
    if (!file) return null;

    // Check file size limit
    const fileSizeKB = file.size / 1024;
    if (settings.maxPreviewFileSize && fileSizeKB > settings.maxPreviewFileSize) {
      return (
        <Alert severity="warning">
          <Typography variant="body2">
            File is too large to preview ({fileSizeKB.toFixed(1)} KB). 
            Maximum preview size is {settings.maxPreviewFileSize} KB.
          </Typography>
        </Alert>
      );
    }

    // Determine preview mode
    const previewMode = settings.defaultPreviewMode || 'auto';
    let effectiveType = file.type;

    if (previewMode === 'raw') {
      effectiveType = 'text';
    } else if (previewMode === 'markdown' && file.type === 'text') {
      effectiveType = 'markdown';
    } else if (previewMode === 'code' && ['text', 'markdown'].includes(file.type)) {
      effectiveType = 'javascript'; // Default to JS for code mode
    }

    switch (effectiveType) {
      case 'markdown':
        return renderMarkdown(file.content);
      case 'json':
        return renderJson(file.content);
      case 'javascript':
      case 'typescript':
        return renderCode(file.content, 'javascript');
      case 'sql':
        return renderCode(file.content, 'sql');
      case 'shell':
        return renderCode(file.content, 'bash');
      case 'python':
        return renderCode(file.content, 'python');
      case 'html':
        return renderCode(file.content, 'html');
      case 'css':
        return renderCode(file.content, 'css');
      case 'xml':
        return renderCode(file.content, 'xml');
      case 'text':
      default:
        return (
          <Box component="pre" sx={{ 
            backgroundColor: settings.darkModeConsole ? '#1e1e1e' : 'grey.50', 
            color: settings.darkModeConsole ? '#ffffff' : 'text.primary',
            p: 2, 
            borderRadius: 1,
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: settings.lineWrapInPreview ? 'pre-wrap' : 'pre',
            border: settings.darkModeConsole ? '1px solid #404040' : '1px solid #dee2e6'
          }}>
            {file.content}
          </Box>
        );
    }
  };

  if (!file) {
    return (
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 3
        }}>
          <Stack spacing={2} alignItems="center">
            <ViewIcon sx={{ fontSize: 48, color: 'grey.400' }} />
            <Typography variant="h6" color="text.secondary" textAlign="center">
              No file selected
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Select a file from the list to view its contents
            </Typography>
          </Stack>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* File Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            {getFileIcon(file.type)}
            <Box>
              <Typography variant="h6" noWrap>
                {file.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {getFileTypeChip(file.type)}
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
            </Box>
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Tooltip title="Execute">
              <IconButton
                onClick={() => onExecute(file)}
                disabled={isExecuting}
                color="primary"
                size="small"
              >
                <PlayIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy to clipboard">
              <IconButton
                onClick={copyToClipboard}
                size="small"
              >
                <CopyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton
                onClick={downloadFile}
                size="small"
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* File Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {renderContent()}
      </Box>
    </Paper>
  );
};

export default FileViewer; 