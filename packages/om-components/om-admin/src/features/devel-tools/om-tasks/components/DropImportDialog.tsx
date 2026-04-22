/**
 * DropImportDialog — Dialog for handling dropped markdown file import actions.
 * Shows parsed revisions with expandable accordion preview and action buttons.
 * Extracted from CreateTaskDialog.tsx
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  AttachFile as AttachFileIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import type { TaskRevision } from './createTaskTypes';
import { getRevisionLabel } from './markdownImportUtils';

interface DropImportDialogProps {
  open: boolean;
  droppedFile: { name: string; content: string } | null;
  parsedRevisions: TaskRevision[];
  parseError: string | null;
  onAction: (action: 'replace' | 'append' | 'attach' | 'import_revisions') => void;
  onCancel: () => void;
}

const DropImportDialog: React.FC<DropImportDialogProps> = ({
  open,
  droppedFile,
  parsedRevisions,
  parseError,
  onAction,
  onCancel,
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FileIcon />
          <Typography>Import {droppedFile?.name}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {parseError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parseError}
          </Alert>
        )}

        {parsedRevisions.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Parsed Revisions ({parsedRevisions.length})
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 2 }}>
              Revisions found in file order:
            </Typography>
            <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
              {parsedRevisions.map((revision) => (
                <Accordion key={revision.rev_index} defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Chip
                        label={getRevisionLabel(revision)}
                        size="small"
                        color={revision.rev_number !== null ? 'primary' : 'default'}
                        sx={{ minWidth: '60px' }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        {revision.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {revision.markdown.split('\n').length} lines
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        bgcolor: 'grey.50',
                        p: 2,
                        borderRadius: 1,
                        maxHeight: '300px',
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      {revision.markdown}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Choose how to handle the dropped file:
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {parsedRevisions.length > 0 && (
            <Button
              variant="contained"
              fullWidth
              onClick={() => onAction('import_revisions')}
              disabled={!droppedFile || parsedRevisions.length === 0}
              sx={{ bgcolor: '#8c249d', '&:hover': { bgcolor: '#6a1b9a' } }}
            >
              Import as Revisions ({parsedRevisions.length} sections)
            </Button>
          )}
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onAction('replace')}
            disabled={!droppedFile}
          >
            Replace Details
          </Button>
          <Button
            variant={parsedRevisions.length === 0 ? 'contained' : 'outlined'}
            fullWidth
            onClick={() => onAction('append')}
            disabled={!droppedFile}
            sx={parsedRevisions.length === 0 ? { bgcolor: '#8c249d', '&:hover': { bgcolor: '#6a1b9a' } } : {}}
          >
            Append to Details {parsedRevisions.length === 0 && '(Default)'}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onAction('attach')}
            disabled={!droppedFile}
            startIcon={<AttachFileIcon />}
          >
            Attach as File Only
          </Button>
        </Stack>
        {droppedFile && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            File size: {(droppedFile.content.length / 1024).toFixed(2)} KB
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DropImportDialog;
