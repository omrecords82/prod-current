// ErrorBoundary.tsx - Global error boundary for catching React errors
import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    Divider,
    Chip,
    Stack
} from '@mui/material';
import {
    IconAlertTriangle,
    IconRefresh,
    IconHome,
    IconBug,
    IconCopy
} from '@tabler/icons-react';

interface Props {
    children: ReactNode;
    fallbackComponent?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: ''
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Generate a unique error ID for tracking
        const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            hasError: true,
            error,
            errorInfo: null,
            errorId
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error details
        console.error('🚨 ErrorBoundary caught an error:', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            errorId: this.state.errorId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });

        // Update state with error info
        this.setState({
            errorInfo
        });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // In production, you might want to send this to an error tracking service
        // Example: Sentry, LogRocket, Bugsnag, etc.
        if (process.env.NODE_ENV === 'production') {
            this.logErrorToService(error, errorInfo);
        }
    }

    logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
        // This is where you would integrate with an error tracking service
        // For now, we'll just log to the server
        try {
            fetch('/api/logs/client-errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    },
                    errorInfo: {
                        componentStack: errorInfo.componentStack
                    },
                    metadata: {
                        errorId: this.state.errorId,
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        url: window.location.href,
                        userId: localStorage.getItem('userId') || 'anonymous'
                    }
                })
            }).catch(logError => {
                console.error('Failed to log error to server:', logError);
            });
        } catch (logError) {
            console.error('Error in error logging:', logError);
        }
    };

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: ''
        });
    };

    handleGoHome = () => {
        // [copilot-fix] Changed to redirect to admin instead of modernize homepage
        console.error('🚨 ErrorBoundary redirecting to /admin due to error:', this.state.error);
        window.location.href = '/admin';
    };

    handleReload = () => {
        window.location.reload();
    };

    copyErrorDetails = () => {
        const errorDetails = {
            errorId: this.state.errorId,
            error: this.state.error?.message,
            stack: this.state.error?.stack,
            componentStack: this.state.errorInfo?.componentStack,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
            .then(() => {
                alert('Error details copied to clipboard');
            })
            .catch(() => {
                console.error('Failed to copy error details');
            });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback component if provided
            if (this.props.fallbackComponent) {
                return this.props.fallbackComponent;
            }

            // Default error UI
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
                    <Card sx={{ maxWidth: 600, width: '100%' }}>
                        <CardContent sx={{ p: 4 }}>
                            {/* Header */}
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <IconAlertTriangle 
                                    size={64} 
                                    color="#f44336" 
                                    style={{ marginBottom: 16 }}
                                />
                                <Typography variant="h4" gutterBottom color="error">
                                    Oops! Something went wrong
                                </Typography>
                                <Typography variant="body1" color="textSecondary">
                                    The application encountered an unexpected error. Don't worry, we've logged the details and will investigate.
                                </Typography>
                            </Box>

                            {/* Error ID */}
                            <Box sx={{ mb: 3 }}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                        <strong>Error ID:</strong> {this.state.errorId}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        Please include this ID when reporting the issue.
                                    </Typography>
                                </Alert>
                            </Box>

                            {/* Action Buttons */}
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<IconRefresh />}
                                    onClick={this.handleRetry}
                                    fullWidth
                                >
                                    Try Again
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<IconHome />}
                                    onClick={this.handleGoHome}
                                    fullWidth
                                >
                                    Go Home
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<IconRefresh />}
                                    onClick={this.handleReload}
                                    fullWidth
                                >
                                    Reload Page
                                </Button>
                            </Stack>

                            <Divider sx={{ my: 2 }} />

                            {/* Error Details (Development Mode) */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        <IconBug size={20} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
                                        Development Error Details
                                    </Typography>
                                    
                                    <Alert severity="warning" sx={{ mb: 2 }}>
                                        <Typography variant="body2">
                                            <strong>Error:</strong> {this.state.error.message}
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
                                                    fontSize: '0.8rem',
                                                    overflow: 'auto',
                                                    maxHeight: 200
                                                }}
                                            >
                                                {this.state.error.stack}
                                            </Box>
                                        </Box>
                                    )}

                                    {this.state.errorInfo?.componentStack && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Component Stack:
                                            </Typography>
                                            <Box
                                                component="pre"
                                                sx={{
                                                    backgroundColor: '#f5f5f5',
                                                    p: 2,
                                                    borderRadius: 1,
                                                    fontSize: '0.8rem',
                                                    overflow: 'auto',
                                                    maxHeight: 200
                                                }}
                                            >
                                                {this.state.errorInfo.componentStack}
                                            </Box>
                                        </Box>
                                    )}

                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<IconCopy />}
                                        onClick={this.copyErrorDetails}
                                    >
                                        Copy Error Details
                                    </Button>
                                </Box>
                            )}

                            {/* Production Contact Info */}
                            {process.env.NODE_ENV === 'production' && (
                                <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                    <Typography variant="body2" color="textSecondary" align="center">
                                        If this problem persists, please contact our support team with Error ID: {this.state.errorId}
                                    </Typography>
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

export default ErrorBoundary;
