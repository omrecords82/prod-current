import React, { useState, useEffect } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import type { CustomField } from './types';
import { AVAILABLE_RECORD_TABLES, FIELD_TYPES } from './constants';

interface CustomFieldDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (field: CustomField) => void;
  editingField: CustomField | null;
  existingTables: string[];
}

const CustomFieldDialog: React.FC<CustomFieldDialogProps> = ({
  open,
  onClose,
  onSave,
  editingField,
  existingTables,
}) => {
  const [fieldData, setFieldData] = useState<Partial<CustomField>>({
    table_name: '',
    field_name: '',
    field_type: 'VARCHAR',
    is_required: false,
    description: ''
  });

  useEffect(() => {
    if (editingField) {
      setFieldData(editingField);
    } else {
      setFieldData({
        table_name: '',
        field_name: '',
        field_type: 'VARCHAR',
        is_required: false,
        description: ''
      });
    }
  }, [editingField, open]);

  const handleSave = () => {
    if (fieldData.table_name && fieldData.field_name && fieldData.field_type) {
      onSave({
        ...fieldData,
        id: editingField?.id || Date.now().toString()
      } as CustomField);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Table</InputLabel>
              <Select
                label="Table"
                value={fieldData.table_name || ''}
                onChange={(e) => setFieldData({ ...fieldData, table_name: e.target.value })}
              >
                {existingTables.map((table) => (
                  <MenuItem key={table} value={table}>
                    {AVAILABLE_RECORD_TABLES.find(t => t.key === table)?.label || table}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Field Name"
              value={fieldData.field_name || ''}
              onChange={(e) => setFieldData({ ...fieldData, field_name: e.target.value })}
              placeholder="e.g., sponsor_name"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Field Type</InputLabel>
              <Select
                label="Field Type"
                value={fieldData.field_type || 'VARCHAR'}
                onChange={(e) => setFieldData({ ...fieldData, field_type: e.target.value as any })}
              >
                {FIELD_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            {fieldData.field_type === 'VARCHAR' && (
              <TextField
                fullWidth
                type="number"
                label="Max Length"
                value={fieldData.field_length || 255}
                onChange={(e) => setFieldData({ ...fieldData, field_length: parseInt(e.target.value) })}
              />
            )}
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={fieldData.description || ''}
              onChange={(e) => setFieldData({ ...fieldData, description: e.target.value })}
              placeholder="Describe what this field is for..."
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={fieldData.is_required || false}
                  onChange={(e) => setFieldData({ ...fieldData, is_required: e.target.checked })}
                />
              }
              label="Required Field"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!fieldData.table_name || !fieldData.field_name || !fieldData.field_type}
        >
          {editingField ? 'Update' : 'Add'} Field
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomFieldDialog;
