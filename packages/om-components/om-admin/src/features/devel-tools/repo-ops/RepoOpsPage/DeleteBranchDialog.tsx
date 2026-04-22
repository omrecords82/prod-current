import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import { IconTrash } from '@tabler/icons-react';
import type { BranchClassification, RemoteBranch } from './types';

interface DeleteBranchDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  target: RemoteBranch | null;
  deleting: boolean;
  isDark: boolean;
  fontFamily: string;
  labelColor: string;
  classChip: (cls: BranchClassification) => Record<string, any>;
}

const DeleteBranchDialog: React.FC<DeleteBranchDialogProps> = ({
  open,
  onClose,
  onConfirm,
  target,
  deleting,
  isDark,
  fontFamily: f,
  labelColor,
  classChip,
}) => (
  <Dialog
    open={open}
    onClose={() => !deleting && onClose()}
    PaperProps={{ sx: { borderRadius: 2, maxWidth: 480, fontFamily: f } }}
  >
    <DialogTitle sx={{ fontFamily: f, fontWeight: 600, fontSize: '1.05rem', pb: 0.5 }}>
      Delete Branch
    </DialogTitle>
    <DialogContent>
      {target && (
        <Box sx={{ mt: 1 }}>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, fontFamily: 'monospace', fontSize: '0.8125rem', wordBreak: 'break-all', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
            {target.name}
          </Paper>

          <Chip
            size="small"
            label={target.classification}
            sx={{ mb: 2, fontFamily: f, fontSize: '0.75rem', fontWeight: 600, ...classChip(target.classification) }}
          />

          <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, mb: 1.5 }}>
            {target.classification === 'Already Merged'
              ? 'All commits on this branch have been merged into main. No unique work will be lost.'
              : target.classification === 'Stale / Diverged'
              ? `This branch has ${target.ahead} commit(s) ahead but is ${target.behind} commit(s) behind main. It is stale or significantly diverged and unlikely to merge cleanly.`
              : 'This branch has no unique commits ahead of main. No work will be lost.'}
          </Typography>

          {target.hasLocal && (
            <Alert severity="info" sx={{ mb: 1.5, fontFamily: f, fontSize: '0.8125rem' }}>
              The local tracking branch will also be removed (safe delete).
            </Alert>
          )}

          <Typography sx={{ fontFamily: f, fontSize: '0.75rem', color: labelColor }}>
            This will run <code>git push origin --delete {target.name}</code>
          </Typography>
        </Box>
      )}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
      <Button
        onClick={onClose}
        disabled={deleting}
        sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.8125rem' }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onConfirm}
        disabled={deleting}
        startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <IconTrash size={14} />}
        sx={{
          fontFamily: f, textTransform: 'none', fontSize: '0.8125rem',
          bgcolor: isDark ? 'rgba(139,92,246,0.8)' : '#7c3aed',
          '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.95)' : '#6d28d9' },
        }}
      >
        {deleting ? 'Deleting...' : 'Confirm Delete'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteBranchDialog;
