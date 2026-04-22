import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  MobileStepper,
  IconButton,
  Fade,
} from '@mui/material';
import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/utils/axiosInstance';

interface TutorialStep {
  id: number;
  step_order: number;
  title: string | null;
  content: string;
  image_url?: string | null;
}

interface Tutorial {
  id: number;
  title: string;
  description: string | null;
  audience: string;
  is_welcome: boolean;
  sort_order: number;
  steps: TutorialStep[];
}

const TutorialViewer: React.FC = () => {
  const { user, authenticated } = useAuth();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const res = await apiClient.get('/tutorials/pending');
      const data = res.data?.data || res.data;
      const list: Tutorial[] = data?.tutorials || [];
      if (list.length > 0) {
        setTutorials(list);
        setCurrentIndex(0);
        setActiveStep(0);
        setOpen(true);
      }
    } catch (err) {
      // Silently ignore — tutorials are non-critical
      console.debug('Tutorial fetch skipped:', err);
    }
  }, []);

  useEffect(() => {
    if (authenticated && user) {
      // Small delay so the main UI renders first
      const timer = setTimeout(fetchPending, 1200);
      return () => clearTimeout(timer);
    }
  }, [authenticated, user, fetchPending]);

  const currentTutorial = tutorials[currentIndex];
  if (!currentTutorial) return null;

  const steps = currentTutorial.steps;
  const maxSteps = steps.length;
  const currentStep = steps[activeStep];

  const handleNext = () => {
    if (activeStep < maxSteps - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleDismiss = async () => {
    try {
      await apiClient.post(`/tutorials/${currentTutorial.id}/dismiss`);
    } catch {
      // best-effort
    }

    // Move to next tutorial or close
    if (currentIndex < tutorials.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setActiveStep(0);
    } else {
      setOpen(false);
    }
  };

  const isLastStep = activeStep === maxSteps - 1;

  return (
    <Dialog
      open={open}
      onClose={handleDismiss}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
          color: '#fff',
          py: 2,
          px: 3,
        }}
      >
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          {currentTutorial.title}
        </Typography>
        <IconButton onClick={handleDismiss} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: 4, py: 4, minHeight: 180 }}>
        <Fade in key={activeStep} timeout={300}>
          <Box>
            {currentStep?.title && (
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}
              >
                {currentStep.title}
              </Typography>
            )}

            {currentStep?.image_url && (
              <Box
                component="img"
                src={currentStep.image_url}
                alt={currentStep.title || 'Tutorial'}
                sx={{
                  maxWidth: '100%',
                  maxHeight: 240,
                  objectFit: 'contain',
                  borderRadius: 2,
                  mb: 2,
                  display: 'block',
                  mx: 'auto',
                }}
              />
            )}

            <Typography
              variant="body1"
              sx={{ lineHeight: 1.7, color: 'text.secondary', whiteSpace: 'pre-wrap' }}
            >
              {currentStep?.content}
            </Typography>
          </Box>
        </Fade>
      </DialogContent>

      {/* Footer with stepper */}
      <DialogActions sx={{ px: 3, pb: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
        {maxSteps > 1 && (
          <MobileStepper
            variant="dots"
            steps={maxSteps}
            position="static"
            activeStep={activeStep}
            sx={{ width: '100%', background: 'transparent' }}
            backButton={
              <Button size="small" onClick={handleBack} disabled={activeStep === 0}>
                <KeyboardArrowLeft /> Back
              </Button>
            }
            nextButton={
              isLastStep ? (
                <Button size="small" variant="contained" onClick={handleDismiss}>
                  Got it
                </Button>
              ) : (
                <Button size="small" onClick={handleNext}>
                  Next <KeyboardArrowRight />
                </Button>
              )
            }
          />
        )}

        {maxSteps <= 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="contained" onClick={handleDismiss}>
              Got it
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TutorialViewer;
