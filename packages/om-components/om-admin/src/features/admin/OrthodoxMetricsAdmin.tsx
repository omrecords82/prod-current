// Orthodox Metrics - Multi-Tenant Admin Dashboard
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    LinearProgress,
    Menu,
    MenuItem,
    Paper,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography
} from '@mui/material';
import {
    IconActivity,
    IconAlertTriangle,
    IconBuildingChurch,
    IconCalendar,
    IconChartBar,
    IconCheck,
    IconCross,
    IconDatabase,
    IconDownload,
    IconEye,
    IconHeart,
    IconInfoCircle,
    IconPlus,
    IconRefresh,
    IconServer,
    IconSettings,
    IconShield,
    IconUsers,
    IconX
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '@/api/admin.api';
import { devLogDataShape } from '@/utils/devLogger';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`admin-tabpanel-${index}`}
            aria-labelledby={`admin-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

// Orthodox Metrics Admin Dashboard Component
const OrthodoxMetricsAdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState(0);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showClientDialog, setShowClientDialog] = useState(false);
    const [showBackupDialog, setShowBackupDialog] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [actionClientId, setActionClientId] = useState<string>('');

    const queryClient = useQueryClient();

    // Data Queries
    const { data: clients = [], isLoading: clientsLoading, refetch: refetchClients } = useQuery({
        queryKey: ['admin-clients'],
        queryFn: adminAPI.clients.getAll,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const { data: systemStats, isLoading: systemStatsLoading } = useQuery({
        queryKey: ['admin-system-stats'],
        queryFn: adminAPI.system.getSystemStats,
        refetchInterval: 15000, // Refresh every 15 seconds
    });

    const { data: databaseHealth, isLoading: dbHealthLoading } = useQuery({
        queryKey: ['admin-database-health'],
        queryFn: adminAPI.system.getDatabaseHealth,
        refetchInterval: 20000, // Refresh every 20 seconds
    });

    const { data: serverMetrics, isLoading: serverMetricsLoading } = useQuery({
        queryKey: ['admin-server-metrics'],
        queryFn: adminAPI.system.getServerMetrics,
        refetchInterval: 10000, // Refresh every 10 seconds
    });

    const { data: backups = [], isLoading: backupsLoading } = useQuery({
        queryKey: ['admin-backups'],
        queryFn: adminAPI.system.getBackups,
        refetchInterval: 60000, // Refresh every minute
    });

    // SaaS Metrics Query
    const { data: saasMetrics = [], isLoading: saasMetricsLoading, error: saasMetricsError } = useQuery({
        queryKey: ['admin-saas-metrics'],
        queryFn: adminAPI.metrics.getOrthodoxMetrics,
        refetchInterval: 30000, // Refresh every 30 seconds
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    // Development logging for SaaS metrics data
    useEffect(() => {
        devLogDataShape(
            saasMetrics,
            'SaaS Metrics Data',
            {
                expectedType: 'array',
                componentName: 'OrthodoxMetricsAdmin',
                operation: 'SaaS metrics rendering',
                required: true
            }
        );
    }, [saasMetrics]);

    // Mutations
    const updateStatusMutation = useMutation({
        mutationFn: ({ clientId, status }: { clientId: string; status: string }) =>
            adminAPI.clients.update(Number(clientId), { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
            setAnchorEl(null);
        },
    });

    const testConnectionMutation = useMutation({
        mutationFn: (clientId: string) => adminAPI.clients.testConnection(Number(clientId)),
    });

    const createBackupMutation = useMutation({
        mutationFn: adminAPI.backup.run,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
            setShowBackupDialog(false);
        },
    });

    // Event Handlers
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleClientAction = (event: React.MouseEvent<HTMLElement>, clientId: string) => {
        setAnchorEl(event.currentTarget);
        setActionClientId(clientId);
    };

    const handleStatusUpdate = (status: string) => {
        updateStatusMutation.mutate({ clientId: actionClientId, status });
    };

    const handleTestConnection = async (clientId: string) => {
        try {
            const result = await testConnectionMutation.mutateAsync(clientId);
            // Show result in a toast or alert
            console.log('Connection test result:', result);
        } catch (error) {
            console.error('Connection test failed:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'error';
            case 'maintenance': return 'warning';
            default: return 'default';
        }
    };

    const getHealthScore = (metrics: any) => {
        if (!metrics) return 0;
        const factors = [
            metrics.cpuUsage < 80 ? 25 : 0,
            metrics.memoryUsage < 85 ? 25 : 0,
            metrics.diskUsage < 90 ? 25 : 0,
            metrics.uptime > 24 ? 25 : 15,
        ];
        return factors.reduce((sum, score) => sum + score, 0);
    };

    // Calculate aggregate statistics
    const totalClients = clients.length;
    const activeClients = clients.filter((c: any) => c.status === 'active').length;
    const totalRecords = clients.reduce((sum: number, client: any) => {
        return sum + (client.totalRecords || 0);
    }, 0);

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    🏛️ Orthodox Metrics Admin Dashboard
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                    Multi-Tenant Church Management System Administration
                </Typography>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={currentTab} onChange={handleTabChange} aria-label="admin dashboard tabs">
                    <Tab icon={<IconBuildingChurch />} label="Client Sites" />
                    <Tab icon={<IconChartBar />} label="SaaS Metrics" />
                    <Tab icon={<IconActivity />} label="System Health" />
                    <Tab icon={<IconDatabase />} label="Database Monitor" />
                    <Tab icon={<IconServer />} label="Server Metrics" />
                    <Tab icon={<IconDownload />} label="Backup Manager" />
                    <Tab icon={<IconSettings />} label="System Settings" />
                </Tabs>
            </Box>

            {/* Tab Panels */}

            {/* Client Sites Management */}
            <TabPanel value={currentTab} index={0}>
                <Grid container spacing={3}>
                    {/* Overview Cards */}
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <IconBuildingChurch size={24} />
                                    <Typography variant="h6" sx={{ ml: 1 }}>Total Clients</Typography>
                                </Box>
                                <Typography variant="h3" color="primary">{totalClients}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {activeClients} active sites
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <IconUsers size={24} />
                                    <Typography variant="h6" sx={{ ml: 1 }}>Active Users</Typography>
                                </Box>
                                <Typography variant="h3" color="success.main">
                                    {systemStats?.activeUsers || 0}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    across all sites
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <IconChartBar size={24} />
                                    <Typography variant="h6" sx={{ ml: 1 }}>Total Records</Typography>
                                </Box>
                                <Typography variant="h3" color="info.main">{totalRecords}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    church records managed
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <IconShield size={24} />
                                    <Typography variant="h6" sx={{ ml: 1 }}>System Health</Typography>
                                </Box>
                                <Typography variant="h3" color="warning.main">
                                    {getHealthScore(serverMetrics)}%
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    overall health score
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Client Sites Table */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">Client Sites</Typography>
                                    <Box>
                                        <Button
                                            variant="outlined"
                                            startIcon={<IconRefresh />}
                                            onClick={() => refetchClients()}
                                            sx={{ mr: 2 }}
                                        >
                                            Refresh
                                        </Button>
                                        <Button
                                            variant="contained"
                                            startIcon={<IconPlus />}
                                            href="/apps/church-management/wizard"
                                        >
                                            Add New Client
                                        </Button>
                                    </Box>
                                </Box>

                                <TableContainer component={Paper} variant="outlined">
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Church Name</TableCell>
                                                <TableCell>Slug</TableCell>
                                                <TableCell>Contact</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Records</TableCell>
                                                <TableCell>Database</TableCell>
                                                <TableCell>Created</TableCell>
                                                <TableCell>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {clientsLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} align="center">
                                                        <CircularProgress />
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                clients.map((client: any) => (
                                                    <TableRow key={client.id}>
                                                        <TableCell>
                                                            <Typography variant="subtitle2">{client.name}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={client.slug} size="small" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell>{client.contact_email}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={client.status}
                                                                size="small"
                                                                color={getStatusColor(client.status) as any}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box>
                                                                <Typography variant="body2">
                                                                    <IconHeart size={16} style={{ marginRight: 4 }} />
                                                                    {client.baptisms || 0}
                                                                </Typography>
                                                                <Typography variant="body2">
                                                                    <IconCalendar size={16} style={{ marginRight: 4 }} />
                                                                    {client.marriages || 0}
                                                                </Typography>
                                                                <Typography variant="body2">
                                                                    <IconCross size={16} style={{ marginRight: 4 }} />
                                                                    {client.funerals || 0}
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Tooltip title={client.database_name}>
                                                                <Chip
                                                                    icon={<IconDatabase size={16} />}
                                                                    label="Connected"
                                                                    size="small"
                                                                    color="success"
                                                                    variant="outlined"
                                                                />
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">
                                                                {format(new Date(client.created_at), 'MMM dd, yyyy')}
                                                            </Typography>
                                                            <Typography variant="caption" color="textSecondary">
                                                                {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
                                                            </Typography>
                                                        </TableCell>                                        <TableCell>
                                            <Tooltip title="Church Admin Panel">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => navigate(`/admin/church/${client.id}`)}
                                                    color="primary"
                                                >
                                                    <IconBuildingChurch />
                                                </IconButton>
                                            </Tooltip>
                                                            <Tooltip title="Settings">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => handleClientAction(e, client.id)}
                                                                >
                                                                    <IconSettings />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Test Connection">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleTestConnection(client.id)}
                                                                >
                                                                    <IconDatabase />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="View Site">
                                                                <IconButton
                                                                    size="small"
                                                                    href={`/client/${client.slug}`}
                                                                    target="_blank"
                                                                >
                                                                    <IconEye />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* SaaS Metrics */}
            <TabPanel value={currentTab} index={1}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        📊 SaaS Platform Metrics
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Real-time metrics and analytics for the Orthodox Metrics SaaS platform
                    </Typography>
                </Box>

                {/* Loading State */}
                {saasMetricsLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                        <Typography variant="body2" sx={{ ml: 2 }}>
                            Loading SaaS metrics...
                        </Typography>
                    </Box>
                )}

                {/* Error State */}
                {saasMetricsError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        <Typography variant="h6">Failed to load SaaS metrics</Typography>
                        <Typography variant="body2">
                            {saasMetricsError.message || 'An unexpected error occurred while fetching metrics data.'}
                        </Typography>
                    </Alert>
                )}

                {/* No Data State */}
                {!saasMetricsLoading && !saasMetricsError && (!saasMetrics || saasMetrics.length === 0) && (
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 6 }}>
                            <IconInfoCircle size={48} color="#757575" style={{ marginBottom: 16 }} />
                            <Typography variant="h6" gutterBottom>
                                No metrics data available
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                SaaS metrics data is not available at this time. Please try again later.
                            </Typography>
                        </CardContent>
                    </Card>
                )}

                {/* Metrics Data */}
                {!saasMetricsLoading && !saasMetricsError && saasMetrics && saasMetrics.length > 0 && (
                    <Grid container spacing={3}>
                        {/* Summary Cards */}
                        <Grid container item xs={12} spacing={3}>
                            {saasMetrics.slice(0, 4).map((metric, index) => (
                                <Grid container item xs={12} md={3} key={metric.id || index}>
                                    <Card sx={{ width: '100%' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <IconChartBar size={24} color="#2196f3" />
                                                <Typography variant="h6" sx={{ ml: 1 }}>
                                                    {metric.name}
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" color="primary" gutterBottom>
                                                {metric.value}
                                            </Typography>
                                            {metric.description && (
                                                <Typography variant="body2" color="textSecondary">
                                                    {metric.description}
                                                </Typography>
                                            )}
                                            {metric.trend && (
                                                <Box sx={{ mt: 1 }}>
                                                    <Chip
                                                        label={`${metric.trend > 0 ? '+' : ''}${metric.trend}%`}
                                                        color={metric.trend > 0 ? 'success' : 'error'}
                                                        size="small"
                                                    />
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                        {/* Detailed Metrics Table */}
                        <Grid container item xs={12}>
                            <Card sx={{ width: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        📈 Detailed Metrics
                                    </Typography>
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Metric Name</TableCell>
                                                    <TableCell align="right">Value</TableCell>
                                                    <TableCell>Category</TableCell>
                                                    <TableCell>Last Updated</TableCell>
                                                    <TableCell>Status</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {saasMetrics.map((metric, index) => (
                                                    <TableRow key={metric.id || index}>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <IconChartBar size={16} style={{ marginRight: 8 }} />
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight="medium">
                                                                        {metric.name}
                                                                    </Typography>
                                                                    {metric.description && (
                                                                        <Typography variant="caption" color="textSecondary">
                                                                            {metric.description}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {metric.value}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={metric.category || 'General'}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="textSecondary">
                                                                {metric.lastUpdated ? format(new Date(metric.lastUpdated), 'MMM dd, HH:mm') : 'N/A'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={metric.status || 'Active'}
                                                                color={metric.status === 'Active' ? 'success' : 'warning'}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Per-Church Usage Section */}
                        {saasMetrics.some(m => m.churchData) && (
                            <Grid container item xs={12}>
                                <Card sx={{ width: '100%' }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            🏛️ Per-Church Usage Metrics
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {saasMetrics
                                                .filter(m => m.churchData)
                                                .map((metric, index) => (
                                                    <Grid container item xs={12} md={6} lg={4} key={index}>
                                                        <Card variant="outlined" sx={{ width: '100%' }}>
                                                            <CardContent>
                                                                <Typography variant="subtitle2" gutterBottom>
                                                                    {metric.churchData.name}
                                                                </Typography>
                                                                <Typography variant="h6" color="primary">
                                                                    {metric.churchData.usage}
                                                                </Typography>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={metric.churchData.usage}
                                                                    sx={{ mt: 1 }}
                                                                />
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                ))}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                )}
            </TabPanel>

            {/* System Health */}
            <TabPanel value={currentTab} index={2}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>System Health Overview</Typography>
                                {systemStatsLoading ? (
                                    <CircularProgress />
                                ) : (
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="subtitle2" gutterBottom>CPU Usage</Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={serverMetrics?.cpuUsage || 0}
                                                color={serverMetrics?.cpuUsage > 80 ? 'error' : 'primary'}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {serverMetrics?.cpuUsage || 0}%
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="subtitle2" gutterBottom>Memory Usage</Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={serverMetrics?.memoryUsage || 0}
                                                color={serverMetrics?.memoryUsage > 85 ? 'error' : 'primary'}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {serverMetrics?.memoryUsage || 0}%
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Database Monitor */}
            <TabPanel value={currentTab} index={3}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Database Health Monitor</Typography>
                                {dbHealthLoading ? (
                                    <CircularProgress />
                                ) : (
                                    <Alert severity="success" icon={<IconCheck />}>
                                        All client databases are healthy and responding normally.
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Server Metrics */}
            <TabPanel value={currentTab} index={4}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Server Performance Metrics</Typography>
                                {serverMetricsLoading ? (
                                    <CircularProgress />
                                ) : (
                                    <Typography>Server metrics will be displayed here...</Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Backup Manager */}
            <TabPanel value={currentTab} index={5}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">Backup Management</Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<IconDownload />}
                                        onClick={() => setShowBackupDialog(true)}
                                    >
                                        Create Backup
                                    </Button>
                                </Box>
                                <Typography>Backup management interface will be displayed here...</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* System Settings */}
            <TabPanel value={currentTab} index={6}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>System Settings</Typography>
                                <Typography>System configuration settings will be displayed here...</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Action Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem onClick={() => handleStatusUpdate('active')}>
                    <IconCheck size={16} style={{ marginRight: 8 }} />
                    Activate
                </MenuItem>
                <MenuItem onClick={() => handleStatusUpdate('inactive')}>
                    <IconX size={16} style={{ marginRight: 8 }} />
                    Deactivate
                </MenuItem>
                <MenuItem onClick={() => handleStatusUpdate('maintenance')}>
                    <IconAlertTriangle size={16} style={{ marginRight: 8 }} />
                    Maintenance Mode
                </MenuItem>
            </Menu>

            {/* Backup Dialog */}
            <Dialog open={showBackupDialog} onClose={() => setShowBackupDialog(false)}>
                <DialogTitle>Create System Backup</DialogTitle>
                <DialogContent>
                    <Typography>
                        Create a backup of all client databases and system configuration?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowBackupDialog(false)}>Cancel</Button>
                    <Button
                        onClick={() => createBackupMutation.mutate()}
                        variant="contained"
                        disabled={createBackupMutation.isPending}
                    >
                        {createBackupMutation.isPending ? <CircularProgress size={20} /> : 'Create Backup'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OrthodoxMetricsAdminDashboard;
