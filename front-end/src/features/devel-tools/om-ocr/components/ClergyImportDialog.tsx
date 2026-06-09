/**
 * ClergyImportDialog — import parish clergy from CSV, Excel, JSON, OCR image, or pasted text.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconDownload,
  IconFileUpload,
  IconPhotoScan,
  IconClipboardText,
} from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
  CLERGY_CSV_TEMPLATE,
  CLERGY_JSON_TEMPLATE,
  type ClergyImportRow,
  parseClergyFile,
} from '../utils/clergyImport';
import { formatClergyDate } from '../utils/clergyDates';

type ImportMode = 'file' | 'ocr' | 'paste';

interface ClergyImportDialogProps {
  open: boolean;
  onClose: () => void;
  churchId: number;
  onImported: () => void;
}

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ClergyImportDialog: React.FC<ClergyImportDialogProps> = ({
  open,
  onClose,
  churchId,
  onImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ImportMode>('file');
  const [rows, setRows] = useState<ClergyImportRow[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [defaultRole, setDefaultRole] = useState('Rector');
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const clearPreview = () => {
    setRows([]);
    setStatus(null);
  };

  const resetPreview = () => {
    clearPreview();
    setError(null);
  };

  const setPreviewRows = (parsed: ClergyImportRow[], source: string) => {
    setRows(parsed.map((r) => ({ ...r, selected: true })));
    setStatus(parsed.length
      ? `Parsed ${parsed.length} clergy record${parsed.length === 1 ? '' : 's'} from ${source}. Review names and dates before importing — OCR column layouts often misalign service dates.`
      : 'No clergy records detected. Check format or try pasted/OCR text.');
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseClergyFile(file, firstRowIsHeader, defaultRole);
      setPreviewRows(parsed, file.name);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
      clearPreview();
    } finally {
      setLoading(false);
    }
  }, [defaultRole, firstRowIsHeader]);

  const handleOcrImage = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('default_role', defaultRole);
      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/rules/config/entities/ocr-extract`,
        formData,
        { timeout: 120000 },
      );
      const parsed: ClergyImportRow[] = (res?.rows || []).map((r: ClergyImportRow) => ({
        ...r,
        selected: true,
      }));
      setOcrText(res?.text || '');
      if (!parsed.length && res?.text) {
        setError('OCR text was extracted but no clergy rows were detected. Switch to Paste text to edit the extracted text, or try a clearer photo.');
      }
      setPreviewRows(parsed, 'OCR image');
    } catch (err: any) {
      const status = err.response?.status ?? err.status;
      const msg = err.response?.data?.error || err.message || 'OCR extraction failed';
      if (status === 403) {
        setError('Access denied for this parish. Select a church you manage, or sign in as an admin.');
      } else if (status === 401) {
        setError('Session expired — refresh the page and sign in again.');
      } else {
        setError(msg);
      }
      clearPreview();
    } finally {
      setLoading(false);
    }
  }, [churchId, defaultRole]);

  const handleParsePaste = useCallback(async () => {
    if (!pasteText.trim()) {
      setError('Paste roster text first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.post(`/api/church/${churchId}/ocr/rules/config/entities/parse`, {
        text: pasteText,
        default_role: defaultRole,
      });
      const parsed: ClergyImportRow[] = (res?.rows || []).map((r: ClergyImportRow) => ({
        ...r,
        selected: true,
      }));
      setPreviewRows(parsed, 'pasted text');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to parse text');
      clearPreview();
    } finally {
      setLoading(false);
    }
  }, [churchId, defaultRole, pasteText]);

  const toggleRow = (index: number) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));
  };

  const toggleAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const selectedRows = rows.filter((r) => r.selected !== false);

  const handleImport = async () => {
    if (!selectedRows.length) {
      setError('Select at least one row to import');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const res: any = await apiClient.post(`/api/church/${churchId}/ocr/rules/config/entities/bulk`, {
        entities: selectedRows.map(({ selected, warnings, ...rest }) => rest),
        skip_duplicates: skipDuplicates,
        default_role: defaultRole,
      });
      setStatus(res?.message || `Imported ${res?.created || 0} records`);
      onImported();
      if ((res?.created || 0) > 0) {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setPasteText('');
    setOcrText('');
    setError(null);
    setStatus(null);
    onClose();
  };

  const modeIndex = mode === 'file' ? 0 : mode === 'ocr' ? 1 : 2;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Parish Clergy</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Import clergy tenures from a spreadsheet, JSON file, OCR scan of a parish roster (e.g. &quot;Our Parish Rectors&quot;), or pasted text.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            size="small"
            label="Default role"
            value={defaultRole}
            onChange={(e) => setDefaultRole(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <FormControlLabel
            control={<Checkbox checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} size="small" />}
            label="Skip duplicates"
          />
        </Stack>

        <Tabs
          value={modeIndex}
          onChange={(_, v) => {
            const modes: ImportMode[] = ['file', 'ocr', 'paste'];
            setMode(modes[v]);
            resetPreview();
          }}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
        >
          <Tab icon={<IconFileUpload size={18} />} iconPosition="start" label="File" sx={{ textTransform: 'none' }} />
          <Tab icon={<IconPhotoScan size={18} />} iconPosition="start" label="OCR image" sx={{ textTransform: 'none' }} />
          <Tab icon={<IconClipboardText size={18} />} iconPosition="start" label="Paste text" sx={{ textTransform: 'none' }} />
        </Tabs>

        <TabPanel value={modeIndex} index={0}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconDownload size={16} />}
                onClick={() => downloadTextFile('clergy-template.csv', CLERGY_CSV_TEMPLATE, 'text/csv')}
              >
                CSV template
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconDownload size={16} />}
                onClick={() => downloadTextFile('clergy-template.json', CLERGY_JSON_TEMPLATE, 'application/json')}
              >
                JSON template
              </Button>
            </Stack>
            <FormControlLabel
              control={<Checkbox checked={firstRowIsHeader} onChange={(e) => setFirstRowIsHeader(e.target.checked)} size="small" />}
              label="First row is column headers (CSV / Excel)"
            />
            <Box
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: 'action.hover',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Typography variant="body2" color="text.secondary">
                Drop a CSV, Excel (.xlsx), or JSON file here, or click to browse
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".csv,.tsv,.txt,.xlsx,.xls,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = '';
                }}
              />
            </Box>
          </Stack>
        </TabPanel>

        <TabPanel value={modeIndex} index={1}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Upload a photo or scan of a parish clergy list. OCR will extract names and service date ranges automatically.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<IconPhotoScan size={18} />}
              onClick={() => ocrInputRef.current?.click()}
              disabled={loading}
            >
              {loading ? 'Processing…' : 'Choose image'}
            </Button>
            <input
              ref={ocrInputRef}
              type="file"
              hidden
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleOcrImage(file);
                e.target.value = '';
              }}
            />
            {ocrText && (
              <TextField
                multiline
                minRows={4}
                maxRows={8}
                size="small"
                label="Extracted OCR text"
                value={ocrText}
                InputProps={{ readOnly: true }}
              />
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={modeIndex} index={2}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Paste OCR output or a typed roster (e.g. numbered lines with names and date ranges).
            </Typography>
            <TextField
              multiline
              minRows={6}
              maxRows={12}
              size="small"
              placeholder={'1. Fr. Andrew Slepecky Aug. 1916 — Feb. 1917\n2. Fr. Constantine Suchostovsky Feb. 1917 — Nov. 1917'}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <Button variant="outlined" onClick={handleParsePaste} disabled={loading || !pasteText.trim()}>
              {loading ? 'Parsing…' : 'Parse text'}
            </Button>
          </Stack>
        </TabPanel>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Processing…</Typography>
          </Stack>
        )}

        {status && <Alert severity={rows.length ? 'success' : 'warning'} sx={{ mt: 2 }}>{status}</Alert>}

        {rows.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Preview ({selectedRows.length} of {rows.length} selected)
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={selectedRows.length === rows.length}
                    indeterminate={selectedRows.length > 0 && selectedRows.length < rows.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                }
                label="Select all"
              />
            </Stack>
            <TableContainer sx={{ maxHeight: 280, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={`${row.canonical_value}-${i}`} hover selected={row.selected !== false}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={row.selected !== false} onChange={() => toggleRow(i)} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{row.canonical_value}</TableCell>
                      <TableCell>{row.role || '—'}</TableCell>
                      <TableCell>{formatClergyDate(row.active_from) || '—'}</TableCell>
                      <TableCell>{formatClergyDate(row.active_to) || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.source_notes || (row.warnings?.length ? row.warnings.join('; ') : '—')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={importing || !selectedRows.length}
        >
          {importing ? 'Importing…' : `Import ${selectedRows.length || ''} selected`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClergyImportDialog;
