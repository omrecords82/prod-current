/**
 * ExportModal.tsx — Church data export dialog
 *
 * Provides export options: mode, format, column selection, contacts toggle.
 * Calls POST /api/crm/churches/export with current map filters.
 */

import { apiClient } from '@/api/utils/axiosInstance';
import {
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

// ═══════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════

export type ExportMode = 'all' | 'state' | 'region' | 'selected';

export interface ExportFilters {
  viewMode: string;
  jurisdiction: string | null;
  search?: string;
}

export interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  /** Current active filters from the map page */
  filters: ExportFilters;
  /** Currently selected state (2-letter code) or null */
  selectedState: string | null;
  /** Current region tab (all, northeast, midwest, south, west) */
  activeRegion: string;
  /** IDs of manually selected churches */
  selectedChurchIds: (number | string)[];
  /** Total count of filtered churches in the sidebar */
  filteredCount: number;
}

// ═══════════════════════════════════════════════════════════════
//  Column definitions
// ═══════════════════════════════════════════════════════════════

interface ColumnDef {
  key: string;
  label: string;
  group: 'basic' | 'location' | 'status' | 'contact';
  defaultOn: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'church_id',             label: 'Church ID',             group: 'basic',    defaultOn: true },
  { key: 'church_name',           label: 'Church Name',           group: 'basic',    defaultOn: true },
  { key: 'jurisdiction',          label: 'Jurisdiction',          group: 'basic',    defaultOn: true },
  { key: 'street',                label: 'Street',                group: 'location', defaultOn: true },
  { key: 'city',                  label: 'City',                  group: 'location', defaultOn: true },
  { key: 'state',                 label: 'State',                 group: 'location', defaultOn: true },
  { key: 'zip',                   label: 'ZIP',                   group: 'location', defaultOn: true },
  { key: 'phone',                 label: 'Phone',                 group: 'basic',    defaultOn: true },
  { key: 'website',               label: 'Website',               group: 'basic',    defaultOn: true },
  { key: 'latitude',              label: 'Latitude',              group: 'location', defaultOn: false },
  { key: 'longitude',             label: 'Longitude',             group: 'location', defaultOn: false },
  { key: 'op_status',             label: 'Operational Status',    group: 'status',   defaultOn: true },
  { key: 'pipeline_stage',        label: 'Pipeline Stage',        group: 'status',   defaultOn: true },
  { key: 'priority',              label: 'Priority',              group: 'status',   defaultOn: true },
  { key: 'is_client',             label: 'Is Client',             group: 'status',   defaultOn: false },
  { key: 'source',                label: 'Source',                group: 'status',   defaultOn: true },
  { key: 'last_contacted_at',     label: 'Last Contacted',        group: 'status',   defaultOn: false },
  { key: 'next_follow_up',        label: 'Next Follow-Up',        group: 'status',   defaultOn: false },
  { key: 'primary_contact_name',  label: 'Primary Contact',       group: 'contact',  defaultOn: false },
  { key: 'primary_contact_email', label: 'Contact Email',         group: 'contact',  defaultOn: false },
  { key: 'primary_contact_phone', label: 'Contact Phone',         group: 'contact',  defaultOn: false },
];

const COLUMN_GROUPS = [
  { key: 'basic',    label: 'Basic Info' },
  { key: 'location', label: 'Location' },
  { key: 'status',   label: 'Status & Pipeline' },
  { key: 'contact',  label: 'Contacts' },
];

const MODE_LABELS: Record<ExportMode, { label: string; description: string }> = {
  all:      { label: 'All Results',          description: 'All churches matching current view mode & jurisdiction filters' },
  state:    { label: 'Current State',        description: 'Churches in the currently selected state' },
  region:   { label: 'Current Region',       description: 'Churches in the currently selected region tab' },
  selected: { label: 'Selected Churches',    description: 'Only manually selected churches' },
};

// ═══════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════

const ExportModal: React.FC<ExportModalProps> = ({
  open, onClose, filters, selectedState, activeRegion, selectedChurchIds, filteredCount,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Form state
  const [exportMode, setExportMode] = useState<ExportMode>('all');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    () => new Set(COLUMNS.filter(c => c.defaultOn).map(c => c.key))
  );
  const [includeContacts, setIncludeContacts] = useState(false);
  const [includeCoordinates, setIncludeCoordinates] = useState(false);

  // Export state
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Determine which modes are available
  const availableModes = useMemo(() => {
    const modes: ExportMode[] = ['all'];
    if (selectedState) modes.push('state');
    if (activeRegion && activeRegion !== 'all') modes.push('region');
    if (selectedChurchIds.length > 0) modes.push('selected');
    return modes;
  }, [selectedState, activeRegion, selectedChurchIds]);

  // Reset mode if it becomes unavailable
  useEffect(() => {
    if (!availableModes.includes(exportMode)) {
      setExportMode('all');
    }
  }, [availableModes, exportMode]);

  // Toggle contacts columns
  useEffect(() => {
    const contactCols = COLUMNS.filter(c => c.group === 'contact').map(c => c.key);
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (includeContacts) {
        contactCols.forEach(c => next.add(c));
      } else {
        contactCols.forEach(c => next.delete(c));
      }
      return next;
    });
  }, [includeContacts]);

  // Toggle coordinate columns
  useEffect(() => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (includeCoordinates) {
        next.add('latitude');
        next.add('longitude');
      } else {
        next.delete('latitude');
        next.delete('longitude');
      }
      return next;
    });
  }, [includeCoordinates]);

  // Fetch preview count when mode/filters change
  const fetchCount = useCallback(async () => {
    setCountLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        exportMode,
        filters: {
          viewMode: filters.viewMode,
          jurisdiction: filters.jurisdiction,
        },
        selectedIds: exportMode === 'selected' ? selectedChurchIds : [],
      };
      if (exportMode === 'state' && selectedState) body.state = selectedState;
      if (exportMode === 'region' && activeRegion !== 'all') body.region = activeRegion;

      const data = await apiClient.post<any>('/crm/churches/export-count', body);
      setPreviewCount(data.count);
    } catch {
      setPreviewCount(null);
    } finally {
      setCountLoading(false);
    }
  }, [exportMode, filters, selectedState, activeRegion, selectedChurchIds]);

  useEffect(() => {
    if (open) {
      fetchCount();
      setSuccess(false);
      setError(null);
    }
  }, [open, fetchCount]);

  // Export handler
  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    setSuccess(false);
    try {
      const body: Record<string, unknown> = {
        exportMode,
        filters: {
          viewMode: filters.viewMode,
          jurisdiction: filters.jurisdiction,
        },
        columns: Array.from(selectedColumns),
        includeContacts,
        includeCoordinates,
        format,
        selectedIds: exportMode === 'selected' ? selectedChurchIds : [],
      };
      if (exportMode === 'state' && selectedState) body.state = selectedState;
      if (exportMode === 'region' && activeRegion !== 'all') body.region = activeRegion;

      const blob = await apiClient.post<any>('/crm/churches/export', body, { responseType: 'blob' });

      // Download the file
      const filename = `church-export.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [exportMode, filters, selectedState, activeRegion, selectedChurchIds, selectedColumns, includeContacts, includeCoordinates, format]);

  // Column toggle
  const toggleColumn = useCallback((key: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleGroupAll = useCallback((groupKey: string) => {
    const groupCols = COLUMNS.filter(c => c.group === groupKey).map(c => c.key);
    setSelectedColumns(prev => {
      const next = new Set(prev);
      const allSelected = groupCols.every(c => next.has(c));
      if (allSelected) groupCols.forEach(c => next.delete(c));
      else groupCols.forEach(c => next.add(c));
      return next;
    });
  }, []);

  const displayCount = exportMode === 'selected' ? selectedChurchIds.length
    : exportMode === 'state' && selectedState ? filteredCount
    : previewCount;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TableIcon color="primary" />
        <Typography variant="h6" sx={{ flex: 1 }}>Export Churches</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* ── Export Mode ── */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Export Scope</Typography>
          <RadioGroup value={exportMode} onChange={(_, v) => setExportMode(v as ExportMode)}>
            {availableModes.map(mode => (
              <FormControlLabel
                key={mode}
                value={mode}
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{MODE_LABELS[mode].label}</Typography>
                    <Typography variant="caption" color="text.secondary">{MODE_LABELS[mode].description}</Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', mb: 0.5, '& .MuiRadio-root': { pt: 0.25 } }}
              />
            ))}
          </RadioGroup>
        </Box>

        <Divider />

        {/* ── Record count ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Records to export:</Typography>
          {countLoading ? (
            <CircularProgress size={16} />
          ) : (
            <Chip
              label={displayCount != null ? displayCount.toLocaleString() : '—'}
              size="small"
              color={displayCount && displayCount > 0 ? 'primary' : 'default'}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>

        <Divider />

        {/* ── Format ── */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Format</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(['xlsx', 'csv'] as const).map(f => (
              <Chip
                key={f}
                label={f === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                onClick={() => setFormat(f)}
                color={format === f ? 'primary' : 'default'}
                variant={format === f ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Box>
        </Box>

        <Divider />

        {/* ── Toggles ── */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          <FormControlLabel
            control={<Switch size="small" checked={includeContacts} onChange={(_, v) => setIncludeContacts(v)} />}
            label={<Typography variant="body2">Include contacts</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={includeCoordinates} onChange={(_, v) => setIncludeCoordinates(v)} />}
            label={<Typography variant="body2">Include lat/lng</Typography>}
          />
        </Box>

        <Divider />

        {/* ── Column selection ── */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Columns ({selectedColumns.size} of {COLUMNS.length})
          </Typography>
          {COLUMN_GROUPS.map(group => {
            const groupCols = COLUMNS.filter(c => c.group === group.key);
            const allOn = groupCols.every(c => selectedColumns.has(c.key));
            const someOn = groupCols.some(c => selectedColumns.has(c.key));
            return (
              <Box key={group.key} sx={{ mb: 1.5 }}>
                <Box
                  onClick={() => toggleGroupAll(group.key)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mb: 0.5 }}
                >
                  {allOn ? <CheckBoxIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    : someOn ? <CheckBoxIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    : <CheckBoxBlankIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {group.label}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: 0.5 }}>
                  {groupCols.map(col => (
                    <Chip
                      key={col.key}
                      label={col.label}
                      size="small"
                      onClick={() => toggleColumn(col.key)}
                      color={selectedColumns.has(col.key) ? 'primary' : 'default'}
                      variant={selectedColumns.has(col.key) ? 'filled' : 'outlined'}
                      sx={{ fontSize: '0.72rem', height: 24, cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* ── Status messages ── */}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess(false)}>Export downloaded successfully</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={exporting}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          onClick={handleExport}
          disabled={exporting || selectedColumns.size === 0 || (displayCount != null && displayCount === 0)}
          sx={{ textTransform: 'none', minWidth: 140 }}
        >
          {exporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportModal;
