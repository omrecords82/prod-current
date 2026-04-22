/**
 * DatabaseMappingPage — 5-step wizard for configuring database field mappings.
 *
 * Steps: Select Record Type → Field Mapping → Search Config → Preview → Save & Apply
 * URL-driven step navigation via :step param.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  TextField,
  Switch,
  FormControlLabel,
  Radio,
  Slider,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { useParishSettings } from './useParishSettings';

const BASE = '/account/parish-management/database-mapping';

// ── Step definitions ────────────────────────────────────────────

const STEPS = [
  { key: 'select-record', label: 'Select Record Type' },
  { key: 'field-mapping', label: 'Field Mapping' },
  { key: 'search-config', label: 'Search Configuration' },
  { key: 'preview', label: 'Preview & Validation' },
  { key: 'save', label: 'Save & Apply' },
] as const;

// ── Record types ────────────────────────────────────────────────

interface RecordType {
  id: string;
  name: string;
  description: string;
  count: number;
  color: string;
}

const recordTypes: RecordType[] = [
  { id: 'baptism', name: 'Baptism Records', description: 'Baptismal records including godparent information', count: 1248, color: '#3b82f6' },
  { id: 'marriage', name: 'Marriage Records', description: 'Marriage sacrament records with witness details', count: 456, color: '#ec4899' },
  { id: 'funeral', name: 'Funeral Records', description: 'Funeral and memorial service records', count: 892, color: '#8b5cf6' },
];

// ── Field mapping data ──────────────────────────────────────────

interface FieldDef {
  column: string;
  displayName: string;
  group: string;
  visible: boolean;
  sortable: boolean;
  searchWeight: number;
}

const baptismFields: FieldDef[] = [
  { column: 'first_name', displayName: 'First Name', group: 'Personal Information', visible: true, sortable: true, searchWeight: 8 },
  { column: 'last_name', displayName: 'Last Name', group: 'Personal Information', visible: true, sortable: true, searchWeight: 10 },
  { column: 'middle_name', displayName: 'Middle Name', group: 'Personal Information', visible: false, sortable: false, searchWeight: 5 },
  { column: 'maiden_name', displayName: 'Maiden Name', group: 'Personal Information', visible: false, sortable: false, searchWeight: 7 },
  { column: 'date_of_baptism', displayName: 'Date of Baptism', group: 'Sacrament Details', visible: true, sortable: true, searchWeight: 3 },
  { column: 'place_of_baptism', displayName: 'Place of Baptism', group: 'Sacrament Details', visible: true, sortable: false, searchWeight: 4 },
  { column: 'officiating_priest', displayName: 'Officiating Priest', group: 'Sacrament Details', visible: true, sortable: false, searchWeight: 6 },
  { column: 'godfather_name', displayName: "Godfather's Name", group: 'Sponsors', visible: false, sortable: false, searchWeight: 5 },
  { column: 'godmother_name', displayName: "Godmother's Name", group: 'Sponsors', visible: false, sortable: false, searchWeight: 5 },
  { column: 'deacon', displayName: 'Deacon', group: 'Clergy', visible: false, sortable: false, searchWeight: 2 },
  { column: 'notes', displayName: 'Notes', group: 'Additional', visible: false, sortable: false, searchWeight: 1 },
];

// ── Mock preview data ───────────────────────────────────────────

const previewRecords = [
  { firstName: 'John', lastName: 'Smith', baptismDate: '01/15/2020', priest: 'Fr. Michael' },
  { firstName: 'Sarah', lastName: 'Johnson', baptismDate: '03/22/2019', priest: 'Fr. Nicholas' },
  { firstName: 'Michael', lastName: 'Roberts', baptismDate: '06/08/2021', priest: 'Fr. Michael' },
  { firstName: 'Emily', lastName: 'Davis', baptismDate: '11/30/2020', priest: 'Fr. John' },
  { firstName: 'David', lastName: 'Wilson', baptismDate: '09/12/2018', priest: 'Fr. Nicholas' },
];

// ── Component ───────────────────────────────────────────────────

/** Shape of mapping config stored in parish_settings */
interface MappingConfig {
  selectedRecord?: string;
  fields?: FieldDef[];
  defaultSort?: string;
}

const DatabaseMappingPage: React.FC = () => {
  const { step } = useParams<{ step?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // ── Persistence via parish settings API ─────────────────────
  const { data: savedSettings, loading: settingsLoading, saving, error: settingsError, save: saveSettings } = useParishSettings<{ config?: MappingConfig }>('mapping');

  const currentStepIndex = useMemo(() => {
    if (!step) return 0;
    const idx = STEPS.findIndex((s) => s.key === step);
    return idx >= 0 ? idx : 0;
  }, [step]);

  const [selectedRecord, setSelectedRecord] = useState('baptism');
  const [fields, setFields] = useState<FieldDef[]>(baptismFields);
  const [defaultSort, setDefaultSort] = useState('last_name');
  const [dirty, setDirty] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Load saved config on mount
  useEffect(() => {
    if (settingsLoading) return;
    const cfg = savedSettings?.config;
    if (cfg) {
      if (cfg.selectedRecord) setSelectedRecord(cfg.selectedRecord);
      if (cfg.fields && cfg.fields.length > 0) setFields(cfg.fields);
      if (cfg.defaultSort) setDefaultSort(cfg.defaultSort);
    }
  }, [savedSettings, settingsLoading]);

  const goTo = (idx: number) => {
    if (idx === 0) navigate(BASE);
    else navigate(`${BASE}/${STEPS[idx].key}`);
  };

  const markDirty = useCallback(() => setDirty(true), []);

  const updateField = (column: string, key: keyof FieldDef, value: any) => {
    setFields((prev) => prev.map((f) => (f.column === column ? { ...f, [key]: value } : f)));
    markDirty();
  };

  const handleSave = async () => {
    const config: MappingConfig = { selectedRecord, fields, defaultSort };
    const ok = await saveSettings({ config });
    if (ok) {
      setDirty(false);
      setSnackbar({ open: true, message: 'Configuration saved successfully', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: settingsError || 'Failed to save configuration', severity: 'error' });
    }
  };

  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldDef[]> = {};
    fields.forEach((f) => {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    });
    return groups;
  }, [fields]);

  const visibleCount = fields.filter((f) => f.visible).length;
  const sortableCount = fields.filter((f) => f.sortable).length;
  const searchableCount = fields.filter((f) => f.searchWeight > 0).length;

  // ── Stepper ─────────────────────────────────────────────────────

  const Stepper = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
      {STEPS.map((s, i) => {
        const isCompleted = i < currentStepIndex;
        const isCurrent = i === currentStepIndex;
        return (
          <React.Fragment key={s.key}>
            <Box
              role="button"
              tabIndex={0}
              aria-label={`Step ${i + 1}: ${s.label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
              onClick={() => goTo(i)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); } }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                opacity: isCurrent ? 1 : isCompleted ? 0.9 : 0.5,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  bgcolor: isCompleted
                    ? isDark ? '#166534' : '#dcfce7'
                    : isCurrent
                      ? isDark ? '#2d1b4e' : '#2d1b4e'
                      : isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb',
                  color: isCompleted
                    ? isDark ? '#86efac' : '#166534'
                    : isCurrent
                      ? '#fff'
                      : isDark ? '#6b7280' : '#6b7280',
                }}
              >
                {isCompleted ? <CheckCircleOutlineIcon sx={{ fontSize: 16 }} /> : i + 1}
              </Box>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent
                    ? isDark ? '#f3f4f6' : '#111827'
                    : isDark ? '#6b7280' : '#9ca3af',
                  display: { xs: 'none', md: 'block' },
                }}
              >
                {s.label}
              </Typography>
            </Box>
            {i < STEPS.length - 1 && (
              <Box
                sx={{
                  width: { xs: 16, md: 40 },
                  height: 2,
                  mx: { xs: 0.5, md: 1 },
                  bgcolor: i < currentStepIndex
                    ? isDark ? '#166534' : '#86efac'
                    : isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb',
                  borderRadius: 1,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );

  // ── Step 1: Select Record Type ────────────────────────────────

  const StepSelectRecord = (
    <Box>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
        Select Record Type
      </Typography>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 3 }}>
        Choose the record type you want to configure field mappings for
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {recordTypes.map((rt) => {
          const isSelected = selectedRecord === rt.id;
          return (
            <Paper
              key={rt.id}
              variant="outlined"
              onClick={() => { setSelectedRecord(rt.id); markDirty(); }}
              sx={{
                p: 2.5,
                borderRadius: 2,
                cursor: 'pointer',
                borderColor: isSelected ? rt.color : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                borderWidth: isSelected ? 2 : 1,
                bgcolor: isSelected
                  ? isDark ? `${rt.color}15` : `${rt.color}08`
                  : isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: rt.color,
                  boxShadow: `0 0 0 3px ${rt.color}22`,
                },
              }}
            >
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.9375rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
                {rt.name}
              </Typography>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 1.5 }}>
                {rt.description}
              </Typography>
              <Chip
                label={`${rt.count.toLocaleString()} records`}
                size="small"
                sx={{
                  fontFamily: "'Inter'",
                  fontSize: '0.6875rem',
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                  color: isDark ? '#d1d5db' : '#4b5563',
                }}
              />
            </Paper>
          );
        })}
      </Box>
    </Box>
  );

  // ── Step 2: Field Mapping ─────────────────────────────────────

  const StepFieldMapping = (
    <Box>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
        Field Mapping
      </Typography>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 3 }}>
        Configure display names, visibility, and sorting for each field
      </Typography>
      {Object.entries(groupedFields).map(([group, flds]) => (
        <Paper
          key={group}
          variant="outlined"
          sx={{
            mb: 2,
            borderRadius: 2,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
            }}
          >
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827' }}>
              {group}
            </Typography>
          </Box>
          {flds.map((field, fi) => (
            <Box
              key={field.column}
              sx={{
                px: 2.5,
                py: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '120px 1fr auto auto auto' },
                gap: 2,
                alignItems: 'center',
                borderBottom: fi < flds.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.6875rem',
                  color: isDark ? '#9ca3af' : '#6b7280',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
                  px: 1,
                  py: 0.25,
                  borderRadius: 0.5,
                  width: 'fit-content',
                }}
              >
                {field.column}
              </Typography>
              <TextField
                size="small"
                value={field.displayName}
                onChange={(e) => updateField(field.column, 'displayName', e.target.value)}
                sx={{
                  '& .MuiInputBase-input': { fontFamily: "'Inter'", fontSize: '0.8125rem' },
                }}
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={field.visible}
                    onChange={(e) => updateField(field.column, 'visible', e.target.checked)}
                  />
                }
                label={<Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem' }}>Visible</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={field.sortable}
                    onChange={(e) => updateField(field.column, 'sortable', e.target.checked)}
                  />
                }
                label={<Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem' }}>Sortable</Typography>}
              />
              <Radio
                size="small"
                checked={defaultSort === field.column}
                onChange={() => { setDefaultSort(field.column); markDirty(); }}
                disabled={!field.sortable}
              />
            </Box>
          ))}
        </Paper>
      ))}
    </Box>
  );

  // ── Step 3: Search Configuration ──────────────────────────────

  const StepSearchConfig = (
    <Box>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
        Search Configuration
      </Typography>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 3 }}>
        Set search weights for each field — higher weights rank higher in search results
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
          overflow: 'hidden',
        }}
      >
        {fields.map((field, i) => (
          <Box
            key={field.column}
            sx={{
              px: 2.5,
              py: 1.5,
              display: 'grid',
              gridTemplateColumns: '180px 1fr 60px',
              gap: 2,
              alignItems: 'center',
              borderBottom: i < fields.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
            }}
          >
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827' }}>
              {field.displayName}
            </Typography>
            <Slider
              size="small"
              value={field.searchWeight}
              onChange={(_, val) => updateField(field.column, 'searchWeight', val as number)}
              min={0}
              max={10}
              step={1}
              sx={{
                color: isDark ? '#d4af37' : '#2d1b4e',
                '& .MuiSlider-track': { bgcolor: isDark ? '#d4af37' : '#2d1b4e' },
              }}
            />
            <Typography
              sx={{
                fontFamily: "'Inter'",
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isDark ? '#d4af37' : '#2d1b4e',
                textAlign: 'right',
              }}
            >
              {field.searchWeight}/10
            </Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );

  // ── Step 4: Preview & Validation ──────────────────────────────

  const hiddenRequired = fields.filter((f) => !f.visible && f.searchWeight > 6);

  const StepPreview = (
    <Box>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
        Preview & Validation
      </Typography>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 3 }}>
        Review how your configuration will display in the application
      </Typography>

      {hiddenRequired.length > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon fontSize="small" />}
          sx={{ mb: 2, borderRadius: 1.5, fontFamily: "'Inter'", fontSize: '0.8125rem' }}
        >
          {hiddenRequired.length} field(s) are hidden but have high search weight: {hiddenRequired.map((f) => f.displayName).join(', ')}
        </Alert>
      )}

      <Alert
        severity="success"
        icon={<CheckCircleOutlineIcon fontSize="small" />}
        sx={{ mb: 3, borderRadius: 1.5, fontFamily: "'Inter'", fontSize: '0.8125rem' }}
      >
        Configuration is valid and ready to apply
      </Alert>

      {/* Preview Table */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
          mb: 3,
        }}
      >
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827' }}>
            Table Preview
          </Typography>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280', mt: 0.25 }}>
            Showing visible columns with current sort configuration
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                {['First Name', 'Last Name', 'Date of Baptism', 'Officiating Priest'].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '10px 20px',
                      textAlign: 'left',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: isDark ? '#9ca3af' : '#6b7280',
                    }}
                  >
                    {col}
                    {col === 'Last Name' && (
                      <Chip label="Default" size="small" sx={{ ml: 1, height: 18, fontSize: '0.625rem', bgcolor: isDark ? 'rgba(45,27,78,0.3)' : 'rgba(45,27,78,0.08)', color: isDark ? '#d4af37' : '#2d1b4e' }} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRecords.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < previewRecords.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
                  }}
                >
                  <td style={{ padding: '10px 20px', fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#f3f4f6' : '#111827' }}>{r.firstName}</td>
                  <td style={{ padding: '10px 20px', fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#f3f4f6' : '#111827' }}>{r.lastName}</td>
                  <td style={{ padding: '10px 20px', fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>{r.baptismDate}</td>
                  <td style={{ padding: '10px 20px', fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>{r.priest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Summary stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {[
          { label: `${visibleCount} Visible Columns`, sub: `Out of ${fields.length} total fields` },
          { label: `${sortableCount} Sortable Fields`, sub: `Default sort: ${fields.find((f) => f.column === defaultSort)?.displayName || '—'}` },
          { label: `${searchableCount} Searchable Fields`, sub: 'With weight configuration' },
        ].map((item) => (
          <Paper
            key={item.label}
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: isDark ? 'rgba(45,27,78,0.15)' : 'rgba(45,27,78,0.04)',
              border: `1px solid ${isDark ? 'rgba(45,27,78,0.3)' : 'rgba(45,27,78,0.1)'}`,
            }}
          >
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#d4af37' : '#2d1b4e', mb: 0.25 }}>
              {item.label}
            </Typography>
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
              {item.sub}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );

  // ── Step 5: Save & Apply ──────────────────────────────────────

  const modifiedFields = fields.filter((f) => f.visible || f.searchWeight > 5);

  const StepSave = (
    <Box>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
        Save & Apply Configuration
      </Typography>
      <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 3 }}>
        Review your changes and apply them to your parish records
      </Typography>

      {/* Summary cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { value: fields.length, label: 'Fields Modified' },
          { value: searchableCount, label: 'Search Weights Changed' },
          { value: sortableCount, label: 'Sort Updates' },
          { value: fields.filter((f) => !f.visible).length, label: 'Hidden Fields' },
        ].map((card) => (
          <Paper
            key={card.label}
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 2,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
            }}
          >
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.5rem', fontWeight: 600, color: isDark ? '#d4af37' : '#2d1b4e', mb: 0.5 }}>
              {card.value}
            </Typography>
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
              {card.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Detailed changes */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
          mb: 3,
        }}
      >
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827' }}>
            Detailed Changes
          </Typography>
        </Box>
        {modifiedFields.slice(0, 5).map((field, i) => (
          <Box
            key={field.column}
            sx={{
              px: 2.5,
              py: 1.5,
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
              borderBottom: i < 4 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#16a34a', mt: 0.25 }} />
            <Box>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
                {field.displayName}
              </Typography>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                {field.visible ? 'Visible' : 'Hidden'} &middot; Search weight: {field.searchWeight} &middot; {field.sortable ? 'Sortable' : 'Not sortable'}
              </Typography>
            </Box>
          </Box>
        ))}
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { icon: <SaveOutlinedIcon />, title: 'Save Mapping', desc: `Apply changes to ${recordTypes.find((r) => r.id === selectedRecord)?.name}`, primary: true },
          { icon: <ContentCopyOutlinedIcon />, title: 'Save as Template', desc: 'Reuse this configuration later', primary: false },
          { icon: <ShareOutlinedIcon />, title: 'Apply to Other Types', desc: 'Use for Marriage & Funeral records', primary: false },
        ].map((action) => (
          <Paper
            key={action.title}
            variant="outlined"
            onClick={action.primary ? handleSave : undefined}
            sx={{
              p: 2.5,
              borderRadius: 2,
              cursor: 'pointer',
              borderWidth: action.primary ? 2 : 1,
              borderColor: action.primary
                ? isDark ? '#d4af37' : '#2d1b4e'
                : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
              transition: 'all 0.15s ease',
              '&:hover': {
                borderColor: isDark ? '#d4af37' : '#2d1b4e',
                boxShadow: `0 0 0 3px ${isDark ? 'rgba(212,175,55,0.15)' : 'rgba(45,27,78,0.08)'}`,
              },
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: action.primary
                    ? isDark ? 'rgba(212,175,55,0.15)' : 'rgba(45,27,78,0.08)'
                    : isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                  color: action.primary
                    ? isDark ? '#d4af37' : '#2d1b4e'
                    : isDark ? '#9ca3af' : '#6b7280',
                }}
              >
                {action.icon}
              </Box>
              <Box>
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.25 }}>
                  {action.title}
                </Typography>
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {action.desc}
                </Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      <Alert
        severity={dirty ? 'warning' : 'success'}
        icon={<CheckCircleOutlineIcon fontSize="small" />}
        sx={{ borderRadius: 1.5, fontFamily: "'Inter'", fontSize: '0.8125rem' }}
      >
        {dirty
          ? 'You have unsaved changes. Click "Save Configuration" below to persist your settings.'
          : 'Your configuration is saved and up to date.'}
      </Alert>
    </Box>
  );

  // ── Render ────────────────────────────────────────────────────

  const stepContent = [StepSelectRecord, StepFieldMapping, StepSearchConfig, StepPreview, StepSave][currentStepIndex];

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 1 }}>
        <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
          Database Mapping
        </Typography>
        <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
          Configure how your church database fields are displayed and searched
        </Typography>
      </Box>

      {settingsLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={16} />
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
            Loading saved configuration...
          </Typography>
        </Box>
      )}
      {dirty && !settingsLoading && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5, fontFamily: "'Inter'", fontSize: '0.75rem', py: 0 }}>
          You have unsaved changes
        </Alert>
      )}

      {Stepper}
      {stepContent}

      {/* Navigation Footer */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 4,
          pt: 2,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          disabled={currentStepIndex === 0}
          onClick={() => goTo(currentStepIndex - 1)}
          sx={{
            fontFamily: "'Inter'",
            fontSize: '0.8125rem',
            textTransform: 'none',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
            color: isDark ? '#d1d5db' : '#4b5563',
          }}
        >
          Back
        </Button>
        {currentStepIndex < STEPS.length - 1 ? (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => goTo(currentStepIndex + 1)}
            sx={{
              fontFamily: "'Inter'",
              fontSize: '0.8125rem',
              textTransform: 'none',
              bgcolor: isDark ? '#2d1b4e' : '#2d1b4e',
              '&:hover': { bgcolor: isDark ? '#3d2b5e' : '#1d0b3e' },
            }}
          >
            Next Step
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
            disabled={saving}
            onClick={handleSave}
            sx={{
              fontFamily: "'Inter'",
              fontSize: '0.8125rem',
              textTransform: 'none',
              bgcolor: '#16a34a',
              '&:hover': { bgcolor: '#15803d' },
            }}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DatabaseMappingPage;
