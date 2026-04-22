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
import { IconChevronRight, IconWand } from '@tabler/icons-react';
import type { FusionDraft, FusionEntry, EntryArea, BBox } from '../../types/fusion';
import EntryListPanel from './EntryListPanel';
import { getEntryColor } from './fusionConstants';

interface DetectEntriesStepProps {
  entries: FusionEntry[];
  entryAreas: EntryArea[];
  drafts: FusionDraft[];
  selectedEntryIndex: number | null;
  completionState: Set<number>;
  inProgressEntries: Set<number>;
  dirtyEntries: Set<number>;
  hideCompleted: boolean;
  bboxEditMode: boolean;
  setBboxEditMode: (val: boolean) => void;
  showFieldBoxes: boolean;
  setShowFieldBoxes: (val: boolean) => void;
  manualEntryCount: number;
  setManualEntryCount: (val: number) => void;
  isProcessing: boolean;
  onDetectEntries: () => void;
  onManualEntryCount: () => void;
  onEntrySelect: (idx: number) => void;
  onAddEntry: () => void;
  onDeleteEntry: (idx: number) => void;
  onSaveBbox: (idx: number) => void;
  onResetBbox: (idx: number) => void;
  onEditEntry: (idx: number) => void;
  onNext: () => void;
}

const DetectEntriesStep: React.FC<DetectEntriesStepProps> = ({
  entries,
  entryAreas,
  drafts,
  selectedEntryIndex,
  completionState,
  inProgressEntries,
  dirtyEntries,
  hideCompleted,
  bboxEditMode,
  setBboxEditMode,
  showFieldBoxes,
  setShowFieldBoxes,
  manualEntryCount,
  setManualEntryCount,
  isProcessing,
  onDetectEntries,
  onManualEntryCount,
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
        onChange={(e) => setManualEntryCount(parseInt(e.target.value) || 1)}
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
                onChange={(e) => setBboxEditMode(e.target.checked)}
              />
            }
            label="Edit Entry Areas"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showFieldBoxes}
                onChange={(e) => setShowFieldBoxes(e.target.checked)}
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

export default DetectEntriesStep;
