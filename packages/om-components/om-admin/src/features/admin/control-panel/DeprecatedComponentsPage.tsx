/**
 * DeprecatedComponentsPage.tsx — Components progressing through deprecation
 *
 * Located at /admin/control-panel/deprecated-components
 * Shows all deprecated components grouped by stage, with:
 *   - Risk analysis (scans Router.tsx, MenuItems.ts, and all source imports)
 *   - Stage advancement workflow with prerequisite validation
 *   - Stage-specific checklists (router removal, menu removal, file deletion)
 *
 * Integration:
 *   - Backend: /api/admin/deprecation-registry (analysis, advancement, history)
 *   - OMTrace: "Verify Imports" button → navigates to OMTrace with component pre-loaded
 *   - Refactor Console: "Check in Refactor Console" link
 *   - Feature Registry: cross-references to ensure deprecated items aren't still registered
 */

import {
  DEPRECATION_REGISTRY,
  deprecatedCountByStage,
  type DeprecatedEntry,
  type DeprecationTracking,
  type RiskAnalysisResult,
  type RiskLevel,
} from '@/config/deprecationRegistry';
import { FEATURE_REGISTRY } from '@/config/featureRegistry';
import apiClient from '@/api/utils/axiosInstance';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  ArrowBack as BackIcon,
  ArrowForward as AdvanceIcon,
  Archive as ArchivedIcon,
  CheckCircle as VerifiedIcon,
  Close as CloseIcon,
  DeleteForever as RemovedIcon,
  FilterList as FilterIcon,
  FolderOff as QuarantineIcon,
  OpenInNew as OpenIcon,
  Radar as AnalyzeIcon,
  Search as SearchIcon,
  Warning as DeprecatedIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ─── Risk config ──────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; emoji: string }> = {
  no_risk: { label: 'No Risk', color: '#2e7d32', emoji: '\u2714' },
  low:     { label: 'Low Risk', color: '#1565c0', emoji: '\u25CB' },
  medium:  { label: 'Medium Risk', color: '#e65100', emoji: '\u25C9' },
  high:    { label: 'High Risk', color: '#c62828', emoji: '\u25CF' },
};

// ─── Stage config ────────────────────────────────────────────

const STAGE_CONFIG: Record<number, {
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
  checklist: string[];
}> = {
  1: {
    label: 'Deprecated',
    color: '#e65100',
    icon: <DeprecatedIcon />,
    description: 'Marked for removal \u2014 still functional but routes redirect. No new development.',
    checklist: [
      'Replacement component is live and functional',
      'Route redirects are in place (Navigate to replacement)',
      'No active development on this component',
    ],
  },
  2: {
    label: 'Quarantined',
    color: '#c62828',
    icon: <QuarantineIcon />,
    description: 'Lazy imports severed from Router.tsx, removed from sidebar menus. Files still exist on disk.',
    checklist: [
      'Lazy import removed from Router.tsx (e.g. Loadable(lazy(...)))',
      'Route element replaced with <Navigate> redirect or removed',
      'Menu entry removed from MenuItems.ts',
      'Risk analysis run \u2014 no active router or menu references remain',
    ],
  },
  3: {
    label: 'Verified',
    color: '#1565c0',
    icon: <VerifiedIcon />,
    description: 'OMTrace confirms zero remaining imports. Safe to delete files.',
    checklist: [
      'Risk analysis run \u2014 zero import references from other components',
      'No other active components depend on this one',
      'OMTrace scan confirms clean',
    ],
  },
  4: {
    label: 'Removed',
    color: '#2e7d32',
    icon: <RemovedIcon />,
    description: 'Files deleted from disk. Available in git history and Refactor Console backups.',
    checklist: [
      'Source files deleted from disk',
      'Git commit records the deletion',
    ],
  },
  5: {
    label: 'Archived',
    color: '#616161',
    icon: <ArchivedIcon />,
    description: 'Fully archived \u2014 recorded in history for future reference.',
    checklist: [
      'Confirm removal is permanent',
      'Git history is sufficient for recovery if needed',
    ],
  },
};

// ─── Component ───────────────────────────────────────────────

const DeprecatedComponentsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const stageFilter = parseInt(searchParams.get('stage') || '0');
  const stageCounts = useMemo(() => deprecatedCountByStage(), []);

  // DB tracking data
  const [trackingMap, setTrackingMap] = useState<Record<string, DeprecationTracking>>({});
  // Analysis results (in-memory, per entry)
  const [analysisMap, setAnalysisMap] = useState<Record<string, RiskAnalysisResult>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  // Expanded analysis panels
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Advance dialog
  const [advanceDialog, setAdvanceDialog] = useState<{ entry: DeprecatedEntry } | null>(null);
  const [advancePlan, setAdvancePlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Load tracking data on mount
  useEffect(() => {
    apiClient.get('/admin/deprecation-registry')
      .then((res: any) => {
        if (res.success) setTrackingMap(res.trackingMap || {});
      })
      .catch(() => { /* silent */ });
  }, []);

  // Check for cross-registry conflicts
  const conflicts = useMemo(() => {
    const featureRoutes = new Set(FEATURE_REGISTRY.map(f => f.route).filter(Boolean));
    return DEPRECATION_REGISTRY.filter(d =>
      d.originalRoute && featureRoutes.has(d.originalRoute) && d.stage >= 2
    );
  }, []);

  // Merge static registry stage with DB override stage
  const getEffectiveStage = useCallback((entry: DeprecatedEntry): number => {
    return trackingMap[entry.id]?.stage ?? entry.stage;
  }, [trackingMap]);

  const grouped = useMemo(() =>
    [1, 2, 3, 4, 5].map(stage => ({
      stage,
      ...STAGE_CONFIG[stage],
      entries: DEPRECATION_REGISTRY.filter(e => getEffectiveStage(e) === stage),
    })).filter(g => g.entries.length > 0),
  [getEffectiveStage]);

  const visibleGroups = stageFilter
    ? grouped.filter(g => g.stage === stageFilter)
    : grouped;

  // Recount with effective stages
  const effectiveCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const e of DEPRECATION_REGISTRY) {
      const s = getEffectiveStage(e);
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [getEffectiveStage]);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'Deprecated Components' },
  ];

  // ── Actions ─────────────────────────────────────────────

  const runAnalysis = useCallback(async (entry: DeprecatedEntry) => {
    setAnalyzingId(entry.id);
    try {
      const params = new URLSearchParams({
        files: JSON.stringify(entry.files),
        ...(entry.originalRoute && { originalRoute: entry.originalRoute }),
      });
      const res: any = await apiClient.get(`/admin/deprecation-registry/${entry.id}/analysis?${params}`);
      if (res.success) {
        setAnalysisMap(prev => ({ ...prev, [entry.id]: res.analysis }));
        setExpandedId(entry.id);
        // Refresh tracking data
        const trackRes: any = await apiClient.get('/admin/deprecation-registry');
        if (trackRes.success) setTrackingMap(trackRes.trackingMap || {});
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzingId(null);
    }
  }, []);

  const loadPlan = useCallback(async (entry: DeprecatedEntry) => {
    const currentStage = getEffectiveStage(entry);
    setAdvanceDialog({ entry });
    setAdvancePlan(null);
    setPlanLoading(true);
    try {
      const res: any = await apiClient.post(`/admin/deprecation-registry/${entry.id}/plan`, {
        currentStage,
        entryData: {
          files: entry.files,
          originalRoute: entry.originalRoute,
          redirectTo: entry.redirectTo,
          name: entry.name,
        },
      });
      if (res.success) {
        setAdvancePlan(res.plan);
      }
    } catch (err) {
      console.error('Plan generation failed:', err);
    } finally {
      setPlanLoading(false);
    }
  }, [getEffectiveStage]);

  const handleAdvance = useCallback(async (entry: DeprecatedEntry) => {
    const currentStage = getEffectiveStage(entry);
    setAdvancing(true);
    try {
      const res: any = await apiClient.post(`/admin/deprecation-registry/${entry.id}/advance`, {
        currentStage,
        entryData: {
          files: entry.files,
          originalRoute: entry.originalRoute,
          redirectTo: entry.redirectTo,
        },
      });
      if (res.success) {
        const trackRes: any = await apiClient.get('/admin/deprecation-registry');
        if (trackRes.success) setTrackingMap(trackRes.trackingMap || {});
        setAdvanceDialog(null);
        setAdvancePlan(null);
      }
    } catch (err: any) {
      // Reload plan to show updated blockers
      if (err.response?.status === 422) {
        loadPlan(entry);
      }
    } finally {
      setAdvancing(false);
    }
  }, [getEffectiveStage, loadPlan]);

  const openOmtrace = (entry: DeprecatedEntry) => {
    const target = entry.files[0]?.replace(/\/$/, '').split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || entry.id;
    navigate(`/devel-tools/omtrace?target=${encodeURIComponent(target)}`);
  };

  // ── Render helpers ─────────────────────────────────────

  const renderRiskBadge = (entryId: string) => {
    const tracking = trackingMap[entryId];
    const analysis = analysisMap[entryId];
    const riskLevel = analysis?.riskLevel || tracking?.risk_level;
    if (!riskLevel) return null;
    const cfg = RISK_CONFIG[riskLevel];
    return (
      <Chip
        label={cfg.label}
        size="small"
        sx={{
          height: 20,
          fontSize: '0.68rem',
          fontWeight: 700,
          bgcolor: alpha(cfg.color, 0.12),
          color: cfg.color,
        }}
      />
    );
  };

  const renderAnalysisDetail = (entry: DeprecatedEntry) => {
    const analysis = analysisMap[entry.id];
    if (!analysis) return null;
    const tracking = trackingMap[entry.id];

    return (
      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', borderRadius: 1, fontSize: '0.75rem' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight={700}>Risk Analysis</Typography>
          {tracking?.last_analysis_at && (
            <Typography variant="caption" color="text.disabled">
              {new Date(tracking.last_analysis_at).toLocaleString()}
            </Typography>
          )}
        </Box>

        {/* Router refs */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" fontWeight={600} sx={{ color: analysis.router.active > 0 ? '#c62828' : '#2e7d32' }}>
            Router.tsx: {analysis.router.active} active ref{analysis.router.active !== 1 ? 's' : ''}
            {analysis.router.redirects > 0 && `, ${analysis.router.redirects} redirect${analysis.router.redirects !== 1 ? 's' : ''}`}
          </Typography>
          {analysis.router.refs.map((r, i) => (
            <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', color: r.isRedirect ? 'text.disabled' : 'error.main', ml: 1 }}>
              L{r.line}: {r.text.substring(0, 90)}{r.text.length > 90 ? '...' : ''} {r.isRedirect ? '(redirect)' : ''}
            </Typography>
          ))}
        </Box>

        {/* Menu refs */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" fontWeight={600} sx={{ color: analysis.menu.total > 0 ? '#c62828' : '#2e7d32' }}>
            MenuItems.ts: {analysis.menu.total} ref{analysis.menu.total !== 1 ? 's' : ''}
          </Typography>
          {analysis.menu.refs.map((r, i) => (
            <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', color: 'error.main', ml: 1 }}>
              L{r.line}: {r.text.substring(0, 90)}
            </Typography>
          ))}
        </Box>

        {/* Import refs */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" fontWeight={600} sx={{ color: analysis.imports.total > 0 ? '#c62828' : '#2e7d32' }}>
            Source imports: {analysis.imports.total} ref{analysis.imports.total !== 1 ? 's' : ''} across {analysis.dependentComponents.length} component{analysis.dependentComponents.length !== 1 ? 's' : ''}
          </Typography>
          {analysis.imports.refs.slice(0, 10).map((r, i) => (
            <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', color: 'warning.main', ml: 1 }}>
              {r.file}: {r.match.substring(0, 80)}
            </Typography>
          ))}
          {analysis.dependentComponents.length > 0 && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, ml: 1, fontWeight: 600, color: '#c62828' }}>
              Dependent: {analysis.dependentComponents.join(', ')}
            </Typography>
          )}
        </Box>

        {/* File status */}
        <Box>
          <Typography variant="caption" fontWeight={600}>Files on disk:</Typography>
          {analysis.files.map((f, i) => (
            <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', ml: 1, color: f.exists ? 'text.secondary' : '#2e7d32' }}>
              {f.exists ? '\u2022' : '\u2716'} {f.file} {f.exists ? '(exists)' : '(deleted)'}
            </Typography>
          ))}
        </Box>
      </Box>
    );
  };

  const renderEntryCard = (entry: DeprecatedEntry, groupColor: string) => {
    const effectiveStage = getEffectiveStage(entry);
    const isAnalyzing = analyzingId === entry.id;
    const isExpanded = expandedId === entry.id;
    const hasAnalysis = !!analysisMap[entry.id];
    const canAdvance = effectiveStage < 5;

    return (
      <Paper
        key={entry.id}
        variant="outlined"
        sx={{
          p: 2,
          borderLeft: `3px solid ${groupColor}`,
          transition: 'all 0.15s ease',
        }}
      >
        {/* Title row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.88rem', lineHeight: 1.3 }}>
            {entry.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
            {renderRiskBadge(entry.id)}
            {entry.category && (
              <Chip label={entry.category} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
        </Box>

        {/* Reason */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}>
          {entry.reason}
        </Typography>

        {/* Route info */}
        {entry.originalRoute && (
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontFamily: 'monospace', fontSize: '0.7rem' }}>
            <Box component="span" sx={{ color: 'text.disabled' }}>route: </Box>
            <Box component="span" sx={{ textDecoration: 'line-through', color: 'error.main' }}>{entry.originalRoute}</Box>
            {entry.redirectTo && (
              <>
                <Box component="span" sx={{ color: 'text.disabled' }}> {'\u2192'} </Box>
                <Box component="span" sx={{ color: 'success.main' }}>{entry.redirectTo}</Box>
              </>
            )}
          </Typography>
        )}

        {/* Files */}
        <Box sx={{ mb: 1 }}>
          {entry.files.map((file, i) => (
            <Typography key={i} variant="caption" sx={{
              display: 'block', fontFamily: 'monospace', fontSize: '0.68rem', color: 'text.secondary',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {file}
            </Typography>
          ))}
        </Box>

        {/* Metadata chips */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            label={`Deprecated ${entry.deprecatedDate}`}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.68rem', borderColor: isDark ? '#555' : '#ccc' }}
          />
          {entry.replacement && (
            <Chip
              label={`\u2192 ${entry.replacement}`}
              size="small"
              sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha('#2e7d32', 0.12), color: '#2e7d32', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => entry.replacement && navigate(entry.replacement)}
            />
          )}
          {entry.changeSetCode && (
            <Chip
              label={entry.changeSetCode}
              size="small"
              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, bgcolor: alpha('#1976d2', 0.12), color: '#1976d2' }}
            />
          )}
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          {/* Analyze risk */}
          <Tooltip title="Run dependency & risk analysis">
            <Button
              size="small"
              variant="outlined"
              startIcon={isAnalyzing ? <CircularProgress size={14} /> : <AnalyzeIcon sx={{ fontSize: '14px !important' }} />}
              onClick={() => runAnalysis(entry)}
              disabled={isAnalyzing}
              sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.25, borderColor: alpha('#7b1fa2', 0.4), color: '#7b1fa2' }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Risk'}
            </Button>
          </Tooltip>

          {/* OMTrace (stages 1-3) */}
          {effectiveStage <= 3 && (
            <Tooltip title="Analyze imports in OMTrace">
              <Button
                size="small"
                variant="outlined"
                startIcon={<SearchIcon sx={{ fontSize: '14px !important' }} />}
                onClick={() => openOmtrace(entry)}
                sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.25, borderColor: alpha('#1565c0', 0.4), color: '#1565c0' }}
              >
                OMTrace
              </Button>
            </Tooltip>
          )}

          {/* Advance stage */}
          {canAdvance && (
            <Tooltip title={`Advance to Stage ${effectiveStage + 1}: ${STAGE_CONFIG[effectiveStage + 1]?.label}`}>
              <Button
                size="small"
                variant="contained"
                startIcon={<AdvanceIcon sx={{ fontSize: '14px !important' }} />}
                onClick={() => loadPlan(entry)}
                sx={{
                  textTransform: 'none', fontSize: '0.72rem', py: 0.25, ml: 'auto',
                  bgcolor: STAGE_CONFIG[effectiveStage + 1]?.color,
                  '&:hover': { bgcolor: alpha(STAGE_CONFIG[effectiveStage + 1]?.color || '#666', 0.85) },
                }}
              >
                Advance
              </Button>
            </Tooltip>
          )}

          {/* Go to replacement */}
          {entry.redirectTo && (
            <Tooltip title="Go to replacement">
              <IconButton size="small" onClick={() => navigate(entry.redirectTo!)} sx={{ color: 'text.secondary' }}>
                <OpenIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Expandable analysis detail */}
        {hasAnalysis && (
          <>
            <Box
              sx={{ mt: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              <Typography variant="caption" color="primary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                {isExpanded ? 'Hide analysis details' : 'Show analysis details'}
              </Typography>
            </Box>
            <Collapse in={isExpanded}>{renderAnalysisDetail(entry)}</Collapse>
          </>
        )}
      </Paper>
    );
  };

  // ── Main render ────────────────────────────────────────

  return (
    <PageContainer title="Deprecated Components" description="Components progressing through deprecation toward removal">
      <Breadcrumb title="Deprecated Components" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/admin/control-panel')} sx={{ bgcolor: alpha('#c62828', 0.08), color: '#c62828' }}>
            <BackIcon />
          </IconButton>
          <Box sx={{
            width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2, bgcolor: alpha('#c62828', isDark ? 0.15 : 0.08), color: '#c62828', flexShrink: 0,
          }}>
            <QuarantineIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>Deprecated Components</Typography>
            <Typography variant="body2" color="text.secondary">
              {DEPRECATION_REGISTRY.length} component{DEPRECATION_REGISTRY.length !== 1 ? 's' : ''} tracked through the deprecation pipeline
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/devel-tools/refactor-console')}
            sx={{ textTransform: 'none', borderColor: '#757575', color: 'text.secondary' }}
          >
            Refactor Console
          </Button>
        </Box>

        {/* Conflicts warning */}
        {conflicts.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, border: '1px solid', borderColor: '#e65100', bgcolor: alpha('#e65100', 0.05), borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#e65100', mb: 0.5 }}>
              Cross-Registry Conflict
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {conflicts.length} deprecated component{conflicts.length !== 1 ? 's' : ''} still
              {' '}have routes registered in the Feature Registry:
              {' '}{conflicts.map(c => c.name).join(', ')}
            </Typography>
          </Paper>
        )}

        {/* Stage overview cards */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
          gap: 2, mb: 3,
        }}>
          {[1, 2, 3, 4, 5].map(stage => {
            const cfg = STAGE_CONFIG[stage];
            const count = effectiveCounts[stage] || 0;
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
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                  '&:hover': { borderColor: cfg.color, bgcolor: alpha(cfg.color, isDark ? 0.12 : 0.06) },
                }}
                onClick={() => setSearchParams(isActive ? {} : { stage: String(stage) })}
              >
                <Box sx={{ color: cfg.color, mb: 0.5 }}>{cfg.icon}</Box>
                <Typography variant="caption" fontWeight={700} sx={{ color: cfg.color }}>{cfg.label}</Typography>
                <Chip
                  label={count}
                  size="small"
                  sx={{ mt: 0.5, display: 'block', fontWeight: 600, bgcolor: alpha(cfg.color, 0.12), color: cfg.color }}
                />
              </Paper>
            );
          })}
        </Box>

        {/* Filter indicator */}
        {stageFilter > 0 && STAGE_CONFIG[stageFilter] && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Showing {STAGE_CONFIG[stageFilter].label} only
            </Typography>
            <Chip label="Show all" size="small" variant="outlined" onClick={() => setSearchParams({})} sx={{ cursor: 'pointer', fontSize: '0.72rem' }} />
          </Box>
        )}

        {/* Stage groups */}
        {visibleGroups.map(group => (
          <Box key={group.stage} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ color: group.color, display: 'flex', alignItems: 'center' }}>{group.icon}</Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: group.color }}>
                Stage {group.stage}: {group.label}
              </Typography>
              <Chip
                label={group.entries.length}
                size="small"
                sx={{ height: 22, minWidth: 22, bgcolor: alpha(group.color, 0.12), color: group.color, fontWeight: 700, fontSize: '0.75rem' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ml: 5 }}>
              {group.description}
            </Typography>

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 1.5, ml: { xs: 0, md: 2 },
            }}>
              {group.entries.map(entry => renderEntryCard(entry, group.color))}
            </Box>
          </Box>
        ))}

        {/* Empty state */}
        {visibleGroups.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {stageFilter
                ? `No components at stage ${stageFilter} (${STAGE_CONFIG[stageFilter]?.label})`
                : 'No deprecated components tracked yet'}
            </Typography>
          </Paper>
        )}

        {/* Workflow reference */}
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Deprecation Workflow</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((stage, i) => (
              <React.Fragment key={stage}>
                {i > 0 && <Typography variant="caption" color="text.disabled">{'\u2192'}</Typography>}
                <Chip
                  label={`${stage}. ${STAGE_CONFIG[stage].label}`}
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: alpha(STAGE_CONFIG[stage].color, 0.12), color: STAGE_CONFIG[stage].color }}
                />
              </React.Fragment>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Run <strong>Analyze Risk</strong> to scan Router.tsx, MenuItems.ts, and all source imports before advancing.
            Each stage transition validates prerequisites automatically.
          </Typography>
        </Paper>
      </Box>

      {/* ── Advance Stage Dialog (Plan-driven) ────────────── */}
      <Dialog
        open={!!advanceDialog}
        onClose={() => { if (!advancing && !planLoading) { setAdvanceDialog(null); setAdvancePlan(null); } }}
        maxWidth="md"
        fullWidth
      >
        {advanceDialog && (() => {
          const { entry } = advanceDialog;
          const currentStage = getEffectiveStage(entry);
          const nextStage = currentStage + 1;
          const nextCfg = STAGE_CONFIG[nextStage];
          const plan = advancePlan;

          const STATUS_ICON: Record<string, { icon: string; color: string }> = {
            done:    { icon: '\u2705', color: '#2e7d32' },
            pending: { icon: '\u26A0\uFE0F', color: '#e65100' },
            blocked: { icon: '\u274C', color: '#c62828' },
            info:    { icon: '\u2139\uFE0F', color: '#1565c0' },
          };

          const TOOL_LABEL: Record<string, { label: string; color: string }> = {
            analysis:           { label: 'Analysis',        color: '#7b1fa2' },
            omtrace:            { label: 'OMTrace',         color: '#1565c0' },
            'refactor-console': { label: 'Refactor Console', color: '#e65100' },
          };

          const CATEGORY_ORDER = ['router', 'menu', 'imports', 'files', 'archive'];

          // Group plan steps by category
          const groupedSteps = plan ? CATEGORY_ORDER.reduce((acc: Record<string, any[]>, cat) => {
            const stepsInCat = plan.steps.filter((s: any) => s.category === cat);
            if (stepsInCat.length > 0) acc[cat] = stepsInCat;
            return acc;
          }, {}) : {};

          const CATEGORY_LABELS: Record<string, string> = {
            router: 'Router.tsx',
            menu: 'MenuItems.ts',
            imports: 'Source Imports',
            files: 'Files on Disk',
            archive: 'Archive',
          };

          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                <Box sx={{ color: nextCfg?.color }}>{nextCfg?.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  Advance to Stage {nextStage}: {nextCfg?.label}
                  {plan?.riskLevel && (
                    <Chip
                      label={RISK_CONFIG[plan.riskLevel as RiskLevel]?.label || plan.riskLevel}
                      size="small"
                      sx={{
                        ml: 1, height: 20, fontSize: '0.68rem', fontWeight: 700, verticalAlign: 'middle',
                        bgcolor: alpha(RISK_CONFIG[plan.riskLevel as RiskLevel]?.color || '#666', 0.12),
                        color: RISK_CONFIG[plan.riskLevel as RiskLevel]?.color || '#666',
                      }}
                    />
                  )}
                </Box>
                <IconButton onClick={() => { setAdvanceDialog(null); setAdvancePlan(null); }} sx={{ ml: 'auto' }} size="small">
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>{entry.name}</strong> {'\u2014'} Stage {currentStage} ({STAGE_CONFIG[currentStage]?.label}) {'\u2192'} Stage {nextStage} ({nextCfg?.label})
                </Typography>

                {/* Loading state */}
                {planLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4, justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                      Scanning Router.tsx, MenuItems.ts, and source imports via OMTrace...
                    </Typography>
                  </Box>
                )}

                {/* Plan summary */}
                {plan && (
                  <>
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
                    {Object.entries(groupedSteps).map(([category, steps]: [string, any[]]) => (
                      <Box key={category} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {CATEGORY_LABELS[category] || category}
                        </Typography>
                        {steps.map((step: any, i: number) => {
                          const si = STATUS_ICON[step.status] || STATUS_ICON.info;
                          const tool = TOOL_LABEL[step.tool] || { label: step.tool, color: '#666' };
                          return (
                            <Paper
                              key={i}
                              variant="outlined"
                              sx={{
                                p: 1.5, mb: 1,
                                borderLeft: `3px solid ${si.color}`,
                                bgcolor: step.status === 'done' ? alpha('#2e7d32', isDark ? 0.05 : 0.02) : 'transparent',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Typography sx={{ fontSize: '1rem', lineHeight: 1.4, flexShrink: 0 }}>{si.icon}</Typography>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                                      {step.action}
                                    </Typography>
                                    <Chip
                                      label={tool.label}
                                      size="small"
                                      sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, bgcolor: alpha(tool.color, 0.12), color: tool.color }}
                                    />
                                  </Box>

                                  {step.file && (
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'text.secondary', display: 'block' }}>
                                      {step.file}{step.line ? `:${step.line}` : ''}
                                    </Typography>
                                  )}

                                  {step.detail && (
                                    <Box sx={{
                                      mt: 0.5, p: 1, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
                                      borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.65rem',
                                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                      color: 'text.secondary', maxHeight: 120, overflow: 'auto',
                                    }}>
                                      {step.detail}
                                    </Box>
                                  )}

                                  {step.instruction && step.status !== 'done' && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 500, color: si.color }}>
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

                    {/* Ready to advance */}
                    {plan.canAdvance && (
                      <Paper sx={{ p: 2, bgcolor: alpha('#2e7d32', 0.05), border: '1px solid', borderColor: '#2e7d32', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                          All prerequisites met. Ready to advance {entry.name} to Stage {nextStage} ({nextCfg?.label}).
                        </Typography>
                      </Paper>
                    )}
                  </>
                )}
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => { setAdvanceDialog(null); setAdvancePlan(null); }} disabled={advancing} sx={{ textTransform: 'none' }}>
                  Cancel
                </Button>
                {plan && !plan.canAdvance && plan.summary.pending > 0 && (
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
                <Button
                  variant="contained"
                  onClick={() => handleAdvance(entry)}
                  disabled={advancing || planLoading || !plan?.canAdvance}
                  startIcon={advancing ? <CircularProgress size={16} /> : <AdvanceIcon />}
                  sx={{
                    textTransform: 'none',
                    bgcolor: nextCfg?.color,
                    '&:hover': { bgcolor: alpha(nextCfg?.color || '#666', 0.85) },
                  }}
                >
                  {advancing ? 'Advancing...' : `Advance to ${nextCfg?.label}`}
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </PageContainer>
  );
};

export default DeprecatedComponentsPage;
