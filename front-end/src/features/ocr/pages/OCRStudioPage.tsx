/**
 * OCRStudioPage — Unified agent pipeline hub (upload → OCR → confirm → seed).
 * Routes: /portal/ocr, /devel/ocr-studio
 */

import { useAuth } from '@/context/AuthContext';
import OcrChurchSelector from '@/features/devel-tools/om-ocr/components/OcrChurchSelector';
import { useOcrChurchSelector } from '@/features/devel-tools/om-ocr/hooks/useOcrChurchSelector';
import {
  CloudUpload as UploadIcon,
  CheckCircle as ConfirmIcon,
  TableChart as GridIcon,
  AutoAwesome as AgentIcon,
} from '@mui/icons-material';
import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OcrStudioNav from '@/features/devel-tools/om-ocr/components/OcrStudioNav';




const OCRStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isPortal = location.pathname.startsWith('/portal');
  const { selectedChurchId } = useOcrChurchSelector();
  const effectiveChurchId = selectedChurchId ?? (user?.church_id ? Number(user.church_id) : null);

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

  return (
    <Box sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <OcrStudioNav />
      <OcrChurchSelector />
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        OCR Studio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload record images, let the agent extract fields, confirm, and seed into your parish database.
      </Typography>



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
    </Box>
  );
};

export default OCRStudioPage;
