/**
 * AnchorLabelsStep - Step 2: Label detection and anchoring
 * Extracted from FusionTab Step 2
 */

import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import type { JobDetail } from '../../../types/inspection';

interface AnchorLabelsStepProps {
  job: JobDetail;
  churchId: number;
  onNext: () => void;
  onBack: () => void;
}

const AnchorLabelsStep: React.FC<AnchorLabelsStepProps> = ({
  job,
  churchId,
  onNext,
  onBack,
}) => {
  // TODO: Extract label detection logic from FusionTab
  // This is a placeholder - will integrate FusionTab's Step 2 content
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Anchor Labels
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Find form labels (e.g., "NAME OF CHILD", "DATE OF BIRTH") to anchor field extraction.
      </Typography>
      
      {/* TODO: Integrate FusionTab Step 2 content here */}
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" onClick={onNext}>
          Continue
        </Button>
      </Stack>
    </Box>
  );
};

export default AnchorLabelsStep;

