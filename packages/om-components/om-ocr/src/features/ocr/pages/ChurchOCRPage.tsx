import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScanLine, Settings as SettingsIcon, RefreshCw, ArrowLeft, Church } from '@/ui/icons';
import { Box, Typography, Button, Paper, useTheme, CircularProgress, Alert } from '@mui/material';
import UploadZone from '../components/UploadZone';
import JobList from '../components/JobList';
import ConfigPanel from '../components/ConfigPanel';
import OutputViewer from '../components/OutputViewer';
import { fetchChurches } from '../lib/ocrApi';

const ChurchOCRPage: React.FC = () => {
  const theme = useTheme();
  const { churchId } = useParams<{ churchId: string }>();
  const navigate = useNavigate();
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [church, setChurch] = useState<{ id: number; name: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  const numericChurchId = churchId ? parseInt(churchId, 10) : undefined;

  // Load church information
  useEffect(() => {
    const loadChurch = async () => {
      if (!numericChurchId) {
        navigate('/devel/ocr-studio');
        return;
      }

      setLoading(true);
      try {
        const churches = await fetchChurches();
        const foundChurch = churches.find(c => c.id === numericChurchId);
        
        if (foundChurch) {
          setChurch(foundChurch);
        } else {
          // Church not found or user doesn't have access
          navigate('/devel/ocr-studio');
        }
      } catch (error) {
        console.error('Failed to load church information:', error);
        navigate('/devel/ocr-studio');
      } finally {
        setLoading(false);
      }
    };

    loadChurch();
  }, [numericChurchId, navigate]);

  const handleUploadSuccess = useCallback(() => {
    setSelectedJobId(undefined);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleRefreshJobs = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleBackToStudio = useCallback(() => {
    navigate('/devel/ocr-studio');
  }, [navigate]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading church information...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!church) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Church not found or access denied.
          </Alert>
          <Button
            variant="contained"
            onClick={handleBackToStudio}
          >
            Return to OCR Studio
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {/* Back Button */}
              <Button
                onClick={handleBackToStudio}
                startIcon={<ArrowLeft size={20} />}
                variant="outlined"
                size="small"
                title="Back to OCR Studio"
              >
                Back
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
                  <ScanLine size={24} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="text.primary">
                    OCR for {church.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Document processing for church records
                  </Typography>
                </Box>
              </Box>

              {/* Church Badge */}
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, bgcolor: 'primary.light', border: 1, borderColor: 'primary.main', borderRadius: 1, color: 'primary.main' }}>
                <Church size={16} />
                <Typography variant="caption" fontWeight="medium" color="primary.main">
                  Church ID: {church.id}
                </Typography>
              </Box>
            </Box>

            {/* Header Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshCw size={16} />}
                onClick={handleRefreshJobs}
                size="small"
              >
                Refresh
              </Button>

              <ConfigPanel
                trigger={
                  <Button
                    variant="contained"
                    startIcon={<SettingsIcon size={16} />}
                    sx={{ textTransform: 'none' }}
                  >
                    Settings
                  </Button>
                }
                churchId={numericChurchId}
              />
            </Box>
          </Box>

          {/* Church-specific Stats Bar */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
              <Typography variant="caption" color="text.secondary">
                Church-specific Processing
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
              <Typography variant="caption" color="text.secondary">
                Liturgical Document Recognition
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.main' }} />
              <Typography variant="caption" color="text.secondary">
                Records Management Integration
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, py: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '5fr 7fr' }, gap: 3 }}>
          {/* Left Panel - Upload & Jobs */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Church-specific Upload Zone */}
            <UploadZone
              onUploaded={handleUploadSuccess}
              churchId={numericChurchId}
            />

            {/* Church-specific Jobs List */}
            <JobList
              onSelect={setSelectedJobId}
              selectedJobId={selectedJobId}
              churchId={numericChurchId}
              refreshTrigger={refreshTrigger}
            />
          </Box>

          {/* Right Panel - Results */}
          <Box>
            <OutputViewer jobId={selectedJobId} />
          </Box>
        </Box>

        {/* Church-specific Footer Info */}
        <Paper sx={{ mt: 3, p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="semibold" color="text.primary" sx={{ mb: 2 }}>
            Church OCR Features
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight="medium" color="text.primary" sx={{ mb: 1 }}>
                Document Types
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5 } }}>
                <li><Typography variant="caption" color="text.secondary">Baptism Certificates</Typography></li>
                <li><Typography variant="caption" color="text.secondary">Marriage Records</Typography></li>
                <li><Typography variant="caption" color="text.secondary">Funeral Documents</Typography></li>
                <li><Typography variant="caption" color="text.secondary">Membership Records</Typography></li>
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="medium" color="text.primary" sx={{ mb: 1 }}>
                Language Support
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5 } }}>
                <li><Typography variant="caption" color="text.secondary">English</Typography></li>
                <li><Typography variant="caption" color="text.secondary">Greek (Modern & Ancient)</Typography></li>
                <li><Typography variant="caption" color="text.secondary">Church Slavonic</Typography></li>
                <li><Typography variant="caption" color="text.secondary">Romanian, Russian</Typography></li>
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="medium" color="text.primary" sx={{ mb: 1 }}>
                Integration
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5 } }}>
                <li><Typography variant="caption" color="text.secondary">Auto-populate records</Typography></li>
                <li><Typography variant="caption" color="text.secondary">Field mapping</Typography></li>
                <li><Typography variant="caption" color="text.secondary">Quality validation</Typography></li>
                <li><Typography variant="caption" color="text.secondary">Audit trails</Typography></li>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ChurchOCRPage;
