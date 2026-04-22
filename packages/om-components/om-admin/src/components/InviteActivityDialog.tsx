import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    CircularProgress,
    Box,
    Chip,
    Alert
} from '@mui/material';
import userService from '@/shared/lib/userService';

interface InviteActivityDialogProps {
    open: boolean;
    onClose: () => void;
    userId: number;
    userEmail: string;
}

interface ActivityEntry {
    id: number;
    user_id: number;
    action: string;
    details: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
}

const InviteActivityDialog: React.FC<InviteActivityDialogProps> = ({ open, onClose, userId, userEmail }) => {
    const [activity, setActivity] = useState<ActivityEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && userId) {
            loadActivity();
        }
    }, [open, userId]);

    const loadActivity = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await userService.getInviteActivity(userId);
            if (response.success && response.data) {
                setActivity(response.data.activity || []);
                setTotal(response.data.total || 0);
            } else {
                setError(response.message || 'Failed to load activity');
            }
        } catch {
            setError('Failed to load activity');
        } finally {
            setLoading(false);
        }
    };

    const parseDetails = (details: string): { method?: string; path?: string } => {
        try {
            return JSON.parse(details);
        } catch {
            return {};
        }
    };

    const getMethodColor = (method?: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
        switch (method) {
            case 'GET': return 'success';
            case 'POST': return 'info';
            case 'PUT': case 'PATCH': return 'warning';
            case 'DELETE': return 'error';
            default: return 'default';
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Activity Log — {userEmail}
                <Typography variant="body2" color="text.secondary">
                    {total} total API call{total !== 1 ? 's' : ''} recorded
                </Typography>
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : activity.length === 0 ? (
                    <Alert severity="info">No activity recorded for this user yet.</Alert>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Timestamp</TableCell>
                                    <TableCell>Method</TableCell>
                                    <TableCell>Path</TableCell>
                                    <TableCell>IP Address</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {activity.map((entry) => {
                                    const details = parseDetails(entry.details);
                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(entry.created_at).toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={details.method || '—'}
                                                    size="small"
                                                    color={getMethodColor(details.method)}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                    {details.path || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {entry.ip_address}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default InviteActivityDialog;
