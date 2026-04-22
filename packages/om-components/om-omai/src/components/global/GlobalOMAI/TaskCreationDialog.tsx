import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Task as TaskIcon } from '@mui/icons-material';
import type { GlobalError } from '../../../hooks/useGlobalErrorStore';

interface TaskForm {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface Props {
  open: boolean;
  onClose: () => void;
  selectedError: GlobalError | null;
  taskForm: TaskForm;
  setTaskForm: React.Dispatch<React.SetStateAction<TaskForm>>;
  onCreateTask: () => void;
}

const TaskCreationDialog: React.FC<Props> = ({
  open,
  onClose,
  selectedError,
  taskForm,
  setTaskForm,
  onCreateTask,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <TaskIcon sx={{ color: '#1976d2' }} />
          📌 Create Bug Task from Error
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedError && (
          <Box>
            {/* Enhanced Error Summary */}
            <Card sx={{ mb: 2, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  🐛 Error Details
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Hash:</strong> {selectedError.hash}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Message:</strong> {selectedError.message}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Component:</strong> {selectedError.component}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Severity:</strong> {selectedError.severity} | <strong>Occurrences:</strong> {selectedError.occurrenceCount}
                </Typography>
                <Typography variant="body2">
                  <strong>First/Last:</strong> {new Date(selectedError.firstOccurrence).toLocaleString()} / {new Date(selectedError.lastOccurrence).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>

            {/* Task Form */}
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Task Title"
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({...prev, title: e.target.value}))}
                placeholder="🐛 Fix: Error description..."
              />
              <TextField
                fullWidth
                multiline
                rows={8}
                label="Task Description (Markdown)"
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Bug report will be auto-generated..."
              />
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={taskForm.priority}
                  label="Priority"
                  onChange={(e) => setTaskForm(prev => ({...prev, priority: e.target.value as any}))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>

              <Alert severity="info">
                Task will be created in the Bugs column (or first available column) with appropriate labels and priority based on error severity.
              </Alert>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onCreateTask}
          variant="contained"
          disabled={!taskForm.title.trim()}
          startIcon={<TaskIcon />}
        >
          📌 Create Bug Task
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskCreationDialog;
