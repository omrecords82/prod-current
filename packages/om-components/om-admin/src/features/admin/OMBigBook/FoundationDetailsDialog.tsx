import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Typography,
} from '@mui/material';
import { Psychology as PsychologyIcon } from '@mui/icons-material';
import type { EthicalFoundation } from './types';

interface FoundationDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  foundation: EthicalFoundation | null;
}

const FoundationDetailsDialog: React.FC<FoundationDetailsDialogProps> = ({
  open,
  onClose,
  foundation,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>
      {foundation && (
        <>
          <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Ethical Foundation Details
          <Chip
            label={foundation.gradeGroup}
            size="small"
            sx={{ ml: 2 }}
          />
        </>
      )}
    </DialogTitle>
    <DialogContent>
      {foundation && (
        <Box>
          <Typography variant="h6" gutterBottom color="primary">
            Question
          </Typography>
          <Typography variant="body1" paragraph>
            {foundation.question}
          </Typography>

          <Typography variant="h6" gutterBottom color="primary">
            Your Response
          </Typography>
          <Typography variant="body1" paragraph>
            {foundation.userResponse}
          </Typography>

          <Typography variant="h6" gutterBottom color="primary">
            Reasoning
          </Typography>
          <Typography variant="body1" paragraph>
            {foundation.reasoning}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="primary">Category</Typography>
              <Typography variant="body2">
                {foundation.category.replace('_', ' ')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="primary">Weight</Typography>
              <Typography variant="body2">{foundation.weight}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="primary">Confidence</Typography>
              <Typography variant="body2">{foundation.confidence}%</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="primary">Created</Typography>
              <Typography variant="body2">
                {new Date(foundation.createdAt).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>

          {foundation.appliedContexts.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Applied Contexts
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {foundation.appliedContexts.map((context, index) => (
                  <Chip
                    key={index}
                    label={context}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </>
          )}

          {foundation.lastReferenced && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="primary">
                Last Referenced
              </Typography>
              <Typography variant="body2">
                {new Date(foundation.lastReferenced).toLocaleString()}
              </Typography>
            </>
          )}
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

export default FoundationDetailsDialog;
