import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { IconRefresh } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

/**
 * Error Boundary specifically for catching array filter errors
 * Common cause: d.filter is not a function
 */
class FilterErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a filter-related error
    const isFilterError = error.message?.includes('filter is not a function') ||
                          error.message?.includes('map is not a function') ||
                          error.message?.includes('reduce is not a function');
    
    return {
      hasError: true,
      error,
      errorInfo: isFilterError ? 'Data formatting error' : error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log filter errors for debugging
    if (error.message?.includes('filter is not a function')) {
      console.error('🚨 Array Filter Error Caught:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Force a page refresh if needed
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Box 
          sx={{ 
            p: 3, 
            textAlign: 'center',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Alert severity="error" sx={{ mb: 2, maxWidth: '500px' }}>
            <Typography variant="h6" gutterBottom>
              Data Loading Error
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              There was an issue loading the data for this component. 
              This might be a temporary problem.
            </Typography>
            {this.state.errorInfo && (
              <Typography variant="caption" color="text.secondary">
                Technical details: {this.state.errorInfo}
              </Typography>
            )}
          </Alert>
          
          <Button
            variant="contained"
            startIcon={<IconRefresh />}
            onClick={this.handleRefresh}
            size="large"
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default FilterErrorBoundary; 