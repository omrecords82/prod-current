import { useAuth } from '@/context/AuthContext';
import { Box, Button, Checkbox, Container, FormControlLabel, Grid, Stack, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OrthodoxLogin: React.FC = () => {
    const { user, authenticated, loading: authLoading, login } = useAuth();
    
    const displayName = user?.full_name || (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : null);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);

    useEffect(() => {
        if (!authLoading && authenticated && user) {
            setAlreadyLoggedIn(true);
            setTimeout(() => {
                if (user.role === 'priest' && user.church_id) {
                    navigate(`/apps/records/baptism?church_id=${user.church_id}`);
                } else {
                    navigate('/admin/control-panel');
                }
            }, 2000);
        }
    }, [authenticated, user, authLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await login(email, password);
            
            console.log('🔑 Login successful! Checking for redirect URL...');
            console.log('🔑 User email:', email);
            console.log('🔑 Redirect URL:', result.redirectUrl);

            const storedUserStr = localStorage.getItem('auth_user');
            const currentUser = storedUserStr ? JSON.parse(storedUserStr) : null;

            if (currentUser?.role === 'priest' && currentUser?.church_id) {
                const redirectPath = `/apps/records/baptism?church_id=${currentUser.church_id}`;
                console.log('🔑 Priest user detected, redirecting to:', redirectPath);
                navigate(redirectPath);
                return;
            }

            if (result.redirectUrl) {
                console.log('🔑 Redirecting to:', result.redirectUrl);
                navigate(result.redirectUrl);
            } else {
                console.log('🔑 No redirect URL provided, using default navigation to "/"');
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { title: 'Digital Records Management', desc: 'Comprehensive digitization of baptisms, marriages, funerals, and other sacred records' },
        { title: 'Liturgical Calendar Integration', desc: 'Seamlessly integrate with Orthodox liturgical calendar and feast days' },
        { title: 'Multi-language Support', desc: 'Full support for Greek, Russian, Romanian, and English text recognition' },
        { title: 'Secure Cloud Storage', desc: 'Enterprise-grade security for your most precious parish documents' },
    ];

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#faf8f5' }}>
            <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
                <Grid container spacing={6} alignItems="center">
                    {/* Left: Branding + Features */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        {/* Logo + Brand */}
                        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                            <Box
                                component="img"
                                src="/images/logos/om-logo.png"
                                alt="Orthodox Metrics"
                                sx={{ width: 40, height: 40, borderRadius: '50%' }}
                            />
                            <Typography variant="h6" sx={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 700, color: '#D4AF37' }}>
                                Orthodox Metrics
                            </Typography>
                        </Stack>

                        <Typography variant="caption" sx={{ color: '#7B4F9E', fontWeight: 500, letterSpacing: 0.5, mb: 1, display: 'block' }}>
                            Orthodox Christian Record Translation + Management
                        </Typography>

                        <Typography
                            variant="h4"
                            sx={{
                                fontFamily: '"Cormorant Garamond", Georgia, serif',
                                fontWeight: 600,
                                color: '#1a1a1a',
                                lineHeight: 1.3,
                                mb: 2,
                                fontSize: { xs: '1.5rem', md: '2rem' },
                            }}
                        >
                            Digitize, preserve, and manage your parish records with reverence and precision.
                        </Typography>

                        <Typography variant="body1" sx={{ color: '#555', mb: 3, lineHeight: 1.7 }}>
                            Supporting the canonical traditions of the Orthodox Church worldwide.
                        </Typography>

                        {/* Feature bullets */}
                        <Stack spacing={1.5} mb={4}>
                            {features.map((f, i) => (
                                <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#D4AF37', mt: 0.8, flexShrink: 0 }} />
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>{f.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{f.desc}</Typography>
                                    </Box>
                                </Stack>
                            ))}
                        </Stack>

                        {/* Action buttons */}
                        {!alreadyLoggedIn && (
                            <Stack direction="row" spacing={2} flexWrap="wrap">
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => document.getElementById('login-email')?.focus()}
                                    sx={{
                                        background: 'linear-gradient(135deg, #D4AF37, #F4D03F)',
                                        color: '#1a0a2e',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        px: 3,
                                        '&:hover': { background: 'linear-gradient(135deg, #c9a430, #e6c52e)' },
                                    }}
                                >
                                    Sign In
                                </Button>
                                <Button
                                    variant="contained"
                                    size="large"
                                    href="/auth/register"
                                    sx={{
                                        backgroundColor: '#e74c3c',
                                        color: '#fff',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        px: 3,
                                        '&:hover': { backgroundColor: '#c0392b' },
                                    }}
                                >
                                    Register Church
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    href="/tour"
                                    sx={{
                                        borderColor: '#ccc',
                                        color: '#555',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        px: 3,
                                        '&:hover': { borderColor: '#999', backgroundColor: 'rgba(0,0,0,0.02)' },
                                    }}
                                >
                                    How it Works
                                </Button>
                            </Stack>
                        )}
                    </Grid>

                    {/* Right: Login form / decorative card */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                            sx={{
                                p: 4,
                                borderRadius: '16px',
                                backgroundColor: '#fff',
                                boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                                border: '1px solid rgba(0,0,0,0.06)',
                                maxWidth: 420,
                                mx: 'auto',
                            }}
                        >
                            {alreadyLoggedIn ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="h5" sx={{ color: '#7B4F9E', fontWeight: 600, mb: 1 }}>
                                        Already Logged In
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        {user?.church_id ? 'Redirecting to Records UI...' : 'Redirecting to dashboard...'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {displayName ? `Welcome back, ${displayName}` : 'Welcome back'}
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5, textAlign: 'center' }}>
                                        {displayName ? `Welcome back, ${displayName}` : 'Welcome'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#888', mb: 3, textAlign: 'center' }}>
                                        Sign in to your dashboard
                                    </Typography>

                                    <form onSubmit={handleSubmit}>
                                        <TextField
                                            id="login-email"
                                            fullWidth
                                            type="email"
                                            label="Email Address"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            variant="outlined"
                                            size="small"
                                            inputProps={{ autoComplete: 'username' }}
                                            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                        />
                                        <TextField
                                            fullWidth
                                            type="password"
                                            label="Password"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            variant="outlined"
                                            size="small"
                                            inputProps={{ autoComplete: 'current-password' }}
                                            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                        />

                                        {error && (
                                            <Typography color="error" sx={{ mb: 2, textAlign: 'center', fontSize: '0.85rem' }}>
                                                {error}
                                            </Typography>
                                        )}

                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <FormControlLabel
                                                control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} size="small" sx={{ color: '#D4AF37' }} />}
                                                label={<Typography variant="caption">Remember me</Typography>}
                                            />
                                            <Typography component="a" href="#" variant="caption" sx={{ color: '#7B4F9E', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                                Forgot password?
                                            </Typography>
                                        </Box>

                                        <Button
                                            type="submit"
                                            fullWidth
                                            disabled={loading}
                                            variant="contained"
                                            sx={{
                                                background: 'linear-gradient(135deg, #D4AF37, #F4D03F)',
                                                color: '#1a0a2e',
                                                fontWeight: 700,
                                                py: 1.2,
                                                borderRadius: '8px',
                                                textTransform: 'none',
                                                fontSize: '0.95rem',
                                                '&:hover': { background: 'linear-gradient(135deg, #c9a430, #e6c52e)', boxShadow: '0 4px 12px rgba(212,175,55,0.3)' },
                                            }}
                                        >
                                            {loading ? 'Signing In...' : 'Sign In'}
                                        </Button>
                                    </form>

                                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: '#888' }}>
                                        Don't have an account?{' '}
                                        <Typography component="a" href="/auth/register" sx={{ color: '#7B4F9E', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                                            Create one here
                                        </Typography>
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Container>

            {/* Bottom bar */}
            <Box sx={{ py: 2, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography variant="caption" color="text.secondary">
                    Trusted by Orthodox communities worldwide
                </Typography>
            </Box>
        </Box>
    );
};

export default OrthodoxLogin;
