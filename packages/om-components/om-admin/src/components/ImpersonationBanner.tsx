import { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { Box, Button, Typography } from '@mui/material';
import { IconArrowBack } from '@tabler/icons-react';

const ImpersonationBanner = () => {
  const [impersonating, setImpersonating] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    fetch('/api/admin/impersonate/status', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.impersonating) {
          setImpersonating(true);
          setOriginalEmail(data.originalAdmin?.email || '');
          setCurrentEmail(data.currentUser?.email || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleReturn = async () => {
    setReturning(true);
    try {
      const data = await apiClient.post<any>('/admin/impersonate/return');
      if (data.success) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        window.location.href = '/dashboards/modern';
      }
    } catch {
      setReturning(false);
    }
  };

  if (!impersonating) return null;

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          bgcolor: '#d32f2f',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          py: 0.75,
          px: 2,
          fontSize: '0.875rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500 }}>
          Viewing as <strong>{currentEmail}</strong>
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<IconArrowBack size={16} />}
          onClick={handleReturn}
          disabled={returning}
          sx={{
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.5)',
            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
            textTransform: 'none',
            py: 0.25
          }}
        >
          Return to Admin
        </Button>
      </Box>
      {/* Spacer to push page content below the fixed banner */}
      <Box sx={{ height: '40px', flexShrink: 0 }} />
    </>
  );
};

export default ImpersonationBanner;
