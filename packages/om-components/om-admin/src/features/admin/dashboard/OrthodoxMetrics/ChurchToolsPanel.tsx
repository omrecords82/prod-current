import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const ChurchToolsPanel: React.FC = () => {
  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Church Tools
      </Typography>
      <Alert severity="info">
        Church management tools are available at the Church Management page.
      </Alert>
    </Box>
  );
};

export default ChurchToolsPanel;
