import Grid2 from '@/components/compat/Grid2';
import React, { useState, useEffect } from 'react';
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
    Chip,
    Switch,
    Button,
    Alert,
    Tabs,
    Tab,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider
} from '@mui/material';
import {
    IconShield,
    IconUsers,
    IconMenu2,
    IconDashboard,
    IconApps,
    IconSettings,
    IconChevronDown,
    IconCheck,
    IconX,
    IconEye,
    IconEyeOff
} from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import BlankCard from '@/shared/ui/BlankCard';

const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {
        to: '/dashboards/orthodmetrics',
        title: 'Admin Dashboard',
    },
    {
        title: 'OM Permission Center',
    },
];

interface Permission {
    id: string;
    name: string;
    description: string;
    category: string;
}

interface Role {
    id: number;
    name: string;
    display_name: string;
    description: string;
    level: number;
}

interface MenuPermission {
    menu_key: string;
    title: string;
    path: string;
    icon: string;
    roles: {
        [roleName: string]: boolean;
    };
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`permissions-tabpanel-${index}`}
            aria-labelledby={`permissions-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

const PermissionsManagement: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [roles, setRoles] = useState<Role[]>([]);
    const [menuPermissions, setMenuPermissions] = useState<MenuPermission[]>([]);
    const [systemPermissions, setSystemPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Sample data - replace with API calls
    const sampleRoles: Role[] = [
        { id: 1, name: 'super_admin', display_name: 'Super Administrator', description: 'Full system access', level: 10 },
        { id: 2, name: 'admin', display_name: 'Administrator', description: 'Administrative access', level: 8 },
        { id: 3, name: 'priest', display_name: 'Priest', description: 'Clergy access', level: 6 },
        { id: 4, name: 'deacon', display_name: 'Deacon', description: 'Deacon access', level: 5 },
        { id: 5, name: 'church_admin', display_name: 'Church Administrator', description: 'Church management', level: 4 },
        { id: 6, name: 'cantor', display_name: 'Cantor', description: 'Liturgical assistant', level: 3 },
        { id: 7, name: 'member', display_name: 'Church Member', description: 'Basic member access', level: 2 },
        { id: 8, name: 'guest', display_name: 'Guest', description: 'Limited guest access', level: 1 }
    ];

    const sampleMenuPermissions: MenuPermission[] = [
        {
            menu_key: 'dashboards',
            title: 'Dashboards',
            path: '/dashboards',
            icon: 'IconDashboard',
            roles: {
                super_admin: true,
                admin: true,
                priest: true,
                deacon: true,
                church_admin: true,
                cantor: true,
                member: true,
                guest: false
            }
        },
        {
            menu_key: 'admin_dashboard',
            title: 'Admin Dashboard',
            path: '/dashboards/orthodmetrics',
            icon: 'IconShield',
            roles: {
                super_admin: true,
                admin: true,
                priest: false,
                deacon: false,
                church_admin: false,
                cantor: false,
                member: false,
                guest: false
            }
        },
        {
            menu_key: 'user_management',
            title: 'User Management',
            path: '/admin/users',
            icon: 'IconUsers',
            roles: {
                super_admin: true,
                admin: true,
                priest: false,
                deacon: false,
                church_admin: false,
                cantor: false,
                member: false,
                guest: false
            }
        },
        {
            menu_key: 'records_management',
            title: 'Records Management',
            path: '/apps/records',
            icon: 'IconDatabase',
            roles: {
                super_admin: true,
                admin: true,
                priest: true,
                deacon: true,
                church_admin: true,
                cantor: false,
                member: false,
                guest: false
            }
        },
        {
            menu_key: 'liturgical_calendar',
            title: 'Orthodox Calendar',
            path: '/apps/liturgical-calendar',
            icon: 'IconCalendar',
            roles: {
                super_admin: true,
                admin: true,
                priest: true,
                deacon: true,
                church_admin: true,
                cantor: true,
                member: true,
                guest: true
            }
        }
    ];

    const sampleSystemPermissions: Permission[] = [
        { id: 'can_edit_baptism', name: 'Edit Baptism Records', description: 'Allow editing baptism records', category: 'Records' },
        { id: 'can_edit_marriage', name: 'Edit Marriage Records', description: 'Allow editing marriage records', category: 'Records' },
        { id: 'can_edit_funeral', name: 'Edit Funeral Records', description: 'Allow editing funeral records', category: 'Records' },
        { id: 'can_manage_users', name: 'Manage Users', description: 'Create, edit, and delete user accounts', category: 'Administration' },
        { id: 'can_manage_churches', name: 'Manage Churches', description: 'Manage church information and settings', category: 'Administration' },
        { id: 'can_view_analytics', name: 'View Analytics', description: 'Access analytics and reporting features', category: 'Analytics' },
        { id: 'can_export_data', name: 'Export Data', description: 'Export data to various formats', category: 'Data' },
        { id: 'can_import_data', name: 'Import Data', description: 'Import data from external sources', category: 'Data' }
    ];

    useEffect(() => {
        loadPermissionsData();
    }, []);

    const loadPermissionsData = async () => {
        try {
            setLoading(true);
            // TODO: Replace with actual API calls
            setRoles(sampleRoles);
            setMenuPermissions(sampleMenuPermissions);
            setSystemPermissions(sampleSystemPermissions);
        } catch (error) {
            setError('Failed to load permissions data');
            console.error('Error loading permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleMenuPermissionChange = (menuKey: string, roleName: string, hasPermission: boolean) => {
        setMenuPermissions(prev => 
            prev.map(menu => 
                menu.menu_key === menuKey 
                    ? { ...menu, roles: { ...menu.roles, [roleName]: hasPermission } }
                    : menu
            )
        );
        
        // TODO: Send API request to update permission
        console.log(`Updating ${menuKey} for ${roleName}: ${hasPermission}`);
    };

    const getRoleColor = (roleName: string) => {
        const colors: { [key: string]: string } = {
            super_admin: 'error',
            admin: 'warning',
            priest: 'primary',
            deacon: 'secondary',
            church_admin: 'info',
            cantor: 'success',
            member: 'default',
            guest: 'default'
        };
        return colors[roleName] || 'default';
    };

    const getPermissionIcon = (hasPermission: boolean) => {
        return hasPermission ? (
            <IconCheck size={16} color="green" />
        ) : (
            <IconX size={16} color="red" />
        );
    };

    if (loading) {
        return (
            <PageContainer title="OM Permission Center" description="Manage role-based permissions">
                <Breadcrumb title="OM Permission Center" items={BCrumb} />
                <Typography>Loading permissions data...</Typography>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="OM Permission Center" description="Manage role-based permissions">
            <Breadcrumb title="OM Permission Center" items={BCrumb} />
            
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {successMessage}
                </Alert>
            )}

            <BlankCard>
                <CardContent>
                    <Typography variant="h4" gutterBottom>
                        <IconShield style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        OM Permission Center
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Configure which roles can access specific content and features
                    </Typography>

                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
                        <Tabs value={tabValue} onChange={handleTabChange}>
                            <Tab 
                                label="Role Overview" 
                                icon={<IconUsers size={20} />}
                                iconPosition="start"
                            />
                            <Tab 
                                label="Menu Permissions" 
                                icon={<IconMenu2 size={20} />}
                                iconPosition="start"
                            />
                            <Tab 
                                label="System Permissions" 
                                icon={<IconSettings size={20} />}
                                iconPosition="start"
                            />
                        </Tabs>
                    </Box>

                    <TabPanel value={tabValue} index={0}>
                        <Typography variant="h6" gutterBottom>
                            Role Hierarchy
                        </Typography>
                        <Grid2 container spacing={3}>
                            {roles.map((role) => (
                                <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={role.id}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                                <Chip 
                                                    label={role.display_name} 
                                                    color={getRoleColor(role.name) as any}
                                                    variant="filled"
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    Level {role.level}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {role.description}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid2>
                            ))}
                        </Grid2>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <Typography variant="h6" gutterBottom>
                            Menu Access Permissions
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Menu Item</strong></TableCell>
                                        <TableCell><strong>Path</strong></TableCell>
                                        {roles.map((role) => (
                                            <TableCell key={role.name} align="center">
                                                <Chip 
                                                    label={role.display_name}
                                                    color={getRoleColor(role.name) as any}
                                                    size="small"
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {menuPermissions.map((menu) => (
                                        <TableRow key={menu.menu_key}>
                                            <TableCell>
                                                <Box display="flex" alignItems="center">
                                                    <IconDashboard size={16} style={{ marginRight: 8 }} />
                                                    {menu.title}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {menu.path}
                                                </Typography>
                                            </TableCell>
                                            {roles.map((role) => (
                                                <TableCell key={role.name} align="center">
                                                    <Switch
                                                        checked={menu.roles[role.name] || false}
                                                        onChange={(e) => handleMenuPermissionChange(
                                                            menu.menu_key,
                                                            role.name,
                                                            e.target.checked
                                                        )}
                                                        size="small"
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </TabPanel>

                    <TabPanel value={tabValue} index={2}>
                        <Typography variant="h6" gutterBottom>
                            System Feature Permissions
                        </Typography>
                        
                        {['Records', 'Administration', 'Analytics', 'Data'].map((category) => (
                            <Accordion key={category} defaultExpanded>
                                <AccordionSummary expandIcon={<IconChevronDown />}>
                                    <Typography variant="subtitle1" fontWeight="600">
                                        {category} Permissions
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <List>
                                        {systemPermissions
                                            .filter(perm => perm.category === category)
                                            .map((permission) => (
                                                <React.Fragment key={permission.id}>
                                                    <ListItem>
                                                        <ListItemIcon>
                                                            <IconShield size={20} />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={permission.name}
                                                            secondary={permission.description}
                                                        />
                                                        <Box display="flex" gap={1}>
                                                            {roles.map((role) => (
                                                                <Chip
                                                                    key={role.name}
                                                                    label={role.display_name}
                                                                    color={getRoleColor(role.name) as any}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            ))}
                                                        </Box>
                                                    </ListItem>
                                                    <Divider />
                                                </React.Fragment>
                                            ))
                                        }
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </TabPanel>

                    <Box mt={4} display="flex" gap={2}>
                        <Button variant="contained" color="primary">
                            Save Changes
                        </Button>
                        <Button variant="outlined" onClick={loadPermissionsData}>
                            Reset Changes
                        </Button>
                    </Box>
                </CardContent>
            </BlankCard>
        </PageContainer>
    );
};

export default PermissionsManagement;

