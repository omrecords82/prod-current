import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    Button,
    Alert,
    CircularProgress
} from '@mui/material';
import PageContainer from '@/shared/ui/PageContainer';

interface ChurchData {
    id: number;
    name: string;
    email: string;
    databaseName: string;
    isActive: boolean;
    totalOcrJobs?: number;
}

const ChurchAdminPanelWorking: React.FC = () => {
    const { id: churchId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [churchData, setChurchData] = useState<ChurchData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadChurchData = async () => {
        if (!churchId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const data = await apiClient.get<any>(`/admin/church/${churchId}/overview`);
            
            if (data.metadata) {
                // Map the API response to our interface
                const churchInfo: ChurchData = {
                    id: data.metadata.id,
                    name: data.metadata.name,
                    email: data.metadata.email || data.info?.email || '',
                    databaseName: data.metadata.database_name,
                    isActive: data.metadata.is_active,
                    totalOcrJobs: (data.counts?.baptisms || 0) + (data.counts?.marriages || 0) + (data.counts?.funerals || 0)
                };
                setChurchData(churchInfo);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenOcrPanel = () => {
        navigate(`/admin/church/${churchId}/ocr`);
    };

    useEffect(() => {
        loadChurchData();
    }, [churchId]);

    if (loading) {
        return (
            <PageContainer title="Church Admin Panel" description="Church administration">
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    if (error) {
        return (
            <PageContainer title="Church Admin Panel" description="Church administration">
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            </PageContainer>
        );
    }

    if (!churchData) {
        return (
            <PageContainer title="Church Admin Panel" description="Church administration">
                <Alert severity="warning" sx={{ mt: 2 }}>
                    Church not found
                </Alert>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Church Admin Panel" description="Church administration">
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Church Administration
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Church Information Card */}
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: '2 1 300px' }}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {churchData.name}
                                    </Typography>
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Email:</strong> {churchData.email}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Database:</strong> {churchData.databaseName}
                                        </Typography>
                                        <Box sx={{ mt: 1 }}>
                                            <Chip 
                                                label={churchData.isActive ? 'Active' : 'Inactive'} 
                                                color={churchData.isActive ? 'success' : 'error'}
                                                size="small"
                                            />
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>

                        {/* Quick Actions Card */}
                        <Box sx={{ flex: '1 1 250px' }}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Quick Actions
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Button 
                                            variant="contained" 
                                            color="primary"
                                            onClick={handleOpenOcrPanel}
                                            fullWidth
                                        >
                                            Open OCR Data Panel
                                        </Button>
                                        <Button 
                                            variant="outlined"
                                            onClick={loadChurchData}
                                            fullWidth
                                        >
                                            Refresh Data
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    </Box>

                    {/* OCR Statistics Card */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Church Statistics
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Chip 
                                    label={`Total Records: ${churchData.totalOcrJobs || 0}`}
                                    color="primary"
                                    variant="outlined"
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </PageContainer>
    );
};

export default ChurchAdminPanelWorking;
