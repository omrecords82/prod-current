import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
    Box,
    Typography,
    Switch,
    FormControlLabel,
    Alert,
    CircularProgress,
    Stack,
    Card,
    CardContent,
    Chip,
    Button,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Tooltip
} from '@mui/material';
import {
    IconUsers,
    IconArticle,
    IconUserPlus,
    IconMessageCircle,
    IconBell,
    IconCheck,
    IconX
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SocialPermission {
    id: number;
    menu_key: string;
    title: string;
    path: string;
    description: string;
    enabled: boolean;
}

interface SocialPermissionsToggleProps {
    userId: number;
    userEmail: string;
    userRole: string;
    onPermissionsChanged?: () => void;
}

const SocialPermissionsToggle: React.FC<SocialPermissionsToggleProps> = ({
    userId,
    userEmail,
    userRole,
    onPermissionsChanged
}) => {
    const { isSuperAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [permissions, setPermissions] = useState<SocialPermission[]>([]);
    const [socialEnabled, setSocialEnabled] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    // Icon mapping for social features
    const getIcon = (menuKey: string) => {
        switch (menuKey) {
            case 'social': return IconUsers;
            case 'social.blog': return IconArticle;
            case 'social.friends': return IconUserPlus;
            case 'social.chat': return IconMessageCircle;
            case 'social.notifications': return IconBell;
            default: return IconUsers;
        }
    };

    // Load user's social permissions
    const loadPermissions = async () => {
        try {
            setLoading(true);
            setError('');
            
            const data = await apiClient.get<any>(`/admin/social-permissions/user/${userId}`);
            if (data.success) {
                setPermissions(data.socialPermissions || []);
                
                // Check if any social features are enabled
                const hasEnabledFeatures = data.socialPermissions?.some((p: SocialPermission) => p.enabled) || false;
                setSocialEnabled(hasEnabledFeatures);
                
                console.log('📱 Loaded social permissions:', data);
            } else {
                setError(data.message || 'Failed to load social permissions');
            }
        } catch (err) {
            console.error('Error loading social permissions:', err);
            setError('Failed to load social permissions');
        } finally {
            setLoading(false);
        }
    };

    // Toggle social features on/off
    const toggleSocialFeatures = async (enabled: boolean) => {
        if (!isSuperAdmin()) {
            setError('Only super administrators can manage social permissions');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            const data = await apiClient.put<any>(`/admin/social-permissions/user/${userId}`, {
                enabled,
                socialItems: permissions.map(p => p.id)
            });
            if (data.success) {
                setSocialEnabled(enabled);
                setSuccess(data.message || `Social features ${enabled ? 'enabled' : 'disabled'} successfully`);
                
                // Reload permissions to reflect changes
                await loadPermissions();
                
                // Notify parent component
                if (onPermissionsChanged) {
                    onPermissionsChanged();
                }
                
                console.log('📱 Updated social permissions:', data);
            } else {
                setError(data.message || 'Failed to update social permissions');
            }
        } catch (err) {
            console.error('Error updating social permissions:', err);
            setError('Failed to update social permissions');
        } finally {
            setLoading(false);
        }
    };

    // Quick enable button
    const quickEnable = async () => {
        if (!isSuperAdmin()) {
            setError('Only super administrators can manage social permissions');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            const data = await apiClient.post<any>(`/admin/social-permissions/user/${userId}/enable`);
            if (data.success) {
                setSuccess(`Social features enabled for ${userEmail}`);
                await loadPermissions();
                
                if (onPermissionsChanged) {
                    onPermissionsChanged();
                }
                
                console.log('📱 Quick enabled social features:', data);
            } else {
                setError(data.message || 'Failed to enable social features');
            }
        } catch (err) {
            console.error('Error enabling social features:', err);
            setError('Failed to enable social features');
        } finally {
            setLoading(false);
        }
    };

    // Load permissions on component mount
    useEffect(() => {
        if (userId) {
            loadPermissions();
        }
    }, [userId]);

    // Auto-clear messages after 3 seconds
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    if (!isSuperAdmin()) {
        return (
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="body2" color="text.secondary">
                        Social permissions management is only available to super administrators.
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="outlined">
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconUsers size={20} />
                        Social Features
                    </Typography>
                    
                    {loading && <CircularProgress size={20} />}
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                    </Alert>
                )}

                <Stack spacing={2}>
                    {/* Main Toggle */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={socialEnabled}
                                onChange={(e) => toggleSocialFeatures(e.target.checked)}
                                disabled={loading}
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="body1">
                                    Enable Social Features
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Allow this user to access social features (role: {userRole})
                                </Typography>
                            </Box>
                        }
                    />

                    {/* Quick Actions */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={quickEnable}
                            disabled={loading || socialEnabled}
                            startIcon={<IconCheck size={16} />}
                        >
                            Quick Enable
                        </Button>
                        
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => toggleSocialFeatures(false)}
                            disabled={loading || !socialEnabled}
                            startIcon={<IconX size={16} />}
                        >
                            Disable All
                        </Button>
                    </Box>

                    {/* Feature List */}
                    {permissions.length > 0 && (
                        <>
                            <Divider />
                            <Typography variant="subtitle2" color="text.secondary">
                                Available Social Features:
                            </Typography>
                            
                            <List dense>
                                {permissions.map((permission) => {
                                    const IconComponent = getIcon(permission.menu_key);
                                    return (
                                        <ListItem key={permission.id} sx={{ py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                <IconComponent size={18} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={permission.title}
                                                secondary={permission.description}
                                                primaryTypographyProps={{ variant: 'body2' }}
                                                secondaryTypographyProps={{ variant: 'caption' }}
                                            />
                                            <Chip
                                                label={permission.enabled ? 'Enabled' : 'Disabled'}
                                                size="small"
                                                color={permission.enabled ? 'success' : 'default'}
                                                variant={permission.enabled ? 'filled' : 'outlined'}
                                            />
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </>
                    )}

                    {/* Status Info */}
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Social features are managed per user role. Changes affect all users with the "{userRole}" role.
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default SocialPermissionsToggle; 