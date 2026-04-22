import React from 'react';
import {
    Badge,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Box,
    Divider,
    Button,
    Chip,
    Avatar,
    Tooltip,
    CircularProgress,
    Stack
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    NotificationsActive,
    NotificationsOff,
    Check,
    Close,
    Launch,
    MarkEmailRead,
    PriorityHigh,
    Warning,
    Info,
    Error as ErrorIcon,
    Schedule,
    Person,
    Settings,
    Backup,
    Security,
    Receipt,
    VerifiedUser,
    Note,
    AdminPanelSettings
} from '@mui/icons-material';
import { useNotifications, NotificationType } from '../../context/NotificationContext.tsx';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ anchorEl, open, onClose }) => {
    const {
        notifications,
        loading,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        fetchNotifications
    } = useNotifications();

    const handleMarkAsRead = async (id: number, event: React.MouseEvent) => {
        event.stopPropagation();
        await markAsRead(id);
    };

    const handleDismiss = async (id: number, event: React.MouseEvent) => {
        event.stopPropagation();
        await dismissNotification(id);
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const handleNotificationClick = (notification: NotificationType) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }

        if (notification.action_url) {
            window.open(notification.action_url, '_blank');
        }
    };

    const getNotificationIcon = (notification: NotificationType) => {
        const iconProps = { fontSize: 'small' as const };

        switch (notification.category) {
            case 'system':
                return <Settings {...iconProps} />;
            case 'user':
                return <Person {...iconProps} />;
            case 'admin':
                return <AdminPanelSettings {...iconProps} />;
            case 'billing':
                return <Receipt {...iconProps} />;
            case 'backup':
                return <Backup {...iconProps} />;
            case 'security':
                return <Security {...iconProps} />;
            case 'certificates':
                return <VerifiedUser {...iconProps} />;
            case 'reminders':
                return <Schedule {...iconProps} />;
            default:
                return <Info {...iconProps} />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'error';
            case 'high':
                return 'warning';
            case 'normal':
                return 'info';
            case 'low':
                return 'default';
            default:
                return 'default';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return <ErrorIcon fontSize="small" />;
            case 'high':
                return <PriorityHigh fontSize="small" />;
            case 'normal':
                return <Info fontSize="small" />;
            case 'low':
                return <Info fontSize="small" />;
            default:
                return <Info fontSize="small" />;
        }
    };

    const formatNotificationTime = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch (error) {
            return 'Unknown';
        }
    };

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: 400,
                    maxHeight: 500,
                    overflow: 'auto',
                },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" component="div">
                        Notifications
                    </Typography>
                    {notifications.some(n => !n.is_read) && (
                        <Button
                            size="small"
                            startIcon={<MarkEmailRead />}
                            onClick={handleMarkAllAsRead}
                        >
                            Mark All Read
                        </Button>
                    )}
                </Stack>
            </Box>

            {/* Loading State */}
            {loading && (
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                </Box>
            )}

            {/* Notifications List */}
            {!loading && notifications.length === 0 && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <NotificationsOff sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                        No notifications yet
                    </Typography>
                </Box>
            )}

            {!loading && notifications.length > 0 && (
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {notifications.map((notification, index) => (
                        <React.Fragment key={notification.id}>
                            <MenuItem
                                onClick={() => handleNotificationClick(notification)}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    alignItems: 'flex-start',
                                    backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                                    '&:hover': {
                                        backgroundColor: 'action.selected',
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                                    <Badge
                                        color={getPriorityColor(notification.priority) as any}
                                        variant="dot"
                                        invisible={Boolean(notification.is_read)}
                                    >
                                        <Avatar
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                bgcolor: `${getPriorityColor(notification.priority)}.light`,
                                                color: `${getPriorityColor(notification.priority)}.main`,
                                            }}
                                        >
                                            {notification.icon ? notification.icon : getNotificationIcon(notification)}
                                        </Avatar>
                                    </Badge>
                                </ListItemIcon>

                                <ListItemText
                                    primary={
                                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: notification.is_read ? 'normal' : 'medium',
                                                    flex: 1,
                                                }}
                                            >
                                                {notification.title}
                                            </Typography>
                                            <Stack direction="row" spacing={0.5}>
                                                {notification.priority !== 'normal' && (
                                                    <Chip
                                                        size="small"
                                                        label={notification.priority}
                                                        color={getPriorityColor(notification.priority) as any}
                                                        sx={{ height: 16, fontSize: '0.625rem' }}
                                                    />
                                                )}
                                                {!notification.is_read && (
                                                    <Tooltip title="Mark as read">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                            sx={{ padding: 0.25 }}
                                                        >
                                                            <Check fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Dismiss">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleDismiss(notification.id, e)}
                                                        sx={{ padding: 0.25 }}
                                                    >
                                                        <Close fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </Stack>
                                    }
                                    secondary={
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 0.5 }}
                                            >
                                                {notification.message}
                                            </Typography>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatNotificationTime(notification.created_at)}
                                                </Typography>
                                                {notification.action_url && (
                                                    <Chip
                                                        size="small"
                                                        label={notification.action_text || 'View'}
                                                        icon={<Launch />}
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: '0.625rem' }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    }
                                />
                            </MenuItem>
                            {index < notifications.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </Box>
            )}

            {/* Footer */}
            {!loading && notifications.length > 0 && (
                <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Button
                        fullWidth
                        size="small"
                        onClick={() => {
                            // Navigate to notifications page
                            window.location.href = '/notifications';
                            onClose();
                        }}
                    >
                        View All Notifications
                    </Button>
                </Box>
            )}
        </Menu>
    );
};

interface NotificationBellProps {
    className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
    const { counts, hasUnreadNotifications } = useNotifications();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton
                    onClick={handleClick}
                    className={className}
                    color="inherit"
                    aria-label="notifications"
                >
                    <Badge badgeContent={counts.unread} color="error">
                        {hasUnreadNotifications() ? (
                            <NotificationsActive />
                        ) : (
                            <NotificationsIcon />
                        )}
                    </Badge>
                </IconButton>
            </Tooltip>
            <NotificationDropdown
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
            />
        </>
    );
};

export default NotificationBell;
