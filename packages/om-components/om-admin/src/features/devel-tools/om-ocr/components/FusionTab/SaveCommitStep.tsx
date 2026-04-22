import React from 'react';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconChevronRight,
  IconChevronLeft,
  IconDeviceFloppy,
  IconShieldCheck,
} from '@tabler/icons-react';
import type { FusionEntry, FusionDraft } from '../../types/fusion';

interface SaveCommitStepProps {
  entries: FusionEntry[];
  drafts: FusionDraft[];
  recordType: string;
  selectedEntryIndex: number | null;
  isProcessing: boolean;
  isSaving: boolean;
  commitSuccess: boolean;
  setCommitSuccess: (val: boolean) => void;
  validationResult: any;
  onSaveDraft: () => void;
  onSaveAllDrafts: () => void;
  onSendToReview: () => void;
  onValidateDrafts: () => void;
  onOpenCommitDialog: () => void;
  onBack: () => void;
}

const SaveCommitStep: React.FC<SaveCommitStepProps> = ({
  entries,
  drafts,
  recordType,
  selectedEntryIndex,
  isProcessing,
  isSaving,
  commitSuccess,
  setCommitSuccess,
  validationResult,
  onSaveDraft,
  onSaveAllDrafts,
  onSendToReview,
  onValidateDrafts,
  onOpenCommitDialog,
  onBack,
}) => {
  const theme = useTheme();

  return (
    <>
      {/* Success Banner */}
      {commitSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setCommitSuccess(false)}
          icon={<IconCheck size={20} />}
        >
          <Typography fontWeight={600}>Records committed successfully!</Typography>
          <Typography variant="body2">Your records have been saved to the database.</Typography>
        </Alert>
      )}

      {/* Review Reminder Banner */}
      {drafts.length > 0 && drafts.some(d => d.status === 'draft') && !commitSuccess && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<IconAlertCircle size={20} />}>
          <Typography fontWeight={600}>Drafts saved. Review entries before committing to database.</Typography>
          <Typography variant="body2">Validate your drafts to check for missing fields, then commit when ready.</Typography>
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" mb={2}>
        Save drafts for review, validate for errors, then commit to the database.
      </Typography>

      {/* Save Buttons */}
      <Stack direction="row" spacing={1} mb={2}>
        <Button
          variant="outlined"
          onClick={onSaveDraft}
          disabled={isProcessing || selectedEntryIndex === null}
          startIcon={isProcessing && !isSaving ? <CircularProgress size={16} /> : <IconDeviceFloppy size={18} />}
        >
          Save Current Draft
        </Button>
        <Button
          variant="outlined"
          onClick={onSaveAllDrafts}
          disabled={isProcessing || entries.length === 0}
          startIcon={<IconDeviceFloppy size={18} />}
        >
          Save All Drafts
        </Button>
        <Button
          variant="contained"
          color="info"
          onClick={onSendToReview}
          disabled={isProcessing || entries.length === 0}
          startIcon={<IconChevronRight size={18} />}
        >
          Send to Review & Finalize
        </Button>
      </Stack>

      {/* Drafts List */}
      {drafts.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1, mb: 2, maxHeight: 150, overflow: 'auto' }}>
          <List dense disablePadding>
            {drafts.map((draft) => (
              <ListItem key={draft.id} disablePadding>
                <ListItemText
                  primary={`Entry ${draft.entry_index + 1} - ${draft.record_type}`}
                  secondary={draft.status === 'committed'
                    ? `Committed → Record #${draft.committed_record_id}`
                    : 'Draft (pending review)'
                  }
                />
                <Chip
                  size="small"
                  label={draft.status}
                  color={draft.status === 'committed' ? 'success' : 'warning'}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Validation Section */}
      <Typography variant="subtitle2" gutterBottom>Step 1: Validate Drafts</Typography>
      <Button
        variant="outlined"
        color="primary"
        onClick={onValidateDrafts}
        disabled={isProcessing || drafts.filter(d => d.status === 'draft').length === 0}
        startIcon={isProcessing ? <CircularProgress size={16} /> : <IconShieldCheck size={18} />}
        sx={{ mb: 2 }}
      >
        Validate Drafts
      </Button>

      {/* Validation Results */}
      {validationResult && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            bgcolor: validationResult.valid ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.error.main, 0.05),
            borderColor: validationResult.valid ? 'success.main' : 'error.main',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            {validationResult.valid ? (
              <IconCheck size={20} color={theme.palette.success.main} />
            ) : (
              <IconAlertTriangle size={20} color={theme.palette.error.main} />
            )}
            <Typography fontWeight={600} color={validationResult.valid ? 'success.main' : 'error.main'}>
              {validationResult.valid ? 'All drafts are valid!' : 'Validation failed'}
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" mb={1}>
            {validationResult.summary?.total} drafts: {validationResult.summary?.valid} valid, {validationResult.summary?.invalid} invalid, {validationResult.summary?.warnings} warnings
          </Typography>

          {validationResult.drafts.some((d: any) => d.missing_fields.length > 0 || d.warnings.length > 0) && (
            <List dense disablePadding>
              {validationResult.drafts.map((draft: any) => (
                (draft.missing_fields.length > 0 || draft.warnings.length > 0) && (
                  <ListItem key={draft.id} disablePadding sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="caption" fontWeight={600}>
                      Entry {draft.entry_index + 1} ({draft.record_type}):
                    </Typography>
                    {draft.missing_fields.map((f: string) => (
                      <Typography key={f} variant="caption" color="error.main" sx={{ pl: 2 }}>
                        • Missing: {f}
                      </Typography>
                    ))}
                    {draft.warnings.map((w: string, i: number) => (
                      <Typography key={i} variant="caption" color="warning.main" sx={{ pl: 2 }}>
                        ⚠ {w}
                      </Typography>
                    ))}
                  </ListItem>
                )
              ))}
            </List>
          )}
        </Paper>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Commit Section */}
      <Typography variant="subtitle2" gutterBottom>Step 2: Commit to Database</Typography>
      <Button
        variant="contained"
        color="success"
        onClick={onOpenCommitDialog}
        disabled={isProcessing || !validationResult?.valid || drafts.filter(d => d.status === 'draft').length === 0}
        startIcon={isProcessing ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
        fullWidth
      >
        {!validationResult ? 'Validate First' :
         !validationResult.valid ? 'Fix Validation Errors' :
         `Commit ${drafts.filter(d => d.status === 'draft').length} Drafts to Database`}
      </Button>

      <Button size="small" onClick={onBack} startIcon={<IconChevronLeft size={16} />} sx={{ mt: 1 }}>
        Back
      </Button>
    </>
  );
};

export default SaveCommitStep;
