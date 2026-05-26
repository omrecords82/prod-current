/**
 * useSnackbar — shared hook for standard snackbar state management.
 *
 * Replaces repeated inline `useState<SnackbarState>` + `setSnackbar({ open, message, severity })`
 * patterns across account pages, admin pages, and developer tool pages.
 */
import { useState, useCallback } from 'react';

export type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

export const SNACKBAR_CLOSED: SnackbarState = { open: false, message: '', severity: 'success' };

/** Standard snackbar auto-hide duration (ms). */
export const SNACKBAR_DURATION = 4000;

/** Extended snackbar duration for critical actions (password change, etc.). */
export const SNACKBAR_DURATION_LONG = 6000;

export function useSnackbar(initialSeverity: SnackbarSeverity = 'success') {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: initialSeverity,
  });

  const showSnackbar = useCallback((message: string, severity: SnackbarSeverity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  return { snackbar, setSnackbar, showSnackbar, closeSnackbar } as const;
}
