/**
 * ItemFormDialog — shared create/edit dialog for OM Daily items.
 */

import React from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Stack, TextField,
} from '@mui/material';
import type { DailyItem, ItemFormData } from '../omDailyTypes';
import {
  HORIZONS, HORIZON_LABELS,
  STATUSES, STATUS_LABELS,
  PRIORITIES, AGENT_TOOLS, AGENT_TOOL_LABELS, AGENT_TOOL_COLORS,
  BRANCH_TYPES, BRANCH_TYPE_LABELS, BRANCH_TYPE_COLORS,
} from '../omDailyTypes';

interface ItemFormDialogProps {
  open: boolean;
  editingItem: DailyItem | null;
  form: ItemFormData;
  onFormChange: (form: ItemFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

const ItemFormDialog: React.FC<ItemFormDialogProps> = ({ open, editingItem, form, onFormChange, onSave, onClose }) => {
  const setField = (field: keyof ItemFormData, value: string) => {
    onFormChange({ ...form, [field]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingItem ? 'Edit Item' : 'New Pipeline Item'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" size="small" fullWidth value={form.title} onChange={(e) => setField('title', e.target.value)} required />
          <TextField label="Description" size="small" fullWidth multiline rows={3} value={form.description} onChange={(e) => setField('description', e.target.value)} />
          <Stack direction="row" spacing={1}>
            <FormControl size="small" fullWidth>
              <InputLabel>Horizon</InputLabel>
              <Select value={form.horizon} label="Horizon" onChange={(e) => setField('horizon', e.target.value)}>
                {HORIZONS.map(h => <MenuItem key={h} value={h}>{HORIZON_LABELS[h]}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status" onChange={(e) => setField('status', e.target.value)}>
                {STATUSES.map(s => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={1}>
            <FormControl size="small" fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={form.priority} label="Priority" onChange={(e) => setField('priority', e.target.value)}>
                {PRIORITIES.map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Category" size="small" fullWidth value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="e.g. Frontend, Backend" />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField label="Due Date" type="date" size="small" fullWidth value={form.due_date} onChange={(e) => setField('due_date', e.target.value)} InputLabelProps={{ shrink: true }} />
            <FormControl size="small" fullWidth>
              <InputLabel>Agent Tool</InputLabel>
              <Select value={form.agent_tool} label="Agent Tool" onChange={(e) => setField('agent_tool', e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {AGENT_TOOLS.map(a => (
                  <MenuItem key={a} value={a}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: AGENT_TOOL_COLORS[a] }} />
                      {AGENT_TOOL_LABELS[a]}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={1}>
            <FormControl size="small" fullWidth>
              <InputLabel>Branch Type</InputLabel>
              <Select value={form.branch_type} label="Branch Type" onChange={(e) => setField('branch_type', e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {BRANCH_TYPES.map(b => (
                  <MenuItem key={b} value={b}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRANCH_TYPE_COLORS[b] }} />
                      {BRANCH_TYPE_LABELS[b]}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Repo Target</InputLabel>
              <Select value={form.repo_target || 'orthodoxmetrics'} label="Repo Target" onChange={(e) => setField('repo_target', e.target.value)}>
                <MenuItem value="orthodoxmetrics">OM</MenuItem>
                <MenuItem value="omai">OMAI</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          {form.agent_tool && form.branch_type && (
            <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
              A local branch will be auto-created when saved. Branch: <strong>{
                ({ feature: 'feat', enhancement: 'enh', bugfix: 'fix', refactor: 'ref', migration: 'mig', chore: 'chore', spike: 'spike', docs: 'docs' } as Record<string, string>)[form.branch_type]
              }/id-{form.title ? form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) : 'slug'}</strong>
              <br />on <em>{form.repo_target || 'orthodoxmetrics'}</em> repo
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={!form.title}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ItemFormDialog;
