// src/components/admin/ScriptRunner.tsx
// Secure Script Runner component for Orthodox Metrics
// Allows super_admin and admin users to execute pre-approved server scripts

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Divider,
  Grid
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Terminal as TerminalIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

interface Script {
  id: string;
  name: string;
  description: string;
  timeout: number;
}

interface ExecutionResult {
  success: boolean;
  message?: string;
  scriptName?: string;
  executionTime?: string;
  stdout?: string;
  stderr?: string;
  hasOutput?: boolean;
  error?: string;
  code?: string;
}

interface ExecutionLog {
  timestamp: string;
  userEmail: string;
  scriptName: string;
  status: string;
  rawLine: string;
}

const ScriptRunner: React.FC = () => {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState<boolean>(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Check if user has permission to run scripts
  const hasPermission = user?.role === 'super_admin' || user?.role === 'admin';

  // Load available scripts
  const loadScripts = async () => {
    if (!hasPermission) return;
    
    setIsLoadingScripts(true);
    setError('');
    
    try {
      const data = await apiClient.get<any>('/scripts');

      if (data.success) {
        setScripts(data.scripts || []);
        console.log('📋 Loaded scripts:', data.scripts);
      } else {
        throw new Error(data.error || 'Failed to load scripts');
      }
    } catch (err) {
      console.error('❌ Failed to load scripts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scripts');
    } finally {
      setIsLoadingScripts(false);
    }
  };

  // Load execution logs (super_admin only)
  const loadLogs = async () => {
    if (user?.role !== 'super_admin') return;
    
    setIsLoadingLogs(true);
    
    try {
      const data = await apiClient.get<any>('/script-logs?limit=20');

      if (data.success) {
        setLogs(data.logs || []);
        console.log('📜 Loaded execution logs:', data.logs);
      }
    } catch (err) {
      console.error('❌ Failed to load logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Execute selected script
  const executeScript = async () => {
    if (!selectedScript || !hasPermission) return;

    setIsExecuting(true);
    setResult(null);
    setError('');

    const selectedScriptData = scripts.find(s => s.id === selectedScript);
    
    try {
      console.log(`🚀 Executing script: ${selectedScript}`);
      
      const data = await apiClient.post<any>('/run-script', {
        scriptName: selectedScript,
        args: []
      });

      setResult(data);
      console.log('✅ Script execution completed:', data);
      
      // Refresh logs after execution
      if (user?.role === 'super_admin') {
        setTimeout(loadLogs, 1000);
      }
      
    } catch (err) {
      console.error('❌ Script execution failed:', err);
      setError(err instanceof Error ? err.message : 'Script execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  // Format execution time
  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  // Get timeout display
  const getTimeoutDisplay = (timeout: number) => {
    return `${timeout / 1000}s`;
  };

  useEffect(() => {
    loadScripts();
    if (user?.role === 'super_admin') {
      loadLogs();
    }
  }, [hasPermission, user?.role]);

  if (!hasPermission) {
    return (
      <Paper elevation={2} sx={{ p: 3, m: 2 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          <Typography variant="h6">Access Denied</Typography>
          <Typography>
            You need super_admin or admin role to access the Script Runner.
            Current role: {user?.role || 'none'}
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3, m: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <TerminalIcon sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Script Runner
        </Typography>
        <Chip 
          label={user?.role} 
          color="primary" 
          size="small" 
          sx={{ ml: 2 }} 
        />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Refresh Scripts">
          <IconButton onClick={loadScripts} disabled={isLoadingScripts}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Execute pre-approved server scripts safely. Only whitelisted scripts can be run.
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Script Selection */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="script-select-label">Select Script</InputLabel>
            <Select
              labelId="script-select-label"
              value={selectedScript}
              label="Select Script"
              onChange={(e) => setSelectedScript(e.target.value)}
              disabled={isLoadingScripts || isExecuting}
            >
              {scripts.map((script) => (
                <MenuItem key={script.id} value={script.id}>
                  <Box>
                    <Typography variant="body1">{script.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {script.description} • Timeout: {getTimeoutDisplay(script.timeout)}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Execute Button */}
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={isExecuting ? <CircularProgress size={20} /> : <PlayIcon />}
            onClick={executeScript}
            disabled={!selectedScript || isExecuting || isLoadingScripts}
            sx={{ mb: 3 }}
          >
            {isExecuting ? 'Executing...' : 'Run Script'}
          </Button>

          {/* Selected Script Info */}
          {selectedScript && !isExecuting && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Ready to execute: <strong>{scripts.find(s => s.id === selectedScript)?.name}</strong>
              </Typography>
            </Alert>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Available Scripts Summary */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Available Scripts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isLoadingScripts ? 'Loading...' : `${scripts.length} scripts available`}
            </Typography>
            {scripts.map((script) => (
              <Chip
                key={script.id}
                label={script.name}
                size="small"
                variant={selectedScript === script.id ? "filled" : "outlined"}
                sx={{ mr: 1, mt: 1 }}
                onClick={() => setSelectedScript(script.id)}
              />
            ))}
          </Paper>
        </Grid>
      </Grid>

      {/* Execution Result */}
      {result && (
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {result.success ? (
                <SuccessIcon color="success" sx={{ mr: 1 }} />
              ) : (
                <ErrorIcon color="error" sx={{ mr: 1 }} />
              )}
              <Typography variant="h6">
                Execution Result: {result.success ? 'Success' : 'Failed'}
              </Typography>
              {result.executionTime && (
                <Chip 
                  icon={<TimeIcon />}
                  label={formatTime(result.executionTime)}
                  size="small" 
                  sx={{ ml: 2 }} 
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {result.message && (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {result.message}
              </Typography>
            )}
            
            {result.stdout && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Output:
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'grey.50',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {result.stdout}
                  </pre>
                </Paper>
              </Box>
            )}

            {result.stderr && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="error">
                  Error Output:
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'error.light',
                    color: 'error.contrastText',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {result.stderr}
                  </pre>
                </Paper>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Execution Logs (Super Admin Only) */}
      {user?.role === 'super_admin' && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Execution History
              </Typography>
              <Chip 
                label={`${logs.length} entries`} 
                size="small" 
                sx={{ ml: 2 }} 
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {isLoadingLogs ? (
              <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography>Loading execution history...</Typography>
              </Box>
            ) : logs.length > 0 ? (
              <Box>
                {logs.map((log, index) => (
                  <Box key={index} sx={{ mb: 1, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
                      {log.rawLine}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">
                No execution history found
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Security Notice */}
      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Security Notice:</strong> Only pre-approved scripts can be executed. 
          All executions are logged for audit purposes. Use responsibly.
        </Typography>
      </Alert>
    </Paper>
  );
};

export default ScriptRunner;
