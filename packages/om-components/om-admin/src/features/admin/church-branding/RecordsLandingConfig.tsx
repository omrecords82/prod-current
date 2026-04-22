import { useChurchRecordsLanding, ChurchRecordsLanding } from '@/hooks/useChurchRecordsLanding';
import ChurchRecordsHeader from '@/features/records-centralized/components/records/ChurchRecordsHeader';
import churchService, { Church } from '@/shared/lib/churchService';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const ACCEPTED_IMAGE_TYPES = '.png,.jpg,.jpeg,.svg,.webp';

const RecordsLandingConfig: React.FC = () => {
  const theme = useTheme();

  // Church selection
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [loadingChurches, setLoadingChurches] = useState(true);

  // Form state
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    welcome_text: '',
    accent_color: '#2563eb',
    default_view: 'table' as ChurchRecordsLanding['default_view'],
    show_analytics_highlights: false
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const { branding, churchName, isDefault, loading, error, refetch, save, uploadLogo, uploadBackground, removeLogo, removeBackground } =
    useChurchRecordsLanding(selectedChurchId);

  // Load churches
  useEffect(() => {
    (async () => {
      try {
        const list = await churchService.getChurches();
        setChurches(list);
        if (list.length > 0) setSelectedChurchId(list[0].id);
      } catch {
        // ignore
      } finally {
        setLoadingChurches(false);
      }
    })();
  }, []);

  // Sync form from branding
  useEffect(() => {
    if (branding) {
      setForm({
        title: branding.title || '',
        subtitle: branding.subtitle || '',
        welcome_text: branding.welcome_text || '',
        accent_color: branding.accent_color || '#2563eb',
        default_view: branding.default_view || 'table',
        show_analytics_highlights: branding.show_analytics_highlights ?? false
      });
    }
  }, [branding]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await save(form);
      setSaveMsg({ type: 'success', text: 'Settings saved successfully' });
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }, [form, save]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadLogo(file);
      setSaveMsg({ type: 'success', text: 'Logo uploaded' });
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err?.response?.data?.error || 'Logo upload failed' });
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  }, [uploadLogo]);

  const handleBgUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadBackground(file);
      setSaveMsg({ type: 'success', text: 'Background image uploaded' });
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err?.response?.data?.error || 'Background upload failed' });
    }
    if (bgInputRef.current) bgInputRef.current.value = '';
  }, [uploadBackground]);

  const handleRemoveLogo = useCallback(async () => {
    try {
      await removeLogo();
      setSaveMsg({ type: 'success', text: 'Logo removed' });
    } catch {
      setSaveMsg({ type: 'error', text: 'Failed to remove logo' });
    }
  }, [removeLogo]);

  const handleRemoveBg = useCallback(async () => {
    try {
      await removeBackground();
      setSaveMsg({ type: 'success', text: 'Background image removed' });
    } catch {
      setSaveMsg({ type: 'error', text: 'Failed to remove background' });
    }
  }, [removeBackground]);

  // Preview branding with live form edits
  const previewBranding: ChurchRecordsLanding | null = branding ? {
    ...branding,
    title: form.title || null,
    subtitle: form.subtitle || null,
    welcome_text: form.welcome_text || null,
    accent_color: form.accent_color || null,
    default_view: form.default_view,
    show_analytics_highlights: form.show_analytics_highlights
  } : null;

  if (loadingChurches) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 3, px: 2 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Records Landing Page Branding
      </Typography>

      {/* Church Selector */}
      <FormControl fullWidth sx={{ mb: 3 }} size="small">
        <InputLabel>Church</InputLabel>
        <Select
          value={selectedChurchId || ''}
          label="Church"
          onChange={(e) => setSelectedChurchId(Number(e.target.value))}
        >
          {churches.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saveMsg && <Alert severity={saveMsg.type} sx={{ mb: 2 }} onClose={() => setSaveMsg(null)}>{saveMsg.text}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={3}>
          {/* Live Preview */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Live Preview
              </Typography>
              <ChurchRecordsHeader
                branding={previewBranding}
                churchName={churchName}
                isDefault={isDefault}
                loading={false}
              />
            </CardContent>
          </Card>

          {/* Images */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Images</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                {/* Logo */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Church Logo</Typography>
                  {branding?.logo_path ? (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        component="img"
                        src={branding.logo_path}
                        alt="Logo"
                        sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <Button size="small" onClick={() => logoInputRef.current?.click()}>Replace</Button>
                      <Button size="small" color="error" onClick={handleRemoveLogo}>Remove</Button>
                    </Stack>
                  ) : (
                    <Button variant="outlined" size="small" onClick={() => logoInputRef.current?.click()}>
                      Upload Logo
                    </Button>
                  )}
                  <input ref={logoInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} hidden onChange={handleLogoUpload} />
                </Box>
                {/* Background */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Header Background Image (optional)</Typography>
                  {branding?.background_image_path ? (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        component="img"
                        src={branding.background_image_path}
                        alt="Background"
                        sx={{ width: 80, height: 48, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <Button size="small" onClick={() => bgInputRef.current?.click()}>Replace</Button>
                      <Button size="small" color="error" onClick={handleRemoveBg}>Remove</Button>
                    </Stack>
                  ) : (
                    <Button variant="outlined" size="small" onClick={() => bgInputRef.current?.click()}>
                      Upload Background
                    </Button>
                  )}
                  <input ref={bgInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} hidden onChange={handleBgUpload} />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Text Fields */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Header Text</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Title"
                  size="small"
                  fullWidth
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={churchName || 'Records Management'}
                  inputProps={{ maxLength: 255 }}
                />
                <TextField
                  label="Subtitle"
                  size="small"
                  fullWidth
                  value={form.subtitle}
                  onChange={(e) => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Church Sacramental Records"
                  inputProps={{ maxLength: 255 }}
                />
                <TextField
                  label="Welcome Text (optional)"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  value={form.welcome_text}
                  onChange={(e) => setForm(f => ({ ...f, welcome_text: e.target.value }))}
                  placeholder="Welcome to our parish records..."
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Appearance & Behavior */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Appearance & Behavior</Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="Accent Color"
                    size="small"
                    value={form.accent_color}
                    onChange={(e) => setForm(f => ({ ...f, accent_color: e.target.value }))}
                    sx={{ width: 160 }}
                    inputProps={{ maxLength: 7, pattern: '#[0-9a-fA-F]{6}' }}
                  />
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => setForm(f => ({ ...f, accent_color: e.target.value }))}
                    style={{ width: 36, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4, padding: 0 }}
                  />
                </Stack>
                <FormControl size="small" sx={{ maxWidth: 240 }}>
                  <InputLabel>Default View</InputLabel>
                  <Select
                    value={form.default_view}
                    label="Default View"
                    onChange={(e) => setForm(f => ({ ...f, default_view: e.target.value as any }))}
                  >
                    <MenuItem value="table">Table</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="timeline">Timeline</MenuItem>
                    <MenuItem value="analytics">Analytics</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.show_analytics_highlights}
                      onChange={(e) => setForm(f => ({ ...f, show_analytics_highlights: e.target.checked }))}
                    />
                  }
                  label="Show analytics highlights in header"
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Save */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{ minWidth: 140 }}
            >
              {saving ? <CircularProgress size={20} /> : 'Save Settings'}
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default RecordsLandingConfig;
