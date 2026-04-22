import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import { IconGitMerge } from '@tabler/icons-react';
import type { RemoteBranch } from './types';

interface MergeBranchDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  target: RemoteBranch | null;
  merging: boolean;
  isDark: boolean;
  fontFamily: string;
  labelColor: string;
}

const MergeBranchDialog: React.FC<MergeBranchDialogProps> = ({
  open,
  onClose,
  onConfirm,
  target,
  merging,
  isDark,
  fontFamily: f,
  labelColor,
}) => (
  <Dialog
    open={open}
    onClose={() => !merging && onClose()}
    PaperProps={{ sx: { borderRadius: 2, maxWidth: 480, fontFamily: f } }}
  >
    <DialogTitle sx={{ fontFamily: f, fontWeight: 600, fontSize: '1.05rem', pb: 0.5 }}>
      Merge Branch
    </DialogTitle>
    <DialogContent>
      {target && (
        <Box sx={{ mt: 1 }}>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, fontFamily: 'monospace', fontSize: '0.8125rem', wordBreak: 'break-all', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
            {target.name}
          </Paper>

          <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, mb: 1.5 }}>
            This branch has <strong>{target.ahead}</strong> unique commit{target.ahead !== 1 ? 's' : ''} and is not behind main.
            It will be fast-forward merged into <strong>main</strong>, pushed to origin, and the branch will be deleted.
          </Typography>

          <Typography sx={{ fontFamily: f, fontSize: '0.75rem', color: labelColor }}>
            This will run <code>git merge --ff-only {target.name}</code> into main
          </Typography>
        </Box>
      )}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
      <Button
        onClick={onClose}
        disabled={merging}
        sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.8125rem' }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onConfirm}
        disabled={merging}
        startIcon={merging ? <CircularProgress size={14} color="inherit" /> : <IconGitMerge size={14} />}
        sx={{
          fontFamily: f, textTransform: 'none', fontSize: '0.8125rem',
          bgcolor: isDark ? 'rgba(34,197,94,0.8)' : '#16a34a',
          '&:hover': { bgcolor: isDark ? 'rgba(34,197,94,0.95)' : '#15803d' },
        }}
      >
        {merging ? 'Merging...' : 'Confirm Merge'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default MergeBranchDialog;
