/**
 * RecordSeeder — UI panel to generate and insert fake church records
 * for testing. Calls POST /api/admin/seed-records on the backend.
 *
 * State is split across helpers to keep this file focused on rendering:
 *   - useChurchSeederData → church list/selection + per-church record counts
 *   - recordSeederForm    → form fields (expand, type, count, year range)
 */

import React, { useEffect, useReducer, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  Storage as SeedIcon,
} from '@mui/icons-material';
import { apiClient } from '@/shared/lib/axiosInstance';
import { useChurchSeederData } from './useChurchSeederData';
import {
  initialSeederFormState,
  seederFormReducer,
} from './recordSeederForm';

interface PreviewRecord {
  [key: string]: any;
}

interface PreviewState {
  rows: PreviewRecord[];
  total: number;
}

interface PurgeDialogState {
  open: boolean;
  type: string;
}

interface RecordSeederProps {
  onToast: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}

const RECORD_TYPES = [
  { value: 'baptism', label: 'Baptism', color: '#2196f3' },
  { value: 'marriage', label: 'Marriage', color: '#e91e63' },
  { value: 'funeral', label: 'Funeral', color: '#607d8b' },
] as const;

// Column labels for preview table
const PREVIEW_COLUMNS: Record<string, string[]> = {
  baptism: ['Name', 'Birth Date', 'Baptism Date', 'Birthplace', 'Parents', 'Sponsors', 'Clergy'],
  marriage: ['Groom', 'Bride', 'Date', 'Groom Parents', 'Bride Parents', 'Witnesses', 'Clergy'],
  funeral: ['Name', 'Age', 'Date of Death', 'Burial Date', 'Burial Location', 'Clergy'],
};

function getPreviewRow(record: PreviewRecord, type: string): string[] {
  if (type === 'baptism') {
    return [
      `${record.first_name} ${record.last_name}`,
      record.birth_date,
      record.reception_date,
      record.birthplace,
      record.parents,
      record.sponsors,
      record.clergy,
    ];
  }
  if (type === 'marriage') {
    return [
      `${record.fname_groom} ${record.lname_groom}`,
      `${record.fname_bride} ${record.lname_bride}`,
      record.mdate,
      record.parentsg,
      record.parentsb,
      record.witness,
      record.clergy,
    ];
  }
  // funeral
  return [
    `${record.name} ${record.lastname}`,
    String(record.age),
    record.deceased_date,
    record.burial_date,
    record.burial_location,
    record.clergy,
  ];
}

export const RecordSeeder: React.FC<RecordSeederProps> = ({ onToast }) => {
  const [form, dispatchForm] = useReducer(seederFormReducer, initialSeederFormState);
  const { expanded, recordType, count, yearStart, yearEnd } = form;

  const data = useChurchSeederData();
  const {
    churches,
    loadingChurches,
    ensureLoaded,
    churchId,
    setChurchId,
    selectedChurch,
    counts,
    countsLoading,
    refreshCounts,
    resetCounts,
  } = data;

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [purgeDialog, setPurgeDialog] = useState<PurgeDialogState>({ open: false, type: '' });
  const [purging, setPurging] = useState(false);

  // Lazy-load churches when the panel is first expanded.
  useEffect(() => {
    if (expanded) ensureLoaded();
  }, [expanded, ensureLoaded]);

  // Preview
  const handlePreview = async () => {
    if (!churchId) { onToast('Select a church first', 'warning'); return; }
    setLoading(true);
    setPreview(null);
    try {
      const res: any = await apiClient.post('/api/admin/seed-records', {
        church_id: churchId,
        record_type: recordType,
        count,
        year_start: yearStart,
        year_end: yearEnd,
        dry_run: true,
      });
      const data = res?.data || res;
      setPreview({ rows: data.preview || [], total: data.total || 0 });
    } catch (err: any) {
      onToast(err?.response?.data?.error || 'Preview failed', 'error');
    }
    setLoading(false);
  };

  // Seed
  const handleSeed = async () => {
    if (!churchId) { onToast('Select a church first', 'warning'); return; }
    setSeeding(true);
    try {
      const res: any = await apiClient.post('/api/admin/seed-records', {
        church_id: churchId,
        record_type: recordType,
        count,
        year_start: yearStart,
        year_end: yearEnd,
      });
      const data = res?.data || res;
      onToast(`Inserted ${data.inserted} ${recordType} records into ${data.database}`, 'success');
      setPreview(null);
      refreshCounts();
    } catch (err: any) {
      onToast(err?.response?.data?.error || err?.response?.data?.message || 'Seed failed', 'error');
    }
    setSeeding(false);
  };

  // Purge
  const handlePurge = async () => {
    if (!churchId || !purgeDialog.type) return;
    setPurging(true);
    try {
      await apiClient.post('/api/admin/seed-records', {
        church_id: churchId,
        record_type: purgeDialog.type,
        count: 0,
        purge: true,
      });
      onToast(`Purged ${purgeDialog.type} records from church ${churchId}`, 'success');
      setPurgeDialog({ open: false, type: '' });
      refreshCounts();
    } catch (err: any) {
      // Purge endpoint may not exist yet - fallback message
      onToast('Purge not available via API. Use the CLI tool: node server/src/tools/seed-records.js', 'warning');
      setPurgeDialog({ open: false, type: '' });
    }
    setPurging(false);
  };

  return (
    <Box sx={{ mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
      {/* Header (clickable to expand/collapse) */}
      <Box
        onClick={() => dispatchForm({ type: 'toggleExpanded' })}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
          borderRadius: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SeedIcon color="primary" />
          <Typography variant="subtitle2" fontWeight={700}>
            Record Seeder
          </Typography>
          <Chip label="Dev Tool" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
        </Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); dispatchForm({ type: 'toggleExpanded' }); }}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Generate realistic fake records (baptism, marriage, funeral) for any church database.
            Great for testing and development.
          </Typography>

          {/* Row 1: Church + Record Type */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Church</InputLabel>
              <Select
                value={churchId}
                label="Church"
                onChange={(e) => {
                  setChurchId(e.target.value as number);
                  setPreview(null);
                  resetCounts();
                }}
                disabled={loadingChurches}
              >
                {loadingChurches ? (
                  <MenuItem disabled>Loading churches...</MenuItem>
                ) : churches.length === 0 ? (
                  <MenuItem disabled>No churches found</MenuItem>
                ) : (
                  churches.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      [{c.id}] {c.name} {c.database_name ? `(${c.database_name})` : ''}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Record Type</InputLabel>
              <Select
                value={recordType}
                label="Record Type"
                onChange={(e) => { dispatchForm({ type: 'setRecordType', value: e.target.value }); setPreview(null); }}
              >
                {RECORD_TYPES.map(rt => (
                  <MenuItem key={rt.value} value={rt.value}>{rt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Count"
              type="number"
              size="small"
              value={count}
              onChange={(e) => dispatchForm({ type: 'setCount', value: Math.min(5000, Math.max(1, parseInt(e.target.value) || 1)) })}
              inputProps={{ min: 1, max: 5000 }}
              sx={{ width: 100 }}
            />
          </Stack>

          {/* Row 2: Year Range */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Year Range: {yearStart} — {yearEnd}
            </Typography>
            <Slider
              value={[yearStart, yearEnd]}
              onChange={(_, v) => {
                const [s, e] = v as number[];
                dispatchForm({ type: 'setYearRange', start: s, end: e });
              }}
              min={1800}
              max={2026}
              valueLabelDisplay="auto"
              sx={{ mt: 0.5, mx: 1, width: 'calc(100% - 16px)' }}
            />
          </Box>

          {/* Record Counts for selected church */}
          {churchId && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Current counts ({selectedChurch?.name || churchId}):
                </Typography>
                {countsLoading ? (
                  <CircularProgress size={14} />
                ) : counts ? (
                  <>
                    {RECORD_TYPES.map(rt => (
                      <Chip
                        key={rt.value}
                        size="small"
                        label={`${rt.label}: ${counts[rt.value] === -1 ? 'N/A' : counts[rt.value]}`}
                        variant={rt.value === recordType ? 'filled' : 'outlined'}
                        color={rt.value === recordType ? 'primary' : 'default'}
                        sx={{ height: 22, fontSize: '0.7rem' }}
                      />
                    ))}
                    <Tooltip title="Refresh counts">
                      <IconButton size="small" onClick={refreshCounts}><RefreshIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </>
                ) : null}
              </Stack>
            </Box>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={loading ? <CircularProgress size={14} /> : <PreviewIcon />}
              onClick={handlePreview}
              disabled={!churchId || loading}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={seeding ? <CircularProgress size={14} color="inherit" /> : <SeedIcon />}
              onClick={handleSeed}
              disabled={!churchId || seeding}
              color="primary"
            >
              Seed {count} Records
            </Button>
            <Divider orientation="vertical" flexItem />
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              disabled={!churchId}
              onClick={() => setPurgeDialog({ open: true, type: recordType })}
            >
              Purge {RECORD_TYPES.find(r => r.value === recordType)?.label}
            </Button>
          </Stack>

          {/* Preview Table */}
          {preview && preview.rows.length > 0 && (
            <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" fontWeight={700}>
                  Preview — {preview.total} {recordType} records (showing first {preview.rows.length})
                </Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {(PREVIEW_COLUMNS[recordType] || []).map((col, i) => (
                        <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                          {col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.rows.map((rec, ri) => (
                      <TableRow key={ri}>
                        {getPreviewRow(rec, recordType).map((val, ci) => (
                          <TableCell key={ci} sx={{ fontSize: '0.7rem', maxWidth: 200 }}>
                            <Tooltip title={val || ''}>
                              <Typography variant="body2" fontSize="0.7rem" noWrap>
                                {val}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      </Collapse>

      {/* Purge Confirmation Dialog */}
      <Dialog open={purgeDialog.open} onClose={() => setPurgeDialog({ open: false, type: '' })}>
        <DialogTitle>Purge Records?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This will permanently delete all {purgeDialog.type} records from{' '}
            <strong>{selectedChurch?.name || `church ${churchId}`}</strong>.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            This operation cannot be undone. Use the CLI tool for selective purging:
          </Typography>
          <Typography variant="body2" fontFamily="monospace" sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            node server/src/tools/seed-records.js
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurgeDialog({ open: false, type: '' })}>Cancel</Button>
          <Button onClick={handlePurge} variant="contained" color="error" disabled={purging}>
            {purging ? 'Purging...' : 'Purge All'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecordSeeder;
