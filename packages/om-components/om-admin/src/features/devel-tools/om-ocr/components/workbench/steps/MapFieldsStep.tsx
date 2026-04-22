/**
 * MapFieldsStep - Step 3: Field mapping with auto-map
 * Replaces MappingTab and FusionTab Step 3
 */

import React, { useState, useCallback } from 'react';
import { Box, Typography, Button, Stack, Alert } from '@mui/material';
import { getRecordSchema } from '@/shared/recordSchemas/registry';
import type { JobDetail } from '../../../types/inspection';

interface MapFieldsStepProps {
  job: JobDetail;
  churchId: number;
  onNext: () => void;
  onBack: () => void;
}

const MapFieldsStep: React.FC<MapFieldsStepProps> = ({
  job,
  churchId,
  onNext,
  onBack,
}) => {
  const recordType = (job?.record_type || job?.recordType || 'baptism') as 'baptism' | 'marriage' | 'funeral';
  const schema = getRecordSchema(recordType);
  const [mapping, setMapping] = useState<Record<string, { value: string; confidence?: number }>>({});
  
  // TODO: Integrate mapping logic from FusionTab Step 3
  // This will use the canonical schema registry
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Map Fields
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Map detected values to record fields. Use Auto-Map for automatic mapping.
      </Typography>
      
      {/* TODO: Integrate FusionTab Step 3 field mapping UI here */}
      {/* Will use getRecordSchema() for field definitions */}
      
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

export default MapFieldsStep;

