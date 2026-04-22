/**
 * Daily Tasks Page
 * Theme-aware task board backed by daily_work table
 * Sections: TASKS, NOTES, FOLLOW-UPS, ACTIVITY
 */

import {
  AccessTime,
  Add,
  CheckCircle,
  CheckCircleOutline,
  Close,
  Delete,
  Edit,
  FileDownload,
  History,
  MoreHoriz,
  PlayArrow,
  RadioButtonUnchecked,
  Save,
  Schedule,
  Settings,
  Star,
  StarBorder,
  Upload,
} from '@mui/icons-material';
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
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';

// ── Types ──────────────────────────────────────────
interface WorkItem {
  id: number;
  task_type: string | null;
  content: string | null;
  created_at: string;
  assigned_to: number | null;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  source: 'human' | 'system' | 'agent' | 'automation';
  created_by: number | null;
  category: string | null;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: string | null;
  archived: number;
}

interface TaskConfig {
  baseDirectory: string;
  archiveDirectory: string;
  currentTasksFile: string;
  envVariable: string;
  currentValue: string;
}

// ── Theme-aware color hook ─────────────────────────
function useColors() {
  const theme = useTheme();
  return {
    bg: theme.palette.background.default,
    card: theme.palette.background.paper,
    cardBorder: theme.palette.divider,
    text: theme.palette.text.primary,
    textMuted: theme.palette.text.secondary,
    accent: theme.palette.primary.main,
    green: theme.palette.success.main,
    greenBg: theme.palette.success.light,
    yellow: theme.palette.warning.main,
    yellowBg: theme.palette.warning.light,
    red: theme.palette.error.main,
    redBg: theme.palette.error.light,
    purple: theme.palette.primary.dark,
    purpleBg: theme.palette.primary.light,
    grayBg: theme.palette.action.hover,
    divider: theme.palette.divider,
  };
}

// ── Helpers ────────────────────────────────────────

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: undefined, year: 'numeric', month: 'short', day: 'numeric' });

const parseMeta = (m: string | null): Record<string, any> => {
  if (!m) return {};
  try { return JSON.parse(m); } catch { return {}; }
};

// ── Built-in Templates ────────────────────────────
interface TaskTemplate {
  name: string;
  description: string;
  items: Array<{ task_type: string; content: string; priority: number; status: string }>;
}

const BUILT_IN_TEMPLATES: TaskTemplate[] = [
  {
    name: 'Daily Standup',
    description: 'Standard daily standup review template',
    items: [
      { task_type: 'task', content: 'Review yesterday\'s completed work', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Plan today\'s priorities', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Identify and discuss blockers', priority: 2, status: 'pending' },
      { task_type: 'note', content: '**Standup Notes**\n- \n- ', priority: 3, status: 'pending' },
      { task_type: 'followup', content: 'Follow up on yesterday\'s blockers', priority: 2, status: 'pending' },
    ],
  },
  {
    name: 'System Maintenance',
    description: 'Server and infrastructure maintenance checklist',
    items: [
      { task_type: 'task', content: 'Check server health & resource usage', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Verify backup completion', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Review error logs', priority: 2, status: 'pending' },
      { task_type: 'task', content: 'Check disk space and cleanup if needed', priority: 2, status: 'pending' },
      { task_type: 'task', content: 'Update dependencies / security patches', priority: 3, status: 'pending' },
      { task_type: 'note', content: '**Maintenance Log**\n- Server: \n- Database: \n- Storage: ', priority: 3, status: 'pending' },
    ],
  },
  {
    name: 'Release Checklist',
    description: 'Pre and post deployment verification',
    items: [
      { task_type: 'task', content: 'Run test suite', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Build production bundle', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Deploy to staging', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Smoke test staging', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Deploy to production', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Post-deploy verification', priority: 1, status: 'pending' },
      { task_type: 'followup', content: 'Monitor error rates for 24h', priority: 2, status: 'pending' },
      { task_type: 'note', content: '**Release Notes**\n- Version: \n- Changes: \n- Known issues: ', priority: 3, status: 'pending' },
    ],
  },
  {
    name: 'Sprint Review',
    description: 'End of sprint review and retrospective',
    items: [
      { task_type: 'task', content: 'Demo completed features', priority: 1, status: 'pending' },
      { task_type: 'task', content: 'Review incomplete items', priority: 2, status: 'pending' },
      { task_type: 'task', content: 'Update sprint metrics', priority: 2, status: 'pending' },
      { task_type: 'note', content: '**What went well**\n- \n\n**What can improve**\n- \n\n**Action items**\n- ', priority: 3, status: 'pending' },
      { task_type: 'followup', content: 'Carry over incomplete items to next sprint', priority: 2, status: 'pending' },
    ],
  },
];

// ── Component ──────────────────────────────────────
const DailyTasks: React.FC = () => {
  usePageTitle('Daily Tasks');
  const DARK = useColors();

  const priorityConfig: Record<number, { label: string; color: string; bg: string; icon: string }> = {
    1: { label: 'HIGH', color: DARK.red, bg: DARK.redBg, icon: '🔥' },
    2: { label: 'MEDIUM', color: DARK.yellow, bg: DARK.yellowBg, icon: '⚠️' },
    3: { label: 'LOW', color: DARK.accent, bg: DARK.grayBg, icon: '🕐' },
    4: { label: 'LOW', color: DARK.textMuted, bg: DARK.grayBg, icon: '🕐' },
    5: { label: 'LOW', color: DARK.textMuted, bg: DARK.grayBg, icon: '🕐' },
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'OPEN', color: DARK.green, bg: DARK.greenBg },
    in_progress: { label: 'IN PROGRESS', color: DARK.accent, bg: DARK.purpleBg },
    blocked: { label: 'BLOCKED', color: DARK.red, bg: DARK.redBg },
    completed: { label: 'DONE', color: DARK.green, bg: DARK.greenBg },
    failed: { label: 'FAILED', color: DARK.red, bg: DARK.redBg },
    cancelled: { label: 'DEFERRED', color: DARK.textMuted, bg: DARK.grayBg },
  };

  // Data
  const [tasks, setTasks] = useState<WorkItem[]>([]);
  const [notes, setNotes] = useState<WorkItem[]>([]);
  const [followups, setFollowups] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [config, setConfig] = useState<TaskConfig | null>(null);

  // Date
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availableDates, setAvailableDates] = useState<{ date: string; count: number }[]>([]);
  const isToday = useMemo(() => selectedDate === new Date().toISOString().split('T')[0], [selectedDate]);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<WorkItem> & { _isNew?: boolean; _type?: string }>({});

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);

  // More menu
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);

  // Import template dialog
  const [importOpen, setImportOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  // Activity summary
  const activitySummary = useMemo(() => {
    const allItems = [...tasks, ...notes, ...followups];
    const completed = allItems.filter(i => i.status === 'completed');
    const inProgress = allItems.filter(i => i.status === 'in_progress');
    const pending = allItems.filter(i => i.status === 'pending');
    const timeline = allItems
      .filter(i => i.completed_at || i.started_at)
      .sort((a, b) => {
        const aTime = a.completed_at || a.started_at || a.created_at;
        const bTime = b.completed_at || b.started_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    return { completed, inProgress, pending, timeline };
  }, [tasks, notes, followups]);

  // ── Data loading ─────────────────────────────────
  const loadItems = useCallback(async (date: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await axios.get('/api/admin/tasks/work/items', { params: { date } });
      if (res.data.success) {
        const all: WorkItem[] = res.data.data;
        setTasks(all.filter(i => !i.task_type || i.task_type === 'task'));
        setNotes(all.filter(i => i.task_type === 'note'));
        setFollowups(all.filter(i => i.task_type === 'followup'));
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load items' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDates = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/tasks/work/dates');
      if (res.data.success) {
        setAvailableDates(res.data.data);
      }
    } catch { /* ignore */ }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/tasks/config');
      if (res.data.success) setConfig(res.data.config);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadDates();
    loadConfig();
  }, []);

  useEffect(() => {
    if (selectedDate) loadItems(selectedDate);
  }, [selectedDate, loadItems]);

  // ── CRUD ─────────────────────────────────────────
  const createItem = async (data: Partial<WorkItem> & { task_type?: string }) => {
    try {
      await axios.post('/api/admin/tasks/work/items', data);
      await loadItems(selectedDate);
      setLastSaved(new Date());
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create item' });
    }
  };

  const updateItem = async (id: number, data: Partial<WorkItem>) => {
    try {
      await axios.put(`/api/admin/tasks/work/items/${id}`, data);
      await loadItems(selectedDate);
      setLastSaved(new Date());
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update item' });
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await axios.delete(`/api/admin/tasks/work/items/${id}`);
      await loadItems(selectedDate);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete item' });
    }
  };

  const toggleStatus = async (item: WorkItem) => {
    const next = item.status === 'completed' ? 'pending' : 'completed';
    await updateItem(item.id, { status: next });
  };

  const toggleStar = async (item: WorkItem) => {
    const meta = parseMeta(item.metadata);
    meta.starred = !meta.starred;
    await updateItem(item.id, { metadata: meta as any });
  };

  // ── Export (legacy) ──────────────────────────────
  const handleExport = async () => {
    setSaving(true);
    try {
      await axios.post('/api/admin/sync-tasks');
      setMessage({ type: 'success', text: 'Exported to Google Sheets!' });
    } catch {
      setMessage({ type: 'error', text: 'Export failed' });
    } finally {
      setSaving(false);
    }
  };

  // ── Import template handler ─────────────────────
  const importTemplate = async (template: TaskTemplate) => {
    setSaving(true);
    try {
      for (const item of template.items) {
        await axios.post('/api/admin/tasks/work/items', {
          task_type: item.task_type,
          content: item.content,
          status: item.status,
          priority: item.priority,
          source: 'human',
        });
      }
      await loadItems(selectedDate);
      setLastSaved(new Date());
      setImportOpen(false);
      setSelectedTemplate(null);
      setMessage({ type: 'success', text: `Imported "${template.name}" template (${template.items.length} items)` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to import template' });
    } finally {
      setSaving(false);
    }
  };

  // ── Edit dialog handlers ─────────────────────────
  const openNewItem = (type: string) => {
    setEditItem({ _isNew: true, _type: type, task_type: type, status: 'pending', priority: 3, source: 'human', content: '' });
    setEditOpen(true);
  };

  const openEditItem = (item: WorkItem) => {
    setEditItem({ ...item, _isNew: false });
    setEditOpen(true);
  };

  const saveEditItem = async () => {
    if (!editItem.content?.trim()) return;
    setSaving(true);
    try {
      if (editItem._isNew) {
        await createItem({
          task_type: editItem._type || editItem.task_type || 'task',
          content: editItem.content,
          status: editItem.status || 'pending',
          priority: editItem.priority || 3,
          source: (editItem.source as any) || 'human',
          category: editItem.category || null,
          due_at: editItem.due_at || null,
          metadata: editItem.metadata || null,
        });
      } else if (editItem.id) {
        await updateItem(editItem.id, {
          content: editItem.content,
          status: editItem.status,
          priority: editItem.priority,
          category: editItem.category,
          due_at: editItem.due_at,
        });
      }
      setEditOpen(false);
    } catch { /* handled */ } finally {
      setSaving(false);
    }
  };

  // ── Last saved text ──────────────────────────────
  const lastSavedText = useMemo(() => {
    if (!lastSaved) return null;
    const diff = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    if (diff < 60) return 'just now';
    return `${Math.round(diff / 60)} minute${Math.round(diff / 60) > 1 ? 's' : ''} ago`;
  }, [lastSaved]);

  // ── Render ───────────────────────────────────────
  return (
    <Box sx={{ bgcolor: DARK.bg, minHeight: '100vh', color: DARK.text, pb: 4 }}>
      {/* ── Header ─────────────────────────────── */}
      <Box sx={{ maxWidth: 900, mx: 'auto', pt: 4, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: DARK.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span role="img" style={{ fontSize: 20 }}>📋</span>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: DARK.text, lineHeight: 1.2 }}>
                Daily Tasks
              </Typography>
              <Typography variant="caption" sx={{ color: DARK.textMuted }}>
                orthodox_metrics/daily/{config?.currentTasksFile ? config.currentTasksFile.split('/').pop() : `tasks_${selectedDate.replace(/-/g, '_')}.md`}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={<span style={{ fontSize: 14 }}>📅</span>}
              label={`${isToday ? 'Today · ' : ''}${formatDate(new Date(selectedDate + 'T12:00:00'))}`}
              size="small"
              sx={{ bgcolor: DARK.card, color: DARK.text, border: `1px solid ${DARK.cardBorder}`, '& .MuiChip-icon': { ml: 0.5 } }}
            />
            <Chip
              label={isToday ? 'ACTIVE' : 'ARCHIVE'}
              size="small"
              sx={{
                bgcolor: isToday ? DARK.greenBg : DARK.grayBg,
                color: isToday ? DARK.green : DARK.textMuted,
                fontWeight: 700, fontSize: 11, letterSpacing: 0.5,
                '&::before': { content: '"●"', mr: 0.5, fontSize: 8 },
              }}
            />
          </Stack>
        </Box>

        {/* ── Toolbar ──────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: `1px solid ${DARK.divider}`, mb: 3 }}>
          <Stack direction="row" spacing={0.5}>
            <ToolBtn icon={<Edit sx={{ fontSize: 16 }} />} label="Edit" onClick={() => openNewItem('task')} />
            <ToolBtn icon={<Save sx={{ fontSize: 16 }} />} label="Save" onClick={() => setMessage({ type: 'success', text: 'All changes are auto-saved' })} />
            <ToolBtn icon={<History sx={{ fontSize: 16 }} />} label="View History" onClick={() => setHistoryOpen(true)} />
            <ToolBtn icon={<FileDownload sx={{ fontSize: 16 }} />} label="Export" onClick={handleExport} />
            <ToolBtn icon={<Upload sx={{ fontSize: 16 }} />} label="Import Template" onClick={() => setImportOpen(true)} />
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <ToolBtn icon={<Settings sx={{ fontSize: 16 }} />} label="Settings" onClick={() => setSettingsOpen(true)} />
            <IconButton size="small" sx={{ color: DARK.textMuted }} onClick={(e) => setMoreAnchor(e.currentTarget)}>
              <MoreHoriz sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Message */}
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: DARK.accent }} />
          </Box>
        ) : (
          <>
            {/* ── TASKS Section ──────────────────── */}
            <SectionHeader icon="☑️" title="TASKS" onAdd={() => openNewItem('task')} />
            <Box sx={{ bgcolor: DARK.card, borderRadius: 2, border: `1px solid ${DARK.cardBorder}`, mb: 4 }}>
              {tasks.length === 0 ? (
                <EmptyState text="No tasks yet. Click + to add one." />
              ) : (
                tasks.map((item, idx) => {
                  const isDone = item.status === 'completed';
                  const p = priorityConfig[item.priority] || priorityConfig[3];
                  const s = statusConfig[item.status] || statusConfig.pending;
                  const meta = parseMeta(item.metadata);
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2,
                        borderBottom: idx < tasks.length - 1 ? `1px solid ${DARK.divider}` : 'none',
                        '&:hover': { bgcolor: 'action.hover' },
                        '&:hover .task-actions': { opacity: 1 },
                      }}
                    >
                      {/* Checkbox */}
                      <IconButton size="small" onClick={() => toggleStatus(item)} sx={{ color: isDone ? DARK.green : DARK.textMuted, p: 0.5 }}>
                        {isDone ? <CheckCircle sx={{ fontSize: 22 }} /> : <RadioButtonUnchecked sx={{ fontSize: 22 }} />}
                      </IconButton>

                      {/* Content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 500, color: isDone ? DARK.textMuted : DARK.text,
                            textDecoration: isDone ? 'line-through' : 'none',
                            display: 'flex', alignItems: 'center', gap: 0.75,
                          }}
                        >
                          {item.content}
                          {meta.starred && <Star sx={{ fontSize: 16, color: DARK.yellow }} />}
                        </Typography>
                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                          <MiniChip icon={p.icon} label={p.label} color={p.color} bg={p.bg} />
                          <MiniChip label={s.label} color={s.color} bg={s.bg} filled={isDone} />
                        </Stack>
                      </Box>

                      {/* Actions */}
                      <Stack direction="row" spacing={0.25} className="task-actions" sx={{ opacity: 0, transition: 'opacity .15s' }}>
                        <Tooltip title={meta.starred ? 'Unstar' : 'Star'}>
                          <IconButton size="small" onClick={() => toggleStar(item)} sx={{ color: meta.starred ? DARK.yellow : DARK.textMuted }}>
                            {meta.starred ? <Star sx={{ fontSize: 16 }} /> : <StarBorder sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditItem(item)} sx={{ color: DARK.textMuted }}>
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => deleteItem(item.id)} sx={{ color: DARK.textMuted }}>
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  );
                })
              )}
            </Box>

            {/* ── NOTES Section ──────────────────── */}
            <SectionHeader icon="📝" title="NOTES" onAdd={() => openNewItem('note')} />
            <Box sx={{ bgcolor: DARK.card, borderRadius: 2, border: `1px solid ${DARK.cardBorder}`, mb: 4, p: 3 }}>
              {notes.length === 0 ? (
                <EmptyState text="No notes yet. Click + to add one." />
              ) : (
                notes.map((item) => {
                  const meta = parseMeta(item.metadata);
                  return (
                    <Box key={item.id} sx={{ mb: 2, '&:last-child': { mb: 0 }, '&:hover .note-actions': { opacity: 1 } }}>
                      {meta.heading && (
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          {meta.headingIcon || '📎'} {meta.heading}
                        </Typography>
                      )}
                      <Box sx={{ pl: 1, position: 'relative' }}>
                        {(item.content || '').split('\n').map((line, i) => {
                          if (line.startsWith('> ')) {
                            return (
                              <Box key={i} sx={{ borderLeft: `3px solid ${DARK.cardBorder}`, pl: 2, py: 0.5, my: 1, fontStyle: 'italic', color: DARK.textMuted }}>
                                <Typography variant="body2">{line.slice(2)}</Typography>
                              </Box>
                            );
                          }
                          if (line.startsWith('- ') || line.startsWith('• ')) {
                            return (
                              <Typography key={i} variant="body2" sx={{ color: DARK.text, display: 'flex', gap: 1, mb: 0.5 }}>
                                <span style={{ color: DARK.textMuted }}>•</span>
                                <span dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2), DARK.accent) }} />
                              </Typography>
                            );
                          }
                          if (line.trim() === '') return <Box key={i} sx={{ height: 8 }} />;
                          return (
                            <Typography key={i} variant="body2" sx={{ color: DARK.text, mb: 0.5 }}>
                              <span dangerouslySetInnerHTML={{ __html: renderInline(line, DARK.accent) }} />
                            </Typography>
                          );
                        })}
                        <Stack direction="row" spacing={0.25} className="note-actions" sx={{ position: 'absolute', top: 0, right: 0, opacity: 0, transition: 'opacity .15s' }}>
                          <IconButton size="small" onClick={() => openEditItem(item)} sx={{ color: DARK.textMuted }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                          <IconButton size="small" onClick={() => deleteItem(item.id)} sx={{ color: DARK.textMuted }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                        </Stack>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>

            {/* ── FOLLOW-UPS Section ─────────────── */}
            <SectionHeader icon="➡️" title="FOLLOW-UPS" onAdd={() => openNewItem('followup')} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2, mb: 4 }}>
              {followups.length === 0 ? (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <EmptyState text="No follow-ups. Click + to add one." />
                </Box>
              ) : (
                followups.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      bgcolor: DARK.card, borderRadius: 2, border: `1px solid ${DARK.cardBorder}`,
                      px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      '&:hover .fu-actions': { opacity: 1 },
                    }}
                  >
                    <Typography variant="body2" sx={{ color: DARK.textMuted, flex: 1 }}>{item.content}</Typography>
                    <Stack direction="row" spacing={0.25} className="fu-actions" sx={{ opacity: 0, transition: 'opacity .15s' }}>
                      <IconButton size="small" onClick={() => openEditItem(item)} sx={{ color: DARK.textMuted }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                      <IconButton size="small" onClick={() => deleteItem(item.id)} sx={{ color: DARK.textMuted }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                    </Stack>
                    <IconButton size="small" sx={{ color: DARK.textMuted, ml: 1 }} onClick={() => {
                      updateItem(item.id, { status: 'completed' });
                    }}>
                      <Add sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                ))
              )}
            </Box>

            {/* ── ACTIVITY Section ─────────────────── */}
            <SectionHeader icon="📊" title="ACTIVITY" />
            <Box sx={{ bgcolor: DARK.card, borderRadius: 2, border: `1px solid ${DARK.cardBorder}`, mb: 4, p: 3 }}>
              <Stack direction="row" spacing={4} sx={{ mb: activitySummary.timeline.length > 0 ? 3 : 0 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: DARK.green }}>{activitySummary.completed.length}</Typography>
                  <Typography variant="caption" sx={{ color: DARK.textMuted }}>Completed</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: DARK.accent }}>{activitySummary.inProgress.length}</Typography>
                  <Typography variant="caption" sx={{ color: DARK.textMuted }}>In Progress</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: DARK.textMuted }}>{activitySummary.pending.length}</Typography>
                  <Typography variant="caption" sx={{ color: DARK.textMuted }}>Pending</Typography>
                </Box>
              </Stack>

              {activitySummary.timeline.length > 0 && (
                <>
                  <Divider sx={{ borderColor: DARK.divider, mb: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: DARK.textMuted, letterSpacing: 0.5, mb: 1.5 }}>
                    TIMELINE
                  </Typography>
                  {activitySummary.timeline.map((item) => {
                    const isCompleted = !!item.completed_at;
                    const isStarted = !!item.started_at && !item.completed_at;
                    const timeStr = item.completed_at
                      ? new Date(item.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : item.started_at
                        ? new Date(item.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                        : '';
                    const duration = item.started_at && item.completed_at
                      ? Math.round((new Date(item.completed_at).getTime() - new Date(item.started_at).getTime()) / 60000)
                      : null;
                    return (
                      <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1, '&:not(:last-child)': { borderBottom: `1px solid ${DARK.divider}` } }}>
                        {isCompleted ? (
                          <CheckCircle sx={{ fontSize: 18, color: DARK.green, mt: 0.25 }} />
                        ) : isStarted ? (
                          <PlayArrow sx={{ fontSize: 18, color: DARK.accent, mt: 0.25 }} />
                        ) : (
                          <Schedule sx={{ fontSize: 18, color: DARK.textMuted, mt: 0.25 }} />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ color: DARK.text, fontWeight: 500 }}>
                            {item.content}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                            <Typography variant="caption" sx={{ color: DARK.textMuted, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 12 }} />
                              {isCompleted ? 'Completed' : 'Started'} at {timeStr}
                            </Typography>
                            {duration !== null && (
                              <Typography variant="caption" sx={{ color: DARK.accent }}>
                                ({duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`})
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </Box>
                    );
                  })}
                </>
              )}

              {activitySummary.completed.length === 0 && activitySummary.inProgress.length === 0 && activitySummary.timeline.length === 0 && (
                <Typography variant="body2" sx={{ color: DARK.textMuted, mt: 1 }}>
                  No activity recorded yet. Start or complete tasks to see your timeline.
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* ── Footer ───────────────────────────── */}
        <Box sx={{
          position: 'sticky', bottom: 0,
          bgcolor: DARK.card, borderTop: `1px solid ${DARK.cardBorder}`,
          borderRadius: '0 0 8px 8px',
          px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100,
          mt: 2,
        }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {lastSaved && (
              <Typography variant="caption" sx={{ color: DARK.green, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleOutline sx={{ fontSize: 14 }} /> Last saved {lastSavedText}
              </Typography>
            )}
            {config && (
              <Typography variant="caption" sx={{ color: DARK.textMuted }}>
                &gt; {config.currentTasksFile?.toUpperCase().split('/').pop()}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button size="small" variant="outlined" onClick={handleExport} disabled={saving}
              sx={{ color: DARK.textMuted, borderColor: DARK.cardBorder, textTransform: 'none', fontSize: 13 }}>
              Export
            </Button>
            <Button
              size="small" variant="contained" startIcon={saving ? <CircularProgress size={14} /> : <CheckCircleOutline sx={{ fontSize: 16 }} />}
              onClick={() => setMessage({ type: 'success', text: 'All changes are auto-saved to database' })}
              sx={{ bgcolor: DARK.purple, textTransform: 'none', fontSize: 13, fontWeight: 600, px: 2.5, '&:hover': { bgcolor: DARK.accent } }}>
              Save Changes
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* ── Edit / Create Dialog ─────────────── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: DARK.card, color: DARK.text, border: `1px solid ${DARK.cardBorder}` } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editItem._isNew ? `New ${editItem._type || 'Task'}` : 'Edit Item'}
          <IconButton size="small" onClick={() => setEditOpen(false)} sx={{ color: DARK.textMuted }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth autoFocus multiline minRows={editItem._type === 'note' || editItem.task_type === 'note' ? 5 : 2}
            label="Content" value={editItem.content || ''} onChange={(e) => setEditItem({ ...editItem, content: e.target.value })}
            sx={{ mt: 1, mb: 2, '& .MuiInputBase-root': { color: DARK.text }, '& .MuiInputLabel-root': { color: DARK.textMuted }, '& .MuiOutlinedInput-notchedOutline': { borderColor: DARK.cardBorder } }}
          />
          {(editItem._type !== 'followup' && editItem.task_type !== 'followup') && (
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: DARK.textMuted }}>Priority</InputLabel>
                <Select value={editItem.priority || 3} label="Priority"
                  onChange={(e) => setEditItem({ ...editItem, priority: Number(e.target.value) })}
                  sx={{ color: DARK.text, '& .MuiOutlinedInput-notchedOutline': { borderColor: DARK.cardBorder } }}>
                  <MenuItem value={1}>🔥 High</MenuItem>
                  <MenuItem value={2}>⚠️ Medium</MenuItem>
                  <MenuItem value={3}>🕐 Low</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel sx={{ color: DARK.textMuted }}>Status</InputLabel>
                <Select value={editItem.status || 'pending'} label="Status"
                  onChange={(e) => setEditItem({ ...editItem, status: e.target.value as any })}
                  sx={{ color: DARK.text, '& .MuiOutlinedInput-notchedOutline': { borderColor: DARK.cardBorder } }}>
                  <MenuItem value="pending">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                  <MenuItem value="completed">Done</MenuItem>
                  <MenuItem value="cancelled">Deferred</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" label="Category" value={editItem.category || ''}
                onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                sx={{ flex: 1, '& .MuiInputBase-root': { color: DARK.text }, '& .MuiInputLabel-root': { color: DARK.textMuted }, '& .MuiOutlinedInput-notchedOutline': { borderColor: DARK.cardBorder } }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: DARK.textMuted }}>Cancel</Button>
          <Button variant="contained" onClick={saveEditItem} disabled={saving || !editItem.content?.trim()}
            sx={{ bgcolor: DARK.purple, '&:hover': { bgcolor: DARK.accent } }}>
            {saving ? 'Saving...' : editItem._isNew ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── History Dialog ────────────────────── */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: DARK.card, color: DARK.text, border: `1px solid ${DARK.cardBorder}` } }}>
        <DialogTitle>View History</DialogTitle>
        <DialogContent>
          {availableDates.length === 0 ? (
            <Typography variant="body2" sx={{ color: DARK.textMuted }}>No history available</Typography>
          ) : (
            availableDates.map((d) => (
              <Box key={d.date} onClick={() => { setSelectedDate(d.date); setHistoryOpen(false); }}
                sx={{ px: 2, py: 1.5, cursor: 'pointer', borderRadius: 1, display: 'flex', justifyContent: 'space-between',
                  '&:hover': { bgcolor: DARK.purpleBg }, bgcolor: d.date === selectedDate ? DARK.purpleBg : 'transparent' }}>
                <Typography variant="body2">{formatDate(new Date(d.date + 'T12:00:00'))}</Typography>
                <Chip label={`${d.count} items`} size="small" sx={{ bgcolor: DARK.grayBg, color: DARK.textMuted, height: 20, fontSize: 11 }} />
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setHistoryOpen(false); }}
            sx={{ color: DARK.accent }}>Go to Today</Button>
          <Button onClick={() => setHistoryOpen(false)} sx={{ color: DARK.textMuted }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Settings Dialog ───────────────────── */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: DARK.card, color: DARK.text, border: `1px solid ${DARK.cardBorder}` } }}>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          {config && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}><strong>Current Tasks File:</strong> {config.currentTasksFile}</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}><strong>Archive Directory:</strong> {config.archiveDirectory}</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}><strong>Environment Variable:</strong> {config.envVariable} = {config.currentValue}</Typography>
              <Divider sx={{ my: 2, borderColor: DARK.divider }} />
              <Typography variant="caption" sx={{ color: DARK.textMuted, fontStyle: 'italic' }}>
                To change the path, set the DAILY_TASKS_DIR environment variable and restart the server.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)} sx={{ color: DARK.textMuted }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Import Template Dialog ──────────── */}
      <Dialog open={importOpen} onClose={() => { setImportOpen(false); setSelectedTemplate(null); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: DARK.card, color: DARK.text, border: `1px solid ${DARK.cardBorder}` } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Import Template
          <IconButton size="small" onClick={() => { setImportOpen(false); setSelectedTemplate(null); }} sx={{ color: DARK.textMuted }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          {!selectedTemplate ? (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {BUILT_IN_TEMPLATES.map((tpl) => (
                <Box
                  key={tpl.name}
                  onClick={() => setSelectedTemplate(tpl)}
                  sx={{
                    px: 2.5, py: 2, borderRadius: 1.5, cursor: 'pointer',
                    border: `1px solid ${DARK.cardBorder}`,
                    '&:hover': { bgcolor: 'action.hover', borderColor: DARK.accent },
                    transition: 'all .15s',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: DARK.text }}>{tpl.name}</Typography>
                  <Typography variant="caption" sx={{ color: DARK.textMuted }}>{tpl.description}</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                    <Chip label={`${tpl.items.filter(i => i.task_type === 'task').length} tasks`} size="small" sx={{ height: 20, fontSize: 10, bgcolor: DARK.greenBg, color: DARK.green }} />
                    <Chip label={`${tpl.items.filter(i => i.task_type === 'note').length} notes`} size="small" sx={{ height: 20, fontSize: 10, bgcolor: DARK.yellowBg, color: DARK.yellow }} />
                    <Chip label={`${tpl.items.filter(i => i.task_type === 'followup').length} follow-ups`} size="small" sx={{ height: 20, fontSize: 10, bgcolor: DARK.purpleBg, color: DARK.accent }} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{selectedTemplate.name}</Typography>
              <Typography variant="body2" sx={{ color: DARK.textMuted, mb: 2 }}>{selectedTemplate.description}</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: DARK.textMuted, letterSpacing: 0.5, mb: 1 }}>
                ITEMS TO IMPORT ({selectedTemplate.items.length})
              </Typography>
              {selectedTemplate.items.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, '&:not(:last-child)': { borderBottom: `1px solid ${DARK.divider}` } }}>
                  <Chip label={item.task_type} size="small" sx={{ height: 18, fontSize: 10, textTransform: 'uppercase', bgcolor: DARK.grayBg, color: DARK.textMuted }} />
                  <Typography variant="body2" sx={{ color: DARK.text, flex: 1 }}>{item.content.split('\n')[0]}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {selectedTemplate ? (
            <>
              <Button onClick={() => setSelectedTemplate(null)} sx={{ color: DARK.textMuted }}>Back</Button>
              <Button variant="contained" onClick={() => importTemplate(selectedTemplate)} disabled={saving}
                sx={{ bgcolor: DARK.purple, '&:hover': { bgcolor: DARK.accent } }}>
                {saving ? 'Importing...' : `Import ${selectedTemplate.items.length} Items`}
              </Button>
            </>
          ) : (
            <Button onClick={() => setImportOpen(false)} sx={{ color: DARK.textMuted }}>Cancel</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── More menu ─────────────────────────── */}
      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}
        PaperProps={{ sx: { bgcolor: DARK.card, color: DARK.text, border: `1px solid ${DARK.cardBorder}` } }}>
        <MenuItem onClick={() => { loadItems(selectedDate); setMoreAnchor(null); }}>Refresh</MenuItem>
        <MenuItem onClick={() => { loadDates(); setMoreAnchor(null); }}>Reload Dates</MenuItem>
      </Menu>
    </Box>
  );
};

// ── Sub-components ─────────────────────────────────
const ToolBtn: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => {
  const DARK = useColors();
  return (
    <Button size="small" startIcon={icon} onClick={onClick}
      sx={{ color: DARK.textMuted, textTransform: 'none', fontSize: 13, px: 1.5, minWidth: 'auto', '&:hover': { color: DARK.text, bgcolor: 'action.hover' } }}>
      {label}
    </Button>
  );
};

const SectionHeader: React.FC<{ icon: string; title: string; onAdd?: () => void }> = ({ icon, title, onAdd }) => {
  const DARK = useColors();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 1, color: DARK.textMuted }}>
        <span>{icon}</span> {title}
      </Typography>
      {onAdd && (
        <IconButton size="small" onClick={onAdd} sx={{ color: DARK.textMuted, '&:hover': { color: DARK.accent } }}>
          <Add sx={{ fontSize: 18 }} />
        </IconButton>
      )}
    </Box>
  );
};

const MiniChip: React.FC<{ icon?: string; label: string; color: string; bg: string; filled?: boolean }> = ({ icon, label, color, bg, filled }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 0.8, py: 0.15,
    borderRadius: 0.75, fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
    color: filled ? '#fff' : color,
    bgcolor: filled ? color : bg,
    lineHeight: '16px',
  }}>
    {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
    {label}
  </Box>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => {
  const DARK = useColors();
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="body2" sx={{ color: DARK.textMuted }}>{text}</Typography>
    </Box>
  );
};

// Inline markdown renderer (bold, code, links)
function renderInline(text: string, linkColor: string = '#5D87FF'): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(110,118,129,.15);padding:1px 5px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" target="_blank" rel="noopener" style="color:${linkColor};text-decoration:none">$1</a>`);
}

export default DailyTasks;
