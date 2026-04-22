import SiteFooter from '@/components/frontend-pages/shared/footer/SiteFooter';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';
import Customizer from '@/layouts/full/shared/customizer/Customizer';
import { Box, CircularProgress, Container } from '@mui/material';
import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ChurchPortalLayout: React.FC = () => {
  const { authenticated, loading } = useAuth();
  const { isLayout } = useContext(CustomizerContext);
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <HpHeader />
      <Container
        sx={{
          pt: '30px',
          pb: '64px',
          maxWidth: isLayout === 'boxed' ? 'lg' : '100%!important',
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box sx={{ minHeight: 'calc(100vh - 170px)' }}>
          <Outlet />
        </Box>
      </Container>
      <SiteFooter />
      <ScrollToTop />
      <Customizer />
    </Box>
  );
};

export default ChurchPortalLayout;
