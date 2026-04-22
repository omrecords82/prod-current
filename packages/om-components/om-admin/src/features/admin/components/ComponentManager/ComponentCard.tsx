/**
 * ComponentCard — Individual component card with health indicators,
 * usage chips, status toggle, and action buttons.
 * Extracted from ComponentManager.tsx
 */
import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    Switch,
    FormControlLabel,
    IconButton,
    Tooltip,
    Stack,
    Avatar,
    LinearProgress,
} from '@mui/material';
import {
    IconSettings,
    IconEye,
    IconTestPipe,
    IconCircleCheck,
    IconAlertTriangle,
    IconCircleX,
    IconActivity,
    IconShield,
    IconBug,
    IconUsers,
    IconTarget,
} from '@tabler/icons-react';
import type { Component } from '@/api/components.api';

interface ComponentCardProps {
    component: Component;
    isActionLoading: boolean;
    canManageComponents: boolean;
    onToggle: (component: Component) => void;
    onViewLogs: (component: Component) => void;
    onRunTest: (component: Component) => void;
}

const getHealthColor = (health: string) => {
    switch (health) {
        case 'healthy':
            return { color: 'success', icon: IconCircleCheck, bgColor: '#e8f5e8' };
        case 'degraded':
            return { color: 'warning', icon: IconAlertTriangle, bgColor: '#fff8e1' };
        case 'failed':
            return { color: 'error', icon: IconCircleX, bgColor: '#ffebee' };
        default:
            return { color: 'default', icon: IconActivity, bgColor: '#f5f5f5' };
    }
};

const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

const getHealthTooltip = (component: Component) => {
    const { health, healthIssues, lastHealthCheck } = component;
    
    let baseMessage = '';
    switch (health) {
        case 'healthy':
            baseMessage = 'This component is running normally and all checks are passing';
            break;
        case 'degraded':
            baseMessage = 'This component is experiencing issues but is still partially functional';
            break;
        case 'failed':
            baseMessage = 'This component has critical issues and may not be functioning properly';
            break;
        default:
            baseMessage = 'Component health status unknown';
    }
    
    let detectionInfo = '';
    if (health !== 'healthy' && healthIssues && healthIssues.length > 0) {
        detectionInfo = `\n\nDetected Issues:\n• ${healthIssues.join('\n• ')}`;
    }
    
    let healthCheckInfo = '';
    if (lastHealthCheck) {
        const checkTime = new Date(lastHealthCheck);
        const timeAgo = Math.round((Date.now() - checkTime.getTime()) / (1000 * 60));
        healthCheckInfo = `\n\nLast health check: ${timeAgo < 1 ? 'Just now' : `${timeAgo}m ago`}`;
    }
    
    return `${baseMessage}${detectionInfo}${healthCheckInfo}`;
};

const isHealthAutoDetected = (component: Component): boolean => {
    return !!(component.healthIssues && 
            component.healthIssues.length > 0 && 
            component.lastHealthCheck &&
            component.health !== 'healthy');
};

const getComponentCardClass = (component: Component) => {
    if (!component.enabled) {
        return {
            opacity: 0.5,
            filter: 'grayscale(0.7)',
            cursor: 'not-allowed',
            '&:hover': {
                boxShadow: 1,
                transform: 'none'
            }
        };
    }
    return {
        '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-2px)'
        }
    };
};

const getToggleTooltip = (enabled: boolean, canManage: boolean) => {
    if (!canManage) {
        return 'You need admin permissions to enable or disable components';
    }
    return enabled 
        ? 'Click to disable this component across the system' 
        : 'Click to enable this component across the system';
};

const getRelativeTime = (timestamp: string | null): string => {
    if (!timestamp) return 'Never used';
    
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    
    return past.toLocaleDateString();
};

const getUsageChip = (usageStatus: string, lastUsed: string | null) => {
    const configs = {
        active: { color: '#4caf50', bgColor: '#e8f5e8', icon: '🟢', label: 'Active' },
        inactive: { color: '#ff9800', bgColor: '#fff3e0', icon: '🟡', label: 'Inactive' },
        unused: { color: '#9e9e9e', bgColor: '#f5f5f5', icon: '⚪', label: 'Unused' }
    };
    
    const config = configs[usageStatus as keyof typeof configs] || configs.unused;
    
    return (
        <Chip
            size="small"
            label={
                <Box display="flex" alignItems="center" gap={0.5}>
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                </Box>
            }
            sx={{
                backgroundColor: config.bgColor,
                color: config.color,
                fontWeight: 500,
                fontSize: '0.75rem'
            }}
        />
    );
};

const ComponentCard: React.FC<ComponentCardProps> = ({
    component,
    isActionLoading,
    canManageComponents,
    onToggle,
    onViewLogs,
    onRunTest,
}) => {
    const healthConfig = getHealthColor(component.health);
    const HealthIcon = healthConfig.icon;

    return (
        <Card 
            variant="outlined"
            sx={{ 
                height: '100%',
                transition: 'all 0.2s ease-in-out',
                ...(isActionLoading ? { opacity: 0.7 } : getComponentCardClass(component))
            }}
        >
            {isActionLoading && (
                <LinearProgress />
            )}
            <CardContent>
                <Stack spacing={2}>
                    {/* Component Header */}
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                            <Tooltip title={getHealthTooltip(component)} arrow>
                                <Avatar 
                                    sx={{ 
                                        bgcolor: healthConfig.bgColor, 
                                        color: `${healthConfig.color}.main`,
                                        mr: 2,
                                        width: 40,
                                        height: 40,
                                        cursor: 'help'
                                    }}
                                >
                                    <HealthIcon size={20} />
                                </Avatar>
                            </Tooltip>
                            <Typography 
                                variant="h6" 
                                component="h3"
                                sx={{ 
                                    color: !component.enabled ? 'text.disabled' : 'text.primary'
                                }}
                            >
                                {component.name}
                            </Typography>
                        </Box>
                        {!canManageComponents && (
                            <Tooltip title="Admin access required">
                                <IconShield size={16} color="#ff9800" />
                            </Tooltip>
                        )}
                    </Box>

                    {/* Component Description */}
                    {component.description && (
                        <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                                fontStyle: 'italic',
                                opacity: !component.enabled ? 0.6 : 1
                            }}
                        >
                            {component.description}
                        </Typography>
                    )}

                    {/* Usage Information */}
                    <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ py: 1 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            {getUsageChip(component.usageStatus || 'unused', component.lastUsed)}
                            <Typography variant="caption" color="text.secondary">
                                {component.lastUsedFormatted || getRelativeTime(component.lastUsed)}
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Tooltip title={`Total accesses: ${component.totalAccesses || 0}`} arrow>
                                <Chip
                                    size="small"
                                    icon={<IconUsers size={14} />}
                                    label={component.uniqueUsers || 0}
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                />
                            </Tooltip>
                            <Tooltip title={`Category: ${component.category || 'Uncategorized'}`} arrow>
                                <Chip
                                    size="small"
                                    icon={<IconTarget size={14} />}
                                    label={component.category || 'Other'}
                                    variant="outlined"
                                    color="secondary"
                                    sx={{ fontSize: '0.7rem' }}
                                />
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Status and Health */}
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Tooltip title={getToggleTooltip(component.enabled, canManageComponents)} arrow>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={component.enabled}
                                        onChange={() => onToggle(component)}
                                        disabled={!canManageComponents || isActionLoading}
                                        color="primary"
                                    />
                                }
                                label={component.enabled ? "Enabled" : "Disabled"}
                            />
                        </Tooltip>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Tooltip title={getHealthTooltip(component)} arrow>
                                <Chip
                                    label={component.health.charAt(0).toUpperCase() + component.health.slice(1)}
                                    color={healthConfig.color as any}
                                    variant="filled"
                                    size="small"
                                    icon={<HealthIcon size={16} />}
                                />
                            </Tooltip>
                            {isHealthAutoDetected(component) && (
                                <Tooltip title="Health status automatically detected based on log analysis in past 24h" arrow>
                                    <IconBug size={14} style={{ 
                                        color: '#ff9800', 
                                        opacity: 0.7 
                                    }} />
                                </Tooltip>
                            )}
                        </Box>
                    </Box>

                    {/* Last Updated */}
                    <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ opacity: !component.enabled ? 0.6 : 1 }}
                    >
                        Last Updated: {formatLastUpdated(component.lastUpdated)}
                    </Typography>

                    {/* Action Buttons */}
                    <Box display="flex" justifyContent="flex-end" gap={1}>
                        <Tooltip title={!component.enabled ? "Component is disabled - enable to view logs" : "View recent log output from this component"} arrow>
                            <span>
                                <IconButton 
                                    size="small" 
                                    onClick={() => onViewLogs(component)}
                                    disabled={!component.enabled || isActionLoading}
                                    color="primary"
                                    sx={{ opacity: !component.enabled ? 0.5 : 1 }}
                                >
                                    <IconEye size={16} />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={
                            !component.enabled ? "Component is disabled - enable to run tests" :
                            canManageComponents ? "Run automated self-test for this component" : 
                            "Admin access required to run tests"
                        } arrow>
                            <span>
                                <IconButton 
                                    size="small"
                                    onClick={() => onRunTest(component)}
                                    disabled={!component.enabled || !canManageComponents || isActionLoading}
                                    color="secondary"
                                    sx={{ opacity: !component.enabled ? 0.5 : 1 }}
                                >
                                    <IconTestPipe size={16} />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={
                            !component.enabled ? "Component is disabled - enable to access settings" :
                            "Component configuration and advanced settings (Coming Soon)"
                        } arrow>
                            <span>
                                <IconButton 
                                    size="small" 
                                    disabled
                                    sx={{ opacity: !component.enabled ? 0.3 : 0.5 }}
                                >
                                    <IconSettings size={16} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default ComponentCard;
