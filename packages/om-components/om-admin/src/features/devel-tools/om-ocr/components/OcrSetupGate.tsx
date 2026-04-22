import React, { useEffect, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Box, CircularProgress, Typography } from '@mui/material';
import { Settings } from '@mui/icons-material';

interface OcrSetupGateProps {
  children: React.ReactNode;
}

/**
 * Gate component that checks OCR setup completion before rendering children
 * Shows setup CTA if setup is incomplete
 * Automatically extracts church_id from URL query params
 */
export default function OcrSetupGate({ children }: OcrSetupGateProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const churchId = parseInt(searchParams.get('church_id') || '46');
  
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [percentComplete, setPercentComplete] = useState(0);

  useEffect(() => {
    checkSetupStatus();
  }, [churchId]);

  const checkSetupStatus = async () => {
    try {
      const data = await apiClient.get<any>(`/church/${churchId}/ocr/setup-state`);
      setSetupComplete(data.isComplete);
      setPercentComplete(data.percentComplete || 0);
    } catch (err) {
      console.error('Failed to check setup status:', err);
      setSetupComplete(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>Checking setup status...</Typography>
      </Box>
    );
  }

  if (!setupComplete) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            OCR Setup Required
          </Typography>
          <Typography variant="body2" gutterBottom>
            Enhanced OCR Uploader requires completing the setup wizard first.
          </Typography>
          {percentComplete > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Setup Progress: {percentComplete}%
            </Typography>
          )}
        </Alert>
        <Button
          variant="contained"
          startIcon={<Settings />}
          onClick={() => navigate(`/devel/ocr-setup-wizard?church_id=${churchId}`)}
          size="large"
        >
          Complete OCR Setup
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
