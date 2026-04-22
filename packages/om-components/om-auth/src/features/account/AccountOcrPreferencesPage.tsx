/**
 * AccountOcrPreferencesPage — Church-scoped OCR settings for church_admin+ roles.
 *
 * Exposes a curated subset of ocr_settings via /api/my/ocr-preferences.
 * Sections: Document Language, Confidence Threshold, Image Preprocessing,
 *           Document Processing, Document Retention.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import SaveIcon from '@mui/icons-material/Save';
import TranslateIcon from '@mui/icons-material/Translate';
import TuneIcon from '@mui/icons-material/Tune';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { canManageOcrPreferences } from './accountPermissions';
import { SnackbarState, SNACKBAR_CLOSED, SNACKBAR_DURATION } from './accountConstants';
import { ocrApi, extractErrorMessage } from './accountApi';

/* ── Language options ── */
const LANGUAGES = [
  { code: 'eng', labelKey: 'account.ocr_lang_english', flag: '🇺🇸' },
  { code: 'ell', labelKey: 'account.ocr_lang_greek_modern', flag: '🇬🇷' },
  { code: 'grc', labelKey: 'account.ocr_lang_greek_ancient', flag: '🇬🇷' },
  { code: 'rus', labelKey: 'account.ocr_lang_russian', flag: '🇷🇺' },
  { code: 'ron', labelKey: 'account.ocr_lang_romanian', flag: '🇷🇴' },
  { code: 'srp', labelKey: 'account.ocr_lang_serbian', flag: '🇷🇸' },
  { code: 'bul', labelKey: 'account.ocr_lang_bulgarian', flag: '🇧🇬' },
  { code: 'ukr', labelKey: 'account.ocr_lang_ukrainian', flag: '🇺🇦' },
] as const;

/* ── Types ── */
interface OcrPreferences {
  language: string;
  defaultLanguage: string;
  confidenceThreshold: number;
  deskew: boolean;
  removeNoise: boolean;
  preprocessImages: boolean;
  documentProcessing: {
    spellingCorrection: string;
    extractAllText: string;
    improveFormatting: string;
  };
  documentDeletion: {
    deleteAfter: number;
    deleteUnit: string;
  };
}

const DEFAULT_PREFS: OcrPreferences = {
  language: 'eng',
  defaultLanguage: 'en',
  confidenceThreshold: 75,
  deskew: true,
  removeNoise: true,
  preprocessImages: true,
  documentProcessing: {
    spellingCorrection: 'fix',
    extractAllText: 'yes',
    improveFormatting: 'yes',
  },
  documentDeletion: {
    deleteAfter: 7,
    deleteUnit: 'days',
  },
};

const AccountOcrPreferencesPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<OcrPreferences>(DEFAULT_PREFS);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);
  const [dirty, setDirty] = useState(false);

  const canManage = canManageOcrPreferences(user);

  /* ── Load preferences ── */
  const fetchPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ocrApi.getPreferences();
      if (data.success) {
        setPrefs(data.preferences);
        setOcrEnabled(data.ocrEnabled !== false);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || t('account.ocr_load_failed'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) fetchPrefs();
    else setLoading(false);
  }, [canManage, fetchPrefs]);

  /* ── Save preferences ── */
  const handleSave = async () => {
    try {
      setSaving(true);
      await ocrApi.updatePreferences(prefs);
      setSnackbar({ open: true, message: t('account.ocr_saved'), severity: 'success' });
      setDirty(false);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || t('account.ocr_save_failed'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /* ── Field updaters ── */
  const updateField = <K extends keyof OcrPreferences>(key: K, value: OcrPreferences[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateDocProcessing = (key: string, value: string) => {
    setPrefs((prev) => ({
      ...prev,
      documentProcessing: { ...prev.documentProcessing, [key]: value },
    }));
    setDirty(true);
  };

  const updateDocDeletion = (key: string, value: string | number) => {
    setPrefs((prev) => ({
      ...prev,
      documentDeletion: { ...prev.documentDeletion, [key]: value },
    }));
    setDirty(true);
  };

  /* ── Permission guard ── */
  if (!canManage) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {t('account.ocr_preferences_title')}
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('account.ocr_no_access')}
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DocumentScannerIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.ocr_preferences_title')}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('account.ocr_preferences_desc')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {!ocrEnabled && (
            <Chip label={t('account.ocr_disabled_chip')} color="warning" size="small" variant="outlined" />
          )}
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || !dirty}
            size="small"
          >
            {saving ? t('common.saving') : t('common.save_changes')}
          </Button>
        </Stack>
      </Stack>

      {!ocrEnabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('account.ocr_disabled_warning')}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* ── Section 1: Document Language ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <TranslateIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                {t('account.ocr_document_language')}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('account.ocr_document_language_desc')}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>{t('account.ocr_language_label')}</InputLabel>
              <Select
                value={prefs.language}
                label={t('account.ocr_language_label')}
                onChange={(e) => updateField('language', e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.flag} {t(lang.labelKey)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* ── Section 2: Confidence Threshold ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <TuneIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                {t('account.ocr_confidence_threshold')}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('account.ocr_confidence_desc')}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={3} sx={{ maxWidth: 500 }}>
              <Slider
                value={prefs.confidenceThreshold}
                onChange={(_, val) => updateField('confidenceThreshold', val as number)}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 75, label: '75%' },
                  { value: 100, label: '100%' },
                ]}
                sx={{ flex: 1 }}
              />
              <Chip
                label={`${prefs.confidenceThreshold}%`}
                color={prefs.confidenceThreshold >= 75 ? 'success' : prefs.confidenceThreshold >= 50 ? 'warning' : 'error'}
                size="small"
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('account.ocr_confidence_recommend')}
            </Typography>
          </CardContent>
        </Card>

        {/* ── Section 3: Image Preprocessing ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <ImageIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                {t('account.ocr_image_preprocessing')}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('account.ocr_image_preprocessing_desc')}
            </Typography>
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.preprocessImages}
                    onChange={(e) => updateField('preprocessImages', e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">{t('account.ocr_enable_preprocessing')}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('account.ocr_master_toggle')}
                    </Typography>
                  </Box>
                }
              />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.deskew}
                    onChange={(e) => updateField('deskew', e.target.checked)}
                    size="small"
                    disabled={!prefs.preprocessImages}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" color={!prefs.preprocessImages ? 'text.disabled' : undefined}>
                      {t('account.ocr_auto_deskew')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('account.ocr_auto_deskew_desc')}
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.removeNoise}
                    onChange={(e) => updateField('removeNoise', e.target.checked)}
                    size="small"
                    disabled={!prefs.preprocessImages}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" color={!prefs.preprocessImages ? 'text.disabled' : undefined}>
                      {t('account.ocr_noise_removal')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('account.ocr_noise_removal_desc')}
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </CardContent>
        </Card>

        {/* ── Section 4: Document Processing ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <DescriptionIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                {t('account.ocr_document_processing')}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('account.ocr_document_processing_desc')}
            </Typography>
            <Stack spacing={2.5}>
              <FormControl size="small" sx={{ maxWidth: 300 }}>
                <InputLabel>{t('account.ocr_spelling_correction')}</InputLabel>
                <Select
                  value={prefs.documentProcessing.spellingCorrection}
                  label={t('account.ocr_spelling_correction')}
                  onChange={(e) => updateDocProcessing('spellingCorrection', e.target.value)}
                >
                  <MenuItem value="fix">{t('account.ocr_autofix')}</MenuItem>
                  <MenuItem value="suggest">{t('account.ocr_suggest_only')}</MenuItem>
                  <MenuItem value="off">{t('account.ocr_disabled')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ maxWidth: 300 }}>
                <InputLabel>{t('account.ocr_extract_all')}</InputLabel>
                <Select
                  value={prefs.documentProcessing.extractAllText}
                  label={t('account.ocr_extract_all')}
                  onChange={(e) => updateDocProcessing('extractAllText', e.target.value)}
                >
                  <MenuItem value="yes">{t('account.ocr_extract_everything')}</MenuItem>
                  <MenuItem value="tables">{t('account.ocr_tables_only')}</MenuItem>
                  <MenuItem value="no">{t('account.ocr_manual_selection')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ maxWidth: 300 }}>
                <InputLabel>{t('account.ocr_improve_formatting')}</InputLabel>
                <Select
                  value={prefs.documentProcessing.improveFormatting}
                  label={t('account.ocr_improve_formatting')}
                  onChange={(e) => updateDocProcessing('improveFormatting', e.target.value)}
                >
                  <MenuItem value="yes">{t('account.ocr_yes')}</MenuItem>
                  <MenuItem value="no">{t('account.ocr_no')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* ── Section 5: Document Retention ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <DeleteSweepIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                {t('account.ocr_document_retention')}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('account.ocr_retention_desc')}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <TextField
                size="small"
                label={t('account.ocr_delete_after')}
                type="number"
                value={prefs.documentDeletion.deleteAfter}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) updateDocDeletion('deleteAfter', val);
                }}
                inputProps={{ min: 1 }}
                sx={{ width: 120 }}
              />
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>{t('account.ocr_unit')}</InputLabel>
                <Select
                  value={prefs.documentDeletion.deleteUnit}
                  label={t('account.ocr_unit')}
                  onChange={(e) => updateDocDeletion('deleteUnit', e.target.value)}
                >
                  <MenuItem value="minutes">{t('account.ocr_minutes')}</MenuItem>
                  <MenuItem value="hours">{t('account.ocr_hours')}</MenuItem>
                  <MenuItem value="days">{t('account.ocr_days')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('account.ocr_retention_note')}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Bottom save bar (visible when dirty) */}
      {dirty && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 16,
            mt: 3,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('account.ocr_unsaved_changes')}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                fetchPrefs();
                setDirty(false);
              }}
            >
              {t('account.ocr_discard')}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t('common.saving') : t('common.save_changes')}
            </Button>
          </Stack>
        </Box>
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
    </Box>
  );
};

export default AccountOcrPreferencesPage;
