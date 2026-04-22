/**
 * ChurchPipelinePage.tsx
 * Unified read-only dashboard showing the full church lifecycle:
 * CRM Lead → Won → Provisioned → Token Issued → Members Joining → Active → Setup Complete
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Timeline as PipelineIcon,
  FiberManualRecord as DotIcon,
  ArrowForward as ArrowIcon,
  Science as DemoIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/admin/control-panel', title: 'Control Panel' },
  { title: 'Church Pipeline' },
];

interface PipelineStage {
  key: string;
  label: string;
  color: string;
  count: number;
  churches: { id: number; name: string; jurisdiction?: string; calendar_type?: string; is_demo?: boolean }[];
}

const ChurchPipelinePage: React.FC = () => {
  const theme = useTheme();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch CRM churches and onboarded churches in parallel
      const [crmRes, onboardingRes] = await Promise.all([
        apiClient.get('/crm/churches?limit=500').catch(() => ({ churches: [] })),
        apiClient.get('/admin/church-onboarding').catch(() => ({ churches: [] })),
      ]);

      const crmChurches = crmRes.churches || [];
      const onboardedChurches = onboardingRes.churches || [];

      // CRM pipeline stages
      const crmStages: Record<string, { id: number; name: string; jurisdiction?: string }[]> = {
        new_lead: [], contacted: [], qualified: [], proposal: [], negotiation: [], won: [],
      };
      for (const c of crmChurches) {
        const stage = c.pipeline_stage || 'new_lead';
        if (crmStages[stage]) {
          crmStages[stage].push({ id: c.id, name: c.name, jurisdiction: c.jurisdiction_abbr || c.jurisdiction });
        }
      }

      // Onboarding stages — derive from data
      const onboardingStages: Record<string, { id: number; name: string; calendar_type?: string; is_demo?: boolean }[]> = {
        provisioned: [], token_issued: [], members_joining: [], active: [], setup_complete: [],
      };
      for (const c of onboardedChurches) {
        const stage = c.setup_complete ? 'setup_complete'
          : c.active_users > 0 ? 'active'
          : c.pending_users > 0 ? 'members_joining'
          : c.active_token_count > 0 ? 'token_issued'
          : 'provisioned';
        onboardingStages[stage].push({
          id: c.id, name: c.name, calendar_type: c.calendar_type, is_demo: c.is_demo,
        });
      }

      const allStages: PipelineStage[] = [
        { key: 'new_lead', label: 'New Lead', color: '#9e9e9e', count: crmStages.new_lead.length, churches: crmStages.new_lead },
        { key: 'contacted', label: 'Contacted', color: '#42a5f5', count: crmStages.contacted.length, churches: crmStages.contacted },
        { key: 'qualified', label: 'Qualified', color: '#66bb6a', count: crmStages.qualified.length, churches: crmStages.qualified },
        { key: 'proposal', label: 'Proposal', color: '#ffa726', count: crmStages.proposal.length, churches: crmStages.proposal },
        { key: 'negotiation', label: 'Negotiation', color: '#ef5350', count: crmStages.negotiation.length, churches: crmStages.negotiation },
        { key: 'won', label: 'Won', color: '#ab47bc', count: crmStages.won.length, churches: crmStages.won },
        { key: 'provisioned', label: 'Provisioned', color: '#5c6bc0', count: onboardingStages.provisioned.length, churches: onboardingStages.provisioned },
        { key: 'token_issued', label: 'Token Issued', color: '#26a69a', count: onboardingStages.token_issued.length, churches: onboardingStages.token_issued },
        { key: 'members_joining', label: 'Members Joining', color: '#ff7043', count: onboardingStages.members_joining.length, churches: onboardingStages.members_joining },
        { key: 'active', label: 'Active', color: '#66bb6a', count: onboardingStages.active.length, churches: onboardingStages.active },
        { key: 'setup_complete', label: 'Setup Complete', color: '#2e7d32', count: onboardingStages.setup_complete.length, churches: onboardingStages.setup_complete },
      ];

      setStages(allStages);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const isDark = theme.palette.mode === 'dark';

  return (
    <PageContainer title="Church Pipeline" description="Full church lifecycle view">
      <Breadcrumb title="Church Pipeline" items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            <PipelineIcon sx={{ mr: 1, verticalAlign: 'middle', color: theme.palette.primary.main }} />
            Church Pipeline
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            End-to-end lifecycle: CRM Lead → Won → Provisioned → Active → Setup Complete
          </Typography>
        </Box>

        {/* Stage summary bar */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={0} alignItems="center" sx={{ overflowX: 'auto' }}>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} width={80} height={40} sx={{ mx: 1 }} />)
            ) : (
              stages.map((stage, i) => (
                <React.Fragment key={stage.key}>
                  <Box sx={{ textAlign: 'center', px: 1, minWidth: 70 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ color: stage.color }}>
                      {stage.count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                      {stage.label}
                    </Typography>
                  </Box>
                  {i < stages.length - 1 && (
                    <ArrowIcon sx={{ color: theme.palette.divider, fontSize: 16, flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))
            )}
          </Stack>
        </Paper>

        {/* Detailed stage cards */}
        <Stack spacing={2}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={100} />)
          ) : (
            stages.filter(s => s.count > 0).map((stage) => (
              <Paper key={stage.key} elevation={0}
                sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderLeft: `4px solid ${stage.color}` }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <DotIcon sx={{ color: stage.color, fontSize: 12 }} />
                  <Typography variant="subtitle1" fontWeight={600}>{stage.label}</Typography>
                  <Chip label={stage.count} size="small" sx={{ fontWeight: 700, bgcolor: alpha(stage.color, 0.12), color: stage.color }} />
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {stage.churches.map((c) => (
                    <Chip
                      key={c.id}
                      label={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <span>{c.name}</span>
                          {c.jurisdiction && (
                            <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>
                              ({c.jurisdiction})
                            </Typography>
                          )}
                          {c.is_demo && <DemoIcon sx={{ fontSize: 12, color: '#f9a825' }} />}
                        </Stack>
                      }
                      size="small"
                      variant="outlined"
                      sx={{
                        mb: 0.5,
                        borderColor: isDark ? alpha(stage.color, 0.3) : alpha(stage.color, 0.2),
                        bgcolor: isDark ? alpha(stage.color, 0.08) : alpha(stage.color, 0.04),
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
            ))
          )}

          {!loading && stages.every(s => s.count === 0) && (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
              <Typography color="text.secondary">No churches in the pipeline</Typography>
            </Paper>
          )}
        </Stack>
      </Box>
    </PageContainer>
  );
};

export default ChurchPipelinePage;
