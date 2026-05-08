/**
 * TenantPortalConfigPage — operator UI for the per-tenant portal config registry.
 *
 * OMOD-1502 (Phase 5 of 8 of OMSD-1491). Backed by /api/tenant-config CRUD routes
 * over orthodoxmetrics_db.tenant_portal_config_items.
 *
 * MVP scope: pick a church, list rows, edit/delete inline, JSON editor for the
 * structured fields. Not a polished UX — this is operator tooling. The bulk of
 * row authoring will come from the seed script + scripted ingest from the
 * OMOD-1498 audit, not hand-keying in this UI.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { apiClient } from '@/api/utils/axiosInstance';

const VALID_CATEGORIES = [
  'portal', 'records', 'branding', 'church_profile',
  'navigation', 'permissions', 'uploads', 'analytics',
  'layout', 'notifications', 'tenant', 'auth',
] as const;

const VALID_TENANT_SCOPES = [
  'global', 'per_church', 'per_user', 'per_role', 'per_record_type',
] as const;

type Category = typeof VALID_CATEGORIES[number];
type TenantScope = typeof VALID_TENANT_SCOPES[number];

interface ConfigItem {
  id?: number;
  church_id: number;
  config_key: string;
  display_name?: string | null;
  category: Category;
  owning_system?: string;
  target_surface?: string | null;
  user_roles?: string[] | null;
  tenant_scope?: TenantScope;
  current_source?: Record<string, unknown> | null;
  current_behavior?: string | null;
  configurable_fields?: unknown[] | null;
  layout_contract?: Record<string, unknown> | null;
  dependencies?: Record<string, unknown> | null;
  omstudio_package_relevance?: Record<string, unknown> | null;
  gaps_or_risks?: unknown[] | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ChurchListEntry {
  id: number;
  name?: string;
  email?: string | null;
  database_name?: string | null;
  is_active?: boolean | number;
}

const EMPTY_ITEM: ConfigItem = {
  church_id: 0,
  config_key: '',
  display_name: '',
  category: 'portal',
  owning_system: 'OM',
  target_surface: '',
  user_roles: [],
  tenant_scope: 'per_church',
  current_source: { hardcoded: false },
  current_behavior: '',
  configurable_fields: [],
  layout_contract: null,
  dependencies: {},
  omstudio_package_relevance: {
    can_be_targeted_by_omstudio: false,
    package_slot_candidate: false,
    requires_preflight_validation: true,
    risk_level: 'low',
    notes: '',
  },
  gaps_or_risks: [],
  is_active: true,
};

function jsonText(val: unknown): string {
  if (val === null || val === undefined) return '';
  return JSON.stringify(val, null, 2);
}

function tryParseJson(text: string, fallback: unknown): unknown {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  try { return JSON.parse(trimmed); } catch { return undefined; }
}

const TenantPortalConfigPage: React.FC = () => {
  const [churches, setChurches] = useState<ChurchListEntry[]>([]);
  const [churchId, setChurchId] = useState<number | ''>('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [items, setItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [editingDraft, setEditingDraft] = useState<{
    item: ConfigItem;
    user_roles_text: string;
    current_source_text: string;
    configurable_fields_text: string;
    layout_contract_text: string;
    dependencies_text: string;
    omstudio_relevance_text: string;
    gaps_or_risks_text: string;
    json_errors: Record<string, string>;
  } | null>(null);

  /* ── load churches ── */
  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiClient.get('/my/churches');
        const list: ChurchListEntry[] = Array.isArray(res?.data?.churches)
          ? res.data.churches
          : Array.isArray(res?.churches) ? res.churches : [];
        setChurches(list);
        if (list.length > 0 && churchId === '') {
          setChurchId(list[0].id);
        }
      } catch (e: any) {
        setError(`Failed to load churches: ${e?.message || e}`);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── load items ── */
  const loadItems = useCallback(async () => {
    if (!churchId || typeof churchId !== 'number') return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { church_id: churchId, include_inactive: includeInactive };
      if (category !== 'all') body.category = category;
      const res: any = await apiClient.post('/tenant-config/list', body);
      const arr: ConfigItem[] = Array.isArray(res?.items) ? res.items : [];
      setItems(arr);
    } catch (e: any) {
      setError(`Failed to load items: ${e?.response?.data?.error || e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [churchId, category, includeInactive]);

  useEffect(() => { loadItems(); }, [loadItems]);

  /* ── editing ── */
  const startEdit = (it: ConfigItem | 'new') => {
    const baseRaw = it === 'new'
      ? { ...EMPTY_ITEM, church_id: typeof churchId === 'number' ? churchId : 0 }
      : it;
    const base: ConfigItem = { ...baseRaw };
    setEditing(base);
    setEditingDraft({
      item: base,
      user_roles_text: (base.user_roles || []).join(', '),
      current_source_text: jsonText(base.current_source),
      configurable_fields_text: jsonText(base.configurable_fields),
      layout_contract_text: jsonText(base.layout_contract),
      dependencies_text: jsonText(base.dependencies),
      omstudio_relevance_text: jsonText(base.omstudio_package_relevance),
      gaps_or_risks_text: jsonText(base.gaps_or_risks),
      json_errors: {},
    });
  };

  const cancelEdit = () => { setEditing(null); setEditingDraft(null); };

  const saveEdit = async () => {
    if (!editingDraft) return;
    const d = editingDraft;
    const errs: Record<string, string> = {};

    const userRoles = d.user_roles_text
      .split(',').map((s) => s.trim()).filter(Boolean);
    const currentSource = tryParseJson(d.current_source_text, null);
    const configurableFields = tryParseJson(d.configurable_fields_text, []);
    const layoutContract = tryParseJson(d.layout_contract_text, null);
    const dependencies = tryParseJson(d.dependencies_text, {});
    const omstudioRelevance = tryParseJson(d.omstudio_relevance_text, null);
    const gapsOrRisks = tryParseJson(d.gaps_or_risks_text, []);

    if (currentSource === undefined) errs.current_source = 'invalid JSON';
    if (configurableFields === undefined) errs.configurable_fields = 'invalid JSON';
    if (layoutContract === undefined) errs.layout_contract = 'invalid JSON';
    if (dependencies === undefined) errs.dependencies = 'invalid JSON';
    if (omstudioRelevance === undefined) errs.omstudio_package_relevance = 'invalid JSON';
    if (gapsOrRisks === undefined) errs.gaps_or_risks = 'invalid JSON';

    if (!d.item.config_key.trim()) errs.config_key = 'required';
    if (!d.item.church_id) errs.church_id = 'required';

    if (Object.keys(errs).length > 0) {
      setEditingDraft({ ...d, json_errors: errs });
      return;
    }

    try {
      await apiClient.post('/tenant-config/set', {
        ...d.item,
        user_roles: userRoles,
        current_source: currentSource,
        configurable_fields: configurableFields,
        layout_contract: layoutContract,
        dependencies: dependencies,
        omstudio_package_relevance: omstudioRelevance,
        gaps_or_risks: gapsOrRisks,
      });
      cancelEdit();
      loadItems();
    } catch (e: any) {
      setError(`Save failed: ${e?.response?.data?.error || e?.message || e}`);
    }
  };

  const onDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm(`Delete config item ${id}? This cannot be undone (FK CASCADE applies).`)) return;
    try {
      await apiClient.delete(`/tenant-config/delete/${id}`);
      loadItems();
    } catch (e: any) {
      setError(`Delete failed: ${e?.response?.data?.error || e?.message || e}`);
    }
  };

  /* ── rendering ── */

  const churchOptions = useMemo(
    () => churches
      .filter((c) => c.is_active)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [churches],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Tenant Portal Configuration Registry
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        OMOD-1502 — per-tenant portal config items per OMSD-1491 §C. V1 is informational;
        OMStudio's preflight validator reads this via{' '}
        <code>/api/platform/tenant-config/known-slots</code>.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
            <FormControl sx={{ minWidth: 280 }} size="small">
              <InputLabel>Church</InputLabel>
              <Select
                label="Church"
                value={churchId}
                onChange={(e) => setChurchId(Number(e.target.value) || '')}
              >
                {churchOptions.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name || `Church #${c.id}`} (id={c.id})</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category | 'all')}
              >
                <MenuItem value="all">All</MenuItem>
                {VALID_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                size="small"
              />
              <Typography variant="body2">Include inactive</Typography>
            </Stack>

            <Box sx={{ flex: 1 }} />

            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => startEdit('new')}
              disabled={typeof churchId !== 'number'}
            >
              New config item
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
          ) : items.length === 0 ? (
            <Typography variant="body2" sx={{ p: 3 }} color="text.secondary">
              No config items for this church yet. Use the seed script
              (<code>scripts/seed-tenant-portal-config.js</code>) or click "New config item".
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>config_key</TableCell>
                  <TableCell>category</TableCell>
                  <TableCell>tenant_scope</TableCell>
                  <TableCell>target_surface</TableCell>
                  <TableCell>active</TableCell>
                  <TableCell align="right">actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id} hover>
                    <TableCell><code>{it.config_key}</code></TableCell>
                    <TableCell>{it.category}</TableCell>
                    <TableCell>{it.tenant_scope}</TableCell>
                    <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Tooltip title={it.target_surface || ''}><span>{it.target_surface || '—'}</span></Tooltip>
                    </TableCell>
                    <TableCell>{it.is_active ? '✓' : '—'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <Button size="small" onClick={() => startEdit(it)}><EditOutlinedIcon fontSize="small" /></Button>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <Button size="small" color="error" onClick={() => onDelete(it.id)}><DeleteOutlineIcon fontSize="small" /></Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onClose={cancelEdit} maxWidth="md" fullWidth>
        <DialogTitle>{editing?.id ? `Edit config item #${editing.id}` : 'New config item'}</DialogTitle>
        <DialogContent dividers>
          {editingDraft && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="config_key"
                  value={editingDraft.item.config_key}
                  onChange={(e) => setEditingDraft({ ...editingDraft, item: { ...editingDraft.item, config_key: e.target.value } })}
                  size="small" fullWidth required
                  error={!!editingDraft.json_errors.config_key}
                  helperText={editingDraft.json_errors.config_key}
                />
                <TextField
                  label="display_name"
                  value={editingDraft.item.display_name || ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, item: { ...editingDraft.item, display_name: e.target.value } })}
                  size="small" fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>category</InputLabel>
                  <Select
                    label="category"
                    value={editingDraft.item.category}
                    onChange={(e) => setEditingDraft({ ...editingDraft, item: { ...editingDraft.item, category: e.target.value as Category } })}
                  >
                    {VALID_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>tenant_scope</InputLabel>
                  <Select
                    label="tenant_scope"
                    value={editingDraft.item.tenant_scope || 'per_church'}
                    onChange={(e) => setEditingDraft({ ...editingDraft, item: { ...editingDraft.item, tenant_scope: e.target.value as TenantScope } })}
                  >
                    {VALID_TENANT_SCOPES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Switch
                    checked={editingDraft.item.is_active !== false}
                    onChange={(e) => setEditingDraft({ ...editingDraft, item: { ...editingDraft.item, is_active: e.target.checked } })}
                  />
                  <Typography variant="body2">active</Typography>
                </Stack>
              </Stack>
              <TextField
                label="target_surface"
                value={editingDraft.item.target_surface || ''}
                onChange={(e) => setEditingDraft({ ...editingDraft, item: { ...editingDraft.item, target_surface: e.target.value } })}
                size="small" fullWidth
              />
              <TextField
                label="user_roles (comma-separated)"
                value={editingDraft.user_roles_text}
                onChange={(e) => setEditingDraft({ ...editingDraft, user_roles_text: e.target.value })}
                size="small" fullWidth
                helperText="e.g. priest, church_admin, super_admin"
              />
              <TextField
                label="current_behavior"
                value={editingDraft.item.current_behavior || ''}
                onChange={(e) => setEditingDraft({ ...editingDraft, item: { ...editingDraft.item, current_behavior: e.target.value } })}
                size="small" fullWidth multiline minRows={2}
              />
              {/* JSON fields */}
              {[
                { key: 'current_source_text', label: 'current_source (JSON)' },
                { key: 'configurable_fields_text', label: 'configurable_fields (JSON array)' },
                { key: 'layout_contract_text', label: 'layout_contract (JSON)' },
                { key: 'dependencies_text', label: 'dependencies (JSON)' },
                { key: 'omstudio_relevance_text', label: 'omstudio_package_relevance (JSON)' },
                { key: 'gaps_or_risks_text', label: 'gaps_or_risks (JSON array)' },
              ].map(({ key, label }) => {
                const errKey = key.replace(/_text$/, '').replace('omstudio_relevance', 'omstudio_package_relevance');
                return (
                  <TextField
                    key={key}
                    label={label}
                    value={(editingDraft as any)[key]}
                    onChange={(e) => setEditingDraft({ ...editingDraft, [key]: e.target.value } as any)}
                    size="small" fullWidth multiline minRows={3}
                    error={!!editingDraft.json_errors[errKey]}
                    helperText={editingDraft.json_errors[errKey]}
                    InputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
                  />
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelEdit}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantPortalConfigPage;
