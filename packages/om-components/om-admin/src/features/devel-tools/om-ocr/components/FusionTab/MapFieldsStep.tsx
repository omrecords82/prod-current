/**
 * MapFieldsStep — Step 3 of the Fusion Workflow.
 * Extract and map values from detected labels to database fields.
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
  Paper,
  Alert,
  TextField,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  IconPlayerPlay,
  IconChevronRight,
  IconChevronLeft,
  IconFocusCentered,
} from '@tabler/icons-react';
import type { MappedField, BBox } from '../../types/fusion';
import { getConfidenceColor } from './fusionConstants';

interface FieldDef {
  name: string;
  label: string;
  required: boolean;
  type: string;
}

interface MapFieldsStepProps {
  selectedEntry: any | null;
  selectedEntryIndex: number | null;
  mappedFields: Record<string, MappedField>;
  currentFields: FieldDef[];
  isProcessing: boolean;
  manualEditMode: Set<number>;
  onAutoMap: () => void;
  onFieldChange: (fieldName: string, value: string) => void;
  onFieldFocus: (fieldName: string) => void;
  onToggleManualEdit: (entryIndex: number) => void;
  onHighlightBbox?: (bbox: BBox | null, color?: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const MapFieldsStep: React.FC<MapFieldsStepProps> = ({
  selectedEntry,
  selectedEntryIndex,
  mappedFields,
  currentFields,
  isProcessing,
  manualEditMode,
  onAutoMap,
  onFieldChange,
  onFieldFocus,
  onToggleManualEdit,
  onHighlightBbox,
  onNext,
  onBack,
}) => {
  if (!selectedEntry) {
    return <Alert severity="info">Select an entry first to map fields.</Alert>;
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Extract and map values from the detected labels to database fields.
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Button
          variant="outlined"
          onClick={onAutoMap}
          disabled={isProcessing || manualEditMode.has(selectedEntryIndex ?? -1)}
          startIcon={isProcessing ? <CircularProgress size={16} /> : <IconPlayerPlay size={18} />}
        >
          {isProcessing ? 'Mapping...' : 'Auto-Map Fields'}
        </Button>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={manualEditMode.has(selectedEntryIndex ?? -1)}
              onChange={() => selectedEntryIndex !== null && onToggleManualEdit(selectedEntryIndex)}
            />
          }
          label="Manual Edit Mode"
        />
        {manualEditMode.has(selectedEntryIndex ?? -1) && (
          <Typography variant="caption" color="text.secondary">
            (Auto-mapping disabled, enter values manually)
          </Typography>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto', mb: 2 }}>
        <Stack spacing={1.5}>
          {currentFields.map((field) => {
            const mapped = mappedFields[field.name];
            return (
              <Stack key={field.name} direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ width: 120, flexShrink: 0 }}>
                  {field.label}
                  {field.required && <span style={{ color: 'red' }}>*</span>}
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={mapped?.value || ''}
                  onChange={(e) => onFieldChange(field.name, e.target.value)}
                  onFocus={() => onFieldFocus(field.name)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  multiline={field.type === 'textarea'}
                  rows={field.type === 'textarea' ? 2 : 1}
                />
                {mapped && (
                  <Tooltip title={`Confidence: ${Math.round(mapped.confidence * 100)}%`}>
                    <Chip
                      size="small"
                      label={`${Math.round(mapped.confidence * 100)}%`}
                      color={getConfidenceColor(mapped.confidence)}
                      sx={{ minWidth: 50 }}
                    />
                  </Tooltip>
                )}
                {mapped?.valueBbox && (
                  <Tooltip title="Highlight on image">
                    <IconButton
                      size="small"
                      onClick={() => onHighlightBbox?.(mapped.valueBbox!, '#FF9800')}
                    >
                      <IconFocusCentered size={16} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            );
          })}
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={onBack} startIcon={<IconChevronLeft size={16} />}>
          Back
        </Button>
        <Button size="small" onClick={onNext} endIcon={<IconChevronRight size={16} />}>
          Continue
        </Button>
      </Stack>
    </>
  );
};

export default MapFieldsStep;
