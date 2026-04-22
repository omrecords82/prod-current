/**
 * ChangeSetDetailPage.tsx
 * Full detail view for a single change_set.
 * Includes linked items, event timeline, build linkage, review/approve/reject actions.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Add as AddIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Code as CommitIcon,
  ContentCopy as CopyIcon,
  Delete as RemoveIcon,
  History as HistoryIcon,
  Inventory2 as PackageIcon,
  Note as NoteIcon,
  PlayArrow as PlayIcon,
  Storage as DbIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Skeleton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/shared/lib/apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChangeSetItem {
  id: number;
  om_daily_item_id: number;
  item_title: string;
  item_status: string;
  item_priority: string;
  item_category: string | null;
  github_issue_number: number | null;
  is_required: boolean;
  sort_order: number;
  notes: string | null;
}

interface ChangeSetEvent {
  id: number;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  user_email: string | null;
  message: string | null;
  metadata: any;
  created_at: string;
}

interface ChangeSetDetail {
  id: number;
  code: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  change_type: string;
  git_branch: string | null;
  deployment_strategy: string;
  has_db_changes: boolean;
  migration_files: string[] | null;
  staging_build_run_id: string | null;
  prod_build_run_id: string | null;
  staging_commit_sha: string | null;
  approved_commit_sha: string | null;
  prod_commit_sha: string | null;
  created_by_email: string;
  reviewed_by_email: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  target_start_date: string | null;
  target_end_date: string | null;
  pre_promote_snapshot_id: string | null;
  staged_at: string | null;
  approved_at: string | null;
  promoted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  items: ChangeSetItem[];
  events: ChangeSetEvent[];
  item_count: number;
  required_item_count: number;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:              { label: 'Planned',            color: '#7e57c2' },
  active:             { label: 'Active',            color: '#1976d2' },
  ready_for_staging:  { label: 'Ready for Staging', color: '#ed6c02' },
  staged:             { label: 'Staged',            color: '#9c27b0' },
  in_review:          { label: 'In Review',         color: '#0288d1' },
  approved:           { label: 'Approved',          color: '#2e7d32' },
  promoted:           { label: 'Promoted',          color: '#388e3c' },
  rejected:           { label: 'Rejected',          color: '#d32f2f' },
  rolled_back:        { label: 'Rolled Back',       color: '#f44336' },
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft:              ['active'],
  active:             ['ready_for_staging'],
  ready_for_staging:  ['staged'],
  staged:             ['in_review'],
  in_review:          ['approved', 'rejected'],
  approved:           ['promoted'],
  promoted:           ['rolled_back'],
  rejected:           ['active'],
};

const TRANSITION_LABELS: Record<string, { label: string; color: 'primary' | 'success' | 'error' | 'warning' | 'info'; icon: React.ReactNode }> = {
  active:             { label: 'Activate',          color: 'primary', icon: <PlayIcon /> },
  ready_for_staging:  { label: 'Mark Ready',        color: 'warning', icon: <ArrowIcon /> },
  staged:             { label: 'Mark Staged',       color: 'info',    icon: <ArrowIcon /> },
  in_review:          { label: 'Start Review',      color: 'info',    icon: <ArrowIcon /> },
  approved:           { label: 'Approve',           color: 'success', icon: <ApproveIcon /> },
  rejected:           { label: 'Reject',            color: 'error',   icon: <RejectIcon /> },
  promoted:           { label: 'Mark Promoted',     color: 'success', icon: <ApproveIcon /> },
  rolled_back:        { label: 'Roll Back',         color: 'error',   icon: <WarningIcon /> },
};

const EVENT_ICONS: Record<string, string> = {
  created: '🆕',
  item_added: '➕',
  item_removed: '➖',
  status_changed: '🔄',
  staged: '📦',
  review_started: '👁️',
  approved: '✅',
  rejected: '❌',
  promoted: '🚀',
  rolled_back: '⏪',
  fast_forwarded: '⏩',
  note_added: '📝',
};

// ── Component ─────────────────────────────────────────────────────────────────

const ChangeSetDetailPage: React.FC = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const [cs, setCs] = useState<ChangeSetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Snapshot restore
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ restored: number; preRestoreSnapshotId: string | null } | null>(null);

  // Dialogs
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemId, setAddItemId] = useState('');
  const [adding, setAdding] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [toast, setToast] = useState('');

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => setToast('Command copied to clipboard'));
  };

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/om-daily', title: 'OM Daily' },
    { to: '/admin/control-panel/om-daily/change-sets', title: 'Change Sets' },
    { title: cs?.code || `#${id}` },
  ];

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/admin/change-sets/${id}`);
      setCs(res.data.change_set);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load change set');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTransition = async () => {
    if (!transitionTarget || !cs) return;
    setTransitioning(true);
    try {
      const body: Record<string, any> = { status: transitionTarget };
      if (transitionTarget === 'rejected') body.rejection_reason = transitionNotes;
      else if (transitionTarget === 'approved') body.review_notes = transitionNotes;
      await apiClient.post(`/admin/change-sets/${cs.id}/transition`, body);
      setTransitionTarget(null);
      setTransitionNotes('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Transition failed');
    } finally {
      setTransitioning(false);
    }
  };

  const handleAddItem = async () => {
    if (!addItemId || !cs) return;
    setAdding(true);
    try {
      await apiClient.post(`/admin/change-sets/${cs.id}/items`, {
        om_daily_item_id: parseInt(addItemId),
      });
      setAddItemOpen(false);
      setAddItemId('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveItem = async (omDailyItemId: number) => {
    if (!cs || !confirm('Remove this item from the change set?')) return;
    try {
      await apiClient.delete(`/admin/change-sets/${cs.id}/items/${omDailyItemId}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove item');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !cs) return;
    try {
      await apiClient.post(`/admin/change-sets/${cs.id}/notes`, { message: noteText.trim() });
      setNoteOpen(false);
      setNoteText('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add note');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const shortSha = (sha: string | null) => sha ? sha.substring(0, 8) : '—';

  if (loading) {
    return (
      <PageContainer title="Change Set" description="Loading...">
        <Box sx={{ p: 3 }}>
          <Skeleton height={60} />
          <Skeleton height={200} sx={{ mt: 2 }} />
          <Skeleton height={300} sx={{ mt: 2 }} />
        </Box>
      </PageContainer>
    );
  }

  if (error || !cs) {
    return (
      <PageContainer title="Change Set" description="Error">
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error || 'Change set not found'}</Alert>
        </Box>
      </PageContainer>
    );
  }

  const sc = STATUS_CONFIG[cs.status] || STATUS_CONFIG.draft;
  const allowedTransitions = ALLOWED_TRANSITIONS[cs.status] || [];
  const canEditItems = ['draft', 'active'].includes(cs.status);

  return (
    <PageContainer title={`${cs.code} — ${cs.title}`} description="Change Set Detail">
      <Breadcrumb title={cs.code} items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <PackageIcon sx={{ color: sc.color }} />
                <Typography variant="h5" fontWeight={700}>{cs.title}</Typography>
                <Chip label={sc.label} size="small" sx={{ bgcolor: alpha(sc.color, 0.12), color: sc.color, fontWeight: 600 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{cs.code}</Typography>
                <Typography variant="body2" color="text.secondary">{cs.change_type}</Typography>
                <Typography variant="body2" color="text.secondary">{cs.priority} priority</Typography>
                <Typography variant="body2" color="text.secondary">{cs.deployment_strategy === 'hotfix_direct' ? 'Hotfix Direct' : 'Stage → Promote'}</Typography>
                <Typography variant="body2" color="text.secondary">by {cs.created_by_email}</Typography>
                {(cs.target_start_date || cs.target_end_date) && (
                  <Typography variant="body2" sx={{ color: '#7e57c2', fontWeight: 500 }}>
                    {(() => {
                      const fmt = (d: string | null) => {
                        if (!d) return null;
                        const dt = d.includes('T') ? new Date(d) : new Date(d + 'T00:00:00');
                        return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      };
                      const s = fmt(cs.target_start_date);
                      const e = fmt(cs.target_end_date);
                      return s && e ? `${s} – ${e}` : s || e;
                    })()}
                  </Typography>
                )}
              </Box>
              {cs.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{cs.description}</Typography>
              )}
            </Box>

            {/* Action buttons — staged/promoted are handled by om-deploy.sh, not the UI */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {allowedTransitions
                .filter((t) => t !== 'staged' && t !== 'promoted')
                .map((target) => {
                const tl = TRANSITION_LABELS[target];
                if (!tl) return null;
                return (
                  <Button
                    key={target}
                    variant="contained"
                    color={tl.color}
                    size="small"
                    startIcon={tl.icon}
                    onClick={() => { setTransitionTarget(target); setTransitionNotes(''); }}
                  >
                    {tl.label}
                  </Button>
                );
              })}
              <Button variant="outlined" size="small" startIcon={<NoteIcon />} onClick={() => setNoteOpen(true)}>
                Add Note
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* ── Lifecycle Progress ────────────────────────────────────── */}
        {(() => {
          const stages = ['draft', 'active', 'ready_for_staging', 'staged', 'in_review', 'approved', 'promoted'];
          const stageLabels: Record<string, string> = { draft: 'Draft', active: 'Active', ready_for_staging: 'Ready', staged: 'Staged', in_review: 'Review', approved: 'Approved', promoted: 'Promoted' };
          const currentIdx = stages.indexOf(cs.status);
          const isTerminal = ['rejected', 'rolled_back'].includes(cs.status);
          if (isTerminal) return null;
          return (
            <Box sx={{ display: 'flex', gap: 0, alignItems: 'center' }}>
              {stages.map((s, i) => {
                const isPast = i < currentIdx;
                const isCurrent = i === currentIdx;
                const stCfg = STATUS_CONFIG[s] || STATUS_CONFIG.draft;
                return (
                  <React.Fragment key={s}>
                    <Box sx={{
                      flex: 1, textAlign: 'center', py: 1, px: 0.5,
                      bgcolor: isCurrent ? alpha(stCfg.color, 0.15) : isPast ? alpha(stCfg.color, 0.06) : 'transparent',
                      borderBottom: isCurrent ? `3px solid ${stCfg.color}` : isPast ? `3px solid ${alpha(stCfg.color, 0.3)}` : `3px solid ${theme.palette.divider}`,
                    }}>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: isCurrent ? 700 : 400, color: isCurrent ? stCfg.color : isPast ? 'text.secondary' : 'text.disabled' }}>
                        {stageLabels[s]}
                      </Typography>
                    </Box>
                  </React.Fragment>
                );
              })}
            </Box>
          );
        })()}

        {/* ── Release Readiness Summary ──────────────────────────────── */}
        {!['promoted', 'rolled_back'].includes(cs.status) && (() => {
          const hasItems = cs.items.length > 0;
          const requiredItems = cs.items.filter(i => i.is_required);
          const readyItems = requiredItems.filter(i => ['done', 'review'].includes(i.item_status));
          const allReady = requiredItems.length > 0 && readyItems.length === requiredItems.length;
          const hasBranch = !!cs.git_branch;
          const hasDbWarning = cs.has_db_changes && (!cs.migration_files || (typeof cs.migration_files === 'string' ? JSON.parse(cs.migration_files) : cs.migration_files).length === 0);
          const isStaged = !!cs.staging_commit_sha;
          const isApproved = cs.status === 'approved';

          return (
            <Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Release Readiness</Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {hasItems ? <ApproveIcon sx={{ fontSize: 16, color: 'success.main' }} /> : <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                  <Typography variant="caption">{cs.items.length} item{cs.items.length !== 1 ? 's' : ''} linked</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {allReady ? <ApproveIcon sx={{ fontSize: 16, color: 'success.main' }} /> : <WarningIcon sx={{ fontSize: 16, color: requiredItems.length === 0 ? 'text.disabled' : 'warning.main' }} />}
                  <Typography variant="caption">{readyItems.length}/{requiredItems.length} required items ready</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {hasBranch ? <ApproveIcon sx={{ fontSize: 16, color: 'success.main' }} /> : <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                  <Typography variant="caption">{hasBranch ? 'Branch set' : 'No branch'}</Typography>
                </Box>
                {cs.has_db_changes && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {hasDbWarning ? <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} /> : <ApproveIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                    <Typography variant="caption">{hasDbWarning ? 'Missing migration files' : 'Migrations listed'}</Typography>
                  </Box>
                )}
                {isStaged && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ApproveIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption">Staged ({cs.staging_commit_sha?.substring(0, 8)})</Typography>
                  </Box>
                )}
                {isApproved && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ApproveIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption">Approved — ready to promote</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          );
        })()}

        {/* ── CLI action hints for deploy-driven transitions ────────────── */}
        {cs.status === 'ready_for_staging' && (
          <Alert severity="info" variant="outlined" action={
            <Button size="small" startIcon={<CopyIcon />} onClick={() => copyCmd(`/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh stage ${cs.code}`)}>
              Copy
            </Button>
          }>
            <strong>Next step:</strong> Run <code>/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh stage {cs.code}</code> from the server to build and stage this change set for review.
            {cs.git_branch && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Ensure you are on branch <code>{cs.git_branch}</code></Typography>
              </Box>
            )}
          </Alert>
        )}
        {cs.status === 'approved' && cs.deployment_strategy !== 'hotfix_direct' && (
          <Alert severity="success" variant="outlined" action={
            <Button size="small" startIcon={<CopyIcon />} onClick={() => copyCmd(`/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh promote ${cs.code}`)}>
              Copy
            </Button>
          }>
            <strong>Ready for production.</strong> Run <code>/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh promote {cs.code}</code> to deploy.
          </Alert>
        )}
        {cs.deployment_strategy === 'hotfix_direct' && ['draft', 'active', 'ready_for_staging', 'approved'].includes(cs.status) && (
          <Alert severity="warning" variant="outlined" action={
            <Button size="small" startIcon={<CopyIcon />} onClick={() => copyCmd(`/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh hotfix ${cs.code}`)}>
              Copy
            </Button>
          }>
            <strong>Hotfix Direct.</strong> Run <code>/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh hotfix {cs.code}</code> to fast-track build and deploy to production.
          </Alert>
        )}

        {/* ── DB Changes Warning ────────────────────────────────────────── */}
        {cs.has_db_changes && (
          <Alert severity="warning" icon={<DbIcon />}>
            <strong>Database changes included.</strong>
            {cs.migration_files && cs.migration_files.length > 0 && (
              <Box sx={{ mt: 1 }}>
                Migration files:
                <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                  {(typeof cs.migration_files === 'string' ? JSON.parse(cs.migration_files) : cs.migration_files).map((f: string, i: number) => (
                    <li key={i}><code>{f}</code></li>
                  ))}
                </ul>
              </Box>
            )}
          </Alert>
        )}

        {/* ── Rejection notice ──────────────────────────────────────────── */}
        {cs.status === 'rejected' && cs.rejection_reason && (
          <Alert severity="error">
            <strong>Rejected</strong> by {cs.reviewed_by_email || 'admin'} on {formatDate(cs.rejected_at)}
            <Box sx={{ mt: 1 }}>{cs.rejection_reason}</Box>
          </Alert>
        )}

        {/* ── Git & Build Info ──────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            <CommitIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
            Git & Build Linkage
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Branch</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{cs.git_branch || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Staging Commit</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{shortSha(cs.staging_commit_sha)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Staged At</Typography>
              <Typography variant="body2">{formatDate(cs.staged_at)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Approved Commit</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{shortSha(cs.approved_commit_sha)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Approved At</Typography>
              <Typography variant="body2">{formatDate(cs.approved_at)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Reviewed By</Typography>
              <Typography variant="body2">{cs.reviewed_by_email || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Prod Commit</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{shortSha(cs.prod_commit_sha)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Promoted At</Typography>
              <Typography variant="body2">{formatDate(cs.promoted_at)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Staging Build</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{cs.staging_build_run_id || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Prod Build</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{cs.prod_build_run_id || '—'}</Typography>
            </Box>
          </Box>
          {cs.review_notes && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">Review Notes</Typography>
              <Typography variant="body2">{cs.review_notes}</Typography>
            </Box>
          )}
        </Paper>

        {/* ── Pre-Promote Snapshot (Code Safety) ──────────────────────── */}
        {cs.pre_promote_snapshot_id && ['promoted', 'rolled_back'].includes(cs.status) && (
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.warning.main, 0.04) }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              <WarningIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20, color: theme.palette.warning.main }} />
              Pre-Promote Snapshot
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              A snapshot was automatically created before this change set was promoted.
              You can restore this snapshot to revert to the exact state before production changes were applied.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`Snapshot: ${cs.pre_promote_snapshot_id}`} sx={{ fontFamily: 'monospace' }} />
              <Button
                size="small"
                variant="outlined"
                onClick={() => window.open(`/admin/control-panel/system-server/code-safety`, '_blank')}
              >
                View in Code Safety
              </Button>
              <Button
                size="small"
                variant="contained"
                color="warning"
                disabled={restoring}
                onClick={async () => {
                  if (!confirm(`Restore snapshot ${cs.pre_promote_snapshot_id}? This will revert files to their pre-promote state. A safety snapshot of the current state will be created first.`)) return;
                  setRestoring(true);
                  try {
                    const res = await apiClient.post(`/snapshots/${cs.pre_promote_snapshot_id}/restore`);
                    setRestoreResult({ restored: res.data.restored, preRestoreSnapshotId: res.data.preRestoreSnapshotId });
                    setToast(`Restored ${res.data.restored} files from snapshot`);
                  } catch (err: any) {
                    alert(err.response?.data?.error || 'Restore failed');
                  } finally {
                    setRestoring(false);
                  }
                }}
              >
                {restoring ? 'Restoring...' : 'Restore from Snapshot'}
              </Button>
            </Box>
            {restoreResult && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Restored {restoreResult.restored} file(s).
                {restoreResult.preRestoreSnapshotId && (
                  <> A safety snapshot of the pre-restore state was saved as <code>{restoreResult.preRestoreSnapshotId}</code>.</>
                )}
              </Alert>
            )}
          </Paper>
        )}

        {/* ── Linked Items ──────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Linked OM Daily Items ({cs.items.length})
            </Typography>
            {canEditItems && (
              <Button size="small" startIcon={<AddIcon />} onClick={() => setAddItemOpen(true)}>
                Add Item
              </Button>
            )}
          </Box>

          {cs.items.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No items linked yet
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Required</TableCell>
                  <TableCell>GitHub</TableCell>
                  {canEditItems && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {cs.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>#{item.om_daily_item_id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.item_title}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={item.item_status} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{item.item_priority}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{item.item_category || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      {item.is_required ? (
                        <Chip label="Required" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      ) : (
                        <Typography variant="body2" color="text.disabled">Optional</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.github_issue_number ? (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>#{item.github_issue_number}</Typography>
                      ) : '—'}
                    </TableCell>
                    {canEditItems && (
                      <TableCell>
                        <Tooltip title="Remove from change set">
                          <span>
                            <Button
                              size="small"
                              color="error"
                              onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.om_daily_item_id); }}
                              sx={{ minWidth: 'auto', p: 0.5 }}
                            >
                              <RemoveIcon fontSize="small" />
                            </Button>
                          </span>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* ── Event Timeline ────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
            Event Timeline
          </Typography>
          {cs.events.length === 0 ? (
            <Typography color="text.secondary">No events recorded</Typography>
          ) : (
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {cs.events.map((evt, idx) => (
                <Box key={evt.id} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: idx < cs.events.length - 1 ? `1px solid ${theme.palette.divider}` : 'none' }}>
                  <Typography sx={{ fontSize: '1.1rem', width: 24, textAlign: 'center' }}>
                    {EVENT_ICONS[evt.event_type] || '📋'}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {evt.event_type.replace(/_/g, ' ')}
                      </Typography>
                      {evt.from_status && evt.to_status && (
                        <Typography variant="caption" color="text.secondary">
                          {evt.from_status} → {evt.to_status}
                        </Typography>
                      )}
                    </Box>
                    {evt.message && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{evt.message}</Typography>
                    )}
                    <Typography variant="caption" color="text.disabled">
                      {formatDate(evt.created_at)} {evt.user_email ? `by ${evt.user_email}` : ''}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>

      {/* ── Transition Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!transitionTarget} onClose={() => setTransitionTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {transitionTarget && TRANSITION_LABELS[transitionTarget]
            ? `${TRANSITION_LABELS[transitionTarget].label} — ${cs.code}`
            : 'Transition'}
        </DialogTitle>
        <DialogContent>
          {transitionTarget === 'rejected' && (
            <TextField
              label="Rejection Reason (required)"
              value={transitionNotes}
              onChange={(e) => setTransitionNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              required
              sx={{ mt: 1 }}
            />
          )}
          {transitionTarget === 'approved' && (
            <TextField
              label={cs.has_db_changes ? 'Review Notes (required — DB changes)' : 'Review Notes (optional)'}
              value={transitionNotes}
              onChange={(e) => setTransitionNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              required={cs.has_db_changes}
              sx={{ mt: 1 }}
            />
          )}
          {transitionTarget === 'rolled_back' && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              This will mark the change set as rolled back.
              {cs.pre_promote_snapshot_id
                ? <> A pre-promote snapshot (<code>{cs.pre_promote_snapshot_id}</code>) is available — you can restore it after marking as rolled back.</>
                : <> You must manually restore from a snapshot or deploy a revert.</>
              }
            </Alert>
          )}
          {transitionTarget === 'promoted' && (
            <Alert severity="info" sx={{ mt: 1 }}>
              A pre-promote snapshot will be automatically created before applying production changes. You can restore from it if problems occur.
            </Alert>
          )}
          {!['rejected', 'approved', 'rolled_back', 'promoted'].includes(transitionTarget || '') && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This will transition <strong>{cs.code}</strong> from <em>{cs.status}</em> to <em>{transitionTarget}</em>.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransitionTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={transitionTarget ? TRANSITION_LABELS[transitionTarget]?.color || 'primary' : 'primary'}
            onClick={handleTransition}
            disabled={transitioning || (transitionTarget === 'rejected' && !transitionNotes.trim()) || (transitionTarget === 'approved' && cs.has_db_changes && !transitionNotes.trim())}
          >
            {transitioning ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Item Dialog ──────────────────────────────────────────────── */}
      <Dialog open={addItemOpen} onClose={() => setAddItemOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add OM Daily Item</DialogTitle>
        <DialogContent>
          <TextField
            label="OM Daily Item ID"
            value={addItemId}
            onChange={(e) => setAddItemId(e.target.value)}
            fullWidth
            type="number"
            sx={{ mt: 1 }}
            placeholder="Enter item ID number"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddItem} disabled={adding || !addItemId}>
            {adding ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Note Dialog ──────────────────────────────────────────────── */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent>
          <TextField
            label="Note"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddNote} disabled={!noteText.trim()}>
            Add Note
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast('')} message={toast} />
    </PageContainer>
  );
};

export default ChangeSetDetailPage;
