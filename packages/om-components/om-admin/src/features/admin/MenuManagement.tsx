import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Switch,
    Chip,
    Alert,
    CircularProgress,
    Button,
    FormControlLabel,
    Tooltip,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import {
    IconChevronDown,
    IconMenu,
    IconLock,
    IconDeviceFloppy,
    IconRefresh
} from '@tabler/icons-react';

// contexts
import { useAuth } from '@/context/AuthContext';

// types
interface MenuItem {
    id: number;
    menu_key: string;
    title: string;
    path: string;
    icon: string;
    parent_id: number | null;
    display_order: number;
    is_system_required: boolean;
    description: string;
    permissions: {
        [role: string]: boolean;
    };
}

const roles = ['admin', 'church_admin', 'priest', 'deacon', 'editor', 'viewer'];

const MenuManagement: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [pendingChanges, setPendingChanges] = useState<any[]>([]);

    // Check if user has permission to access this page
    if (!isSuperAdmin()) {
        return (
            <Box p={3}>
                <Alert severity="error">
                    You do not have permission to access menu management. Only super administrators can manage menu permissions.
                </Alert>
            </Box>
        );
    }

    useEffect(() => {
        fetchMenuPermissions();
    }, []);

    const fetchMenuPermissions = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await apiClient.get<any>('/menu-management/permissions');

            if (data.success) {
                setMenuItems(data.menuPermissions);
            } else {
                setError(data.message || 'Failed to fetch menu permissions');
            }
        } catch (err) {
            console.error('Error fetching menu permissions:', err);
            setError('Failed to load menu permissions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = (menuItemId: number, role: string, isVisible: boolean) => {
        // Update local state
        setMenuItems(prevItems =>
            prevItems.map(item =>
                item.id === menuItemId
                    ? {
                        ...item,
                        permissions: {
                            ...item.permissions,
                            [role]: isVisible
                        }
                    }
                    : item
            )
        );

        // Track pending changes
        setPendingChanges(prev => {
            const existingIndex = prev.findIndex(
                change => change.menu_item_id === menuItemId && change.role === role
            );

            if (existingIndex >= 0) {
                // Update existing change
                const newChanges = [...prev];
                newChanges[existingIndex] = {
                    menu_item_id: menuItemId,
                    role: role,
                    is_visible: isVisible
                };
                return newChanges;
            } else {
                // Add new change
                return [...prev, {
                    menu_item_id: menuItemId,
                    role: role,
                    is_visible: isVisible
                }];
            }
        });
    };

    const saveChanges = async () => {
        if (pendingChanges.length === 0) {
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const data = await apiClient.put<any>('/menu-management/permissions', {
                updates: pendingChanges
            });

            if (data.success) {
                setSuccess(`Successfully updated ${data.updatedCount} menu permissions`);
                setPendingChanges([]);
                // Refresh data to ensure consistency
                setTimeout(() => {
                    fetchMenuPermissions();
                }, 1000);
            } else {
                setError(data.message || 'Failed to update menu permissions');
            }
        } catch (err) {
            console.error('Error saving menu permissions:', err);
            setError('Failed to save menu permissions. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getParentMenuItems = () => {
        return menuItems.filter(item => item.parent_id === null);
    };

    const getChildMenuItems = (parentId: number) => {
        return menuItems.filter(item => item.parent_id === parentId);
    };

    const renderMenuItemRow = (item: MenuItem, isChild: boolean = false) => {
        return (
            <TableRow key={item.id} sx={{ backgroundColor: isChild ? 'action.hover' : 'inherit' }}>
                <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                        {isChild && <Box width={20} />}
                        <Typography variant={isChild ? 'body2' : 'body1'} fontWeight={isChild ? 'normal' : 'medium'}>
                            {item.title}
                        </Typography>
                        {item.is_system_required && (
                            <Tooltip title="System required - cannot be disabled">
                                <IconLock size={16} color="orange" />
                            </Tooltip>
                        )}
                    </Box>
                    {item.description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                            {item.description}
                        </Typography>
                    )}
                </TableCell>
                <TableCell>
                    <Chip label={item.menu_key} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{item.path || '-'}</TableCell>
                {roles.map(role => (
                    <TableCell key={role} align="center">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={item.permissions[role] || false}
                                    onChange={(e) => handlePermissionChange(item.id, role, e.target.checked)}
                                    disabled={item.is_system_required && !item.permissions[role]}
                                    size="small"
                                />
                            }
                            label=""
                        />
                    </TableCell>
                ))}
            </TableRow>
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Menu Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Control which menu items are visible to each user role
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button
                        variant="outlined"
                        startIcon={<IconRefresh />}
                        onClick={fetchMenuPermissions}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<IconDeviceFloppy />}
                        onClick={saveChanges}
                        disabled={saving || pendingChanges.length === 0}
                    >
                        Save Changes {pendingChanges.length > 0 && `(${pendingChanges.length})`}
                    </Button>
                </Box>
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

            {pendingChanges.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    You have {pendingChanges.length} unsaved changes. Click "Save Changes" to apply them.
                </Alert>
            )}

            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <IconMenu />
                        <Typography variant="h6">
                            Menu Permissions by Role
                        </Typography>
                    </Box>

                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Menu Item</TableCell>
                                    <TableCell>Key</TableCell>
                                    <TableCell>Path</TableCell>
                                    {roles.map(role => (
                                        <TableCell key={role} align="center">
                                            <Typography variant="caption" fontWeight="bold">
                                                {role.replace('_', ' ').toUpperCase()}
                                            </Typography>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {getParentMenuItems().map(parentItem => (
                                    <React.Fragment key={parentItem.id}>
                                        {renderMenuItemRow(parentItem)}
                                        {getChildMenuItems(parentItem.id).map(childItem =>
                                            renderMenuItemRow(childItem, true)
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">
                            <IconLock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            System required items cannot be disabled and are always visible to all roles.
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default MenuManagement;
