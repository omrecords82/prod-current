import Grid2 from '@/components/compat/Grid2';
// AdminErrorBoundary.tsx - Specialized error boundary for admin pages
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    Divider,
    Chip,
    Stack,
    Grid
} from '@mui/material';
import {
    IconAlertTriangle,
    IconRefresh,
    IconHome,
    IconBug,
    IconCopy,
    IconShield,
    IconSettings,
    IconArrowLeft
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

interface Props {
    children: ReactNode;
    adminSection?: string;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorId: string;
    retryCount: number;
}

class AdminErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: '',
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        const errorId = `ADMIN_ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            hasError: true,
            error,
            errorInfo: null,
            errorId
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Enhanced logging for admin errors
        const adminErrorDetails = {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            errorInfo: {
                componentStack: errorInfo.componentStack
            },
            context: {
                adminSection: this.props.adminSection || 'unknown',
                errorId: this.state.errorId,
                retryCount: this.state.retryCount,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                sessionData: {
                    userId: localStorage.getItem('userId'),
                    userRole: localStorage.getItem('userRole'),
                    sessionId: sessionStorage.getItem('sessionId')
                }
            }
        };

        console.error('🚨 AdminErrorBoundary caught an admin error:', adminErrorDetails);

        this.setState({
            errorInfo
        });

        // Call custom error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Send to admin error tracking
        this.logAdminError(adminErrorDetails);
    }

    logAdminError = async (errorDetails: any) => {
        try {
            await apiClient.post<any>('/logs/admin-errors', {
                ...errorDetails,
                priority: 'high', // Admin errors get high priority
                category: 'admin_ui_error'
            });
        } catch (logError: any) {
            // Silently handle CORS errors and network failures
            // Don't spam console with CORS errors
            if (logError?.message?.includes('CORS') || logError?.message?.includes('Failed to fetch')) {
                return;
            }
            // Only log unexpected errors
            console.error('Failed to log admin error:', logError);
        }
    };

    handleRetry = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: '',
            retryCount: prevState.retryCount + 1
        }));
    };

    handleGoToDashboard = () => {
        // [copilot-fix] Changed to redirect to admin instead of modernize homepage
        window.location.href = '/admin';
    };

    handleGoToAdminHome = () => {
        window.location.href = '/admin';
    };

    handleReload = () => {
        window.location.reload();
    };

    copyErrorDetails = () => {
        const errorDetails = {
            errorId: this.state.errorId,
            adminSection: this.props.adminSection,
            error: this.state.error?.message,
            stack: this.state.error?.stack,
            componentStack: this.state.errorInfo?.componentStack,
            retryCount: this.state.retryCount,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
            .then(() => {
                alert('Admin error details copied to clipboard');
            })
            .catch(() => {
                console.error('Failed to copy admin error details');
            });
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f5f5f5',
                        p: 3
                    }}
                >
                    <Card sx={{ maxWidth: 700, width: '100%' }}>
                        <CardContent sx={{ p: 4 }}>
                            {/* Header */}
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <IconShield 
                                    size={64} 
                                    color="#f44336" 
                                    style={{ marginBottom: 16 }}
                                />
                                <Typography variant="h4" gutterBottom color="error">
                                    Admin Panel Error
                                </Typography>
                                <Typography variant="h6" color="textSecondary" gutterBottom>
                                    {this.props.adminSection && `Error in ${this.props.adminSection} section`}
                                </Typography>
                                <Typography variant="body1" color="textSecondary">
                                    The admin interface encountered an unexpected error. This has been logged with high priority for immediate investigation.
                                </Typography>
                            </Box>

                            {/* Error Details */}
                            <Grid2 container spacing={2} sx={{ mb: 3 }}>
                                <Grid2 size={{ xs: 12, md: 6 }}>
                                    <Alert severity="error">
                                        <Typography variant="body2">
                                            <strong>Error ID:</strong> {this.state.errorId}
                                        </Typography>
                                    </Alert>
                                </Grid2>
                                <Grid2 size={{ xs: 12, md: 6 }}>
                                    <Alert severity="info">
                                        <Typography variant="body2">
                                            <strong>Retry Count:</strong> {this.state.retryCount}
                                        </Typography>
                                    </Alert>
                                </Grid2>
                            </Grid2>

                            {/* Action Buttons */}
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<IconRefresh />}
                                    onClick={this.handleRetry}
                                    disabled={this.state.retryCount >= 3}
                                    fullWidth
                                >
                                    {this.state.retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<IconArrowLeft />}
                                    onClick={this.handleGoToAdminHome}
                                    fullWidth
                                >
                                    Admin Home
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<IconHome />}
                                    onClick={this.handleGoToDashboard}
                                    fullWidth
                                >
                                    Main Dashboard
                                </Button>
                            </Stack>

                            <Divider sx={{ my: 2 }} />

                            {/* Admin-specific Recovery Options */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    🛠️ Admin Recovery Options
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<IconSettings />}
                                        onClick={() => window.location.href = '/admin/settings'}
                                    >
                                        Admin Settings
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<IconBug />}
                                        onClick={() => window.location.href = '/admin/logs'}
                                    >
                                        System Logs
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<IconCopy />}
                                        onClick={this.copyErrorDetails}
                                    >
                                        Copy Details
                                    </Button>
                                </Stack>
                            </Box>

                            {/* Development Error Details */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <Box>
                                    <Typography variant="h6" gutterBottom color="warning.main">
                                        🔧 Development Debug Info
                                    </Typography>
                                    
                                    <Alert severity="warning" sx={{ mb: 2 }}>
                                        <Typography variant="body2">
                                            <strong>Error:</strong> {this.state.error.message}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Admin Section:</strong> {this.props.adminSection || 'Unknown'}
                                        </Typography>
                                    </Alert>

                                    {this.state.error.stack && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Stack Trace:
                                            </Typography>
                                            <Box
                                                component="pre"
                                                sx={{
                                                    backgroundColor: '#f5f5f5',
                                                    p: 2,
                                                    borderRadius: 1,
                                                    fontSize: '0.75rem',
                                                    overflow: 'auto',
                                                    maxHeight: 150
                                                }}
                                            >
                                                {this.state.error.stack}
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {/* Production Support Contact */}
                            {process.env.NODE_ENV === 'production' && (
                                <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                    <Alert severity="info">
                                        <Typography variant="body2">
                                            <strong>For Immediate Support:</strong> Contact the development team with Error ID: {this.state.errorId}
                                        </Typography>
                                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                            This admin error has been automatically logged and prioritized for urgent resolution.
                                        </Typography>
                                    </Alert>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default AdminErrorBoundary;
