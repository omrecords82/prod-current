/**
 * FieldConfigDialog — Edit field labels and visibility for a record type.
 * Changes persist to localStorage via fieldConfig utility.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { getFieldsForType } from '../utils/recordFields';
import {
  getFieldOverrides,
  saveFieldOverrides,
  resetFieldOverrides,
  type FieldOverride,
} from '../utils/fieldConfig';

interface FieldConfigDialogProps {
  open: boolean;
  onClose: () => void;
  recordType: string;
  onSaved?: () => void;
}

const FieldConfigDialog: React.FC<FieldConfigDialogProps> = ({
  open,
  onClose,
  recordType,
  onSaved,
}) => {
  const defaults = getFieldsForType(recordType);
  const [overrides, setOverrides] = useState<Record<string, FieldOverride>>({});

  useEffect(() => {
    if (open) {
      setOverrides(getFieldOverrides(recordType));
    }
  }, [open, recordType]);

  const handleLabelChange = (key: string, label: string) => {
    setOverrides(prev => ({
      ...prev,
      [key]: { ...prev[key], label: label || undefined },
    }));
  };

  const handleVisibilityToggle = (key: string) => {
    setOverrides(prev => ({
      ...prev,
      [key]: { ...prev[key], hidden: !prev[key]?.hidden },
    }));
  };

  const handleSave = () => {
    // Clean up overrides: remove entries with no actual changes
    const cleaned: Record<string, FieldOverride> = {};
    for (const [key, ovr] of Object.entries(overrides)) {
      const defaultField = defaults.find(f => f.key === key);
      const hasLabelChange = ovr.label && ovr.label !== defaultField?.label;
      const hasHiddenChange = ovr.hidden === true;
      if (hasLabelChange || hasHiddenChange) {
        cleaned[key] = {};
        if (hasLabelChange) cleaned[key].label = ovr.label;
        if (hasHiddenChange) cleaned[key].hidden = true;
      }
    }
    saveFieldOverrides(recordType, cleaned);
    onSaved?.();
    onClose();
  };

  const handleReset = () => {
    resetFieldOverrides(recordType);
    setOverrides({});
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Fields ({recordType})</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {defaults.map(f => (
            <Box
              key={f.key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                opacity: overrides[f.key]?.hidden ? 0.5 : 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{ width: 110, flexShrink: 0, fontFamily: 'monospace', color: 'text.secondary' }}
              >
                {f.key}
              </Typography>
              <TextField
                size="small"
                value={overrides[f.key]?.label ?? f.label}
                onChange={e => handleLabelChange(f.key, e.target.value)}
                sx={{ flex: 1 }}
                placeholder={f.label}
              />
              <Switch
                size="small"
                checked={!overrides[f.key]?.hidden}
                onChange={() => handleVisibilityToggle(f.key)}
                title={overrides[f.key]?.hidden ? 'Hidden' : 'Visible'}
              />
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset} color="warning" size="small">
          Reset to Defaults
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} size="small">Cancel</Button>
        <Button onClick={handleSave} variant="contained" size="small">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldConfigDialog;
