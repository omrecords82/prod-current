/**
 * OM OCR Studio v1 — Step-based workflow page
 * Matches Figma design: Prepare → Select Church → Add Images → (future: Review)
 * Light/dark ready — uses only MUI theme tokens, zero hardcoded hex.
 */

import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Typography,
    alpha,
    useTheme
} from '@mui/material';
import {
    IconCheck,
    IconRefresh,
    IconUpload,
} from '@tabler/icons-react';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import OcrStudioNav from '../components/OcrStudioNav';
import type { Church, StepStatus, StepDef } from './OmOcrStudioPage/types';
import { StepperHeader, StepCard } from './OmOcrStudioPage/helpers';
import OcrUploadDrawer from './OmOcrStudioPage/OcrUploadDrawer';
import ImageHistoryPanel from './OmOcrStudioPage/ImageHistoryPanel';

const OmOcrStudioPage: React.FC = () => {
  const theme = useTheme();
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { isLayout } = useContext(CustomizerContext);

  const isAdmin = isSuperAdmin() || hasRole('admin');

  // State
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('om_ocr_studio.guidelinesAccepted') === '1';
  });
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('om_ocr_studio.selectedChurchId');
    return stored ? Number(stored) : null;
  });
  // Session-only flag: user must explicitly confirm church each session
  const [churchConfirmed, setChurchConfirmed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('om_ocr_studio.churchConfirmed') === '1';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Effective church: admin picks, regular user uses own church_id
  const effectiveChurchId = isAdmin ? selectedChurchId : (user?.church_id ?? null);

  // Step statuses — step 2 requires explicit confirmation each session
  const step1Status: StepStatus = guidelinesAccepted ? 'completed' : 'in_progress';
  const step2Status: StepStatus = !guidelinesAccepted
    ? 'not_started'
    : churchConfirmed && selectedChurchId
    ? 'completed'
    : 'in_progress';
  const step3Status: StepStatus =
    !guidelinesAccepted
      ? 'not_started'
      : isAdmin && !churchConfirmed
      ? 'not_started'
      : !effectiveChurchId
      ? 'not_started'
      : 'in_progress';
  const step4Status: StepStatus =
    !guidelinesAccepted || !effectiveChurchId || (isAdmin && !churchConfirmed)
      ? 'not_started'
      : 'in_progress';

  // For non-admin users, step 2 is auto-completed since church is derived from auth
  const effectiveStep2Status: StepStatus = isAdmin
    ? step2Status
    : effectiveChurchId
    ? 'completed'
    : 'not_started';

  // Helper: find selected church name for sidebar display
  const selectedChurchName = churches.find((c) => c.id === selectedChurchId)?.name || null;

  // Build stepper labels
  const stepperSteps: StepDef[] = isAdmin
    ? [
        { label: 'Prepare Images', status: step1Status },
        { label: 'Select Church', status: step2Status },
        { label: 'Add Images', status: step3Status },
        { label: 'Review & Finalize', status: step4Status },
      ]
    : [
        { label: 'Prepare Images', status: step1Status },
        { label: 'Add Images', status: step3Status },
        { label: 'Review & Finalize', status: step4Status },
      ];

  // Load churches for admin
  useEffect(() => {
    if (!isAdmin) return;
    const loadChurches = async () => {
      try {
        const res: any = await apiClient.get('/api/my/churches');
        const data = res?.data ?? res;
        let list = data?.churches || data || [];
        if (!Array.isArray(list)) list = [];
        if (list.length === 0) {
          const fallback: any = await apiClient.get('/api/churches');
          const fData = fallback?.data ?? fallback;
          list = fData?.churches || fData || [];
        }
        setChurches(Array.isArray(list) ? list : []);
      } catch {
        setChurches([]);
      }
    };
    loadChurches();
  }, [isAdmin]);

  // Persist selected church for admins
  useEffect(() => {
    if (!isAdmin) return;
    if (selectedChurchId) {
      localStorage.setItem('om_ocr_studio.selectedChurchId', String(selectedChurchId));
    } else {
      localStorage.removeItem('om_ocr_studio.selectedChurchId');
    }
  }, [selectedChurchId, isAdmin]);

  // Persist workflow state to sessionStorage so navigation doesn't reset progress
  useEffect(() => {
    sessionStorage.setItem('om_ocr_studio.guidelinesAccepted', guidelinesAccepted ? '1' : '0');
  }, [guidelinesAccepted]);

  useEffect(() => {
    sessionStorage.setItem('om_ocr_studio.churchConfirmed', churchConfirmed ? '1' : '0');
  }, [churchConfirmed]);

  const canOpenDrawer = !!effectiveChurchId && guidelinesAccepted && (!isAdmin || churchConfirmed);

  // Count completed steps for sidebar progress
  const completedCount = stepperSteps.filter((s) => s.status === 'completed').length;
  const progressPct = Math.round((completedCount / stepperSteps.length) * 100);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
        pb: 6,
      }}
    >
      <OcrStudioNav />
      {/* ── Hero header ── */}
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          mb: 4,
        }}
      >
        <Box sx={{ maxWidth: isLayout === 'full' ? '100%' : 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 3.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-0.02em' }}>
                OCR Record Uploader
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                Upload, organize, and process church record images with OCR.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {isAdmin && (
                <Chip
                  label="Admin Mode"
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.dark,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.warning.main, 0.3),
                  }}
                />
              )}
              <Chip
                label={`${completedCount}/${stepperSteps.length} Steps`}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                }}
              />
            </Stack>
          </Stack>

          {/* Stepper */}
          <StepperHeader steps={stepperSteps} />
        </Box>
      </Box>

      {/* ── Two-column layout ── */}
      <Box
        sx={{
          maxWidth: isLayout === 'full' ? '100%' : 1100,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          display: 'flex',
          gap: 4,
          alignItems: 'flex-start',
        }}
      >
        {/* Left column — Step cards */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* ── Step 1: Prepare Your Record Images ── */}
          <StepCard step={1} title="Prepare Your Record Images" status={step1Status}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Before uploading, ensure your scanned images meet quality standards for accurate OCR
              processing. Following these guidelines will improve text recognition and reduce manual
              corrections.
            </Typography>

            <Stack spacing={1.2} sx={{ mb: 2.5 }}>
              {[
                'Scan pages at 300 DPI or higher for optimal OCR accuracy',
                'Ensure images are well-lit with minimal shadows or glare',
                'Capture full page edges and avoid cropping any text',
                'Use JPEG or PNG format (TIFF supported for archival)',
                'Organize files by book or volume before uploading',
              ].map((text, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      bgcolor: alpha(theme.palette.success.main, 0.12),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconCheck size={14} color={theme.palette.success.main} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {text}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            {/* What to Expect */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              What to Expect
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Automated Processing:</strong> Once uploaded, images are automatically processed
              using optical character recognition to extract names, dates, and record details.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              <strong>Review Step:</strong> Results with confidence scores below 85% are flagged for
              manual review, allowing you to verify and correct any misread text before final
              approval.
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={guidelinesAccepted}
                  onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                  sx={{
                    color: theme.palette.primary.main,
                    '&.Mui-checked': { color: theme.palette.primary.main },
                  }}
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  I understand these guidelines and I'm ready to upload.
                </Typography>
              }
            />
          </StepCard>

          {/* ── Step 2: Select Target Church (admin only) ── */}
          {isAdmin && (
            <StepCard step={2} title="Select Target Church" status={step2Status}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Choose the church database where OCR results will be stored. Make sure this matches the
                physical record book you are scanning. This selection determines where all processed
                records will be saved and organized.
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedChurchId ?? ''}
                    onChange={(e) => {
                      setSelectedChurchId(e.target.value ? Number(e.target.value) : null);
                      setChurchConfirmed(false);
                    }}
                    displayEmpty
                    sx={{ bgcolor: theme.palette.background.paper }}
                  >
                    <MenuItem value="" disabled>
                      <Typography color="text.secondary">Select a church…</Typography>
                    </MenuItem>
                    {churches.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  disabled={!selectedChurchId || churchConfirmed}
                  onClick={() => setChurchConfirmed(true)}
                  sx={{
                    fontWeight: 700,
                    px: 3,
                    py: 1,
                    alignSelf: 'flex-start',
                    bgcolor: theme.palette.primary.main,
                    '&:hover': { bgcolor: theme.palette.primary.dark },
                    '&.Mui-disabled': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: alpha(theme.palette.primary.main, 0.4),
                    },
                  }}
                >
                  {churchConfirmed ? 'Church Confirmed' : 'Confirm Selection'}
                </Button>
              </Stack>
            </StepCard>
          )}

          {/* ── Step 3: Add Record Images ── */}
          <StepCard
            step={isAdmin ? 3 : 2}
            title="Add Record Images"
            status={step3Status}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Add scanned images from the current book. Each image should contain a full record page
              with clear, legible text. You can upload up to 50 images per batch for processing.
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconUpload size={18} />}
              disabled={!canOpenDrawer}
              onClick={() => setDrawerOpen(true)}
              sx={{
                fontWeight: 700,
                px: 3,
                py: 1,
                bgcolor: theme.palette.primary.main,
                '&:hover': { bgcolor: theme.palette.primary.dark },
                '&.Mui-disabled': {
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: alpha(theme.palette.primary.main, 0.4),
                },
              }}
            >
              Open Upload Drawer
            </Button>
          </StepCard>

          {/* ── Step 4: Review & Finalize (Image History) ── */}
          <StepCard
            step={isAdmin ? 4 : 3}
            title="Review & Finalize"
            status={step4Status}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Click on a completed job below to open the full-page review workbench where you can
              view the source image, transcription, map fields, and finalize records.
            </Typography>
            {effectiveChurchId && canOpenDrawer ? (
              <ImageHistoryPanel churchId={effectiveChurchId} refreshKey={historyRefreshKey} />
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
                Complete the steps above to view upload history.
              </Typography>
            )}
          </StepCard>
        </Box>

        {/* Right column — Status sidebar */}
        <Box
          sx={{
            width: 300,
            flexShrink: 0,
            position: 'sticky',
            top: 24,
            display: { xs: 'none', md: 'block' },
          }}
        >
          {/* Progress card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: theme.palette.divider,
              bgcolor: theme.palette.background.paper,
              mb: 2.5,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
              Workflow Progress
            </Typography>
            <Box sx={{ position: 'relative', mb: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={progressPct}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: progressPct === 100 ? theme.palette.success.main : theme.palette.primary.main,
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {completedCount} of {stepperSteps.length} steps completed ({progressPct}%)
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Step checklist */}
            <Stack spacing={1}>
              {stepperSteps.map((s, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor:
                        s.status === 'completed'
                          ? alpha(theme.palette.success.main, 0.15)
                          : s.status === 'in_progress'
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.text.primary, 0.06),
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {s.status === 'completed' ? (
                      <IconCheck size={12} color={theme.palette.success.main} />
                    ) : s.status === 'in_progress' ? (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: theme.palette.primary.main,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: theme.palette.text.disabled,
                        }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: s.status === 'in_progress' ? 600 : 400,
                      color:
                        s.status === 'completed'
                          ? theme.palette.success.main
                          : s.status === 'in_progress'
                          ? theme.palette.text.primary
                          : theme.palette.text.disabled,
                      textDecoration: s.status === 'completed' ? 'line-through' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {s.label}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          {/* Church info card (admin) */}
          {isAdmin && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: churchConfirmed
                  ? alpha(theme.palette.success.main, 0.3)
                  : theme.palette.divider,
                bgcolor: churchConfirmed
                  ? alpha(theme.palette.success.main, 0.03)
                  : theme.palette.background.paper,
                mb: 2.5,
                transition: 'all 0.3s ease',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Target Church
              </Typography>
              {selectedChurchName ? (
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconCheck
                      size={16}
                      color={churchConfirmed ? theme.palette.success.main : theme.palette.text.disabled}
                    />
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {selectedChurchName}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {churchConfirmed ? 'Confirmed for this session' : 'Not yet confirmed'}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  No church selected
                </Typography>
              )}
            </Paper>
          )}

          {/* Quick actions card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: theme.palette.divider,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Stack spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<IconUpload size={16} />}
                disabled={!canOpenDrawer}
                onClick={() => setDrawerOpen(true)}
                sx={{ justifyContent: 'flex-start', fontWeight: 600 }}
              >
                Upload Images
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<IconRefresh size={16} />}
                disabled={!canOpenDrawer}
                onClick={() => setHistoryRefreshKey((k) => k + 1)}
                sx={{ justifyContent: 'flex-start', fontWeight: 600 }}
              >
                Refresh History
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Upload Drawer */}
      <OcrUploadDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        churchId={effectiveChurchId}
        onUploadComplete={() => setHistoryRefreshKey((k) => k + 1)}
      />
    </Box>
  );
};

export default OmOcrStudioPage;
