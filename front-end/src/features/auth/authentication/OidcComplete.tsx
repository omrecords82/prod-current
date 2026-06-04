import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AuthService from '@/shared/lib/authService';

/**
 * Keycloak → OM JWT handoff after /api/auth/oidc/orthodoxmetrics/callback.
 */
export default function OidcComplete() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      if (!accessToken) {
        if (!cancelled) setError('Missing access token. Try signing in again from /login.');
        return;
      }
      try {
        sessionStorage.removeItem('om_logged_out');
        sessionStorage.removeItem('om_logout_in_progress');
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);

        const authCheck = await AuthService.checkAuth();
        if (!authCheck.authenticated || !authCheck.user) {
          if (!cancelled) {
            setError('Sign-in token was not accepted by the API. Try signing in again.');
          }
          return;
        }

        if (!cancelled) {
          navigate('/dashboards/modern', { replace: true });
        }
      } catch (e) {
        console.error('[OidcComplete]', e);
        if (!cancelled) setError('Could not process sign-in response.');
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams, navigate]);

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
        <Typography color="error" variant="h6">{error}</Typography>
        <Button variant="contained" href="/auth/login2">Try again</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <CircularProgress />
      <Typography>Signing you in…</Typography>
    </Box>
  );
}
