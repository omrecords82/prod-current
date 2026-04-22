import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    Stack,
    CircularProgress,
    Chip,
    LinearProgress,
    InputAdornment,
    IconButton,
    Grid
} from '@mui/material';
import { IconEye, IconEyeOff, IconCheck, IconBuilding } from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';
import Logo from '@/layouts/full/shared/logo/Logo';

interface InviteDetails {
    email: string;
    role: string;
    church_name: string | null;
    account_expires_at: string;
}

// Password strength calculator
const getPasswordStrength = (password: string): { score: number; label: string; color: 'error' | 'warning' | 'info' | 'success' } => {
    if (!password) return { score: 0, label: '', color: 'error' };
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25;
    if (/\d/.test(password)) score += 20;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;

    if (score <= 25) return { score, label: 'Weak', color: 'error' };
    if (score <= 50) return { score, label: 'Fair', color: 'warning' };
    if (score <= 75) return { score, label: 'Good', color: 'info' };
    return { score: Math.min(score, 100), label: 'Strong', color: 'success' };
};

const AcceptInvite: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const fetchInvite = async () => {
            try {
                const data = await apiClient.get<any>(`/invite/${token}`);

                if (!data.success) {
                    setError(data.message || 'Invalid invite link.');
                    return;
                }

                setInvite(data);
            } catch {
                setError('Failed to load invite details.');
            } finally {
                setLoading(false);
            }
        };

        fetchInvite();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const data = await apiClient.post<any>(`/invite/${token}/register`, { first_name: firstName, last_name: lastName, password, phone: phone || undefined });

            if (!data.success) {
                setError(data.message || 'Registration failed.');
                return;
            }

            setSuccess(true);
            setTimeout(() => navigate('/auth/login'), 3000);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const roleLabel = invite?.role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '';
    const expiresDate = invite?.account_expires_at
        ? new Date(invite.account_expires_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : '';

    const passwordStrength = getPasswordStrength(password);
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
    const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

    // Background gradient matching login page
    const bgStyles = {
        position: 'relative' as const,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
    };

    if (loading) {
        return (
            <Box sx={bgStyles}>
                <CircularProgress sx={{ zIndex: 1 }} />
            </Box>
        );
    }

    if (error && !invite) {
        return (
            <Box sx={bgStyles} px={2}>
                <Card elevation={9} sx={{ maxWidth: 480, width: '100%', zIndex: 1 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box display="flex" justifyContent="center" mb={3}>
                            <Logo />
                        </Box>
                        <Typography variant="h5" textAlign="center" gutterBottom fontWeight={600}>
                            Invitation Error
                        </Typography>
                        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
                        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                            This invite link may have expired or already been used.
                        </Typography>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => navigate('/auth/login')}
                        >
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    if (success) {
        return (
            <Box sx={bgStyles} px={2}>
                <Card elevation={9} sx={{ maxWidth: 480, width: '100%', zIndex: 1 }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        <Box display="flex" justifyContent="center" mb={3}>
                            <Logo />
                        </Box>
                        <Box
                            sx={{
                                width: 64,
                                height: 64,
                                borderRadius: '50%',
                                bgcolor: 'success.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2,
                            }}
                        >
                            <IconCheck size={32} color="white" />
                        </Box>
                        <Typography variant="h5" gutterBottom fontWeight={600}>
                            Account Created
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Your account has been created successfully. Redirecting to login...
                        </Typography>
                        <CircularProgress size={24} />
                    </CardContent>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={bgStyles} px={2} py={4}>
            <Card elevation={9} sx={{ maxWidth: 520, width: '100%', zIndex: 1 }}>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                    <Box display="flex" justifyContent="center" mb={2}>
                        <Logo />
                    </Box>

                    <Typography variant="h5" textAlign="center" fontWeight={600} gutterBottom>
                        Accept Invitation
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                        You've been invited to join Orthodox Metrics
                    </Typography>

                    {/* Invite details card */}
                    <Box
                        sx={{
                            bgcolor: 'action.hover',
                            borderRadius: 2,
                            p: 2,
                            mb: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                            <Chip label={roleLabel} color="primary" size="small" />
                            {invite?.church_name && (
                                <Chip
                                    icon={<IconBuilding size={14} />}
                                    label={invite.church_name}
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            Account valid until {expiresDate}
                        </Typography>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <form onSubmit={handleSubmit}>
                        <Stack spacing={2.5}>
                            <TextField
                                label="Email"
                                value={invite?.email || ''}
                                disabled
                                fullWidth
                                size="small"
                                sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.primary' } }}
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        label="First Name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        fullWidth
                                        size="small"
                                        autoFocus
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Last Name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        fullWidth
                                        size="small"
                                    />
                                </Grid>
                            </Grid>
                            <Box>
                                <TextField
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    fullWidth
                                    size="small"
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                >
                                                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                {password && (
                                    <Box sx={{ mt: 1 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Password strength
                                            </Typography>
                                            <Typography variant="caption" color={`${passwordStrength.color}.main`} fontWeight={600}>
                                                {passwordStrength.label}
                                            </Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={passwordStrength.score}
                                            color={passwordStrength.color}
                                            sx={{ height: 4, borderRadius: 2 }}
                                        />
                                    </Box>
                                )}
                            </Box>
                            <TextField
                                label="Confirm Password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                fullWidth
                                size="small"
                                error={passwordsMismatch}
                                helperText={passwordsMismatch ? 'Passwords do not match' : passwordsMatch ? 'Passwords match' : ''}
                                color={passwordsMatch ? 'success' : undefined}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            {passwordsMatch ? (
                                                <IconCheck size={18} color="#13DEB9" />
                                            ) : (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    edge="end"
                                                >
                                                    {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                                </IconButton>
                                            )}
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                label="Phone (optional)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                fullWidth
                                size="small"
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={submitting || !firstName || !lastName || !password || !confirmPassword}
                                sx={{
                                    py: 1.5,
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                }}
                            >
                                {submitting ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
                            </Button>
                        </Stack>
                    </form>

                    <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ mt: 2 }}>
                        Already have an account?{' '}
                        <Typography
                            component="a"
                            href="/auth/login"
                            variant="caption"
                            sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
                        >
                            Sign in
                        </Typography>
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AcceptInvite;
