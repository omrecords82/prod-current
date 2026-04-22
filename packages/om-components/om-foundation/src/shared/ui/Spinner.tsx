import React from 'react';
import { CircularProgress, Box } from '@mui/material';

/**
 * Spinner component - Loading indicator
 * 
 * Simple loading spinner component for use in Suspense fallbacks
 * and other loading states throughout the application.
 */
const Spinner: React.FC = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      width="100%"
    >
      <CircularProgress />
    </Box>
  );
};

export default Spinner;
