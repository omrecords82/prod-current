/**
 * AuditTab — Audit table with summary bar, page rows, detail panels,
 * orphaned override cleanup, shared sections, and rule results.
 * Extracted from PageEditAuditPage.tsx
 */
import { useState } from 'react';
import {
  Box, Typography, Button, Chip, Stack, Paper, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, IconButton, Tooltip, Collapse,
  Checkbox, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  IconChevronDown, IconChevronUp,
  IconAlertTriangle, IconCircleCheck, IconCircleX, IconTrash,
} from '@tabler/icons-react';
import apiClient from '@/api/utils/axiosInstance';
import type { PageAudit, AuditSummary } from './pageEditAuditTypes';
import { CLASSIFICATION_CONFIG } from './pageEditAuditTypes';

// ── Detail Field (shared helper) ──────────────────────────────────────

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontFamily={mono ? 'monospace' : undefined} fontSize={mono ? 12 : undefined}>{value}</Typography>
    </Box>
  );
}

// ── Rule Status Chip ───────────────────────────────────────────────────

function RuleStatusChip({ status }: { status: string }) {
  const map: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
    pass: { color: 'success', label: 'pass' },
    fail: { color: 'error',   label: 'fail' },
    warn: { color: 'warning', label: 'warn' },
    info: { color: 'info',    label: 'info' },
    skip: { color: 'default', label: 'skip' },
  };
  const cfg = map[status] || map['info'];
  return <Chip label={cfg.label} color={cfg.color} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />;
}

// ── Page Detail Panel ───────────────────────────────────────────────────

function PageDetail({ page, onRefresh }: { page: PageAudit; onRefresh: () => void }) {
  const rt = page.runtime;
  const orphanedKeys: string[] = page.rules.PAGE_CONTENT_KEY_PERSISTENCE?.orphaned_keys || [];

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedKeys.size === orphanedKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(orphanedKeys));
    }
  };

  const handleDelete = async () => {
    if (!page.pageKey || selectedKeys.size === 0) return;
    setDeleting(true);
    setDeleteResult(null);
    try {
      const res = await apiClient.post(`/admin/frontend-page-audit/orphaned/${page.pageKey}/delete`, {
        keys: Array.from(selectedKeys),
      }) as any;
      const data = res as { deleted_count: number; deleted_keys: string[]; skipped_keys?: string[] };
      setDeleteResult({
        type: 'success',
        message: `Deleted ${data.deleted_count} orphaned override(s)${data.skipped_keys?.length ? `. ${data.skipped_keys.length} skipped (no longer orphaned).` : '.'}`,
      });
      setSelectedKeys(new Set());
      setConfirmOpen(false);
      onRefresh();
    } catch (err: any) {
      setDeleteResult({
        type: 'error',
        message: err?.response?.data?.error || err?.message || 'Deletion failed',
      });
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ px: 3, py: 2, bgcolor: 'action.hover' }}>
      <Stack spacing={2}>
        {/* Meta */}
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <DetailField label="File" value={page.file} mono />
          <DetailField label="Page Key" value={page.pageKey || '—'} mono />
          <DetailField label="Category" value={page.category} />
        </Stack>

        {/* Runtime summary */}
        {rt && page.classification === 'editable-compliant' && (
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            <DetailField label="Overrides" value={`${rt.override_count} saved`} />
            <DetailField label="Key Persistence" value={`${rt.persisted_detected_key_count}/${rt.detected_key_count} detected keys have overrides`} />
            <DetailField label="Translation Tracking" value={`${rt.translation_status_total} entries, ${rt.translation_needs_update_count} stale`} />
          </Stack>
        )}

        {/* Issues & warnings */}
        {page.issues.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="error.main" gutterBottom>Issues</Typography>
            {page.issues.map((issue, i) => (
              <Alert key={i} severity="error" variant="outlined" sx={{ mb: 0.5, py: 0 }}>
                <Typography variant="body2"><strong>{issue.rule}</strong>: {issue.message}</Typography>
              </Alert>
            ))}
          </Box>
        )}

        {page.warnings.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="warning.main" gutterBottom>Warnings</Typography>
            {page.warnings.map((w, i) => (
              <Alert key={i} severity="warning" variant="outlined" sx={{ mb: 0.5, py: 0 }}>
                <Typography variant="body2"><strong>{w.rule}</strong>: {w.message}</Typography>
              </Alert>
            ))}
          </Box>
        )}

        {/* Orphaned overrides — with cleanup controls */}
        {rt && rt.orphaned_override_count > 0 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="subtitle2" color="warning.main">
                Orphaned Overrides ({orphanedKeys.length})
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button size="small" variant="text" onClick={toggleAll} sx={{ fontSize: 11, minWidth: 0, textTransform: 'none' }}>
                  {selectedKeys.size === orphanedKeys.length ? 'Deselect all' : 'Select all'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash size={14} />}
                  disabled={selectedKeys.size === 0}
                  onClick={() => setConfirmOpen(true)}
                  sx={{ fontSize: 11, textTransform: 'none' }}
                >
                  Delete selected ({selectedKeys.size})
                </Button>
              </Stack>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={1}>
              These content keys exist in page_content but no longer match any static key in the source code.
            </Typography>

            {deleteResult && (
              <Alert severity={deleteResult.type} sx={{ mb: 1, py: 0 }} onClose={() => setDeleteResult(null)}>
                <Typography variant="body2">{deleteResult.message}</Typography>
              </Alert>
            )}

            <Stack spacing={0}>
              {orphanedKeys.map((k: string) => (
                <Stack
                  key={k}
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  onClick={() => toggleKey(k)}
                  sx={{
                    cursor: 'pointer',
                    py: 0.25,
                    px: 0.5,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={selectedKeys.has(k)}
                    onChange={() => toggleKey(k)}
                    sx={{ p: 0.25 }}
                  />
                  <Chip label={k} size="small" variant="outlined" color="warning" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                </Stack>
              ))}
            </Stack>

            {/* Confirm dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle sx={{ pb: 1 }}>
                Confirm Orphaned Override Deletion
              </DialogTitle>
              <DialogContent>
                <Typography variant="body2" gutterBottom>
                  You are about to permanently delete <strong>{selectedKeys.size}</strong> orphaned
                  override{selectedKeys.size !== 1 ? 's' : ''} from page <strong>{page.name}</strong> (page_key: <code>{page.pageKey}</code>).
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  These overrides have no matching static content key in the source code. Deletion is logged to system_logs.
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, mt: 1, maxHeight: 200, overflow: 'auto' }}>
                  <Stack spacing={0.5}>
                    {Array.from(selectedKeys).map(k => (
                      <Typography key={k} variant="body2" fontFamily="monospace" fontSize={12}>
                        {k}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDelete}
                  disabled={deleting}
                  startIcon={deleting ? <CircularProgress size={14} /> : <IconTrash size={14} />}
                >
                  {deleting ? 'Deleting...' : `Delete ${selectedKeys.size} override${selectedKeys.size !== 1 ? 's' : ''}`}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        {/* Shared sections */}
        {page.shared_sections.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Shared Editable Sections</Typography>
            <Stack spacing={0.5}>
              {page.shared_sections.map((s, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={s.component}
                    size="small"
                    color={s.has_edit_key_prefix ? 'success' : 'default'}
                    variant="outlined"
                  />
                  {s.edit_key_prefix ? (
                    <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                      editKeyPrefix="{s.edit_key_prefix}" — fields: {s.fields.join(', ')}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontSize={12}>
                      no editKeyPrefix — fields: {s.fields.join(', ')}
                    </Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {/* Content keys */}
        {page.content_keys.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Content Keys ({page.content_keys.length})</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {page.content_keys.map(k => (
                <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Rule results */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>Rule Results</Typography>
          <Table size="small">
            <TableBody>
              {Object.entries(page.rules).map(([name, rule]) => (
                <TableRow key={name} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell sx={{ py: 0.5, width: 300 }}>
                    <Typography variant="body2" fontFamily="monospace" fontSize={12}>{name}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, width: 80 }}>
                    <RuleStatusChip status={rule.status} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {rule.detail || rule.reason || rule.route || (rule.exempt ? `exempt: ${rule.exempt_reason}` : '') || ''}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </Box>
  );
}

// ── Page Row ────────────────────────────────────────────────────────────

function PageRow({ page, expanded, onToggle, onRefresh }: { page: PageAudit; expanded: boolean; onToggle: () => void; onRefresh: () => void }) {
  const cfg = CLASSIFICATION_CONFIG[page.classification] || CLASSIFICATION_CONFIG['unknown'];
  const rt = page.runtime;
  const hasProblems = page.issues.length > 0 || page.warnings.length > 0;
  const hasOrphaned = (rt?.orphaned_override_count ?? 0) > 0;

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
          <Typography variant="body2" fontWeight={500}>{page.name}</Typography>
          <Typography variant="caption" color="text.secondary">{page.id}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace" fontSize={12}>{page.route || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Chip label={cfg.label} color={cfg.color} size="small" variant="filled" />
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{page.editable_field_count || '—'}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{page.shared_section_count || '—'}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{rt ? rt.override_count : '—'}</Typography>
        </TableCell>
        <TableCell align="right">
          {hasOrphaned ? (
            <Chip label={rt!.orphaned_override_count} color="warning" size="small" variant="filled" />
          ) : (
            <Typography variant="body2" color="text.secondary">{rt ? '0' : '—'}</Typography>
          )}
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{rt ? rt.translation_status_total : '—'}</Typography>
        </TableCell>
        <TableCell align="right">
          {rt && rt.translation_needs_update_count > 0 ? (
            <Chip label={rt.translation_needs_update_count} color="warning" size="small" variant="outlined" />
          ) : (
            <Typography variant="body2" color="text.secondary">{rt ? '0' : '—'}</Typography>
          )}
        </TableCell>
        <TableCell align="center">
          {hasProblems ? (
            <Stack direction="row" spacing={0.5} justifyContent="center">
              {page.issues.length > 0 && <Chip label={page.issues.length} color="error" size="small" />}
              {page.warnings.length > 0 && <Chip label={page.warnings.length} color="warning" size="small" />}
            </Stack>
          ) : (
            <IconCircleCheck size={16} color="var(--mui-palette-success-main, #4caf50)" />
          )}
        </TableCell>
      </TableRow>

      {/* Detail panel */}
      <TableRow>
        <TableCell colSpan={11} sx={{ py: 0, px: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <PageDetail page={page} onRefresh={onRefresh} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Summary Bar ─────────────────────────────────────────────────────────

export function SummaryBar({ summary, classFilter, onFilterChange }: {
  summary: AuditSummary;
  classFilter: string | null;
  onFilterChange: (v: string | null) => void;
}) {
  const items: { key: string; count: number; label: string; color: 'success' | 'warning' | 'default' | 'error' | 'info' }[] = [
    { key: 'editable-compliant',     count: summary.editable_compliant,      label: 'Compliant',  color: 'success' },
    { key: 'partially-editable',     count: summary.partially_editable,      label: 'Partial',    color: 'warning' },
    { key: 'broken-integration',     count: summary.broken_integration,      label: 'Broken',     color: 'error'   },
    { key: 'unknown',                count: summary.unknown,                 label: 'Unknown',    color: 'info'    },
    { key: 'non-editable-by-design', count: summary.non_editable_by_design,  label: 'By Design',  color: 'default' },
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
      {(summary.total_issues > 0 || summary.total_warnings > 0) && (
        <>
          {summary.total_issues > 0 && (
            <Chip label={`${summary.total_issues} issue(s)`} color="error" size="small" variant="outlined" icon={<IconCircleX size={14} />} />
          )}
          {summary.total_warnings > 0 && (
            <Chip label={`${summary.total_warnings} warning(s)`} color="warning" size="small" variant="outlined" icon={<IconAlertTriangle size={14} />} />
          )}
        </>
      )}
    </Stack>
  );
}

// ── Audit Table ─────────────────────────────────────────────────────────

export function AuditTable({ pages, expandedRow, onToggleRow, onRefresh }: {
  pages: PageAudit[];
  expandedRow: string | null;
  onToggleRow: (id: string) => void;
  onRefresh: () => void;
}) {
  if (pages.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No pages match the current filters.</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={32} />
            <TableCell><Typography variant="subtitle2">Page</Typography></TableCell>
            <TableCell><Typography variant="subtitle2">Route</Typography></TableCell>
            <TableCell><Typography variant="subtitle2">Classification</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2">Fields</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2">Sections</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2">Overrides</Typography></TableCell>
            <TableCell align="right"><Tooltip title="DB overrides with no matching static key"><Typography variant="subtitle2" sx={{ borderBottom: '1px dashed', borderColor: 'text.secondary', display: 'inline' }}>Orphaned</Typography></Tooltip></TableCell>
            <TableCell align="right"><Tooltip title="translation_status rows"><Typography variant="subtitle2">Trans</Typography></Tooltip></TableCell>
            <TableCell align="right"><Tooltip title="Translations needing update"><Typography variant="subtitle2">Stale</Typography></Tooltip></TableCell>
            <TableCell align="center"><Typography variant="subtitle2">Issues</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pages.map(page => (
            <PageRow key={page.id} page={page} expanded={expandedRow === page.id} onToggle={() => onToggleRow(page.id)} onRefresh={onRefresh} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
