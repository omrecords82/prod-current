/**
 * CandidatesTab — Full candidates panel with wire-edit-mode preview/apply.
 * Includes CandidatesPanel, CandidateSummaryBar, CandidateRow,
 * CandidateDetail, and WireEditModePanel.
 * Extracted from PageEditAuditPage.tsx
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Chip, Stack, Paper, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, IconButton, Tooltip, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  IconRefresh, IconChevronDown, IconChevronUp,
  IconCircleCheck, IconEye, IconPlayerPlay, IconCode,
} from '@tabler/icons-react';
import apiClient from '@/api/utils/axiosInstance';
import type {
  Candidate, CandidateResponse, CandidateSummary,
  WirePreviewResult, WireApplyResult,
} from './pageEditAuditTypes';
import { CANDIDATE_CLASS_CONFIG } from './pageEditAuditTypes';

// ── Detail Field (shared helper) ──────────────────────────────────────

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontFamily={mono ? 'monospace' : undefined} fontSize={mono ? 12 : undefined}>{value}</Typography>
    </Box>
  );
}

// ── Wire Edit Mode Panel ───────────────────────────────────────────────

function WireEditModePanel({ file }: { file: string }) {
  const [preview, setPreview] = useState<WirePreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<WireApplyResult | null>(null);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    setPreview(null);
    setApplyResult(null);
    try {
      const res = await apiClient.post('/admin/frontend-page-audit/wire-edit-mode/preview', { file }) as unknown as WirePreviewResult;
      setPreview(res);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleApply = async () => {
    setApplying(true);
    setError('');
    setConfirmOpen(false);
    try {
      const res = await apiClient.post('/admin/frontend-page-audit/wire-edit-mode/apply', { file }) as unknown as WireApplyResult;
      setApplyResult(res);
      setPreview(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Typography variant="subtitle2">Wire Edit Mode</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={14} /> : <IconEye size={14} />}
          onClick={fetchPreview}
          disabled={loading || applying}
          sx={{ textTransform: 'none', fontSize: 12 }}
        >
          {loading ? 'Analyzing...' : 'Preview Transform'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1, py: 0 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Apply result */}
      {applyResult && (
        <Alert severity={applyResult.applied ? 'success' : 'info'} sx={{ mb: 1, py: 0.5 }}>
          <Typography variant="body2">
            {applyResult.applied
              ? `Applied ${applyResult.totalChanges} transforms to ${file}. Rebuild the frontend to see changes.`
              : applyResult.message || 'No changes needed.'}
          </Typography>
          {applyResult.uncovered && applyResult.uncovered.length > 0 && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {applyResult.uncovered.length} t() call(s) still need manual attention.
            </Typography>
          )}
        </Alert>
      )}

      {/* Preview results */}
      {preview && preview.success && (
        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
          {preview.totalChanges === 0 ? (
            <Alert severity="success" sx={{ py: 0 }}>
              <Typography variant="body2">No changes needed — page is already fully wired or has no wrappable t() calls.</Typography>
            </Alert>
          ) : (
            <>
              {/* Phase summary */}
              <Stack direction="row" spacing={2} mb={1.5} flexWrap="wrap" useFlexGap>
                <Chip label={`${preview.totalChanges} total transforms`} color="primary" size="small" />
                {preview.phases && (
                  <>
                    <Chip label={`${preview.phases.directElements} direct elements`} size="small" variant="outlined" />
                    <Chip label={`${preview.phases.arrayPatterns} array patterns`} size="small" variant="outlined" />
                    {preview.phases.standaloneCalls > 0 && (
                      <Chip label={`${preview.phases.standaloneCalls} standalone`} size="small" variant="outlined" />
                    )}
                    {preview.phases.importAdded && <Chip label="+ import" size="small" color="info" variant="outlined" />}
                  </>
                )}
                {preview.propValues != null && preview.propValues > 0 && (
                  <Chip label={`${preview.propValues} prop values (skipped)`} size="small" variant="outlined" color="default" />
                )}
              </Stack>

              {/* Coverage status */}
              {preview.allCovered ? (
                <Alert severity="success" sx={{ mb: 1.5, py: 0 }}>
                  <Typography variant="body2">All renderable t() calls will be covered by EditableText or shared sections.</Typography>
                </Alert>
              ) : preview.uncovered && preview.uncovered.length > 0 ? (
                <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
                  <Typography variant="body2" gutterBottom>
                    {preview.uncovered.length} t() call(s) cannot be auto-wrapped (may need manual attention):
                  </Typography>
                  {preview.uncovered.map((u, i) => (
                    <Typography key={i} variant="body2" fontFamily="monospace" fontSize={11} sx={{ ml: 1 }}>
                      Line {u.line}: {u.key}
                    </Typography>
                  ))}
                </Alert>
              ) : null}

              {/* Diff */}
              {preview.diff && preview.diff.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" mb={0.5}>
                    <IconCode size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Diff Preview
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      maxHeight: 400,
                      overflow: 'auto',
                      bgcolor: '#1e1e1e',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      lineHeight: 1.5,
                    }}
                  >
                    {preview.diff.map((hunk, hi) => (
                      <Box key={hi} sx={{ mb: 1 }}>
                        {hunk.changes.map((change, ci) => (
                          <Box
                            key={ci}
                            sx={{
                              px: 1,
                              color: change.type === 'added' ? '#4ec9b0' : change.type === 'removed' ? '#f48771' : '#808080',
                              bgcolor: change.type === 'added' ? 'rgba(78,201,176,0.08)' : change.type === 'removed' ? 'rgba(244,135,113,0.08)' : 'transparent',
                              whiteSpace: 'pre',
                              overflowX: 'auto',
                            }}
                          >
                            <Typography component="span" sx={{ color: '#606060', mr: 1, display: 'inline-block', minWidth: 40, textAlign: 'right', userSelect: 'none', fontFamily: 'inherit', fontSize: 'inherit' }}>
                              {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' '}{change.line}
                            </Typography>
                            {change.text}
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Paper>
                </Box>
              )}

              {/* Apply button */}
              <Stack direction="row" spacing={1} mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={applying ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                  onClick={() => setConfirmOpen(true)}
                  disabled={applying}
                  sx={{ textTransform: 'none' }}
                >
                  Apply {preview.totalChanges} Transform{preview.totalChanges !== 1 ? 's' : ''}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Writes changes to the source file. Requires frontend rebuild.
                </Typography>
              </Stack>

              {/* Confirm dialog */}
              <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirm Edit Mode Wiring</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" gutterBottom>
                    This will apply <strong>{preview.totalChanges}</strong> EditableText transform{preview.totalChanges !== 1 ? 's' : ''} to:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" fontSize={12} sx={{ ml: 1, mb: 1 }}>
                    {preview.relativeFile}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The file will be modified in place. You will need to rebuild the frontend for changes to take effect.
                  </Typography>
                  {!preview.allCovered && preview.uncovered && preview.uncovered.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                      <Typography variant="body2">
                        {preview.uncovered.length} t() call(s) will still need manual wiring after this transform.
                      </Typography>
                    </Alert>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleApply}
                    disabled={applying}
                    startIcon={applying ? <CircularProgress size={14} /> : <IconPlayerPlay size={14} />}
                  >
                    {applying ? 'Applying...' : 'Apply'}
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}

// ── Candidate Detail Panel ─────────────────────────────────────────────

function CandidateDetail({ candidate: c }: { candidate: Candidate }) {
  const canWire = !!c.file;

  return (
    <Box sx={{ px: 3, py: 2, bgcolor: 'action.hover' }}>
      <Stack spacing={2}>
        {/* Meta */}
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          {c.file && <DetailField label="File" value={c.file} mono />}
          <DetailField label="Page Key" value={c.pageKey || '—'} mono />
          {c.registryId && <DetailField label="Registry ID" value={c.registryId} mono />}
        </Stack>

        {/* Signals */}
        {c.signals && Object.keys(c.signals).length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Analysis Signals</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {c.signals.totalTranslatable != null && (
                <Chip label={`${c.signals.totalTranslatable} translatable strings`} size="small" variant="outlined" />
              )}
              {c.signals.i18nCallCount != null && (
                <Chip label={`${c.signals.i18nCallCount} i18n calls`} size="small" variant="outlined" />
              )}
              {c.signals.usesI18n && <Chip label="Uses i18n" size="small" color="success" variant="outlined" />}
              {c.signals.isDataDriven && <Chip label="Data-driven" size="small" color="warning" variant="outlined" />}
              {c.signals.unwiredSharedSections != null && c.signals.unwiredSharedSections > 0 && (
                <Chip label={`${c.signals.unwiredSharedSections} unwired sections`} size="small" color="warning" variant="outlined" />
              )}
              {c.signals.editableTextCount != null && (
                <Chip label={`${c.signals.editableTextCount} EditableText`} size="small" color="success" variant="outlined" />
              )}
              {c.signals.wiredSharedSections != null && (
                <Chip label={`${c.signals.wiredSharedSections} wired sections`} size="small" color="success" variant="outlined" />
              )}
            </Stack>
          </Box>
        )}

        {/* Rationale */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>Rationale</Typography>
          <Typography variant="body2" color="text.secondary">{c.rationale}</Typography>
        </Box>

        {/* Recommended action */}
        {c.recommended_action && (
          <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
            <Typography variant="body2">{c.recommended_action}</Typography>
          </Alert>
        )}

        {/* Wire Edit Mode panel */}
        {canWire && <WireEditModePanel file={c.file!} />}
      </Stack>
    </Box>
  );
}

// ── Candidate Row ──────────────────────────────────────────────────────

function CandidateRow({ candidate: c, expanded, onToggle }: {
  candidate: Candidate;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = CANDIDATE_CLASS_CONFIG[c.classification] || { label: c.classification, color: 'default' as const };
  const canWire = !!c.file;

  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{ cursor: 'pointer', '& > *': { borderBottom: expanded ? 'none' : undefined } }}
      >
        <TableCell>
          <IconButton size="small" sx={{ p: 0.25 }}>
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace" fontSize={12}>{c.route}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontSize={13}>{c.component || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Chip label={cfg.label} color={cfg.color as any} size="small" variant="filled" />
        </TableCell>
        <TableCell align="center">
          {c.score > 0 ? (
            <Chip
              label={c.score}
              size="small"
              variant="outlined"
              color={c.score >= 4 ? 'primary' : c.score >= 2 ? 'info' : 'default'}
              sx={{ fontWeight: 700, minWidth: 32 }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">—</Typography>
          )}
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">
            {c.signals.totalTranslatable ?? c.signals.editableTextCount ?? '—'}
          </Typography>
        </TableCell>
        <TableCell align="center">
          {c.inPublicLayout ? (
            <IconCircleCheck size={16} color="var(--mui-palette-success-main, #4caf50)" />
          ) : (
            <Typography variant="body2" color="text.secondary">—</Typography>
          )}
        </TableCell>
        <TableCell>
          {canWire && c.file && (
            <Tooltip title="Preview wire-edit-mode transform">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                <IconEye size={16} />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, px: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <CandidateDetail candidate={c} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Candidate Summary Bar ──────────────────────────────────────────────

function CandidateSummaryBar({ summary, classFilter, onFilterChange }: {
  summary: CandidateSummary;
  classFilter: string | null;
  onFilterChange: (v: string | null) => void;
}) {
  const items: { key: string; count: number; label: string; color: 'primary' | 'success' | 'warning' | 'default' | 'info' }[] = [
    { key: 'conversion-candidate',    count: summary.conversion_candidates,    label: 'Ready',          color: 'primary'  },
    { key: 'low-priority-candidate',  count: summary.low_priority_candidates,  label: 'Low Priority',   color: 'info'     },
    { key: 'already-compliant',       count: summary.already_compliant,        label: 'Compliant',      color: 'success'  },
    { key: 'needs-investigation',     count: summary.needs_investigation,      label: 'Investigate',    color: 'warning'  },
  ];

  return (
    <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
      {items.map(item => (
        <Chip
          key={item.key}
          label={`${item.label}: ${item.count}`}
          color={item.color}
          variant={classFilter === item.key ? 'filled' : 'outlined'}
          size="small"
          onClick={() => onFilterChange(classFilter === item.key ? null : item.key)}
          sx={{ cursor: 'pointer', fontWeight: classFilter === item.key ? 700 : 400 }}
        />
      ))}
      <Chip
        label={`Excluded: ${summary.excluded_non_content}`}
        color="default"
        variant={classFilter === 'excluded' ? 'filled' : 'outlined'}
        size="small"
        onClick={() => onFilterChange(classFilter === 'excluded' ? null : 'excluded')}
        sx={{ cursor: 'pointer', fontWeight: classFilter === 'excluded' ? 700 : 400 }}
      />
    </Stack>
  );
}

// ── Main CandidatesPanel ───────────────────────────────────────────────

function CandidatesPanel() {
  const [data, setData] = useState<CandidateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<CandidateResponse>('/admin/frontend-page-audit/candidates');
      setData(res as unknown as CandidateResponse);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let candidates = data.candidates;
    if (classFilter) {
      candidates = candidates.filter(c => c.classification === classFilter);
    }
    // Sort by score descending
    return [...candidates].sort((a, b) => b.score - a.score);
  }, [data, classFilter]);

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading && !data ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : data ? (
        <>
          {/* Summary chips */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Last run: {new Date(data.timestamp).toLocaleString()} — {data.summary.total_public_routes} public routes evaluated
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconRefresh size={16} />}
              onClick={fetchCandidates}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>

          <CandidateSummaryBar summary={data.summary} classFilter={classFilter} onFilterChange={setClassFilter} />

          {/* Candidate table */}
          {filtered.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No candidates match the current filter.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={32} />
                    <TableCell><Typography variant="subtitle2">Route</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2">Component</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2">Classification</Typography></TableCell>
                    <TableCell align="center"><Typography variant="subtitle2">Score</Typography></TableCell>
                    <TableCell align="right"><Typography variant="subtitle2">Translatable</Typography></TableCell>
                    <TableCell align="center"><Tooltip title="In PublicLayout (EditModeProvider available)"><Typography variant="subtitle2">PL</Typography></Tooltip></TableCell>
                    <TableCell><Typography variant="subtitle2">Action</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(c => (
                    <CandidateRow
                      key={c.route}
                      candidate={c}
                      expanded={expandedRoute === c.route}
                      onToggle={() => setExpandedRoute(prev => prev === c.route ? null : c.route)}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      ) : null}
    </>
  );
}

export default CandidatesPanel;
