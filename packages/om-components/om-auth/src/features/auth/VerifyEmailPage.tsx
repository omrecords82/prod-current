/**
 * VerifyEmailPage — Handles the email verification link callback.
 *
 * Reads ?token= from the URL, POSTs it to /api/user/profile/verify-email,
 * and shows success or error state with a link to log in or return to account.
 */

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

type Status = 'loading' | 'success' | 'error';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const data = await apiClient.post<any>('/user/profile/verify-email', { token });
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Your email has been verified successfully.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed.');
        }
      } catch {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Card variant="outlined" sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="h6">Verifying your email...</Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Email Verified
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {message}
              </Typography>
              <Button variant="contained" onClick={() => navigate('/account/password')}>
                Go to Account Security
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Verification Failed
              </Typography>
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {message}
              </Alert>
              <Button variant="outlined" onClick={() => navigate('/auth/login2')}>
                Go to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default VerifyEmailPage;
