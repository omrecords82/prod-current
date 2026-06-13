import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { BrandLogo } from '@/layouts/full/shared/logo/Logo';
import { Box, Container, Divider, Grid, IconButton, Stack, Typography, useTheme } from '@mui/material';
import { IconBrandFacebook, IconBrandLinkedin, IconBrandTwitter } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const footerColumns = [
  {
    title: 'About',
    links: [
      { text: 'Our Mission', to: PUBLIC_ROUTES.ABOUT },
      { text: 'How It Works', to: PUBLIC_ROUTES.TOUR },
      { text: 'Security', to: PUBLIC_ROUTES.SECURITY },
      { text: 'Careers', to: PUBLIC_ROUTES.CONTACT },
    ],
  },
  {
    title: 'Support',
    links: [
      { text: 'Documentation', to: PUBLIC_ROUTES.BLOG },
      { text: 'Help Center', to: PUBLIC_ROUTES.FAQ },
      { text: 'Contact Us', to: PUBLIC_ROUTES.CONTACT },
      { text: 'System Status', to: PUBLIC_ROUTES.ABOUT },
    ],
  },
  {
    title: 'Legal',
    links: [
      { text: 'Privacy Policy', to: PUBLIC_ROUTES.PRIVACY },
      { text: 'Terms of Service', to: PUBLIC_ROUTES.TERMS },
      { text: 'Cookie Policy', to: PUBLIC_ROUTES.PRIVACY },
      { text: 'GDPR', to: PUBLIC_ROUTES.PRIVACY },
    ],
  },
];

const Footer = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const bgColor = isDark ? '#0d0519' : '#f5f3f8';
  const textPrimary = isDark ? '#ffffff' : '#1a1a1a';
  const textSecondary = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const linkColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const iconColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

  return (
    <Box sx={{ backgroundColor: bgColor, color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 5, lg: 8 }, pb: { xs: 3, lg: 4 } }}>
        {/* ── Top section: Brand left, Link columns right ── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 4, md: 6 },
          }}
        >
          {/* Brand column — wider on desktop for breathing room */}
          <Box sx={{ flex: { md: '0 0 280px' }, maxWidth: { md: 280 } }}>
            <Box mb={2}>
              <BrandLogo
                href={PUBLIC_ROUTES.HOME}
                colorScheme={isDark ? 'dark' : 'light'}
                className="h-9 w-auto max-w-[min(100%,260px)] object-contain object-left"
              />
            </Box>
            <Typography variant="body2" sx={{ color: textSecondary, lineHeight: 1.7, mb: 2, fontSize: '0.85rem' }}>
              Digitizing Orthodox records and empowering the Church with secure, multilingual record-keeping solutions.
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" sx={{ color: iconColor, '&:hover': { color: '#D4AF37' } }}>
                <IconBrandTwitter size={18} />
              </IconButton>
              <IconButton size="small" sx={{ color: iconColor, '&:hover': { color: '#D4AF37' } }}>
                <IconBrandFacebook size={18} />
              </IconButton>
              <IconButton size="small" sx={{ color: iconColor, '&:hover': { color: '#D4AF37' } }}>
                <IconBrandLinkedin size={18} />
              </IconButton>
            </Stack>
          </Box>

          {/* Link columns — evenly distributed in a single row */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              gap: { xs: 3, sm: 4, md: 6 },
              justifyContent: { sm: 'space-between' },
            }}
          >
            {footerColumns.map((col, i) => (
              <Box key={i} sx={{ minWidth: { xs: '40%', sm: 'auto' }, flex: { sm: 1 } }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ color: textPrimary, mb: 2 }}>
                  {col.title}
                </Typography>
                {col.links.map((link, j) => (
                  <Typography
                    key={j}
                    component={Link}
                    to={link.to}
                    sx={{
                      display: 'block',
                      color: linkColor,
                      fontSize: '0.85rem',
                      py: 0.6,
                      textDecoration: 'none',
                      '&:hover': { color: '#D4AF37' },
                    }}
                  >
                    {link.text}
                  </Typography>
                ))}
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ borderColor: dividerColor, my: 4 }} />

        <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ color: mutedColor }}>
            &copy; {new Date().getFullYear()} Orthodox Metrics. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ color: mutedColor }}>
            Made with &hearts; for the Orthodox community
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
