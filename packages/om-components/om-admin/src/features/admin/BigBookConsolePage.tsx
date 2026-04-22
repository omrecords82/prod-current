import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  Collapse,
  Tabs,
  Tab
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Settings as SettingsIcon,
  ViewList as ViewListIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import UploadedFileList from './UploadedFileList';
import FileViewer from './FileViewer';
import BigBookSettings, { BigBookConsoleSettings, defaultSettings } from './BigBookSettings';

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

interface ConsoleOutput {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'command';
  message: string;
  details?: string;
}

interface BigBookConsolePageProps {
  files: FileUpload[];
  consoleOutput: ConsoleOutput[];
  isExecuting: boolean;
  onFileSelect: (file: FileUpload) => void;
  onFileExecute: (file: FileUpload) => void;
  onFileDelete: (fileId: string) => void;
  onQuestionnairePreview?: (file: FileUpload) => void;
  onClearConsole: () => void;
  selectedFile: FileUpload | null;
}

const BigBookConsolePage: React.FC<BigBookConsolePageProps> = ({
  files,
  consoleOutput,
  isExecuting,
  onFileSelect,
  onFileExecute,
  onFileDelete,
  onQuestionnairePreview,
  onClearConsole,
  selectedFile
}) => {
  const [showConsole, setShowConsole] = useState(false);
  const [activeView, setActiveView] = useState<'files' | 'settings'>('files');
  const [settings, setSettings] = useState<BigBookConsoleSettings>(defaultSettings);

  const toggleConsole = () => {
    setShowConsole(!showConsole);
  };

  const handleSettingsChange = (newSettings: BigBookConsoleSettings) => {
    setSettings(newSettings);
  };

  const handleSettingsSave = () => {
    // Save settings to localStorage or API
    localStorage.setItem('bigbook-console-settings', JSON.stringify(settings));
    // You could also save to API here
  };

  const handleSettingsReset = () => {
    setSettings(defaultSettings);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" component="h1">
              Big Book Console
            </Typography>
            <Typography variant="body2" color="text.secondary">
              File explorer and execution console
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1}>
            <Tooltip title="Toggle Console">
              <IconButton onClick={toggleConsole} color="primary">
                <TerminalIcon />
              </IconButton>
            </Tooltip>
            {showConsole && (
              <Tooltip title="Clear Console">
                <IconButton onClick={onClearConsole} color="error">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Refresh">
              <IconButton color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton 
                onClick={() => setActiveView(activeView === 'files' ? 'settings' : 'files')}
                color={activeView === 'settings' ? 'secondary' : 'primary'}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeView === 'files' ? (
          /* File List and Viewer */
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* File List Panel */}
            <Box sx={{ width: '30%', minWidth: 300, borderRight: 1, borderColor: 'divider' }}>
              <UploadedFileList
                files={files}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
                onFileExecute={onFileExecute}
                onFileDelete={onFileDelete}
                onQuestionnairePreview={onQuestionnairePreview}
                isExecuting={isExecuting}
                settings={settings}
              />
            </Box>

            {/* File Viewer Panel */}
            <Box sx={{ flex: 1 }}>
              <FileViewer
                file={selectedFile}
                onExecute={onFileExecute}
                isExecuting={isExecuting}
                settings={settings}
              />
            </Box>
          </Box>
        ) : (
          /* Settings Panel */
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <BigBookSettings
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onSave={handleSettingsSave}
              onReset={handleSettingsReset}
            />
          </Box>
        )}

        {/* Console Panel */}
        <Collapse in={showConsole}>
          <Box sx={{ height: 300, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              backgroundColor: 'grey.50',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TerminalIcon fontSize="small" />
                Console Output
              </Typography>
              <Stack direction="row" spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  {consoleOutput.length} messages
                </Typography>
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={onClearConsole}
                  variant="outlined"
                >
                  Clear
                </Button>
              </Stack>
            </Box>
            
            <Box sx={{ 
              height: 250, 
              overflow: 'auto',
              p: 2,
              backgroundColor: settings.darkModeConsole ? '#1e1e1e' : '#f8f9fa',
              color: settings.darkModeConsole ? '#ffffff' : '#212529',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}>
              {consoleOutput.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  <Typography color="grey.500" textAlign="center">
                    No console output yet. Execute files to see results.
                  </Typography>
                </Box>
              ) : (
                consoleOutput.map((output) => (
                  <Box key={output.id} sx={{ mb: 1 }}>
                    <Typography
                      component="span"
                      sx={{
                        color: output.type === 'error' ? '#ff6b6b' :
                               output.type === 'success' ? '#51cf66' :
                               output.type === 'warning' ? '#ffd43b' :
                               output.type === 'command' ? '#74c0fc' : '#ffffff',
                        fontWeight: output.type === 'command' ? 'bold' : 'normal'
                      }}
                    >
                      [{formatTimeOnly(output.timestamp)}] {output.message}
                    </Typography>
                    {output.details && (
                      <Typography
                        component="div"
                        sx={{
                          color: '#adb5bd',
                          ml: 2,
                          mt: 0.5,
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {output.details}
                      </Typography>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* Status Bar */}
      <Box sx={{ 
        p: 1, 
        borderTop: 1, 
        borderColor: 'divider',
        backgroundColor: 'grey.50',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {files.length} files loaded
          </Typography>
          {selectedFile && (
            <>
              <Typography variant="caption" color="text.secondary">•</Typography>
              <Typography variant="caption" color="text.secondary">
                Selected: {selectedFile.name}
              </Typography>
            </>
          )}
        </Stack>
        
        <Stack direction="row" spacing={1} alignItems="center">
          {isExecuting && (
            <Alert severity="info" sx={{ py: 0, px: 1 }}>
              Executing...
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary">
            {consoleOutput.length} console messages
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default BigBookConsolePage; 