import { apiClient } from '@/api/utils/axiosInstance';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import {
    IconLink,
    IconPlus,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import React, { useReducer, useState } from 'react';
import { usePageImageData, type Binding } from './page-image-index/usePageImageData';
import { bindFormReducer, initialBindFormState } from './page-image-index/bindForm';

// Known pages/components for quick selection
const KNOWN_PAGES = [
  { key: 'component:Header', label: 'Header Component' },
  { key: 'component:Sidebar', label: 'Sidebar Component' },
  { key: 'component:Footer', label: 'Footer Component' },
  { key: 'component:Login', label: 'Login Page' },
  { key: 'route:/apps/gallery', label: 'Gallery Page' },
  { key: 'route:/apps/records/baptism', label: 'Baptism Records' },
  { key: 'route:/apps/records/marriage', label: 'Marriage Records' },
  { key: 'route:/apps/records/funeral', label: 'Funeral Records' },
  { key: 'route:/dashboards/user', label: 'User Dashboard' },
  { key: 'feature:record-header-banner', label: 'Record Header Banner' },
  { key: 'feature:certificates', label: 'Certificates' },
];

// Known image_keys for quick selection
const KNOWN_IMAGE_KEYS = [
  'nav.logo',
  'nav.logo.dark',
  'nav.logo.light',
  'header.main',
  'header.background',
  'hero.banner',
  'bg.pattern',
  'bg.tiled',
  'record.logo',
  'record.image',
  'record.background',
  'record.gradient',
  'record.border.horizontal',
  'record.border.vertical',
  'footer.logo',
  'favicon',
];

const PageImageIndex: React.FC = () => {
  const theme = useTheme();

  const data = usePageImageData();
  const {
    pages,
    churches,
    registryImages,
    selectedPageKey,
    setSelectedPageKey,
    bindingsByKey,
    loading,
    syncStatus,
    refreshPages,
    refreshSelectedPageBindings,
    ensureRegistryLoaded,
    syncRegistry,
  } = data;

  const [form, dispatchForm] = useReducer(bindFormReducer, initialBindFormState);
  const [bindSaving, setBindSaving] = useState(false);

  const handleOpenBindDialog = (pageKey?: string) => {
    dispatchForm({ type: 'open', pageKey: pageKey || selectedPageKey || '' });
    ensureRegistryLoaded();
  };

  const handleSaveBinding = async () => {
    if (!form.pageKey || !form.imageKey || !form.imagePath) {
      alert('page_key, image_key, and image_path are all required');
      return;
    }
    setBindSaving(true);
    try {
      await apiClient.post<any>('/gallery/admin/images/bindings', {
        page_key: form.pageKey,
        image_key: form.imageKey,
        scope: form.scope,
        church_id: form.scope === 'church' ? form.churchId : null,
        image_path: form.imagePath,
        notes: form.notes || null,
      });
      dispatchForm({ type: 'close' });
      refreshPages();
      refreshSelectedPageBindings();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setBindSaving(false);
    }
  };

  const handleDeleteBinding = async (binding: Binding) => {
    if (!window.confirm(`Delete binding ${binding.page_key} → ${binding.image_key} (${binding.scope})?`)) return;
    try {
      await apiClient.delete<any>('/gallery/admin/images/bindings', { data: { id: binding.id } });
      refreshPages();
      refreshSelectedPageBindings();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 700,
          mb: 1,
          fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
        }}
      >
        Page Image Index
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Map images to pages/components. Resolution: church override &gt; global &gt; default.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<IconPlus size={18} />}
          onClick={() => handleOpenBindDialog()}
          sx={{ backgroundColor: '#C8A24B', color: '#1a1a1a', '&:hover': { backgroundColor: '#B8923A' } }}
        >
          New Binding
        </Button>
        <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={syncRegistry}>
          Sync Registry
        </Button>
        {syncStatus && (
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {syncStatus}
          </Typography>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Left: Page list */}
        <Paper sx={{ width: { xs: '100%', md: 320 }, minWidth: 280, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Pages with Bindings</Typography>
          {pages.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No bindings yet. Create one to get started.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {pages.map((page) => (
                <Button
                  key={page.page_key}
                  fullWidth
                  variant={selectedPageKey === page.page_key ? 'contained' : 'text'}
                  onClick={() => setSelectedPageKey(page.page_key)}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    textAlign: 'left',
                    ...(selectedPageKey === page.page_key
                      ? { backgroundColor: '#C8A24B', color: '#1a1a1a', '&:hover': { backgroundColor: '#B8923A' } }
                      : {}),
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                      {page.page_key}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {page.image_key_count} keys, {page.global_count}G / {page.church_count}C
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick Add Page</Typography>
          <Stack spacing={1}>
            {KNOWN_PAGES.filter(kp => !pages.some(p => p.page_key === kp.key)).slice(0, 5).map((kp) => (
              <Button
                key={kp.key}
                size="small"
                variant="outlined"
                onClick={() => {
                  setSelectedPageKey(kp.key);
                  handleOpenBindDialog(kp.key);
                }}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: '0.75rem' }}
              >
                {kp.label}
              </Button>
            ))}
          </Stack>
        </Paper>

        {/* Right: Bindings for selected page */}
        <Box sx={{ flex: 1 }}>
          {selectedPageKey ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {selectedPageKey}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<IconPlus size={16} />}
                  onClick={() => handleOpenBindDialog(selectedPageKey)}
                  size="small"
                >
                  Add Binding
                </Button>
              </Box>

              {loading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : Object.keys(bindingsByKey).length === 0 ? (
                <Alert severity="info">No bindings for this page. Click "Add Binding" to create one.</Alert>
              ) : (
                <Stack spacing={2}>
                  {Object.entries(bindingsByKey).map(([imageKey, group]) => (
                    <Paper key={imageKey} sx={{ p: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                        <IconLink size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {imageKey}
                      </Typography>

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Scope</TableCell>
                              <TableCell>Church</TableCell>
                              <TableCell>Image Path</TableCell>
                              <TableCell>Enabled</TableCell>
                              <TableCell>Notes</TableCell>
                              <TableCell width={60}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.global && (
                              <TableRow>
                                <TableCell>
                                  <Chip label="Global" size="small" sx={{ backgroundColor: 'rgba(33, 150, 243, 0.15)', color: 'info.main', fontWeight: 600 }} />
                                </TableCell>
                                <TableCell>—</TableCell>
                                <TableCell sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
                                  {group.global.image_path}
                                </TableCell>
                                <TableCell>{group.global.enabled ? 'Yes' : 'No'}</TableCell>
                                <TableCell sx={{ fontSize: '0.75rem' }}>{group.global.notes || ''}</TableCell>
                                <TableCell>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteBinding(group.global!)}>
                                    <IconTrash size={16} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            )}
                            {group.churches.map((b) => (
                              <TableRow key={b.id}>
                                <TableCell>
                                  <Chip label="Church" size="small" sx={{ backgroundColor: 'rgba(156, 39, 176, 0.15)', color: 'secondary.main', fontWeight: 600 }} />
                                </TableCell>
                                <TableCell>{b.church_name || `#${b.church_id}`}</TableCell>
                                <TableCell sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
                                  {b.image_path}
                                </TableCell>
                                <TableCell>{b.enabled ? 'Yes' : 'No'}</TableCell>
                                <TableCell sx={{ fontSize: '0.75rem' }}>{b.notes || ''}</TableCell>
                                <TableCell>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteBinding(b)}>
                                    <IconTrash size={16} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  ))}
                </Stack>
              )}
            </>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <IconSearch size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="h6" color="text.secondary">
                Select a page from the list or create a new binding
              </Typography>
            </Paper>
          )}
        </Box>
      </Stack>

      {/* Bind Image Dialog */}
      <Dialog open={form.open} onClose={() => dispatchForm({ type: 'close' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create Image Binding
          <IconButton
            onClick={() => dispatchForm({ type: 'close' })}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Page Key */}
            <Autocomplete
              freeSolo
              options={KNOWN_PAGES.map(p => p.key)}
              value={form.pageKey}
              onInputChange={(_, value) => dispatchForm({ type: 'setPageKey', value })}
              renderInput={(params) => (
                <TextField {...params} label="Page Key" placeholder="e.g. component:Header or route:/apps/gallery" fullWidth />
              )}
              sx={{ mb: 2 }}
            />

            {/* Image Key */}
            <Autocomplete
              freeSolo
              options={KNOWN_IMAGE_KEYS}
              value={form.imageKey}
              onInputChange={(_, value) => dispatchForm({ type: 'setImageKey', value })}
              renderInput={(params) => (
                <TextField {...params} label="Image Key" placeholder="e.g. nav.logo, header.main" fullWidth />
              )}
              sx={{ mb: 2 }}
            />

            {/* Image Path */}
            <Autocomplete
              freeSolo
              options={registryImages.map(img => img.image_path)}
              value={form.imagePath}
              onInputChange={(_, value) => dispatchForm({ type: 'setImagePath', value })}
              renderInput={(params) => (
                <TextField {...params} label="Image Path" placeholder="/images/logos/om-logo.png" fullWidth />
              )}
              sx={{ mb: 2 }}
            />

            {/* Scope */}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Scope</FormLabel>
              <RadioGroup
                row
                value={form.scope}
                onChange={(e) => dispatchForm({ type: 'setScope', value: e.target.value as 'global' | 'church' })}
              >
                <FormControlLabel value="global" control={<Radio />} label="Global (all churches)" />
                <FormControlLabel value="church" control={<Radio />} label="Specific church" />
              </RadioGroup>
            </FormControl>

            {/* Church selector */}
            {form.scope === 'church' && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Church</InputLabel>
                <Select
                  value={form.churchId || ''}
                  label="Church"
                  onChange={(e) => dispatchForm({ type: 'setChurchId', value: e.target.value ? parseInt(String(e.target.value)) : null })}
                >
                  {churches.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name} (ID: {c.id})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Notes */}
            <TextField
              fullWidth
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => dispatchForm({ type: 'setNotes', value: e.target.value })}
              multiline
              rows={2}
              sx={{ mb: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => dispatchForm({ type: 'close' })} disabled={bindSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveBinding}
            variant="contained"
            disabled={bindSaving || !form.pageKey || !form.imageKey || !form.imagePath || (form.scope === 'church' && !form.churchId)}
            sx={{ backgroundColor: '#C8A24B', color: '#1a1a1a', '&:hover': { backgroundColor: '#B8923A' } }}
          >
            {bindSaving ? 'Saving...' : 'Save Binding'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PageImageIndex;
