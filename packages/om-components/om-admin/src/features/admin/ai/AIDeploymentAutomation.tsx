import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Stack,
    Alert,
    CircularProgress,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    LinearProgress,
    Grid,
    Stepper,
    Step,
    StepLabel,
    StepContent
} from '@mui/material';
import { 
    IconRocket, 
    IconCheck, 
    IconAlertCircle,
    IconSettings,
    IconDatabase,
    IconCloud,
    IconShield,
    IconRefresh
} from '@tabler/icons-react';

interface DeploymentStep {
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    progress?: number;
    logs?: string[];
}

const AIDeploymentAutomation: React.FC = () => {
    const [isDeploying, setIsDeploying] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([
        {
            id: 'pre-checks',
            name: 'Pre-deployment Checks',
            description: 'Validate system requirements and dependencies',
            status: 'pending',
            logs: []
        },
        {
            id: 'database',
            name: 'Database Migration',
            description: 'Run database migrations and seed data',
            status: 'pending',
            logs: []
        },
        {
            id: 'build',
            name: 'Application Build',
            description: 'Build frontend and backend applications',
            status: 'pending',
            logs: []
        },
        {
            id: 'security',
            name: 'Security Configuration',
            description: 'Apply security policies and SSL certificates',
            status: 'pending',
            logs: []
        },
        {
            id: 'deployment',
            name: 'Live Deployment',
            description: 'Deploy to production environment',
            status: 'pending',
            logs: []
        },
        {
            id: 'verification',
            name: 'Post-deployment Verification',
            description: 'Verify deployment and run health checks',
            status: 'pending',
            logs: []
        }
    ]);

    const handleStartDeployment = async () => {
        setIsDeploying(true);
        setCurrentStep(0);

        for (let i = 0; i < deploymentSteps.length; i++) {
            setCurrentStep(i);
            
            // Update step status to running
            setDeploymentSteps(prev => 
                prev.map((step, index) => 
                    index === i 
                        ? { ...step, status: 'running', progress: 0 }
                        : step
                )
            );

            // Simulate step execution with progress
            for (let progress = 0; progress <= 100; progress += 10) {
                setDeploymentSteps(prev => 
                    prev.map((step, index) => 
                        index === i 
                            ? { 
                                ...step, 
                                progress,
                                logs: [...(step.logs || []), `Step ${i + 1} progress: ${progress}%`]
                            }
                            : step
                    )
                );
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // Mark step as completed
            setDeploymentSteps(prev => 
                prev.map((step, index) => 
                    index === i 
                        ? { 
                            ...step, 
                            status: 'completed',
                            logs: [...(step.logs || []), `✅ ${step.name} completed successfully`]
                        }
                        : step
                )
            );
        }

        setIsDeploying(false);
    };

    const getStepIcon = (status: string) => {
        switch (status) {
            case 'running':
                return <CircularProgress size={20} />;
            case 'completed':
                return <IconCheck size={20} color="green" />;
            case 'error':
                return <IconAlertCircle size={20} color="red" />;
            default:
                return <IconSettings size={20} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running':
                return 'primary';
            case 'completed':
                return 'success';
            case 'error':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Box>
            <Card>
                <CardContent>
                    <Stack spacing={3}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconRocket size={24} />
                            <Typography variant="h6">
                                AI Deployment Automation
                            </Typography>
                        </Box>

                        <Alert severity="warning" icon={<IconShield />}>
                            AI-powered deployment automation for Orthodox Metrics. This handles database migrations, 
                            application builds, security configurations, and deployment verification.
                        </Alert>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Paper elevation={1} sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        System Status
                                    </Typography>
                                    <List dense>
                                        <ListItem>
                                            <ListItemIcon>
                                                <IconDatabase size={20} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Database" 
                                                secondary="MariaDB 10.6 - Connected" 
                                            />
                                            <Chip label="Healthy" color="success" size="small" />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <IconCloud size={20} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Server" 
                                                secondary="Ubuntu 22.04 LTS - Running" 
                                            />
                                            <Chip label="Online" color="success" size="small" />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <IconShield size={20} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="SSL Certificate" 
                                                secondary="Valid until 2025-12-27" 
                                            />
                                            <Chip label="Valid" color="success" size="small" />
                                        </ListItem>
                                    </List>
                                </Paper>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Paper elevation={1} sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Deployment Actions
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Button
                                            variant="contained"
                                            onClick={handleStartDeployment}
                                            disabled={isDeploying}
                                            startIcon={isDeploying ? <CircularProgress size={16} /> : <IconRocket />}
                                            fullWidth
                                        >
                                            {isDeploying ? 'Deploying...' : 'Start AI Deployment'}
                                        </Button>
                                        
                                        <Button
                                            variant="outlined"
                                            startIcon={<IconRefresh />}
                                            disabled={isDeploying}
                                            fullWidth
                                        >
                                            Rollback to Previous Version
                                        </Button>
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Stack>
                </CardContent>
            </Card>

            {(isDeploying || deploymentSteps.some(step => step.status !== 'pending')) && (
                <Box mt={3}>
                    <Typography variant="h6" gutterBottom>
                        Deployment Progress
                    </Typography>
                    
                    <Stepper activeStep={currentStep} orientation="vertical">
                        {deploymentSteps.map((step, index) => (
                            <Step key={step.id}>
                                <StepLabel
                                    StepIconComponent={() => getStepIcon(step.status)}
                                >
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="subtitle1">
                                            {step.name}
                                        </Typography>
                                        <Chip 
                                            label={step.status} 
                                            size="small" 
                                            color={getStatusColor(step.status)}
                                        />
                                    </Box>
                                </StepLabel>
                                <StepContent>
                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                        {step.description}
                                    </Typography>
                                    
                                    {step.status === 'running' && typeof step.progress === 'number' && (
                                        <Box sx={{ mb: 2 }}>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={step.progress} 
                                            />
                                            <Typography variant="caption" color="textSecondary">
                                                {step.progress}% complete
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    {step.logs && step.logs.length > 0 && (
                                        <Paper 
                                            variant="outlined" 
                                            sx={{ 
                                                p: 1, 
                                                bgcolor: 'grey.50', 
                                                maxHeight: 150, 
                                                overflow: 'auto',
                                                fontFamily: 'monospace',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            {step.logs.map((log, logIndex) => (
                                                <Typography 
                                                    key={logIndex} 
                                                    variant="caption" 
                                                    component="div"
                                                    sx={{ fontFamily: 'monospace' }}
                                                >
                                                    {log}
                                                </Typography>
                                            ))}
                                        </Paper>
                                    )}
                                </StepContent>
                            </Step>
                        ))}
                    </Stepper>
                </Box>
            )}
        </Box>
    );
};

export default AIDeploymentAutomation;
