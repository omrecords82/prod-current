/**
 * Unified Records Modal Component
 * Leverages existing modal patterns from the codebase
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// Types
export interface RecordsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  fullScreen?: boolean;
  showCloseButton?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  className?: string;
  contentClassName?: string;
}

export interface RecordsModalActionsProps {
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  deleteLabel?: string;
  showSave?: boolean;
  showCancel?: boolean;
  showDelete?: boolean;
  loading?: boolean;
  disabled?: boolean;
  saveVariant?: 'contained' | 'outlined' | 'text';
  cancelVariant?: 'contained' | 'outlined' | 'text';
  deleteVariant?: 'contained' | 'outlined' | 'text';
  saveColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  cancelColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  deleteColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

export function RecordsModal({
  open,
  onClose,
  title,
  children,
  actions,
  loading = false,
  error = null,
  success = null,
  maxWidth = 'md',
  fullWidth = true,
  fullScreen = false,
  showCloseButton = true,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  className = '',
  contentClassName = '',
}: RecordsModalProps) {
  const handleClose = (event: {}, reason: string) => {
    if (reason === 'backdropClick' && disableBackdropClick) return;
    if (reason === 'escapeKeyDown' && disableEscapeKeyDown) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      disableEscapeKeyDown={disableEscapeKeyDown}
      className={className}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        },
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 1,
                px: 3,
                pt: 3,
              }}
            >
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              {showCloseButton && (
                <IconButton
                  onClick={onClose}
                  size="small"
                  sx={{ ml: 2 }}
                  disabled={loading}
                >
                  <CloseIcon />
                </IconButton>
              )}
            </DialogTitle>

            <Divider />

            <DialogContent
              sx={{
                px: 3,
                py: 2,
                minHeight: 200,
                position: 'relative',
              }}
              className={contentClassName}
            >
              {(error || success) && (
                <Box sx={{ mb: 2 }}>
                  {error && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      {error}
                    </Alert>
                  )}
                  {success && (
                    <Alert severity="success" sx={{ mb: 1 }}>
                      {success}
                    </Alert>
                  )}
                </Box>
              )}

              {loading && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    zIndex: 1,
                  }}
                >
                  <CircularProgress />
                </Box>
              )}

              {children}
            </DialogContent>

            {actions && (
              <>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                  {actions}
                </DialogActions>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

export function RecordsModalActions({
  onSave,
  onCancel,
  onDelete,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  deleteLabel = 'Delete',
  showSave = true,
  showCancel = true,
  showDelete = false,
  loading = false,
  disabled = false,
  saveVariant = 'contained',
  cancelVariant = 'outlined',
  deleteVariant = 'outlined',
  saveColor = 'primary',
  cancelColor = 'primary',
  deleteColor = 'error',
}: RecordsModalActionsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      {showCancel && onCancel && (
        <Button
          variant={cancelVariant}
          color={cancelColor}
          onClick={onCancel}
          disabled={loading || disabled}
          startIcon={<CancelIcon />}
        >
          {cancelLabel}
        </Button>
      )}
      
      {showDelete && onDelete && (
        <Button
          variant={deleteVariant}
          color={deleteColor}
          onClick={onDelete}
          disabled={loading || disabled}
        >
          {deleteLabel}
        </Button>
      )}
      
      {showSave && onSave && (
        <Button
          variant={saveVariant}
          color={saveColor}
          onClick={onSave}
          disabled={loading || disabled}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : saveLabel}
        </Button>
      )}
    </Box>
  );
}

/**
 * Confirmation Modal Component
 */
export interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  loading?: boolean;
  disabled?: boolean;
}

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
  loading = false,
  disabled = false,
}: ConfirmationModalProps) {
  return (
    <RecordsModal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      actions={
        <RecordsModalActions
          onSave={onConfirm}
          onCancel={onClose}
          saveLabel={confirmLabel}
          cancelLabel={cancelLabel}
          showDelete={false}
          loading={loading}
          disabled={disabled}
          saveColor={confirmColor}
        />
      }
    >
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </RecordsModal>
  );
}

/**
 * Form Modal Component
 */
export interface FormModalProps<T = any> {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: T) => void;
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  submitLabel?: string;
  cancelLabel?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
}

export function FormModal<T = any>({
  open,
  onClose,
  onSubmit,
  title,
  children,
  loading = false,
  error = null,
  success = null,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  maxWidth = 'md',
  disabled = false,
}: FormModalProps<T>) {
  return (
    <RecordsModal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={maxWidth}
      loading={loading}
      error={error}
      success={success}
      actions={
        <RecordsModalActions
          onSave={onSubmit}
          onCancel={onClose}
          saveLabel={submitLabel}
          cancelLabel={cancelLabel}
          showDelete={false}
          loading={loading}
          disabled={disabled}
        />
      }
    >
      {children}
    </RecordsModal>
  );
}

export default RecordsModal;
