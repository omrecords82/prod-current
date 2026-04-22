/**
 * CertificateTemplatesPage — Admin interface for certificate template management
 *
 * Features:
 * - Browse template groups by jurisdiction
 * - View/edit field positions for each template
 * - Preview template with sample data
 * - See generated certificate history
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Description as TemplateIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Church as ChurchIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  AccountBalance as JurisdictionIcon,
} from '@mui/icons-material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { apiClient } from '@/api/utils/axiosInstance';

// ─── Types ───────────────────────────────────────────────────

interface TemplateGroup {
  id: number;
  jurisdiction_code: string;
  jurisdiction_name: string | null;
  template_type: string;
  name: string;
  description: string | null;
  is_system_default: number;
  is_active: number;
  template_count: number;
}

interface Template {
  id: number;
  template_group_id: number;
  church_id: number | null;
  version_label: string;
  background_asset_path: string | null;
  page_width: string;
  page_height: string;
  render_mode: string;
  is_active: number;
  jurisdiction_code: string;
  template_type: string;
  group_name: string;
  is_system_default: number;
  jurisdiction_name: string | null;
  field_count: number;
}

interface TemplateField {
  id: number;
  template_id: number;
  field_key: string;
  label: string;
  source_type: string;
  source_path: string | null;
  x: string;
  y: string;
  width: string | null;
  height: string | null;
  font_family: string;
  font_size: string;
  font_weight: string;
  text_align: string;
  color: string;
  text_transform: string;
  is_required: number;
  is_multiline: number;
  sort_order: number;
}

interface JurisdictionSummary {
  jurisdiction_code: string;
  jurisdiction_name: string | null;
  group_count: number;
  template_count: number;
}

interface GeneratedCertificate {
  id: number;
  church_id: number;
  record_type: string;
  record_id: number;
  template_id: number;
  file_path: string;
  file_size: number;
  generated_by: number;
  generated_at: string;
  status: string;
  version_label: string;
  template_name: string;
  jurisdiction_code: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  baptism_adult: 'Baptism (Adult)',
  baptism_child: 'Baptism (Child)',
  marriage: 'Marriage',
  reception: 'Reception',
  funeral: 'Funeral',
};

const TYPE_COLORS: Record<string, string> = {
  baptism_adult: '#1976d2',
  baptism_child: '#0288d1',
  marriage: '#7b1fa2',
  reception: '#388e3c',
  funeral: '#616161',
};

function formatBytes(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ───────────────────────────────────────────────

const CertificateTemplatesPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [jurisdictions, setJurisdictions] = useState<JurisdictionSummary[]>([]);
  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [generated, setGenerated] = useState<GeneratedCertificate[]>([]);

  // Detail view
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // ─── Data Loading ──────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jurRes, grpRes, tplRes, genRes] = await Promise.allSettled([
        apiClient.get('/certificate-templates/jurisdictions/summary'),
        apiClient.get('/certificate-templates/groups'),
        apiClient.get('/certificate-templates'),
        apiClient.get('/certificate-templates/generated/list'),
      ]);

      if (jurRes.status === 'fulfilled') setJurisdictions(jurRes.value?.jurisdictions || []);
      if (grpRes.status === 'fulfilled') setGroups(grpRes.value?.groups || []);
      if (tplRes.status === 'fulfilled') setTemplates(tplRes.value?.templates || []);
      if (genRes.status === 'fulfilled') setGenerated(genRes.value?.certificates || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load certificate data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadTemplateDetail = async (tpl: Template) => {
    setSelectedTemplate(tpl);
    setFieldsLoading(true);
    try {
      const res = await apiClient.get(`/certificate-templates/${tpl.id}`);
      setTemplateFields(res?.fields || []);
    } catch {
      setTemplateFields([]);
    } finally {
      setFieldsLoading(false);
    }
  };

  // ─── Jurisdiction Overview Tab ─────────────────────────────

  const renderOverview = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Jurisdictions with Templates</Typography>
      <Grid container spacing={2}>
        {jurisdictions.map((j) => (
          <Grid item xs={12} sm={6} md={4} key={j.jurisdiction_code}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <JurisdictionIcon sx={{ color: theme.palette.primary.main }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    {j.jurisdiction_code}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {j.jurisdiction_name || 'Unknown Jurisdiction'}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={`${j.group_count} groups`} size="small" />
                  <Chip label={`${j.template_count} templates`} size="small" color="primary" />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {!jurisdictions.length && !loading && (
          <Grid item xs={12}>
            <Alert severity="info">No jurisdictions have templates yet. Seed the OCA template family to get started.</Alert>
          </Grid>
        )}
      </Grid>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Template Groups</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Group</TableCell>
              <TableCell>Jurisdiction</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="center">Templates</TableCell>
              <TableCell align="center">Default</TableCell>
              <TableCell align="center">Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{g.name}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={g.jurisdiction_code} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={TYPE_LABELS[g.template_type] || g.template_type}
                    size="small"
                    sx={{ bgcolor: alpha(TYPE_COLORS[g.template_type] || '#999', 0.1), color: TYPE_COLORS[g.template_type] || '#999' }}
                  />
                </TableCell>
                <TableCell align="center">{g.template_count}</TableCell>
                <TableCell align="center">
                  {g.is_system_default ? <ActiveIcon fontSize="small" color="success" /> : '—'}
                </TableCell>
                <TableCell align="center">
                  {g.is_active ? <ActiveIcon fontSize="small" color="success" /> : <InactiveIcon fontSize="small" color="error" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ─── Templates Tab ─────────────────────────────────────────

  const renderTemplates = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>All Templates</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Template</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Jurisdiction</TableCell>
              <TableCell>Version</TableCell>
              <TableCell align="center">Fields</TableCell>
              <TableCell>Church Override</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TemplateIcon fontSize="small" sx={{ color: TYPE_COLORS[t.template_type] || '#999' }} />
                    <Typography variant="body2" fontWeight={500}>{t.group_name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={TYPE_LABELS[t.template_type] || t.template_type}
                    size="small"
                    sx={{ bgcolor: alpha(TYPE_COLORS[t.template_type] || '#999', 0.1), color: TYPE_COLORS[t.template_type] || '#999' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip label={t.jurisdiction_code} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{t.version_label}</TableCell>
                <TableCell align="center">{t.field_count}</TableCell>
                <TableCell>
                  {t.church_id ? (
                    <Chip label={`Church #${t.church_id}`} size="small" color="warning" />
                  ) : (
                    <Typography variant="body2" color="text.secondary">System default</Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  {t.is_active ? <ActiveIcon fontSize="small" color="success" /> : <InactiveIcon fontSize="small" color="error" />}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View fields">
                    <IconButton size="small" onClick={() => loadTemplateDetail(t)}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ─── Generated History Tab ─────────────────────────────────

  const renderGenerated = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Generated Certificates</Typography>
      {!generated.length ? (
        <Alert severity="info">No certificates have been generated yet.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Record</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Generated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {generated.map((g) => (
                <TableRow key={g.id} hover>
                  <TableCell>#{g.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={TYPE_LABELS[g.record_type] || g.record_type}
                      size="small"
                      sx={{ bgcolor: alpha(TYPE_COLORS[g.record_type] || '#999', 0.1), color: TYPE_COLORS[g.record_type] || '#999' }}
                    />
                  </TableCell>
                  <TableCell>Record #{g.record_id}</TableCell>
                  <TableCell>{g.template_name} ({g.jurisdiction_code})</TableCell>
                  <TableCell>{formatBytes(g.file_size)}</TableCell>
                  <TableCell>
                    <Chip
                      label={g.status}
                      size="small"
                      color={g.status === 'generated' ? 'success' : g.status === 'downloaded' ? 'info' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{new Date(g.generated_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // ─── Field Detail Dialog ───────────────────────────────────

  const renderFieldDialog = () => (
    <Dialog
      open={!!selectedTemplate}
      onClose={() => setSelectedTemplate(null)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {selectedTemplate?.group_name} — Fields
          </Typography>
          <Chip
            label={TYPE_LABELS[selectedTemplate?.template_type || ''] || selectedTemplate?.template_type}
            size="small"
            color="primary"
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        {fieldsLoading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Field Key</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell>Position (x, y)</TableCell>
                  <TableCell>Font</TableCell>
                  <TableCell>Align</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templateFields.map((f, i) => (
                  <TableRow key={f.id} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        {f.field_key}
                      </Typography>
                    </TableCell>
                    <TableCell>{f.label}</TableCell>
                    <TableCell>
                      <Chip label={f.source_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        {f.source_path || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      ({parseFloat(f.x).toFixed(0)}, {parseFloat(f.y).toFixed(0)})
                      {f.width && <Typography variant="caption" color="text.secondary"> w:{parseFloat(f.width).toFixed(0)}</Typography>}
                    </TableCell>
                    <TableCell>
                      {f.font_family} {parseFloat(f.font_size)}pt
                      {f.font_weight !== 'normal' && ` ${f.font_weight}`}
                    </TableCell>
                    <TableCell>{f.text_align}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSelectedTemplate(null)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  // ─── Main Render ───────────────────────────────────────────

  return (
    <PageContainer title="Certificate Templates" description="Manage certificate template library">
      <Breadcrumb
        title="Certificate Templates"
        items={[
          { title: 'Admin', to: '/admin/control-panel' },
          { title: 'Certificate Templates' },
        ]}
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => navigate('/admin/control-panel')}>
              <BackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5">Certificate Template Library</Typography>
              <Typography variant="body2" color="text.secondary">
                Manage jurisdiction-based templates, field positions, and generation history
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }} color="text.secondary">Loading templates…</Typography>
          </Box>
        ) : (
          <>
            {/* Summary chips */}
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              <Chip label={`${jurisdictions.length} jurisdiction${jurisdictions.length !== 1 ? 's' : ''}`} color="primary" variant="outlined" />
              <Chip label={`${groups.length} groups`} variant="outlined" />
              <Chip label={`${templates.length} templates`} variant="outlined" />
              <Chip label={`${generated.length} generated`} variant="outlined" />
            </Stack>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Overview" />
              <Tab label="Templates" />
              <Tab label={`Generated (${generated.length})`} />
            </Tabs>

            {tab === 0 && renderOverview()}
            {tab === 1 && renderTemplates()}
            {tab === 2 && renderGenerated()}
          </>
        )}
      </Paper>

      {renderFieldDialog()}
    </PageContainer>
  );
};

export default CertificateTemplatesPage;
