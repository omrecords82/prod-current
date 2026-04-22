// ErrorBoundary index.ts - Export error boundary components
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as AdminErrorBoundary } from './AdminErrorBoundary';

// Additional error boundary utilities
export interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallbackComponent?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Hook for manual error reporting
export const useErrorHandler = () => {
    const reportError = (error: Error, context?: string) => {
        console.error(`Manual error report ${context ? `(${context})` : ''}:`, error);
        
        // In production, send to error tracking service
        if (process.env.NODE_ENV === 'production') {
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
                    context,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        url: window.location.href,
                        userId: localStorage.getItem('userId') || 'anonymous'
                    }
                })
            }).catch(logError => {
                console.error('Failed to log manual error to server:', logError);
            });
        }
    };

    return { reportError };
};
