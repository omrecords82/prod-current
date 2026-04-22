/**
 * OnboardingPipelinePage.tsx — Church Onboarding Pipeline
 *
 * Professional admin-facing onboarding pipeline with search/filter, stage chips,
 * and direct navigation to detail workspace.
 *
 * Uses /api/admin/onboarding-pipeline/list
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Add as AddIcon,
  Business as ChurchIcon,
  FilterList as FilterIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────

interface PipelineChurch {
  id: number;
  name: string;
  city: string | null;
  state_code: string | null;
  phone: string | null;
  pipeline_stage: string;
  priority: string | null;
  is_client: number;
  provisioned_church_id: number | null;
  current_records_situation: string | null;
  custom_structure_required: number;
  provisioning_ready: number;
  provisioning_completed: number;
  assigned_to_user_id: number | null;
  assigned_to_name: string | null;
  stage_label: string;
  stage_color: string;
  stage_order: number;
  jurisdiction_name: string | null;
  contact_count: number;
  email_count: number;
  last_activity: string | null;
  created_at: string;
}

// ─── Constants ──────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: 'new_lead', label: 'New Lead' },
  { key: 'interested', label: 'Interested' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'awaiting_info', label: 'Awaiting Info' },
  { key: 'record_review', label: 'Record Review' },
  { key: 'ready_provision', label: 'Ready to Provision' },
  { key: 'won', label: 'Won' },
  { key: 'provisioning', label: 'Provisioning' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'active', label: 'Active' },
  { key: 'setup_complete', label: 'Setup Complete' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'closed_lost', label: 'Closed / Lost' },
];

const BCrumb = [
  { to: '/admin/control-panel', title: 'Control Panel' },
  { title: 'Onboarding Pipeline' },
];

// ─── Component ──────────────────────────────────────────────────

const OnboardingPipelinePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [churches, setChurches] = useState<PipelineChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [customFilter, setCustomFilter] = useState(searchParams.get('custom') || '');
  const [provisionFilter, setProvisionFilter] = useState(searchParams.get('provisioning') || '');

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (customFilter === '1') params.custom_required = '1';
      if (provisionFilter) params.provisioning = provisionFilter;

      const qs = new URLSearchParams(params).toString();
      const data = await apiClient.get(`/admin/onboarding-pipeline/list${qs ? '?' + qs : ''}`);
      setChurches((data as any).churches || []);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, customFilter, provisionFilter]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Stage summary counts
  const stageCounts: Record<string, number> = {};
  for (const ch of churches) {
    stageCounts[ch.pipeline_stage] = (stageCounts[ch.pipeline_stage] || 0) + 1;
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getRecordsSituationLabel = (s: string | null) => {
    if (!s) return '—';
    const map: Record<string, string> = {
      paper: 'Paper Books',
      spreadsheets: 'Spreadsheets',
      software: 'Software',
      mixed: 'Mixed',
      unknown: 'Unknown',
    };
    return map[s] || s;
  };

  return (
    <PageContainer title="Onboarding Pipeline" description="Church onboarding pipeline management">
      <Breadcrumb title="Church Onboarding Pipeline" items={BCrumb} />

      {/* Stage Summary Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {PIPELINE_STAGES.filter(s => stageCounts[s.key]).map(stage => (
            <Chip
              key={stage.key}
              label={`${stage.label}: ${stageCounts[stage.key]}`}
              size="small"
              onClick={() => setStatusFilter(statusFilter === stage.key ? '' : stage.key)}
              sx={{
                bgcolor: statusFilter === stage.key ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.08),
                color: statusFilter === stage.key ? '#fff' : theme.palette.text.primary,
                fontWeight: 600,
                cursor: 'pointer',
                mb: 0.5,
              }}
            />
          ))}
          {churches.length > 0 && (
            <Chip
              label={`Total: ${churches.length}`}
              size="small"
              sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.info.main, 0.1) }}
            />
          )}
        </Stack>
      </Paper>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder="Search churches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                ),
              }}
              sx={{ minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Stage</InputLabel>
              <Select value={statusFilter} label="Stage" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All Stages</MenuItem>
                {PIPELINE_STAGES.map(s => (
                  <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Structure</InputLabel>
              <Select value={customFilter} label="Structure" onChange={(e) => setCustomFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="1">Custom Required</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Provisioning</InputLabel>
              <Select value={provisionFilter} label="Provisioning" onChange={(e) => setProvisionFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="ready">Ready to Provision</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchPipeline} size="small"><RefreshIcon /></IconButton>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Church</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Records</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Structure</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Provisioning</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Activity</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {churches.slice(0, 100).map((ch) => (
                <TableRow
                  key={ch.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/control-panel/onboarding-pipeline/${ch.id}`)}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ChurchIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{ch.name}</Typography>
                        {ch.jurisdiction_name && (
                          <Typography variant="caption" color="text.secondary">{ch.jurisdiction_name}</Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {[ch.city, ch.state_code].filter(Boolean).join(', ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ch.stage_label || ch.pipeline_stage}
                      size="small"
                      sx={{
                        bgcolor: ch.stage_color ? alpha(ch.stage_color, 0.15) : undefined,
                        color: ch.stage_color || theme.palette.text.primary,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getRecordsSituationLabel(ch.current_records_situation)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {ch.custom_structure_required ? (
                      <Chip label="Custom" size="small" color="warning" variant="outlined" />
                    ) : ch.provisioned_church_id ? (
                      <Chip label="Standard" size="small" color="success" variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {ch.provisioning_completed ? (
                      <Chip label="Complete" size="small" color="success" />
                    ) : ch.provisioning_ready ? (
                      <Chip label="Ready" size="small" color="info" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">Pending</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{ch.assigned_to_name || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(ch.last_activity)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Open Detail">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/control-panel/onboarding-pipeline/${ch.id}`);
                        }}
                      >
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {churches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No churches match the current filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {churches.length > 100 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing 100 of {churches.length} churches. Use filters to narrow results.
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}
    </PageContainer>
  );
};

export default OnboardingPipelinePage;
