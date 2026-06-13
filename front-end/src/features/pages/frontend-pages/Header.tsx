import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { BrandLogo } from '@/layouts/full/shared/logo/Logo';

const Header: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        // Subtle neutral gradient base
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #1a1a2e 100%)'
            : 'linear-gradient(135deg, #f5f3ef 0%, #eae6df 25%, #f0ece5 50%, #e8e4dc 75%, #f3f0ea 100%)',
        // Texture overlay via repeating SVG noise
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          opacity: theme.palette.mode === 'dark' ? 0.06 : 0.045,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23000000' fill-opacity='0'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23000000' fill-opacity='0.4'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23000000' fill-opacity='0.25'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          pointerEvents: 'none',
        },
        // Subtle bottom edge
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(90deg, transparent 0%, rgba(200,162,75,0.3) 50%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(200,162,75,0.35) 50%, transparent 100%)',
        },
        py: { xs: 3, sm: 4, md: 5 },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2.5, sm: 3, md: 4 },
            maxWidth: '960px',
            mx: 'auto',
          }}
        >
          {/* Logo on the left */}
          <BrandLogo
            colorScheme={theme.palette.mode === 'dark' ? 'dark' : 'light'}
            className="h-[72px] sm:h-[88px] md:h-[100px] w-auto max-w-[min(100%,320px)] object-contain object-left flex-shrink-0"
          />

          {/* Text content */}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontFamily:
                  '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                fontWeight: 700,
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
                mb: 1.5,
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
              }}
            >
              Orthodox Metrics
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.9)'
                    : '#555555',
                fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.1rem' },
                lineHeight: 1.75,
                mb: 1.5,
              }}
            >
              Welcome to Orthodox Metrics, LLC, your gateway to parish records developed specifically for your parish needs.
              Orthodox Church record management. We're honored to support your parish with tools
              that make history, sacraments, and data come alive with clarity and reverence.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.9)'
                    : '#555555',
                fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.1rem' },
                lineHeight: 1.75,
              }}
            >
              To get started quickly, we recommend visiting the{' '}
              <Box
                component="span"
                onClick={() => navigate('/samples')}
                sx={{
                  color: '#C8A24B',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': { color: '#E6A600' },
                }}
              >
                Samples page
              </Box>{' '}
              to explore real examples of how records and analytics will look in your system.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Header;
