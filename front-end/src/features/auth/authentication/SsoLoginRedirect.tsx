import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

/** Sends users to Keycloak SSO for the OrthodoxMetrics parish app. */
export default function SsoLoginRedirect() {
  const [params] = useSearchParams();
  const signedOut = params.get('logged_out') === '1'
    || sessionStorage.getItem('om_logged_out') === '1'
    || sessionStorage.getItem('om_logout_in_progress') === '1';

  // Never auto-start OIDC here — silent SSO re-logs the user when Keycloak still has a session.
  // Sign-in is explicit (button below) and always uses prompt=login.

  const start = `/api/auth/oidc/orthodoxmetrics/start?next=${encodeURIComponent('/dashboards/modern')}&prompt=login`;

  const clearSignedOutFlags = () => {
    sessionStorage.removeItem('om_logged_out');
    sessionStorage.removeItem('om_logout_in_progress');
    document.cookie = 'om_logged_out=; path=/; max-age=0; SameSite=Lax';
  };

  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
      <Typography variant="h5">{signedOut ? 'Signed out' : 'Sign in'}</Typography>
      <Typography color="text.secondary">
        {signedOut
          ? 'Your session has ended. Sign in again when you are ready.'
          : 'Use your om.internal account to continue.'}
      </Typography>
      <Button variant="contained" href={start} onClick={clearSignedOutFlags}>
        Sign in with om.internal
      </Button>
    </Box>
  );
}
