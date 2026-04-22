import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { IconCheck, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { FusionEntry } from '../../types/fusion';

interface FusionProgressHeaderProps {
  entries: FusionEntry[];
  selectedEntryIndex: number | null;
  setSelectedEntryIndex: (idx: number) => void;
  completionState: Set<number>;
  inProgressEntries: Set<number>;
  allEntriesComplete: boolean;
  hideCompleted: boolean;
  setHideCompleted: (val: boolean) => void;
  manualEditMode: Set<number>;
  isProcessing: boolean;
  onSendToReview: () => void;
}

const FusionProgressHeader: React.FC<FusionProgressHeaderProps> = ({
  entries,
  selectedEntryIndex,
  setSelectedEntryIndex,
  completionState,
  inProgressEntries,
  allEntriesComplete,
  hideCompleted,
  setHideCompleted,
  manualEditMode,
  isProcessing,
  onSendToReview,
}) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 2,
        bgcolor: allEntriesComplete ? alpha(theme.palette.success.main, 0.1) : 'background.paper',
        borderColor: allEntriesComplete ? 'success.main' : 'divider',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" fontWeight={600}>
            Record {(selectedEntryIndex ?? 0) + 1} of {entries.length}
          </Typography>
          <Chip
            size="small"
            label={`${inProgressEntries.size - completionState.size} in progress`}
            color="info"
            sx={{ display: inProgressEntries.size > completionState.size ? 'flex' : 'none' }}
          />
          <Chip
            size="small"
            label={`${completionState.size} saved`}
            color={allEntriesComplete ? 'success' : 'warning'}
            icon={allEntriesComplete ? <IconCheck size={14} /> : undefined}
          />
          {manualEditMode.has(selectedEntryIndex ?? -1) && (
            <Chip size="small" label="Manual Edit" color="secondary" />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              const prevIdx = (selectedEntryIndex ?? 0) - 1;
              if (prevIdx >= 0) setSelectedEntryIndex(prevIdx);
            }}
            disabled={selectedEntryIndex === 0 || selectedEntryIndex === null}
            startIcon={<IconChevronLeft size={16} />}
          >
            Previous
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              const nextIdx = (selectedEntryIndex ?? 0) + 1;
              if (nextIdx < entries.length) setSelectedEntryIndex(nextIdx);
            }}
            disabled={selectedEntryIndex === entries.length - 1 || selectedEntryIndex === null}
            endIcon={<IconChevronRight size={16} />}
          >
            Next
          </Button>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
              />
            }
            label="Hide completed"
            sx={{ ml: 1 }}
          />
        </Stack>
      </Stack>
      {allEntriesComplete && (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <Alert severity="success" icon={<IconCheck size={18} />}>
            All {entries.length} records complete! Click "Send to Review & Finalize" to proceed.
          </Alert>
          <Button
            variant="contained"
            color="info"
            onClick={onSendToReview}
            disabled={isProcessing || entries.length === 0}
            startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : <IconChevronRight size={18} />}
            fullWidth
            size="large"
          >
            {isProcessing ? 'Sending...' : 'Send to Review & Finalize'}
          </Button>
        </Stack>
      )}
    </Paper>
  );
};

export default FusionProgressHeader;
