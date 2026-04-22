/**
 * JurisdictionsPage.tsx
 * Admin CRUD page for Orthodox church jurisdictions/denominations.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { useJurisdictions, Jurisdiction } from '@/hooks/useJurisdictions';
import {
  Add as AddIcon,
  AccountBalance as JurisdictionIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/admin/control-panel', title: 'Control Panel' },
  { title: 'Jurisdictions' },
];

interface FormState {
  name: string;
  abbreviation: string;
  calendar_type: 'Julian' | 'Revised Julian';
  parent_church: string;
  country: string;
  canonical_territory: string;
  sort_order: number;
}

const emptyForm: FormState = {
  name: '',
  abbreviation: '',
  calendar_type: 'Revised Julian',
  parent_church: '',
  country: 'United States',
  canonical_territory: '',
  sort_order: 0,
};

const JurisdictionsPage: React.FC = () => {
  const theme = useTheme();
  const { jurisdictions, loading, refetch } = useJurisdictions(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (j: Jurisdiction) => {
    setEditingId(j.id);
    setForm({
      name: j.name,
      abbreviation: j.abbreviation,
      calendar_type: j.calendar_type,
      parent_church: j.parent_church || '',
      country: j.country || '',
      canonical_territory: j.canonical_territory || '',
      sort_order: j.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.abbreviation.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        abbreviation: form.abbreviation.trim(),
        calendar_type: form.calendar_type,
        parent_church: form.parent_church.trim() || null,
        country: form.country.trim() || null,
        canonical_territory: form.canonical_territory.trim() || null,
        sort_order: form.sort_order,
      };
      if (editingId) {
        await apiClient.put(`/jurisdictions/${editingId}`, body);
      } else {
        await apiClient.post('/jurisdictions', body);
      }
      setDialogOpen(false);
      refetch();
    } catch (err) {
      console.error('Failed to save jurisdiction:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/jurisdictions/${id}`);
      setDeleteConfirm(null);
      refetch();
    } catch (err) {
      console.error('Failed to delete jurisdiction:', err);
    }
  };

  const setField = (field: keyof FormState, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <PageContainer title="Jurisdictions" description="Orthodox church jurisdictions">
      <Breadcrumb title="Jurisdictions" items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              <JurisdictionIcon sx={{ mr: 1, verticalAlign: 'middle', color: theme.palette.primary.main }} />
              Jurisdictions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Orthodox church jurisdictions and denominations — calendar type is auto-applied to churches
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Jurisdiction
          </Button>
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Abbreviation</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Calendar</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Parent Church</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Country</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : jurisdictions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No jurisdictions defined</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                jurisdictions.map((j) => (
                  <TableRow key={j.id} hover>
                    <TableCell>
                      <Chip label={j.abbreviation} size="small" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{j.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={j.calendar_type === 'Julian' ? 'Old Calendar' : 'New Calendar'}
                        size="small"
                        color={j.calendar_type === 'Julian' ? 'warning' : 'info'}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {j.parent_church || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {j.country || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={j.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={j.is_active ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(j)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deactivate">
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(j.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Jurisdiction' : 'Add Jurisdiction'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Name" placeholder="e.g., Greek Orthodox Archdiocese of America"
            value={form.name} onChange={(e) => setField('name', e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth label="Abbreviation" placeholder="e.g., GOARCH"
            value={form.abbreviation} onChange={(e) => setField('abbreviation', e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Calendar Type</InputLabel>
            <Select
              value={form.calendar_type} label="Calendar Type"
              onChange={(e) => setField('calendar_type', e.target.value)}
            >
              <MenuItem value="Revised Julian">New Calendar (Revised Julian)</MenuItem>
              <MenuItem value="Julian">Old Calendar (Julian)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth label="Parent Church (optional)" placeholder="e.g., Ecumenical Patriarchate"
            value={form.parent_church} onChange={(e) => setField('parent_church', e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Country" value={form.country}
            onChange={(e) => setField('country', e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Canonical Territory (optional)" multiline rows={2}
            value={form.canonical_territory} onChange={(e) => setField('canonical_territory', e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Sort Order" type="number" value={form.sort_order}
            onChange={(e) => setField('sort_order', parseInt(e.target.value) || 0)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || !form.abbreviation.trim() || saving}>
            {saving ? 'Saving...' : editingId ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Deactivate Jurisdiction?</DialogTitle>
        <DialogContent>
          <Typography>
            This will deactivate the jurisdiction. It can be reactivated later. Existing churches referencing it will not be affected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default JurisdictionsPage;
