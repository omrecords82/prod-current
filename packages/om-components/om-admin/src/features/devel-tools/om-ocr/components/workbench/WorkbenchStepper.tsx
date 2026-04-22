/**
 * WorkbenchStepper - 4-step workflow stepper for OCR processing
 * Steps: Detect Entries → Anchor Labels → Map Fields → Review/Commit
 */

import React, { useCallback } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { lazy, Suspense } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';

// Lazy load step components
const DetectEntriesStep = lazy(() => import('./steps/DetectEntriesStep'));
const AnchorLabelsStep = lazy(() => import('./steps/AnchorLabelsStep'));
const MapFieldsStep = lazy(() => import('./steps/MapFieldsStep'));
const ReviewCommitStep = lazy(() => import('./steps/ReviewCommitStep'));

const WorkbenchStepper: React.FC = () => {
  const theme = useTheme();
  const workbench = useWorkbench();
  const activeStep = workbench.state.activeStep;
  
  const steps = [
    { label: 'Detect Entries', key: 'detect' },
    { label: 'Anchor Labels', key: 'anchor' },
    { label: 'Map Fields', key: 'map' },
    { label: 'Review & Commit', key: 'review' },
  ];
  
  const handleNext = useCallback(() => {
    workbench.setActiveStep(Math.min(activeStep + 1, steps.length - 1));
  }, [activeStep, steps.length, workbench]);
  
  const handleBack = useCallback(() => {
    workbench.setActiveStep(Math.max(activeStep - 1, 0));
  }, [activeStep, workbench]);
  
  const handleStepClick = useCallback((step: number) => {
    workbench.setActiveStep(step);
  }, [workbench]);
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.key}>
            <StepLabel
              onClick={() => handleStepClick(index)}
              sx={{ cursor: 'pointer' }}
            >
              {step.label}
            </StepLabel>
            <StepContent>
              <Suspense fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              }>
                {index === 0 && (
                  <DetectEntriesStep
                    onNext={handleNext}
                    onBack={handleBack}
                  />
                )}
                {index === 1 && (
                  <AnchorLabelsStep
                    onNext={handleNext}
                    onBack={handleBack}
                  />
                )}
                {index === 2 && (
                  <MapFieldsStep
                    onNext={handleNext}
                    onBack={handleBack}
                  />
                )}
                {index === 3 && workbench.state.activeJobId && workbench.state.jobMetadata?.churchId && (
                  <ReviewCommitStep
                    churchId={workbench.state.jobMetadata.churchId}
                    jobId={workbench.state.activeJobId}
                    onBack={handleBack}
                  />
                )}
              </Suspense>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default WorkbenchStepper;

