/**
 * PortalRecordsPage — Unified records hub for church portal users.
 *
 * Shows record type cards with counts, a getting-started onboarding flow
 * when the church has no records yet, and quick access to upload.
 */

import { metricsAPI } from '@/api/metrics.api';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Step,
  StepConnector,
  StepLabel,
  Stepper,
  Typography,
  alpha,
  stepConnectorClasses,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  IconArrowRight,
  IconBook2,
  IconCertificate,
  IconChartBar,
  IconCheck,
  IconCross,
  IconDatabase,
  IconFileUpload,
  IconHeart,
  IconSearch,
  IconShieldCheck,
  IconUpload,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

/* ─── Types ─── */

interface RecordCounts {
  baptism: number | null;
  marriage: number | null;
  funeral: number | null;
}

/* ─── Custom Stepper Connector ─── */

const StepperConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 22 },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(90deg, #7B4F9E 0%, #9C6FBF 100%)'
        : 'linear-gradient(90deg, #7B4F9E 0%, #9C6FBF 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)'
        : 'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.divider,
    borderRadius: 1,
  },
}));

/* ─── Custom Step Icon ─── */

interface StepIconProps {
  active: boolean;
  completed: boolean;
  icon: React.ReactNode;
  stepIndex: number;
}

const STEP_ICONS = [IconUpload, IconSearch, IconDatabase, IconCertificate];
const STEP_COLORS = ['#7B4F9E', '#F5B800', '#4CAF50', '#2196F3'];

const CustomStepIcon: React.FC<StepIconProps> = ({ active, completed, stepIndex }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const Icon = STEP_ICONS[stepIndex] || IconCheck;
  const color = STEP_COLORS[stepIndex] || '#7B4F9E';

  return (
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: completed
          ? alpha('#4CAF50', 0.12)
          : active
            ? alpha(color, 0.15)
            : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        border: '2px solid',
        borderColor: completed
          ? '#4CAF50'
          : active
            ? color
            : 'transparent',
        transition: 'all 0.3s ease',
      }}
    >
      {completed ? (
        <IconCheck size={22} color="#4CAF50" />
      ) : (
        <Icon size={22} color={active ? color : isDark ? '#888' : '#999'} />
      )}
    </Box>
  );
};

/* ─── Static config (labels injected in component) ─── */

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const;

const RECORD_TYPE_CONFIGS = [
  { key: 'baptism' as const, titleKey: 'portal.records_baptism_title', descKey: 'portal.records_baptism_desc', icon: IconBook2, color: '#7B4F9E', to: '/portal/records/baptism', newTo: '/portal/records/baptism/new' },
  { key: 'marriage' as const, titleKey: 'portal.records_marriage_title', descKey: 'portal.records_marriage_desc', icon: IconHeart, color: '#E91E63', to: '/portal/records/marriage', newTo: '/portal/records/marriage/new' },
  { key: 'funeral' as const, titleKey: 'portal.records_funeral_title', descKey: 'portal.records_funeral_desc', icon: IconCross, color: '#555', to: '/portal/records/funeral', newTo: '/portal/records/funeral/new' },
];

/* ─── Main Component ─── */

const PortalRecordsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeChurchId } = useChurch();
  const { t } = useLanguage();
  const isDark = theme.palette.mode === 'dark';
  const role = user?.role || '';
  const canUpload = ['super_admin', 'admin', 'church_admin', 'priest'].includes(role);

  const ONBOARDING_STEPS = [
    { label: t('portal.step1_label'), description: t('portal.step1_desc') },
    { label: t('portal.step2_label'), description: t('portal.step2_desc') },
    { label: t('portal.step3_label'), description: t('portal.step3_desc') },
    { label: t('portal.step4_label'), description: t('portal.step4_desc') },
  ];

  const RECORD_TYPES = RECORD_TYPE_CONFIGS.map(rt => ({
    ...rt,
    title: t(rt.titleKey),
    description: t(rt.descKey),
  }));

  const [counts, setCounts] = useState<RecordCounts>({ baptism: null, marriage: null, funeral: null });
  const [loading, setLoading] = useState(true);

  const totalRecords = (counts.baptism ?? 0) + (counts.marriage ?? 0) + (counts.funeral ?? 0);
  const hasRecords = totalRecords > 0;
  const allLoaded = counts.baptism !== null && counts.marriage !== null && counts.funeral !== null;

  // Determine active onboarding step based on state
  const getActiveStep = (): number => {
    if (!allLoaded) return 0;
    if (totalRecords === 0) return 0; // No records yet — start at upload
    if (totalRecords > 0 && totalRecords < 10) return 2; // Some records — in the database step
    return 3; // Plenty of records — certificates & reports
  };

  const activeStep = getActiveStep();

  const loadCounts = useCallback(async () => {
    setLoading(true);
    try {
      const [baptismRes, marriageRes, funeralRes] = await Promise.allSettled([
        metricsAPI.records.getBaptismRecords({ limit: 1 }),
        metricsAPI.records.getMarriageRecords({ limit: 1 }),
        metricsAPI.records.getFuneralRecords({ limit: 1 }),
      ]);

      const extractTotal = (res: PromiseSettledResult<any>) =>
        res.status === 'fulfilled'
          ? (res.value?.totalRecords ?? res.value?.total ?? res.value?.pagination?.total ?? res.value?.records?.length ?? 0)
          : 0;

      setCounts({
        baptism: extractTotal(baptismRes),
        marriage: extractTotal(marriageRes),
        funeral: extractTotal(funeralRes),
      });
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  return (
    <Box sx={{ minHeight: '60vh' }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: '"Cormorant Garamond", "Palatino Linotype", Georgia, serif',
                fontWeight: 700,
                color: 'text.primary',
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              }}
            >
              {t('portal.records_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {loading ? t('portal.records_loading') : hasRecords
                ? t('portal.records_total').replace('{count}', totalRecords.toLocaleString()).replace('{s}', totalRecords === 1 ? '' : 's')
                : t('portal.records_get_started')}
            </Typography>
          </Box>
          {canUpload && (
            <Button
              variant="contained"
              startIcon={<IconFileUpload size={18} />}
              onClick={() => navigate('/portal/upload')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                background: 'linear-gradient(135deg, #7B4F9E 0%, #9C6FBF 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #6A3F8E 0%, #8B5FAF 100%)' },
              }}
            >
              {t('portal.records_upload_btn')}
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Record Type Cards ── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {RECORD_TYPES.map((rt) => {
          const Icon = rt.icon;
          const count = counts[rt.key];
          const isEmpty = count === 0;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={rt.key}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: isDark
                      ? '0 8px 30px rgba(0,0,0,0.4)'
                      : `0 8px 30px ${alpha(rt.color, 0.12)}`,
                    borderColor: alpha(rt.color, 0.3),
                    '& .arrow-icon': { opacity: 1, transform: 'translateX(0)' },
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(rt.to)}
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <Box sx={{ height: 4, background: `linear-gradient(90deg, ${rt.color}, ${alpha(rt.color, 0.5)})` }} />
                  <CardContent sx={{ p: 3, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(rt.color, isDark ? 0.15 : 0.08),
                        }}
                      >
                        <Icon size={24} color={rt.color} />
                      </Box>
                      <Box className="arrow-icon" sx={{ opacity: 0, transform: 'translateX(-8px)', transition: 'all 0.3s ease', color: rt.color }}>
                        <IconArrowRight size={20} />
                      </Box>
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5, color: 'text.primary' }}>
                      {rt.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                      {rt.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {loading ? (
                        <Skeleton width={80} height={28} sx={{ borderRadius: 2 }} />
                      ) : (
                        <Chip
                          label={isEmpty ? t('common.no_records_yet') : t('portal.records_count').replace('{count}', count?.toLocaleString() || '0').replace('{s}', count === 1 ? '' : 's')}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            bgcolor: isEmpty
                              ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                              : alpha(rt.color, isDark ? 0.15 : 0.08),
                            color: isEmpty ? 'text.secondary' : rt.color,
                          }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Empty State: Getting Started Guide ── */}
      {allLoaded && !hasRecords && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            p: { xs: 3, md: 4 },
            mb: 4,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(123,79,158,0.04) 0%, rgba(0,0,0,0) 100%)'
              : 'linear-gradient(135deg, rgba(123,79,158,0.02) 0%, rgba(255,255,255,0) 100%)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: alpha('#7B4F9E', isDark ? 0.15 : 0.08),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <IconDatabase size={30} color="#7B4F9E" />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontFamily: '"Cormorant Garamond", "Palatino Linotype", Georgia, serif',
                fontWeight: 700,
                color: 'text.primary',
                mb: 1,
              }}
            >
              {t('portal.records_empty_title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>
              {t('portal.records_empty_desc')}
            </Typography>
          </Box>

          {/* Onboarding Stepper */}
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            connector={<StepperConnector />}
            sx={{ mb: 4 }}
          >
            {ONBOARDING_STEPS.map((step, index) => (
              <Step key={step.label} completed={index < activeStep}>
                <StepLabel
                  StepIconComponent={(props) => (
                    <CustomStepIcon
                      active={props.active ?? false}
                      completed={props.completed ?? false}
                      icon={props.icon}
                      stepIndex={index}
                    />
                  )}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: index === activeStep ? 700 : 500,
                      color: index <= activeStep ? 'text.primary' : 'text.secondary',
                      fontSize: '0.85rem',
                    }}
                  >
                    {step.label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Active Step Detail */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
            }}
          >
            {ONBOARDING_STEPS.map((step, index) => (
              <Box
                key={step.label}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: index === activeStep
                    ? alpha(STEP_COLORS[index], 0.4)
                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  bgcolor: index === activeStep
                    ? alpha(STEP_COLORS[index], isDark ? 0.06 : 0.03)
                    : 'transparent',
                  transition: 'all 0.3s ease',
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: index < activeStep
                        ? alpha('#4CAF50', 0.12)
                        : alpha(STEP_COLORS[index], isDark ? 0.15 : 0.08),
                    }}
                  >
                    {index < activeStep ? (
                      <IconCheck size={14} color="#4CAF50" />
                    ) : (
                      <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: STEP_COLORS[index] }}>
                        {index + 1}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {step.label}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, pl: 5.25 }}>
                  {step.description}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* CTA */}
          {canUpload && (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<IconUpload size={20} />}
                onClick={() => navigate('/portal/upload')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2.5,
                  px: 5,
                  py: 1.5,
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, #7B4F9E 0%, #9C6FBF 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #6A3F8E 0%, #8B5FAF 100%)' },
                }}
              >
                {t('portal.upload_first_records')}
              </Button>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1.5 }}>
                {t('portal.upload_format_note')}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* ── What To Expect (shown only when empty) ── */}
      {allLoaded && !hasRecords && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 2, fontSize: '0.75rem', mb: 2, display: 'block' }}>
            {t('portal.what_youll_see')}
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                icon: IconSearch,
                title: t('portal.feature_search_title'),
                text: t('portal.feature_search_desc'),
                color: '#7B4F9E',
              },
              {
                icon: IconShieldCheck,
                title: t('portal.feature_audit_title'),
                text: t('portal.feature_audit_desc'),
                color: '#4CAF50',
              },
              {
                icon: IconChartBar,
                title: t('portal.feature_analytics_title'),
                text: t('portal.feature_analytics_desc'),
                color: '#F5B800',
              },
              {
                icon: IconCertificate,
                title: t('portal.feature_certs_title'),
                text: t('portal.feature_certs_desc'),
                color: '#2196F3',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Grid size={{ xs: 12, sm: 6 }} key={item.title}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                      height: '100%',
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(item.color, isDark ? 0.15 : 0.08),
                        mb: 2,
                      }}
                    >
                      <Icon size={20} color={item.color} />
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, color: 'text.primary' }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {item.text}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ── Has Records: Quick Actions Bar ── */}
      {allLoaded && hasRecords && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2.5,
            p: 2.5,
            mb: 4,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>
            {t('portal.quick_actions')}
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {canUpload && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconUpload size={16} />}
              onClick={() => navigate('/portal/upload')}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {t('portal.upload_more_records')}
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconCertificate size={16} />}
            onClick={() => navigate('/portal/certificates/generate')}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {t('portal.generate_certificate')}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconChartBar size={16} />}
            onClick={() => navigate('/portal/charts')}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {t('portal.view_analytics')}
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default PortalRecordsPage;
