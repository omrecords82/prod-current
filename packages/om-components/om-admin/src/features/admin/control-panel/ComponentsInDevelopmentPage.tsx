/**
 * ComponentsInDevelopmentPage.tsx — Features progressing through the SDLC pipeline
 *
 * Located at /admin/control-panel/components-in-development
 * Shows all features in stages 1-4 grouped by stage, with:
 *   - Stage promotion workflow (Promote / Demote)
 *   - Readiness analysis (route, ProtectedRoute, EnvironmentAwarePage, change set)
 *   - Plan-driven promotion dialog with prerequisite validation
 *   - Change set linkage and status badges
 *
 * Sub-routes: ?stage=1|2|3|4 to filter to a specific stage.
 */

import { FEATURE_REGISTRY, type FeatureEntry } from '@/config/featureRegistry';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { apiClient } from '@/shared/lib/apiClient';
import PageContainer from '@/shared/ui/PageContainer';
import {
  ArrowBack as BackIcon,
  ArrowDownward as DemoteIcon,
  ArrowForward as PromoteIcon,
  Build as BuildIcon,
  Close as CloseIcon,
  Code as DevIcon,
  FilterList as FilterIcon,
  OpenInNew as OpenIcon,
  Radar as AnalyzeIcon,
  RocketLaunch as PrototypeIcon,
  Star as ProductionIcon,
  Tune as StabilizingIcon,
  Visibility as ReviewIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ─── Stage config ────────────────────────────────────────────

const STAGE_CONFIG: Record<number, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  1: { label: 'Prototype', color: '#e53935', icon: <PrototypeIcon />, description: 'Feature concepts being explored — may have placeholder UI or incomplete backend' },
  2: { label: 'Development', color: '#c62828', icon: <BuildIcon />, description: 'Actively being built — functional UI with at least partial backend integration' },
  3: { label: 'Review', color: '#e65100', icon: <ReviewIcon />, description: 'Functionally complete and ready for stakeholder review' },
  4: { label: 'Stabilizing', color: '#f57c00', icon: <StabilizingIcon />, description: 'Approved and being hardened — focus on error handling, edge cases, performance' },
  5: { label: 'Production', color: '#2e7d32', icon: <ProductionIcon />, description: 'Live and visible to all users' },
};

interface ChangeSetBrief {
  id: number;
  code: string;
  title: string;
  status: string;
  git_branch: string | null;
}

// ─── Component ───────────────────────────────────────────────

const ComponentsInDevelopmentPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [changeSets, setChangeSets] = useState<ChangeSetBrief[]>([]);
  const [csLoading, setCsLoading] = useState(true);
  const [trackingMap, setTrackingMap] = useState<Record<string, any>>({});

  // Promotion dialog state
  const [promoteDialog, setPromoteDialog] = useState<{ entry: FeatureEntry; direction: 'promote' | 'demote' } | null>(null);
  const [promotePlan, setPromotePlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const stageFilter = parseInt(searchParams.get('stage') || '0');

  useEffect(() => {
    apiClient.get('/admin/change-sets').then(res => {
      setChangeSets(res.data?.change_sets || []);
    }).catch(() => {}).finally(() => setCsLoading(false));
  }, []);

  // Load tracking data
  useEffect(() => {
    apiClient.get('/admin/feature-registry').then(res => {
      if (res.data?.success) setTrackingMap(res.data.trackingMap || {});
    }).catch(() => {});
  }, []);

  // Get effective stage (DB override or static registry)
  const getEffectiveStage = useCallback((feature: FeatureEntry): number => {
    const dbTrack = trackingMap[feature.id];
    return dbTrack?.stage ?? feature.stage;
  }, [trackingMap]);

  const devFeatures = useMemo(() =>
    FEATURE_REGISTRY.filter(f => {
      const effective = trackingMap[f.id]?.stage ?? f.stage;
      return effective >= 1 && effective <= 4;
    }),
  [trackingMap]);

  const grouped = useMemo(() =>
    [4, 3, 2, 1].map(stage => ({
      stage,
      ...STAGE_CONFIG[stage],
      features: devFeatures.filter(f => getEffectiveStage(f) === stage),
    })).filter(g => g.features.length > 0),
  [devFeatures, getEffectiveStage]);

  const visibleGroups = stageFilter
    ? grouped.filter(g => g.stage === stageFilter)
    : grouped;

  const findLinkedCS = (feature: FeatureEntry): ChangeSetBrief | undefined => {
    if (!feature.changeSetCode) return undefined;
    return changeSets.find(cs => cs.code === feature.changeSetCode);
  };

  const csStatusColor = (status: string) => {
    if (status === 'promoted') return '#388e3c';
    if (status === 'active') return '#1976d2';
    if (status === 'in_review' || status === 'approved') return '#f57c00';
    return '#757575';
  };

  // ── Promotion workflow ─────────────────────────────────────

  const loadPlan = useCallback(async (entry: FeatureEntry) => {
    const currentStage = getEffectiveStage(entry);
    setPromotePlan(null);
    setPlanLoading(true);
    try {
      const res = await apiClient.post('/admin/feature-registry/' + entry.id + '/plan', {
        currentStage,
        featureData: {
          route: entry.route,
          name: entry.name,
          changeSetCode: entry.changeSetCode,
        },
      });
      if (res.data?.success) {
        setPromotePlan(res.data.plan);
      }
    } catch (err) {
      console.error('Plan generation failed:', err);
    } finally {
      setPlanLoading(false);
    }
  }, [getEffectiveStage]);

  const openPromoteDialog = useCallback((entry: FeatureEntry, direction: 'promote' | 'demote') => {
    setPromoteDialog({ entry, direction });
    setPromotePlan(null);
    if (direction === 'promote') {
      loadPlan(entry);
    }
  }, [loadPlan]);

  const handlePromote = useCallback(async (entry: FeatureEntry) => {
    const currentStage = getEffectiveStage(entry);
    setPromoting(true);
    try {
      const res = await apiClient.post('/admin/feature-registry/' + entry.id + '/promote', {
        currentStage,
        featureData: {
          route: entry.route,
          name: entry.name,
          changeSetCode: entry.changeSetCode,
        },
      });
      if (res.data?.success) {
        // Refresh tracking data
        const trackRes = await apiClient.get('/admin/feature-registry');
        if (trackRes.data?.success) setTrackingMap(trackRes.data.trackingMap || {});
        setPromoteDialog(null);
        setPromotePlan(null);
      }
    } catch (err: any) {
      console.error('Promotion failed:', err);
      // Reload plan to show updated state
      loadPlan(entry);
    } finally {
      setPromoting(false);
    }
  }, [getEffectiveStage, loadPlan]);

  const handleDemote = useCallback(async (entry: FeatureEntry) => {
    const currentStage = getEffectiveStage(entry);
    setPromoting(true);
    try {
      const res = await apiClient.post('/admin/feature-registry/' + entry.id + '/demote', {
        currentStage,
        featureData: {
          route: entry.route,
          name: entry.name,
          changeSetCode: entry.changeSetCode,
        },
      });
      if (res.data?.success) {
        const trackRes = await apiClient.get('/admin/feature-registry');
        if (trackRes.data?.success) setTrackingMap(trackRes.data.trackingMap || {});
        setPromoteDialog(null);
        setPromotePlan(null);
      }
    } catch (err) {
      console.error('Demotion failed:', err);
    } finally {
      setPromoting(false);
    }
  }, [getEffectiveStage]);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'Components In Development' },
  ];

  return (
    <PageContainer title="Components In Development" description="Features progressing through the SDLC pipeline">
      <Breadcrumb title="Components In Development" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ───────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate('/admin/control-panel')}
            sx={{ bgcolor: alpha('#7b1fa2', 0.08), color: '#7b1fa2' }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{
            width: 56, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2,
            bgcolor: alpha('#7b1fa2', isDark ? 0.15 : 0.08),
            color: '#7b1fa2',
            flexShrink: 0,
          }}>
            <DevIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>Components In Development</Typography>
            <Typography variant="body2" color="text.secondary">
              {devFeatures.length} features progressing through the SDLC pipeline (stages 1-4, super_admin only)
            </Typography>
          </Box>
        </Box>

        {/* ── Stage overview cards ─────────────────────────── */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2,
          mb: 3,
        }}>
          {[4, 3, 2, 1].map(stage => {
            const cfg = STAGE_CONFIG[stage];
            const count = devFeatures.filter(f => getEffectiveStage(f) === stage).length;
            const isActive = stageFilter === stage;
            return (
              <Paper
                key={stage}
                elevation={0}
                sx={{
                  p: 2,
                  border: `2px solid ${isActive ? cfg.color : alpha(cfg.color, 0.25)}`,
                  borderRadius: 2,
                  bgcolor: isActive ? alpha(cfg.color, isDark ? 0.15 : 0.08) : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: cfg.color,
                    bgcolor: alpha(cfg.color, isDark ? 0.12 : 0.06),
                  },
                }}
                onClick={() => setSearchParams(isActive ? {} : { stage: String(stage) })}
              >
                <Box sx={{ color: cfg.color, mb: 0.5 }}>{cfg.icon}</Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: cfg.color }}>
                  Stage {stage}: {cfg.label}
                </Typography>
                <Chip
                  label={`${count} feature${count !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    mt: 1,
                    fontWeight: 600,
                    bgcolor: alpha(cfg.color, 0.12),
                    color: cfg.color,
                  }}
                />
              </Paper>
            );
          })}
        </Box>

        {/* ── Filter indicator ─────────────────────────────── */}
        {stageFilter > 0 && STAGE_CONFIG[stageFilter] && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Showing Stage {stageFilter}: {STAGE_CONFIG[stageFilter].label} only
            </Typography>
            <Chip
              label="Show all"
              size="small"
              variant="outlined"
              onClick={() => setSearchParams({})}
              sx={{ cursor: 'pointer', fontSize: '0.72rem' }}
            />
          </Box>
        )}

        {/* ── Stage groups ─────────────────────────────────── */}
        {visibleGroups.map(group => (
          <Box key={group.stage} sx={{ mb: 4 }}>
            {/* Stage header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ color: group.color, display: 'flex', alignItems: 'center' }}>{group.icon}</Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: group.color }}>
                Stage {group.stage}: {group.label}
              </Typography>
              <Chip
                label={group.features.length}
                size="small"
                sx={{
                  height: 22, minWidth: 22,
                  bgcolor: alpha(group.color, 0.12),
                  color: group.color,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ml: 5 }}>
              {group.description}
            </Typography>

            {/* Feature cards */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
              gap: 1.5,
              ml: { xs: 0, md: 2 },
            }}>
              {group.features.map(feature => {
                const linkedCS = csLoading ? undefined : findLinkedCS(feature);
                const effectiveStage = getEffectiveStage(feature);
                const canPromote = effectiveStage < 5;
                const canDemote = effectiveStage > 1;

                return (
                  <Paper
                    key={feature.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderLeft: `3px solid ${group.color}`,
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: alpha(group.color, 0.03),
                        borderColor: group.color,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          fontSize: '0.88rem', lineHeight: 1.3, flex: 1,
                          cursor: feature.route ? 'pointer' : 'default',
                          '&:hover': feature.route ? { textDecoration: 'underline' } : {},
                        }}
                        onClick={() => feature.route && navigate(feature.route)}
                      >
                        {feature.name}
                        {feature.route && (
                          <OpenIcon sx={{ fontSize: 12, color: 'text.disabled', ml: 0.5, verticalAlign: 'middle' }} />
                        )}
                      </Typography>
                    </Box>

                    {feature.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}>
                        {feature.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
                      {feature.since && (
                        <Chip
                          label={`Since ${feature.since}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.68rem', borderColor: isDark ? '#555' : '#ccc' }}
                        />
                      )}
                      {feature.changeSetCode && (
                        csLoading ? (
                          <Skeleton width={80} height={20} />
                        ) : linkedCS ? (
                          <Chip
                            label={`${linkedCS.code} · ${linkedCS.status.replace(/_/g, ' ')}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              bgcolor: alpha(csStatusColor(linkedCS.status), 0.12),
                              color: csStatusColor(linkedCS.status),
                              cursor: 'pointer',
                            }}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              navigate(`/omai/tools/om-daily/change-sets/${linkedCS.id}`);
                            }}
                          />
                        ) : (
                          <Chip
                            label={feature.changeSetCode}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.68rem', borderColor: isDark ? '#555' : '#ddd', color: 'text.disabled' }}
                          />
                        )
                      )}
                      {!feature.changeSetCode && (
                        <Chip
                          label="No change set"
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.68rem', borderColor: isDark ? '#555' : '#ddd', color: 'text.disabled' }}
                        />
                      )}
                    </Box>

                    {/* ── Promote / Demote buttons ──────────── */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {canDemote && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DemoteIcon sx={{ fontSize: 14 }} />}
                          onClick={() => openPromoteDialog(feature, 'demote')}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.72rem',
                            py: 0.25,
                            borderColor: alpha('#757575', 0.3),
                            color: '#757575',
                            '&:hover': { borderColor: '#757575', bgcolor: alpha('#757575', 0.05) },
                          }}
                        >
                          Demote
                        </Button>
                      )}
                      {canPromote && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PromoteIcon sx={{ fontSize: 14 }} />}
                          onClick={() => openPromoteDialog(feature, 'promote')}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.72rem',
                            py: 0.25,
                            bgcolor: STAGE_CONFIG[effectiveStage + 1]?.color || '#2e7d32',
                            '&:hover': { bgcolor: alpha(STAGE_CONFIG[effectiveStage + 1]?.color || '#2e7d32', 0.85) },
                          }}
                        >
                          Promote to {STAGE_CONFIG[effectiveStage + 1]?.label || 'Production'}
                        </Button>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        ))}

        {/* ── Promotion / Demotion Dialog ─────────────────── */}
        <Dialog
          open={!!promoteDialog}
          onClose={() => { if (!promoting && !planLoading) { setPromoteDialog(null); setPromotePlan(null); } }}
          maxWidth="md"
          fullWidth
        >
          {promoteDialog && (() => {
            const { entry, direction } = promoteDialog;
            const currentStage = getEffectiveStage(entry);
            const targetStage = direction === 'promote' ? currentStage + 1 : currentStage - 1;
            const targetCfg = STAGE_CONFIG[targetStage];
            const plan = promotePlan;

            const STATUS_ICON: Record<string, { icon: string; color: string }> = {
              done:    { icon: '\u2705', color: '#2e7d32' },
              pending: { icon: '\u26A0\uFE0F', color: '#e65100' },
              blocked: { icon: '\u274C', color: '#c62828' },
              info:    { icon: '\u2139\uFE0F', color: '#1565c0' },
            };

            const CATEGORY_LABELS: Record<string, string> = {
              router: 'Router.tsx',
              'env-aware': 'EnvironmentAwarePage',
              'change-set': 'Change Set',
              menu: 'MenuItems.ts',
              readiness: 'Readiness',
            };

            const CATEGORY_ORDER = ['router', 'env-aware', 'change-set', 'menu', 'readiness'];

            const groupedSteps = plan ? CATEGORY_ORDER.reduce((acc: Record<string, any[]>, cat) => {
              const stepsInCat = plan.steps.filter((s: any) => s.category === cat);
              if (stepsInCat.length > 0) acc[cat] = stepsInCat;
              return acc;
            }, {}) : {};

            return (
              <>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                  <Box sx={{ color: targetCfg?.color }}>
                    {direction === 'promote' ? <PromoteIcon /> : <DemoteIcon />}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    {direction === 'promote' ? 'Promote' : 'Demote'} to Stage {targetStage}: {targetCfg?.label}
                  </Box>
                  <IconButton onClick={() => { setPromoteDialog(null); setPromotePlan(null); }} size="small">
                    <CloseIcon />
                  </IconButton>
                </DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>{entry.name}</strong> {'\u2014'} Stage {currentStage} ({STAGE_CONFIG[currentStage]?.label}) {'\u2192'} Stage {targetStage} ({targetCfg?.label})
                  </Typography>

                  {currentStage === 4 && direction === 'promote' && (
                    <Paper sx={{ p: 1.5, mb: 2, bgcolor: alpha('#e65100', 0.06), border: '1px solid', borderColor: alpha('#e65100', 0.3), borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 600 }}>
                        Promoting to Production makes this feature visible to ALL users. A frontend rebuild is required after promotion.
                      </Typography>
                    </Paper>
                  )}

                  {/* Demote — no plan needed, just confirm */}
                  {direction === 'demote' && (
                    <Paper sx={{ p: 2, bgcolor: alpha('#757575', 0.05), border: '1px solid', borderColor: alpha('#757575', 0.2), borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        This will update <code>featureRegistry.ts</code> to set {entry.name} to Stage {targetStage} ({targetCfg?.label}).
                        A frontend rebuild will be needed for the change to take effect.
                      </Typography>
                    </Paper>
                  )}

                  {/* Promote — show plan */}
                  {direction === 'promote' && (
                    <>
                      {planLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4, justifyContent: 'center' }}>
                          <CircularProgress size={24} />
                          <Typography variant="body2" color="text.secondary">
                            Analyzing readiness — scanning Router.tsx, MenuItems.ts, and featureRegistry.ts...
                          </Typography>
                        </Box>
                      )}

                      {plan && (
                        <>
                          {/* Summary chips */}
                          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            {plan.summary.done > 0 && (
                              <Chip label={`${plan.summary.done} done`} size="small" sx={{ height: 22, bgcolor: alpha('#2e7d32', 0.12), color: '#2e7d32', fontWeight: 600 }} />
                            )}
                            {plan.summary.pending > 0 && (
                              <Chip label={`${plan.summary.pending} pending`} size="small" sx={{ height: 22, bgcolor: alpha('#e65100', 0.12), color: '#e65100', fontWeight: 600 }} />
                            )}
                            {plan.summary.blocked > 0 && (
                              <Chip label={`${plan.summary.blocked} blocked`} size="small" sx={{ height: 22, bgcolor: alpha('#c62828', 0.12), color: '#c62828', fontWeight: 600 }} />
                            )}
                            {plan.summary.info > 0 && (
                              <Chip label={`${plan.summary.info} info`} size="small" sx={{ height: 22, bgcolor: alpha('#1565c0', 0.12), color: '#1565c0', fontWeight: 600 }} />
                            )}
                          </Box>

                          {/* Steps grouped by category */}
                          {Object.entries(groupedSteps).map(([cat, steps]: [string, any[]]) => (
                            <Box key={cat} sx={{ mb: 2 }}>
                              <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                                {CATEGORY_LABELS[cat] || cat}
                              </Typography>
                              {steps.map((step: any, idx: number) => {
                                const si = STATUS_ICON[step.status] || STATUS_ICON.info;
                                return (
                                  <Paper
                                    key={idx}
                                    variant="outlined"
                                    sx={{ p: 1.5, mb: 1, borderLeft: `3px solid ${si.color}`, borderRadius: 1 }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                      <Typography sx={{ fontSize: '1rem', lineHeight: 1.4 }}>{si.icon}</Typography>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600} sx={{ color: si.color }}>
                                          {step.action}
                                        </Typography>
                                        {step.file && (
                                          <Typography variant="caption" sx={{ color: '#7b1fa2', fontFamily: 'monospace', display: 'block' }}>
                                            {step.file}{step.line ? `:${step.line}` : ''}
                                          </Typography>
                                        )}
                                        {step.detail && (
                                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-wrap', mt: 0.5 }}>
                                            {step.detail}
                                          </Typography>
                                        )}
                                        {step.instruction && step.status !== 'done' && (
                                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: si.color }}>
                                            {step.instruction}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  </Paper>
                                );
                              })}
                            </Box>
                          ))}

                          {/* Ready to promote */}
                          {plan.canAdvance && (
                            <Paper sx={{ p: 2, bgcolor: alpha('#2e7d32', 0.05), border: '1px solid', borderColor: '#2e7d32', borderRadius: 2 }}>
                              <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                                All checks passed. Ready to promote {entry.name} to Stage {targetStage} ({targetCfg?.label}).
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                This will update featureRegistry.ts on disk. A frontend rebuild is needed for changes to take effect.
                              </Typography>
                            </Paper>
                          )}
                        </>
                      )}
                    </>
                  )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                  <Button
                    onClick={() => { setPromoteDialog(null); setPromotePlan(null); }}
                    disabled={promoting}
                    sx={{ textTransform: 'none' }}
                  >
                    Cancel
                  </Button>

                  {direction === 'promote' && plan && !plan.canAdvance && plan.summary.pending > 0 && (
                    <Button
                      variant="outlined"
                      onClick={() => loadPlan(entry)}
                      disabled={planLoading}
                      startIcon={planLoading ? <CircularProgress size={16} /> : <AnalyzeIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      Re-scan
                    </Button>
                  )}

                  {direction === 'demote' ? (
                    <Button
                      variant="contained"
                      onClick={() => handleDemote(entry)}
                      disabled={promoting}
                      startIcon={promoting ? <CircularProgress size={16} /> : <DemoteIcon />}
                      sx={{
                        textTransform: 'none',
                        bgcolor: '#757575',
                        '&:hover': { bgcolor: '#616161' },
                      }}
                    >
                      {promoting ? 'Demoting...' : `Demote to ${targetCfg?.label}`}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={() => handlePromote(entry)}
                      disabled={promoting || planLoading || !plan?.canAdvance}
                      startIcon={promoting ? <CircularProgress size={16} /> : <PromoteIcon />}
                      sx={{
                        textTransform: 'none',
                        bgcolor: targetCfg?.color,
                        '&:hover': { bgcolor: alpha(targetCfg?.color || '#666', 0.85) },
                      }}
                    >
                      {promoting ? 'Promoting...' : `Promote to ${targetCfg?.label}`}
                    </Button>
                  )}
                </DialogActions>
              </>
            );
          })()}
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default ComponentsInDevelopmentPage;
