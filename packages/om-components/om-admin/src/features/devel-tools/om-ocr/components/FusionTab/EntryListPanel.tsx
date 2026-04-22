import React from 'react';
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  IconCheck,
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import type { FusionEntry, FusionDraft } from '../../types/fusion';

interface EntryListPanelProps {
  entries: FusionEntry[];
  entryAreas: any[];
  drafts: FusionDraft[];
  selectedEntryIndex: number | null;
  completionState: Set<number>;
  inProgressEntries: Set<number>;
  dirtyEntries: Set<number>;
  hideCompleted: boolean;
  bboxEditMode: boolean;
  getEntryColor: (idx: number) => string;
  onEntrySelect: (idx: number) => void;
  onAddEntry: () => void;
  onDeleteEntry: (idx: number) => void;
  onSaveBbox: (idx: number) => void;
  onResetBbox: (idx: number) => void;
  onEditEntry: (idx: number) => void;
}

const EntryListPanel: React.FC<EntryListPanelProps> = ({
  entries,
  entryAreas,
  drafts,
  selectedEntryIndex,
  completionState,
  inProgressEntries,
  dirtyEntries,
  hideCompleted,
  bboxEditMode,
  getEntryColor,
  onEntrySelect,
  onAddEntry,
  onDeleteEntry,
  onSaveBbox,
  onResetBbox,
  onEditEntry,
}) => {
  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2">
          Detected Entries ({entries.length}):
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Add Entry">
            <IconButton size="small" onClick={onAddEntry} color="primary">
              <IconPlus size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {entryAreas.length === 0 && entries.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            No entry areas detected yet. Click "Auto-Detect Entries" to detect record cards from the image.
          </Typography>
          {drafts.length > 0 && drafts.some(d => d.bbox_json?.entryBbox) && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Note: Legacy entryBbox found in drafts. Run "Auto-Detect Entries" to migrate to entryAreas format.
            </Typography>
          )}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {entries.map((entry, idx) => {
          const isCompleted = completionState.has(idx);
          const isInProgress = inProgressEntries.has(idx) && !isCompleted;
          const isSelected = selectedEntryIndex === idx;
          const isDirty = dirtyEntries.has(idx);
          const entryColor = getEntryColor(idx);

          if (hideCompleted && isCompleted) return null;

          return (
            <Paper
              key={entry.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderLeft: `4px solid ${entryColor}`,
                bgcolor: isSelected ? alpha(entryColor, 0.1) : 'background.paper',
                borderColor: isSelected ? entryColor : 'divider',
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha(entryColor, 0.05) },
              }}
              onClick={() => onEntrySelect(idx)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onEditEntry(idx);
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="center" flex={1}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      bgcolor: entryColor,
                      border: `2px solid ${isSelected ? entryColor : 'transparent'}`,
                      boxShadow: isSelected ? `0 0 8px ${alpha(entryColor, 0.5)}` : 'none',
                    }}
                  />
                  <Stack spacing={0.5} flex={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="body2"
                        fontWeight={isSelected ? 600 : 500}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onEditEntry(idx);
                        }}
                        sx={{ cursor: 'pointer' }}
                      >
                        {entry.displayName || `Entry ${idx + 1}`}
                        {entry.recordNumber && ` (Record #${entry.recordNumber})`}
                      </Typography>
                      {isCompleted && (
                        <Chip size="small" label="Saved" color="success" icon={<IconCheck size={12} />} sx={{ height: 20 }} />
                      )}
                      {isInProgress && (
                        <Chip size="small" label="In Progress" color="info" sx={{ height: 20 }} />
                      )}
                      {isDirty && (
                        <Chip size="small" label="Unsaved" color="warning" sx={{ height: 20 }} />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      BBox: ({Math.round(entry.bbox.x)}, {Math.round(entry.bbox.y)}){' '}
                      {Math.round(entry.bbox.w)}×{Math.round(entry.bbox.h)}px
                      {entry.lines.length > 0 && ` • ${entry.lines.length} lines`}
                    </Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  {bboxEditMode && isSelected && (
                    <>
                      {isDirty && (
                        <Tooltip title="Save bbox changes">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onSaveBbox(idx); }}
                            color="primary"
                          >
                            <IconDeviceFloppy size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Reset to detected bbox">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); onResetBbox(idx); }}
                          color="default"
                        >
                          <IconRefresh size={16} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title="Delete Entry">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete Entry ${idx + 1}?`)) {
                          onDeleteEntry(idx);
                        }
                      }}
                      color="error"
                      disabled={entries.length <= 1}
                    >
                      <IconTrash size={16} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </>
  );
};

export default EntryListPanel;
