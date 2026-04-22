/**
 * Layout Template Editor — Visual editor for OCR layout templates.
 *
 * Route:  /devel/ocr-studio/layout-templates
 *
 * Supports multiple extraction modes:
 * - Tabular:    Column boundaries for ledger-style pages
 * - Form:       Anchor-based extraction for single-record forms
 * - Multi-Form: Record regions + anchor extraction (N records per page)
 * - Auto:       Try anchors first, fall back to generic table
 */

import { apiClient } from '@/shared/lib/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import {
    IconDeviceFloppy,
    IconLayout,
    IconPlayerPlay,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
import AnchorFieldEditor, { type AnchorFieldConfig } from '../components/AnchorFieldEditor';
import ColumnBoundaryEditor, {
    type ColumnBand,
    type FractionalBBox
} from '../components/ColumnBoundaryEditor';
import OcrStudioNav from '../components/OcrStudioNav';

// ── Types ────────────────────────────────────────────────────────────────────

type ExtractionMode = 'tabular' | 'form' | 'multi_form' | 'auto';

interface TemplateField {
  name: string;
  key: string;
  field_type: string;
  column_index: number;
  sort_order: number;
  anchor_phrases?: string[] | null;
  anchor_direction?: 'below' | 'right' | 'auto' | null;
  search_zone?: any;
}

interface LayoutTemplate {
  id: number;
  name: string;
  description: string | null;
  record_type: string;
  extraction_mode?: ExtractionMode;
  column_bands: ColumnBand[] | null;
  header_y_threshold: number;
  preview_job_id: number | null;
  is_default: number;
  church_id: number | null;
  record_regions: FractionalBBox[] | null;
  fields?: TemplateField[];
  field_count?: number;
  created_at: string;
  updated_at: string;
}

interface JobOption {
  id: number;
  filename: string;
  church_name: string;
  record_type: string;
}

interface PreviewRow {
  row_index: number;
  type: string;
  cells: Array<{
    column_index: number;
    column_key?: string;
    content: string;
    confidence?: number | null;
    token_count?: number;
  }>;
}

const RECORD_TYPES = ['marriage', 'baptism', 'funeral', 'custom'];

const EXTRACTION_MODES: Array<{ value: ExtractionMode; label: string; desc: string }> = [
  { value: 'tabular', label: 'Tabular', desc: 'Column bands for ledger pages' },
  { value: 'form', label: 'Form', desc: 'Single record per page (anchors)' },
  { value: 'multi_form', label: 'Multi-Form', desc: 'N records per page (regions + anchors)' },
  { value: 'auto', label: 'Auto', desc: 'Try anchors first, fall back to table' },
];

const LayoutTemplateEditorPage: React.FC = () => {
  const theme = useTheme();

  // setFields uses updater fn pattern — keep standalone
  const [fields, setFields] = useState<TemplateField[]>([]);
  // toast kept standalone for clarity
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' | 'info' } | null>(null);

  // ── Editor bucket (template list + form fields) ──────────────────────────
  const [editor, setEditor] = useState<{
    templates: LayoutTemplate[];
    selectedId: number | null;
    loading: boolean;
    name: string;
    description: string;
    recordType: string;
    extractionMode: ExtractionMode;
    columnBands: ColumnBand[];
    headerY: number;
    isDefault: boolean;
    recordRegions: FractionalBBox[];
  }>({
    templates: [],
    selectedId: null,
    loading: false,
    name: '',
    description: '',
    recordType: 'marriage',
    extractionMode: 'tabular',
    columnBands: [],
    headerY: 0.15,
    isDefault: false,
    recordRegions: [],
  });
  const setEditorField = useCallback(<K extends keyof typeof editor>(key: K, value: typeof editor[K]) => {
    setEditor(prev => ({ ...prev, [key]: value }));
  }, []);
  const setTemplates = useCallback((v: LayoutTemplate[]) => setEditorField('templates', v), [setEditorField]);
  const setSelectedId = useCallback((v: number | null) => setEditorField('selectedId', v), [setEditorField]);
  const setLoading = useCallback((v: boolean) => setEditorField('loading', v), [setEditorField]);
  const setName = useCallback((v: string) => setEditorField('name', v), [setEditorField]);
  const setDescription = useCallback((v: string) => setEditorField('description', v), [setEditorField]);
  const setRecordType = useCallback((v: string) => setEditorField('recordType', v), [setEditorField]);
  const setExtractionMode = useCallback((v: ExtractionMode) => setEditorField('extractionMode', v), [setEditorField]);
  const setColumnBands = useCallback((v: ColumnBand[]) => setEditorField('columnBands', v), [setEditorField]);
  const setHeaderY = useCallback((v: number) => setEditorField('headerY', v), [setEditorField]);
  const setIsDefault = useCallback((v: boolean) => setEditorField('isDefault', v), [setEditorField]);
  const setRecordRegions = useCallback((v: FractionalBBox[]) => setEditorField('recordRegions', v), [setEditorField]);
  const { templates, selectedId, loading, name, description, recordType, extractionMode, columnBands, headerY, isDefault, recordRegions } = editor;

  // ── Reference + preview + save bucket ────────────────────────────────────
  const [aux, setAux] = useState<{
    refJobId: number | null;
    refJobs: JobOption[];
    imageUrl: string | null;
    previewRows: PreviewRow[];
    previewHeaders: Array<{ column_key: string; text: string }>;
    previewing: boolean;
    saving: boolean;
    dirty: boolean;
  }>({
    refJobId: null,
    refJobs: [],
    imageUrl: null,
    previewRows: [],
    previewHeaders: [],
    previewing: false,
    saving: false,
    dirty: false,
  });
  const setAuxField = useCallback(<K extends keyof typeof aux>(key: K, value: typeof aux[K]) => {
    setAux(prev => ({ ...prev, [key]: value }));
  }, []);
  const setRefJobId = useCallback((v: number | null) => setAuxField('refJobId', v), [setAuxField]);
  const setRefJobs = useCallback((v: JobOption[]) => setAuxField('refJobs', v), [setAuxField]);
  const setImageUrl = useCallback((v: string | null) => setAuxField('imageUrl', v), [setAuxField]);
  const setPreviewRows = useCallback((v: PreviewRow[]) => setAuxField('previewRows', v), [setAuxField]);
  const setPreviewHeaders = useCallback((v: Array<{ column_key: string; text: string }>) => setAuxField('previewHeaders', v), [setAuxField]);
  const setPreviewing = useCallback((v: boolean) => setAuxField('previewing', v), [setAuxField]);
  const setSaving = useCallback((v: boolean) => setAuxField('saving', v), [setAuxField]);
  const setDirty = useCallback((v: boolean) => setAuxField('dirty', v), [setAuxField]);
  const { refJobId, refJobs, imageUrl, previewRows, previewHeaders, previewing, saving, dirty } = aux;

  const isFormMode = extractionMode === 'form' || extractionMode === 'multi_form' || extractionMode === 'auto';

  // ── Load templates ────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/api/ocr/layout-templates');
      const data = res?.data ?? res;
      setTemplates(data.templates || []);
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to load templates', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Load reference jobs for job picker ─────────────────────────────────────

  const fetchRefJobs = useCallback(async () => {
    try {
      const res: any = await apiClient.get(`/api/ocr/table-jobs?pageSize=100&record_type=${recordType}`);
      const data = res?.data ?? res;
      setRefJobs(
        (data.rows || []).map((j: any) => ({
          id: j.id,
          filename: j.filename,
          church_name: j.church_name,
          record_type: j.record_type,
        })),
      );
    } catch { /* ignore */ }
  }, [recordType]);

  useEffect(() => { fetchRefJobs(); }, [fetchRefJobs]);

  // ── Load image when ref job changes ────────────────────────────────────────

  useEffect(() => {
    if (refJobId) {
      const job = refJobs.find((j) => j.id === refJobId);
      if (job) {
        setImageUrl(`/api/church/46/ocr/jobs/${refJobId}/image`);
      } else {
        setImageUrl(null);
      }
    } else {
      setImageUrl(null);
    }
  }, [refJobId, refJobs]);

  // ── Select a template ──────────────────────────────────────────────────────

  const handleSelectTemplate = useCallback(
    async (id: number | null) => {
      setSelectedId(id);
      setPreviewRows([]);
      setPreviewHeaders([]);

      if (!id) {
        setName('');
        setDescription('');
        setRecordType('marriage');
        setExtractionMode('tabular');
        setColumnBands([]);
        setHeaderY(0.15);
        setIsDefault(false);
        setFields([]);
        setRecordRegions([]);
        setRefJobId(null);
        setDirty(false);
        return;
      }

      try {
        const res: any = await apiClient.get(`/api/ocr/layout-templates/${id}`);
        const data = res?.data ?? res;
        const tpl = data.template;
        setName(tpl.name || '');
        setDescription(tpl.description || '');
        setRecordType(tpl.record_type || 'marriage');
        setExtractionMode(tpl.extraction_mode || 'tabular');
        setColumnBands(tpl.column_bands || []);
        setHeaderY(tpl.header_y_threshold || 0.15);
        setIsDefault(!!tpl.is_default);
        setFields(tpl.fields || []);
        setRecordRegions(tpl.record_regions || []);
        setRefJobId(tpl.preview_job_id || null);
        setDirty(false);
      } catch (e: any) {
        setToast({ msg: e?.response?.data?.error || 'Failed to load template', severity: 'error' });
      }
    },
    [],
  );

  // ── Sync fields with column bands (tabular mode only) ──────────────────────

  const handleBandsChange = useCallback(
    (bands: ColumnBand[]) => {
      setColumnBands(bands);
      setDirty(true);
      if (extractionMode === 'tabular') {
        setFields((prev) => {
          const newFields: TemplateField[] = [];
          for (let i = 0; i < bands.length; i++) {
            const existing = prev.find((f) => f.column_index === i);
            newFields.push({
              name: existing?.name || `Column ${i + 1}`,
              key: existing?.key || `col_${i + 1}`,
              field_type: existing?.field_type || 'text',
              column_index: i,
              sort_order: i,
            });
          }
          return newFields;
        });
      }
    },
    [extractionMode],
  );

  const handleHeaderYChange = useCallback((y: number) => {
    setHeaderY(y);
    setDirty(true);
  }, []);

  const handleRecordRegionsChange = useCallback((regions: FractionalBBox[]) => {
    setRecordRegions(regions);
    setDirty(true);
  }, []);

  const handleFieldNameChange = useCallback((index: number, newName: string) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, name: newName, key: newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') } : f,
      ),
    );
    setDirty(true);
  }, []);

  const handleAnchorFieldsChange = useCallback((newFields: AnchorFieldConfig[]) => {
    setFields(newFields);
    setDirty(true);
  }, []);

  const handleExtractionModeChange = useCallback((_: any, newMode: ExtractionMode | null) => {
    if (newMode) {
      setExtractionMode(newMode);
      setDirty(true);
    }
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setToast({ msg: 'Template name is required', severity: 'error' });
      return;
    }
    if (extractionMode === 'tabular' && columnBands.length === 0) {
      setToast({ msg: 'Add at least one column boundary for tabular mode', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        record_type: recordType,
        extraction_mode: extractionMode,
        column_bands: columnBands.length > 0 ? columnBands : null,
        header_y_threshold: headerY,
        preview_job_id: refJobId,
        is_default: isDefault,
        fields,
        record_regions: recordRegions.length > 0 ? recordRegions : null,
      };

      if (selectedId) {
        await apiClient.put(`/api/ocr/layout-templates/${selectedId}`, payload);
        setToast({ msg: 'Template saved', severity: 'success' });
      } else {
        const res: any = await apiClient.post('/api/ocr/layout-templates', payload);
        const data = res?.data ?? res;
        setSelectedId(data.template_id);
        setToast({ msg: 'Template created', severity: 'success' });
      }

      setDirty(false);
      fetchTemplates();
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to save', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [name, description, recordType, extractionMode, columnBands, headerY, refJobId, isDefault, fields, recordRegions, selectedId, fetchTemplates]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this layout template?')) return;

    try {
      await apiClient.delete(`/api/ocr/layout-templates/${selectedId}`);
      setToast({ msg: 'Template deleted', severity: 'success' });
      handleSelectTemplate(null);
      fetchTemplates();
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to delete', severity: 'error' });
    }
  }, [selectedId, fetchTemplates, handleSelectTemplate]);

  // ── Preview extraction ─────────────────────────────────────────────────────

  const handlePreview = useCallback(async () => {
    if (!selectedId || !refJobId) {
      setToast({ msg: 'Save template and select a reference job first', severity: 'error' });
      return;
    }

    setPreviewing(true);
    try {
      const res: any = await apiClient.post(`/api/ocr/layout-templates/${selectedId}/preview`, {
        job_id: refJobId,
      });
      const data = res?.data ?? res;
      const extraction = data.extraction;
      if (extraction?.tables?.length > 0) {
        const table = extraction.tables[0];
        setPreviewRows(table.rows || []);
        setPreviewHeaders(table.headers || []);
        setToast({ msg: `Preview: ${extraction.data_rows} rows, ${extraction.columns_detected} fields`, severity: 'success' });
      } else {
        setPreviewRows([]);
        setPreviewHeaders([]);
        setToast({ msg: 'No rows extracted — adjust configuration', severity: 'info' });
      }
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Preview failed', severity: 'error' });
    } finally {
      setPreviewing(false);
    }
  }, [selectedId, refJobId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  // For form-mode preview, use headers from extraction; for tabular, use fields
  const effectivePreviewHeaders = previewHeaders.length > 0
    ? previewHeaders
    : fields.map((f, i) => ({ column_key: f.key, text: f.name }));

  return (
    <PageContainer title="Layout Template Editor" description="Visual editor for OCR layout templates">
      <OcrStudioNav />
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconLayout size={24} />
            <Typography variant="h5" fontWeight={700}>Layout Template Editor</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            {dirty && <Chip label="Unsaved" color="warning" size="small" />}
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconPlus size={16} />}
              onClick={() => handleSelectTemplate(null)}
            >
              New
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconDeviceFloppy size={16} />}
              onClick={handleSave}
              disabled={saving}
            >
              Save
            </Button>
            {selectedId && (
              <Button size="small" color="error" variant="outlined" startIcon={<IconTrash size={16} />} onClick={handleDelete}>
                Delete
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Template selector + metadata */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField
                  select
                  size="small"
                  label="Template"
                  value={selectedId ?? ''}
                  onChange={(e) => handleSelectTemplate(e.target.value ? Number(e.target.value) : null)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="">-- New Template --</MenuItem>
                  {templates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} {t.is_default ? '(default)' : ''} — {t.record_type}
                      {t.extraction_mode && t.extraction_mode !== 'tabular' ? ` [${t.extraction_mode}]` : ''}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setDirty(true); }}
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  select
                  size="small"
                  label="Record Type"
                  value={recordType}
                  onChange={(e) => { setRecordType(e.target.value); setDirty(true); }}
                  sx={{ minWidth: 140 }}
                >
                  {RECORD_TYPES.map((rt) => (
                    <MenuItem key={rt} value={rt}>{rt}</MenuItem>
                  ))}
                </TextField>
                <Autocomplete
                  size="small"
                  options={refJobs}
                  getOptionLabel={(o) => `#${o.id} — ${o.filename || 'unnamed'} (${o.church_name})`}
                  value={refJobs.find((j) => j.id === refJobId) || null}
                  onChange={(_, v) => { setRefJobId(v?.id ?? null); setDirty(true); }}
                  renderInput={(params) => <TextField {...params} label="Reference Job" placeholder="Select a job for image" />}
                  sx={{ minWidth: 300 }}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                />
              </Stack>

              {/* Extraction Mode selector */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  Mode:
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  value={extractionMode}
                  exclusive
                  onChange={handleExtractionModeChange}
                >
                  {EXTRACTION_MODES.map((m) => (
                    <ToggleButton key={m.value} value={m.value}>
                      <Tooltip title={m.desc}>
                        <span>{m.label}</span>
                      </Tooltip>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Main editor area: image + fields config */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 500, height: 'calc(100vh - 280px)' }}>
          {/* Left: Column Boundary Editor (always shown — useful for record regions in multi_form too) */}
          <Box sx={{ flex: 2, minHeight: 400 }}>
            <Card sx={{ height: '100%' }}>
              {imageUrl ? (
                <ColumnBoundaryEditor
                  imageUrl={imageUrl}
                  columnBands={extractionMode === 'tabular' ? columnBands : []}
                  headerY={extractionMode === 'tabular' ? headerY : 0}
                  onBandsChange={handleBandsChange}
                  onHeaderYChange={handleHeaderYChange}
                  recordRegions={recordRegions}
                  onRecordRegionsChange={handleRecordRegionsChange}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
                  <Typography color="text.secondary">
                    Select a reference job to load an image for visual editing.
                  </Typography>
                </Box>
              )}
            </Card>
          </Box>

          {/* Right: Fields config + preview */}
          <Box sx={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Fields panel — varies by mode */}
            <Card sx={{ mb: 2, flexShrink: 0, maxHeight: '50%', overflow: 'auto' }}>
              <CardContent>
                {isFormMode ? (
                  /* Anchor-based field editor */
                  <AnchorFieldEditor
                    fields={fields as AnchorFieldConfig[]}
                    onChange={handleAnchorFieldsChange}
                    recordType={recordType}
                  />
                ) : (
                  /* Tabular column field list */
                  <>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                      Column Fields ({fields.length})
                    </Typography>
                    {fields.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Add column boundaries on the image to define columns.
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {fields.map((field, i) => (
                          <Stack key={i} direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={i + 1}
                              size="small"
                              sx={{ minWidth: 28, fontWeight: 700 }}
                            />
                            <TextField
                              size="small"
                              value={field.name}
                              onChange={(e) => handleFieldNameChange(i, e.target.value)}
                              fullWidth
                              placeholder={`Column ${i + 1}`}
                            />
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Preview extraction */}
            <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Preview Extraction</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={previewing ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                    onClick={handlePreview}
                    disabled={previewing || !selectedId || !refJobId}
                  >
                    Preview
                  </Button>
                </Stack>

                {!selectedId && (
                  <Typography variant="body2" color="text.secondary">Save the template first to enable preview.</Typography>
                )}

                {previewRows.length > 0 && (
                  <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, mt: 1, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem' }}>Row</TableCell>
                          {effectivePreviewHeaders.map((h, i) => (
                            <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                              {h.text || h.column_key}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewRows
                          .filter((r) => !r.type || r.type === 'row')
                          .slice(0, 20)
                          .map((row) => (
                            <TableRow key={row.row_index}>
                              <TableCell sx={{ fontSize: '0.7rem' }}>{row.row_index}</TableCell>
                              {row.cells.map((cell, ci) => (
                                <TableCell key={ci} sx={{ fontSize: '0.7rem', maxWidth: 150 }}>
                                  <Tooltip title={cell.content || 'empty'}>
                                    <Typography variant="body2" fontSize="0.7rem" noWrap>
                                      {cell.content || <em style={{ color: theme.palette.text.disabled }}>—</em>}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {previewRows.length === 0 && selectedId && refJobId && !previewing && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Click Preview to test extraction with current configuration.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>

        {/* Toast */}
        <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast.msg}</Alert> : undefined}
        </Snackbar>
      </Box>
    </PageContainer>
  );
};

export default LayoutTemplateEditorPage;
