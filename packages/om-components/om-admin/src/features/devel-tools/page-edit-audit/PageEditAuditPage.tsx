/**
 * Page Editability Audit — Devel Tools
 *
 * Two tabs:
 *   1. Audit — Shows which public pages are properly wired for inline live editing,
 *      with static analysis results and runtime DB verification.
 *   2. Candidates — Shows pages eligible for Edit Mode conversion with
 *      preview and one-click apply for auto-wiring EditableText.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Stack, TextField,
  CircularProgress, Alert,
  InputAdornment, FormControlLabel, Switch, Tab, Tabs,
} from '@mui/material';
import { IconRefresh, IconSearch, IconWand } from '@tabler/icons-react';
import apiClient from '@/api/utils/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';
import type { AuditResponse } from './pageEditAuditTypes';
import { SummaryBar, AuditTable } from './AuditTab';
import CandidatesPanel from './CandidatesTab';


// ── Component ───────────────────────────────────────────────────────────

const PageEditAuditPage = () => {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);
  const [showOrphanedOnly, setShowOrphanedOnly] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<AuditResponse>('/admin/frontend-page-audit');
      setData(res as unknown as AuditResponse);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch audit');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const filteredPages = useMemo(() => {
    if (!data) return [];
    let pages = data.pages;

    if (search) {
      const q = search.toLowerCase();
      pages = pages.filter(p =>
        p.id.includes(q) || p.name.toLowerCase().includes(q) ||
        (p.route || '').toLowerCase().includes(q) || p.file.toLowerCase().includes(q)
      );
    }

    if (classFilter) {
      pages = pages.filter(p => p.classification === classFilter);
    }

    if (showOnlyFailures) {
      pages = pages.filter(p =>
        p.classification === 'broken-integration' ||
        p.classification === 'partially-editable' ||
        p.classification === 'unknown' ||
        p.issues.length > 0 || p.warnings.length > 0
      );
    }

    if (showOrphanedOnly) {
      pages = pages.filter(p => (p.runtime?.orphaned_override_count ?? 0) > 0);
    }

    return pages;
  }, [data, search, classFilter, showOnlyFailures, showOrphanedOnly]);

  return (
    <PageContainer title="Page Editability Audit" description="Audit frontend page edit-mode wiring">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>Page Editability Audit</Typography>
            {data && tab === 0 && (
              <Typography variant="body2" color="text.secondary">
                Last run: {new Date(data.timestamp).toLocaleString()} — {data.summary.total_pages} pages
              </Typography>
            )}
          </Box>
          {tab === 0 && (
            <Button
              variant="outlined"
              startIcon={<IconRefresh size={18} />}
              onClick={fetchAudit}
              disabled={loading}
            >
              {loading ? 'Running...' : 'Refresh'}
            </Button>
          )}
        </Stack>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Audit" />
          <Tab label="Candidates" icon={<IconWand size={16} />} iconPosition="start" />
        </Tabs>

        {tab === 0 && (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {loading && !data ? (
              <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
            ) : data ? (
              <>
                <SummaryBar summary={data.summary} classFilter={classFilter} onFilterChange={setClassFilter} />

                <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap" useFlexGap>
                  <TextField
                    size="small"
                    placeholder="Search pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ minWidth: 220 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>,
                    }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={showOnlyFailures} onChange={e => setShowOnlyFailures(e.target.checked)} />}
                    label={<Typography variant="body2">Failures only</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={showOrphanedOnly} onChange={e => setShowOrphanedOnly(e.target.checked)} />}
                    label={<Typography variant="body2">Orphaned overrides</Typography>}
                  />
                  {(classFilter || showOnlyFailures || showOrphanedOnly || search) && (
                    <Button size="small" onClick={() => { setClassFilter(null); setShowOnlyFailures(false); setShowOrphanedOnly(false); setSearch(''); }}>
                      Clear filters
                    </Button>
                  )}
                </Stack>

                <AuditTable
                  pages={filteredPages}
                  expandedRow={expandedRow}
                  onToggleRow={(id) => setExpandedRow(prev => prev === id ? null : id)}
                  onRefresh={fetchAudit}
                />
              </>
            ) : null}
          </>
        )}

        {tab === 1 && <CandidatesPanel />}
      </Box>
    </PageContainer>
  );
};

export default PageEditAuditPage;

