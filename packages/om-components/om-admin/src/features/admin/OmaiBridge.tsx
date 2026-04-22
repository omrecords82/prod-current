import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

// ==============================|| OMAI BRIDGE — REDIRECT TO OMAI WITH TOKEN ||============================== //

const OMAI_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:7060`
  : `${window.location.origin}/omai`; // In production, OMAI is proxied under /omai/

export default function OmaiBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/auth/login', { replace: true });
      return;
    }
    window.location.href = `${OMAI_URL}/auth/bridge?token=${encodeURIComponent(token)}`;
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
      <CircularProgress />
      <Typography variant="body1">Redirecting to OMAI...</Typography>
    </Box>
  );
}
