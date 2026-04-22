/**
 * EntryEditorDialog - Dialog for editing entry metadata
 * Supports rename, delete, and assign mapping target
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import { IconX, IconTrash, IconCopy, IconDeviceFloppy } from '@tabler/icons-react';
import { FusionEntry } from '../types/fusion';

interface EntryEditorDialogProps {
  open: boolean;
  entry: FusionEntry | null;
  recordType: 'baptism' | 'marriage' | 'funeral';
  onClose: () => void;
  onSave: (updates: {
    displayName?: string;
    mapTargetTable?: 'baptism_records' | 'marriage_records' | 'funeral_records';
  }) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export const EntryEditorDialog: React.FC<EntryEditorDialogProps> = ({
  open,
  entry,
  recordType,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [mapTargetTable, setMapTargetTable] = useState<'baptism_records' | 'marriage_records' | 'funeral_records'>(
    recordType === 'baptism' ? 'baptism_records' :
    recordType === 'marriage' ? 'marriage_records' :
    'funeral_records'
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setDisplayName(entry.displayName || `Entry ${entry.index + 1}`);
      setMapTargetTable(
        entry.mapTargetTable ||
        (recordType === 'baptism' ? 'baptism_records' :
         recordType === 'marriage' ? 'marriage_records' :
         'funeral_records')
      );
      setShowDeleteConfirm(false);
    }
  }, [entry, recordType]);

  const handleSave = () => {
    if (!entry) return;
    onSave({
      displayName: displayName.trim() || undefined,
      mapTargetTable,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    onDelete();
    onClose();
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate();
      onClose();
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Edit Entry {entry.index + 1}</Typography>
          <IconButton size="small" onClick={onClose}>
            <IconX size={20} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Entry Index (readonly) */}
          <TextField
            label="Entry Index"
            value={entry.index}
            disabled
            fullWidth
            size="small"
            helperText="Entry index cannot be changed"
          />

          {/* Display Name */}
          <TextField
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            size="small"
            placeholder={`Entry ${entry.index + 1}`}
            helperText="Custom name for this entry (e.g., 'Row 1 / Peter Pausells')"
          />

          {/* Record Type (readonly) */}
          <TextField
            label="Record Type"
            value={recordType}
            disabled
            fullWidth
            size="small"
          />

          {/* Map Target Table */}
          <FormControl fullWidth size="small">
            <InputLabel>Map Target Table</InputLabel>
            <Select
              value={mapTargetTable}
              onChange={(e) => setMapTargetTable(e.target.value as typeof mapTargetTable)}
              label="Map Target Table"
            >
              <MenuItem value="baptism_records">baptism_records</MenuItem>
              <MenuItem value="marriage_records">marriage_records</MenuItem>
              <MenuItem value="funeral_records">funeral_records</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Database table where this entry will be committed
            </Typography>
          </FormControl>

          {/* Record Number (if available) */}
          {entry.recordNumber && (
            <TextField
              label="Record Number"
              value={entry.recordNumber}
              disabled
              fullWidth
              size="small"
            />
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <Alert severity="warning">
              Are you sure you want to delete this entry? This action cannot be undone.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
          <Button
            startIcon={<IconTrash size={18} />}
            onClick={handleDelete}
            color="error"
            variant={showDeleteConfirm ? 'contained' : 'outlined'}
          >
            {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
          </Button>
          {onDuplicate && (
            <Button
              startIcon={<IconCopy size={18} />}
              onClick={handleDuplicate}
              variant="outlined"
            >
              Duplicate
            </Button>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            startIcon={<IconDeviceFloppy size={18} />}
            onClick={handleSave}
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default EntryEditorDialog;

