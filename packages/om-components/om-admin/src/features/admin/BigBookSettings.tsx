import { apiClient } from '@/api/utils/axiosInstance';
import {
    PlayArrow as ExecuteIcon,
    ExpandMore as ExpandMoreIcon,
    FolderOpen as FileProcessingIcon,
    Psychology as OMAIIcon,
    PlayCircleFilled as ProcessIcon,
    Refresh as ResetIcon,
    Save as SaveIcon,
    Security as SecurityIcon,
    Settings as SettingsIcon,
    CheckCircle as TestIcon,
    Palette as UIIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    FormControlLabel,
    InputAdornment,
    InputLabel,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import React, { useState } from 'react';

export interface BigBookConsoleSettings {
  // File Viewer Settings
  defaultPreviewMode: 'auto' | 'raw' | 'markdown' | 'code';
  autoExpandJson: boolean;
  enableSyntaxHighlighting: boolean;
  maxPreviewFileSize: number; // in KB
  
  // Execution Settings
  defaultScriptEngine: 'node' | 'python' | 'sh' | 'sql';
  executionTimeout: number; // in seconds
  dryRunMode: boolean;
  autoSaveConsoleOutput: boolean;
  
  // UI Behavior
  darkModeConsole: boolean;
  lineWrapInPreview: boolean;
  showHiddenFiles: boolean;
  autoScrollConsole: boolean;
  
  // OMAI Integration
  forwardToOMAIMemory: boolean;
  tagForAgentReflection: boolean;
  enableOMAIRecommendations: boolean;
  
  // File Processing Settings
  useSecureStorage: boolean;
  retryOnMountFailure: boolean;
  autoProcessOnUpload: boolean;
}

interface ProcessingResult {
  success: boolean;
  processedFiles: any[];
  failedFiles: any[];
  secureStorage: {
    mounted: boolean;
    mountPath: string;
    retryCount: number;
  };
  summary: {
    totalFiles: number;
    processedCount: number;
    failedCount: number;
    startTime: string;
    endTime?: string;
    durationMs?: number;
  };
}

interface BigBookSettingsProps {
  settings: BigBookConsoleSettings;
  onSettingsChange: (settings: BigBookConsoleSettings) => void;
  onSave: () => void;
  onReset: () => void;
}

const defaultSettings: BigBookConsoleSettings = {
  // File Viewer Settings
  defaultPreviewMode: 'auto',
  autoExpandJson: true,
  enableSyntaxHighlighting: true,
  maxPreviewFileSize: 1024, // 1MB
  
  // Execution Settings
  defaultScriptEngine: 'node',
  executionTimeout: 30,
  dryRunMode: false,
  autoSaveConsoleOutput: true,
  
  // UI Behavior
  darkModeConsole: true,
  lineWrapInPreview: false,
  showHiddenFiles: false,
  autoScrollConsole: true,
  
  // OMAI Integration
  forwardToOMAIMemory: true,
  tagForAgentReflection: false,
  enableOMAIRecommendations: true,
  
  // File Processing Settings
  useSecureStorage: true,
  retryOnMountFailure: true,
  autoProcessOnUpload: false,
};

const BigBookSettings: React.FC<BigBookSettingsProps> = ({
  settings,
  onSettingsChange,
  onSave,
  onReset
}) => {
  const { isLayout } = useContext(CustomizerContext);
  const [hasChanges, setHasChanges] = useState(false);
  
  // File Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [mountTestResult, setMountTestResult] = useState<any>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleSettingChange = (key: keyof BigBookConsoleSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave();
    setHasChanges(false);
  };

  const handleReset = () => {
    onReset();
    setHasChanges(false);
  };

  // File Processing Handlers
  const handleProcessAllFiles = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingResult(null);

    try {
      const result = await apiClient.post<any>('/bigbook/process-all', {
        useSecureStorage: settings.useSecureStorage,
        retryOnFailure: settings.retryOnMountFailure,
      });
      setProcessingResult(result);
      setProcessingProgress(100);

    } catch (error) {
      console.error('File processing error:', error);
      setProcessingResult({
        success: false,
        processedFiles: [],
        failedFiles: [],
        secureStorage: { mounted: false, mountPath: '', retryCount: 0 },
        summary: { totalFiles: 0, processedCount: 0, failedCount: 0, startTime: new Date().toISOString() },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestSecureMount = async () => {
    setIsTesting(true);
    setMountTestResult(null);

    try {
      const result = await apiClient.post<any>('/bigbook/test-secure-mount');
      setMountTestResult(result.testResult);

    } catch (error) {
      console.error('Mount test error:', error);
      setMountTestResult({
        mountPath: '/mnt/bigbook_secure',
        accessible: false,
        writable: false,
        error: error.message,
        testTime: new Date().toISOString(),
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: isLayout === 'full' ? '100%' : 800, mx: 'auto' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            Big Book Console Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure file viewer, execution, UI behavior, and OMAI integration preferences
          </Typography>
        </Box>

        {hasChanges && (
          <Alert severity="info" action={
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={handleReset}>Reset</Button>
              <Button size="small" variant="contained" onClick={handleSave}>Save Changes</Button>
            </Stack>
          }>
            You have unsaved changes. Save them to apply the new settings.
          </Alert>
        )}

        {/* File Viewer Settings */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ViewIcon />
              <Typography variant="h6">File Viewer Settings</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Default Preview Mode</InputLabel>
                <Select
                  value={settings.defaultPreviewMode}
                  onChange={(e) => handleSettingChange('defaultPreviewMode', e.target.value)}
                  label="Default Preview Mode"
                >
                  <MenuItem value="auto">Auto (Detect from file type)</MenuItem>
                  <MenuItem value="raw">Raw Text</MenuItem>
                  <MenuItem value="markdown">Markdown</MenuItem>
                  <MenuItem value="code">Code (with syntax highlighting)</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoExpandJson}
                    onChange={(e) => handleSettingChange('autoExpandJson', e.target.checked)}
                  />
                }
                label="Auto-expand JSON files"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableSyntaxHighlighting}
                    onChange={(e) => handleSettingChange('enableSyntaxHighlighting', e.target.checked)}
                  />
                }
                label="Enable syntax highlighting"
              />

              <TextField
                fullWidth
                type="number"
                label="Max Preview File Size"
                value={settings.maxPreviewFileSize}
                onChange={(e) => handleSettingChange('maxPreviewFileSize', parseInt(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">KB</InputAdornment>,
                }}
                helperText="Files larger than this will show truncated content"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Execution Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ExecuteIcon />
              <Typography variant="h6">Execution Settings</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Default Script Engine</InputLabel>
                <Select
                  value={settings.defaultScriptEngine}
                  onChange={(e) => handleSettingChange('defaultScriptEngine', e.target.value)}
                  label="Default Script Engine"
                >
                  <MenuItem value="node">Node.js</MenuItem>
                  <MenuItem value="python">Python</MenuItem>
                  <MenuItem value="sh">Shell (Bash)</MenuItem>
                  <MenuItem value="sql">SQL</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                type="number"
                label="Execution Timeout"
                value={settings.executionTimeout}
                onChange={(e) => handleSettingChange('executionTimeout', parseInt(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">seconds</InputAdornment>,
                }}
                helperText="Maximum time to wait for script execution"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.dryRunMode}
                    onChange={(e) => handleSettingChange('dryRunMode', e.target.checked)}
                  />
                }
                label="Dry Run Mode (disable actual script effects)"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoSaveConsoleOutput}
                    onChange={(e) => handleSettingChange('autoSaveConsoleOutput', e.target.checked)}
                  />
                }
                label="Auto-save console output"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* UI Behavior Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <UIIcon />
              <Typography variant="h6">UI Behavior</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.darkModeConsole}
                    onChange={(e) => handleSettingChange('darkModeConsole', e.target.checked)}
                  />
                }
                label="Dark mode console"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.lineWrapInPreview}
                    onChange={(e) => handleSettingChange('lineWrapInPreview', e.target.checked)}
                  />
                }
                label="Line wrap in preview"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showHiddenFiles}
                    onChange={(e) => handleSettingChange('showHiddenFiles', e.target.checked)}
                  />
                }
                label="Show hidden files"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoScrollConsole}
                    onChange={(e) => handleSettingChange('autoScrollConsole', e.target.checked)}
                  />
                }
                label="Auto-scroll console to bottom"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* OMAI Integration Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <OMAIIcon />
              <Typography variant="h6">OMAI Integration</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.forwardToOMAIMemory}
                    onChange={(e) => handleSettingChange('forwardToOMAIMemory', e.target.checked)}
                  />
                }
                label="Forward executed files to OMAI memory"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.tagForAgentReflection}
                    onChange={(e) => handleSettingChange('tagForAgentReflection', e.target.checked)}
                  />
                }
                label="Tag uploaded files for agent reflection"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableOMAIRecommendations}
                    onChange={(e) => handleSettingChange('enableOMAIRecommendations', e.target.checked)}
                  />
                }
                label="Enable OMAI recommendations after execution"
              />

              <Alert severity="info">
                <Typography variant="body2">
                  OMAI integration allows the AI agent to learn from your file operations and provide intelligent suggestions.
                </Typography>
              </Alert>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* File Processing */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FileProcessingIcon />
              <Typography variant="h6">📂 File Processing</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              {/* Processing Controls */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Batch Processing
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={isProcessing ? <CircularProgress size={16} /> : <ProcessIcon />}
                    onClick={handleProcessAllFiles}
                    disabled={isProcessing}
                    color="primary"
                  >
                    {isProcessing ? 'Processing...' : 'Process All Files'}
                  </Button>
                  
                  <Tooltip title="Test if secure storage mount is accessible and writable">
                    <Button
                      variant="outlined"
                      startIcon={isTesting ? <CircularProgress size={16} /> : <TestIcon />}
                      onClick={handleTestSecureMount}
                      disabled={isTesting}
                      color="secondary"
                    >
                      {isTesting ? 'Testing...' : 'Test Secure Mount'}
                    </Button>
                  </Tooltip>
                </Stack>

                {isProcessing && (
                  <Box sx={{ width: '100%', mb: 2 }}>
                    <LinearProgress variant="indeterminate" />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Processing files... This may take a few minutes.
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Storage Settings */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Storage Configuration
                </Typography>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.useSecureStorage}
                        onChange={(e) => handleSettingChange('useSecureStorage', e.target.checked)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon fontSize="small" />
                        <span>Use Secure Storage (eCryptfs)</span>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.retryOnMountFailure}
                        onChange={(e) => handleSettingChange('retryOnMountFailure', e.target.checked)}
                      />
                    }
                    label="Retry on mount failure (up to 3 attempts)"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoProcessOnUpload}
                        onChange={(e) => handleSettingChange('autoProcessOnUpload', e.target.checked)}
                      />
                    }
                    label="Auto-process files on upload"
                  />
                </Stack>
              </Box>

              {/* Mount Test Results */}
              {mountTestResult && (
                <Alert 
                  severity={mountTestResult.accessible && mountTestResult.writable ? 'success' : 'error'}
                  sx={{ mt: 2 }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Secure Mount Test Results
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      Path: <code>{mountTestResult.mountPath}</code>
                    </Typography>
                    <Typography variant="body2">
                      Accessible: {mountTestResult.accessible ? '✅ Yes' : '❌ No'}
                    </Typography>
                    <Typography variant="body2">
                      Writable: {mountTestResult.writable ? '✅ Yes' : '❌ No'}
                    </Typography>
                    {mountTestResult.error && (
                      <Typography variant="body2" color="error">
                        Error: {mountTestResult.error}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Tested at: {new Date(mountTestResult.testTime).toLocaleString()}
                    </Typography>
                  </Stack>
                </Alert>
              )}

              {/* Processing Results */}
              {processingResult && (
                <Alert 
                  severity={processingResult.success ? 'success' : 'error'}
                  sx={{ mt: 2 }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Processing Results
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      Total Files: {processingResult.summary.totalFiles}
                    </Typography>
                    <Typography variant="body2">
                      ✅ Processed: {processingResult.summary.processedCount}
                    </Typography>
                    <Typography variant="body2">
                      ❌ Failed: {processingResult.summary.failedCount}
                    </Typography>
                    <Typography variant="body2">
                      🔒 Secure Storage: {processingResult.secureStorage.mounted ? '✅ Mounted' : '❌ Not Available'}
                    </Typography>
                    {processingResult.summary.durationMs && (
                      <Typography variant="body2">
                        Duration: {(processingResult.summary.durationMs / 1000).toFixed(2)}s
                      </Typography>
                    )}
                  </Stack>
                </Alert>
              )}

              {/* Processing Log */}
              {processingResult && (processingResult.processedFiles.length > 0 || processingResult.failedFiles.length > 0) && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Processing Log
                  </Typography>
                  <Paper sx={{ maxHeight: 300, overflow: 'auto', bgcolor: '#f5f5f5' }}>
                    <List dense>
                      {processingResult.processedFiles.map((file, index) => (
                        <ListItem key={`success-${index}`}>
                          <ListItemIcon>
                            <Chip 
                              label="✓" 
                              size="small" 
                              sx={{ bgcolor: '#4caf50', color: 'white', fontWeight: 'bold' }} 
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={file.fileName}
                            secondary={`${(file.size / 1024).toFixed(1)} KB ${file.securelyStored ? '• Stored securely' : ''}`}
                            primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                          />
                        </ListItem>
                      ))}
                      {processingResult.failedFiles.map((file, index) => (
                        <ListItem key={`failed-${index}`}>
                          <ListItemIcon>
                            <Chip 
                              label="✗" 
                              size="small" 
                              sx={{ bgcolor: '#f44336', color: 'white', fontWeight: 'bold' }} 
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={file.fileName}
                            secondary={`Error: ${file.error}`}
                            primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                            secondaryTypographyProps={{ color: 'error' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}

              <Alert severity="info">
                <Typography variant="body2">
                  File processing converts uploaded .md files into the Big Book knowledge base. 
                  Enable secure storage for encrypted file storage using eCryptfs mounting.
                </Typography>
              </Alert>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Action Buttons */}
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<ResetIcon />}
              onClick={handleReset}
            >
              Reset to Defaults
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Settings
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};

export default BigBookSettings;
export { defaultSettings };

