import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { useLanguage } from '@/context/LanguageContext';

// ── 3-bar Orthodox Christian cross ──────────────────────────────────────────
function OrthodoxCrossIcon({ size = 40, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: size * 0.67, height: size, display: 'block' }}>
      <rect x="14" y="0" width="4" height="48" fill={color} rx="1" />
      <rect x="8" y="6" width="16" height="3.5" fill={color} rx="1" />
      <rect x="4" y="16" width="24" height="4" fill={color} rx="1" />
      <rect x="6" y="36" width="20" height="3.5" fill={color} rx="1" transform="rotate(-18 16 37.75)" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
const NotFound404: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { t } = useLanguage();
  const isDark = theme.palette.mode === 'dark';

  const pageBg    = isDark ? '#0a1929' : '#fafaf7';
  const cardBg    = isDark ? '#0d2137' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const breadBg   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const breadText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const heading   = isDark ? '#e8eaf0' : '#1a2332';
  const subtext   = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const btnBorder = isDark ? 'rgba(255,255,255,0.2)'  : 'rgba(0,0,0,0.15)';
  const btnText   = isDark ? '#e8eaf0' : '#1a2332';
  const linkColor = isDark ? '#5DADE2' : '#1976d2';
  const footerText = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)';

  const crumbPath = location.pathname === '/' ? 'Home' : location.pathname.replace(/^\//, '').replace(/\//g, ' / ');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, transition: 'background-color 0.3s' }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 460,
          bgcolor: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.08)',
        }}
      >
        {/* Breadcrumb bar */}
        <Box sx={{ px: 3, py: 1.25, bgcolor: breadBg, borderBottom: `1px solid ${cardBorder}` }}>
          <Typography sx={{ fontSize: '0.75rem', color: breadText, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            {t('auth.error_404_breadcrumb')} &nbsp;/&nbsp; <span style={{ opacity: 0.7 }}>{crumbPath}</span>
          </Typography>
        </Box>

        {/* Body */}
        <Box sx={{ px: 4, py: 4.5, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Icons row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, mb: 3.5 }}>
            <OrthodoxCrossIcon size={44} color="#D4AF37" />
            <MenuBookOutlinedIcon sx={{ fontSize: 38, color: '#5DADE2' }} />
          </Box>

          {/* Heading */}
          <Typography sx={{ fontSize: '1.625rem', fontWeight: 600, color: heading, letterSpacing: '-0.01em', mb: 1.5 }}>
            {t('auth.error_404_title')}
          </Typography>

          {/* Subtitle */}
          <Typography sx={{ fontSize: '0.9375rem', color: subtext, lineHeight: 1.65, maxWidth: 320, mb: 3.5 }}>
            {t('auth.error_404_message')}
          </Typography>

          {/* Primary button */}
          <Button
            variant="outlined"
            startIcon={<HomeOutlinedIcon sx={{ fontSize: 18 }} />}
            onClick={() => navigate('/')}
            sx={{
              mb: 3,
              px: 3,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9375rem',
              color: btnText,
              borderColor: btnBorder,
              '&:hover': { borderColor: linkColor, color: linkColor, bgcolor: 'transparent' },
              transition: 'all 0.2s',
            }}
          >
            {t('auth.error_404_go_home')}
          </Button>

          {/* Secondary links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component="button"
              onClick={() => navigate('/apps/church-management')}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, background: 'none', border: 'none', cursor: 'pointer', color: linkColor, fontSize: '0.8125rem', p: 0, '&:hover': { opacity: 0.75 } }}
            >
              <BookmarkBorderIcon sx={{ fontSize: 14 }} />
              {t('auth.error_404_browse_records')}
            </Box>
            <Typography sx={{ color: subtext, fontSize: '0.75rem' }}>·</Typography>
            <Box
              component="a"
              href="mailto:support@orthodoxmetrics.com"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: linkColor, textDecoration: 'none', fontSize: '0.8125rem', '&:hover': { opacity: 0.75 } }}
            >
              <ArrowForwardIcon sx={{ fontSize: 14 }} />
              {t('auth.error_404_contact_support')}
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${cardBorder}`, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.6875rem', color: footerText, letterSpacing: '0.02em' }}>
            OrthodoxMetrics &nbsp;·&nbsp; Powered by OrthodoxMetrics
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default NotFound404;
