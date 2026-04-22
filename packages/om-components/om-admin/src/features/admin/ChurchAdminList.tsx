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
    location: string;
    city: string;
    country: string;
    language_preference: string;
    admin_email: string;
    timezone: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
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

                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Select a Church to Administer
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Choose a church below to access its admin panel with user management, records, logs, and administrative tools.
                        </Typography>

                        <TableContainer component={Paper} elevation={0}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Church Name</TableCell>
                                        <TableCell>Location</TableCell>
                                        <TableCell>Language</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Admin Email</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {churches.map((church) => (
                                        <TableRow key={church.id}>
                                            <TableCell>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {church.church_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {church.location || 'Not specified'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={church.language_preference?.toUpperCase() || 'EN'} 
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={church.is_active ? 'Active' : 'Inactive'} 
                                                    size="small"
                                                    color={church.is_active ? 'success' : 'error'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {church.admin_email}
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
                                                        onClick={() => navigate('/apps/church-management')}
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
