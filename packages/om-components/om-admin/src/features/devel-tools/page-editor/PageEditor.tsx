/**
 * Page Content Editor — Source Code Text Editor
 *
 * Scans frontend TSX files for text content and allows
 * super_admin to edit text directly in the source code.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  InputAdornment,
  Divider,
  Paper,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  IconArrowLeft,
  IconRefresh,
  IconDeviceFloppy,
  IconEdit,
  IconSearch,
  IconFileText,
  IconCheck,
  IconX,
  IconCode,
  IconAlertTriangle,
} from '@tabler/icons-react';
import apiClient from '@/api/utils/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';

interface PageEntry {
  id: string;
  name: string;
  file: string;
  description: string;
  exists: boolean;
  category?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'frontend-pages': 'Frontend Pages',
  'shared-components': 'Shared Components',
  'auth': 'Login & Auth',
  'admin': 'Admin / Portal Pages',
};

interface TextItem {
  id: string;
  type: 'jsx-text' | 'jsx-prop' | 'object-prop';
  text: string;
  line: number;
  context: string;
  propName?: string;
  original: string;
  sourceFile?: string;
}

interface PageScan {
  page: { id: string; name: string; file: string; description: string };
  items: TextItem[];
  totalLines: number;
  sourceFiles?: string[];
}

export default function PageEditor() {
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Page detail view
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [scan, setScan] = useState<PageScan | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state — tracks which items have been modified
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/page-content/pages');
      setPages(res.data || res || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const scanPage = useCallback(async (pageId: string) => {
    setScanLoading(true);
    setError('');
    setEdits({});
    try {
      const res = await apiClient.get(`/page-content/scan/${pageId}`);
      setScan(res);
      setSelectedPage(pageId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setScanLoading(false);
    }
  }, []);

  const handleEdit = (itemId: string, newText: string) => {
    setEdits((prev) => ({ ...prev, [itemId]: newText }));
  };

  const handleCancelEdit = (itemId: string) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleSaveAll = async () => {
    if (!scan || !selectedPage) return;

    const changes = Object.entries(edits)
      .filter(([id, newText]) => {
        const item = scan.items.find((i) => i.id === id);
        return item && newText !== item.text;
      })
      .map(([id, newText]) => {
        const item = scan.items.find((i) => i.id === id)!;
        return { id, oldText: item.text, newText, sourceFile: item.sourceFile };
      });

    if (changes.length === 0) {
      setSuccess('No changes to save');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await apiClient.put(`/page-content/update/${selectedPage}`, { items: changes });
      setSuccess(`Updated ${res.updated || res.data?.updated} text item(s) in source code`);
      setEdits({});
      // Re-scan to reflect changes
      await scanPage(selectedPage);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = Object.entries(edits).filter(([id, text]) => {
    const item = scan?.items.find((i) => i.id === id);
    return item && text !== item.text;
  }).length;

  const goBack = () => {
    setSelectedPage(null);
    setScan(null);
    setEdits({});
    setSearchTerm('');
  };

  // Auto-clear success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ── Page List View ──
  if (!selectedPage) {
    return (
      <PageContainer title="Page Content Editor" description="Edit frontend page text">
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Frontend Pages
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a page to view and edit its text content
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={fetchPages}>
              Refresh
            </Button>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : (
            <PageCardGrid pages={pages} onSelect={scanPage} />
          )}
        </Box>
      </PageContainer>
    );
  }

  // ── Page Detail / Edit View ──
  const filteredItems = scan?.items.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.text.toLowerCase().includes(term) ||
      item.context.toLowerCase().includes(term) ||
      (item.propName || '').toLowerCase().includes(term)
    );
  }) || [];

  // Group items by source file
  const groupedByFile: Record<string, TextItem[]> = {};
  for (const item of filteredItems) {
    const file = item.sourceFile || scan?.page.file || 'unknown';
    if (!groupedByFile[file]) groupedByFile[file] = [];
    groupedByFile[file].push(item);
  }

  // Extract just the filename for display
  const shortFileName = (filePath: string) => {
    const parts = filePath.split('/');
    return parts.length > 2 ? parts.slice(-2).join('/') : filePath;
  };

  return (
    <PageContainer title="Page Content Editor" description="Edit frontend page text">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Breadcrumbs>
            <Link
              component="button"
              variant="body2"
              onClick={goBack}
              sx={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              Frontend Pages
            </Link>
            <Typography variant="body2" color="text.primary" fontWeight={600}>
              {scan?.page.name || '...'}
            </Typography>
          </Breadcrumbs>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<IconArrowLeft size={18} />} onClick={goBack} size="small">
              Back
            </Button>
            <Button
              variant="outlined"
              startIcon={<IconRefresh size={18} />}
              onClick={() => selectedPage && scanPage(selectedPage)}
              size="small"
            >
              Rescan
            </Button>
            {pendingCount > 0 && (
              <Button
                variant="contained"
                color="warning"
                startIcon={saving ? <CircularProgress size={16} /> : <IconDeviceFloppy size={18} />}
                onClick={handleSaveAll}
                disabled={saving}
                size="small"
              >
                Save {pendingCount} Change{pendingCount > 1 ? 's' : ''} to Source
              </Button>
            )}
          </Stack>
        </Stack>

        {/* File info */}
        {scan && (
          <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
            <Chip
              icon={<IconCode size={14} />}
              label={scan.page.file}
              size="small"
              variant="outlined"
              sx={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <Typography variant="caption" color="text.secondary">
              {scan.items.length} text items found
              {scan.sourceFiles && scan.sourceFiles.length > 1 && ` across ${scan.sourceFiles.length} files`}
            </Typography>
          </Stack>
        )}

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
        {pendingCount > 0 && (
          <Alert severity="warning" icon={<IconAlertTriangle size={20} />} sx={{ mb: 2 }}>
            {pendingCount} unsaved change{pendingCount > 1 ? 's' : ''} — click "Save to Source" to write changes to the TSX file.
            Changes require a frontend rebuild to take effect.
          </Alert>
        )}

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search text content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3, minWidth: 300 }}
        />

        {/* Content */}
        {scanLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : filteredItems.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No text items found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'Try a different search term' : 'This file has no extractable text content'}
            </Typography>
          </Paper>
        ) : (
          Object.entries(groupedByFile).map(([filePath, fileItems]) => (
            <Card key={filePath} sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <IconFileText size={18} style={{ opacity: 0.5 }} />
                  <Typography variant="subtitle2" fontFamily="monospace" color="text.secondary" sx={{ fontSize: 12 }}>
                    {shortFileName(filePath)}
                  </Typography>
                  <Chip label={fileItems.length} size="small" />
                </Stack>
                <Divider sx={{ mb: 1 }} />
                {fileItems.map((item) => (
                  <TextItemRow
                    key={item.id}
                    item={item}
                    editedText={edits[item.id]}
                    onEdit={(text) => handleEdit(item.id, text)}
                    onCancel={() => handleCancelEdit(item.id)}
                  />
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </PageContainer>
  );
}

// ── Page card grid (grouped by category) ──

function PageCardGrid({ pages, onSelect }: { pages: PageEntry[]; onSelect: (id: string) => void }) {
  const grouped: Record<string, PageEntry[]> = {};
  const categoryOrder = ['frontend-pages', 'shared-components', 'auth', 'admin'];
  for (const page of pages) {
    const cat = page.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(page);
  }
  const orderedCategories = categoryOrder.filter((c) => grouped[c]);
  Object.keys(grouped).forEach((c) => {
    if (!orderedCategories.includes(c)) orderedCategories.push(c);
  });

  if (pages.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No pages registered</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      {orderedCategories.map((cat) => (
        <Box key={cat}>
          <Typography variant="h6" fontWeight={600} mb={1.5} color="text.secondary">
            {CATEGORY_LABELS[cat] || cat}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {grouped[cat].map((page) => (
              <Card key={page.id} variant="outlined">
                <CardActionArea onClick={() => onSelect(page.id)} disabled={!page.exists} sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <IconFileText size={32} style={{ opacity: 0.5, flexShrink: 0, marginTop: 2 }} />
                    <Box flex={1}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {page.name}
                        </Typography>
                        {!page.exists && <Chip label="missing" size="small" color="error" variant="outlined" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {page.description}
                      </Typography>
                      <Typography variant="caption" fontFamily="monospace" color="text.disabled">
                        {page.file}
                      </Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

// ── Editable text row ──

interface TextItemRowProps {
  item: TextItem;
  editedText?: string;
  onEdit: (text: string) => void;
  onCancel: () => void;
}

function TextItemRow({ item, editedText, onEdit, onCancel }: TextItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(editedText ?? item.text);

  const isModified = editedText !== undefined && editedText !== item.text;

  const startEdit = () => {
    setValue(editedText ?? item.text);
    setEditing(true);
  };

  const confirmEdit = () => {
    onEdit(value);
    setEditing(false);
  };

  const cancelEdit = () => {
    setValue(editedText ?? item.text);
    setEditing(false);
  };

  const revert = () => {
    onCancel();
    setValue(item.text);
    setEditing(false);
  };

  const typeColor =
    item.type === 'object-prop' ? 'info' : item.type === 'jsx-prop' ? 'warning' : 'default';

  return (
    <Box
      sx={{
        py: 1.5,
        px: 1.5,
        borderRadius: 1,
        bgcolor: isModified ? 'rgba(255, 152, 0, 0.04)' : 'transparent',
        borderLeft: isModified ? '3px solid #ff9800' : '3px solid transparent',
        '&:hover': { bgcolor: isModified ? 'rgba(255, 152, 0, 0.06)' : 'action.hover' },
        '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
      }}
    >
      {/* Meta row */}
      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
        <Typography variant="caption" fontFamily="monospace" color="text.disabled">
          L{item.line}
        </Typography>
        <Chip label={item.context} size="small" color={typeColor as any} variant="outlined" sx={{ fontSize: 11, height: 20 }} />
        {item.propName && item.type !== 'jsx-text' && (
          <Typography variant="caption" fontFamily="monospace" color="primary.main">
            {item.propName}=
          </Typography>
        )}
        {isModified && <Chip label="modified" size="small" color="warning" sx={{ fontSize: 10, height: 18 }} />}
      </Stack>

      {/* Text content */}
      {editing ? (
        <Stack spacing={1}>
          <TextField
            value={value}
            onChange={(e) => setValue(e.target.value)}
            multiline
            minRows={1}
            maxRows={6}
            fullWidth
            size="small"
            autoFocus
            sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: 13 } }}
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" startIcon={<IconCheck size={14} />} onClick={confirmEdit}>
              Apply
            </Button>
            <Button size="small" onClick={cancelEdit}>
              Cancel
            </Button>
            {isModified && (
              <Button size="small" color="error" onClick={revert}>
                Revert
              </Button>
            )}
          </Stack>
        </Stack>
      ) : (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography
            variant="body2"
            sx={{
              cursor: 'pointer',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: 13,
              flex: 1,
              mr: 1,
              color: isModified ? 'warning.dark' : 'text.primary',
              '&:hover': { color: 'primary.main' },
            }}
            onClick={startEdit}
          >
            {isModified ? editedText : item.text}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title="Edit text">
              <IconButton size="small" onClick={startEdit}>
                <IconEdit size={16} />
              </IconButton>
            </Tooltip>
            {isModified && (
              <Tooltip title="Revert">
                <IconButton size="small" color="error" onClick={revert}>
                  <IconX size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
