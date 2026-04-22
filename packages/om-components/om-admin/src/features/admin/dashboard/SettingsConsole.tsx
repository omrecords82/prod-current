/**
 * Settings Console — VMware-style settings management table
 * Lives inside the /admin/orthodox-metrics "Settings" tab.
 * super_admin only.
 */
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Switch,
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
    IconCheck,
    IconFilter,
    IconHistory,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

// ─── Types ───────────────────────────────────────────────────
interface SettingRow {
    key: string;
    type: 'string' | 'number' | 'bool' | 'json' | 'enum';
    category: string | null;
    description: string | null;
    default_value: string | null;
    enum_values_json: string | null;
    effective_value: string | null;
    overridden: boolean;
    override_scope: string | null;
    override_scope_id: number | null;
    override_updated_at: string | null;
    override_updated_by: number | null;
    is_sensitive: boolean;
    updated_at: string;
}

interface AuditRow {
    id: number;
    key: string;
    scope: string;
    scope_id: number | null;
    old_value: string | null;
    new_value: string | null;
    changed_by: number | null;
    changed_at: string;
    reason: string | null;
}

interface Church {
    id: number;
    church_name: string;
}

// ─── Component ───────────────────────────────────────────────
const SettingsConsole: React.FC = () => {
    // Data + filters
    type DataBucket = {
        rows: SettingRow[];
        categories: string[];
        churches: Church[];
        loading: boolean;
        error: string | null;
        search: string;
        categoryFilter: string;
        scopeFilter: 'global' | 'church';
        churchId: number | '';
    };
    const [data, setData] = useState<DataBucket>({
        rows: [],
        categories: [],
        churches: [],
        loading: false,
        error: null,
        search: '',
        categoryFilter: '',
        scopeFilter: 'global',
        churchId: '',
    });
    const setDataField = useCallback(<K extends keyof DataBucket>(key: K, value: DataBucket[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    }, []);
    const { rows, categories, churches, loading, error, search, categoryFilter, scopeFilter, churchId } = data;
    const setRows = useCallback((v: SettingRow[]) => setDataField('rows', v), [setDataField]);
    const setCategories = useCallback((v: string[]) => setDataField('categories', v), [setDataField]);
    const setChurches = useCallback((v: Church[]) => setDataField('churches', v), [setDataField]);
    const setLoading = useCallback((v: boolean) => setDataField('loading', v), [setDataField]);
    const setError = useCallback((v: string | null) => setDataField('error', v), [setDataField]);
    const setSearch = useCallback((v: string) => setDataField('search', v), [setDataField]);
    const setCategoryFilter = useCallback((v: string) => setDataField('categoryFilter', v), [setDataField]);
    const setScopeFilter = useCallback((v: 'global' | 'church') => setDataField('scopeFilter', v), [setDataField]);
    const setChurchId = useCallback((v: number | '') => setDataField('churchId', v), [setDataField]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Editor + audit dialogs
    type DialogBucket = {
        editorOpen: boolean;
        editRow: SettingRow | null;
        editValue: string;
        editReason: string;
        saving: boolean;
        auditOpen: boolean;
        auditKey: string;
        auditRows: AuditRow[];
        auditLoading: boolean;
    };
    const [dialogs, setDialogs] = useState<DialogBucket>({
        editorOpen: false,
        editRow: null,
        editValue: '',
        editReason: '',
        saving: false,
        auditOpen: false,
        auditKey: '',
        auditRows: [],
        auditLoading: false,
    });
    const setDialogField = useCallback(<K extends keyof DialogBucket>(key: K, value: DialogBucket[K]) => {
        setDialogs(prev => ({ ...prev, [key]: value }));
    }, []);
    const { editorOpen, editRow, editValue, editReason, saving, auditOpen, auditKey, auditRows, auditLoading } = dialogs;
    const setEditorOpen = useCallback((v: boolean) => setDialogField('editorOpen', v), [setDialogField]);
    const setEditRow = useCallback((v: SettingRow | null) => setDialogField('editRow', v), [setDialogField]);
    const setEditValue = useCallback((v: string) => setDialogField('editValue', v), [setDialogField]);
    const setEditReason = useCallback((v: string) => setDialogField('editReason', v), [setDialogField]);
    const setSaving = useCallback((v: boolean) => setDialogField('saving', v), [setDialogField]);
    const setAuditOpen = useCallback((v: boolean) => setDialogField('auditOpen', v), [setDialogField]);
    const setAuditKey = useCallback((v: string) => setDialogField('auditKey', v), [setDialogField]);
    const setAuditRows = useCallback((v: AuditRow[]) => setDialogField('auditRows', v), [setDialogField]);
    const setAuditLoading = useCallback((v: boolean) => setDialogField('auditLoading', v), [setDialogField]);

    // ─── Fetch data ──────────────────────────────────────────
    const fetchSettings = useCallback(async (q?: string) => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string> = {};
            if (q) params.q = q;
            if (categoryFilter) params.category = categoryFilter;
            params.scope = scopeFilter;
            if (scopeFilter === 'church' && churchId) params.churchId = String(churchId);

            const qs = new URLSearchParams(params).toString();
            const data = await apiClient.get<any>(`/admin/settings?${qs}`);
            setRows(data.rows || []);
        } catch (err: any) {
            setError(err?.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, [categoryFilter, scopeFilter, churchId]);

    const fetchCategories = useCallback(async () => {
        try {
            const data = await apiClient.get<any>('/admin/settings/categories');
            setCategories(data.categories || []);
        } catch { /* silent */ }
    }, []);

    const fetchChurches = useCallback(async () => {
        try {
            const data = await apiClient.get<any>('/admin/churches');
            setChurches(data.churches || []);
        } catch { /* silent */ }
    }, []);

    // Initial load
    useEffect(() => {
        fetchSettings();
        fetchCategories();
        fetchChurches();
    }, []);

    // Refetch when filters change
    useEffect(() => {
        fetchSettings(search);
    }, [categoryFilter, scopeFilter, churchId]);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSettings(search), 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [search]);

    // ─── Filtered view ───────────────────────────────────────
    const visibleRows = useMemo(() => rows, [rows]);

    // ─── Editor handlers ─────────────────────────────────────
    const openEditor = (row: SettingRow) => {
        setEditRow(row);
        setEditValue(row.is_sensitive ? '' : (row.effective_value ?? row.default_value ?? ''));
        setEditReason('');
        setEditorOpen(true);
    };

    const handleSave = async () => {
        if (!editRow) return;
        setSaving(true);
        try {
            await apiClient.put('/admin/settings', {
                key: editRow.key,
                scope: scopeFilter,
                scope_id: scopeFilter === 'church' && churchId ? churchId : null,
                value: editValue,
                reason: editReason || undefined,
            });
            setEditorOpen(false);
            fetchSettings(search);
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleRevert = async () => {
        if (!editRow) return;
        if (!window.confirm(`Revert "${editRow.key}" to default?`)) return;
        setSaving(true);
        try {
            await apiClient.delete('/admin/settings', {
                data: {
                    key: editRow.key,
                    scope: scopeFilter,
                    scope_id: scopeFilter === 'church' && churchId ? churchId : null,
                    reason: editReason || 'Reverted via Settings Console',
                },
            });
            setEditorOpen(false);
            fetchSettings(search);
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || 'Revert failed');
        } finally {
            setSaving(false);
        }
    };

    // ─── Audit handlers ──────────────────────────────────────
    const openAudit = async (key: string) => {
        setAuditKey(key);
        setAuditOpen(true);
        setAuditLoading(true);
        try {
            const data = await apiClient.get<any>(`/admin/settings/audit?key=${encodeURIComponent(key)}&limit=30`);
            setAuditRows(data.rows || []);
        } catch {
            setAuditRows([]);
        } finally {
            setAuditLoading(false);
        }
    };

    // ─── Value editor input ──────────────────────────────────
    const renderValueEditor = () => {
        if (!editRow) return null;
        const { type, enum_values_json } = editRow;

        if (type === 'bool') {
            return (
                <FormControlLabel
                    control={
                        <Switch
                            checked={editValue === 'true' || editValue === '1'}
                            onChange={(e) => setEditValue(e.target.checked ? 'true' : 'false')}
                        />
                    }
                    label={editValue === 'true' || editValue === '1' ? 'Enabled' : 'Disabled'}
                />
            );
        }

        if (type === 'enum' && enum_values_json) {
            let options: string[] = [];
            try { options = JSON.parse(enum_values_json); } catch { /* */ }
            return (
                <FormControl fullWidth size="small">
                    <InputLabel>Value</InputLabel>
                    <Select value={editValue} label="Value" onChange={(e) => setEditValue(e.target.value as string)}>
                        {options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </Select>
                </FormControl>
            );
        }

        if (type === 'json') {
            return (
                <TextField
                    label="Value (JSON)"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    multiline
                    rows={4}
                    fullWidth
                    size="small"
                />
            );
        }

        return (
            <TextField
                label="Value"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                type={type === 'number' ? 'number' : 'text'}
                fullWidth
                size="small"
                placeholder={editRow.is_sensitive ? 'Enter new value (masked)' : ''}
            />
        );
    };

    // ─── Category color ──────────────────────────────────────
    const categoryColor = (cat: string | null): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' => {
        const map: Record<string, any> = {
            general: 'primary',
            features: 'success',
            records: 'info',
            'records.search': 'info',
            ocr: 'warning',
            security: 'error',
            email: 'warning',
            ui: 'secondary',
            backup: 'default',
        };
        return map[cat || ''] || 'default';
    };

    // ─── Render ──────────────────────────────────────────────
    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h5" fontWeight={600}>
                    ⚙️ Settings Console
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={`${visibleRows.length} settings`} size="small" variant="outlined" />
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={() => fetchSettings(search)} disabled={loading}>
                            <IconRefresh size={18} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* Controls Bar */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search */}
                <TextField
                    placeholder="Search key or description…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                    sx={{ minWidth: 240, flex: '1 1 240px', maxWidth: 400 }}
                    InputProps={{ startAdornment: <IconSearch size={16} style={{ marginRight: 6, opacity: 0.5 }} /> }}
                />

                {/* Category */}
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Category</InputLabel>
                    <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value as string)}>
                        <MenuItem value="">All</MenuItem>
                        {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                </FormControl>

                {/* Scope */}
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Scope</InputLabel>
                    <Select value={scopeFilter} label="Scope" onChange={(e) => setScopeFilter(e.target.value as 'global' | 'church')}>
                        <MenuItem value="global">Global</MenuItem>
                        <MenuItem value="church">Church</MenuItem>
                    </Select>
                </FormControl>

                {/* Church selector */}
                {scopeFilter === 'church' && (
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Church</InputLabel>
                        <Select value={churchId} label="Church" onChange={(e) => setChurchId(e.target.value as number)}>
                            <MenuItem value="">Select…</MenuItem>
                            {churches.map(c => <MenuItem key={c.id} value={c.id}>{c.church_name}</MenuItem>)}
                        </Select>
                    </FormControl>
                )}

                {categoryFilter && (
                    <Chip
                        icon={<IconFilter size={14} />}
                        label={categoryFilter}
                        size="small"
                        onDelete={() => setCategoryFilter('')}
                    />
                )}
            </Box>

            {/* Table */}
            <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)', overflow: 'auto' }}>
                <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 0.75, px: 1.5, fontSize: '0.82rem' } }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Key</TableCell>
                            <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Effective Value</TableCell>
                            <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>Default</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700, minWidth: 80 }} align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !visibleRows.length ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : visibleRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No settings found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleRows.map((row) => (
                                <TableRow
                                    key={row.key}
                                    hover
                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                    onClick={() => openEditor(row)}
                                >
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                            {row.key}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 280 }}>
                                            {row.description || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            fontWeight={row.overridden ? 600 : 400}
                                            sx={{
                                                fontFamily: 'monospace',
                                                fontSize: '0.8rem',
                                                color: row.overridden ? 'warning.main' : 'text.primary',
                                            }}
                                        >
                                            {row.effective_value ?? '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', opacity: 0.6 }}>
                                            {row.default_value ?? '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {row.category && (
                                            <Chip label={row.category} size="small" color={categoryColor(row.category)} variant="outlined" sx={{ fontSize: '0.72rem', height: 22 }} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={row.type} size="small" variant="filled" sx={{ fontSize: '0.7rem', height: 20, bgcolor: 'action.selected' }} />
                                    </TableCell>
                                    <TableCell>
                                        {row.overridden ? (
                                            <Chip
                                                label={`Overridden (${row.override_scope})`}
                                                size="small"
                                                color="warning"
                                                variant="filled"
                                                sx={{ fontSize: '0.7rem', height: 22 }}
                                            />
                                        ) : (
                                            <Chip label="Default" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22, opacity: 0.5 }} />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Audit History">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => { e.stopPropagation(); openAudit(row.key); }}
                                            >
                                                <IconHistory size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ─── Editor Dialog ─────────────────────────────── */}
            <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>
                    Edit Setting
                </DialogTitle>
                <DialogContent dividers>
                    {editRow && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Key</Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                                    {editRow.key}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Description</Typography>
                                <Typography variant="body2">{editRow.description || '—'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Type</Typography>
                                    <Typography variant="body2">{editRow.type}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Default</Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                        {editRow.default_value ?? '(none)'}
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Category</Typography>
                                    <Typography variant="body2">{editRow.category || '—'}</Typography>
                                </Box>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Override Value ({scopeFilter}{scopeFilter === 'church' && churchId ? ` #${churchId}` : ''})
                                </Typography>
                                {renderValueEditor()}
                            </Box>

                            <TextField
                                label="Reason (optional)"
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                size="small"
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="Why is this being changed?"
                            />

                            {editRow.overridden && (
                                <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                                    Currently overridden at <strong>{editRow.override_scope}</strong> scope.
                                    {editRow.override_updated_at && ` Last changed: ${new Date(editRow.override_updated_at).toLocaleString()}`}
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                    <Box>
                        {editRow?.overridden && (
                            <Button
                                color="error"
                                variant="outlined"
                                size="small"
                                startIcon={<IconTrash size={16} />}
                                onClick={handleRevert}
                                disabled={saving}
                            >
                                Revert to Default
                            </Button>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button onClick={() => setEditorOpen(false)} disabled={saving} startIcon={<IconX size={16} />}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={16} /> : <IconCheck size={16} />}
                        >
                            Save Override
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            {/* ─── Audit Dialog ──────────────────────────────── */}
            <Dialog open={auditOpen} onClose={() => setAuditOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>
                    Audit History — <Typography component="span" sx={{ fontFamily: 'monospace' }}>{auditKey}</Typography>
                </DialogTitle>
                <DialogContent dividers>
                    {auditLoading ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
                    ) : auditRows.length === 0 ? (
                        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No audit history for this key</Typography>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Old Value</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>New Value</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>By</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {auditRows.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                                            {new Date(a.changed_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={a.scope} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {a.old_value ?? '(none)'}
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {a.new_value ?? '(reverted)'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem', maxWidth: 180 }}>
                                            {a.reason || '—'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem' }}>
                                            {a.changed_by ?? '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAuditOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SettingsConsole;
