// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    Grid,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Tab,
    Tabs,
    Typography
} from '@mui/material';
import {
    IconActivity,
    IconAlertTriangle,
    IconBrain,
    IconBug,
    IconBuilding,
    IconCheck,
    IconCode,
    IconDatabase,
    IconEdit,
    IconExternalLink,
    IconEye,
    IconFiles,
    IconFileText,
    IconLock,
    IconMail,
    IconMenu2,
    IconNews,
    IconNotebook,
    IconServer,
    IconSettings,
    IconShield,
    IconSitemap,
    IconStar,
    IconTerminal,
    IconTool,
    IconTrendingDown,
    IconTrendingUp,
    IconUsers
} from '@tabler/icons-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/shared/ui/PageContainer';
import { useAuth } from '@/context/AuthContext';
import ChurchToolsPanel from './OrthodoxMetrics/ChurchToolsPanel';

// Tab Components

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
            id={`orthodox-tabpanel-${index}`}
            aria-labelledby={`orthodox-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 0 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `orthodox-tab-${index}`,
        'aria-controls': `orthodox-tabpanel-${index}`,
    };
}

// Mock data for recent actions and system events
const getRecentUserActions = () => [
    {
        id: 1,
        user: 'Father Michael',
        action: 'Updated church information',
        time: '2 minutes ago',
        avatar: 'FM',
        color: 'primary'
    },
    {
        id: 2,
        user: 'Maria Popescu',
        action: 'Added new member',
        time: '15 minutes ago',
        avatar: 'MP',
        color: 'success'
    },
    {
        id: 3,
        user: 'Administrator',
        action: 'Modified user permissions',
        time: '1 hour ago',
        avatar: 'AD',
        color: 'warning'
    },
    {
        id: 4,
        user: 'John Smith',
        action: 'Failed login attempt',
        time: '2 hours ago',
        avatar: 'JS',
        color: 'error'
    }
];

const getSystemEvents = () => [
    {
        id: 1,
        event: 'Database backup completed',
        time: '3:00 AM',
        status: 'success',
        icon: <IconDatabase size={20} />
    },
    {
        id: 2,
        event: 'Email service restarted',
        time: '2:30 AM',
        status: 'info',
        icon: <IconMail size={20} />
    },
    {
        id: 3,
        event: 'High memory usage detected',
        time: '1:45 AM',
        status: 'warning',
        icon: <IconAlertTriangle size={20} />
    },
    {
        id: 4,
        event: 'SSL certificate updated',
        time: '12:15 AM',
        status: 'success',
        icon: <IconCheck size={20} />
    }
];

const QuickToolsContent = () => {
    const [subTabValue, setSubTabValue] = useState(0);
    const recentActions = getRecentUserActions();
    const systemEvents = getSystemEvents();
    const navigate = useNavigate();

    const quickToolsTabs = [
        { label: 'Recent Activity', icon: <IconActivity size={16} /> },
        { label: 'User Management', icon: <IconUsers size={16} /> },
        { label: 'System Tools', icon: <IconTool size={16} /> },
        { label: 'Development', icon: <IconCode size={16} /> },
        { label: 'Content Management', icon: <IconFileText size={16} /> },
        { label: 'Monitoring', icon: <IconEye size={16} /> }
    ];

    // Admin Tool Cards Data
    const userManagementTools = [
        { title: 'User & Access Management', description: 'Manage users, roles, and permissions', icon: <IconUsers size={24} />, href: '/admin/users' },
        { title: 'Session Management', description: 'Monitor and control user sessions', icon: <IconLock size={24} />, href: '/admin/sessions' },
        { title: 'Role Management', description: 'Configure roles and permissions', icon: <IconShield size={24} />, href: '/admin/roles' }
    ];

    const systemTools = [
        { title: 'Settings', description: 'System configuration and preferences', icon: <IconSettings size={24} />, href: '/admin/settings' },
        { title: 'Menu Management', description: 'Configure navigation and menus', icon: <IconMenu2 size={24} />, href: '/admin/menu-management' },
        { title: 'Headlines Configuration', description: 'Manage news and headline sources', icon: <IconNews size={24} />, href: '/admin/headlines-config' },
        { title: 'AI Administration', description: 'Artificial Intelligence management', icon: <IconBrain size={24} />, href: '/admin/ai' }
    ];

    const developmentTools = [
        { title: 'Site Editor', description: 'Visual site editing and customization', icon: <IconEdit size={24} />, href: '/admin/site-editor' },
        { title: 'JIT Terminal (Console)', description: 'Command line access and debugging', icon: <IconTerminal size={24} />, href: '/admin/jit-terminal' },
        { title: 'JIT Terminal Settings', description: 'Configure terminal access and security', icon: <IconSettings size={24} />, href: '/settings/jit-terminal' },
        { title: 'Site Survey (SuperAdmin)', description: 'Comprehensive site analysis', icon: <IconBug size={24} />, href: '/admin/tools/survey' },
        { title: 'Page Editor', description: 'Edit and manage individual pages', icon: <IconEdit size={24} />, href: '/admin/tools/page-editor' },
        { title: 'Site Structure Visualizer', description: 'Visualize site architecture and APIs', icon: <IconSitemap size={24} />, href: '/tools/site-structure' },
        { title: '🔨 Build Console', description: 'Frontend build system and deployment', icon: <IconCode size={24} />, href: '/admin/build' }
    ];

    const contentManagementTools = [
        { title: 'CMS (Legacy)', description: 'Legacy content management system', icon: <IconEdit size={24} />, href: '/apps/cms/page-editor' },
        { title: 'Site Clone', description: 'Clone and replicate site structures', icon: <IconFiles size={24} />, href: '/apps/site-clone' }
    ];

    const monitoringTools = [
        { title: 'OMAI Ultimate Logger', description: 'Advanced logging and monitoring', icon: <IconActivity size={24} />, href: '/admin/omai-logger' },
        { title: 'Activity Logs', description: 'View system and user activity logs', icon: <IconFileText size={24} />, href: '/admin/activity-logs' }
    ];

    const ToolCard = ({ tool }: { tool: any }) => (
        <Grid item xs={12} sm={6} md={4}>
            <Card 
                sx={{ 
                    height: '100%', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                    }
                }}
                onClick={() => navigate(tool.href)}
            >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ color: 'primary.main', mb: 2 }}>
                        {tool.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        {tool.title}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        }
                    }}>
                        {tool.description}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <IconExternalLink size={16} />
                    </Box>
                </CardContent>
            </Card>
        </Grid>
    );

    const handleSubTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setSubTabValue(newValue);
    };

    return (
        <Box>
            {/* Quick Tools Header */}
            <Box sx={{ mb: 3, p: 3 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                    Quick Tools
                </Typography>
                <Typography 
                    sx={{
                        color: 'text.primary',
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        }
                    }}
                >
                    Essential administrative tools for system management and user control
                </Typography>
            </Box>

            {/* Sub Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                <Tabs
                    value={subTabValue}
                    onChange={handleSubTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {quickToolsTabs.map((tab, index) => (
                        <Tab
                            key={index}
                            icon={tab.icon}
                            iconPosition="start"
                            label={tab.label}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 500,
                                minHeight: 48
                            }}
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Recent Activity Content */}
            {subTabValue === 0 && (
                <Box sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        {/* Recent User Actions */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Recent User Actions
                                    </Typography>
                                    <List>
                                        {recentActions.map((action, index) => (
                                            <React.Fragment key={action.id}>
                                                <ListItem sx={{ px: 0 }}>
                                                    <ListItemIcon>
                                                        <Avatar 
                                                            sx={{ 
                                                                width: 32, 
                                                                height: 32,
                                                                fontSize: '0.875rem',
                                                                bgcolor: `${action.color}.main`
                                                            }}
                                                        >
                                                            {action.avatar}
                                                        </Avatar>
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={
                                                            <Box>
                                                                <Typography component="span" fontWeight={600}>
                                                                    {action.user}
                                                                </Typography>
                                                                <Typography component="span" sx={{ ml: 1 }}>
                                                                    {action.action}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                        secondary={action.time}
                                                    />
                                                </ListItem>
                                                {index < recentActions.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* System Events */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        System Events
                                    </Typography>
                                    <List>
                                        {systemEvents.map((event, index) => (
                                            <React.Fragment key={event.id}>
                                                <ListItem sx={{ px: 0 }}>
                                                    <ListItemIcon>
                                                        <Box 
                                                            sx={{ 
                                                                color: event.status === 'success' ? 'success.main' :
                                                                       event.status === 'warning' ? 'warning.main' :
                                                                       event.status === 'error' ? 'error.main' : 'info.main'
                                                            }}
                                                        >
                                                            {event.icon}
                                                        </Box>
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={event.event}
                                                        secondary={event.time}
                                                    />
                                                </ListItem>
                                                {index < systemEvents.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* User Management Tools */}
            {subTabValue === 1 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                        User Management Tools
                    </Typography>
                    <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mb: 3
                    }}>
                        Manage users, sessions, roles and access control
                    </Typography>
                    <Grid container spacing={3}>
                        {userManagementTools.map((tool, index) => (
                            <ToolCard key={index} tool={tool} />
                        ))}
                    </Grid>
                </Box>
            )}

            {/* System Tools */}
            {subTabValue === 2 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                        System Administration Tools
                    </Typography>
                    <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mb: 3
                    }}>
                        Core system configuration and management
                    </Typography>
                    <Grid container spacing={3}>
                        {systemTools.map((tool, index) => (
                            <ToolCard key={index} tool={tool} />
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Development Tools */}
            {subTabValue === 3 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                        Development & Testing Tools
                    </Typography>
                    <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mb: 3
                    }}>
                        Advanced development and debugging tools
                    </Typography>
                    <Grid container spacing={3}>
                        {developmentTools.map((tool, index) => (
                            <ToolCard key={index} tool={tool} />
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Content Management */}
            {subTabValue === 4 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                        Content Management Tools
                    </Typography>
                    <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mb: 3
                    }}>
                        Manage content, templates and site structure
                    </Typography>
                    <Grid container spacing={3}>
                        {contentManagementTools.map((tool, index) => (
                            <ToolCard key={index} tool={tool} />
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Monitoring Tools */}
            {subTabValue === 5 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                        Monitoring & Logging Tools
                    </Typography>
                    <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mb: 3
                    }}>
                        Monitor system performance and activity
                    </Typography>
                    <Grid container spacing={3}>
                        {monitoringTools.map((tool, index) => (
                            <ToolCard key={index} tool={tool} />
                        ))}
                    </Grid>
                </Box>
            )}
        </Box>
    );
};

const OMAIStudioContent = () => {
    const navigate = useNavigate();

    const omaiTools = [
        { title: '🧪 AI Lab', description: 'Experiment with AI models and algorithms', icon: <IconBrain size={24} />, href: '/sandbox/ai-lab' },
        { title: '🔧 Project Generator', description: 'Generate new projects and components', icon: <IconCode size={24} />, href: '/sandbox/project-generator' },
        { title: '📝 OMB Editor', description: 'Orthodox Metrics Big Book editor', icon: <IconEdit size={24} />, href: '/omb/editor' },
        { title: '📚 OM Big Book', description: 'Knowledge base and documentation', icon: <IconNotebook size={24} />, href: '/admin/bigbook' },
        { title: '🧠 OMLearn', description: 'Machine learning and training systems', icon: <IconBrain size={24} />, href: '/bigbook/omlearn' },
        { title: 'Site Editor Demo', description: 'Demonstration of site editing capabilities', icon: <IconEdit size={24} />, href: '/demos/site-editor' },
        { title: 'Auto-Fix Demo', description: 'Automatic code fixing demonstration', icon: <IconTool size={24} />, href: '/demos/auto-fix' },
        { title: 'GitOps Demo', description: 'Git operations and deployment demo', icon: <IconCode size={24} />, href: '/demos/gitops' },
        { title: '🐞 VRT Demo', description: 'Visual regression testing tools', icon: <IconBug size={24} />, href: '/demos/vrt' }
    ];

    const ToolCard = ({ tool }: { tool: any }) => (
        <Grid item xs={12} sm={6} md={4}>
            <Card 
                sx={{ 
                    height: '100%', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                    }
                }}
                onClick={() => navigate(tool.href)}
            >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ color: 'primary.main', mb: 2 }}>
                        {tool.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        {tool.title}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        }
                    }}>
                        {tool.description}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <IconExternalLink size={16} />
                    </Box>
                </CardContent>
            </Card>
        </Grid>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                🤖 Orthodox Metrics Admin OMAI Studio
            </Typography>
            <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mb: 3
                    }}>
                AI development tools, machine learning systems, and automation platforms
            </Typography>
            <Grid container spacing={3}>
                {omaiTools.map((tool, index) => (
                    <ToolCard key={index} tool={tool} />
                ))}
            </Grid>
        </Box>
    );
};

const OrthodMetrics = () => {
    const { user } = useAuth();
    const [tabValue, setTabValue] = useState(0); // Default to Quick Tools

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const tabConfig = [
        {
            label: 'Quick Tools',
            icon: <IconTool size={18} />,
            component: <QuickToolsContent />
        },
        {
            label: 'Explore Orthodoxy',
            icon: <IconStar size={18} />,
            component: (
                <Box p={3}>
                    <Typography variant="h5" gutterBottom>🌟 Explore Orthodoxy</Typography>
                    <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        }
                    }}>
                        Coming soon: Users Online, Church Topics, Orthodox Headlines Settings
                    </Typography>
                </Box>
            )
        },
        {
            label: 'Church Tools',
            icon: <IconBuilding size={18} />,
            component: <ChurchToolsPanel />
        },
        {
            label: 'Content Management',
            icon: <IconFileText size={18} />,
            component: (
                <Box p={3}>
                    <Typography variant="h5" gutterBottom>📝 Content Management</Typography>
                    <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        }
                    }}>
                        Coming soon: Template Customizer, Welcome Messages, Maintenance Settings
                    </Typography>
                </Box>
            )
        },
        {
            label: 'Settings',
            icon: <IconSettings size={18} />,
            component: (
                <Box p={3}>
                    <Typography variant="h5" gutterBottom>⚙️ Settings</Typography>
                    <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        }
                    }}>
                        Coming soon: System Configuration, Backup Settings, Security Options
                    </Typography>
                </Box>
            )
        },
        {
            label: 'Server',
            icon: <IconServer size={18} />,
            component: (
                <Box p={3}>
                    <Typography variant="h5" gutterBottom>🖥️ Server</Typography>
                    <Typography sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                        '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        }
                    }}>
                        Coming soon: Server Monitoring, Performance Metrics, System Health
                    </Typography>
                </Box>
            )
        },
        {
            label: 'OMAI Studio',
            icon: <IconBrain size={18} />,
            component: <OMAIStudioContent />
        }
    ];

    return (
        <PageContainer title="Orthodox Metrics" description="Administrative dashboard for Orthodox Metrics system">
            <Box>
                {/* Header */}
                <Box sx={{ mb: 3 }}>
                    <Box 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        flexDirection={{ xs: "column", sm: "row" }}
                        gap={{ xs: 2, sm: 0 }}
                        mb={2}
                    >
                        <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' } }}>
                            Orthodox Metrics Admin
                        </Typography>
                        <Box 
                            display="flex" 
                            gap={1}
                            flexWrap="wrap"
                            justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                        >
                            <Chip
                                label={user?.role || 'super_admin'}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                            <Chip
                                label="System Online"
                                color="success"
                                variant="outlined"
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                        </Box>
                    </Box>
                    <Typography 
                        variant="body1" 
                        color="text.primary" 
                        sx={{ 
                            fontSize: '1.1rem',
                            opacity: 0.8,
                            '@media (max-width: 768px)': {
                                fontSize: '1rem',
                                opacity: 1,
                                color: 'text.primary'
                            }
                        }}
                    >
                        Welcome back, Administrator. Manage your Orthodox community platform
                    </Typography>
                </Box>

                {/* Tabs */}
                <Card>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            aria-label="Orthodox Metrics Admin Tabs"
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                '& .MuiTab-root': {
                                    minHeight: { xs: 56, sm: 64, md: 72 }, // Responsive heights
                                    minWidth: { xs: 120, sm: 140, md: 160 }, // Responsive widths
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    flexDirection: { xs: 'row', sm: 'column' }, // Row on mobile, column on larger screens
                                    gap: { xs: 1, sm: 0.5 },
                                    '& .MuiTab-iconWrapper': {
                                        marginBottom: { xs: 0, sm: 0.5 },
                                        marginRight: { xs: 1, sm: 0 }
                                    }
                                }
                            }}
                        >
                            {tabConfig.map((tab, index) => (
                                <Tab
                                    key={index}
                                    icon={tab.icon}
                                    iconPosition="start"
                                    label={tab.label}
                                    {...a11yProps(index)}
                                />
                            ))}
                        </Tabs>
                    </Box>

                    {/* Tab Panels */}
                    {tabConfig.map((tab, index) => (
                        <TabPanel key={index} value={tabValue} index={index}>
                            {tab.component}
                        </TabPanel>
                    ))}
                </Card>

                {/* Statistics Footer */}
                <Box 
                    display="grid" 
                    gridTemplateColumns={{ 
                        xs: "1fr", // Single column on mobile
                        sm: "repeat(2, 1fr)", // Two columns on small screens  
                        md: "repeat(4, 1fr)" // Four columns on medium+ screens
                    }} 
                    gap={{ xs: 1, sm: 1.5, md: 2 }} 
                    sx={{ mt: 2 }}
                >
                    <Card>
                        <CardContent sx={{ 
                            textAlign: 'center', 
                            py: { xs: 1.5, sm: 2 },
                            px: { xs: 1, sm: 2 }
                        }}>
                            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                    47
                                </Typography>
                                <Chip
                                    label="+12%"
                                    size="small"
                                    color="success"
                                    icon={<IconTrendingUp size={14} />}
                                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                />
                            </Box>
                            <Typography variant="body2" sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                                                '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mt: 0.5,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                Actions Today
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ 
                            textAlign: 'center', 
                            py: { xs: 1.5, sm: 2 },
                            px: { xs: 1, sm: 2 }
                        }}>
                            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                    8
                                </Typography>
                                <Chip
                                    label="+3"
                                    size="small"
                                    color="info"
                                    icon={<IconTrendingUp size={14} />}
                                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                />
                            </Box>
                            <Typography variant="body2" sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                                                '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mt: 0.5,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                Active Sessions
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ 
                            textAlign: 'center', 
                            py: { xs: 1.5, sm: 2 },
                            px: { xs: 1, sm: 2 }
                        }}>
                            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                    2
                                </Typography>
                                <Chip
                                    label="-1"
                                    size="small"
                                    color="success"
                                    icon={<IconTrendingDown size={14} />}
                                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                />
                            </Box>
                            <Typography variant="body2" sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                                                '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mt: 0.5,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                Failed Logins
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ 
                            textAlign: 'center', 
                            py: { xs: 1.5, sm: 2 },
                            px: { xs: 1, sm: 2 }
                        }}>
                            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                    99.9%
                                </Typography>
                                <Chip
                                    label="stable"
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                />
                            </Box>
                            <Typography variant="body2" sx={{ 
                        color: 'text.primary', 
                        opacity: 0.8,
                                                '@media (max-width: 768px)': {
                            opacity: 1,
                            color: 'text.primary'
                        },
                        mt: 0.5,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                System Uptime
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </PageContainer>
    );
};

export default OrthodMetrics;
