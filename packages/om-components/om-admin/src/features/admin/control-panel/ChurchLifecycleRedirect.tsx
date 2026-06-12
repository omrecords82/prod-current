/**
 * Redirect legacy OM church-lifecycle routes to OMAI Church Command Center.
 */
import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const OMAI_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:7060`
  : `${window.location.origin}/omai`;

function buildCccPath(churchId?: string) {
  if (!churchId) {
    return '/cp/ops/church-command-center/crm?tab=onboarding';
  }
  const numeric = churchId.replace(/^church_/, '');
  return `/cp/ops/church-command-center/accounts/${numeric}?tab=client`;
}

export default function ChurchLifecycleRedirect() {
  const { churchId } = useParams<{ churchId?: string }>();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const next = encodeURIComponent(buildCccPath(churchId));
    if (!token) {
      window.location.href = `/auth/login?redirect=${next}`;
      return;
    }
    window.location.href = `${OMAI_URL}/auth/bridge?token=${encodeURIComponent(token)}&next=${next}`;
  }, [churchId]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
      <CircularProgress />
      <Typography variant="body1">Redirecting to Church Command Center…</Typography>
    </Box>
  );
}
