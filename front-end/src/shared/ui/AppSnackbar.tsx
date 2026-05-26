/**
 * AppSnackbar — shared Snackbar + Alert component.
 *
 * Drop-in replacement for the repeated inline pattern:
 *   <Snackbar open={…} autoHideDuration={…} onClose={…} anchorOrigin={…}>
 *     <Alert severity={…} onClose={…}>{message}</Alert>
 *   </Snackbar>
 */
import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import type { SnackbarSeverity } from '../../hooks/useSnackbar';

interface AppSnackbarProps {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
  onClose: () => void;
  autoHideDuration?: number;
  anchorOrigin?: { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' };
}

const DEFAULT_ANCHOR: AppSnackbarProps['anchorOrigin'] = { vertical: 'bottom', horizontal: 'center' };

const AppSnackbar: React.FC<AppSnackbarProps> = ({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = 4000,
  anchorOrigin = DEFAULT_ANCHOR,
}) => (
  <Snackbar
    open={open}
    autoHideDuration={autoHideDuration}
    onClose={onClose}
    anchorOrigin={anchorOrigin}
  >
    <Alert severity={severity} onClose={onClose}>
      {message}
    </Alert>
  </Snackbar>
);

export default AppSnackbar;
