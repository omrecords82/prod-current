import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconShieldX } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    // For non-superadmin users, redirect to their baptism records page
    if (user && user.role !== 'super_admin' && user.church_id) {
      navigate(`/apps/records/baptism?church_id=${user.church_id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        textAlign="center"
      >
        <IconShieldX size={120} color="red" />
        <Typography variant="h1" component="h1" gutterBottom>
          403
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          {t('auth.error_403_title')}
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          {t('auth.error_403_message')}
        </Typography>
        <Box mt={3}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGoHome}
            sx={{ mr: 2 }}
          >
            {t('auth.error_403_go_home')}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleGoBack}
          >
            {t('auth.error_403_go_back')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Unauthorized;
