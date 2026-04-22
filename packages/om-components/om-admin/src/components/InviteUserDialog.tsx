import React, { useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Stack,
    Typography,
    IconButton,
    InputAdornment,
    CircularProgress,
    Box,
    Divider,
    Avatar,
    ListItemText
} from '@mui/material';
import { IconCopy, IconCheck, IconSend, IconMail } from '@tabler/icons-react';
import { Church } from '@/shared/lib/userService';

interface InviteUserDialogProps {
    open: boolean;
    onClose: () => void;
    churches: Church[];
    currentUserRole: string;
}

const EXPIRATION_OPTIONS = [
    { value: 7, label: '7 days', description: 'Short-term trial' },
    { value: 30, label: '30 days', description: 'Monthly access' },
    { value: 90, label: '90 days', description: 'Quarterly access' },
    { value: 180, label: '6 months', description: 'Extended access' },
    { value: 365, label: '1 year', description: 'Full annual access' },
];

const ROLE_OPTIONS = [
    { value: 'viewer', label: 'Viewer', description: 'Can view records but cannot make changes' },
    { value: 'user', label: 'User', description: 'Can view and edit assigned records' },
    { value: 'moderator', label: 'Moderator', description: 'Can manage content and moderate activity' },
    { value: 'priest', label: 'Priest', description: 'Full access to sacramental records for their parish' },
    { value: 'manager', label: 'Manager', description: 'Can manage users and church settings' },
    { value: 'admin', label: 'Admin', description: 'Platform-wide administrative access' },
    { value: 'super_admin', label: 'Super Admin', description: 'Full system access including admin management' },
];

const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({ open, onClose, churches, currentUserRole }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');
    const [churchId, setChurchId] = useState<string>('');
    const [expirationDays, setExpirationDays] = useState<number>(90);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [inviteUrl, setInviteUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const availableRoles = currentUserRole === 'super_admin'
        ? ROLE_OPTIONS
        : ROLE_OPTIONS.filter(r => !['admin', 'super_admin'].includes(r.value));

    const emailError = emailTouched && email && !isValidEmail(email);
    const selectedRole = ROLE_OPTIONS.find(r => r.value === role);

    const handleSubmit = async () => {
        if (!email) {
            setError('Email is required.');
            return;
        }

        if (!isValidEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await apiClient.post<any>('/admin/invites', {
                email,
                role,
                church_id: churchId || null,
                expiration_days: expirationDays,
            });

            if (!data.success) {
                setError(data.message || 'Failed to create invite.');
                return;
            }

            setInviteUrl(data.invite_url);
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = inviteUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setEmail('');
        setRole('user');
        setChurchId('');
        setExpirationDays(90);
        setError('');
        setEmailTouched(false);
        setInviteUrl('');
        setCopied(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                        <IconMail size={22} />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                            {inviteUrl ? 'Invitation Sent' : 'Invite User'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {inviteUrl
                                ? 'Share the invite link with the recipient'
                                : 'Send an invitation to join the platform'
                            }
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2.5 }}>
                {inviteUrl ? (
                    <Stack spacing={2}>
                        <Alert severity="success" icon={<IconCheck size={20} />}>
                            Invitation sent to <strong>{email}</strong>. An email with the invite link has been delivered.
                        </Alert>

                        <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                Invite Link (valid for 7 days)
                            </Typography>
                            <TextField
                                fullWidth
                                value={inviteUrl}
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={handleCopy} size="small">
                                                {copied ? <IconCheck size={18} color="#13DEB9" /> : <IconCopy size={18} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                    sx: { fontFamily: 'monospace', fontSize: '0.8rem' },
                                }}
                                size="small"
                            />
                            {copied && (
                                <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                                    Copied to clipboard
                                </Typography>
                            )}
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                            The recipient can also use this link if the email doesn't arrive. The link will expire in 7 days.
                        </Typography>
                    </Stack>
                ) : (
                    <Stack spacing={2.5}>
                        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

                        {/* Email */}
                        <TextField
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setEmailTouched(true)}
                            fullWidth
                            required
                            size="small"
                            error={!!emailError}
                            helperText={emailError ? 'Please enter a valid email address' : ''}
                            autoFocus
                        />

                        <Divider />

                        {/* Role */}
                        <Box>
                            <FormControl fullWidth required size="small">
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    label="Role"
                                    renderValue={(value) => ROLE_OPTIONS.find(r => r.value === value)?.label || value}
                                >
                                    {availableRoles.map((r) => (
                                        <MenuItem key={r.value} value={r.value}>
                                            <ListItemText
                                                primary={r.label}
                                                secondary={r.description}
                                                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                                secondaryTypographyProps={{ variant: 'caption' }}
                                            />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {selectedRole && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', pl: 0.5 }}>
                                    {selectedRole.description}
                                </Typography>
                            )}
                        </Box>

                        {/* Church */}
                        <FormControl fullWidth size="small">
                            <InputLabel>Church (optional)</InputLabel>
                            <Select
                                value={churchId}
                                onChange={(e) => setChurchId(e.target.value as string)}
                                label="Church (optional)"
                            >
                                <MenuItem value="">None</MenuItem>
                                {churches.sort((a, b) => a.name.localeCompare(b.name)).map((church) => (
                                    <MenuItem key={church.id} value={String(church.id)}>
                                        {church.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Account Duration */}
                        <FormControl fullWidth required size="small">
                            <InputLabel>Account Duration</InputLabel>
                            <Select
                                value={expirationDays}
                                onChange={(e) => setExpirationDays(Number(e.target.value))}
                                label="Account Duration"
                            >
                                {EXPIRATION_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        <ListItemText
                                            primary={opt.label}
                                            secondary={opt.description}
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                            secondaryTypographyProps={{ variant: 'caption' }}
                                        />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box sx={{ bgcolor: 'info.lighter', borderRadius: 1.5, p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                The invite link will be valid for <strong>7 days</strong>. Once accepted, the account will remain active for{' '}
                                <strong>{EXPIRATION_OPTIONS.find(o => o.value === expirationDays)?.label}</strong>.
                                An email with the invitation will be sent automatically.
                            </Typography>
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={handleClose} size="small">
                    {inviteUrl ? 'Done' : 'Cancel'}
                </Button>
                {!inviteUrl && (
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading || !email || !!emailError}
                        size="small"
                        startIcon={loading ? <CircularProgress size={16} /> : <IconSend size={16} />}
                    >
                        Send Invite
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default InviteUserDialog;
