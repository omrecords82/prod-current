/**
 * DetectEntriesStepContent — Step 1 content for the Fusion workflow stepper.
 * Handles auto-detect / manual entry count, bbox editing toggles, and entry list.
 * Extracted from FusionTab.tsx
 */
import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconWand,
  IconChevronRight,
} from '@tabler/icons-react';
import type { FusionEntry, FusionDraft, EntryArea, BBox } from '../../types/fusion';
import EntryListPanel from './EntryListPanel';
import { getEntryColor } from './fusionConstants';

interface DetectEntriesStepContentProps {
  entries: FusionEntry[];
  entryAreas: EntryArea[];
  drafts: FusionDraft[];
  selectedEntryIndex: number | null;
  completionState: Set<number>;
  inProgressEntries: Set<number>;
  dirtyEntries: Set<number>;
  hideCompleted: boolean;
  bboxEditMode: boolean;
  showFieldBoxes: boolean;
  isProcessing: boolean;
  manualEntryCount: number;
  onDetectEntries: () => void;
  onManualEntryCount: () => void;
  onSetManualEntryCount: (count: number) => void;
  onSetBboxEditMode: (enabled: boolean) => void;
  onSetShowFieldBoxes: (enabled: boolean) => void;
  onEntrySelect: (index: number) => void;
  onAddEntry: () => void;
  onDeleteEntry: (index: number) => void;
  onSaveBbox: (index: number) => void;
  onResetBbox: (index: number) => void;
  onEditEntry: (index: number) => void;
  onNext: () => void;
}

const DetectEntriesStepContent: React.FC<DetectEntriesStepContentProps> = ({
  entries,
  entryAreas,
  drafts,
  selectedEntryIndex,
  completionState,
  inProgressEntries,
  dirtyEntries,
  hideCompleted,
  bboxEditMode,
  showFieldBoxes,
  isProcessing,
  manualEntryCount,
  onDetectEntries,
  onManualEntryCount,
  onSetManualEntryCount,
  onSetBboxEditMode,
  onSetShowFieldBoxes,
  onEntrySelect,
  onAddEntry,
  onDeleteEntry,
  onSaveBbox,
  onResetBbox,
  onEditEntry,
  onNext,
}) => (
  <>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Detect individual record cards from the scanned image. Works best with Google Vision JSON data.
    </Typography>

    <Stack direction="row" spacing={2} alignItems="center" mb={2}>
      <Button
        variant="contained"
        onClick={onDetectEntries}
        disabled={isProcessing}
        startIcon={isProcessing ? <CircularProgress size={18} color="inherit" /> : <IconWand size={18} />}
      >
        {isProcessing ? 'Detecting...' : 'Auto-Detect Entries'}
      </Button>
      <Typography variant="body2" color="text.secondary">or</Typography>
      <TextField
        type="number"
        size="small"
        label="Manual Count"
        value={manualEntryCount}
        onChange={(e) => onSetManualEntryCount(parseInt(e.target.value) || 1)}
        inputProps={{ min: 1, max: 10 }}
        sx={{ width: 100 }}
      />
      <Button
        variant="outlined"
        onClick={onManualEntryCount}
        disabled={isProcessing || manualEntryCount < 1}
      >
        Set {manualEntryCount} Entries
      </Button>
    </Stack>

    {entries.length > 0 && (
      <Box mt={2}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={bboxEditMode}
                onChange={(e) => onSetBboxEditMode(e.target.checked)}
              />
            }
            label="Edit Entry Areas"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showFieldBoxes}
                onChange={(e) => onSetShowFieldBoxes(e.target.checked)}
              />
            }
            label="Show Field Boxes"
          />
          {bboxEditMode && (
            <Typography variant="caption" color="text.secondary">
              Drag or resize bounding boxes on the image to adjust entry areas
            </Typography>
          )}
        </Stack>

        <EntryListPanel
          entries={entries}
          entryAreas={entryAreas}
          drafts={drafts}
          selectedEntryIndex={selectedEntryIndex}
          completionState={completionState}
          inProgressEntries={inProgressEntries}
          dirtyEntries={dirtyEntries}
          hideCompleted={hideCompleted}
          bboxEditMode={bboxEditMode}
          getEntryColor={getEntryColor}
          onEntrySelect={onEntrySelect}
          onAddEntry={onAddEntry}
          onDeleteEntry={onDeleteEntry}
          onSaveBbox={onSaveBbox}
          onResetBbox={onResetBbox}
          onEditEntry={onEditEntry}
        />
        <Button size="small" onClick={onNext} endIcon={<IconChevronRight size={16} />} sx={{ mt: 1 }}>
          Continue
        </Button>
      </Box>
    )}
  </>
);

export default DetectEntriesStepContent;
