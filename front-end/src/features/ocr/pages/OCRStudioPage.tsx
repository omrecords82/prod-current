/**
 * OCRStudioPage — Unified agent pipeline hub (upload → OCR → confirm → seed).
 * Routes: /portal/ocr, /devel/ocr-studio
 */

import { useAuth } from '@/context/AuthContext';
import {
  CloudUpload as UploadIcon,
  CheckCircle as ConfirmIcon,
  TableChart as GridIcon,
  AutoAwesome as AgentIcon,
} from '@mui/icons-material';
import { alpha, Box, Button, Card, CardContent, Grid, Paper, Stack, Typography, useTheme } from '@mui/material';
import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OcrPipelineOverview from '../components/OcrPipelineOverview';

const STEPS = [
  { n: 1, title: 'Upload', desc: 'Scan images (JPG, PNG, TIFF)', path: 'upload' },
  { n: 2, title: 'OCR', desc: 'Automatic text recognition', path: null },
  { n: 3, title: 'Agent Extract', desc: 'AI maps fields from OCR text', path: null },
  { n: 4, title: 'Confirm', desc: 'Quick human review of fields', path: 'review' },
  { n: 5, title: 'Seed', desc: 'Insert into baptism/marriage/funeral tables', path: null },
  { n: 6, title: 'AG Grid', desc: 'View in Records Management', path: 'records' },
];

const OCRStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user } = useAuth();
  const isPortal = location.pathname.startsWith('/portal');
  const effectiveChurchId = user?.church_id ? Number(user.church_id) : null;

  const routes = useMemo(() => {
    if (isPortal) {
      return {
        upload: '/portal/upload',
        review: effectiveChurchId ? `/portal/ocr/review/${effectiveChurchId}` : '/portal/upload',
        records: '/portal/records-management',
      };
    }
    const churchQ = effectiveChurchId ? `/${effectiveChurchId}` : '';
    return {
      upload: '/devel/ocr-studio/upload',
      review: `/devel/ocr-studio/review${churchQ}`,
      records: '/portal/records-management',
    };
  }, [isPortal, effectiveChurchId]);

  const go = (key: string | null) => {
    if (!key) return;
    const path = (routes as Record<string, string>)[key];
    if (path) navigate(path);
  };

  return (
    <Box sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        OCR Studio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload record images, let the agent extract fields, confirm, and seed into your parish database.
      </Typography>

      {/* Pipeline steps */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.success.main, 0.04)} 100%)`,
        }}
      >
        <Grid container spacing={2}>
          {STEPS.map((step) => (
            <Grid item xs={6} sm={4} md={2} key={step.n}>
              <Box
                sx={{
                  textAlign: 'center',
                  cursor: step.path ? 'pointer' : 'default',
                  '&:hover': step.path ? { opacity: 0.85 } : {},
                }}
                onClick={() => go(step.path)}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: step.path ? 'primary.main' : 'action.selected',
                    color: step.path ? 'primary.contrastText' : 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  {step.n}
                </Box>
                <Typography variant="caption" fontWeight={700} display="block">{step.title}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{step.desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Quick actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <UploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Upload</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add baptism, marriage, or funeral scans
              </Typography>
              <Button variant="contained" fullWidth onClick={() => navigate(routes.upload)}>Upload Images</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <AgentIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Review Queue</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Confirm agent-extracted fields before seeding
              </Typography>
              <Button variant="outlined" fullWidth onClick={() => navigate(routes.review)}>Open Review</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <ConfirmIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Records</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View seeded records in AG Grid
              </Typography>
              <Button variant="outlined" fullWidth onClick={() => navigate(routes.records)}>Records Management</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', opacity: 0.7 }}>
            <CardContent>
              <GridIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Layout Variations</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Era-specific ledger templates (admin)
              </Typography>
              <Button variant="text" fullWidth disabled>Coming soon</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Live pipeline status */}
      <OcrPipelineOverview
        churchId={effectiveChurchId}
        onStageClick={(stageKey) => {
          if (stageKey === 'intake') navigate(routes.upload);
          if (stageKey === 'agent_review') navigate(routes.review);
        }}
      />
    </Box>
  );
};

export default OCRStudioPage;
