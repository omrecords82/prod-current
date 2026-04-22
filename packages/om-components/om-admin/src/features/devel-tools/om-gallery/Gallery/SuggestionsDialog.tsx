import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import { IconChevronDown, IconChevronUp, IconCopy } from '@tabler/icons-react';
import type { SuggestionStatus } from './types';

interface SuggestionsDialogProps {
  open: boolean;
  onClose: () => void;
  suggestions: any[];
  suggestionStatuses: Record<number, SuggestionStatus>;
  showFullSummary: boolean;
  setShowFullSummary: (show: boolean) => void;
  summaryExpanded: boolean;
  setSummaryExpanded: (expanded: boolean) => void;
  validating: boolean;
  applying: boolean;
  onDryRun: () => void;
  onApplyAll: () => void;
  onApplySingle: (idx: number) => void;
  onCopySummary: () => void;
}

const getStatusChip = (idx: number, suggestionStatuses: Record<number, SuggestionStatus>) => {
  const status = suggestionStatuses[idx];
  if (!status || status.status === 'pending') {
    return <Chip label="Pending" size="small" color="default" />;
  }
  const colorMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
    'valid': 'success',
    'invalid': 'error',
    'applied': 'success',
    'failed': 'error',
  };
  return (
    <Chip
      label={status.status.charAt(0).toUpperCase() + status.status.slice(1)}
      size="small"
      color={colorMap[status.status] || 'default'}
      title={status.message}
    />
  );
};

const SuggestionsDialog: React.FC<SuggestionsDialogProps> = ({
  open,
  onClose,
  suggestions,
  suggestionStatuses,
  showFullSummary,
  setShowFullSummary,
  summaryExpanded,
  setSummaryExpanded,
  validating,
  applying,
  onDryRun,
  onApplyAll,
  onApplySingle,
  onCopySummary,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Catalog Suggestions</Typography>
          {Object.keys(suggestionStatuses).length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Total: {suggestions.length} |
                Valid: {Object.values(suggestionStatuses).filter(s => s.status === 'valid').length} |
                Invalid: {Object.values(suggestionStatuses).filter(s => s.status === 'invalid').length}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            onClick={onDryRun}
            disabled={suggestions.length === 0 || validating || applying}
            startIcon={validating ? <LinearProgress sx={{ width: 16, height: 16 }} /> : null}
          >
            {validating ? 'Validating...' : 'Dry Run'}
          </Button>
          <Button
            variant="contained"
            onClick={onApplyAll}
            disabled={suggestions.length === 0 || applying || validating}
            startIcon={applying ? <LinearProgress sx={{ width: 16, height: 16 }} /> : null}
          >
            {applying ? 'Applying...' : 'Apply All'}
          </Button>
          <FormControlLabel
            control={
              <Checkbox
                checked={showFullSummary}
                onChange={(e) => setShowFullSummary(e.target.checked)}
              />
            }
            label="Show full summary"
          />
        </Box>

        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {suggestions.map((suggestion, idx) => {
            const status = suggestionStatuses[idx];
            const isValid = status?.status === 'valid';
            const isInvalid = status?.status === 'invalid';
            const isApplied = status?.status === 'applied';
            const isFailed = status?.status === 'failed';

            return (
              <Box
                key={idx}
                sx={{
                  mb: 2,
                  p: 2,
                  border: 1,
                  borderColor: isInvalid || isFailed ? 'error.main' : isValid || isApplied ? 'success.main' : 'divider',
                  borderRadius: 1,
                  backgroundColor: isValid || isApplied ? 'action.selected' : 'transparent',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{suggestion.path}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Suggested: {suggestion.suggestedDir}/{suggestion.suggestedName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 2 }}>
                    {getStatusChip(idx, suggestionStatuses)}
                  </Box>
                </Box>

                {status && status.message && (
                  <Alert
                    severity={isInvalid || isFailed ? 'error' : isValid || isApplied ? 'success' : 'info'}
                    sx={{ mt: 1, mb: 1 }}
                  >
                    {status.message}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onApplySingle(idx)}
                    disabled={isApplied || applying || validating}
                  >
                    {isApplied ? 'Applied' : 'Apply'}
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Summary Panel */}
        {Object.keys(suggestionStatuses).length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 1,
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
                onClick={() => setSummaryExpanded(!summaryExpanded)}
              >
                <Typography variant="subtitle2">
                  Summary: Succeeded: {Object.values(suggestionStatuses).filter(s => s.status === 'applied' || s.status === 'valid').length},
                  Failed: {Object.values(suggestionStatuses).filter(s => s.status === 'failed' || s.status === 'invalid').length}
                </Typography>
                <IconButton size="small">
                  {summaryExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                </IconButton>
              </Box>

              <Collapse in={summaryExpanded}>
                <Box sx={{ mt: 1, maxHeight: 300, overflow: 'auto' }}>
                  {(showFullSummary
                    ? Object.entries(suggestionStatuses)
                    : Object.entries(suggestionStatuses).filter(([_, s]) => s.status === 'invalid' || s.status === 'failed')
                  ).map(([idxStr, status]) => {
                    const idx = parseInt(idxStr);
                    const suggestion = suggestions[idx];
                    if (!suggestion) return null;

                    return (
                      <Box
                        key={idx}
                        sx={{
                          p: 1,
                          mb: 1,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          backgroundColor: status.status === 'invalid' || status.status === 'failed'
                            ? 'error.light'
                            : 'success.light',
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {suggestion.path} → {suggestion.suggestedDir}/{suggestion.suggestedName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Status: {status.status} | Code: {status.code}
                        </Typography>
                        {status.message && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            {status.message}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    startIcon={<IconCopy size={16} />}
                    onClick={onCopySummary}
                  >
                    Copy Summary
                  </Button>
                </Box>
              </Collapse>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuggestionsDialog;
