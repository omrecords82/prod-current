// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';

import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';
import AuthService from '@/shared/lib/authService';

interface ChangePasswordDialogProps {
  open: boolean;
  onSuccess: () => void;
}

const ChangePasswordDialog = ({ open, onSuccess }: ChangePasswordDialogProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await AuthService.changePassword(currentPassword, newPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Change Your Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            You must change your password before continuing.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          <Stack spacing={2}>
            <div>
              <CustomFormLabel htmlFor="current-password">Current Password</CustomFormLabel>
              <CustomTextField
                id="current-password"
                type="password"
                variant="outlined"
                fullWidth
                value={currentPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <CustomFormLabel htmlFor="new-password">New Password</CustomFormLabel>
              <CustomTextField
                id="new-password"
                type="password"
                variant="outlined"
                fullWidth
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <CustomFormLabel htmlFor="confirm-password">Re-enter New Password</CustomFormLabel>
              <CustomTextField
                id="confirm-password"
                type="password"
                variant="outlined"
                fullWidth
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="primary"
            variant="contained"
            type="submit"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChangePasswordDialog;
