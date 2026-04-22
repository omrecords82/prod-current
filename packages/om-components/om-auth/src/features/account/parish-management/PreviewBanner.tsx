/**
 * PreviewBanner — Inline notice for pages that are interactive previews only.
 * Renders a subtle info bar so users know settings are not persisted yet.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useLanguage } from '@/context/LanguageContext';

interface PreviewBannerProps {
  /** Override the default message */
  message?: string;
}

const PreviewBanner: React.FC<PreviewBannerProps> = ({
  message,
}) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        mb: 2.5,
        borderRadius: 1.5,
        bgcolor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.06)',
        border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
      }}
    >
      <InfoOutlinedIcon sx={{ fontSize: 16, color: isDark ? '#60a5fa' : '#3b82f6' }} />
      <Typography
        sx={{
          fontFamily: "'Inter'",
          fontSize: '0.75rem',
          color: isDark ? '#93c5fd' : '#2563eb',
        }}
      >
        {message || t('parish.preview_banner')}
      </Typography>
    </Box>
  );
};

export default PreviewBanner;
