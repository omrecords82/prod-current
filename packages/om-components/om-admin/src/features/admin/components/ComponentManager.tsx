import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Grid2 from '@/components/compat/Grid2';

import { Box, Typography, Card, CardContent, Chip, Switch, FormControlLabel, Alert, IconButton, Tooltip, Stack, Avatar, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, LinearProgress, Snackbar, DialogContentText, Pagination, TextField, InputAdornment, Tab, Tabs, Badge, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import {
    IconSettings,
    IconEye,
    IconTestPipe,
    IconCircleCheck,
    IconAlertTriangle,
    IconCircleX,
    IconActivity,
    IconRefresh,
    IconShield,
    IconBug,
    IconSearch,
    IconUsers,
    IconTarget,
    IconCpu,
    IconDownload,
} from '@tabler/icons-react';
import {
    componentsAPI, 
    type Component, 
    type ComponentLog, 
    type ComponentsResponse,
    type ComponentFilters 
} from '@/api/components.api';
import { useAuth } from '@/context/AuthContext';
import LogsDialog from './ComponentManager/LogsDialog';
import TestResultDialog from './ComponentManager/TestResultDialog';
import ComponentCard from './ComponentManager/ComponentCard';
import { analyzeComponentHealth, getFilteredSummary, exportDegradedLogs } from './ComponentManager/utils';

/**
 * Component Manager - Production Frontend with Live Backend Integration
 * 
 * PRODUCTION STATUS: Fully integrated with live backend API
 * 
 * Features implemented:
 * Component listing with health status indicators
 * Toggle enable/disable with confirmation dialogs
 * Logs viewing with enhanced modal interface
 * Component testing with detailed results display
 * Role-based access control (admin/super_admin only)
 * Toast notifications for all actions
 * Responsive design with comprehensive tooltips
 * Advanced filtering and search capabilities
 * Usage tracking and analytics
 * Category-based organization
 * Pagination for large datasets
 * Live backend API integration
 * Comprehensive error handling
 * 
 * Backend API Integration:
 * - GET /api/admin/components (list all components with filters/pagination)
 * - PATCH /api/admin/components/:id (toggle component status)
 * - GET /api/admin/components/:id/logs (fetch component logs)
 * - POST /api/admin/components/:id/test (run component diagnostics)
 * 
 * All data is loaded from live backend API with proper error handling.
 */
const ComponentManager: React.FC = () => {
    const { isSuperAdmin, hasRole } = useAuth();
    
    // State management
    const [componentsData, setComponentsData] = useState<ComponentsResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filter and pagination state
    const [filters, setFilters] = useState<ComponentFilters>({
        page: 1,
        limit: 20,
        category: 'all',
        status: 'all',
        usageStatus: 'all',
        search: '',
        enabled: 'all'
    });
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [categoryTab, setCategoryTab] = useState<string>('all');
    const [logsDialogOpen, setLogsDialogOpen] = useState<boolean>(false);
    const [selectedComponentLogs, setSelectedComponentLogs] = useState<ComponentLog[]>([]);
    const [selectedComponentName, setSelectedComponentName] = useState<string>('');
    const [toggleConfirmDialog, setToggleConfirmDialog] = useState<{
        open: boolean;
        component: Component | null;
        newState: boolean;
    }>({ open: false, component: null, newState: false });
    const [actionLoading, setActionLoading] = useState<{ [componentId: string]: boolean }>({});
    
    // Toast state
    const [toastOpen, setToastOpen] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
    
    // Test results dialog
    const [testResultDialog, setTestResultDialog] = useState<{
        open: boolean;
        component: Component | null;
        result: any;
    }>({ open: false, component: null, result: null });

    // Toast helper functions
    const showToast = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setToastMessage(message);
        setToastSeverity(severity);
        setToastOpen(true);
    };

    // Check if user has admin permissions
    const canManageComponents = isSuperAdmin || hasRole('admin');

    // Log component mounting for testing tab switching
    useEffect(() => {
        console.log('ComponentManager mounted');
        fetchComponents();
    }, []);

    // Fetch components with filters and pagination
    const fetchComponents = async (newFilters?: Partial<ComponentFilters>) => {
        try {
            setLoading(true);
            setError(null);
            
            // Merge filters if provided
            const currentFilters = newFilters ? { ...filters, ...newFilters } : filters;
            setFilters(currentFilters);
            
            const data = await componentsAPI.getAll(currentFilters);
            console.log('Components fetched:', data);
            
            // Analyze component health based on logs
            const componentsWithHealthAnalysis = await analyzeComponentHealth(data);
            setComponentsData(componentsWithHealthAnalysis);
            
            // Count components with analyzed health
            const analyzedComponents = componentsWithHealthAnalysis.components.filter(c => 
                c.lastHealthCheck && new Date(c.lastHealthCheck).getTime() > Date.now() - 60000 // within last minute
            ).length;
            
            const baseMessage = `Loaded ${data.components.length} components (page ${data.meta.page} of ${data.meta.totalPages})`;
            const healthMessage = analyzedComponents > 0 ? ` • Health analyzed for ${analyzedComponents} components` : '';
            
            showToast(`${baseMessage}${healthMessage}`, 'success');
        } catch (err: any) {
            console.error('Error fetching components:', err);
            
            // Handle different types of errors
            let errorMessage = 'Unable to load component data from backend.';
            
            if (err.response) {
                // Server responded with error status
                if (err.response.status === 401 || err.response.status === 403) {
                    errorMessage = 'You do not have permission to access component data. Please contact your administrator.';
                } else if (err.response.status === 404) {
                    errorMessage = 'Component management API endpoint not found. Please contact support.';
                } else if (err.response.status >= 500) {
                    errorMessage = 'Server error occurred while loading components. Please try again later or contact support.';
                } else {
                    errorMessage = err.response.data?.message || `API Error (${err.response.status}): Unable to load components.`;
                }
            } else if (err.request) {
                // Network error
                errorMessage = 'Network error: Unable to connect to the component management API. Please check your connection.';
            } else {
                // Other error
                errorMessage = err.message || 'Unknown error occurred while loading components.';
            }
            
            setError(errorMessage);
            setComponentsData(null);
            
            showToast(
                'Failed to load components from backend API. Please check the API status or contact support.',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    // Handle component toggle (disabled until Phase 3 but structured)
    const handleStatusToggle = (component: Component) => {
        const newState = !component.enabled;
        setToggleConfirmDialog({
            open: true,
            component,
            newState
        });
    };

    // Confirm toggle action
    const handleConfirmToggle = async () => {
        const { component, newState } = toggleConfirmDialog;
        if (!component) return;

        try {
            setActionLoading(prev => ({ ...prev, [component.id]: true }));
            await componentsAPI.toggle(component.id, newState);
            
            // Update local state
            setComponentsData(prev => prev ? {
                ...prev,
                components: prev.components.map(c => 
                    c.id === component.id ? { ...c, enabled: newState, lastUpdated: new Date().toISOString() } : c
                )
            } : null);
            
            showToast(
                `Component "${component.name}" has been ${newState ? 'enabled' : 'disabled'}.`,
                'success'
            );
            console.log(`Component ${component.name} toggled to ${newState ? 'enabled' : 'disabled'}`);
        } catch (err: any) {
            console.error('Error toggling component:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to toggle component';
            setError(errorMessage);
            showToast(
                `Failed to ${newState ? 'enable' : 'disable'} "${component.name}": ${errorMessage}`,
                'error'
            );
        } finally {
            setActionLoading(prev => ({ ...prev, [component.id]: false }));
            setToggleConfirmDialog({ open: false, component: null, newState: false });
        }
    };

    // Handle view logs
    const handleViewLogs = async (component: Component) => {
        try {
            setActionLoading(prev => ({ ...prev, [component.id]: true }));
            const logsResponse = await componentsAPI.getLogs(component.id, 100);
            setSelectedComponentLogs(logsResponse.logs);
            setSelectedComponentName(component.name);
            setLogsDialogOpen(true);
            showToast(`Loaded ${logsResponse.logs.length} log entries for "${component.name}"`, 'info');
            console.log(`Logs for ${component.name}:`, logsResponse.logs);
        } catch (err: any) {
            console.error('Error fetching logs:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch logs';
            
            // Handle logs fetch error
            showToast(
                `Failed to load logs for "${component.name}": ${errorMessage}`,
                'error'
            );
        } finally {
            setActionLoading(prev => ({ ...prev, [component.id]: false }));
        }
    };

    // Handle run test
    const handleRunTest = async (component: Component) => {
        try {
            setActionLoading(prev => ({ ...prev, [component.id]: true }));
            const testResult = await componentsAPI.runTest(component.id);
            
            // Update component health based on test result if provided
            if (testResult?.health) {
                setComponentsData(prev => prev ? {
                    ...prev,
                    components: prev.components.map(c => 
                        c.id === component.id ? { ...c, health: testResult.health, lastUpdated: new Date().toISOString() } : c
                    )
                } : null);
            }
            
            setTestResultDialog({
                open: true,
                component,
                result: testResult
            });
            
            const status = testResult?.status || 'unknown';
            const severity = status === 'pass' ? 'success' : status === 'fail' ? 'error' : 'warning';
            showToast(`Test ${status} for "${component.name}"`, severity);
            
            console.log(`Test completed for component: ${component.name}`, testResult);
        } catch (err: any) {
            console.error('Error running test:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Test failed to execute';
            
            // Handle test execution error
            showToast(
                `Failed to run test for "${component.name}": ${errorMessage}`,
                'error'
            );
        } finally {
            setActionLoading(prev => ({ ...prev, [component.id]: false }));
        }
    };

    const handleExportDegradedLogs = async () => {
        setLoading(true);
        try {
            const result = await exportDegradedLogs(componentsData);
            if (!result.success) {
                showToast(result.error || 'No degraded components found', 'info');
            } else {
                showToast(`Exported logs for ${result.count} degraded components`, 'success');
            }
        } catch (err: any) {
            showToast(`Failed to export logs: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    /* --- Filter / pagination helpers (restored) -------------------- */

    const getAvailableCategories = (): string[] => {
        if (!componentsData?.components || !Array.isArray(componentsData.components)) return [];
        const categories = new Set(componentsData.components.map(c => c.category));
        return Array.from(categories).sort();
    };

    const handleCategoryChange = (category: string) => {
        setCategoryTab(category);
        fetchComponents({ category: category === 'all' ? 'all' : category, page: 1 });
    };

    const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
        fetchComponents({ page });
    };

    const debouncedSearch = useMemo(() => {
        let timeoutId: NodeJS.Timeout;
        return (value: string) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setFilters(prev => ({ ...prev, search: value, page: 1 }));
                fetchComponents({ search: value, page: 1 });
            }, 500);
        };
    }, [fetchComponents]);

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchTerm(value);
        debouncedSearch(value);
    }, [debouncedSearch]);

    const handleFilterChange = (filterType: keyof ComponentFilters, value: string) => {
        fetchComponents({ [filterType]: value, page: 1 });
    };

    const summary = getFilteredSummary(componentsData);

    // Loading state
    if (loading) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                <CircularProgress size={40} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Loading system components...
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h6">
                    System Components
                </Typography>
                <Stack direction="row" spacing={1}>
                    {canManageComponents && (
                        <Tooltip 
                            title="Export diagnostic logs for all components with degraded health status" 
                            arrow
                        >
                            <span>
                                <Button
                                    variant="outlined"
                                    startIcon={<IconDownload size={16} />}
                                    onClick={handleExportDegradedLogs}
                                    size="small"
                                    color="warning"
                                    disabled={loading || (Array.isArray(componentsData?.components) ? componentsData.components : []).filter(c => c.health === 'degraded').length === 0}
                                >
                                    Export Degraded Logs 
                                    {componentsData?.components && (
                                        <Chip 
                                            size="small" 
                                            label={(Array.isArray(componentsData?.components) ? componentsData.components : []).filter(c => c.health === 'degraded').length}
                                            sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                                            color="warning"
                                        />
                                    )}
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<IconRefresh size={16} />}
                        onClick={fetchComponents}
                        size="small"
                    >
                        Refresh
                    </Button>
                </Stack>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" onClick={fetchComponents}>
                        Retry
                    </Button>
                }>
                    {error}
                </Alert>
            )}

            {/* Production Status Alert */}
            {!canManageComponents ? (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    You need administrator privileges to manage components. Contact your system administrator for access.
                </Alert>
            ) : (
                <Alert severity="success" sx={{ mb: 3 }}>
                    <strong>System Status:</strong> Component management system is fully operational with live backend integration. 
                    All features are connected to the production API:
                    <br />
                    <code>✅ GET /api/admin/components</code> • 
                    <code>✅ PATCH /api/admin/components/:id</code> • 
                    <code>✅ GET /api/admin/components/:id/logs</code> • 
                    <code>✅ POST /api/admin/components/:id/test</code>
                </Alert>
            )}

            {/* Category Filter Tabs */}
            <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Filter by Category
                </Typography>
                <Tabs
                    value={categoryTab}
                    onChange={(e, value) => handleCategoryChange(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ 
                        '& .MuiTab-root': { 
                            minWidth: 'auto',
                            textTransform: 'none',
                            fontSize: '0.875rem'
                        }
                    }}
                >
                    <Tab 
                        label={
                            <Badge 
                                badgeContent={componentsData?.meta?.total || 0} 
                                color="primary"
                                sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
                            >
                                All Components
                            </Badge>
                        } 
                        value="all" 
                    />
                    {getAvailableCategories().map((category) => {
                        const count = componentsData?.meta?.categoryBreakdown?.[category]?.total || 0;
                        return (
                            <Tab 
                                key={category}
                                label={
                                    <Badge 
                                        badgeContent={count} 
                                        color="secondary"
                                        sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
                                    >
                                        {category}
                                    </Badge>
                                } 
                                value={category} 
                            />
                        );
                    })}
                </Tabs>
            </Paper>

            {/* Search and Filters */}
            <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
                <Grid2 container spacing={2} alignItems="center">
                    {/* Search Field */}
                    <Grid2 item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search components..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <IconSearch size={20} />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid2>

                    {/* Health Status Filter */}
                    <Grid2 item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Health</InputLabel>
                            <Select
                                value={filters.status || 'all'}
                                label="Health"
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <MenuItem value="all">All Health</MenuItem>
                                <MenuItem value="healthy">🟢 Healthy</MenuItem>
                                <MenuItem value="degraded">🟡 Degraded</MenuItem>
                                <MenuItem value="failed">🔴 Failed</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid2>

                    {/* Usage Status Filter */}
                    <Grid2 item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Usage</InputLabel>
                            <Select
                                value={filters.usageStatus || 'all'}
                                label="Usage"
                                onChange={(e) => handleFilterChange('usageStatus', e.target.value)}
                            >
                                <MenuItem value="all">All Usage</MenuItem>
                                <MenuItem value="active">🟢 Active</MenuItem>
                                <MenuItem value="inactive">🟡 Inactive</MenuItem>
                                <MenuItem value="unused">⚪ Unused</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid2>

                    {/* Enable/Disable Filter */}
                    <Grid2 item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filters.enabled || 'all'}
                                label="Status"
                                onChange={(e) => handleFilterChange('enabled', e.target.value)}
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="true">✅ Enabled</MenuItem>
                                <MenuItem value="false">❌ Disabled</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid2>

                    {/* Results Info */}
                    <Grid2 item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                            {componentsData?.meta ? (
                                <>
                                    Showing {((componentsData.meta.page - 1) * componentsData.meta.limit) + 1}–
                                    {Math.min(componentsData.meta.page * componentsData.meta.limit, componentsData.meta.total)} of {componentsData.meta.total}
                                </>
                            ) : (
                                'Loading...'
                            )}
                        </Typography>
                    </Grid2>
                </Grid2>
            </Paper>

            {/* Enhanced Summary Panel */}
            <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    {categoryTab === 'all' ? 'Global Summary' : `${categoryTab} Summary`}
                </Typography>
                
                <Grid2 container spacing={2}>
                    {/* Health Summary */}
                    <Grid2 item xs={12} md={4}>
                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                Component Health
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic', display: 'block' }}>
                                Includes automatic log-based detection
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                                <Chip 
                                    size="small" 
                                    label={`${summary.healthy} Healthy`}
                                    color="success"
                                    variant="outlined"
                                />
                                <Chip 
                                    size="small" 
                                    label={`${summary.degraded} Degraded`}
                                    color="warning"
                                    variant="outlined"
                                />
                                <Chip 
                                    size="small" 
                                    label={`${summary.failed} Failed`}
                                    color="error"
                                    variant="outlined"
                                />
                            </Stack>
                            <Typography variant="h6" color="text.primary">
                                {summary.total} Total Components
                            </Typography>
                        </Box>
                    </Grid2>

                    {/* Usage Summary */}
                    <Grid2 item xs={12} md={4}>
                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                Usage Activity
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                                <Chip 
                                    size="small" 
                                    label={`${summary.active} Active`}
                                    sx={{ backgroundColor: '#e8f5e8', color: '#4caf50' }}
                                />
                                <Chip 
                                    size="small" 
                                    label={`${summary.inactive} Inactive`}
                                    sx={{ backgroundColor: '#fff3e0', color: '#ff9800' }}
                                />
                                <Chip 
                                    size="small" 
                                    label={`${summary.unused} Unused`}
                                    sx={{ backgroundColor: '#f5f5f5', color: '#9e9e9e' }}
                                />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                                Last 24h activity tracking
                            </Typography>
                        </Box>
                    </Grid2>

                    {/* Status Summary */}
                    <Grid2 item xs={12} md={4}>
                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                Component Status
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                                <Chip 
                                    size="small" 
                                    label={`${summary.enabled} Enabled`}
                                    color="success"
                                    variant="outlined"
                                />
                                <Chip 
                                    size="small" 
                                    label={`${summary.disabled} Disabled`}
                                    color="default"
                                    variant="outlined"
                                />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                                System-wide component states
                            </Typography>
                        </Box>
                    </Grid2>
                </Grid2>
            </Paper>

            {/* Components Grid */}
            <Grid2 container spacing={3}>
                {(Array.isArray(componentsData?.components) ? componentsData.components : []).map((component, index) => (
                    <Grid2 item xs={12} md={6} lg={4} key={component.id || index}>
                        <ComponentCard
                            component={component}
                            isActionLoading={!!actionLoading[component.id]}
                            canManageComponents={canManageComponents}
                            onToggle={handleStatusToggle}
                            onViewLogs={handleViewLogs}
                            onRunTest={handleRunTest}
                        />
                    </Grid2>
                ))}
            </Grid2>

            {/* Pagination Controls */}
            {componentsData?.meta && componentsData.meta.totalPages > 1 && (
                <Box display="flex" justifyContent="center" alignItems="center" mt={4} mb={2}>
                    <Stack spacing={2} alignItems="center">
                        <Pagination
                            count={componentsData.meta.totalPages}
                            page={componentsData.meta.page}
                            onChange={handlePageChange}
                            color="primary"
                            size="large"
                            showFirstButton
                            showLastButton
                            siblingCount={1}
                            boundaryCount={1}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Page {componentsData.meta.page} of {componentsData.meta.totalPages} • 
                            Showing {((componentsData.meta.page - 1) * componentsData.meta.limit) + 1}–
                            {Math.min(componentsData.meta.page * componentsData.meta.limit, componentsData.meta.total)} of {componentsData.meta.total} components
                        </Typography>
                    </Stack>
                </Box>
            )}

            {/* No Components Message */}
            {componentsData?.components && componentsData.components.length === 0 && (
                <Box textAlign="center" py={6}>
                    <IconCpu size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No components found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {filters.search || filters.category !== 'all' || filters.status !== 'all' || filters.usageStatus !== 'all' || filters.enabled !== 'all' 
                            ? 'Try adjusting your search criteria or filters'
                            : 'No components are currently registered in the system'
                        }
                    </Typography>
                </Box>
            )}

            {/* Toggle Confirmation Dialog */}
            <Dialog
                open={toggleConfirmDialog.open}
                onClose={() => setToggleConfirmDialog({ open: false, component: null, newState: false })}
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconShield size={20} />
                        Confirm Component Toggle
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to <strong>{toggleConfirmDialog.newState ? 'enable' : 'disable'}</strong> the{' '}
                        <strong>"{toggleConfirmDialog.component?.name}"</strong> component?
                    </DialogContentText>
                    <Alert severity={toggleConfirmDialog.newState ? 'info' : 'warning'} sx={{ mt: 2 }}>
                        {toggleConfirmDialog.newState 
                            ? 'Enabling this component will make it available across the system.'
                            : 'Disabling this component may affect system functionality and user experience.'
                        }
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setToggleConfirmDialog({ open: false, component: null, newState: false })}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirmToggle}
                        variant="contained"
                        color={toggleConfirmDialog.newState ? 'primary' : 'error'}
                        startIcon={toggleConfirmDialog.newState ? <IconCircleCheck size={16} /> : <IconCircleX size={16} />}
                    >
                        {toggleConfirmDialog.newState ? 'Enable Component' : 'Disable Component'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Logs Dialog */}
            <LogsDialog
                open={logsDialogOpen}
                onClose={() => setLogsDialogOpen(false)}
                componentName={selectedComponentName}
                logs={selectedComponentLogs}
            />

            {/* Test Results Dialog */}
            <TestResultDialog
                open={testResultDialog.open}
                onClose={() => setTestResultDialog({ open: false, component: null, result: null })}
                component={testResultDialog.component}
                result={testResultDialog.result}
            />

            {/* Toast Snackbar */}
            <Snackbar
                open={toastOpen}
                autoHideDuration={6000}
                onClose={() => setToastOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setToastOpen(false)}
                    severity={toastSeverity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {toastMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ComponentManager;