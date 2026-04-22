// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Card, Grid, Typography, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import PageContainer from '@/shared/ui/PageContainer';
import Logo from '@/layouts/full/shared/logo/Logo';

import AuthRegister from '@/features/auth/authentication/authForms/AuthRegister';

const Register2 = () => (
  <PageContainer title="Register" description="Register for Orthodox Metrics">
    <Box
      sx={{
        position: 'relative',
        '&:before': {
          content: '""',
          background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
          position: 'absolute',
          height: '100%',
          width: '100%',
          opacity: '0.3',
        },
      }}
    >
      <Grid container spacing={0} justifyContent="center" sx={{ minHeight: '100vh' }}>
        <Grid
          item
          xs={12}
          sm={12}
          lg={6}
          xl={5}
          display="flex"
          justifyContent="center"
          alignItems="center"
          py={4}
        >
          <Card elevation={9} sx={{ p: 4, zIndex: 1, width: '100%', maxWidth: '520px' }}>
            <Box display="flex" alignItems="center" justifyContent="center">
              <Logo />
            </Box>
            <AuthRegister
              subtext={
                <Typography variant="subtitle1" textAlign="center" color="textSecondary" mb={1}>
                  Register with your church's registration token
                </Typography>
              }
              subtitle={
                <Stack direction="row" spacing={1} mt={3} justifyContent="center">
                  <Typography color="textSecondary" variant="h6" fontWeight="400">
                    Already have an account?
                  </Typography>
                  <Typography
                    component={Link}
                    to="/auth/login"
                    fontWeight="500"
                    sx={{
                      textDecoration: 'none',
                      color: 'primary.main',
                    }}
                  >
                    Sign In
                  </Typography>
                </Stack>
              }
            />
          </Card>
        </Grid>
      </Grid>
    </Box>
  </PageContainer>
);

export default Register2;
