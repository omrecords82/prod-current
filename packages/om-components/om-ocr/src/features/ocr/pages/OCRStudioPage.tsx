/**
 * OCRStudioPage Component
 * 
 * Main OCR studio page for processing and managing OCR jobs.
 * Portal mode: flat pipeline-integrated view (no settings card).
 * Admin mode: 4-card layout with settings and analytics.
 * 
 * Routes: 
 * - /portal/ocr  (church staff — flat pipeline)
 * - /devel/ocr-studio  (admin — card layout)
 * - /apps/ocr-upload  (admin — card layout)
 */

import { useAuth } from '@/context/AuthContext';
import OcrWorkbench from '@/features/devel-tools/om-ocr/components/workbench/OcrWorkbench';
import { WorkbenchProvider } from '@/features/devel-tools/om-ocr/context/WorkbenchContext';
import {
    Assessment as AssessmentIcon,
    History as HistoryIcon,
    Settings as SettingsIcon,
    CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { alpha, Box, Button, Card, CardContent, Divider, Grid, Paper, Stack, Typography, useTheme } from '@mui/material';
import { IconUpload } from '@tabler/icons-react';
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import OcrPipelineOverview from '../components/OcrPipelineOverview';

const OCRStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isPortal = location.pathname.startsWith('/portal');
  const churchParam = searchParams.get('church');
  const effectiveChurchId = churchParam ? Number(churchParam) : user?.church_id ? Number(user.church_id) : null;

  const routes = useMemo(() => {
    if (isPortal) {
      return {
        upload: `/portal/upload`,
        jobs: `/portal/ocr/jobs`,
      };
    }
    return {
      upload: '/devel/ocr-studio/upload',
      jobs: '/devel/ocr-studio/jobs',
    };
  }, [isPortal]);

  // ── Portal mode: flat pipeline view ──
  if (isPortal) {
    return (
      <Box sx={{ py: 4, px: 2 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          OCR Pipeline
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Track your document processing pipeline from upload to database commit.
        </Typography>

        {/* Pipeline Overview — main feature */}
        <OcrPipelineOverview
          churchId={effectiveChurchId}
          onStageClick={(stageKey, step) => {
            if (step === 1) navigate(routes.upload);
          }}
        />

        {/* Quick actions */}
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mt: 1,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
            borderColor: alpha(theme.palette.primary.main, 0.15),
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Ready to process records?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload new images or review existing jobs in the pipeline.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<IconUpload size={18} />}
                onClick={() => navigate(routes.upload)}
              >
                Upload & Process
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Integrated OCR Workbench */}
        {effectiveChurchId && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
              OCR Workbench
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select a job below to review OCR results, map fields, and commit records.
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                height: 'calc(100vh - 200px)',
                minHeight: 500,
                overflow: 'hidden',
                borderRadius: 2,
              }}
            >
              <WorkbenchProvider>
                <OcrWorkbench churchId={effectiveChurchId} />
              </WorkbenchProvider>
            </Paper>
          </Box>
        )}
      </Box>
    );
  }

  // ── Admin mode: card layout ──
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          OCR Studio
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Process documents with Optical Character Recognition (OCR) to extract text and data from images.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Upload Documents
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Upload images or PDFs to process with OCR
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => navigate(routes.upload)}
                >
                  Upload & Process
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <HistoryIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Job History
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View and manage past OCR processing jobs
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate(routes.jobs)}
                >
                  View Jobs
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <SettingsIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  OCR Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configure OCR processing options and preferences
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => navigate('/devel/ocr-studio/settings')}
                >
                  Configure
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <AssessmentIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Analytics & Reports
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View OCR processing statistics and performance metrics
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  disabled
                >
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default OCRStudioPage;
