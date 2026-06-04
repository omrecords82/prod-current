import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/** Branded parish-app sign-in (credentials API — no Keycloak hosted UI). */
export default function SsoLoginRedirect() {
  const [params] = useSearchParams();
  const signedOut = params.get('logged_out') === '1'
    || sessionStorage.getItem('om_logged_out') === '1'
    || sessionStorage.getItem('om_logout_in_progress') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const next = '/dashboards/modern';

  // Do not redirect to /login — nginx + platform-login would loop with /auth/login2.

  const clearSignedOutFlags = () => {
    sessionStorage.removeItem('om_logged_out');
    sessionStorage.removeItem('om_logout_in_progress');
    document.cookie = 'om_logged_out=; path=/; max-age=0; SameSite=Lax';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(
        `/api/auth/oidc/orthodoxmetrics/credentials?next=${encodeURIComponent(next)}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ username: email.trim(), password }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { message?: string }).message || 'Invalid email or password.');
        return;
      }
      clearSignedOutFlags();
      if ((data as { redirect_url?: string }).redirect_url) {
        window.location.href = (data as { redirect_url: string }).redirect_url;
      }
    } catch {
      setError('Sign-in service unavailable. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={submit}
      sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, maxWidth: 400, mx: 'auto' }}
    >
      <Typography variant="h5">{signedOut ? 'Signed out' : 'Sign in'}</Typography>
      <Typography color="text.secondary">Sign in with your om.internal account.</Typography>
      <TextField label="Email" type="email" fullWidth required value={email} onChange={(ev) => setEmail(ev.target.value)} autoComplete="username" />
      <TextField label="Password" type="password" fullWidth required value={password} onChange={(ev) => setPassword(ev.target.value)} autoComplete="current-password" />
      {error ? <Typography color="error" variant="body2">{error}</Typography> : null}
      <Button type="submit" variant="contained" fullWidth disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </Box>
  );
}
