/**
 * DatabaseMappingPage — 5-step wizard for configuring database field mappings.
 *
 * Steps: Select Record Type → Field Mapping → Search Config → Preview → Save & Apply
 * URL-driven step navigation via :step param.
 */

import { useSnackbar } from '@/hooks/useSnackbar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControlLabel,
    Paper,
    Radio,
    Slider,
    Snackbar,
    Switch,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/utils/axiosInstance';
import { useChurch } from '@/context/ChurchContext';
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

// ── Field metadata (labels / grouping / sensible defaults) ───────
// The set of columns shown is driven by the LIVE database schema (fetched
// per church from /api/parish-settings/:churchId/record-columns/:type), so
// this page can never drift from the real tables. This map only *decorates*
// known columns with a friendly display name, a UI group, and sensible
// default toggles. Any real column not listed here still appears — with a
// humanized label in the "Other" group — so newly added DB columns surface
// automatically.

interface FieldMeta {
  displayName?: string;
  group?: string;
  visible?: boolean;
  sortable?: boolean;
  searchWeight?: number;
}

const FIELD_META: Record<string, Record<string, FieldMeta>> = {
  baptism: {
    first_name:     { displayName: 'First Name', group: 'Personal Information', visible: true, sortable: true, searchWeight: 8 },
    last_name:      { displayName: 'Last Name', group: 'Personal Information', visible: true, sortable: true, searchWeight: 10 },
    birth_date:     { displayName: 'Date of Birth', group: 'Personal Information', visible: false, sortable: true, searchWeight: 3 },
    birthplace:     { displayName: 'Birthplace', group: 'Personal Information', visible: false, sortable: false, searchWeight: 4 },
    reception_date: { displayName: 'Baptism Date', group: 'Sacrament Details', visible: true, sortable: true, searchWeight: 3 },
    entry_type:     { displayName: 'Entry Type', group: 'Sacrament Details', visible: false, sortable: false, searchWeight: 2 },
    clergy:         { displayName: 'Officiating Priest', group: 'Clergy', visible: true, sortable: false, searchWeight: 6 },
    sponsors:       { displayName: 'Sponsors', group: 'Sponsors', visible: false, sortable: false, searchWeight: 5 },
    parents:        { displayName: 'Parents', group: 'Family', visible: false, sortable: false, searchWeight: 5 },
  },
  marriage: {
    fname_groom: { displayName: "Groom's First Name", group: 'Groom Information', visible: true, sortable: true, searchWeight: 8 },
    lname_groom: { displayName: "Groom's Last Name", group: 'Groom Information', visible: true, sortable: true, searchWeight: 10 },
    parentsg:    { displayName: "Groom's Parents", group: 'Groom Information', visible: false, sortable: false, searchWeight: 4 },
    fname_bride: { displayName: "Bride's First Name", group: 'Bride Information', visible: true, sortable: true, searchWeight: 8 },
    lname_bride: { displayName: "Bride's Last Name", group: 'Bride Information', visible: true, sortable: true, searchWeight: 10 },
    parentsb:    { displayName: "Bride's Parents", group: 'Bride Information', visible: false, sortable: false, searchWeight: 4 },
    mdate:       { displayName: 'Marriage Date', group: 'Sacrament Details', visible: true, sortable: true, searchWeight: 3 },
    mlicense:    { displayName: 'Marriage License', group: 'Sacrament Details', visible: false, sortable: false, searchWeight: 2 },
    clergy:      { displayName: 'Officiating Priest', group: 'Clergy', visible: true, sortable: false, searchWeight: 6 },
    witness:     { displayName: 'Witnesses', group: 'Witnesses', visible: false, sortable: false, searchWeight: 5 },
  },
  funeral: {
    name:            { displayName: "Deceased's First Name", group: 'Personal Information', visible: true, sortable: true, searchWeight: 8 },
    lastname:        { displayName: "Deceased's Last Name", group: 'Personal Information', visible: true, sortable: true, searchWeight: 10 },
    age:             { displayName: 'Age at Death', group: 'Personal Information', visible: false, sortable: true, searchWeight: 2 },
    deceased_date:   { displayName: 'Date of Death', group: 'Sacrament Details', visible: true, sortable: true, searchWeight: 4 },
    burial_date:     { displayName: 'Burial Date', group: 'Sacrament Details', visible: true, sortable: true, searchWeight: 3 },
    burial_location: { displayName: 'Burial Location', group: 'Sacrament Details', visible: false, sortable: false, searchWeight: 4 },
    clergy:          { displayName: 'Officiating Priest', group: 'Clergy', visible: true, sortable: false, searchWeight: 6 },
  },
};

// Internal/system columns — never shown as mappable record fields.
const EXCLUDED_COLUMNS = new Set([
  'id', 'source_scan_id', 'church_id', 'ocr_confidence',
  'verified_by', 'verified_at', 'created_at', 'updated_at', 'deleted_at',
]);

interface ColumnInfo {
  name: string;
  type?: string;
}

/** snake_case → Title Case fallback label (e.g. burial_location → Burial Location). */
function humanize(col: string): string {
  return col
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Build the field list for a record type from its REAL columns. */
function buildFieldsFromColumns(recordType: string, columns: ColumnInfo[]): FieldDef[] {
  const meta = FIELD_META[recordType] || {};
  return columns
    .filter((c) => !EXCLUDED_COLUMNS.has(c.name.toLowerCase()))
    .map((c) => {
      const m = meta[c.name] || {};
      return {
        column: c.name,
        displayName: m.displayName || humanize(c.name),
        group: m.group || 'Other',
        visible: m.visible ?? false,
        sortable: m.sortable ?? false,
        searchWeight: m.searchWeight ?? 5,
      };
    });
}

/**
 * Overlay a saved configuration onto the schema-derived field list. Real
 * columns are the source of truth for *which* fields exist; the saved config
 * supplies the user's per-field customizations. Saved entries for columns
 * that no longer exist are dropped; brand-new columns keep their defaults.
 */
function mergeSavedFields(base: FieldDef[], saved?: FieldDef[]): FieldDef[] {
  if (!Array.isArray(saved) || saved.length === 0) return base;
  const savedByCol = new Map(saved.map((f) => [f.column, f]));
  return base.map((f) => {
    const s = savedByCol.get(f.column);
    if (!s) return f;
    return {
      ...f,
      displayName: typeof s.displayName === 'string' && s.displayName ? s.displayName : f.displayName,
      visible: typeof s.visible === 'boolean' ? s.visible : f.visible,
      sortable: typeof s.sortable === 'boolean' ? s.sortable : f.sortable,
      searchWeight: typeof s.searchWeight === 'number' ? s.searchWeight : f.searchWeight,
    };
  });
}

/** First sortable column (fallback when choosing a default-sort column). */
function firstSortableColumn(fields: FieldDef[]): string {
  return fields.find((f) => f.sortable)?.column || fields[0]?.column || 'id';
}

// ── Mock preview data ───────────────────────────────────────────
// The Step 4 preview renders one column per *visible* field (whatever
// the user toggled on in Step 2), so sample cell values are resolved
// per-column by `samplePreviewValue` rather than being a fixed shape.

const PREVIEW_ROW_COUNT = 5;

const SAMPLE_FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emily', 'David'];
const SAMPLE_LAST_NAMES = ['Smith', 'Johnson', 'Roberts', 'Davis', 'Wilson'];
const SAMPLE_MIDDLE = ['A.', 'M.', 'J.', 'R.', 'P.'];
const SAMPLE_DATES = ['01/15/2020', '03/22/2019', '06/08/2021', '11/30/2020', '09/12/2018'];
const SAMPLE_PRIESTS = ['Fr. Michael', 'Fr. Nicholas', 'Fr. Michael', 'Fr. John', 'Fr. Nicholas'];
const SAMPLE_PLACES = ['Holy Trinity', 'St. Nicholas', 'St. George', 'Annunciation', 'St. Demetrios'];
const SAMPLE_PEOPLE = ['Maria Smith', 'Peter Johnson', 'Anna Roberts', 'George Davis', 'Helen Wilson'];
const SAMPLE_AGES = ['72', '85', '64', '91', '78'];
const SAMPLE_NOTES = ['—', 'Convert', '—', 'Transferred', '—'];

function samplePreviewValue(field: FieldDef, row: number): string {
  const c = field.column.toLowerCase();
  const i = row % PREVIEW_ROW_COUNT;
  if (c.includes('age')) return SAMPLE_AGES[i];
  if (c.includes('place') || c.includes('location') || c.includes('burial')) return SAMPLE_PLACES[i];
  if (c.includes('date') || c.includes('death')) return SAMPLE_DATES[i];
  if (c.includes('first_name')) return SAMPLE_FIRST_NAMES[i];
  if (c.includes('last_name') || c === 'maiden_name') return SAMPLE_LAST_NAMES[i];
  if (c.includes('middle')) return SAMPLE_MIDDLE[i];
  if (c.includes('priest') || c.includes('deacon') || c.includes('clergy') || c.includes('celebrant')) return SAMPLE_PRIESTS[i];
  if (c.includes('notes')) return SAMPLE_NOTES[i];
  // parents, father/mother, godparents, witnesses, generic people fields
  return SAMPLE_PEOPLE[i];
}

// ── Component ───────────────────────────────────────────────────

/** Legacy single-config shape (pre per-type storage). */
interface MappingConfig {
  selectedRecord?: string;
  fields?: FieldDef[];
  defaultSort?: string;
}

/** Field mapping persisted for one record type. */
interface TypeMapping {
  fields?: FieldDef[];
  defaultSort?: string;
}

/**
 * The 'mapping' parish-settings category — stored per record type so each type
 * keeps its own column layout. `config` is the legacy single-type blob, read as
 * a fallback for whichever type it was last saved under.
 */
interface MappingSettings {
  baptism?: TypeMapping;
  marriage?: TypeMapping;
  funeral?: TypeMapping;
  config?: MappingConfig;
}

/** Resolve the saved mapping for a record type (per-type key, else legacy). */
function savedMappingForType(s: MappingSettings | undefined, type: string): TypeMapping | undefined {
  if (!s) return undefined;
  const direct = (s as Record<string, TypeMapping | undefined>)[type];
  if (direct && Array.isArray(direct.fields)) return direct;
  if (s.config && s.config.selectedRecord === type && Array.isArray(s.config.fields)) {
    return { fields: s.config.fields, defaultSort: s.config.defaultSort };
  }
  return undefined;
}

const DatabaseMappingPage: React.FC = () => {
  const { step } = useParams<{ step?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // ── Persistence via parish settings API ─────────────────────
  const { data: savedSettings, loading: settingsLoading, saving, error: settingsError, patch: patchSettings } = useParishSettings<MappingSettings>('mapping');

  const currentStepIndex = useMemo(() => {
    if (!step) return 0;
    const idx = STEPS.findIndex((s) => s.key === step);
    return idx >= 0 ? idx : 0;
  }, [step]);

  const { activeChurchId } = useChurch();
  const churchId = activeChurchId;

  const [selectedRecord, setSelectedRecord] = useState('baptism');
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [defaultSort, setDefaultSort] = useState('last_name');
  const [dirty, setDirty] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(true);
  const [columnsError, setColumnsError] = useState<string | null>(null);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  // Cache live columns per record type, plus a one-shot guard so the saved
  // config is merged on first load only (not on every settings refresh).
  const columnsCache = useRef<Record<string, ColumnInfo[]>>({});
  const lastInitializedChurchIdRef = useRef<number | null>(null);

  // Clear column cache when churchId changes
  useEffect(() => {
    columnsCache.current = {};
  }, [churchId]);

  // Fetch the real column list for a record type (cached after first fetch).
  const fetchColumns = useCallback(async (type: string): Promise<ColumnInfo[]> => {
    if (columnsCache.current[type]) return columnsCache.current[type];
    if (!churchId) return [];
    const res = await apiClient.get<{ columns: ColumnInfo[] }>(
      `/api/parish-settings/${churchId}/record-columns/${type}`,
    );
    const cols = ((res as any)?.columns ?? []) as ColumnInfo[];
    columnsCache.current[type] = cols;
    return cols;
  }, [churchId]);

  // First load: discover the live columns for the saved (or default) record
  // type, build the field list from the real schema, and overlay any saved
  // customizations. Runs once per churchId — later type switches go through
  // handleSelectRecord.
  useEffect(() => {
    if (settingsLoading || !churchId || lastInitializedChurchIdRef.current === churchId) return;
    let cancelled = false;
    (async () => {
      setColumnsLoading(true);
      setColumnsError(null);
      try {
        const type = savedSettings?.config?.selectedRecord || 'baptism';
        const saved = savedMappingForType(savedSettings, type);
        const cols = await fetchColumns(type);
        if (cancelled) return;
        const merged = mergeSavedFields(buildFieldsFromColumns(type, cols), saved?.fields);
        const validCols = new Set(merged.map((f) => f.column));
        lastInitializedChurchIdRef.current = churchId;
        setSelectedRecord(type);
        setFields(merged);
        setDefaultSort(
          saved?.defaultSort && validCols.has(saved.defaultSort)
            ? saved.defaultSort
            : firstSortableColumn(merged),
        );
      } catch (err: any) {
        if (!cancelled) setColumnsError(err?.message || 'Failed to load database columns');
      } finally {
        if (!cancelled) setColumnsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [settingsLoading, savedSettings, churchId, fetchColumns]);

  const goTo = (idx: number) => {
    if (idx === 0) navigate(BASE);
    else navigate(`${BASE}/${STEPS[idx].key}`);
  };

  const markDirty = useCallback(() => setDirty(true), []);

  // Switching record type loads that type's real columns and rebuilds the
  // field list. If the saved config is for the newly selected type, its
  // customizations are reapplied; otherwise the schema defaults are used.
  const handleSelectRecord = useCallback(async (newType: string) => {
    if (newType === selectedRecord) return;
    setSelectedRecord(newType);
    setColumnsLoading(true);
    setColumnsError(null);
    try {
      const cols = await fetchColumns(newType);
      const saved = savedMappingForType(savedSettings, newType);
      const base = buildFieldsFromColumns(newType, cols);
      const merged = mergeSavedFields(base, saved?.fields);
      const validCols = new Set(merged.map((f) => f.column));
      setFields(merged);
      setDefaultSort(saved?.defaultSort && validCols.has(saved.defaultSort) ? saved.defaultSort : firstSortableColumn(merged));
      markDirty();
    } catch (err: any) {
      setColumnsError(err?.message || 'Failed to load database columns');
    } finally {
      setColumnsLoading(false);
    }
  }, [selectedRecord, savedSettings, fetchColumns, markDirty]);

  const updateField = (column: string, key: keyof FieldDef, value: any) => {
    setFields((prev) => prev.map((f) => (f.column === column ? { ...f, [key]: value } : f)));
    markDirty();
  };

  const handleSave = async () => {
    // Persist under this record type's key so other types keep their layouts.
    const ok = await patchSettings({ [selectedRecord]: { fields, defaultSort } } as Partial<MappingSettings>);
    if (ok) {
      setDirty(false);
      showSnackbar('Configuration saved successfully', 'success');
    } else {
      showSnackbar(settingsError || 'Failed to save configuration', 'error');
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
              onClick={() => handleSelectRecord(rt.id)}
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
  // The preview table shows exactly the columns marked visible in Step 2.
  const visibleFields = fields.filter((f) => f.visible);

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
                {visibleFields.length === 0 ? (
                  <th
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
                    No visible columns
                  </th>
                ) : (
                  visibleFields.map((f) => (
                    <th
                      key={f.column}
                      style={{
                        padding: '10px 20px',
                        textAlign: 'left',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: isDark ? '#9ca3af' : '#6b7280',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.displayName}
                      {f.column === defaultSort && (
                        <Chip label="Default" size="small" sx={{ ml: 1, height: 18, fontSize: '0.625rem', bgcolor: isDark ? 'rgba(45,27,78,0.3)' : 'rgba(45,27,78,0.08)', color: isDark ? '#d4af37' : '#2d1b4e' }} />
                      )}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {visibleFields.length === 0 ? (
                <tr>
                  <td style={{ padding: '14px 20px', fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Enable at least one column in the Field Mapping step to preview it here.
                  </td>
                </tr>
              ) : (
                Array.from({ length: PREVIEW_ROW_COUNT }).map((_, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < PREVIEW_ROW_COUNT - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
                    }}
                  >
                    {visibleFields.map((f, ci) => (
                      <td
                        key={f.column}
                        style={{
                          padding: '10px 20px',
                          fontFamily: "'Inter'",
                          fontSize: '0.8125rem',
                          whiteSpace: 'nowrap',
                          color: ci < 2 ? (isDark ? '#f3f4f6' : '#111827') : (isDark ? '#9ca3af' : '#6b7280'),
                        }}
                      >
                        {samplePreviewValue(f, i)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
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
      {columnsError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, fontFamily: "'Inter'", fontSize: '0.75rem' }}>
          {columnsError}
        </Alert>
      )}

      {Stepper}
      {columnsLoading && fields.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : stepContent}

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
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={closeSnackbar}
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
