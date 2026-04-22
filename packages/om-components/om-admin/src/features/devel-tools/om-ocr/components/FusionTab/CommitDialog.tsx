import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import type { FusionDraft } from '../../types/fusion';

interface CommitDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  drafts: FusionDraft[];
  recordType: string;
  churchId: number;
  churchName?: string;
}

const CommitDialog: React.FC<CommitDialogProps> = ({
  open,
  onClose,
  onConfirm,
  drafts,
  recordType,
  churchId,
  churchName,
}) => {
  const theme = useTheme();
  const draftCount = drafts.filter(d => d.status === 'draft').length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconAlertTriangle size={24} color={theme.palette.warning.main} />
          <Typography variant="h6">Confirm Commit to Database</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            You are about to create {draftCount} {recordType} record(s) in:
          </Typography>
          <Typography variant="body1" fontWeight={700} sx={{ mt: 1 }}>
            {churchName || `Church ${churchId}`}
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary">
          This action is reversible only by manual deletion of the created records.
          Please ensure all field values are correct before proceeding.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={onConfirm}
          startIcon={<IconCheck size={18} />}
        >
          Yes, Commit Records
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommitDialog;
