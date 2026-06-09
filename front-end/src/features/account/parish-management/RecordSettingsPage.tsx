/**
 * RecordSettingsPage — Configure ledger table headers and visible fields
 * for baptism, marriage, and funeral records (per church).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import churchService from '@/shared/lib/churchService';
import OcrChurchSelector from '@/features/devel-tools/om-ocr/components/OcrChurchSelector';
import OcrStudioNav from '@/features/devel-tools/om-ocr/components/OcrStudioNav';
import { useOcrChurchSelector } from '@/features/devel-tools/om-ocr/hooks/useOcrChurchSelector';
import {
  type ChurchRecordFieldConfig,
  type ChurchRecordFieldRow,
  type RecordTypeKey,
} from '@/features/devel-tools/om-ocr/config/recordFields';
import {
  fetchChurchRecordFields,
  saveChurchRecordFields,
} from '@/features/devel-tools/om-ocr/utils/fieldConfig';
import PreviewBanner from './PreviewBanner';

const RECORD_TYPES: Array<{ key: RecordTypeKey; label: string }> = [
  { key: 'baptism', label: 'Baptism' },
  { key: 'marriage', label: 'Marriage' },
  { key: 'funeral', label: 'Funeral' },
];

function reorderRows(rows: ChurchRecordFieldRow[], from: number, dir: -1 | 1): ChurchRecordFieldRow[] {
  const to = from + dir;
  if (to < 0 || to >= rows.length) return rows;
  const next = [...rows];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((r, idx) => ({ ...r, sortOrder: idx }));
}

const RecordSettingsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { activeChurchId, churchMetadata, setActiveChurchId } = useChurch();
  const { user, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isOcrStudio = location.pathname.includes('/devel/ocr-studio');
  const { selectedChurchId: studioChurchId } = useOcrChurchSelector();

  // Church selector for super_admin (non-OCR-studio routes)
  const [churches, setChurches] = useState<Array<{ id: number; name: string }>>([]);
  const churchParam = searchParams.get('church') || searchParams.get('church_id');

  useEffect(() => {
    if (!isSuperAdmin()) return;
    (async () => {
      try {
        let list: any[] = await churchService.fetchChurches();
        if (list.length === 0) {
          const fallback: any = await apiClient.get('/api/churches');
          const body = fallback?.data ?? fallback;
          const inner = body?.data ?? body;
          list = inner?.churches || (Array.isArray(inner) ? inner : []);
        }
        const sorted = (Array.isArray(list) ? list : []).sort((a: any, b: any) =>
          (a.church_name || a.name || '').localeCompare(b.church_name || b.name || '')
        );
        setChurches(sorted);
        // Auto-select first church if none is selected
        if (!activeChurchId && sorted.length > 0) {
          const firstId = churchParam ? Number(churchParam) : sorted[0].id;
          setActiveChurchId(firstId);
          setSearchParams({ church: String(firstId) });
        }
      } catch (err) {
        console.error('Failed to load churches:', err);
      }
    })();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isOcrStudio || !studioChurchId) return;
    if (activeChurchId !== studioChurchId) setActiveChurchId(studioChurchId);
  }, [isOcrStudio, studioChurchId, activeChurchId, setActiveChurchId]);

  const churchId = isOcrStudio ? (studioChurchId ?? activeChurchId) : activeChurchId;
  const churchName = useMemo(() => {
    if (churchMetadata?.church_name) return churchMetadata.church_name;
    const found = churches.find(c => c.id === activeChurchId);
    return found?.name || null;
  }, [churchMetadata, activeChurchId, churches]);

  const [activeType, setActiveType] = useState<RecordTypeKey>('baptism');
  const [config, setConfig] = useState<ChurchRecordFieldConfig>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!churchId) return;
    setLoading(true);
    setError(null);
    try {
      const fields = await fetchChurchRecordFields(churchId);
      setConfig(fields);
      setDirty(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const rows = useMemo(
    () => config[activeType] || [],
    [config, activeType],
  );

  const updateRow = (index: number, patch: Partial<ChurchRecordFieldRow>) => {
    setConfig((prev) => {
      const current = [...(prev[activeType] || [])];
      current[index] = { ...current[index], ...patch };
      return { ...prev, [activeType]: current };
    });
    setDirty(true);
    setSuccess(false);
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    setConfig((prev) => ({
      ...prev,
      [activeType]: reorderRows(prev[activeType] || [], index, dir),
    }));
    setDirty(true);
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!churchId) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveChurchRecordFields(churchId, config);
      setConfig(saved);
      setDirty(false);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadConfig();
  };

  if (!churchId) {
    return (
      <Box>
        {isOcrStudio && <OcrStudioNav />}
        {isOcrStudio && <OcrChurchSelector />}
        <Alert severity="info" sx={{ mb: 2 }}>Select a church to configure record table headers.</Alert>
        {!isOcrStudio && isSuperAdmin() && churches.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 300 }}>
            <InputLabel>Church</InputLabel>
            <Select
              value={activeChurchId || ''}
              label="Church"
              onChange={(e) => {
                const newId = Number(e.target.value);
                setActiveChurchId(newId);
                setSearchParams({ church: String(newId) });
              }}
            >
              {churches.map((c: any) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.church_name || c.name || `Church ${c.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {isOcrStudio && <OcrStudioNav />}
      {isOcrStudio && <OcrChurchSelector />}

      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
              Record table headers
            </Typography>
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
              Match your parish ledger columns for baptism, marriage, and funeral books.
              Set the printed header text, display labels, and which fields appear during OCR review.
              Fields like &ldquo;Parents Name&rdquo; are omitted by default — use separate father and mother columns instead.
            </Typography>
            {churchName && (
              <Chip size="small" label={churchName} color="primary" variant="outlined" sx={{ mt: 1.5 }} />
            )}
          </Box>
          {isSuperAdmin() && churches.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 260, ml: 2 }}>
              <InputLabel>Church</InputLabel>
              <Select
                value={activeChurchId || ''}
                label="Church"
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setActiveChurchId(newId);
                  setSearchParams({ church: String(newId) });
                }}
              >
                {churches.map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.church_name || c.name || `Church ${c.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Box>

      {!isOcrStudio && <PreviewBanner />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
        <Tabs
          value={activeType}
          onChange={(_, v) => setActiveType(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {RECORD_TYPES.map((rt) => (
            <Tab key={rt.key} value={rt.key} label={rt.label} sx={{ textTransform: 'none' }} />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 48 }} />
                  <TableCell sx={{ fontWeight: 600, width: 160 }}>Field key</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Display label</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ledger header (as printed)</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">Required</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">Visible</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.key} sx={{ opacity: row.visible ? 1 : 0.55 }}>
                    <TableCell>
                      <Stack direction="row" spacing={0}>
                        <IconButton size="small" disabled={idx === 0} onClick={() => moveRow(idx, -1)}>
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" disabled={idx === rows.length - 1} onClick={() => moveRow(idx, 1)}>
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{row.key}</Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.label}
                        onChange={(e) => updateRow(idx, { label: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.headerLabel}
                        onChange={(e) => updateRow(idx, { headerLabel: e.target.value })}
                        placeholder="Column heading on ledger"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={row.required}
                        onChange={(e) => updateRow(idx, { required: e.target.checked })}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={row.visible}
                        onChange={(e) => updateRow(idx, { visible: e.target.checked })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
          disabled={saving || loading || !dirty}
          onClick={handleSave}
        >
          Save configuration
        </Button>
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          disabled={loading}
          onClick={handleReset}
        >
          Reset
        </Button>
        {dirty && (
          <Typography variant="caption" color="text.secondary">Unsaved changes</Typography>
        )}
      </Stack>

      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess(false)}>
          Record field configuration saved.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        These settings apply to OCR review, agent extraction labels, and field highlights.
        Re-run the agent on existing jobs after changing headers so labels stay in sync.
      </Alert>
    </Box>
  );
};

export default RecordSettingsPage;
