import React from 'react';
import { Box, Typography } from '@mui/material';

interface OutputViewerProps {
  output?: string;
  [key: string]: any;
}

const OutputViewer: React.FC<OutputViewerProps> = ({ output, ...props }) => {
  return (
    <Box {...props}>
      <Typography variant="subtitle2" gutterBottom>OCR Output</Typography>
      {output ? (
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{output}</pre>
      ) : (
        <Typography variant="body2" color="text.secondary">No output to display.</Typography>
      )}
    </Box>
  );
};

export default OutputViewer;
