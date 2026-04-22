import React from 'react';
import { Box, Typography, Alert, Card, CardContent } from '@mui/material';
import { IconFileDescription } from '@tabler/icons-react';

const AdminLogs: React.FC = () => {
    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" mb={3}>
                <IconFileDescription size="24" style={{ marginRight: 8 }} />
                <Typography variant="h4">Admin Logs</Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
                This admin logs page is under development.
            </Alert>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Coming Soon
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        System logs, audit trails, and administrative activity logs will be available here.
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AdminLogs;
