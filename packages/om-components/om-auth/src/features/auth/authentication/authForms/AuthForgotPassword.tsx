import React, { useState } from 'react';
import { Alert, Button, CircularProgress, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import apiClient from '@/api/utils/axiosInstance';
import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';

const AuthForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack mt={4} spacing={2}>
        {success && (
          <Alert severity="success">
            If an account exists with that email, a temporary password has been sent. Please check your inbox.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}

        <CustomFormLabel htmlFor="reset-email">Email Address</CustomFormLabel>
        <CustomTextField
          id="reset-email"
          variant="outlined"
          fullWidth
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          disabled={loading || success}
        />

        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          type="submit"
          disabled={loading || success}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
        </Button>
        <Button color="primary" size="large" fullWidth component={Link} to="/auth/login">
          Back to Login
        </Button>
      </Stack>
    </form>
  );
};

export default AuthForgotPassword;
