import { Alert, Box, Button, Collapse, FormControl, FormControlLabel, FormLabel, Paper, Radio, RadioGroup, Slider, Tab, Tabs, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import { ResultsList } from './ResultsList.tsx';
import { TargetInput } from './TargetInput.tsx';
import { useFsScan } from './hooks/useFsScan.ts';
import { useOmtraceApi } from './hooks/useOmtraceApi.ts';
import { OmtraceRunResult } from './types.ts';

// Default settings
const DEFAULT_BASE_DIR = '/var/www/orthodoxmetrics/prod';
const DEFAULT_RELATIVE_ROOT = 'front-end/src';
const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MODE = 'closure';

export const OmtraceConsole: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'console' | 'slugs' | 'tree' | 'history'>('console');
  const [results, setResults] = useState<OmtraceRunResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<OmtraceRunResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Settings state
  const [baseDir, setBaseDir] = useState(DEFAULT_BASE_DIR);
  const [relativeRoot, setRelativeRoot] = useState(DEFAULT_RELATIVE_ROOT);
  const [maxDepth, setMaxDepth] = useState(DEFAULT_MAX_DEPTH);
  const [mode, setMode] = useState<'full' | 'closure'>(DEFAULT_MODE as 'full' | 'closure');
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { runAnalysis, runRefactor, getHistory, getSlugRules, updateSlugRules } = useOmtraceApi();
  const { scanFileSystem, fileTree } = useFsScan();
  
  // Load settings from localStorage on mount
  useEffect(() => {
    const savedBaseDir = localStorage.getItem('omtrace-baseDir');
    const savedRelativeRoot = localStorage.getItem('omtrace-relativeRoot');
    const savedMaxDepth = localStorage.getItem('omtrace-maxDepth');
    const savedMode = localStorage.getItem('omtrace-mode');
    
    if (savedBaseDir) setBaseDir(savedBaseDir);
    if (savedRelativeRoot) setRelativeRoot(savedRelativeRoot);
    if (savedMaxDepth) setMaxDepth(parseInt(savedMaxDepth, 10));
    if (savedMode) setMode(savedMode as 'full' | 'closure');
  }, []);
  
  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('omtrace-baseDir', baseDir);
    localStorage.setItem('omtrace-relativeRoot', relativeRoot);
    localStorage.setItem('omtrace-maxDepth', String(maxDepth));
    localStorage.setItem('omtrace-mode', mode);
  }, [baseDir, relativeRoot, maxDepth, mode]);
  
  // Validate settings
  const validateSettings = (): boolean => {
    // Validate baseDir is absolute
    if (!baseDir.startsWith('/')) {
      setValidationError('Base Directory must be an absolute path (start with /)');
      return false;
    }
    
    // Validate baseDir is within allowed paths
    if (!baseDir.startsWith('/var/www/orthodoxmetrics')) {
      setValidationError('Base Directory must be within /var/www/orthodoxmetrics/');
      return false;
    }
    
    // Validate relativeRoot doesn't contain ..
    if (relativeRoot.includes('..')) {
      setValidationError('Relative Root cannot contain ".." (path traversal)');
      return false;
    }
    
    // Validate maxDepth is in range
    if (maxDepth < 1 || maxDepth > 10) {
      setValidationError('Max Depth must be between 1 and 10');
      return false;
    }
    
    setValidationError(null);
    return true;
  };
  
  // Get resolved scan root
  const getScanRoot = (): string => {
    return `${baseDir}/${relativeRoot}`;
  };

  const handleAnalyze = async (targets: string[], flags: any) => {
    try {
      const result = await runAnalysis(targets, flags);
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const handleRefactor = async (target: string, options: any) => {
    try {
      const result = await runRefactor(target, options);
      console.log('Refactor result:', result);
      // Refresh results after refactor
      // setResults(prev => [...prev]);
    } catch (error) {
      console.error('Refactor failed:', error);
    }
  };

  const handleOpenDetails = (result: OmtraceRunResult) => {
    setSelectedResult(result);
    setIsDrawerOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDrawerOpen(false);
    setSelectedResult(null);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>OMTrace Console</h1>
          <p style={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>Component dependency analysis and intelligent refactoring</p>
        </Box>

        {/* Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab value="console" label="🔍 Console" sx={{ textTransform: 'none' }} />
            <Tab value="slugs" label="🏷️ Slug Manager" sx={{ textTransform: 'none' }} />
            <Tab value="tree" label="🌳 Tree Browser" sx={{ textTransform: 'none' }} />
            <Tab value="history" label="📚 History" sx={{ textTransform: 'none' }} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {activeTab === 'console' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Settings Section */}
              <Paper elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.text.primary, margin: 0 }}>⚙️ Analysis Settings</h2>
                  <Button 
                    size="small" 
                    onClick={() => setSettingsExpanded(!settingsExpanded)}
                    sx={{ textTransform: 'none' }}
                  >
                    {settingsExpanded ? 'Hide' : 'Show'} Settings
                  </Button>
                </Box>
                
                <Collapse in={settingsExpanded}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                    {/* Validation Error */}
                    {validationError && (
                      <Alert severity="error" onClose={() => setValidationError(null)}>
                        {validationError}
                      </Alert>
                    )}
                    
                    {/* Base Directory */}
                    <TextField
                      fullWidth
                      label="Base Directory (absolute path)"
                      value={baseDir}
                      onChange={(e) => setBaseDir(e.target.value)}
                      onBlur={validateSettings}
                      helperText="Root directory for the project (e.g., /var/www/orthodoxmetrics/prod)"
                      size="small"
                    />
                    
                    {/* Relative Root */}
                    <TextField
                      fullWidth
                      label="Relative Root (within base)"
                      value={relativeRoot}
                      onChange={(e) => setRelativeRoot(e.target.value)}
                      onBlur={validateSettings}
                      helperText="Relative path from base directory (e.g., front-end/src)"
                      size="small"
                    />
                    
                    {/* Resolved Scan Root (read-only) */}
                    <TextField
                      fullWidth
                      label="Resolved Scan Root"
                      value={getScanRoot()}
                      InputProps={{ readOnly: true }}
                      helperText="This is where analysis will be performed"
                      size="small"
                      sx={{ bgcolor: 'action.hover' }}
                    />
                    
                    {/* Max Depth Slider */}
                    <Box>
                      <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                        Max Depth: {maxDepth}
                      </FormLabel>
                      <Slider
                        value={maxDepth}
                        onChange={(e, value) => setMaxDepth(value as number)}
                        min={1}
                        max={10}
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                        sx={{ maxWidth: 400 }}
                      />
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                        Controls dependency traversal depth (1=direct only, 10=deep crawl)
                      </Box>
                    </Box>
                    
                    {/* Mode Toggle */}
                    <FormControl component="fieldset">
                      <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                        Scan Mode
                      </FormLabel>
                      <RadioGroup
                        row
                        value={mode}
                        onChange={(e) => setMode(e.target.value as 'full' | 'closure')}
                      >
                        <FormControlLabel 
                          value="closure" 
                          control={<Radio />} 
                          label="Target Closure (Recommended)" 
                        />
                        <FormControlLabel 
                          value="full" 
                          control={<Radio />} 
                          label="Full Scan Root" 
                        />
                      </RadioGroup>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                        <strong>Target Closure:</strong> Analyze only specified targets and their dependencies up to max depth<br />
                        <strong>Full Scan Root:</strong> Index and analyze all files under scan root (slower, more comprehensive)
                      </Box>
                    </FormControl>
                  </Box>
                </Collapse>
              </Paper>
              
              {/* Analysis Input */}
              <Paper elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 3 }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.text.primary, marginBottom: '1rem' }}>Component Analysis</h2>
                <TargetInput onAnalyze={handleAnalyze} isLoading={false} />
              </Paper>

              {/* Results */}
              {results.length > 0 && (
                <Paper elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.text.primary }}>Analysis Results</h2>
                  </Box>
                  <ResultsList results={results} onOpenDetails={handleOpenDetails} />
                </Paper>
              )}
            </Box>
          )}

          {activeTab === 'slugs' && (
            <Paper elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 3 }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.text.primary, marginBottom: '1rem' }}>Slug Taxonomy Manager</h2>
              <Box sx={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>
                <p>Manage domain and slug mapping rules for automatic refactoring.</p>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <h3 style={{ fontWeight: 500, marginBottom: '0.5rem', color: theme.palette.text.primary }}>Prefix Rules (Hard Priority)</h3>
                  <ul style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: theme.palette.text.primary }}>
                    <li>• <code>Church*</code> → <code>church-management/ch-panel</code></li>
                    <li>• <code>User*</code> → <code>user-management/usr-core</code></li>
                    <li>• <code>Record*</code> → <code>record-management/rec-template</code></li>
                    <li>• <code>AccessControlDashboard*</code> → <code>dashboard-management/acl-dash</code></li>
                  </ul>
                </Box>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <h3 style={{ fontWeight: 500, marginBottom: '0.5rem', color: theme.palette.text.primary }}>Slug Taxonomy (Heuristics)</h3>
                  <ul style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: theme.palette.text.primary }}>
                    <li>• <code>Wizard</code> → <code>*-wiz</code></li>
                    <li>• <code>Roles/Permissions</code> → <code>*-roles</code></li>
                    <li>• <code>Options/Config</code> → <code>*-opt</code></li>
                    <li>• <code>Display/View</code> → <code>*-dis</code></li>
                  </ul>
                </Box>
              </Box>
            </Paper>
          )}

          {activeTab === 'tree' && (
            <Paper elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 3 }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.text.primary, marginBottom: '1rem' }}>Component Tree Browser</h2>
              <Box sx={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>
                <p>Browse the component dependency tree and explore relationships.</p>
                <Button
                  variant="contained"
                  onClick={() => scanFileSystem()}
                  sx={{ mt: 2, textTransform: 'none' }}
                >
                  Scan File System
                </Button>
                {fileTree && (
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', 
                    borderRadius: 1, 
                    border: 1, 
                    borderColor: 'divider' 
                  }}>
                    <pre style={{ 
                      fontSize: '0.75rem', 
                      overflow: 'auto', 
                      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : theme.palette.text.primary,
                      margin: 0
                    }}>{JSON.stringify(fileTree, null, 2)}</pre>
                  </Box>
                )}
              </Box>
            </Paper>
          )}

          {activeTab === 'history' && (
            <Paper elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 3 }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.text.primary, marginBottom: '1rem' }}>Refactor History</h2>
              <Box sx={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>
                <p>View history of refactoring operations and their results.</p>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.text.primary }}>No refactor history available yet.</p>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Details Drawer */}
      {isDrawerOpen && selectedResult && (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1300 }}>
          <Box sx={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 384, bgcolor: 'background.paper', boxShadow: 24 }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.text.primary }}>Analysis Details</h3>
                <Button
                  onClick={handleCloseDetails}
                  sx={{ minWidth: 'auto', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                  ✕
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <h4 style={{ fontWeight: 500, color: theme.palette.text.primary }}>Entry</h4>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>{selectedResult.entry}</p>
                </Box>
                
                <Box>
                  <h4 style={{ fontWeight: 500, color: theme.palette.text.primary }}>Resolved Path</h4>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>{selectedResult.resolvedPath}</p>
                </Box>

                <Box>
                  <h4 style={{ fontWeight: 500, color: theme.palette.text.primary }}>Direct Dependencies</h4>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>{selectedResult.direct.length} items</p>
                  <ul style={{ fontSize: '0.75rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.text.secondary, marginTop: '0.25rem' }}>
                    {selectedResult.direct.slice(0, 5).map((dep, i) => (
                      <li key={i}>• {dep}</li>
                    ))}
                    {selectedResult.direct.length > 5 && (
                      <li>... and {selectedResult.direct.length - 5} more</li>
                    )}
                  </ul>
                </Box>

                {selectedResult.transitive && (
                  <Box>
                    <h4 style={{ fontWeight: 500, color: theme.palette.text.primary }}>Transitive Dependencies</h4>
                    <p style={{ fontSize: '0.875rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>{selectedResult.transitive.length} items</p>
                  </Box>
                )}

                {selectedResult.api && selectedResult.api.length > 0 && (
                  <Box>
                    <h4 style={{ fontWeight: 500, color: theme.palette.text.primary }}>API Calls</h4>
                    <p style={{ fontSize: '0.875rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>{selectedResult.api.length} endpoints</p>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OmtraceConsole;
