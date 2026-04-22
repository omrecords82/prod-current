/**
 * UploadGuidelinesWizard — Extracted 6-step guidelines + acknowledgment panel.
 * Originally part of UploadRecordsPage Phase 1.
 * Can be included on any page that needs to show upload preparation guidelines.
 *
 * Props:
 *   onAccepted — called when the user checks the acknowledgment checkbox
 */

import React, { useState } from 'react';
import {
  alpha,
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { IconCheck } from '@tabler/icons-react';

interface UploadGuidelinesWizardProps {
  onAccepted?: (accepted: boolean) => void;
}

const UploadGuidelinesWizard: React.FC<UploadGuidelinesWizardProps> = ({ onAccepted }) => {
  const theme = useTheme();
  const [accepted, setAccepted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccepted(e.target.checked);
    onAccepted?.(e.target.checked);
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Before You Upload
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ensure your scanned images meet quality standards for accurate OCR processing.
        Following these guidelines will improve text recognition and reduce manual corrections.
      </Typography>

      <Stack spacing={1.2} sx={{ mb: 2.5 }}>
        {[
          'Scan pages at 300 DPI or higher for optimal OCR accuracy',
          'Ensure images are well-lit with minimal shadows or glare',
          'Capture full page edges and avoid cropping any text',
          'Use JPEG or PNG format (TIFF supported for archival)',
          'Organize files by book or volume before uploading',
        ].map((text, i) => (
          <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                bgcolor: alpha(theme.palette.success.main, 0.12),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconCheck size={14} color={theme.palette.success.main} />
            </Box>
            <Typography variant="body2" color="text.secondary">{text}</Typography>
          </Stack>
        ))}
      </Stack>

      <Divider sx={{ my: 2.5 }} />

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
        What to Expect
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        <strong>Automated Processing:</strong> Once uploaded, images are automatically processed
        using optical character recognition to extract names, dates, and record details.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        <strong>Admin Review:</strong> All processed records are reviewed by your church
        administrator before being made available. This typically takes 24-72 hours.
      </Typography>

      <FormControlLabel
        control={
          <Checkbox
            checked={accepted}
            onChange={handleChange}
            sx={{ color: theme.palette.primary.main, '&.Mui-checked': { color: theme.palette.primary.main } }}
          />
        }
        label={<Typography variant="body2" fontWeight={500}>I understand these guidelines and I'm ready to upload.</Typography>}
      />
    </Paper>
  );
};

export default UploadGuidelinesWizard;
