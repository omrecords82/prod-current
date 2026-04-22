import { Box, Button, Container, Stack, Typography, useTheme } from '@mui/material';
import { useLanguage } from '@/context/LanguageContext';

const C2a = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        background: isDark
          ? 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #1a0a2e 70%, #0d0519 100%)'
          : 'linear-gradient(135deg, #f3edf9 0%, #ece3f6 30%, #f3edf9 70%, #faf7fd 100%)',
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 8, md: 10 },
      }}
    >
      {/* Decorative gold orbs */}
      <Box sx={{ position: 'absolute', top: 30, left: 40, width: 18, height: 18, borderRadius: '50%', background: 'radial-gradient(circle, #D4AF37 0%, rgba(212,175,55,0.3) 100%)', opacity: isDark ? 0.8 : 0.5 }} />
      <Box sx={{ position: 'absolute', top: 80, left: 100, width: 12, height: 12, borderRadius: '50%', background: 'radial-gradient(circle, #D4AF37 0%, rgba(212,175,55,0.3) 100%)', opacity: isDark ? 0.5 : 0.3 }} />
      <Box sx={{ position: 'absolute', top: 60, right: 80, width: 80, height: 80, borderRadius: '50%', border: `2px solid ${isDark ? 'rgba(138,43,226,0.25)' : 'rgba(123,79,158,0.15)'}`, opacity: 0.4 }} />
      <Box sx={{ position: 'absolute', bottom: 40, right: 60, width: 14, height: 14, borderRadius: '50%', background: 'radial-gradient(circle, #9B59B6 0%, rgba(155,89,182,0.2) 100%)', opacity: isDark ? 0.6 : 0.35 }} />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontWeight: 600,
            color: isDark ? '#ffffff' : '#1a0a2e',
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            lineHeight: 1.3,
            mb: 1,
          }}
        >
          {t('cta.heading1')}{' '}
          <Box component="span" sx={{ color: '#D4AF37' }}>{t('cta.heading1_highlight')}</Box>.
        </Typography>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontWeight: 600,
            color: isDark ? '#ffffff' : '#1a0a2e',
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            lineHeight: 1.3,
            mb: 3,
          }}
        >
          {t('cta.heading2')}{' '}
          <Box component="span" sx={{ color: '#D4AF37' }}>{t('cta.heading2_highlight')}</Box>.
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,10,46,0.6)',
            fontSize: { xs: '0.95rem', md: '1.05rem' },
            maxWidth: 600,
            mx: 'auto',
            mb: 4,
            lineHeight: 1.7,
          }}
        >
          {t('cta.subtitle')}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" mb={3}>
          <Button
            variant="contained"
            size="large"
            href="/frontend-pages/contact"
            sx={{
              background: 'linear-gradient(135deg, #D4AF37, #F4D03F)',
              color: '#1a0a2e',
              fontWeight: 700,
              px: 4,
              py: 1.5,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                background: 'linear-gradient(135deg, #c9a430, #e6c52e)',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(212,175,55,0.4)',
              },
            }}
          >
            {t('cta.btn_register')} &rarr;
          </Button>
          <Button
            variant="outlined"
            size="large"
            href="/frontend-pages/contact"
            sx={{
              borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,10,46,0.3)',
              color: isDark ? '#ffffff' : '#1a0a2e',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                borderColor: isDark ? '#ffffff' : '#7B4F9E',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(123,79,158,0.06)',
              },
            }}
          >
            {t('cta.btn_info')}
          </Button>
        </Stack>

      </Container>
    </Box>
  );
};

export default C2a;
