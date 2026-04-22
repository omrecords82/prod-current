import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormLabel,
  Paper,
  Typography,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  School as LearningIcon,
} from '@mui/icons-material';

const TRAINING_PHASES = [
  { id: 'foundation', name: 'Foundation Knowledge', icon: '🏗️' },
  { id: 'functional', name: 'Functional Understanding', icon: '⚙️' },
  { id: 'operational', name: 'Operational Intelligence', icon: '🔧' },
  { id: 'resolution', name: 'Issue Resolution', icon: '🛠️' },
  { id: 'predictive', name: 'Predictive Capabilities', icon: '🔮' },
];

interface TrainingDialogProps {
  open: boolean;
  onClose: () => void;
  selectedPhase: string;
  onPhaseSelect: (phase: string) => void;
  onStart: (phase: string) => void;
  loading: boolean;
}

const TrainingDialog: React.FC<TrainingDialogProps> = ({
  open,
  onClose,
  selectedPhase,
  onPhaseSelect,
  onStart,
  loading,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>
      <LearningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
      Start OMAI Training Session
    </DialogTitle>
    <DialogContent>
      <Typography variant="body1" paragraph>
        Select a training phase to begin OMAI's learning session. Each phase builds upon previous knowledge.
      </Typography>

      <FormControl fullWidth>
        <FormLabel>Training Phase</FormLabel>
        <Box mt={1}>
          {TRAINING_PHASES.map((phase) => (
            <Paper
              key={phase.id}
              sx={{
                p: 2,
                mb: 1,
                cursor: 'pointer',
                border: selectedPhase === phase.id ? 2 : 1,
                borderColor: selectedPhase === phase.id ? 'primary.main' : 'divider'
              }}
              onClick={() => onPhaseSelect(phase.id)}
            >
              <Typography variant="subtitle1">
                {phase.icon} {phase.name}
              </Typography>
            </Paper>
          ))}
        </Box>
      </FormControl>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button
        onClick={() => onStart(selectedPhase)}
        variant="contained"
        disabled={loading}
        startIcon={loading ? <CircularProgress size={16} /> : <PlayIcon />}
      >
        {loading ? 'Starting...' : 'Start Training'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default TrainingDialog;
