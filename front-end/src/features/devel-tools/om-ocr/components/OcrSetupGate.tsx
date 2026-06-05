import { apiClient } from '@/shared/lib/axiosInstance';
import { Settings } from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface OcrSetupGateProps {
  children: React.ReactNode;
  churchId?: number | null;
}

/**
 * Gate component that checks OCR setup completion before rendering children
 * Shows setup CTA if setup is incomplete
 */
const OcrSetupGate: React.FC<OcrSetupGateProps> = ({ children, churchId: churchIdProp }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlChurchId = parseInt(searchParams.get('church_id') || '', 10);
  const churchId = churchIdProp ?? (Number.isFinite(urlChurchId) && urlChurchId > 0 ? urlChurchId : null);
  
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [percentComplete, setPercentComplete] = useState(0);

  useEffect(() => {
    if (!churchId) {
      setSetupComplete(true);
      setLoading(false);
      return;
    }
    checkSetupStatus();
  }, [churchId]);

  const checkSetupStatus = async () => {
    if (!churchId) return;
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/setup-state`);
      const data = res?.data ?? res;
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
            OCR Studio upload requires completing the setup wizard first.
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
};

export default OcrSetupGate;
