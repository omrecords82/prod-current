import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Chip,
    IconButton,
    Alert,
    CircularProgress,
    Tooltip
} from '@mui/material';
import {
    IconBuilding,
    IconUsers,
    IconRefresh,
    IconEye
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

interface Church {
    id: number;
    church_name: string;
    name?: string;
    location?: string;
    city?: string;
    state_province?: string;
    language_preference?: string;
    admin_email?: string;
    is_active: boolean;
    is_demo?: boolean;
    client_status?: string;
    database_name?: string | null;
}

const ChurchAdminList: React.FC = () => {
    const { isSuperAdmin, hasRole } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [churches, setChurches] = useState<Church[]>([]);

    const isAdmin = hasRole(['admin', 'super_admin']);

    const fetchChurches = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const data = await apiClient.get<any>('/admin/churches');
            
            if (data.success) {
                setChurches(data.churches || []);
            } else {
                throw new Error(data.message || 'Failed to fetch churches');
            }
        } catch (err) {
            console.error('Error fetching churches:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchChurches();
    };

    useEffect(() => {
        if (!isAdmin) {
            setError('Administrative privileges required');
            setLoading(false);
            return;
        }
        
        fetchChurches();
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <PageContainer title="Church Administration" description="Church administration panel selection">
                <Alert severity="error">Administrative privileges required</Alert>
            </PageContainer>
        );
    }

    const BCrumb = [
        { to: '/', title: 'Home' },
        { to: '/admin', title: 'Admin' },
        { title: 'Church Administration' },
    ];

    if (loading) {
        return (
            <PageContainer title="Church Administration" description="Church administration panel selection">
                <Breadcrumb title="Church Administration" items={BCrumb} />
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    if (error) {
        return (
            <PageContainer title="Church Administration" description="Church administration panel selection">
                <Breadcrumb title="Church Administration" items={BCrumb} />
                <Alert severity="error">{error}</Alert>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Church Administration" description="Church administration panel selection">
            <Breadcrumb title="Church Administration" items={BCrumb} />
            
            <Box p={3}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                    <Box display="flex" alignItems="center">
                        <IconBuilding size="24" style={{ marginRight: 8 }} />
                        <Typography variant="h4">Church Administration</Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<IconRefresh />}
                        onClick={handleRefresh}
                    >
                        Refresh
                    </Button>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                    Showing tenant-provisioned parishes only (Manville + Test Church). CRM directory parishes
                    that have not enrolled are managed in OMAI Church Command Center, not here.
                </Alert>

                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Select a Parish to Administer
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Active clients with tenant databases. Enrollment pipeline parishes appear after
                            they complete onboarding and are provisioned.
                        </Typography>

                        <TableContainer component={Paper} elevation={0}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Parish</TableCell>
                                        <TableCell>Location</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Tenant DB</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {churches.map((church) => (
                                        <TableRow key={church.id}>
                                            <TableCell>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {church.church_name || church.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    ID {church.id}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {[church.city, church.state_province].filter(Boolean).join(', ') || church.location || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={church.is_demo ? 'Test' : 'Production'}
                                                    size="small"
                                                    color={church.is_demo ? 'warning' : 'primary'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={church.client_status?.replace(/_/g, ' ') || (church.is_active ? 'active' : 'inactive')}
                                                    size="small"
                                                    color={church.is_active ? 'success' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                    {church.database_name || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Open Church Admin Panel">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => navigate(`/admin/church/${church.id}`)}
                                                    >
                                                        <IconUsers />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="View Church Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => navigate(`/admin/church/${church.id}`)}
                                                    >
                                                        <IconEye />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {churches.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                <Typography variant="body2" color="text.secondary">
                                                    No churches found
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>
        </PageContainer>
    );
};

export default ChurchAdminList;
