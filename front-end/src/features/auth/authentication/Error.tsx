import ErrorImg from '@/assets/images/backgrounds/errorimg.svg';
import { useLanguage } from '@/context/LanguageContext';
import { Box, Button, Container, Typography } from '@mui/material';
import { FC } from 'react';
import { Link } from 'react-router-dom';

const Error: FC = () => {
  const { t } = useLanguage();

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100vh"
      textAlign="center"
      justifyContent="center"
    >
      <Container maxWidth="md">
        <img src={ErrorImg} alt="404" style={{ width: '100%', maxWidth: '500px' }} />
        <Typography align="center" variant="h1" mb={4}>
          {t('auth.error_generic_title')}
        </Typography>
        <Typography align="center" variant="h4" mb={4}>
          {t('auth.error_generic_message')}
        </Typography>
        <Button color="primary" variant="contained" component={Link} to="/" disableElevation>
          {t('auth.error_generic_go_home')}
        </Button>
      </Container>
    </Box>
  );
};

export default Error;
