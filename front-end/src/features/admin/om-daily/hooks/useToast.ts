/**
 * useToast — simple snackbar toast state.
 */

import { useState, useCallback } from 'react';

interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'success' });

  const showToast = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }));
  }, []);

  return { toast, showToast, closeToast };
}
