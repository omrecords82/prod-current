import React from 'react';
import { Box } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';

interface StepIconProps {
  activeStep: number;
  stepIndex: number;
  icon: React.ReactNode;
}

const StepIcon: React.FC<StepIconProps> = ({ activeStep, stepIndex, icon }) => (
  <Box
    sx={{
      width: 32,
      height: 32,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: activeStep >= stepIndex ? 'primary.main' : 'grey.300',
      color: 'white',
    }}
  >
    {activeStep > stepIndex ? <IconCheck size={18} /> : icon}
  </Box>
);

export default StepIcon;
