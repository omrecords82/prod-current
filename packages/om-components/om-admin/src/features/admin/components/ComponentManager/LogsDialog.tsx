import React from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material';
import { IconEye, IconChevronDown, IconBug } from '@tabler/icons-react';
import type { ComponentLog } from '@/api/components.api';

interface LogsDialogProps {
    open: boolean;
    onClose: () => void;
    componentName: string;
    logs: ComponentLog[];
}

const getLogLevelColor = (level: string) => {
    switch (level) {
        case 'error': return 'error';
        case 'warn': return 'warning';
        case 'info': return 'info';
        case 'debug': return 'default';
        default: return 'default';
    }
};

const LogsDialog: React.FC<LogsDialogProps> = ({
    open,
    onClose,
    componentName,
    logs,
}) => (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
                <IconEye size={20} />
                {componentName} - Component Logs
            </Box>
        </DialogTitle>
        <DialogContent>
            {logs.length === 0 ? (
                <Box textAlign="center" py={3}>
                    <IconBug size={48} color="#ccc" />
                    <Typography variant="h6" color="text.secondary" mt={1}>
                        No logs available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        This component hasn't generated any log entries yet.
                    </Typography>
                </Box>
            ) : (
                <>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Showing {logs.length} recent log entries
                    </Typography>
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {logs.map((log, index) => (
                            <ListItem key={log.id || index} divider>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                            <Chip
                                                label={log.level.toUpperCase()}
                                                color={getLogLevelColor(log.level) as any}
                                                size="small"
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    }
                                    secondary={
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                                            {log.message}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </>
            )}
        </DialogContent>
        <DialogActions>
            <Button
                onClick={onClose}
                startIcon={<IconChevronDown size={16} />}
            >
                Close
            </Button>
        </DialogActions>
    </Dialog>
);

export default LogsDialog;
