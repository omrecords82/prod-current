// src/features/home/QuickContactSidebar.tsx
import React, { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  TextField,
  Typography,
  Button,
  Stack,
  InputAdornment,
  Dialog,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const QuickContactSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openLoginDialog, setOpenLoginDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    church: '',
    message: '',
  });

  const handleChange =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      // TODO: replace this with your real API call
      // e.g. await fetch('/api/contact', { method: 'POST', body: JSON.stringify(form) });
      console.log('Quick contact form submitted:', form);
    } finally {
      setSubmitting(false);
      setOpen(false);
      setForm({
        name: '',
        email: '',
        church: '',
        message: '',
      });
    }
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');

    try {
      await login(email, password);
      
      // Check if user has @ssppoc.org domain
      if (email.match(/@ssppoc\.org$/)) {
        navigate('/saints-peter-and-paul-Records');
      } else {
        navigate('/');
      }
      setOpenLoginDialog(false);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleOpenLoginDialog = () => {
    setOpenLoginDialog(true);
    setEmail('');
    setPassword('');
    setLoginError('');
  };

  const handleCloseLoginDialog = () => {
    setOpenLoginDialog(false);
    setEmail('');
    setPassword('');
    setLoginError('');
  };

  return (
    <>
      {/* Floating vertical tabs */}
      <Box
        sx={{
          position: 'fixed',
          top: '40%',
          right: 0,
          zIndex: (theme) => theme.zIndex.drawer + 2,
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box
          onClick={() => setOpen(true)}
          sx={{
            cursor: 'pointer',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            bgcolor: '#4b2c6c', // OrthodoxMetrics purple
            color: '#fff',
            px: 1.5,
            py: 2,
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            boxShadow: 3,
            fontWeight: 600,
            letterSpacing: 1,
            fontSize: 13,
            '&:hover': {
              bgcolor: '#5c3b82',
            },
          }}
        >
          Quick Contact
        </Box>
        <Box
          onClick={handleOpenLoginDialog}
          sx={{
            cursor: 'pointer',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            bgcolor: '#c9a457', // OrthodoxMetrics gold
            color: '#1b102d',
            px: 1.5,
            py: 2,
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            boxShadow: 3,
            fontWeight: 600,
            letterSpacing: 1,
            fontSize: 13,
            '&:hover': {
              bgcolor: '#dfb969',
            },
          }}
        >
          Quick Login
        </Box>
      </Box>

      {/* Slide-out drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 360 },
            bgcolor: '#1b102d',
            color: 'rgba(255,255,255,0.9)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
          },
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            p: 3,
            gap: 2,
          }}
        >
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', opacity: 0.7 }}>
                OrthodoxMetrics
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Quick Contact
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
                Send a note and we&apos;ll follow up about demos, pricing, or questions.
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                '&:hover': { color: '#fff' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Fields */}
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            <TextField
              label="Name"
              variant="outlined"
              size="small"
              required
              value={form.name}
              onChange={handleChange('name')}
              fullWidth
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
              InputProps={{
                sx: {
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.25)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.6)',
                  },
                },
              }}
            />

            <TextField
              label="Email"
              type="email"
              variant="outlined"
              size="small"
              required
              value={form.email}
              onChange={handleChange('email')}
              fullWidth
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
              InputProps={{
                sx: {
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.25)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.6)',
                  },
                },
              }}
            />

            <TextField
              label="Parish / Church"
              variant="outlined"
              size="small"
              value={form.church}
              onChange={handleChange('church')}
              fullWidth
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
              InputProps={{
                sx: {
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.25)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.6)',
                  },
                },
              }}
            />

            <TextField
              label="How can we help?"
              variant="outlined"
              size="small"
              required
              value={form.message}
              onChange={handleChange('message')}
              fullWidth
              multiline
              minRows={3}
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
              InputProps={{
                sx: {
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.25)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.6)',
                  },
                },
              }}
            />
          </Stack>

          {/* Footer actions */}
          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={submitting}
              sx={{
                bgcolor: '#c9a457', // gold accent
                color: '#1b102d',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#dfb969',
                },
              }}
            >
              {submitting ? 'Sending…' : 'Send Message'}
            </Button>

            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, opacity: 0.7, lineHeight: 1.4 }}
            >
              We typically respond within one business day.
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Quick Login Dialog */}
      <Dialog
        open={openLoginDialog}
        onClose={handleCloseLoginDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            padding: 0,
            bgcolor: '#1b102d',
            color: 'rgba(255,255,255,0.9)',
          },
        }}
      >
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', opacity: 0.7 }}>
                OrthodoxMetrics
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                Quick Login
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
                Sign in to access your account
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={handleCloseLoginDialog}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                '&:hover': { color: '#fff' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="outlined"
                error={!!loginError}
                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                InputProps={{
                  sx: {
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.25)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.6)',
                    },
                  },
                }}
              />
              
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                variant="outlined"
                error={!!loginError}
                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.25)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.6)',
                    },
                  },
                }}
              />
              
              {loginError && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#ff6b6b',
                    textAlign: 'center',
                    bgcolor: 'rgba(255, 107, 107, 0.1)',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {loginError}
                </Typography>
              )}
              
              <Button
                fullWidth
                type="submit"
                disabled={loginLoading}
                sx={{
                  bgcolor: '#c9a457', // gold accent
                  color: '#1b102d',
                  fontWeight: 700,
                  textTransform: 'none',
                  py: 1.5,
                  '&:hover': {
                    bgcolor: '#dfb969',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.5)',
                  },
                }}
              >
                {loginLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Stack>
          </Box>
          
          <Box textAlign="center" mt={1}>
            <Typography variant="body2" sx={{ opacity: 0.7 }} component="span">
              Don't have access?{' '}
            </Typography>
            <Button 
              variant="text" 
              sx={{ 
                textTransform: 'none', 
                color: '#c9a457',
                '&:hover': {
                  bgcolor: 'rgba(201, 164, 87, 0.1)',
                },
              }}
            >
              Contact Administrator
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default QuickContactSidebar;
