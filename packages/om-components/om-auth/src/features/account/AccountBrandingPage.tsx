/**
 * AccountBrandingPage — Church branding identity settings.
 * Manages logo uploads, short name, and brand colors.
 * Uses GET/PUT /api/my/church-settings + POST/DELETE /api/my/church-branding/:field
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageIcon from '@mui/icons-material/Image';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { canEditChurchSettings } from './accountPermissions';
import { SnackbarState, SNACKBAR_CLOSED, SNACKBAR_DURATION, getChurchDisplayName } from './accountConstants';
import { churchApi, extractErrorMessage } from './accountApi';

// ── Types ──────────────────────────────────────────────────────────────────

interface BrandingData {
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
  logo_path: string | null;
  logo_dark_path: string | null;
  favicon_path: string | null;
}

const EMPTY_BRANDING: BrandingData = {
  name: '',
  short_name: '',
  primary_color: '',
  secondary_color: '',
  logo_path: null,
  logo_dark_path: null,
  favicon_path: null,
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ── Helpers ────────────────────────────────────────────────────────────────

function isValidColor(v: string): boolean {
  return !v || /^#[0-9a-fA-F]{6}$/.test(v);
}

// ── Component ──────────────────────────────────────────────────────────────

const AccountBrandingPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const editable = canEditChurchSettings(user);

  // Data state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<BrandingData>(EMPTY_BRANDING);
  const [original, setOriginal] = useState<BrandingData>(EMPTY_BRANDING);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);

  // Upload state per field
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // Refs for file inputs
  const logoRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const isDirty = branding.name !== original.name
    || branding.short_name !== original.short_name
    || branding.primary_color !== original.primary_color
    || branding.secondary_color !== original.secondary_color;

  // ── Load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.church_id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const s = await churchApi.getSettings<Record<string, any>>();
        if (s) {
          const data: BrandingData = {
            name: getChurchDisplayName(s),
            short_name: s.short_name || '',
            primary_color: s.primary_color || '',
            secondary_color: s.secondary_color || '',
            logo_path: s.logo_path || null,
            logo_dark_path: s.logo_dark_path || null,
            favicon_path: s.favicon_path || null,
          };
          setBranding(data);
          setOriginal(data);
        }
      } catch (err) {
        console.error('Failed to load branding:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.church_id]);

  // ── Save text fields ─────────────────────────────────────────────────

  const handleSave = async () => {
    if (!isValidColor(branding.primary_color)) {
      setSnackbar({ open: true, message: t('account.primary_color_invalid'), severity: 'error' });
      return;
    }
    if (!isValidColor(branding.secondary_color)) {
      setSnackbar({ open: true, message: t('account.secondary_color_invalid'), severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      // We need to send ALL fields that the PUT endpoint expects.
      // First fetch current settings to preserve other fields.
      const current = await churchApi.getSettings<Record<string, any>>() || {};

      await churchApi.updateSettings({
        ...current,
        name: branding.name,
        short_name: branding.short_name,
        primary_color: branding.primary_color || null,
        secondary_color: branding.secondary_color || null,
      });
      setOriginal({ ...branding });
      setSnackbar({ open: true, message: t('account.branding_saved'), severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────

  const handleUpload = useCallback(async (field: string, file: File) => {
    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setSnackbar({ open: true, message: 'Only PNG, JPEG, SVG, and WebP images are allowed', severity: 'error' });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setSnackbar({ open: true, message: `File must be under ${MAX_SIZE_MB}MB`, severity: 'error' });
      return;
    }

    setUploading((prev) => ({ ...prev, [field]: true }));
    try {
      const result = await churchApi.uploadBrandingAsset(field, file);
      // Update local state with new path (add cache-bust)
      const pathKey = field === 'logo' ? 'logo_path' : field === 'logo-dark' ? 'logo_dark_path' : 'favicon_path';
      const newPath = result.path + '?t=' + Date.now();
      setBranding((prev) => ({ ...prev, [pathKey]: newPath }));
      setOriginal((prev) => ({ ...prev, [pathKey]: newPath }));
      setSnackbar({ open: true, message: t('account.uploaded_success').replace('{field}', field), severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Upload failed', severity: 'error' });
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  }, []);

  const handleDelete = useCallback(async (field: string) => {
    setUploading((prev) => ({ ...prev, [field]: true }));
    try {
      await churchApi.deleteBrandingAsset(field);
      const pathKey = field === 'logo' ? 'logo_path' : field === 'logo-dark' ? 'logo_dark_path' : 'favicon_path';
      setBranding((prev) => ({ ...prev, [pathKey]: null }));
      setOriginal((prev) => ({ ...prev, [pathKey]: null }));
      setSnackbar({ open: true, message: t('account.removed_success').replace('{field}', field), severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to remove', severity: 'error' });
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  }, []);

  const onFileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(field, file);
    e.target.value = ''; // reset so same file can be re-selected
  };

  // ── No church ─────────────────────────────────────────────────────────

  if (!user?.church_id) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 3, textAlign: 'center', py: 6 }}>
          <PaletteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            {t('account.branding_no_parish')}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {!editable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('account.branding_readonly')}
        </Alert>
      )}

      {/* Identity Section */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <PaletteIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.church_identity')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('account.church_identity_desc')}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2.5,
              maxWidth: 700,
            }}
          >
            <TextField
              label={t('account.label_church_display_name')}
              value={branding.name}
              onChange={(e) => setBranding((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              disabled={!editable}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label={t('account.label_short_name')}
              value={branding.short_name}
              onChange={(e) => setBranding((p) => ({ ...p, short_name: e.target.value }))}
              fullWidth
              disabled={!editable}
              placeholder={t('account.placeholder_church_name')}
              inputProps={{ maxLength: 50 }}
            />
            <Box /> {/* spacer */}
            <TextField
              label={t('account.label_primary_color')}
              value={branding.primary_color}
              onChange={(e) => setBranding((p) => ({ ...p, primary_color: e.target.value }))}
              fullWidth
              disabled={!editable}
              placeholder="#5B21B6"
              error={!!branding.primary_color && !isValidColor(branding.primary_color)}
              helperText={branding.primary_color && !isValidColor(branding.primary_color) ? t('account.use_rrggbb_format') : ''}
              InputProps={{
                startAdornment: branding.primary_color && isValidColor(branding.primary_color) ? (
                  <Box sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: branding.primary_color, mr: 1, border: '1px solid', borderColor: 'divider' }} />
                ) : undefined,
              }}
            />
            <TextField
              label={t('account.label_secondary_color')}
              value={branding.secondary_color}
              onChange={(e) => setBranding((p) => ({ ...p, secondary_color: e.target.value }))}
              fullWidth
              disabled={!editable}
              placeholder="#D97706"
              error={!!branding.secondary_color && !isValidColor(branding.secondary_color)}
              helperText={branding.secondary_color && !isValidColor(branding.secondary_color) ? t('account.use_rrggbb_format') : ''}
              InputProps={{
                startAdornment: branding.secondary_color && isValidColor(branding.secondary_color) ? (
                  <Box sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: branding.secondary_color, mr: 1, border: '1px solid', borderColor: 'divider' }} />
                ) : undefined,
              }}
            />
          </Box>

          {editable && (
            <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
              <Button
                variant="outlined"
                disabled={!isDirty || saving}
                onClick={() => setBranding({ ...original })}
              >
                {t('common.cancel')}
              </Button>
              <Button variant="contained" disabled={!isDirty || saving} onClick={handleSave}>
                {saving ? <CircularProgress size={20} /> : t('common.save_changes')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Logos & Assets Section */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <ImageIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.logos_and_assets')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('account.logos_desc').replace('{size}', String(MAX_SIZE_MB))}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            <ImageUploadCard
              label={t('account.primary_logo')}
              description={t('account.used_in_headers')}
              imagePath={branding.logo_path}
              uploading={!!uploading['logo']}
              editable={editable}
              onUploadClick={() => logoRef.current?.click()}
              onDelete={() => handleDelete('logo')}
            />
            <ImageUploadCard
              label={t('account.dark_mode_logo')}
              description={t('account.dark_mode_logo_desc')}
              imagePath={branding.logo_dark_path}
              uploading={!!uploading['logo-dark']}
              editable={editable}
              onUploadClick={() => logoDarkRef.current?.click()}
              onDelete={() => handleDelete('logo-dark')}
              darkPreview
            />
            <ImageUploadCard
              label={t('account.favicon')}
              description={t('account.favicon_desc')}
              imagePath={branding.favicon_path}
              uploading={!!uploading['favicon']}
              editable={editable}
              onUploadClick={() => faviconRef.current?.click()}
              onDelete={() => handleDelete('favicon')}
              small
            />
          </Box>

          {/* Hidden file inputs */}
          <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={onFileChange('logo')} />
          <input ref={logoDarkRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={onFileChange('logo-dark')} />
          <input ref={faviconRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={onFileChange('favicon')} />
        </CardContent>
      </Card>

      {/* Preview Section */}
      {(branding.logo_path || branding.short_name || branding.primary_color) && (
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              {t('account.preview')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {branding.logo_path && (
                <Box
                  component="img"
                  src={branding.logo_path}
                  alt="Logo preview"
                  sx={{ height: 48, maxWidth: 200, objectFit: 'contain' }}
                />
              )}
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ color: branding.primary_color || undefined }}>
                  {branding.short_name || branding.name || t('account.church_name_fallback')}
                </Typography>
                {branding.secondary_color && (
                  <Box sx={{ width: 40, height: 3, borderRadius: 1, bgcolor: branding.secondary_color, mt: 0.5 }} />
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={SNACKBAR_DURATION}
        onClose={() => setSnackbar(SNACKBAR_CLOSED)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(SNACKBAR_CLOSED)}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// ── ImageUploadCard sub-component ─────────────────────────────────────────

interface ImageUploadCardProps {
  label: string;
  description: string;
  imagePath: string | null;
  uploading: boolean;
  editable: boolean;
  onUploadClick: () => void;
  onDelete: () => void;
  darkPreview?: boolean;
  small?: boolean;
}

const ImageUploadCard: React.FC<ImageUploadCardProps> = ({
  label,
  description,
  imagePath,
  uploading,
  editable,
  onUploadClick,
  onDelete,
  darkPreview,
  small,
}) => {
  const { t } = useLanguage();
  const previewHeight = small ? 64 : 100;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Typography variant="subtitle2" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary" textAlign="center">
        {description}
      </Typography>

      {/* Preview area */}
      <Box
        sx={{
          width: '100%',
          height: previewHeight + 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1.5,
          bgcolor: darkPreview ? 'grey.900' : 'grey.50',
          border: '2px dashed',
          borderColor: imagePath ? 'transparent' : 'grey.300',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {uploading ? (
          <CircularProgress size={28} />
        ) : imagePath ? (
          <Box
            component="img"
            src={imagePath}
            alt={label}
            sx={{
              maxHeight: previewHeight,
              maxWidth: '80%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <CloudUploadIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
            <Typography variant="caption" display="block" color="text.disabled">
              {t('account.no_image')}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Actions */}
      {editable && (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={onUploadClick}
            disabled={uploading}
          >
            {imagePath ? t('account.replace') : t('common.upload')}
          </Button>
          {imagePath && (
            <Tooltip title={t('account.remove_image')}>
              <IconButton size="small" color="error" onClick={onDelete} disabled={uploading}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AccountBrandingPage;
