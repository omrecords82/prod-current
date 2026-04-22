/**
 * AGGridErrorBoundary
 *
 * Catches AG Grid runtime errors and renders a fallback renderer.
 * The fallback is a React node passed as a prop — typically a MUI Table
 * that displays the same dataset.
 *
 * Usage:
 *   <AGGridErrorBoundary fallback={<StandardTable data={data} />}>
 *     <AgGridReact ... />
 *   </AGGridErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Box, Chip, Typography } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  onFallbackActivated?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AGGridErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AG Grid Fallback] AG Grid crashed, activating fallback renderer:', error.message);
    console.error('[AG Grid Fallback] Component stack:', errorInfo.componentStack);
    this.props.onFallbackActivated?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box>
          <Alert
            severity="info"
            icon={<WarningIcon fontSize="small" />}
            sx={{ mb: 1, py: 0, '& .MuiAlert-message': { py: 0.5 } }}
          >
            <Typography variant="caption">
              Grid view unavailable — showing standard table
            </Typography>
          </Alert>
          {this.props.fallback}
        </Box>
      );
    }
    return this.props.children;
  }
}

export { AGGridErrorBoundary };
export default AGGridErrorBoundary;
