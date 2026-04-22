import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface UploadZoneProps {
  onUpload?: (files: File[]) => void;
  [key: string]: any;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, ...props }) => {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 4, textAlign: 'center', border: '2px dashed', borderColor: 'divider', cursor: 'pointer' }}
      {...props}
    >
      <Typography variant="body1" color="text.secondary">
        Drag & drop files here or click to upload
      </Typography>
    </Paper>
  );
};

export default UploadZone;
