/**
 * PromptPlansPage.tsx
 * Lists all Prompt Plans with status, step progress, and actions.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Add as AddIcon,
  PlaylistPlay as PlanIcon,
  CheckCircle as CompletedIcon,
  Pause as PausedIcon,
  PlayArrow as ActiveIcon,
  Cancel as CancelledIcon,
  Edit as DraftIcon,
  SmartToy as AgentIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/utils/axiosInstance';

interface PlanRow {
  id: number;
  title: string;
  description: string | null;
  status: string;
  assigned_agent: string | null;
  change_set_code: string | null;
  change_set_status: string | null;
  step_count: number;
  completed_count: number;
  created_by_email: string | null;
  created_at: string;
}

const AGENT_OPTIONS = [
  { value: 'claude_cli', label: 'Claude CLI', color: '#d4a574' },
  { value: 'windsurf', label: 'Windsurf', color: '#00b4d8' },
  { value: 'cursor', label: 'Cursor', color: '#7c3aed' },
  { value: 'github_copilot', label: 'GitHub Copilot', color: '#1f883d' },
] as const;

const statusConfig: Record<string, { icon: React.ReactNode; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  draft:     { icon: <DraftIcon sx={{ fontSize: 14 }} />,     color: 'default' },
  active:    { icon: <ActiveIcon sx={{ fontSize: 14 }} />,    color: 'primary' },
  paused:    { icon: <PausedIcon sx={{ fontSize: 14 }} />,    color: 'warning' },
  completed: { icon: <CompletedIcon sx={{ fontSize: 14 }} />, color: 'success' },
  cancelled: { icon: <CancelledIcon sx={{ fontSize: 14 }} />, color: 'error' },
};

const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/admin/control-panel', title: 'Control Panel' },
  { title: 'Prompt Plans' },
];

const PromptPlansPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAgent, setNewAgent] = useState('');
  const [creating, setCreating] = useState(false);
  const [filterAgent, setFilterAgent] = useState('');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterAgent ? `?agent=${filterAgent}` : '';
      const res = await apiClient.get(`/prompt-plans${params}`);
      setPlans(res.items || []);
    } catch (err) {
      console.error('Failed to load prompt plans:', err);
    } finally {
      setLoading(false);
    }
  }, [filterAgent]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await apiClient.post('/prompt-plans', {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        assigned_agent: newAgent || null,
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewAgent('');
      navigate(`/devel-tools/prompt-plans/${res.plan.id}`);
    } catch (err) {
      console.error('Failed to create plan:', err);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <PageContainer title="Prompt Plans" description="AI prompt orchestration">
      <Breadcrumb title="Prompt Plans" items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              <PlanIcon sx={{ mr: 1, verticalAlign: 'middle', color: theme.palette.primary.main }} />
              Prompt Plans
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Ordered sequences of AI prompts for complex initiatives
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Plan
          </Button>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Filter by Agent</InputLabel>
            <Select value={filterAgent} label="Filter by Agent" onChange={(e) => setFilterAgent(e.target.value)}>
              <MenuItem value="">All Agents</MenuItem>
              {AGENT_OPTIONS.map((a) => (
                <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Agent</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>CS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Progress</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No prompt plans yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => {
                  const sc = statusConfig[plan.status] || statusConfig.draft;
                  const pct = plan.step_count > 0 ? Math.round((plan.completed_count / plan.step_count) * 100) : 0;
                  return (
                    <TableRow
                      key={plan.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/devel-tools/prompt-plans/${plan.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                          PP-{String(plan.id).padStart(4, '0')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{plan.title}</Typography>
                        {plan.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {plan.description.length > 80 ? plan.description.substring(0, 80) + '...' : plan.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {plan.assigned_agent ? (() => {
                          const ag = AGENT_OPTIONS.find(a => a.value === plan.assigned_agent);
                          return (
                            <Chip
                              icon={<AgentIcon sx={{ fontSize: 14, color: `${ag?.color || '#888'} !important` }} />}
                              label={ag?.label || plan.assigned_agent}
                              size="small"
                              sx={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                bgcolor: alpha(ag?.color || '#888', 0.1),
                                color: ag?.color || '#888',
                                '& .MuiChip-icon': { ml: '4px' },
                              }}
                            />
                          );
                        })() : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip icon={sc.icon} label={plan.status} size="small" color={sc.color} variant="outlined" sx={{ fontSize: '0.7rem', textTransform: 'capitalize' }} />
                      </TableCell>
                      <TableCell>
                        {plan.change_set_code ? (
                          <Chip
                            label={plan.change_set_code}
                            size="small"
                            sx={{ fontSize: '0.68rem', fontWeight: 600, bgcolor: alpha('#2d1b4e', 0.08), color: '#2d1b4e' }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                            {plan.completed_count}/{plan.step_count}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{plan.created_by_email || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {formatDate(plan.created_at)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Prompt Plan</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Plan Title"
            placeholder="e.g., AG Grid Migration"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description (optional)"
            placeholder="Describe the initiative..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Assign to Agent (optional)</InputLabel>
            <Select value={newAgent} label="Assign to Agent (optional)" onChange={(e) => setNewAgent(e.target.value)}>
              <MenuItem value="">None</MenuItem>
              {AGENT_OPTIONS.map((a) => (
                <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newTitle.trim() || creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default PromptPlansPage;
