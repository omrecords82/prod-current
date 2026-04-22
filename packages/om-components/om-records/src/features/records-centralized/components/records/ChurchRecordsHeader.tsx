import { ChurchRecordsLanding } from '@/hooks/useChurchRecordsLanding';
import { alpha, Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconDroplet, IconHeart, IconCross } from '@tabler/icons-react';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export interface AnalyticsHighlights {
  baptisms: number;
  marriages: number;
  funerals: number;
  total: number;
  changePercent?: number;
}

interface ChurchRecordsHeaderProps {
  branding: ChurchRecordsLanding | null;
  churchName: string | null;
  isDefault: boolean;
  loading: boolean;
  /** Optional analytics highlights shown when branding.show_analytics_highlights is true */
  highlights?: AnalyticsHighlights | null;
}

/**
 * Branded header for the church records landing page.
 * Shows church logo, title, subtitle, welcome text, and optional background image.
 * Falls back gracefully to a clean default when no branding is configured.
 */
const ChurchRecordsHeader: React.FC<ChurchRecordsHeaderProps> = ({
  branding,
  churchName,
  isDefault,
  loading,
  highlights,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { t } = useLanguage();

  if (loading) {
    return (
      <Box sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  // Resolve display values with defaults
  const title = branding?.title || churchName || t('records.management_title');
  const subtitle = branding?.subtitle || t('records.sacramental_records');
  const welcomeText = branding?.welcome_text || null;
  const accentColor = branding?.accent_color || (isDark ? '#60a5fa' : '#2563eb');
  const logoPath = branding?.logo_path || null;
  const bgPath = branding?.background_image_path || null;
  const showHighlights = !!branding?.show_analytics_highlights;

  // Build gradient with optional accent color
  const baseGradient = isDark
    ? `linear-gradient(135deg, ${alpha(accentColor, 0.15)} 0%, #0f172a 100%)`
    : `linear-gradient(135deg, ${alpha(accentColor, 0.06)} 0%, #f8fafc 100%)`;

  return (
    <Box
      sx={{
        mb: 3,
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        background: bgPath ? 'none' : baseGradient,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {/* Background image overlay */}
      {bgPath && (
        <>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${bgPath})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: 0
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: isDark
                ? 'linear-gradient(135deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.92) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.90) 0%, rgba(248,250,252,0.94) 100%)',
              zIndex: 1
            }}
          />
        </>
      )}

      {/* Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          px: { xs: 2.5, md: 4 },
          py: { xs: 2.5, md: 3 },
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 2, md: 3 },
          minHeight: 100
        }}
      >
        {/* Logo */}
        {logoPath && (
          <Box
            component="img"
            src={logoPath}
            alt={`${title} logo`}
            sx={{
              width: { xs: 56, md: 72 },
              height: { xs: 56, md: 72 },
              objectFit: 'contain',
              borderRadius: 1.5,
              flexShrink: 0,
              bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
              p: 0.5
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}

        {/* Text content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              background: `linear-gradient(90deg, ${accentColor} 0%, ${alpha(accentColor, 0.7)} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.25,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {subtitle}
          </Typography>
          {welcomeText && (
            <Typography
              variant="body2"
              sx={{
                mt: 1,
                color: 'text.secondary',
                opacity: 0.85,
                maxWidth: 600,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {welcomeText}
            </Typography>
          )}
        </Box>

        {/* Analytics highlights */}
        {showHighlights && highlights && highlights.total > 0 && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexShrink: 0,
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
            }}
          >
            <Chip icon={<IconDroplet size={14} />} label={`${highlights.baptisms.toLocaleString()} ${t('portal.baptisms')}`} size="small" sx={{ bgcolor: alpha('#1e88e5', 0.1), color: '#1e88e5', fontWeight: 600 }} />
            <Chip icon={<IconHeart size={14} />} label={`${highlights.marriages.toLocaleString()} ${t('portal.marriages')}`} size="small" sx={{ bgcolor: alpha('#e91e63', 0.1), color: '#e91e63', fontWeight: 600 }} />
            <Chip icon={<IconCross size={14} />} label={`${highlights.funerals.toLocaleString()} ${t('portal.funerals')}`} size="small" sx={{ bgcolor: alpha('#7b1fa2', 0.1), color: '#7b1fa2', fontWeight: 600 }} />
            {highlights.changePercent !== undefined && highlights.changePercent !== 0 && (
              <Chip
                label={`${highlights.changePercent > 0 ? '+' : ''}${highlights.changePercent}% YoY`}
                size="small"
                sx={{
                  bgcolor: alpha(highlights.changePercent > 0 ? '#2e7d32' : '#d32f2f', 0.1),
                  color: highlights.changePercent > 0 ? '#2e7d32' : '#d32f2f',
                  fontWeight: 600,
                }}
              />
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default ChurchRecordsHeader;
