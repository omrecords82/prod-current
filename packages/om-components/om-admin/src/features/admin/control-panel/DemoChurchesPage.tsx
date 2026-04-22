/**
 * DemoChurchesPage.tsx
 * Admin page for creating and managing demo churches with sample data.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { useJurisdictions } from '@/hooks/useJurisdictions';
import {
  Add as AddIcon,
  Science as DemoIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
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
  Stack,
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
import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/admin/control-panel', title: 'Control Panel' },
  { title: 'Demo Churches' },
];

interface DemoChurch {
  id: number;
  name: string;
  email: string | null;
  city: string | null;
  state_province: string | null;
  database_name: string | null;
  jurisdiction_id: number | null;
  calendar_type: string | null;
  jurisdiction_name: string | null;
  jurisdiction_abbr: string | null;
  is_active: boolean;
  demo_expires_at: string | null;
  created_at: string;
  record_counts: { baptisms: number; marriages: number; funerals: number } | null;
}

const DemoChurchesPage: React.FC = () => {
  const theme = useTheme();
  const { jurisdictions } = useJurisdictions();
  const [churches, setChurches] = useState<DemoChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newJurisdiction, setNewJurisdiction] = useState('');
  const [newBaptisms, setNewBaptisms] = useState(20);
  const [newMarriages, setNewMarriages] = useState(10);
  const [newFunerals, setNewFunerals] = useState(5);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<number | null>(null);

  const fetchChurches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/demo-churches');
      setChurches(res.churches || []);
    } catch (err) {
      console.error('Failed to load demo churches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChurches(); }, [fetchChurches]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await apiClient.post('/admin/demo-churches', {
        name: newName.trim(),
        jurisdiction_id: newJurisdiction ? parseInt(newJurisdiction) : null,
        sample_data_counts: { baptisms: newBaptisms, marriages: newMarriages, funerals: newFunerals },
      });
      setCreateOpen(false);
      setNewName('');
      setNewJurisdiction('');
      fetchChurches();
    } catch (err) {
      console.error('Failed to create demo church:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/admin/demo-churches/${id}`);
      setDeleteConfirm(null);
      fetchChurches();
    } catch (err) {
      console.error('Failed to delete demo church:', err);
    }
  };

  const handleRefresh = async (id: number) => {
    setRefreshing(id);
    try {
      await apiClient.post(`/admin/demo-churches/${id}/refresh`, {
        sample_data_counts: { baptisms: 20, marriages: 10, funerals: 5 },
      });
      fetchChurches();
    } catch (err) {
      console.error('Failed to refresh demo data:', err);
    } finally {
      setRefreshing(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <PageContainer title="Demo Churches" description="Manage demo church instances">
      <Breadcrumb title="Demo Churches" items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              <DemoIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#f9a825' }} />
              Demo Churches
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Quick-create demo church instances with sample sacramental records
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: '#f9a825', '&:hover': { bgcolor: '#f57f17' } }}
          >
            Quick Create Demo
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Demo churches are fully functional instances with their own tenant database and sample records.
          They bypass the CRM pipeline and are marked with a DEMO badge throughout the platform.
        </Alert>

        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Jurisdiction</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Calendar</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Database</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Records</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : churches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No demo churches created yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                churches.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        #{c.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={500}>{c.name}</Typography>
                        <Chip label="DEMO" size="small"
                          sx={{ fontSize: '0.6rem', fontWeight: 700, bgcolor: '#fff3e0', color: '#e65100', height: 20 }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {c.jurisdiction_abbr ? (
                        <Chip label={c.jurisdiction_abbr} size="small" sx={{ fontWeight: 600, fontFamily: 'monospace' }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.calendar_type ? (
                        <Chip
                          label={c.calendar_type === 'Julian' ? 'Old' : 'New'}
                          size="small"
                          color={c.calendar_type === 'Julian' ? 'warning' : 'info'}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {c.database_name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {c.record_counts ? (
                        <Typography variant="caption" color="text.secondary">
                          B:{c.record_counts.baptisms} M:{c.record_counts.marriages} F:{c.record_counts.funerals}
                        </Typography>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        {formatDate(c.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Refresh sample data">
                        <IconButton size="small" onClick={() => handleRefresh(c.id)}
                          disabled={refreshing === c.id}
                        >
                          <RefreshIcon fontSize="small" sx={refreshing === c.id ? { animation: 'spin 1s linear infinite' } : {}} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete demo church">
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(c.id)}>
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Quick Create Demo Church</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Church Name"
            placeholder="e.g., Holy Trinity Demo Church"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Jurisdiction (optional)</InputLabel>
            <Select value={newJurisdiction} label="Jurisdiction (optional)"
              onChange={(e) => setNewJurisdiction(e.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {jurisdictions.map((j) => (
                <MenuItem key={j.id} value={String(j.id)}>
                  {j.abbreviation} — {j.name} ({j.calendar_type === 'Julian' ? 'Old Calendar' : 'New Calendar'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Sample Record Counts</Typography>
          <Stack direction="row" spacing={2}>
            <TextField label="Baptisms" type="number" size="small" value={newBaptisms}
              onChange={(e) => setNewBaptisms(parseInt(e.target.value) || 0)} sx={{ flex: 1 }}
            />
            <TextField label="Marriages" type="number" size="small" value={newMarriages}
              onChange={(e) => setNewMarriages(parseInt(e.target.value) || 0)} sx={{ flex: 1 }}
            />
            <TextField label="Funerals" type="number" size="small" value={newFunerals}
              onChange={(e) => setNewFunerals(parseInt(e.target.value) || 0)} sx={{ flex: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newName.trim() || creating}
            sx={{ bgcolor: '#f9a825', '&:hover': { bgcolor: '#f57f17' } }}
          >
            {creating ? 'Creating...' : 'Create Demo Church'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Demo Church?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete the demo church, drop its tenant database, and remove all sample records. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DemoChurchesPage;
