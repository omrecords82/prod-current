/**
 * OMAI-Spin Admin Settings Component
 * Web interface for environment mirroring operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, FormControlLabel, Switch, Alert, LinearProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, IconButton, Tooltip, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails,
    List, ListItem, ListItemText, ListItemIcon, Pagination, FormControl, InputLabel,
    Select, MenuItem, CircularProgress, Snackbar, Badge, Divider
} from '@mui/material';
import {
    PlayArrow as StartIcon, Stop as StopIcon, Refresh as RefreshIcon,
    History as HistoryIcon, Settings as SettingsIcon, Visibility as ViewIcon,
    ExpandMore as ExpandMoreIcon, Computer as ServerIcon, Storage as DatabaseIcon,
    FileCopy as FilesIcon, Security as SecurityIcon, CheckCircle as SuccessIcon,
    Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/utils/axiosInstance';

interface OmaiSpinStats {
    total_sessions: number;
    completed_sessions: number;
    failed_sessions: number;
    active_sessions: number;
    avg_duration: number;
    total_files_copied: number;
    last_operation: string;
}

interface ActiveOperation {
    sessionId: string;
    status: string;
    progress: number;
    startTime: string;
    currentStep: string;
}

interface SpinSession {
    id: number;
    session_uuid: string;
    timestamp: string;
    src_path: string;
    dest_path: string;
    triggered_by: string;
    status: string;
    total_files_copied: number;
    total_files_excluded: number;
    total_files_modified: number;
    databases_migrated: string[];
    duration_seconds: number;
    error_message?: string;
}

const OmaiSpinSettings: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    
    // Dashboard data
    const [stats, setStats] = useState<OmaiSpinStats | null>(null);
    const [recentSessions, setRecentSessions] = useState<SpinSession[]>([]);
    const [activeOperations, setActiveOperations] = useState<ActiveOperation[]>([]);
    
    // Operation state
    const [showStartDialog, setShowStartDialog] = useState(false);
    const [operationConfig, setOperationConfig] = useState({
        prodPath: '/var/www/orthodoxmetrics/prod',
        devPath: '/var/www/orthodmetrics/dev',
        dryRun: false,
        skipDatabase: false,
        skipFiles: false,
        force: false
    });
    
    // History and logs
    const [sessionHistory, setSessionHistory] = useState<SpinSession[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [sessionLogs, setSessionLogs] = useState<any[]>([]);
    
    // UI state
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'warning' | 'info' });
    const [refreshing, setRefreshing] = useState(false);
    
    // Real-time updates
    const [eventSource, setEventSource] = useState<EventSource | null>(null);

    // Load dashboard data
    const loadDashboard = useCallback(async () => {
        try {
            setRefreshing(true);
            const response = await apiClient.get('/api/admin/omai-spin/dashboard');
            
            if (response.data.success) {
                const { recentSessions, statistics, activeOperations } = response.data.data;
                setStats(statistics);
                setRecentSessions(recentSessions);
                setActiveOperations(activeOperations);
            }
        } catch (error) {
            console.error('Error loading OMAI-Spin dashboard:', error);
            setSnackbar({
                open: true,
                message: 'Failed to load dashboard data',
                severity: 'error'
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Load session history
    const loadSessionHistory = useCallback(async (page = 1) => {
        try {
            const response = await apiClient.get(`/api/admin/omai-spin/history?page=${page}&limit=10`);
            
            if (response.data.success) {
                const { sessions, pagination } = response.data.data;
                setSessionHistory(sessions);
                setHistoryTotal(pagination.totalSessions);
                setHistoryPage(page);
            }
        } catch (error) {
            console.error('Error loading session history:', error);
        }
    }, []);

    // Setup real-time updates
    useEffect(() => {
        const es = new EventSource('/api/admin/omai-spin/live-updates');
        
        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'operationUpdate':
                        // Update active operations
                        setActiveOperations(prev => 
                            prev.map(op => 
                                op.sessionId === data.data.operationId 
                                    ? { ...op, ...data.data } 
                                    : op
                            )
                        );
                        break;
                    
                    case 'operationComplete':
                    case 'operationError':
                        // Refresh dashboard when operation completes
                        loadDashboard();
                        if (activeTab === 1) {
                            loadSessionHistory(historyPage);
                        }
                        break;
                }
            } catch (error) {
                console.error('Error processing SSE event:', error);
            }
        };

        es.onerror = (error) => {
            console.error('SSE connection error:', error);
        };

        setEventSource(es);

        return () => {
            es.close();
        };
    }, [loadDashboard, loadSessionHistory, activeTab, historyPage]);

    // Initialize
    useEffect(() => {
        loadDashboard();
        loadSessionHistory();
    }, [loadDashboard, loadSessionHistory]);

    // Start operation
    const handleStartOperation = async () => {
        try {
            const response = await apiClient.post('/api/admin/omai-spin/start', operationConfig);
            
            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: 'OMAI-Spin operation started successfully',
                    severity: 'success'
                });
                setShowStartDialog(false);
                loadDashboard();
            }
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.response?.data?.error || 'Failed to start operation',
                severity: 'error'
            });
        }
    };

    // Cancel operation
    const handleCancelOperation = async (operationId: string) => {
        try {
            await apiClient.delete(`/api/admin/omai-spin/operation/${operationId}`);
            setSnackbar({
                open: true,
                message: 'Operation cancelled',
                severity: 'info'
            });
            loadDashboard();
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Failed to cancel operation',
                severity: 'error'
            });
        }
    };

    // View session logs
    const handleViewLogs = async (sessionId: string) => {
        try {
            const response = await apiClient.get(`/api/admin/omai-spin/session/${sessionId}/logs`);
            if (response.data.success) {
                setSessionLogs(response.data.data.logs);
                setSelectedSession(sessionId);
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Failed to load session logs',
                severity: 'error'
            });
        }
    };

    // Get status color and icon
    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'completed':
                return { color: 'success', icon: <SuccessIcon />, label: 'Completed' };
            case 'failed':
                return { color: 'error', icon: <ErrorIcon />, label: 'Failed' };
            case 'in_progress':
            case 'running':
                return { color: 'primary', icon: <CircularProgress size={16} />, label: 'Running' };
            case 'cancelled':
                return { color: 'warning', icon: <WarningIcon />, label: 'Cancelled' };
            default:
                return { color: 'default', icon: <InfoIcon />, label: status };
        }
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        OMAI-Spin Environment Mirroring
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Safely replicate production environments for development use
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<StartIcon />}
                        onClick={() => setShowStartDialog(true)}
                        disabled={activeOperations.length > 0}
                    >
                        Start New Operation
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadDashboard}
                        disabled={refreshing}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {/* Active Operations Alert */}
            {activeOperations.length > 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="h6">Active Operations</Typography>
                    {activeOperations.map((operation) => (
                        <Box key={operation.sessionId} mt={1}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2">
                                    {operation.currentStep} - {operation.progress}%
                                </Typography>
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={() => handleCancelOperation(operation.sessionId)}
                                >
                                    Cancel
                                </Button>
                            </Box>
                            <LinearProgress 
                                variant="determinate" 
                                value={operation.progress} 
                                sx={{ mt: 1 }}
                            />
                        </Box>
                    ))}
                </Alert>
            )}

            {/* Statistics Cards */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <ServerIcon color="primary" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {stats?.total_sessions || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Total Sessions
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <SuccessIcon color="success" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {stats?.completed_sessions || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Completed
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <FilesIcon color="info" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {stats?.total_files_copied || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Files Copied
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <DatabaseIcon color="warning" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {formatDuration(stats?.avg_duration || 0)}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Avg Duration
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="Recent Sessions" />
                    <Tab label="Session History" />
                </Tabs>
            </Box>

            {/* Recent Sessions Tab */}
            {activeTab === 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Recent Sessions
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Started</TableCell>
                                        <TableCell>Triggered By</TableCell>
                                        <TableCell>Duration</TableCell>
                                        <TableCell>Files</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recentSessions.map((session) => {
                                        const statusDisplay = getStatusDisplay(session.status);
                                        return (
                                            <TableRow key={session.id}>
                                                <TableCell>
                                                    <Chip
                                                        icon={statusDisplay.icon}
                                                        label={statusDisplay.label}
                                                        color={statusDisplay.color as any}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(session.timestamp).toLocaleString()}
                                                </TableCell>
                                                <TableCell>{session.triggered_by}</TableCell>
                                                <TableCell>
                                                    {formatDuration(session.duration_seconds)}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {session.total_files_copied} copied, {session.total_files_modified} modified
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title="View Logs">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewLogs(session.id.toString())}
                                                        >
                                                            <ViewIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Session History Tab */}
            {activeTab === 1 && (
                <Card>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">
                                Session History
                            </Typography>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => loadSessionHistory(historyPage)}
                            >
                                Refresh
                            </Button>
                        </Box>
                        
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Session ID</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Paths</TableCell>
                                        <TableCell>Started</TableCell>
                                        <TableCell>Duration</TableCell>
                                        <TableCell>Statistics</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sessionHistory.map((session) => {
                                        const statusDisplay = getStatusDisplay(session.status);
                                        return (
                                            <TableRow key={session.id}>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace">
                                                        {session.session_uuid.substring(0, 8)}...
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        icon={statusDisplay.icon}
                                                        label={statusDisplay.label}
                                                        color={statusDisplay.color as any}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {session.src_path} → {session.dest_path}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(session.timestamp).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDuration(session.duration_seconds)}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        📁 {session.total_files_copied} copied<br/>
                                                        🗄️ {session.databases_migrated?.length || 0} DBs
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title="View Logs">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewLogs(session.id.toString())}
                                                        >
                                                            <ViewIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        
                        <Box display="flex" justifyContent="center" mt={2}>
                            <Pagination
                                count={Math.ceil(historyTotal / 10)}
                                page={historyPage}
                                onChange={(e, page) => loadSessionHistory(page)}
                            />
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Start Operation Dialog */}
            <Dialog open={showStartDialog} onClose={() => setShowStartDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Start New OMAI-Spin Operation</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Production Path"
                                value={operationConfig.prodPath}
                                onChange={(e) => setOperationConfig(prev => ({ ...prev, prodPath: e.target.value }))}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Development Path"
                                value={operationConfig.devPath}
                                onChange={(e) => setOperationConfig(prev => ({ ...prev, devPath: e.target.value }))}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={operationConfig.dryRun}
                                        onChange={(e) => setOperationConfig(prev => ({ ...prev, dryRun: e.target.checked }))}
                                    />
                                }
                                label="Dry Run (Preview only)"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={operationConfig.skipDatabase}
                                        onChange={(e) => setOperationConfig(prev => ({ ...prev, skipDatabase: e.target.checked }))}
                                    />
                                }
                                label="Skip Database"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={operationConfig.skipFiles}
                                        onChange={(e) => setOperationConfig(prev => ({ ...prev, skipFiles: e.target.checked }))}
                                    />
                                }
                                label="Skip Files"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={operationConfig.force}
                                        onChange={(e) => setOperationConfig(prev => ({ ...prev, force: e.target.checked }))}
                                    />
                                }
                                label="Force (Skip confirmations)"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowStartDialog(false)}>Cancel</Button>
                    <Button onClick={handleStartOperation} variant="contained">
                        Start Operation
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Session Logs Dialog */}
            <Dialog 
                open={!!selectedSession} 
                onClose={() => setSelectedSession(null)} 
                maxWidth="lg" 
                fullWidth
            >
                <DialogTitle>Session Logs</DialogTitle>
                <DialogContent>
                    <Box sx={{ maxHeight: '600px', overflow: 'auto' }}>
                        {sessionLogs.map((log, index) => (
                            <Box
                                key={index}
                                sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    mb: 1,
                                    p: 1,
                                    backgroundColor: log.log_level === 'error' ? 'error.light' : 
                                                   log.log_level === 'warn' ? 'warning.light' : 'background.paper',
                                    borderRadius: 1
                                }}
                            >
                                <Typography variant="caption" color="textSecondary">
                                    [{new Date(log.timestamp).toLocaleTimeString()}] [{log.log_level}] [{log.component}]
                                </Typography>
                                <Typography variant="body2" component="div">
                                    {log.message}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedSession(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert 
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default OmaiSpinSettings;