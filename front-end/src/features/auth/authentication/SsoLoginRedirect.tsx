import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AuthService from '@/shared/lib/authService';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/** Branded parish-app sign-in (credentials API + optional TOTP). */
export default function SsoLoginRedirect() {
  const [params] = useSearchParams();
  const signedOut = params.get('logged_out') === '1'
    || sessionStorage.getItem('om_logged_out') === '1'
    || sessionStorage.getItem('om_logout_in_progress') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = params.get('next') || '/portal';
  const safeNext = next.startsWith('/') ? next : '/portal';

  useEffect(() => {
    if (!signedOut) {
      window.location.replace(`/auth/login2?next=${encodeURIComponent(safeNext)}`);
    }
  }, [signedOut, safeNext]);

  const clearSignedOutFlags = () => {
    sessionStorage.removeItem('om_logged_out');
    sessionStorage.removeItem('om_logout_in_progress');
    document.cookie = 'om_logged_out=; path=/; max-age=0; SameSite=Lax';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSetupUrl(null);
    setBusy(true);
    try {
      AuthService.prepareForLogin();
      const res = await fetch(
        `/api/auth/oidc/orthodoxmetrics/credentials?next=${encodeURIComponent(safeNext)}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ username: email.trim(), password, otp: otp.trim() || undefined }),
        },
      );
      const data = await res.json().catch(() => ({})) as { message?: string; setup_url?: string; redirect_url?: string };
      if (!res.ok) {
        if (data.setup_url) setSetupUrl(data.setup_url);
        setError(data.message || 'Invalid email or password.');
        return;
      }
      clearSignedOutFlags();
      if (data.redirect_url) {
        window.location.replace(data.redirect_url);
      }
    } catch {
      setError('Sign-in service unavailable. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!signedOut) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Redirecting to sign in…</Typography>
      </Box>
    );
  }

  const enrollHref = setupUrl || AuthService.mfaSetupUrl(safeNext);

  return (
    <Box
      component="form"
      onSubmit={submit}
      sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, maxWidth: 400, mx: 'auto' }}
    >
      <Typography variant="h5">Signed out</Typography>
      <Typography color="text.secondary">Sign in with your om.internal account.</Typography>
      <TextField label="Email" type="email" fullWidth required value={email} onChange={(ev) => setEmail(ev.target.value)} autoComplete="username" />
      <TextField label="Password" type="password" fullWidth required value={password} onChange={(ev) => setPassword(ev.target.value)} autoComplete="current-password" />
      <TextField
        label="Authenticator code"
        fullWidth
        value={otp}
        onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, '').slice(0, 6))}
        inputProps={{ inputMode: 'numeric', maxLength: 6, autoComplete: 'one-time-code' }}
        placeholder="6-digit code (if enabled)"
      />
      {error ? <Typography color="error" variant="body2">{error}</Typography> : null}
      <Button type="submit" variant="contained" fullWidth disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
      <Button variant="text" href={enrollHref}>Set up authenticator app</Button>
      <Button variant="text" href={`/auth/login2?next=${encodeURIComponent(safeNext)}`}>Use platform sign-in page</Button>
    </Box>
  );
}
