import React from 'react';
import { Box, Typography } from '@mui/material';

interface ConfigPanelProps {
  [key: string]: any;
}

const ConfigPanel: React.FC<ConfigPanelProps> = (props) => {
  return (
    <Box {...props}>
      <Typography variant="subtitle2" gutterBottom>OCR Configuration</Typography>
      <Typography variant="body2" color="text.secondary">Configuration options will appear here.</Typography>
    </Box>
  );
};

export default ConfigPanel;
