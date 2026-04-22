/**
 * UserFormModal - Comprehensive user management modal
 * Extracted from OrthodoxMetrics with enhanced TypeScript support
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Box,
    Switch,
    FormControlLabel,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment,
    Chip,
    Stack,
    Typography
} from '@mui/material';
import {
    IconX,
    IconEye,
    IconEyeOff,
    IconRefresh,
    IconCopy
} from '@tabler/icons-react';

// Types
export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    church_id?: number;
    church_name?: string;
    preferred_language: string;
    is_active: boolean;
}

export interface Church {
    id: number;
    name: string;
}

export interface UpdateUser {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    church_id: string | null;
    preferred_language: string;
    is_active: boolean;
}

export interface ResetPasswordData {
    new_password: string;
    confirm_password: string;
    auto_generate: boolean;
}

export interface RoleOption {
    value: string;
    label: string;
    description: string;
}

export interface UserFormModalProps {
    open: boolean;
    onClose: () => void;
    user: User | null;
    churches: Church[];
    mode: 'edit' | 'reset-password' | 'delete-confirm';
    onSubmit: (data: UpdateUser | ResetPasswordData | { confirm: boolean }) => Promise<void>;
    loading?: boolean;
    currentUserRole?: string;
    availableRoles?: RoleOption[];
    SocialPermissionsComponent?: React.ComponentType<{
        userId: number;
        userEmail: string;
        userRole: string;
    }>;
}

/**
 * Comprehensive user management modal supporting edit, password reset, and deletion
 * 
 * @example
 * ```tsx
 * <UserFormModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   user={selectedUser}
 *   churches={churches}
 *   mode="edit"
 *   onSubmit={handleUserUpdate}
 *   currentUserRole="super_admin"
 * />
 * ```
 */
export const UserFormModal: React.FC<UserFormModalProps> = ({
    open,
    onClose,
    user,
    churches,
    mode,
    onSubmit,
    loading = false,
    currentUserRole = 'admin',
    availableRoles,
    SocialPermissionsComponent
}) => {
    // Edit user form state
    const [formData, setFormData] = useState<UpdateUser>({
        email: '',
        first_name: '',
        last_name: '',
        role: 'editor',
        church_id: null,
        preferred_language: 'en',
        is_active: true
    });

    // Reset password form state
    const [passwordData, setPasswordData] = useState<ResetPasswordData>({
        new_password: '',
        confirm_password: '',
        auto_generate: false
    });

    const [showPassword, setShowPassword] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [generatedPassword, setGeneratedPassword] = useState('');

    // Default role options if not provided
    const defaultRoles: RoleOption[] = [
        { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
        { value: 'editor', label: 'Editor', description: 'Can edit records/content' },
        { value: 'deacon', label: 'Deacon', description: 'Partial clergy privileges' },
        { value: 'priest', label: 'Priest', description: 'Full clergy privileges' },
        { value: 'church_admin', label: 'Church Administrator', description: 'Church-specific admin access' }
    ];

    // Initialize form data when user changes
    useEffect(() => {
        if (user && mode === 'edit') {
            setFormData({
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                church_id: user.church_id?.toString() || null,
                preferred_language: user.preferred_language || 'en',
                is_active: user.is_active
            });
        }
    }, [user, mode, churches]);

    // Reset form state when modal closes
    useEffect(() => {
        if (!open) {
            setFormErrors({});
            setPasswordData({
                new_password: '',
                confirm_password: '',
                auto_generate: false
            });
            setGeneratedPassword('');
            setShowPassword(false);
        }
    }, [open]);

    const validateEditForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!formData.first_name.trim()) {
            errors.first_name = 'First name is required';
        }

        if (!formData.last_name.trim()) {
            errors.last_name = 'Last name is required';
        }

        if (!formData.role) {
            errors.role = 'Role is required';
        }

        // Church selection is only required for non-super_admin users
        if (!formData.church_id && formData.role !== 'super_admin') {
            errors.church_id = 'Church selection is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validatePasswordForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!passwordData.auto_generate) {
            if (!passwordData.new_password) {
                errors.new_password = 'New password is required';
            } else if (passwordData.new_password.length < 8) {
                errors.new_password = 'Password must be at least 8 characters long';
            }

            if (!passwordData.confirm_password) {
                errors.confirm_password = 'Please confirm the password';
            } else if (passwordData.new_password !== passwordData.confirm_password) {
                errors.confirm_password = 'Passwords do not match';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleGeneratePassword = () => {
        // Generate secure password
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        const length = 16;
        let password = '';
        
        // Ensure at least one character from each category
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*';
        
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        
        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        // Shuffle the password
        const shuffledPassword = password.split('').sort(() => Math.random() - 0.5).join('');
        
        setGeneratedPassword(shuffledPassword);
        setPasswordData(prev => ({
            ...prev,
            new_password: shuffledPassword,
            confirm_password: shuffledPassword,
            auto_generate: true
        }));
    };

    const handleCopyPassword = async () => {
        if (generatedPassword && navigator.clipboard) {
            await navigator.clipboard.writeText(generatedPassword);
        }
    };

    const handleSubmit = async () => {
        if (mode === 'edit') {
            if (!validateEditForm()) return;
            await onSubmit(formData);
        } else if (mode === 'reset-password') {
            if (!validatePasswordForm()) return;
            await onSubmit(passwordData);
        } else if (mode === 'delete-confirm') {
            await onSubmit({ confirm: true });
        }
    };

    const canEditRole = (targetRole: string): boolean => {
        if (currentUserRole === 'super_admin') {
            return targetRole !== 'super_admin';
        }
        if (currentUserRole === 'admin') {
            return !['admin', 'super_admin'].includes(targetRole);
        }
        return false;
    };

    const getAvailableRoles = (): RoleOption[] => {
        const roles = availableRoles || defaultRoles;
        
        if (currentUserRole === 'super_admin') {
            return [
                ...roles,
                { value: 'admin', label: 'Administrator', description: 'Platform administrative access' }
            ];
        }

        return roles;
    };

    const getModalTitle = () => {
        switch (mode) {
            case 'edit':
                return `Edit User: ${user?.first_name} ${user?.last_name}`;
            case 'reset-password':
                return `Reset Password: ${user?.first_name} ${user?.last_name}`;
            case 'delete-confirm':
                return `Delete User: ${user?.first_name} ${user?.last_name}`;
            default:
                return 'User Management';
        }
    };

    const renderEditForm = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                    fullWidth
                    label="First Name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    error={!!formErrors.first_name}
                    helperText={formErrors.first_name}
                    disabled={loading}
                />
                <TextField
                    fullWidth
                    label="Last Name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    error={!!formErrors.last_name}
                    helperText={formErrors.last_name}
                    disabled={loading}
                />
            </Stack>

            <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                error={!!formErrors.email}
                helperText={formErrors.email || 'User will be notified of email changes'}
                disabled={loading}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth error={!!formErrors.role}>
                    <InputLabel>Role</InputLabel>
                    <Select
                        value={formData.role}
                        label="Role"
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        disabled={loading || !canEditRole(formData.role)}
                    >
                        {getAvailableRoles().map((role) => (
                            <MenuItem key={role.value} value={role.value}>
                                <Box>
                                    <Typography variant="body1">{role.label}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {role.description}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                    {formErrors.role && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                            {formErrors.role}
                        </Typography>
                    )}
                </FormControl>

                <FormControl fullWidth required={formData.role !== 'super_admin'} error={!!formErrors.church_id}>
                    <InputLabel>Church {formData.role !== 'super_admin' ? '*' : ''}</InputLabel>
                    <Select
                        value={formData.church_id || ''}
                        label={`Church ${formData.role !== 'super_admin' ? '*' : ''}`}
                        onChange={(e) => setFormData(prev => ({ ...prev, church_id: e.target.value || null }))}
                        disabled={loading}
                    >
                        <MenuItem value="">
                            {formData.role === 'super_admin' ? 'No specific church (Global access)' : 'Select a church...'}
                        </MenuItem>
                        {churches.sort((a, b) => a.name.localeCompare(b.name)).map((church) => (
                            <MenuItem key={church.id} value={church.id.toString()}>
                                {church.name}
                            </MenuItem>
                        ))}
                    </Select>
                    {formErrors.church_id && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                            {formErrors.church_id}
                        </Typography>
                    )}
                </FormControl>
            </Stack>

            <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                    value={formData.preferred_language}
                    label="Language"
                    onChange={(e) => setFormData(prev => ({ ...prev, preferred_language: e.target.value }))}
                    disabled={loading}
                >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="gr">Greek</MenuItem>
                    <MenuItem value="ru">Russian</MenuItem>
                    <MenuItem value="sr">Serbian</MenuItem>
                    <MenuItem value="bg">Bulgarian</MenuItem>
                    <MenuItem value="ro">Romanian</MenuItem>
                </Select>
            </FormControl>

            <FormControlLabel
                control={
                    <Switch
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        disabled={loading}
                    />
                }
                label={
                    <Box>
                        <Typography variant="body2">
                            Account Status
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formData.is_active ? 'User can access the system' : 'User access is disabled'}
                        </Typography>
                    </Box>
                }
            />
        </Box>
    );

    const renderPasswordForm = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <FormControlLabel
                control={
                    <Switch
                        checked={passwordData.auto_generate}
                        onChange={(e) => {
                            const autoGen = e.target.checked;
                            setPasswordData(prev => ({ ...prev, auto_generate: autoGen }));
                            if (autoGen) {
                                handleGeneratePassword();
                            } else {
                                setGeneratedPassword('');
                                setPasswordData(prev => ({ ...prev, new_password: '', confirm_password: '' }));
                            }
                        }}
                        disabled={loading}
                    />
                }
                label="Auto-generate secure password"
            />

            {passwordData.auto_generate && generatedPassword && (
                <Box sx={{ p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" color="primary">
                            Generated Password:
                        </Typography>
                        <IconButton size="small" onClick={handleGeneratePassword} disabled={loading}>
                            <IconRefresh size={16} />
                        </IconButton>
                        <IconButton size="small" onClick={handleCopyPassword} disabled={loading}>
                            <IconCopy size={16} />
                        </IconButton>
                    </Stack>
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            fontFamily: 'monospace', 
                            bgcolor: 'grey.100', 
                            p: 1, 
                            borderRadius: 0.5,
                            wordBreak: 'break-all'
                        }}
                    >
                        {generatedPassword}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Make sure to copy this password as it won't be shown again.
                    </Typography>
                </Box>
            )}

            {!passwordData.auto_generate && (
                <>
                    <TextField
                        fullWidth
                        label="New Password"
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                        error={!!formErrors.new_password}
                        helperText={formErrors.new_password || 'Minimum 8 characters with uppercase, lowercase, number, and symbol'}
                        disabled={loading}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={loading}
                                    >
                                        {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Confirm Password"
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                        error={!!formErrors.confirm_password}
                        helperText={formErrors.confirm_password}
                        disabled={loading}
                    />
                </>
            )}

            <Alert severity="info">
                The user will be notified via email about their password change and will be required to log in again.
            </Alert>
        </Box>
    );

    const renderDeleteConfirm = () => (
        <Box sx={{ mt: 1 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                    <strong>Are you sure you want to delete this user?</strong>
                </Typography>
                <Typography variant="body2">
                    This action cannot be undone. The user will lose access to:
                </Typography>
                <Box component="ul" sx={{ mt: 1, mb: 1 }}>
                    <li>All account data and settings</li>
                    <li>Access to church management system</li>
                    <li>Historical activity records</li>
                </Box>
                <Typography variant="body2">
                    Consider deactivating the user instead if you want to preserve their data.
                </Typography>
            </Alert>

            <Box sx={{ p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>User Details:</Typography>
                <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2"><strong>Name:</strong></Typography>
                        <Typography variant="body2">{user?.first_name} {user?.last_name}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2"><strong>Email:</strong></Typography>
                        <Typography variant="body2">{user?.email}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2"><strong>Role:</strong></Typography>
                        <Chip 
                            size="small" 
                            label={user?.role} 
                            color={user?.role === 'admin' || user?.role === 'super_admin' ? 'error' : 'primary'}
                        />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2"><strong>Church:</strong></Typography>
                        <Typography variant="body2">{user?.church_name || 'No Church'}</Typography>
                    </Stack>
                </Stack>
            </Box>
        </Box>
    );

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            fullScreen={window.innerWidth < 600}
            PaperProps={{
                sx: { 
                    minHeight: mode === 'delete-confirm' ? 400 : 500,
                    margin: { xs: 1, sm: 2 },
                    maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' }
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{getModalTitle()}</Typography>
                <IconButton onClick={onClose} disabled={loading}>
                    <IconX size={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {mode === 'edit' && renderEditForm()}
                {mode === 'reset-password' && renderPasswordForm()}
                {mode === 'delete-confirm' && renderDeleteConfirm()}
                
                {/* Social Permissions Section - Only show for edit mode if component provided */}
                {mode === 'edit' && user && SocialPermissionsComponent && (
                    <Box sx={{ mt: 3 }}>
                        <SocialPermissionsComponent
                            userId={user.id}
                            userEmail={user.email}
                            userRole={user.role}
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color={mode === 'delete-confirm' ? 'error' : 'primary'}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : undefined}
                >
                    {loading ? 'Processing...' : (
                        mode === 'edit' ? 'Save Changes' :
                        mode === 'reset-password' ? 'Reset Password' :
                        'Delete User'
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserFormModal;