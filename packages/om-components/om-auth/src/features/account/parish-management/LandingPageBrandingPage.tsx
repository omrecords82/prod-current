/**
 * LandingPageBrandingPage — Logo, background, header text with live preview.
 * Wired to real API: file uploads via /api/my/church-branding/:field,
 * text fields via parish_settings (branding category).
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, useTheme,
  Button, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useChurch } from '@/context/ChurchContext';
import { useLanguage } from '@/context/LanguageContext';
import apiClient from '@/api/utils/axiosInstance';
import { useParishSettingsWithLocal } from './useParishSettings';

interface BrandingText {
  title?: string;
  subtitle?: string;
  welcomeMessage?: string;
}

const LandingPageBrandingPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { churchMetadata, refreshChurchData } = useChurch();
  const { t } = useLanguage();

  // Text fields from parish_settings
  const {
    data, loading, saving, dirty, updateLocal, save,
  } = useParishSettingsWithLocal<BrandingText>('branding');

  const title = data.title || churchMetadata?.church_name_display || t('parish.default_title');
  const subtitle = data.subtitle || t('parish.default_subtitle');
  const welcomeMessage = data.welcomeMessage || t('parish.default_welcome');

  // File upload state
  const [uploading, setUploading] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const handleFileUpload = useCallback(async (field: string, file: File) => {
    setUploading(field);
    try {
      const formData = new FormData();
      formData.append(field, file);
      await apiClient.post(`/my/church-branding/${field}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSnack({ msg: t('parish.upload_success').replace('{field}', field), severity: 'success' });
      // Refresh church metadata to get new logo_url
      refreshChurchData?.();
    } catch (err: any) {
      setSnack({ msg: err?.message || t('parish.upload_failed').replace('{field}', field), severity: 'error' });
    } finally {
      setUploading(null);
    }
  }, [refreshChurchData]);

  const handleSaveText = useCallback(async () => {
    const ok = await save();
    setSnack({ msg: ok ? t('parish.branding_text_saved') : t('parish.branding_save_failed'), severity: ok ? 'success' : 'error' });
  }, [save]);

  const updateField = (key: keyof BrandingText, value: string) => {
    updateLocal((prev: BrandingText) => ({ ...prev, [key]: value }));
  };

  const UploadArea = ({ field, icon: Icon, label, hint }: { field: string; icon: React.ElementType; label: string; hint: string }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const isUploading = uploading === field;

    return (
      <Box>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(field, file);
            e.target.value = '';
          }}
        />
        <Box
          role="button"
          tabIndex={0}
          aria-label={label}
          onClick={() => !isUploading && inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
          sx={{
            border: `2px dashed ${isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db'}`,
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: isUploading ? 'wait' : 'pointer',
            transition: 'border-color 0.2s ease',
            '&:hover': { borderColor: isDark ? '#d4af37' : '#2d1b4e' },
            '&:focus-visible': { borderColor: isDark ? '#d4af37' : '#2d1b4e', outline: 'none' },
          }}
        >
          {isUploading ? (
            <CircularProgress size={28} />
          ) : (
            <>
              <Icon sx={{ fontSize: 40, color: isDark ? '#6b7280' : '#9ca3af', mb: 1 }} />
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827', mb: 0.25 }}>
                {label}
              </Typography>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#6b7280' : '#9ca3af' }}>
                {hint}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
            {t('parish.landing_page_branding')}
          </Typography>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
            {t('parish.landing_page_branding_desc')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          disabled={!dirty || saving}
          startIcon={saving ? <CircularProgress size={16} /> : <SaveOutlinedIcon />}
          onClick={handleSaveText}
          sx={{
            textTransform: 'none',
            fontFamily: "'Inter'",
            fontSize: '0.8125rem',
            bgcolor: '#2d1b4e',
            '&:hover': { bgcolor: '#3d2b5e' },
            '&.Mui-disabled': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)' },
          }}
        >
          {saving ? t('common.saving') : dirty ? t('parish.save_text') : t('parish.saved')}
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {/* Configuration */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Logo Upload */}
          <Paper
            variant="outlined"
            sx={{ p: 2.5, borderRadius: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}
          >
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 2 }}>
              {t('parish.church_logo')}
            </Typography>
            {churchMetadata?.logo_url && (
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <img
                  src={churchMetadata.logo_url}
                  alt="Current logo"
                  style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }}
                />
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#6b7280' : '#9ca3af', mt: 0.5 }}>
                  {t('parish.current_logo')}
                </Typography>
              </Box>
            )}
            <UploadArea field="logo" icon={CloudUploadOutlinedIcon} label={t('parish.upload_logo')} hint={t('parish.upload_logo_hint')} />
          </Paper>

          {/* Header Background — placeholder upload area, no backend endpoint yet */}
          <Paper
            variant="outlined"
            sx={{ p: 2.5, borderRadius: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}
          >
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 2 }}>
              {t('parish.header_background')}
            </Typography>
            <Box
              sx={{
                border: `2px dashed ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                opacity: 0.5,
              }}
            >
              <ImageOutlinedIcon sx={{ fontSize: 40, color: isDark ? '#6b7280' : '#9ca3af', mb: 1 }} />
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#6b7280' : '#9ca3af' }}>
                {t('parish.background_coming_soon')}
              </Typography>
            </Box>
          </Paper>

          {/* Text Content */}
          <Paper
            variant="outlined"
            sx={{ p: 2.5, borderRadius: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}
          >
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 2 }}>
              {t('parish.header_text')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', fontWeight: 500, color: isDark ? '#d1d5db' : '#374151', mb: 0.75 }}>
                  {t('parish.title')}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={title}
                  onChange={(e) => updateField('title', e.target.value)}
                  sx={{ '& .MuiInputBase-input': { fontFamily: "'Inter'", fontSize: '0.8125rem' } }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', fontWeight: 500, color: isDark ? '#d1d5db' : '#374151', mb: 0.75 }}>
                  {t('parish.subtitle')}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={subtitle}
                  onChange={(e) => updateField('subtitle', e.target.value)}
                  sx={{ '& .MuiInputBase-input': { fontFamily: "'Inter'", fontSize: '0.8125rem' } }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', fontWeight: 500, color: isDark ? '#d1d5db' : '#374151', mb: 0.75 }}>
                  {t('parish.welcome_message')}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  value={welcomeMessage}
                  onChange={(e) => updateField('welcomeMessage', e.target.value)}
                  sx={{ '& .MuiInputBase-input': { fontFamily: "'Inter'", fontSize: '0.8125rem' } }}
                />
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Live Preview */}
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 }, height: 'fit-content' }}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827' }}>
                Live Preview
              </Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
              {/* Preview Hero */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #2d1b4e 0%, #1a0f30 100%)',
                  borderRadius: 2,
                  p: 5,
                  textAlign: 'center',
                  color: '#fff',
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: '#fff',
                    borderRadius: '50%',
                    mx: 'auto',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {churchMetadata?.logo_url ? (
                    <img src={churchMetadata.logo_url} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                  ) : (
                    <CloudUploadOutlinedIcon sx={{ fontSize: 32, color: '#2d1b4e' }} />
                  )}
                </Box>
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.375rem', fontWeight: 600, mb: 1 }}>
                  {title}
                </Typography>
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.9375rem', color: 'rgba(255,255,255,0.7)', mb: 1.5 }}>
                  {subtitle}
                </Typography>
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', maxWidth: 320, mx: 'auto' }}>
                  {welcomeMessage}
                </Typography>
              </Box>

              {/* Preview Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {[{ label: 'Search Records', sub: 'Browse sacramental records' }, { label: 'Browse', sub: 'By category' }].map((c) => (
                  <Box
                    key={c.label}
                    sx={{
                      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
                      borderRadius: 1.5,
                      p: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827', mb: 0.25 }}>
                      {c.label}
                    </Typography>
                    <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                      {c.sub}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack?.severity || 'success'} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LandingPageBrandingPage;
