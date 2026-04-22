import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { IconShieldCheck, IconClock } from '@tabler/icons-react';
import { useLanguage } from '@/context/LanguageContext';

/* ─── Per-church image config ─── */

const HERO_IMAGES: Record<number, { src: string }> = {
  46: {
    src: '/uploads/om_church_46/custom_images/46-header-latest.png',
  },
};

/* ─── Props ─── */

interface HeroBannerProps {
  churchId: number;
  greeting: string;
  roleLabel: string;
  sessionTimeLeft: string;
}

/* ─── Component ─── */

const HeroBanner: React.FC<HeroBannerProps> = ({
  churchId,
  greeting,
  roleLabel,
  sessionTimeLeft,
}) => {
  const { t } = useLanguage();
  const config = HERO_IMAGES[churchId];
  if (!config) return null;

  const { src } = config;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        height: 'clamp(240px, 28vw, 380px)',
        bgcolor: 'rgba(0,0,0,0.15)',
        mb: 4,
      }}
    >
      {/* Layer 1: Full image — scaled to fit, no cropping */}
      <Box
        component="img"
        src={src}
        alt="Church Header"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />

      {/* Layer 2: Localized left-side gradient (not a global wash) */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 70%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Layer 3: Content rail — left-aligned translucent panel */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'flex-end',
          px: { xs: 2.5, sm: 3, md: 4 },
          pb: { xs: 2, sm: 2.5, md: 3 },
        }}
      >
        <Box
          sx={{
            maxWidth: 520,
            bgcolor: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '14px',
            px: { xs: 2, sm: 2.5 },
            py: { xs: 1.5, sm: 2 },
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontFamily: '"Cormorant Garamond", "Palatino Linotype", Georgia, serif',
              fontWeight: 700,
              fontSize: { xs: '1.25rem', sm: '1.45rem', md: '1.6rem' },
              color: '#fff',
              lineHeight: 1.25,
              mb: 0.25,
            }}
          >
            {greeting}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.72)',
              fontSize: { xs: '0.78rem', sm: '0.82rem' },
              fontWeight: 400,
              mb: 1,
            }}
          >
            {t('portal.parish_management_portal')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Chip
              icon={<IconShieldCheck size={13} />}
              label={roleLabel}
              size="small"
              sx={{
                height: 22,
                bgcolor: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.88)',
                fontWeight: 500,
                fontSize: '0.7rem',
                border: '1px solid rgba(255,255,255,0.12)',
                '& .MuiChip-icon': { color: 'rgba(255,255,255,0.6)' },
              }}
            />
            <Chip
              icon={<IconClock size={13} />}
              label={`Session: ${sessionTimeLeft}`}
              size="small"
              sx={{
                height: 22,
                bgcolor: 'rgba(255,255,255,0.12)',
                color: '#a5d6a7',
                fontWeight: 500,
                fontSize: '0.7rem',
                border: '1px solid rgba(76,175,80,0.2)',
                '& .MuiChip-icon': { color: '#a5d6a7' },
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HeroBanner;
export { HERO_IMAGES };
