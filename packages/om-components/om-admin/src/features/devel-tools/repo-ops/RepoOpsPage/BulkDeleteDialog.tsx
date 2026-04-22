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
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import { IconTrash } from '@tabler/icons-react';
import type { BranchAnalysis, BranchClassification } from './types';

interface BulkDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedForDelete: Set<string>;
  analysis: BranchAnalysis | null;
  bulkDeleting: boolean;
  isDark: boolean;
  fontFamily: string;
  labelColor: string;
  textColor: string;
  classChip: (cls: BranchClassification) => Record<string, any>;
}

const BulkDeleteDialog: React.FC<BulkDeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  selectedForDelete,
  analysis,
  bulkDeleting,
  isDark,
  fontFamily: f,
  labelColor,
  textColor,
  classChip,
}) => (
  <Dialog
    open={open}
    onClose={() => !bulkDeleting && onClose()}
    PaperProps={{ sx: { borderRadius: 2, maxWidth: 520, fontFamily: f } }}
  >
    <DialogTitle sx={{ fontFamily: f, fontWeight: 600, fontSize: '1.05rem', pb: 0.5 }}>
      Delete {selectedForDelete.size} Branch{selectedForDelete.size !== 1 ? 'es' : ''}
    </DialogTitle>
    <DialogContent>
      <Box sx={{ mt: 1 }}>
        <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, mb: 2 }}>
          The following branches are classified as <strong>Already Merged</strong>, <strong>Safe To Delete</strong>, or <strong>Stale / Diverged</strong>.
          Each branch will be independently verified server-side before deletion.
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            maxHeight: 200, overflow: 'auto', mb: 2,
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
          }}
        >
          {Array.from(selectedForDelete).map(name => {
            const branch = analysis?.remoteBranches.find(b => b.name === name);
            return (
              <Box
                key={name}
                sx={{
                  px: 1.5, py: 0.75,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor }}>
                  {name}
                </Typography>
                {branch && (
                  <Chip
                    size="small"
                    label={branch.classification}
                    sx={{ fontFamily: f, fontSize: '0.55rem', height: 18, ...classChip(branch.classification) }}
                  />
                )}
              </Box>
            );
          })}
        </Paper>

        <Alert severity="info" sx={{ fontFamily: f, fontSize: '0.8125rem' }}>
          Remote branches will be deleted. Local tracking branches will also be removed (safe delete) where they exist.
        </Alert>

        {bulkDeleting && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
            <Typography sx={{ fontFamily: f, fontSize: '0.75rem', color: labelColor, mt: 0.5, textAlign: 'center' }}>
              Deleting branches...
            </Typography>
          </Box>
        )}
      </Box>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
      <Button
        onClick={onClose}
        disabled={bulkDeleting}
        sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.8125rem' }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onConfirm}
        disabled={bulkDeleting}
        startIcon={bulkDeleting ? <CircularProgress size={14} color="inherit" /> : <IconTrash size={14} />}
        sx={{
          fontFamily: f, textTransform: 'none', fontSize: '0.8125rem',
          bgcolor: isDark ? 'rgba(139,92,246,0.8)' : '#7c3aed',
          '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.95)' : '#6d28d9' },
        }}
      >
        {bulkDeleting ? 'Deleting...' : `Delete ${selectedForDelete.size} Branch${selectedForDelete.size !== 1 ? 'es' : ''}`}
      </Button>
    </DialogActions>
  </Dialog>
);

export default BulkDeleteDialog;
