/**
 * SDLCPage.tsx — Feature Lifecycle (SDLC) Dashboard
 *
 * Visual representation of the five-stage feature lifecycle.
 * Reads live data from featureRegistry.ts (single source of truth).
 */

import { FEATURE_REGISTRY, FeatureEntry } from '@/config/featureRegistry';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  AccountTree as ArchIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as CheckIcon,
  Code as CodeIcon,
  Flag as FlagIcon,
  Launch as LaunchIcon,
  RateReview as ReviewIcon,
  Rocket as RocketIcon,
  Science as PrototypeIcon,
  Shield as StabilizeIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Stage metadata ──────────────────────────────────────────
interface StageMeta {
  label: string;
  color: string;
  bannerColor: 'error' | 'warning' | 'success';
  icon: React.ReactNode;
  visibility: string;
  routePrefix: string;
  description: string;
  entry: string;
  exit: string;
}

const STAGES: Record<number, StageMeta> = {
  1: {
    label: 'Prototype',
    color: '#d32f2f',
    bannerColor: 'error',
    icon: <PrototypeIcon />,
    visibility: 'super_admin only',
    routePrefix: '/devel-tools/',
    description: 'Feature concept being explored. May be non-functional, have placeholder UI, or incomplete backend.',
    entry: 'New feature directory created under front-end/src/features/',
    exit: 'Core UI renders, basic navigation works, feature purpose is clear',
  },
  2: {
    label: 'Development',
    color: '#c62828',
    bannerColor: 'error',
    icon: <CodeIcon />,
    visibility: 'super_admin only',
    routePrefix: '/devel-tools/',
    description: 'Feature is actively being built. Has functional UI and at least partial backend integration.',
    entry: 'Passed prototype review',
    exit: 'All primary user flows work end-to-end, API endpoints return real data',
  },
  3: {
    label: 'Review',
    color: '#e65100',
    bannerColor: 'warning',
    icon: <ReviewIcon />,
    visibility: 'super_admin only',
    routePrefix: '/devel/ or /apps/',
    description: 'Feature is functionally complete and ready for review. May have edge cases or polish issues.',
    entry: 'All user flows work, no known critical bugs',
    exit: 'Reviewed by stakeholder, feedback addressed',
  },
  4: {
    label: 'Stabilizing',
    color: '#f57c00',
    bannerColor: 'warning',
    icon: <StabilizeIcon />,
    visibility: 'super_admin only',
    routePrefix: '/apps/',
    description: 'Feature is approved but being hardened. Focus on error handling, edge cases, performance.',
    entry: 'Stakeholder approved',
    exit: 'No known bugs, error boundaries in place, works across roles',
  },
  5: {
    label: 'Production',
    color: '#2e7d32',
    bannerColor: 'success',
    icon: <RocketIcon />,
    visibility: 'All authenticated users',
    routePrefix: '/apps/ or /admin/',
    description: 'Feature is stable and visible to all users. Set priority 0 to fully graduate (hide banner).',
    entry: 'Passed stabilization',
    exit: 'N/A (or banner removed by setting priority to 0)',
  },
};

// ─── Component ───────────────────────────────────────────────
const SDLCPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'Feature Lifecycle (SDLC)' },
  ];

  // Group features by stage
  const featuresByStage = useMemo(() => {
    const grouped: Record<number, FeatureEntry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    FEATURE_REGISTRY.forEach((f) => {
      if (grouped[f.stage]) grouped[f.stage].push(f);
    });
    return grouped;
  }, []);

  const totalFeatures = FEATURE_REGISTRY.length;

  return (
    <PageContainer title="Feature Lifecycle (SDLC)" description="Five-stage feature lifecycle dashboard">
      <Breadcrumb title="Feature Lifecycle (SDLC)" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ──────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box sx={{
            width: 56, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2,
            bgcolor: alpha('#1565c0', isDark ? 0.15 : 0.08),
            color: '#1565c0',
            flexShrink: 0,
          }}>
            <FlagIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Feature Lifecycle (SDLC)</Typography>
            <Typography variant="body2" color="text.secondary">
              {totalFeatures} registered features across 5 lifecycle stages
            </Typography>
          </Box>
        </Box>

        {/* ── Pipeline Overview (horizontal stages) ───────── */}
        <Card variant="outlined" sx={{ mb: 4, overflow: 'visible' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2.5 }}>Pipeline Overview</Typography>
            <Box sx={{
              display: 'flex',
              alignItems: 'stretch',
              gap: { xs: 1, md: 0 },
              flexDirection: { xs: 'column', md: 'row' },
            }}>
              {[1, 2, 3, 4, 5].map((stage, idx) => {
                const meta = STAGES[stage];
                const count = featuresByStage[stage].length;
                return (
                  <React.Fragment key={stage}>
                    {idx > 0 && (
                      <Box sx={{
                        display: { xs: 'none', md: 'flex' },
                        alignItems: 'center',
                        px: 0.5,
                        color: 'text.disabled',
                      }}>
                        <ArrowIcon />
                      </Box>
                    )}
                    <Paper
                      elevation={0}
                      sx={{
                        flex: 1,
                        p: 2,
                        borderRadius: 2,
                        border: `2px solid ${alpha(meta.color, 0.3)}`,
                        bgcolor: alpha(meta.color, isDark ? 0.08 : 0.04),
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: meta.color,
                          bgcolor: alpha(meta.color, isDark ? 0.12 : 0.08),
                        },
                      }}
                    >
                      <Box sx={{ color: meta.color, mb: 1 }}>{meta.icon}</Box>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: meta.color }}>
                        Stage {stage}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>{meta.label}</Typography>
                      <Chip
                        label={`${count} feature${count !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          mt: 1,
                          fontWeight: 600,
                          bgcolor: alpha(meta.color, 0.12),
                          color: meta.color,
                          border: `1px solid ${alpha(meta.color, 0.3)}`,
                        }}
                      />
                    </Paper>
                  </React.Fragment>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* ── Stage Details + Features ────────────────────── */}
        {[1, 2, 3, 4, 5].map((stage) => {
          const meta = STAGES[stage];
          const features = featuresByStage[stage];
          return (
            <Card key={stage} variant="outlined" sx={{ mb: 3, borderLeft: `4px solid ${meta.color}` }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                {/* Stage header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box sx={{ color: meta.color }}>{meta.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700}>
                      Stage {stage} — {meta.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{meta.description}</Typography>
                  </Box>
                  <Chip
                    label={meta.visibility}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: alpha(meta.color, 0.4), color: meta.color, fontWeight: 600, fontSize: '0.72rem' }}
                  />
                </Box>

                {/* Entry / Exit criteria */}
                <Box sx={{
                  display: 'flex',
                  gap: 2,
                  mb: 2,
                  flexDirection: { xs: 'column', sm: 'row' },
                }}>
                  <Box sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha(meta.color, isDark ? 0.06 : 0.03),
                    border: `1px solid ${alpha(meta.color, 0.15)}`,
                  }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">ENTRY CRITERIA</Typography>
                    <Typography variant="body2">{meta.entry}</Typography>
                  </Box>
                  <Box sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha(meta.color, isDark ? 0.06 : 0.03),
                    border: `1px solid ${alpha(meta.color, 0.15)}`,
                  }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">EXIT CRITERIA</Typography>
                    <Typography variant="body2">{meta.exit}</Typography>
                  </Box>
                </Box>

                {/* Route prefix + banner info */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={`Route: ${meta.routePrefix}`} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                  <Chip
                    label={`Banner: ${meta.bannerColor}`}
                    size="small"
                    color={meta.bannerColor}
                    variant="filled"
                    sx={{ fontSize: '0.72rem' }}
                  />
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Feature list */}
                {features.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No features currently at this stage
                  </Typography>
                ) : (
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
                    gap: 1.5,
                  }}>
                    {features.map((f) => (
                      <Paper
                        key={f.id}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
                          borderRadius: 1.5,
                          cursor: f.route ? 'pointer' : 'default',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          '&:hover': f.route ? {
                            borderColor: meta.color,
                            bgcolor: alpha(meta.color, 0.03),
                          } : {},
                        }}
                        onClick={() => f.route && navigate(f.route)}
                      >
                        <Box sx={{
                          width: 8, height: 8,
                          borderRadius: '50%',
                          bgcolor: meta.color,
                          flexShrink: 0,
                        }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>{f.name}</Typography>
                            {f.route && <LaunchIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                          </Box>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {f.route || 'No route'}
                            {f.since ? ` · since ${f.since}` : ''}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* ── Architecture Diagram ────────────────────────── */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <ArchIcon sx={{ color: '#1565c0' }} />
              <Typography variant="h6" fontWeight={700}>Architecture</Typography>
            </Box>

            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
              py: 2,
            }}>
              {/* Source of truth */}
              <Tooltip title="Single source of truth for all features and their stages">
                <Paper elevation={0} sx={{
                  px: 3, py: 1.5,
                  border: `2px solid ${alpha('#1565c0', 0.4)}`,
                  borderRadius: 2,
                  bgcolor: alpha('#1565c0', isDark ? 0.1 : 0.05),
                  textAlign: 'center',
                }}>
                  <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>featureRegistry.ts</Typography>
                  <Typography variant="caption" color="text.secondary">Source of Truth</Typography>
                </Paper>
              </Tooltip>

              {/* Connector */}
              <Box sx={{ width: 2, height: 20, bgcolor: 'divider' }} />

              {/* Three consumers */}
              <Box sx={{
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                {[
                  { file: 'EnvironmentContext.tsx', desc: 'isFeatureEnabled, shouldShowPriority' },
                  { file: 'EnvironmentAwarePage.tsx', desc: 'Auto-derive priority, banner labels' },
                  { file: 'Router.tsx', desc: 'EnvironmentAwarePage wraps gated routes' },
                ].map((item) => (
                  <Paper key={item.file} elevation={0} sx={{
                    px: 2.5, py: 1.5,
                    border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                    borderRadius: 1.5,
                    textAlign: 'center',
                    minWidth: 200,
                  }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {item.file}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* ── How-To Cards ────────────────────────────────── */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 3,
        }}>
          {/* Register */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>How To Register a Feature</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Add an entry to <code>FEATURE_REGISTRY</code> in <code>featureRegistry.ts</code>:
              </Typography>
              <Paper elevation={0} sx={{
                p: 2,
                bgcolor: isDark ? '#1a1a2e' : '#f5f5f5',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                lineHeight: 1.6,
                overflow: 'auto',
              }}>
                <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
{`{
  id: 'my-feature',
  name: 'My Feature',
  stage: 1,
  route: '/devel-tools/my-feature',
  since: '2026-02-15',
}`}
                </Box>
              </Paper>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Then wrap the route in <code>Router.tsx</code> with{' '}
                <code>{'<EnvironmentAwarePage featureId="my-feature">'}</code>.
              </Typography>
            </CardContent>
          </Card>

          {/* Promote */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>How To Promote a Feature</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Change the <code>stage</code> value in <code>featureRegistry.ts</code>. That's it.
              </Typography>
              <Paper elevation={0} sx={{
                p: 2,
                bgcolor: isDark ? '#1a1a2e' : '#f5f5f5',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                lineHeight: 1.6,
                overflow: 'auto',
              }}>
                <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
{`// Before (stage 2 = Development)
{ id: 'my-feature', stage: 2, ... }

// After  (stage 3 = Review)
{ id: 'my-feature', stage: 3, ... }`}
                </Box>
              </Paper>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                When promoting to stage 5, consider moving the route from <code>/devel-tools/</code> to <code>/apps/</code> or <code>/admin/</code>.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* ── Git Branch Naming ───────────────────────────── */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Git Branch Naming</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Paper elevation={0} sx={{
                px: 2, py: 1.5,
                bgcolor: isDark ? '#1a1a2e' : '#f5f5f5',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.82rem',
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Feature</Typography>
                feature/&lt;color&gt;/&lt;date&gt;/&lt;feature-id&gt;
              </Paper>
              <Paper elevation={0} sx={{
                px: 2, py: 1.5,
                bgcolor: isDark ? '#1a1a2e' : '#f5f5f5',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.82rem',
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Bug Fix</Typography>
                fix/&lt;color&gt;/&lt;date&gt;/&lt;description&gt;
              </Paper>
            </Box>
          </CardContent>
        </Card>

      </Box>
    </PageContainer>
  );
};

export default SDLCPage;
