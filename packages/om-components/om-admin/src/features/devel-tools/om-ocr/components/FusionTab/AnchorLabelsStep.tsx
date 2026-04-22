/**
 * AnchorLabelsStep — Step 2 of the Fusion Workflow.
 * Detects form labels to anchor field extraction.
 * Extracted from FusionTab.tsx
 */
import React from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  IconTarget,
  IconChevronRight,
  IconChevronLeft,
} from '@tabler/icons-react';
import type { FusionEntry, DetectedLabel, BBox } from '../../types/fusion';
import { getConfidenceColor } from './fusionConstants';

interface AnchorLabelsStepProps {
  selectedEntry: FusionEntry | null;
  detectedLabels: DetectedLabel[];
  recordType: 'baptism' | 'marriage' | 'funeral';
  isProcessing: boolean;
  onDetectLabels: () => void;
  onRecordTypeChange: (newType: 'baptism' | 'marriage' | 'funeral') => void;
  onHighlightBbox?: (bbox: BBox | null, color?: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const AnchorLabelsStep: React.FC<AnchorLabelsStepProps> = ({
  selectedEntry,
  detectedLabels,
  recordType,
  isProcessing,
  onDetectLabels,
  onRecordTypeChange,
  onHighlightBbox,
  onNext,
  onBack,
}) => {
  if (!selectedEntry) {
    return <Alert severity="info">Select an entry first to detect labels.</Alert>;
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Find form labels (e.g., "NAME OF CHILD", "DATE OF BIRTH") to anchor field extraction.
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Record Type</InputLabel>
          <Select
            value={recordType}
            label="Record Type"
            onChange={(e) => onRecordTypeChange(e.target.value as any)}
          >
            <MenuItem value="baptism">Baptism</MenuItem>
            <MenuItem value="marriage">Marriage</MenuItem>
            <MenuItem value="funeral">Funeral</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={onDetectLabels}
          disabled={isProcessing}
          startIcon={isProcessing ? <CircularProgress size={16} /> : <IconTarget size={18} />}
        >
          {isProcessing ? 'Detecting...' : 'Detect Labels'}
        </Button>
      </Stack>

      {detectedLabels.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1, maxHeight: 200, overflow: 'auto', mb: 2 }}>
          <List dense disablePadding>
            {detectedLabels.map((label, idx) => (
              <ListItem key={idx} disablePadding>
                <ListItemButton
                  onClick={() => onHighlightBbox?.(label.bbox, '#2196F3')}
                  dense
                >
                  <ListItemText
                    primary={label.label}
                    secondary={`→ ${label.canonicalField} (${Math.round(label.confidence * 100)}%)`}
                  />
                  <Chip
                    size="small"
                    label={`${Math.round(label.confidence * 100)}%`}
                    color={getConfidenceColor(label.confidence)}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={onBack} startIcon={<IconChevronLeft size={16} />}>
          Back
        </Button>
        <Button
          size="small"
          onClick={onNext}
          endIcon={<IconChevronRight size={16} />}
          disabled={detectedLabels.length === 0}
        >
          Continue
        </Button>
      </Stack>
    </>
  );
};

export default AnchorLabelsStep;
