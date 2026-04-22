import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Alert,
  Snackbar,
  Tooltip,
  Divider,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import apiClient from '@/api/utils/axiosInstance';

// ─── Types ─────────────────────────────────────────────────────────────

interface TutorialStep {
  id?: number;
  title: string;
  content: string;
  image_url: string;
}

interface Tutorial {
  id: number;
  title: string;
  description: string | null;
  audience: string;
  is_welcome: number;
  is_active: number;
  sort_order: number;
  step_count: number;
  created_at: string;
  steps?: TutorialStep[];
}

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'administrators', label: 'Administrators' },
  { value: 'new_clients', label: 'New Clients' },
  { value: 'existing_clients', label: 'Existing Clients' },
  { value: 'priests', label: 'Priests' },
  { value: 'editors', label: 'Editors' },
];

const AUDIENCE_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  all: 'primary',
  administrators: 'warning',
  new_clients: 'info',
  existing_clients: 'success',
  priests: 'secondary',
  editors: 'default',
};

const emptyStep = (): TutorialStep => ({ title: '', content: '', image_url: '' });

const emptyForm = () => ({
  title: '',
  description: '',
  audience: 'all' as string,
  is_welcome: false,
  is_active: true,
  sort_order: 0,
  steps: [emptyStep()],
});

// ─── Component ─────────────────────────────────────────────────────────

const TutorialManagement: React.FC = () => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // ─── Data fetching ──────────────────────────────────────────────────

  const fetchTutorials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/tutorials');
      const data = res.data?.data || res.data;
      setTutorials(data?.tutorials || []);
    } catch (err) {
      console.error('Failed to load tutorials:', err);
      showSnackbar('Failed to load tutorials', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTutorials();
  }, [fetchTutorials]);

  // ─── Helpers ────────────────────────────────────────────────────────

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ─── Dialog handlers ───────────────────────────────────────────────

  const handleCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleEdit = async (id: number) => {
    try {
      const res = await apiClient.get(`/tutorials/${id}`);
      const data = res.data?.data || res.data;
      const tutorial = data?.tutorial;
      if (!tutorial) return;

      setEditId(id);
      setForm({
        title: tutorial.title,
        description: tutorial.description || '',
        audience: tutorial.audience,
        is_welcome: !!tutorial.is_welcome,
        is_active: !!tutorial.is_active,
        sort_order: tutorial.sort_order || 0,
        steps: tutorial.steps?.length
          ? tutorial.steps.map((s: any) => ({
              title: s.title || '',
              content: s.content || '',
              image_url: s.image_url || '',
            }))
          : [emptyStep()],
      });
      setDialogOpen(true);
    } catch (err) {
      showSnackbar('Failed to load tutorial details', 'error');
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showSnackbar('Title is required', 'error');
      return;
    }
    if (form.steps.length === 0 || !form.steps.some((s) => s.content.trim())) {
      showSnackbar('At least one step with content is required', 'error');
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        audience: form.audience,
        is_welcome: form.is_welcome,
        is_active: form.is_active,
        sort_order: form.sort_order,
        steps: form.steps
          .filter((s) => s.content.trim())
          .map((s) => ({
            title: s.title.trim() || null,
            content: s.content.trim(),
            image_url: s.image_url.trim() || null,
          })),
      };

      if (editId) {
        await apiClient.put(`/tutorials/${editId}`, payload);
        showSnackbar('Tutorial updated');
      } else {
        await apiClient.post('/tutorials', payload);
        showSnackbar('Tutorial created');
      }

      setDialogOpen(false);
      fetchTutorials();
    } catch (err) {
      showSnackbar('Failed to save tutorial', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiClient.delete(`/tutorials/${deleteId}`);
      showSnackbar('Tutorial deleted');
      setDeleteDialogOpen(false);
      setDeleteId(null);
      fetchTutorials();
    } catch (err) {
      showSnackbar('Failed to delete tutorial', 'error');
    }
  };

  // ─── Step management ───────────────────────────────────────────────

  const addStep = () => {
    setForm((prev) => ({ ...prev, steps: [...prev.steps, emptyStep()] }));
  };

  const removeStep = (index: number) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const updateStep = (index: number, field: keyof TutorialStep, value: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= form.steps.length) return;
    setForm((prev) => {
      const newSteps = [...prev.steps];
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      return { ...prev, steps: newSteps };
    });
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Tutorial Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create and manage tutorials shown to users on login
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Create Tutorial
        </Button>
      </Box>

      {/* Tutorials list */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Audience</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Steps</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Welcome</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Order</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tutorials.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No tutorials yet. Click "Create Tutorial" to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {tutorials.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={AUDIENCE_OPTIONS.find((a) => a.value === t.audience)?.label || t.audience}
                        size="small"
                        color={AUDIENCE_COLORS[t.audience] || 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">{t.step_count}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={t.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={t.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {t.is_welcome ? (
                        <Chip label="Welcome" size="small" color="primary" />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell align="center">{t.sort_order}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(t.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteId(t.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ─── Create / Edit Dialog ─────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editId ? 'Edit Tutorial' : 'Create Tutorial'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {/* Title */}
            <TextField
              label="Tutorial Title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              fullWidth
              required
            />

            {/* Description */}
            <TextField
              label="Description (optional, for admin reference)"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />

            {/* Audience + Sort Order row */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Target Audience</InputLabel>
                <Select
                  value={form.audience}
                  label="Target Audience"
                  onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Sort Order"
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
                }
                sx={{ minWidth: 120 }}
              />
            </Box>

            {/* Switches */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_welcome}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_welcome: e.target.checked }))}
                  />
                }
                label="Welcome Tutorial"
              />
            </Box>

            {form.is_welcome && (
              <Alert severity="info" variant="outlined">
                Only one tutorial can be the Welcome tutorial. Setting this will remove the Welcome flag
                from any other tutorial.
              </Alert>
            )}

            <Divider />

            {/* Steps editor */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Steps ({form.steps.length})
              </Typography>

              <Stack spacing={2}>
                {form.steps.map((step, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{ p: 2, position: 'relative', borderRadius: 2 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <DragIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        Step {index + 1}
                      </Typography>
                      <Box sx={{ flex: 1 }} />

                      <Tooltip title="Move Up">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUpIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Move Down">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === form.steps.length - 1}
                          >
                            <ArrowDownIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Remove Step">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeStep(index)}
                            disabled={form.steps.length <= 1}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>

                    <Stack spacing={1.5}>
                      <TextField
                        label="Step Title (optional)"
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Content"
                        value={step.content}
                        onChange={(e) => updateStep(index, 'content', e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        required
                      />
                      <TextField
                        label="Image URL (optional)"
                        value={step.image_url}
                        onChange={(e) => updateStep(index, 'image_url', e.target.value)}
                        fullWidth
                        size="small"
                        placeholder="https://..."
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={addStep}
                sx={{ mt: 2 }}
                variant="outlined"
                size="small"
              >
                Add Step
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editId ? 'Save Changes' : 'Create Tutorial'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs">
        <DialogTitle>Delete Tutorial?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete this tutorial and all its steps. Users who previously
            dismissed it will no longer see it. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar ─────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TutorialManagement;
