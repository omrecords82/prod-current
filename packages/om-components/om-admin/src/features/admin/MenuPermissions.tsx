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
    Chip,
    Switch,
    FormControlLabel,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    OutlinedInput,
    Alert,
    Snackbar,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Security as SecurityIcon,
    Menu as MenuIcon
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

interface MenuItemPermission {
    id: number;
    menu_key: string;
    title: string;
    path: string;
    icon: string;
    parent_id: number | null;
    sort_order: number;
    description: string;
    is_active: boolean;
    allowed_roles: string[];
}

interface MenuPermissionsState {
    menuItems: MenuItemPermission[];
    availableRoles: string[];
}

const MenuPermissionsManagement: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const [menuData, setMenuData] = useState<MenuPermissionsState>({
        menuItems: [],
        availableRoles: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Dialog states
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemPermission | null>(null);

    // Form states
    const [newMenuItem, setNewMenuItem] = useState({
        menu_key: '',
        title: '',
        path: '',
        icon: '',
        parent_id: null as number | null,
        sort_order: 999,
        description: '',
        allowedRoles: [] as string[]
    });

    // Check if user has super admin access
    if (!isSuperAdmin()) {
        return (
            <Box p={3}>
                <Alert severity="error">
                    You do not have permission to access menu permissions management.
                    This feature is only available to super administrators.
                </Alert>
            </Box>
        );
    }

    // Load menu permissions data
    useEffect(() => {
        loadMenuPermissions();
    }, []);

    const loadMenuPermissions = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get<any>('/menu-permissions');
            if (data.success) {
                setMenuData({
                    menuItems: data.menuItems,
                    availableRoles: data.availableRoles
                });
            } else {
                throw new Error(data.message || 'Failed to load menu permissions');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load menu permissions');
        } finally {
            setLoading(false);
        }
    };

    // Update menu permissions for a specific menu item
    const updateMenuPermissions = async (menuId: number, allowedRoles: string[]) => {
        try {
            const data = await apiClient.put<any>(`/menu-permissions/${menuId}`, { allowedRoles });
            if (data.success) {
                setSuccess('Menu permissions updated successfully');
                loadMenuPermissions(); // Reload data
            } else {
                throw new Error(data.message || 'Failed to update menu permissions');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update menu permissions');
        }
    };

    // Handle role toggle for a menu item
    const handleRoleToggle = (menuItem: MenuItemPermission, role: string, checked: boolean) => {
        let updatedRoles = [...menuItem.allowed_roles];

        if (checked) {
            if (!updatedRoles.includes(role)) {
                updatedRoles.push(role);
            }
        } else {
            updatedRoles = updatedRoles.filter(r => r !== role);
        }

        updateMenuPermissions(menuItem.id, updatedRoles);
    };

    // Create new menu item
    const handleCreateMenuItem = async () => {
        try {
            const data = await apiClient.post<any>('/menu-permissions/menu-item', newMenuItem);
            if (data.success) {
                setSuccess('Menu item created successfully');
                setCreateDialogOpen(false);
                setNewMenuItem({
                    menu_key: '',
                    title: '',
                    path: '',
                    icon: '',
                    parent_id: null,
                    sort_order: 999,
                    description: '',
                    allowedRoles: []
                });
                loadMenuPermissions();
            } else {
                throw new Error(data.message || 'Failed to create menu item');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create menu item');
        }
    };

    // Group menu items by parent
    const groupedMenuItems = menuData.menuItems.reduce((groups, item) => {
        const parentId = item.parent_id || 'root';
        if (!groups[parentId]) {
            groups[parentId] = [];
        }
        groups[parentId].push(item);
        return groups;
    }, {} as Record<string, MenuItemPermission[]>);

    const renderMenuPermissionsTable = (items: MenuItemPermission[], title: string) => (
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={1}>
                    <MenuIcon />
                    <Typography variant="h6">{title}</Typography>
                    <Chip size="small" label={`${items.length} items`} />
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Menu Item</strong></TableCell>
                                <TableCell><strong>Path</strong></TableCell>
                                <TableCell><strong>Sort Order</strong></TableCell>
                                {menuData.availableRoles.map(role => (
                                    <TableCell key={role} align="center">
                                        <strong>{role}</strong>
                                    </TableCell>
                                ))}
                                <TableCell><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((menuItem) => (
                                <TableRow key={menuItem.id}>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" fontWeight="medium">
                                                {menuItem.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {menuItem.menu_key}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontFamily="monospace">
                                            {menuItem.path || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="small" label={menuItem.sort_order} />
                                    </TableCell>
                                    {menuData.availableRoles.map(role => (
                                        <TableCell key={role} align="center">
                                            <Switch
                                                checked={menuItem.allowed_roles.includes(role)}
                                                onChange={(e) => handleRoleToggle(menuItem, role, e.target.checked)}
                                                size="small"
                                                color="primary"
                                            />
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <Tooltip title="Edit Menu Item">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedMenuItem(menuItem);
                                                    setEditDialogOpen(true);
                                                }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </AccordionDetails>
        </Accordion>
    );

    if (loading) {
        return (
            <Box p={3}>
                <Typography>Loading menu permissions...</Typography>
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <SecurityIcon color="primary" />
                    <Typography variant="h4">Menu Permissions Management</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    Add Menu Item
                </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
                As a super administrator, you can control which menu items are visible to different user roles.
                Toggle the switches to grant or revoke access to specific menu items for each role.
            </Alert>

            <Card>
                <CardContent>
                    {/* Root menu items */}
                    {groupedMenuItems.root && renderMenuPermissionsTable(
                        groupedMenuItems.root,
                        'Main Menu Items'
                    )}

                    {/* Submenu items grouped by parent */}
                    {Object.entries(groupedMenuItems)
                        .filter(([parentId]) => parentId !== 'root')
                        .map(([parentId, items]) => {
                            const parent = menuData.menuItems.find(item => item.id.toString() === parentId);
                            return renderMenuPermissionsTable(
                                items,
                                `${parent?.title || 'Unknown'} - Submenu Items`
                            );
                        })}
                </CardContent>
            </Card>

            {/* Create Menu Item Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create New Menu Item</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            fullWidth
                            label="Menu Key"
                            value={newMenuItem.menu_key}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, menu_key: e.target.value })}
                            required
                            helperText="Unique identifier for this menu item"
                        />
                        <TextField
                            fullWidth
                            label="Title"
                            value={newMenuItem.title}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, title: e.target.value })}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Path"
                            value={newMenuItem.path}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, path: e.target.value })}
                            helperText="Route path (e.g., /admin/users)"
                        />
                        <TextField
                            fullWidth
                            label="Icon"
                            value={newMenuItem.icon}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, icon: e.target.value })}
                            helperText="Icon component name"
                        />
                        <TextField
                            fullWidth
                            label="Sort Order"
                            type="number"
                            value={newMenuItem.sort_order}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, sort_order: parseInt(e.target.value) })}
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            multiline
                            rows={2}
                            value={newMenuItem.description}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Allowed Roles</InputLabel>
                            <Select
                                multiple
                                value={newMenuItem.allowedRoles}
                                onChange={(e) => setNewMenuItem({
                                    ...newMenuItem,
                                    allowedRoles: e.target.value as string[]
                                })}
                                input={<OutlinedInput label="Allowed Roles" />}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {(selected as string[]).map((value) => (
                                            <Chip key={value} label={value} size="small" />
                                        ))}
                                    </Box>
                                )}
                            >
                                {menuData.availableRoles.map((role) => (
                                    <MenuItem key={role} value={role}>
                                        {role}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateMenuItem} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Success/Error Snackbars */}
            <Snackbar
                open={!!success}
                autoHideDuration={4000}
                onClose={() => setSuccess(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default MenuPermissionsManagement;
