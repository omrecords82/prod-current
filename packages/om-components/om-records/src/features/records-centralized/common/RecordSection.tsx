import { Box, Typography, useTheme } from '@mui/material';
import React from 'react';

interface RecordSectionProps {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
}

const RecordSection: React.FC<RecordSectionProps> = ({
  title,
  children,
  accentColor,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accent = accentColor || (isDark ? 'rgba(186,104,211,0.5)' : 'rgba(156,39,176,0.45)');

  return (
    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          mb: 2.5,
          pb: 1,
          borderBottom: `2px solid ${accent}`,
          display: 'inline-block',
          color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
};

export default RecordSection;
