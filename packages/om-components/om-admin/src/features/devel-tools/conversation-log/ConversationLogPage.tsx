import { apiClient } from '@/api/utils/axiosInstance';
import {
    Alert,
    alpha,
    Badge,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    IconButton,
    InputAdornment,
    LinearProgress,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import {
    IconArrowUp,
    IconCalendar,
    IconChartBar,
    IconChecklist,
    IconChevronDown,
    IconChevronRight,
    IconDownload,
    IconFiles,
    IconFileText,
    IconMessage,
    IconPlus,
    IconRefresh,
    IconRobot,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
    IconTrash,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient as axiosInstance } from '../../../api/utils/axiosInstance';
import type { ConversationSummary, ConversationDetail, SearchResult, Stats, Task, ReviewResult, PipelineExportItem } from './ConversationLogPage/types';
import { AGENT_TOOLS_CONV, AGENT_TOOL_LABELS_CONV, AGENT_TOOL_COLORS_CONV, HORIZON_OPTIONS } from './ConversationLogPage/types';
import ConversationsTab from './ConversationLogPage/ConversationsTab';
import TasksTab from './ConversationLogPage/TasksTab';
import ReviewPipelineTab from './ConversationLogPage/ReviewPipelineTab';


const ConversationLogPage: React.FC = () => {
  const theme = useTheme();

  // ──────────────────────────────────────────────────────────────────
  // State buckets — grouped to keep this component under the
  // STATE_EXPLOSION threshold. Each bucket exposes named wrapper setters
  // so existing handler code and child components keep their signatures.
  // ──────────────────────────────────────────────────────────────────

  // ── Standalone UI state ──
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  // ── Conversations data bucket (replaces 15 useStates) ──
  type ConvFilter = 'all' | 'agent' | 'direct' | 'cascade';
  type SortField = 'date' | 'size' | 'messages';
  type SortDir = 'asc' | 'desc';
  const [conv, setConv] = useState({
    conversations: [] as ConversationSummary[],
    byDate: {} as Record<string, ConversationSummary[]>,
    loading: true,
    error: '',
    expandedDates: new Set<string>(),
    expandedConversation: null as string | null,
    conversationDetail: null as ConversationDetail | null,
    loadingDetail: false,
    stats: null as Stats | null,
    showStats: false,
    filterType: 'all' as ConvFilter,
    sortField: 'date' as SortField,
    sortDir: 'desc' as SortDir,
    selectedConvs: new Set<string>(),
    exporting: false,
  });
  const setConvField = useCallback(
    <K extends keyof typeof conv>(key: K, value: typeof conv[K] | ((prev: typeof conv[K]) => typeof conv[K])) => {
      setConv(prev => ({
        ...prev,
        [key]: typeof value === 'function' ? (value as (p: typeof conv[K]) => typeof conv[K])(prev[key]) : value,
      }));
    },
    [],
  );
  const {
    conversations, byDate, loading, error, expandedDates, expandedConversation,
    conversationDetail, loadingDetail, stats, showStats, filterType,
    sortField, sortDir, selectedConvs, exporting,
  } = conv;
  const setConversations = useCallback((value: ConversationSummary[]) => setConvField('conversations', value), [setConvField]);
  const setByDate = useCallback((value: Record<string, ConversationSummary[]>) => setConvField('byDate', value), [setConvField]);
  const setLoading = useCallback((value: boolean) => setConvField('loading', value), [setConvField]);
  const setError = useCallback((value: string) => setConvField('error', value), [setConvField]);
  const setExpandedDates: React.Dispatch<React.SetStateAction<Set<string>>> = useCallback(
    (action) => setConvField('expandedDates', action as any),
    [setConvField],
  );
  const setExpandedConversation = useCallback((value: string | null) => setConvField('expandedConversation', value), [setConvField]);
  const setConversationDetail = useCallback((value: ConversationDetail | null) => setConvField('conversationDetail', value), [setConvField]);
  const setLoadingDetail = useCallback((value: boolean) => setConvField('loadingDetail', value), [setConvField]);
  const setStats = useCallback((value: Stats | null) => setConvField('stats', value), [setConvField]);
  const setShowStats = useCallback((value: boolean) => setConvField('showStats', value), [setConvField]);
  const setFilterType = useCallback((value: ConvFilter) => setConvField('filterType', value), [setConvField]);
  const setSortField = useCallback((value: SortField) => setConvField('sortField', value), [setConvField]);
  const setSortDir: React.Dispatch<React.SetStateAction<SortDir>> = useCallback(
    (action) => setConvField('sortDir', action as any),
    [setConvField],
  );
  const setSelectedConvs: React.Dispatch<React.SetStateAction<Set<string>>> = useCallback(
    (action) => setConvField('selectedConvs', action as any),
    [setConvField],
  );
  const setExporting = useCallback((value: boolean) => setConvField('exporting', value), [setConvField]);

  // ── Tasks bucket (replaces 7 useStates) ──
  type TaskFilter = 'all' | 'pending' | 'completed';
  const [taskState, setTaskState] = useState({
    tasks: [] as Task[],
    tasksLoading: false,
    taskFilter: 'all' as TaskFilter,
    taskCategoryFilter: 'all',
    newTaskText: '',
    newTaskCategory: '',
    expandedTaskId: null as string | null,
  });
  const setTaskField = useCallback(
    <K extends keyof typeof taskState>(key: K, value: typeof taskState[K] | ((prev: typeof taskState[K]) => typeof taskState[K])) => {
      setTaskState(prev => ({
        ...prev,
        [key]: typeof value === 'function' ? (value as (p: typeof taskState[K]) => typeof taskState[K])(prev[key]) : value,
      }));
    },
    [],
  );
  const { tasks, tasksLoading, taskFilter, taskCategoryFilter, newTaskText, newTaskCategory, expandedTaskId } = taskState;
  const setTasks: React.Dispatch<React.SetStateAction<Task[]>> = useCallback(
    (action) => setTaskField('tasks', action as any),
    [setTaskField],
  );
  const setTasksLoading = useCallback((value: boolean) => setTaskField('tasksLoading', value), [setTaskField]);
  const setTaskFilter = useCallback((value: TaskFilter) => setTaskField('taskFilter', value), [setTaskField]);
  const setTaskCategoryFilter = useCallback((value: string) => setTaskField('taskCategoryFilter', value), [setTaskField]);
  const setNewTaskText = useCallback((value: string) => setTaskField('newTaskText', value), [setTaskField]);
  const setNewTaskCategory = useCallback((value: string) => setTaskField('newTaskCategory', value), [setTaskField]);
  const setExpandedTaskId = useCallback((value: string | null) => setTaskField('expandedTaskId', value), [setTaskField]);

  // ── Review & Pipeline bucket (replaces 7 useStates) ──
  const [review, setReview] = useState({
    reviewResults: [] as ReviewResult[],
    reviewLoading: false,
    reviewExpanded: null as string | null,
    pipelineItems: [] as PipelineExportItem[],
    pipelineAgentTool: '',
    pipelineHorizon: '7',
    pipelineExporting: false,
  });
  const setReviewField = useCallback(
    <K extends keyof typeof review>(key: K, value: typeof review[K] | ((prev: typeof review[K]) => typeof review[K])) => {
      setReview(prev => ({
        ...prev,
        [key]: typeof value === 'function' ? (value as (p: typeof review[K]) => typeof review[K])(prev[key]) : value,
      }));
    },
    [],
  );
  const { reviewResults, reviewLoading, reviewExpanded, pipelineItems, pipelineAgentTool, pipelineHorizon, pipelineExporting } = review;
  const setReviewResults = useCallback((value: ReviewResult[]) => setReviewField('reviewResults', value), [setReviewField]);
  const setReviewLoading = useCallback((value: boolean) => setReviewField('reviewLoading', value), [setReviewField]);
  const setReviewExpanded: React.Dispatch<React.SetStateAction<string | null>> = useCallback(
    (action) => setReviewField('reviewExpanded', action as any),
    [setReviewField],
  );
  const setPipelineItems: React.Dispatch<React.SetStateAction<PipelineExportItem[]>> = useCallback(
    (action) => setReviewField('pipelineItems', action as any),
    [setReviewField],
  );
  const setPipelineAgentTool: React.Dispatch<React.SetStateAction<string>> = useCallback(
    (action) => setReviewField('pipelineAgentTool', action as any),
    [setReviewField],
  );
  const setPipelineHorizon: React.Dispatch<React.SetStateAction<string>> = useCallback(
    (action) => setReviewField('pipelineHorizon', action as any),
    [setReviewField],
  );
  const setPipelineExporting = useCallback((value: boolean) => setReviewField('pipelineExporting', value), [setReviewField]);

  // ── Bulk export bucket (replaces 3 useStates) ──
  const [bulkExport, setBulkExport] = useState({
    bulkExportPreview: null as any[] | null,
    bulkExportLoading: false,
    bulkExportResult: null as { count: number; skipped: number } | null,
  });
  const setBulkExportField = useCallback(
    <K extends keyof typeof bulkExport>(key: K, value: typeof bulkExport[K]) => {
      setBulkExport(prev => ({ ...prev, [key]: value }));
    },
    [],
  );
  const { bulkExportPreview, bulkExportLoading, bulkExportResult } = bulkExport;
  const setBulkExportPreview = useCallback((value: any[] | null) => setBulkExportField('bulkExportPreview', value), [setBulkExportField]);
  const setBulkExportLoading = useCallback((value: boolean) => setBulkExportField('bulkExportLoading', value), [setBulkExportField]);
  const setBulkExportResult = useCallback((value: { count: number; skipped: number } | null) => setBulkExportField('bulkExportResult', value), [setBulkExportField]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data: any = await axiosInstance.get('/api/conversation-log/list');
      if (data.success) {
        setConversations(data.conversations || []);
        setByDate(data.byDate || {});
      } else {
        setError(data.error || 'Failed to load conversations');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data: any = await axiosInstance.get('/api/conversation-log/stats');
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchDetail = useCallback(async (filename: string) => {
    if (expandedConversation === filename) {
      setExpandedConversation(null);
      setConversationDetail(null);
      return;
    }
    setExpandedConversation(filename);
    setLoadingDetail(true);
    try {
      const data: any = await axiosInstance.get(`/api/conversation-log/detail/${encodeURIComponent(filename)}`);
      if (data.success) {
        setConversationDetail(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [expandedConversation]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const data: any = await axiosInstance.get(`/api/conversation-log/search?q=${encodeURIComponent(query.trim())}`);
      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (err: any) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => handleSearch(val), 500);
    } else {
      setSearchResults(null);
    }
  }, [handleSearch]);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const data: any = await axiosInstance.get('/api/conversation-log/tasks');
      if (data.success) setTasks(data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const toggleTask = useCallback(async (taskId: string, completed: boolean) => {
    try {
      await axiosInstance.put(`/api/conversation-log/tasks/${taskId}`, { completed });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed, updatedAt: new Date().toISOString() } : t));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  }, []);

  const addTask = useCallback(async () => {
    if (!newTaskText.trim()) return;
    try {
      const data: any = await axiosInstance.post('/api/conversation-log/tasks', {
        text: newTaskText.trim(),
        category: newTaskCategory.trim() || 'general',
        source: 'manual',
      });
      if (data.success) {
        setTasks(prev => [...prev, data.task]);
        setNewTaskText('');
        setNewTaskCategory('');
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  }, [newTaskText, newTaskCategory]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await axiosInstance.delete(`/api/conversation-log/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, []);

  const toggleConvSelection = useCallback((filename: string) => {
    setSelectedConvs(prev => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  const selectAllForDate = useCallback((date: string) => {
    const convs = byDate[date] || [];
    setSelectedConvs(prev => {
      const next = new Set(prev);
      const allSelected = convs.every(c => next.has(c.filename));
      if (allSelected) {
        convs.forEach(c => next.delete(c.filename));
      } else {
        convs.forEach(c => next.add(c.filename));
      }
      return next;
    });
  }, [byDate]);

  const handleCombineExport = useCallback(async (date?: string) => {
    setExporting(true);
    try {
      const body: any = {};
      if (date) {
        body.date = date;
      } else if (selectedConvs.size > 0) {
        body.filenames = [...selectedConvs];
      } else {
        setSnackbar({ open: true, message: 'Select conversations or use a date group to export', severity: 'error' });
        setExporting(false);
        return;
      }

      const blob = await apiClient.post<any>('/conversation-log/combine-export', body, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-${date || 'selected'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: `Exported ${date ? 'all conversations for ' + date : selectedConvs.size + ' conversation(s)'}`, severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    } finally {
      setExporting(false);
    }
  }, [selectedConvs]);

  const handleExportSingle = useCallback(async (filename: string) => {
    try {
      const blob = await apiClient.get<any>(`/conversation-log/export/${encodeURIComponent(filename)}`, { responseType: 'blob' } as any);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    }
  }, []);

  // ─── Review & Pipeline Handlers ─────────────────────────────────

  const handleReviewSelected = useCallback(async () => {
    if (selectedConvs.size === 0) {
      setSnackbar({ open: true, message: 'Select conversations to review', severity: 'error' });
      return;
    }
    setReviewLoading(true);
    setActiveTab(2);
    try {
      const data = await apiClient.post<any>('/conversation-log/review/batch', { filenames: [...selectedConvs] });
      if (data.success) {
        setReviewResults(data.results || []);
        // Auto-generate pipeline items from insights
        const items: PipelineExportItem[] = [];
        for (const result of (data.results || [])) {
          const ins = result.insights as ConversationInsights;
          for (const task of ins.tasks) {
            items.push({
              title: task.text,
              description: `From conversation: ${result.title || result.filename}`,
              horizon: pipelineHorizon,
              priority: 'medium',
              category: 'follow-up',
              task_type: 'task',
              status: 'backlog',
              enabled: true,
            });
          }
          for (const feat of ins.featuresBuilt) {
            items.push({
              title: `Document: ${feat}`,
              description: `Feature built in: ${result.title || result.filename}`,
              horizon: pipelineHorizon,
              priority: 'low',
              category: 'documentation',
              task_type: 'note',
              status: 'done',
              enabled: false,
            });
          }
          for (const bug of ins.bugsFixed) {
            items.push({
              title: `Verify fix: ${bug}`,
              description: `Bug fixed in: ${result.title || result.filename}`,
              horizon: '2',
              priority: 'high',
              category: 'qa',
              task_type: 'task',
              status: 'backlog',
              enabled: true,
            });
          }
        }
        setPipelineItems(items);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Review failed', severity: 'error' });
    } finally {
      setReviewLoading(false);
    }
  }, [selectedConvs, pipelineHorizon]);

  const handleReviewSingle = useCallback(async (filename: string) => {
    setReviewLoading(true);
    setActiveTab(2);
    try {
      const data = await apiClient.get<any>(`/conversation-log/review/${encodeURIComponent(filename)}`);
      if (data.success) {
        setReviewResults([data]);
        const ins = data.insights as ConversationInsights;
        const items: PipelineExportItem[] = [];
        for (const task of ins.tasks) {
          items.push({
            title: task.text,
            description: `From: ${data.title || filename}`,
            horizon: pipelineHorizon,
            priority: 'medium',
            category: 'follow-up',
            task_type: 'task',
            status: 'todo',
            enabled: true,
          });
        }
        for (const bug of ins.bugsFixed) {
          items.push({
            title: `Verify fix: ${bug}`,
            description: `Bug fixed in: ${data.title || filename}`,
            horizon: '2',
            priority: 'high',
            category: 'qa',
            task_type: 'task',
            status: 'todo',
            enabled: true,
          });
        }
        setPipelineItems(items);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Review failed', severity: 'error' });
    } finally {
      setReviewLoading(false);
    }
  }, [pipelineHorizon]);

  const handleExportToPipeline = useCallback(async () => {
    const enabledItems = pipelineItems.filter(i => i.enabled);
    if (enabledItems.length === 0) {
      setSnackbar({ open: true, message: 'No items enabled for export', severity: 'error' });
      return;
    }
    setPipelineExporting(true);
    try {
      const convRef = reviewResults.length === 1
        ? reviewResults[0].filename
        : `batch-${reviewResults.length}-convs`;
      const data = await apiClient.post<any>('/conversation-log/export-to-pipeline', {
        items: enabledItems,
        conversation_ref: convRef,
        agent_tool: pipelineAgentTool || null,
      });
      if (data.success) {
        setSnackbar({ open: true, message: `${data.count} item(s) exported to OM Daily pipeline`, severity: 'success' });
        setPipelineItems(prev => prev.map(i => i.enabled ? { ...i, enabled: false } : i));
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    } finally {
      setPipelineExporting(false);
    }
  }, [pipelineItems, pipelineAgentTool, reviewResults]);

  const handleBulkExportPreview = useCallback(async () => {
    setBulkExportLoading(true);
    setBulkExportPreview(null);
    setBulkExportResult(null);
    try {
      const data = await apiClient.post<any>('/conversation-log/tasks/export-completed-to-pipeline', { agent_tool: pipelineAgentTool || null, horizon: pipelineHorizon, auto_branch: true, dry_run: true });
      if (data.success) {
        setBulkExportPreview(data.items || []);
        if (data.skipped > 0) {
          setSnackbar({ open: true, message: `${data.would_create} items ready, ${data.skipped} already in pipeline (skipped)`, severity: 'success' });
        }
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Preview failed', severity: 'error' });
    } finally {
      setBulkExportLoading(false);
    }
  }, [pipelineAgentTool, pipelineHorizon]);

  const handleBulkExportConfirm = useCallback(async () => {
    setBulkExportLoading(true);
    try {
      const data = await apiClient.post<any>('/conversation-log/tasks/export-completed-to-pipeline', { agent_tool: pipelineAgentTool || null, horizon: pipelineHorizon, auto_branch: true, dry_run: false });
      if (data.success) {
        setBulkExportResult({ count: data.count, skipped: data.skipped });
        setBulkExportPreview(null);
        setSnackbar({ open: true, message: `${data.count} completed tasks exported to OM Daily pipeline`, severity: 'success' });
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    } finally {
      setBulkExportLoading(false);
    }
  }, [pipelineAgentTool, pipelineHorizon]);

  const handleAddPipelineItem = useCallback(() => {
    setPipelineItems(prev => [...prev, {
      title: '',
      description: '',
      horizon: pipelineHorizon,
      priority: 'medium',
      category: '',
      task_type: 'task',
      status: 'todo',
      enabled: true,
    }]);
  }, [pipelineHorizon]);

  const handleRemovePipelineItem = useCallback((index: number) => {
    setPipelineItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdatePipelineItem = useCallback((index: number, field: string, value: any) => {
    setPipelineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }, []);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (taskFilter === 'completed') filtered = filtered.filter(t => t.completed);
    else if (taskFilter === 'pending') filtered = filtered.filter(t => !t.completed);
    if (taskCategoryFilter !== 'all') filtered = filtered.filter(t => t.category === taskCategoryFilter);
    return filtered;
  }, [tasks, taskFilter, taskCategoryFilter]);

  const taskCategories = useMemo(() => {
    const cats = new Set(tasks.map(t => t.category));
    return [...cats].sort();
  }, [tasks]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    return { total, completed, pending: total - completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tasks]);

  useEffect(() => {
    fetchConversations();
    fetchStats();
    fetchTasks();
  }, [fetchConversations, fetchStats, fetchTasks]);

  const sortedDates = useMemo(() => {
    return Object.keys(byDate).sort().reverse();
  }, [byDate]);

  const filteredByDate = useMemo(() => {
    const source = filterType === 'all' ? byDate : (() => {
      const filtered: Record<string, ConversationSummary[]> = {};
      for (const [date, convs] of Object.entries(byDate)) {
        const f = convs.filter(c => {
          if (filterType === 'cascade') return c.format === 'cascade';
          if (filterType === 'agent') return c.isAgent && c.format !== 'cascade';
          if (filterType === 'direct') return !c.isAgent && c.format !== 'cascade';
          return true;
        });
        if (f.length > 0) filtered[date] = f;
      }
      return filtered;
    })();

    // Sort conversations within each date group
    const sorted: Record<string, ConversationSummary[]> = {};
    for (const [date, convs] of Object.entries(source)) {
      const copy = [...convs];
      copy.sort((a, b) => {
        let cmp = 0;
        if (sortField === 'size') cmp = a.size - b.size;
        else if (sortField === 'messages') cmp = a.messageCount - b.messageCount;
        else cmp = a.filename.localeCompare(b.filename);
        return sortDir === 'desc' ? -cmp : cmp;
      });
      sorted[date] = copy;
    }
    return sorted;
  }, [byDate, filterType, sortField, sortDir]);

  const filteredDates = useMemo(() => {
    const dates = Object.keys(filteredByDate);
    if (sortField === 'date') {
      dates.sort((a, b) => sortDir === 'desc' ? b.localeCompare(a) : a.localeCompare(b));
    } else {
      // Sort date groups by aggregate of sort field
      dates.sort((a, b) => {
        const aConvs = filteredByDate[a] || [];
        const bConvs = filteredByDate[b] || [];
        let aVal = 0, bVal = 0;
        if (sortField === 'size') {
          aVal = aConvs.reduce((s, c) => s + c.size, 0);
          bVal = bConvs.reduce((s, c) => s + c.size, 0);
        } else if (sortField === 'messages') {
          aVal = aConvs.reduce((s, c) => s + c.messageCount, 0);
          bVal = bConvs.reduce((s, c) => s + c.messageCount, 0);
        }
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }
    return dates;
  }, [filteredByDate, sortField, sortDir]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <Box component="span" sx={{ bgcolor: 'warning.light', color: 'warning.contrastText', px: 0.3, borderRadius: 0.5, fontWeight: 700 }}>
          {text.substring(idx, idx + query.length)}
        </Box>
        {text.substring(idx + query.length)}
      </>
    );
  };

  };

  return (
    <Box ref={topRef} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Conversation Log
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete history of Claude conversations, organized by date
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Toggle Stats">
            <IconButton onClick={() => { setShowStats(!showStats); if (!stats) fetchStats(); }}>
              <IconChartBar size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={() => { fetchConversations(); fetchStats(); fetchTasks(); }}>
              <IconRefresh size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
      >
        <Tab label="Conversations" icon={<IconMessage size={16} />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Tasks</span>
              {taskStats.pending > 0 && (
                <Chip label={taskStats.pending} size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>
          }
          icon={<IconChecklist size={16} />}
          iconPosition="start"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Review & Pipeline</span>
              {reviewResults.length > 0 && (
                <Chip label={reviewResults.length} size="small" color="secondary" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>
          }
          icon={<IconFileText size={16} />}
          iconPosition="start"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        />
      </Tabs>

      {activeTab === 0 && (
        <ConversationsTab
          conversations={conversations}
          byDate={byDate}
          stats={stats}
          conversationDetail={conversationDetail}
          searchResults={searchResults}
          loading={loading}
          error={error}
          searching={searching}
          showStats={showStats}
          loadingDetail={loadingDetail}
          exporting={exporting}
          expandedDates={expandedDates}
          expandedConversation={expandedConversation}
          selectedConvs={selectedConvs}
          searchQuery={searchQuery}
          filterType={filterType}
          sortField={sortField}
          sortDir={sortDir}
          onSearchChange={(q) => setSearchQuery(q)}
          onClearSearch={() => { setSearchQuery(''); setSearchResults(null); }}
          onSetFilterType={setFilterType}
          onSetSortField={setSortField}
          onToggleSortDir={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          onSetSelectedConvs={setSelectedConvs}
          onToggleDate={(date) => setExpandedDates(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; })}
          onFetchDetail={fetchDetail}
          onExportSingle={exportSingle}
          onSetShowStats={setShowStats}
          onSetExpandedConversation={setExpandedConversation}
        />
      )}

      {activeTab === 1 && (
        <TasksTab
          tasks={tasks}
          tasksLoading={tasksLoading}
          taskFilter={taskFilter}
          setTaskFilter={setTaskFilter}
          taskCategoryFilter={taskCategoryFilter}
          setTaskCategoryFilter={setTaskCategoryFilter}
          newTaskText={newTaskText}
          setNewTaskText={setNewTaskText}
          newTaskCategory={newTaskCategory}
          setNewTaskCategory={setNewTaskCategory}
          expandedTaskId={expandedTaskId}
          setExpandedTaskId={setExpandedTaskId}
          addTask={addTask}
          toggleTask={toggleTask}
          deleteTask={deleteTask}
        />
      )}

      {/* ===== TAB 2: Review & Pipeline ===== */}
      {activeTab === 2 && (
        <ReviewPipelineTab
          reviewResults={reviewResults}
          reviewLoading={reviewLoading}
          reviewExpanded={reviewExpanded}
          setReviewExpanded={setReviewExpanded}
          pipelineItems={pipelineItems}
          setPipelineItems={setPipelineItems}
          pipelineAgentTool={pipelineAgentTool}
          setPipelineAgentTool={setPipelineAgentTool}
          pipelineHorizon={pipelineHorizon}
          setPipelineHorizon={setPipelineHorizon}
          pipelineExporting={pipelineExporting}
          onExportToPipeline={handleExportToPipeline}
          onAddPipelineItem={handleAddPipelineItem}
          onRemovePipelineItem={handleRemovePipelineItem}
          onUpdatePipelineItem={handleUpdatePipelineItem}
          onNavigateToConversations={() => setActiveTab(0)}
        />
      )}

      {/* Scroll to top */}
      <Tooltip title="Back to top">
        <IconButton
          onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
            boxShadow: 3,
          }}
        >
          <IconArrowUp size={20} />
        </IconButton>
      </Tooltip>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConversationLogPage;
