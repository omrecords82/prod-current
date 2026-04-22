import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
} from '@mui/material';
import { OMLoading, OMLoadingOverlay } from '@/components/common/OMLoading';

/**
 * LoadingDemo - Demo page for OMLoading component
 * 
 * Shows both inline and overlay variants with different sizes
 */
const LoadingDemo: React.FC = () => {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayBackdrop, setOverlayBackdrop] = useState(true);

  const handleToggleOverlay = () => {
    setOverlayOpen((prev) => !prev);
  };

  const handleOverlayWithDelay = () => {
    setOverlayOpen(true);
    setTimeout(() => {
      setOverlayOpen(false);
    }, 3000);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        OMLoading Component Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Demonstration of the reusable animated loading UI component with priest image.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Inline Loading - Different Sizes */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Inline Loading (Different Sizes)
          </Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Small
              </Typography>
              <Box sx={{ minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <OMLoading label="Loading" size="sm" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Medium (Default)
              </Typography>
              <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <OMLoading label="Loading" size="md" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Large
              </Typography>
              <Box sx={{ minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <OMLoading label="Loading" size="lg" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Custom Labels */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Custom Labels
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Processing...
              </Typography>
              <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <OMLoading label="Processing" size="md" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Saving...
              </Typography>
              <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <OMLoading label="Saving" size="md" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Overlay Demo */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Fullscreen Overlay
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="body1">
                The overlay component blocks all page interactions and displays a centered loading indicator.
              </Typography>

              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button variant="contained" onClick={handleToggleOverlay}>
                  {overlayOpen ? 'Hide Overlay' : 'Show Overlay'}
                </Button>
                <Button variant="outlined" onClick={handleOverlayWithDelay}>
                  Show Overlay (3s auto-close)
                </Button>
                <FormControlLabel
                  control={
                    <Switch
                      checked={overlayBackdrop}
                      onChange={(e) => setOverlayBackdrop(e.target.checked)}
                    />
                  }
                  label="Show Backdrop"
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Overlay is currently: {overlayOpen ? 'OPEN' : 'CLOSED'}
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        {/* Usage Examples */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Usage Examples
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Code Examples
              </Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.875rem',
                }}
              >
                {`// Inline usage
<OMLoading label="Loading" size="md" />

// Overlay usage
<OMLoadingOverlay open={isLoading} label="Loading" />

// With custom props
<OMLoading label="Processing" size="lg" />
<OMLoadingOverlay 
  open={isLoading} 
  label="Saving" 
  backdrop={true}
/>`}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overlay Component */}
      <OMLoadingOverlay
        open={overlayOpen}
        label="Loading"
        backdrop={overlayBackdrop}
        size="md"
      />
    </Container>
  );
};

export default LoadingDemo;
