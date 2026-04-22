import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Stack,
    Alert,
    CircularProgress,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Grid,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Divider,
    Badge
} from '@mui/material';
import { 
    IconFileAnalytics, 
    IconCheck, 
    IconAlertTriangle,
    IconBug,
    IconInfoCircle,
    IconSearch,
    IconRefresh,
    IconDownload,
    IconEye
} from '@tabler/icons-react';

interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'error' | 'warning' | 'info' | 'debug';
    message: string;
    source: string;
    details?: string;
}

interface LogAnalysis {
    totalEntries: number;
    errorCount: number;
    warningCount: number;
    topErrors: string[];
    recommendations: string[];
    anomalies: string[];
}

const AILogAnalysis: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [logSource, setLogSource] = useState<string>('');
    const [timeRange, setTimeRange] = useState<string>('24h');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [analysis, setAnalysis] = useState<LogAnalysis | null>(null);
    const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);

    const logSources = [
        { value: 'application', label: 'Application Logs' },
        { value: 'database', label: 'Database Logs' },
        { value: 'web-server', label: 'Web Server Logs' },
        { value: 'system', label: 'System Logs' },
        { value: 'security', label: 'Security Logs' },
        { value: 'all', label: 'All Sources' }
    ];

    const timeRanges = [
        { value: '1h', label: 'Last Hour' },
        { value: '24h', label: 'Last 24 Hours' },
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' }
    ];

    const sampleLogs: LogEntry[] = [
        {
            id: '1',
            timestamp: new Date(Date.now() - 1000 * 60 * 5),
            level: 'error',
            message: 'Database connection timeout in routerMenuDal.js',
            source: 'application',
            details: 'Connection pool exhausted after 30 seconds'
        },
        {
            id: '2',
            timestamp: new Date(Date.now() - 1000 * 60 * 15),
            level: 'warning',
            message: 'High memory usage detected',
            source: 'system',
            details: 'Memory usage: 85% of available RAM'
        },
        {
            id: '3',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            level: 'info',
            message: 'User authentication successful',
            source: 'security',
            details: 'Super admin user logged in from 192.168.1.100'
        },
        {
            id: '4',
            timestamp: new Date(Date.now() - 1000 * 60 * 45),
            level: 'error',
            message: 'Failed to load Router Menu Studio components',
            source: 'application',
            details: 'Import resolution failed for ./AIContentGenerator'
        }
    ];

    const handleAnalyze = async () => {
        setIsAnalyzing(true);

        try {
            // Simulate AI log analysis
            await new Promise(resolve => setTimeout(resolve, 3000));

            const analysisResult: LogAnalysis = {
                totalEntries: 1247,
                errorCount: 23,
                warningCount: 67,
                topErrors: [
                    'Database connection timeout (8 occurrences)',
                    'Import resolution failed (5 occurrences)',
                    'Authentication token expired (3 occurrences)',
                    'Memory allocation failed (2 occurrences)'
                ],
                recommendations: [
                    'Increase database connection pool size to handle peak loads',
                    'Fix import path issues in Router Menu Studio components',
                    'Implement automatic token refresh mechanism',
                    'Add memory monitoring and cleanup routines',
                    'Set up proactive alerting for critical errors'
                ],
                anomalies: [
                    'Unusual spike in database queries at 2:30 AM',
                    'Multiple failed login attempts from same IP',
                    'Memory usage pattern deviates from normal baseline',
                    'Increase in 404 errors for static assets'
                ]
            };

            setAnalysis(analysisResult);
            setRecentLogs(sampleLogs);
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getLogLevelIcon = (level: string) => {
        switch (level) {
            case 'error':
                return <IconBug size={16} color="red" />;
            case 'warning':
                return <IconAlertTriangle size={16} color="orange" />;
            case 'info':
                return <IconInfoCircle size={16} color="blue" />;
            default:
                return <IconInfoCircle size={16} />;
        }
    };

    const getLogLevelColor = (level: string) => {
        switch (level) {
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'default';
        }
    };

    return (
        <Box>
            <Card>
                <CardContent>
                    <Stack spacing={3}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconFileAnalytics size={24} />
                            <Typography variant="h6">
                                AI Log Analysis
                            </Typography>
                        </Box>

                        <Alert severity="info" icon={<IconEye />}>
                            AI-powered log analysis for Orthodox Metrics. Automatically detects patterns, anomalies, 
                            and provides actionable recommendations for system optimization.
                        </Alert>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Log Source</InputLabel>
                                    <Select
                                        value={logSource}
                                        label="Log Source"
                                        onChange={(e) => setLogSource(e.target.value)}
                                    >
                                        {logSources.map((source) => (
                                            <MenuItem key={source.value} value={source.value}>
                                                {source.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Time Range</InputLabel>
                                    <Select
                                        value={timeRange}
                                        label="Time Range"
                                        onChange={(e) => setTimeRange(e.target.value)}
                                    >
                                        {timeRanges.map((range) => (
                                            <MenuItem key={range.value} value={range.value}>
                                                {range.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Search Query"
                                    placeholder="Filter by keyword..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    InputProps={{
                                        startAdornment: <IconSearch size={20} />
                                    }}
                                />
                            </Grid>
                        </Grid>

                        <Box display="flex" gap={2}>
                            <Button
                                variant="contained"
                                onClick={handleAnalyze}
                                disabled={!logSource || isAnalyzing}
                                startIcon={isAnalyzing ? <CircularProgress size={16} /> : <IconFileAnalytics />}
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Start AI Analysis'}
                            </Button>
                            
                            <Button
                                variant="outlined"
                                startIcon={<IconRefresh />}
                                disabled={isAnalyzing}
                            >
                                Refresh Logs
                            </Button>
                            
                            <Button
                                variant="outlined"
                                startIcon={<IconDownload />}
                                disabled={isAnalyzing || !analysis}
                            >
                                Export Report
                            </Button>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {analysis && (
                <Box mt={3}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Analysis Summary
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="h4" color="primary">
                                                    {analysis.totalEntries.toLocaleString()}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Total Entries
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="h4" color="error">
                                                    {analysis.errorCount}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Errors
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="h4" color="warning.main">
                                                    {analysis.warningCount}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Warnings
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="h4" color="info.main">
                                                    {analysis.anomalies.length}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Anomalies
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Top Errors
                                    </Typography>
                                    <List dense>
                                        {analysis.topErrors.map((error, index) => (
                                            <ListItem key={index}>
                                                <ListItemIcon>
                                                    <Badge badgeContent={index + 1} color="error">
                                                        <IconBug size={20} />
                                                    </Badge>
                                                </ListItemIcon>
                                                <ListItemText primary={error} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        AI Recommendations
                                    </Typography>
                                    <List>
                                        {analysis.recommendations.map((recommendation, index) => (
                                            <ListItem key={index}>
                                                <ListItemIcon>
                                                    <IconCheck size={20} color="green" />
                                                </ListItemIcon>
                                                <ListItemText primary={recommendation} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {recentLogs.length > 0 && (
                <Box mt={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Recent Log Entries
                            </Typography>
                            <List>
                                {recentLogs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <ListItem alignItems="flex-start">
                                            <ListItemIcon>
                                                {getLogLevelIcon(log.level)}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Typography variant="body1">
                                                            {log.message}
                                                        </Typography>
                                                        <Chip 
                                                            label={log.level} 
                                                            size="small" 
                                                            color={getLogLevelColor(log.level)}
                                                        />
                                                        <Chip 
                                                            label={log.source} 
                                                            size="small" 
                                                            variant="outlined"
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {log.timestamp.toLocaleString()}
                                                        </Typography>
                                                        {log.details && (
                                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                                {log.details}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        <Divider />
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Box>
            )}
        </Box>
    );
};

export default AILogAnalysis;
