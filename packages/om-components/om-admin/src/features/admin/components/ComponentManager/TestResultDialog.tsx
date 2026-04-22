import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import { IconTestPipe } from '@tabler/icons-react';
import type { Component } from '@/api/components.api';

interface TestResultDialogProps {
    open: boolean;
    onClose: () => void;
    component: Component | null;
    result: any;
}

const TestResultDialog: React.FC<TestResultDialogProps> = ({
    open,
    onClose,
    component,
    result,
}) => (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
                <IconTestPipe size={20} />
                Test Results - {component?.name}
            </Box>
        </DialogTitle>
        <DialogContent>
            {result ? (
                <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">Overall Status:</Typography>
                        <Chip
                            label={result.status?.toUpperCase() || 'UNKNOWN'}
                            color={
                                result.status === 'pass' ? 'success' :
                                result.status === 'fail' ? 'error' : 'warning'
                            }
                            variant="filled"
                        />
                    </Box>

                    {result.details && (
                        <Alert severity="info">
                            {result.details}
                        </Alert>
                    )}

                    {result.tests && (
                        <>
                            <Divider />
                            <Typography variant="subtitle2">Test Details:</Typography>
                            <List dense>
                                {result.tests.map((test: any, index: number) => (
                                    <ListItem key={index}>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="body2">{test.name}</Typography>
                                                    <Chip
                                                        label={test.status.toUpperCase()}
                                                        color={
                                                            test.status === 'pass' ? 'success' :
                                                            test.status === 'fail' ? 'error' : 'warning'
                                                        }
                                                        size="small"
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                    Duration: {test.duration}
                                                    {test.error && ` • Error: ${test.error}`}
                                                    {test.details && ` • ${test.details}`}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </>
                    )}

                    {result.timestamp && (
                        <Typography variant="caption" color="text.secondary" textAlign="center">
                            Test completed at {new Date(result.timestamp).toLocaleString()}
                        </Typography>
                    )}
                </Stack>
            ) : (
                <Typography color="text.secondary">
                    No test results available.
                </Typography>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>
                Close
            </Button>
        </DialogActions>
    </Dialog>
);

export default TestResultDialog;
