import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { apiClient as adminApi } from '@/shared/lib/apiClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Checkbox,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
  CircularProgress,
  Paper,
  Stack,
  Divider,
  InputAdornment,
  useTheme,
  alpha,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircleOutline as DoneIcon,
  Clear as ClearIcon,
  Inventory2 as PackageIcon,
  FolderCopy as ChangeSetsIcon,
  RocketLaunch as WizardIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

import {
  DailyItem,
  ItemFormData,
  DEFAULT_FORM,
  HORIZONS,
  HORIZON_LABELS,
  STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITIES,
  PRIORITY_COLORS,
  AGENT_TOOL_LABELS,
  AGENT_TOOL_COLORS,
  BRANCH_TYPE_LABELS,
  BRANCH_TYPE_COLORS,
  formatDate,
} from '../omDailyTypes';

import { StatusChip, PriorityChip, AgentChip } from '../components/chips';
import ItemFormDialog from '../components/ItemFormDialog';
import { useToast } from '../hooks/useToast';

const OMDailyItemsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Toast
  const { toast, showToast, closeToast } = useToast();

  // Filter state — initialized from URL params
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || '');
  const [filterPriority, setFilterPriority] = useState<string>(searchParams.get('priority') || '');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterDue, setFilterDue] = useState<string>(searchParams.get('due') || '');
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [selectedHorizon, setSelectedHorizon] = useState<string>(searchParams.get('horizon') || '');

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyItem | null>(null);
  const [form, setForm] = useState<ItemFormData>({ ...DEFAULT_FORM });

  // Change Set dialog
  const [csDialogOpen, setCsDialogOpen] = useState(false);
  const [csDialogMode, setCsDialogMode] = useState<'create' | 'add'>('create');
  const [csNewTitle, setCsNewTitle] = useState('');
  const [csNewBranch, setCsNewBranch] = useState('');
  const [csNewPriority, setCsNewPriority] = useState('medium');
  const [csNewType, setCsNewType] = useState('feature');
  const [csNewStrategy, setCsNewStrategy] = useState('single_branch');
  const [csExistingList, setCsExistingList] = useState<any[]>([]);
  const [csSelectedId, setCsSelectedId] = useState<number | ''>('');
  const [csCreating, setCsCreating] = useState(false);

  // Expanded item
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  // Data
  const [items, setItems] = useState<DailyItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterCategory) params.set('category', filterCategory);
      if (filterDue) params.set('due', filterDue);
      if (searchTerm) params.set('search', searchTerm);
      if (selectedHorizon) params.set('horizon', selectedHorizon);

      const qs = params.toString();
      const data = await apiClient.get<any>(`/omai-daily/items${qs ? `?${qs}` : ''}`);
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch items', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterCategory, filterDue, searchTerm, selectedHorizon]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/omai-daily/categories');
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch {
      // silently fail
    }
  }, []);

  // Auto-sync commits on first load
  useEffect(() => {
    if (!synced) {
      apiClient.post<any>('/omai-daily/sync-commits').catch(() => {});
      setSynced(true);
    }
  }, [synced]);

  // Fetch on mount and filter change
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Save item
  const saveItem = async () => {
    try {
      const isNew = !editingItem;
      const result = isNew
        ? await apiClient.post<any>('/omai-daily/items', form)
        : await apiClient.put<any>(`/omai-daily/items/${editingItem.id}`, form);
      const itemId = result?.item?.id || result?.id;

      // Auto-create branch if agent_tool + branch_type are set on new items
      if (isNew && (form as any).agent_tool && (form as any).branch_type && itemId) {
        try {
          const workData = await apiClient.post<any>(`/omai-daily/items/${itemId}/start-work`, { branch_type: (form as any).branch_type, agent_tool: (form as any).agent_tool });
          const branch = workData?.branch || workData?.item?.github_branch;
          showToast(`Item created — branch ${branch || 'created'}`, 'success');
        } catch {
          showToast('Item created but branch creation failed', 'error');
        }
      } else {
        showToast(isNew ? 'Item created' : 'Item updated', 'success');
      }

      setDialogOpen(false);
      setEditingItem(null);
      setForm({ ...DEFAULT_FORM });
      fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Failed to save item', 'error');
    }
  };

  // Delete item
  const deleteItem = async (id: number) => {
    try {
      await apiClient.delete<any>(`/omai-daily/items/${id}`);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete item', 'error');
    }
  };

  // Quick status change (uses SDLC-enforced PATCH endpoint)
  const updateStatus = async (item: DailyItem, status: string) => {
    try {
      await apiClient.request<any>({
        method: 'PATCH',
        url: `/omai-daily/items/${item.id}/status`,
        data: { status },
      });
      showToast(`Marked as ${STATUS_LABELS[status] || status}`, 'success');
      fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Open edit dialog
  const openEditDialog = (item: DailyItem) => {
    setEditingItem(item);
    setForm({
      title: item.title || '',
      description: item.description || '',
      task_type: item.task_type || 'task',
      status: item.status || 'todo',
      priority: item.priority || 'medium',
      category: item.category || '',
      horizon: item.horizon?.toString() || '7',
      due_date: item.due_date || '',
      source: item.source || 'manual',
      agent_tool: item.agent_tool || '',
      branch_type: item.branch_type || '',
      github_branch: item.github_branch || '',
      github_issue_number: item.github_issue_number || '',
      conversation_ref: item.conversation_ref || '',
      progress: item.progress || 0,
    } as ItemFormData);
    setDialogOpen(true);
  };

  // Open new dialog
  const openNewDialog = () => {
    setEditingItem(null);
    setForm({ ...DEFAULT_FORM });
    setDialogOpen(true);
  };

  // Multi-select toggle
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  // Change Set actions
  const openCsDialog = (mode: 'create' | 'add') => {
    setCsDialogMode(mode);
    setCsNewTitle('');
    setCsNewBranch('');
    setCsNewPriority('medium');
    setCsNewType('feature');
    setCsNewStrategy('single_branch');
    setCsSelectedId('');
    setCsDialogOpen(true);

    if (mode === 'add') {
      adminApi
        .get('/admin/change-sets')
        .then((res) => {
          setCsExistingList(Array.isArray(res.data) ? res.data : res.data?.changeSets || res.data?.items || []);
        })
        .catch(() => {});
    }
  };

  const handleCsSubmit = async () => {
    setCsCreating(true);
    try {
      const ids = Array.from(selectedIds);
      if (csDialogMode === 'create') {
        const res = await adminApi.post('/admin/change-sets', {
          title: csNewTitle,
          branch_name: csNewBranch,
          priority: csNewPriority,
          type: csNewType,
          merge_strategy: csNewStrategy,
        });
        const csId = res.data?.id || res.data?.changeSet?.id;
        if (csId) {
          for (const itemId of ids) {
            await adminApi.post(`/admin/change-sets/${csId}/items`, {
              item_id: itemId,
            });
          }
          showToast(`Change Set created with ${ids.length} item(s)`, 'success');
          navigate(`/om-daily/change-sets/${csId}`);
        }
      } else {
        if (!csSelectedId) return;
        for (const itemId of ids) {
          await adminApi.post(`/admin/change-sets/${csSelectedId}/items`, {
            item_id: itemId,
          });
        }
        showToast(`${ids.length} item(s) added to Change Set`, 'success');
      }
      setCsDialogOpen(false);
      setSelectedIds(new Set());
      fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Change Set operation failed', 'error');
    } finally {
      setCsCreating(false);
    }
  };

  // Send to SDLC Wizard
  const sendToWizard = () => {
    const ids = Array.from(selectedIds).join(',');
    navigate(`/om-daily/sdlc-wizard?mode=new-work&items=${ids}`);
  };

  // Remove due filter
  const removeDueFilter = () => {
    setFilterDue('');
  };

  return (
    <Box>
      {/* Filter Bar */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
          bgcolor: alpha(theme.palette.background.paper, 0.9),
        }}
        elevation={1}
      >
        <Tooltip
          title="Search by title, description, or item ID. Use #123 to search by ID."
          arrow
        >
          <TextField
            size="small"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Tooltip>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Horizon</InputLabel>
          <Select
            value={selectedHorizon}
            label="Horizon"
            onChange={(e: SelectChangeEvent) => setSelectedHorizon(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {HORIZONS.map((h) => (
              <MenuItem key={h} value={h}>
                {HORIZON_LABELS[h] || h}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e: SelectChangeEvent) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_LABELS[s] || s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={filterPriority}
            label="Priority"
            onChange={(e: SelectChangeEvent) => setFilterPriority(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filterCategory}
            label="Category"
            onChange={(e: SelectChangeEvent) => setFilterCategory(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {filterDue && (
          <Chip
            label={`Due: ${filterDue}`}
            onDelete={removeDueFilter}
            size="small"
            color="warning"
          />
        )}

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined"
          size="small"
          startIcon={<ChangeSetsIcon />}
          onClick={() => navigate('/om-daily/change-sets')}
        >
          Change Sets
        </Button>

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openNewDialog}
        >
          New Item
        </Button>
      </Paper>

      {/* Multi-select action bar */}
      {selectedIds.size > 0 && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
          elevation={0}
        >
          <Typography variant="body2" fontWeight={600}>
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ChangeSetsIcon />}
            onClick={() => openCsDialog('create')}
          >
            Create Change Set
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => openCsDialog('add')}
          >
            Add to Existing
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<WizardIcon />}
            onClick={sendToWizard}
          >
            Send to SDLC Wizard
          </Button>
          <Button
            size="small"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </Paper>
      )}

      {/* Item list */}
      <Paper elevation={1} sx={{ overflow: 'hidden' }}>
        {/* Select all header */}
        <Box
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.background.default, 0.5),
          }}
        >
          <Checkbox
            size="small"
            checked={items.length > 0 && selectedIds.size === items.length}
            indeterminate={selectedIds.size > 0 && selectedIds.size < items.length}
            onChange={toggleSelectAll}
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">No items found</Typography>
          </Box>
        ) : (
          items.map((item) => {
            const isExpanded = expandedItem === item.id;
            const isSelected = selectedIds.has(item.id);
            const hasCS = !!(item as any).change_set_code || !!(item as any).change_set_id;

            return (
              <Box key={item.id}>
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: isSelected
                      ? alpha(theme.palette.primary.main, 0.04)
                      : 'transparent',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.action.hover, 0.04),
                    },
                    transition: 'background-color 0.15s',
                  }}
                >
                  {/* Checkbox or Package icon */}
                  {hasCS ? (
                    <Tooltip title="In a Change Set">
                      <PackageIcon
                        fontSize="small"
                        sx={{ mt: 0.5, color: theme.palette.info.main, cursor: 'pointer' }}
                        onClick={() => toggleSelect(item.id)}
                      />
                    </Tooltip>
                  ) : (
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      sx={{ mt: -0.25 }}
                    />
                  )}

                  {/* Quick done */}
                  <Tooltip title="Mark done">
                    <IconButton
                      size="small"
                      onClick={() => updateStatus(item, 'done')}
                      disabled={item.status === 'done'}
                      sx={{
                        color:
                          item.status === 'done'
                            ? theme.palette.success.main
                            : theme.palette.action.disabled,
                      }}
                    >
                      <DoneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* Expand arrow */}
                  <IconButton
                    size="small"
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  >
                    {isExpanded ? (
                      <ExpandLessIcon fontSize="small" />
                    ) : (
                      <ExpandMoreIcon fontSize="small" />
                    )}
                  </IconButton>

                  {/* Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        textDecoration: item.status === 'done' ? 'line-through' : 'none',
                        opacity: item.status === 'done' ? 0.6 : 1,
                      }}
                    >
                      {item.title}
                    </Typography>

                    {!isExpanded && item.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mt: 0.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {item.description}
                      </Typography>
                    )}

                    {/* Meta chips */}
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}
                    >
                      {(item as any).change_set_code && (
                        <Chip
                          label={(item as any).change_set_code}
                          size="small"
                          variant="outlined"
                          color="info"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                          onClick={() => {
                            const csId = (item as any).change_set_id;
                            if (csId) navigate(`/om-daily/change-sets/${csId}`);
                          }}
                        />
                      )}
                      {item.agent_tool && (
                        <AgentChip agentTool={item.agent_tool} />
                      )}
                      {item.branch_type && (
                        <Chip
                          label={BRANCH_TYPE_LABELS[item.branch_type] || item.branch_type}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            height: 22,
                            bgcolor: alpha(
                              BRANCH_TYPE_COLORS[item.branch_type] || theme.palette.grey[500],
                              0.15
                            ),
                            color: BRANCH_TYPE_COLORS[item.branch_type] || theme.palette.text.secondary,
                          }}
                        />
                      )}
                      {item.github_branch && (
                        <Chip
                          label={item.github_branch}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22, fontFamily: 'monospace' }}
                        />
                      )}
                      {item.conversation_ref && (
                        <Chip
                          label={`Conv: ${item.conversation_ref}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                      )}
                      {(item as any).github_issue_number && (
                        <Chip
                          label={`#${(item as any).github_issue_number}`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                      )}
                      {item.horizon && (
                        <Chip
                          label={HORIZON_LABELS[item.horizon] || `${item.horizon}d`}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                      )}
                      <StatusChip status={item.status} />
                      <PriorityChip priority={item.priority} />
                      {item.category && (
                        <Chip
                          label={item.category}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                      )}
                      {item.due_date && (
                        <Chip
                          label={`Due: ${formatDate(item.due_date)}`}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                      )}
                    </Stack>

                    {/* Expanded description */}
                    <Collapse in={isExpanded}>
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.background.default, 0.6),
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        {item.description ? (
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {item.description}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            No description
                          </Typography>
                        )}
                        <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                          {item.created_at && (
                            <Typography variant="caption" color="text.secondary">
                              Created: {formatDate(item.created_at)}
                            </Typography>
                          )}
                          {(item as any).completed_at && (
                            <Typography variant="caption" color="text.secondary">
                              Completed: {formatDate((item as any).completed_at)}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Collapse>
                  </Box>

                  {/* Action buttons */}
                  <Stack direction="row" spacing={0.5} sx={{ ml: 1, flexShrink: 0 }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditDialog(item)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => deleteItem(item.id)}
                        sx={{ color: theme.palette.error.main }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Box>
            );
          })
        )}
      </Paper>

      {/* Item Form Dialog */}
      <ItemFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingItem(null);
          setForm({ ...DEFAULT_FORM });
        }}
        onSave={saveItem}
        form={form}
        onFormChange={setForm}
        editingItem={editingItem}
      />

      {/* Change Set Dialog */}
      <Dialog
        open={csDialogOpen}
        onClose={() => setCsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {csDialogMode === 'create' ? 'Create Change Set' : 'Add to Change Set'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {csDialogMode === 'create' ? (
              <>
                <TextField
                  label="Title"
                  value={csNewTitle}
                  onChange={(e) => setCsNewTitle(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  label="Branch Name"
                  value={csNewBranch}
                  onChange={(e) => setCsNewBranch(e.target.value)}
                  fullWidth
                  size="small"
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={csNewPriority}
                    label="Priority"
                    onChange={(e: SelectChangeEvent) => setCsNewPriority(e.target.value)}
                  >
                    {PRIORITIES.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={csNewType}
                    label="Type"
                    onChange={(e: SelectChangeEvent) => setCsNewType(e.target.value)}
                  >
                    <MenuItem value="feature">Feature</MenuItem>
                    <MenuItem value="bugfix">Bugfix</MenuItem>
                    <MenuItem value="patch">Patch</MenuItem>
                    <MenuItem value="refactor">Refactor</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Merge Strategy</InputLabel>
                  <Select
                    value={csNewStrategy}
                    label="Merge Strategy"
                    onChange={(e: SelectChangeEvent) => setCsNewStrategy(e.target.value)}
                  >
                    <MenuItem value="single_branch">Single Branch</MenuItem>
                    <MenuItem value="per_item">Per Item</MenuItem>
                  </Select>
                </FormControl>
              </>
            ) : (
              <FormControl size="small" fullWidth>
                <InputLabel>Select Change Set</InputLabel>
                <Select
                  value={csSelectedId as any}
                  label="Select Change Set"
                  onChange={(e: SelectChangeEvent<number>) =>
                    setCsSelectedId(e.target.value as number)
                  }
                >
                  {csExistingList.map((cs: any) => (
                    <MenuItem key={cs.id} value={cs.id}>
                      {cs.code ? `${cs.code} — ` : ''}
                      {cs.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Typography variant="caption" color="text.secondary">
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} will be{' '}
              {csDialogMode === 'create' ? 'added to the new' : 'added to the selected'} Change
              Set.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCsDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCsSubmit}
            disabled={
              csCreating ||
              (csDialogMode === 'create' && !csNewTitle) ||
              (csDialogMode === 'add' && !csSelectedId)
            }
          >
            {csCreating ? (
              <CircularProgress size={20} />
            ) : csDialogMode === 'create' ? (
              'Create'
            ) : (
              'Add'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OMDailyItemsPage;
