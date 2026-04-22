/**
 * ChangeSetsDashboard.tsx
 * Primary management surface for change_set delivery containers.
 * Lists all change_sets with status filters, priority indicators, quick actions,
 * and a calendar planning view for weekly/monthly sprint scheduling.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FilterList as FilterIcon,
  History as HistoryIcon,
  Inventory2 as PackageIcon,
  Refresh as RefreshIcon,
  ViewList as ListIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
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
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/shared/lib/apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChangeSet {
  id: number;
  code: string;
  title: string;
  status: string;
  priority: string;
  change_type: string;
  git_branch: string | null;
  deployment_strategy: string;
  has_db_changes: boolean;
  item_count: number;
  created_by_email: string;
  reviewed_by_email: string | null;
  target_start_date: string | null;
  target_end_date: string | null;
  staged_at: string | null;
  approved_at: string | null;
  promoted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:              { label: 'Planned',            color: '#7e57c2' },
  active:             { label: 'Active',             color: '#1976d2' },
  ready_for_staging:  { label: 'Ready for Staging',  color: '#ed6c02' },
  staged:             { label: 'Staged',             color: '#9c27b0' },
  in_review:          { label: 'In Review',          color: '#0288d1' },
  approved:           { label: 'Approved',           color: '#2e7d32' },
  promoted:           { label: 'Promoted',           color: '#388e3c' },
  rejected:           { label: 'Rejected',           color: '#d32f2f' },
  rolled_back:        { label: 'Rolled Back',        color: '#f44336' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default' }> = {
  critical: { label: 'Critical', color: 'error' },
  high:     { label: 'High',     color: 'warning' },
  medium:   { label: 'Medium',   color: 'info' },
  low:      { label: 'Low',      color: 'default' },
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  feature:  'Feature',
  bugfix:   'Bugfix',
  hotfix:   'Hotfix',
  refactor: 'Refactor',
  infra:    'Infra',
};

// ── Calendar helpers ──────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function getWeekDays(baseDate: Date) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function dateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function parseDateStr(s: string | null): Date | null {
  if (!s) return null;
  // Handle both "2026-04-06" and "2026-04-06T04:00:00.000Z" formats
  const d = s.includes('T') ? new Date(s) : new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Component ─────────────────────────────────────────────────────────────────

const ChangeSetsDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  type ListBucket = {
    changeSets: ChangeSet[];
    total: number;
    loading: boolean;
    statusFilter: string;
    typeFilter: string;
    priorityFilter: string;
    viewMode: 'list' | 'calendar';
    calMode: 'month' | 'week';
  };
  const [list, setList] = useState<ListBucket>({
    changeSets: [],
    total: 0,
    loading: true,
    statusFilter: '',
    typeFilter: '',
    priorityFilter: '',
    viewMode: 'list',
    calMode: 'month',
  });
  const setListField = useCallback(<K extends keyof ListBucket>(key: K, value: ListBucket[K]) => {
    setList(prev => ({ ...prev, [key]: value }));
  }, []);
  const { changeSets, total, loading, statusFilter, typeFilter, priorityFilter, viewMode, calMode } = list;
  const setChangeSets = useCallback((v: ChangeSet[]) => setListField('changeSets', v), [setListField]);
  const setTotal = useCallback((v: number) => setListField('total', v), [setListField]);
  const setLoading = useCallback((v: boolean) => setListField('loading', v), [setListField]);
  const setStatusFilter = useCallback((v: string) => setListField('statusFilter', v), [setListField]);
  const setTypeFilter = useCallback((v: string) => setListField('typeFilter', v), [setListField]);
  const setPriorityFilter = useCallback((v: string) => setListField('priorityFilter', v), [setListField]);
  const setViewMode = useCallback((v: 'list' | 'calendar') => setListField('viewMode', v), [setListField]);
  const setCalMode = useCallback((v: 'month' | 'week') => setListField('calMode', v), [setListField]);

  type CreateBucket = {
    createOpen: boolean;
    creating: boolean;
    newTitle: string;
    newType: string;
    newPriority: string;
    newBranch: string;
    newStrategy: string;
    newStartDate: string;
    newEndDate: string;
  };
  const [createForm, setCreateForm] = useState<CreateBucket>({
    createOpen: false,
    creating: false,
    newTitle: '',
    newType: 'feature',
    newPriority: 'medium',
    newBranch: '',
    newStrategy: 'stage_then_promote',
    newStartDate: '',
    newEndDate: '',
  });
  const setCreateField = useCallback(<K extends keyof CreateBucket>(key: K, value: CreateBucket[K]) => {
    setCreateForm(prev => ({ ...prev, [key]: value }));
  }, []);
  const { createOpen, creating, newTitle, newType, newPriority, newBranch, newStrategy, newStartDate, newEndDate } = createForm;
  const setCreateOpen = useCallback((v: boolean) => setCreateField('createOpen', v), [setCreateField]);
  const setCreating = useCallback((v: boolean) => setCreateField('creating', v), [setCreateField]);
  const setNewTitle = useCallback((v: string) => setCreateField('newTitle', v), [setCreateField]);
  const setNewType = useCallback((v: string) => setCreateField('newType', v), [setCreateField]);
  const setNewPriority = useCallback((v: string) => setCreateField('newPriority', v), [setCreateField]);
  const setNewBranch = useCallback((v: string) => setCreateField('newBranch', v), [setCreateField]);
  const setNewStrategy = useCallback((v: string) => setCreateField('newStrategy', v), [setCreateField]);
  const setNewStartDate = useCallback((v: string) => setCreateField('newStartDate', v), [setCreateField]);
  const setNewEndDate = useCallback((v: string) => setCreateField('newEndDate', v), [setCreateField]);

  const [calDate, setCalDate] = useState(() => new Date());

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/om-daily', title: 'OM Daily' },
    { title: 'Change Sets' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.change_type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await apiClient.get('/admin/change-sets', { params });
      setChangeSets(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load change sets:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, priorityFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await apiClient.post('/admin/change-sets', {
        title: newTitle.trim(),
        change_type: newType,
        priority: newPriority,
        git_branch: newBranch.trim() || undefined,
        deployment_strategy: newStrategy,
        target_start_date: newStartDate || undefined,
        target_end_date: newEndDate || undefined,
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewBranch('');
      setNewStartDate('');
      setNewEndDate('');
      navigate(`/admin/control-panel/om-daily/change-sets/${res.data.change_set.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create change set');
    } finally {
      setCreating(false);
    }
  };

  // ── Calendar data mapping ───────────────────────────────────────────────

  /** Build a map of dateString → ChangeSet[] for calendar rendering */
  const calendarItems = useMemo(() => {
    const map: Record<string, ChangeSet[]> = {};
    for (const cs of changeSets) {
      const start = parseDateStr(cs.target_start_date);
      const end = parseDateStr(cs.target_end_date);
      // Use created_at as fallback for items without planned dates
      const fallback = new Date(cs.created_at);

      if (start && end) {
        // Span across range
        const cursor = new Date(start);
        while (cursor <= end) {
          const key = dateStr(cursor);
          if (!map[key]) map[key] = [];
          map[key].push(cs);
          cursor.setDate(cursor.getDate() + 1);
        }
      } else if (start) {
        const key = dateStr(start);
        if (!map[key]) map[key] = [];
        map[key].push(cs);
      } else {
        // Place on created_at date
        const key = dateStr(fallback);
        if (!map[key]) map[key] = [];
        map[key].push(cs);
      }
    }
    return map;
  }, [changeSets]);

  // ── Calendar navigation ─────────────────────────────────────────────────

  const calNav = (dir: -1 | 1) => {
    setCalDate(prev => {
      const d = new Date(prev);
      if (calMode === 'month') d.setMonth(d.getMonth() + dir);
      else d.setDate(d.getDate() + (dir * 7));
      return d;
    });
  };

  const calToday = () => setCalDate(new Date());

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderStatusChip = (cs: ChangeSet) => {
    const sc = STATUS_CONFIG[cs.status] || STATUS_CONFIG.draft;
    return (
      <Chip
        label={sc.label}
        size="small"
        sx={{
          bgcolor: alpha(sc.color, 0.12),
          color: sc.color,
          fontWeight: 600,
          fontSize: '0.7rem',
          height: 20,
        }}
      />
    );
  };

  const renderCalendarCell = (items: ChangeSet[] | undefined) => {
    if (!items || items.length === 0) return null;
    // Show up to 3 items, then "+N more"
    const show = items.slice(0, 3);
    const remaining = items.length - show.length;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
        {show.map(cs => {
          const sc = STATUS_CONFIG[cs.status] || STATUS_CONFIG.draft;
          const pc = PRIORITY_CONFIG[cs.priority];
          return (
            <Tooltip key={cs.id} title={`${cs.code} — ${cs.title}`} placement="top">
              <Box
                onClick={(e) => { e.stopPropagation(); navigate(`/admin/control-panel/om-daily/change-sets/${cs.id}`); }}
                sx={{
                  px: 0.5,
                  py: 0.2,
                  borderRadius: 0.5,
                  bgcolor: alpha(sc.color, 0.15),
                  borderLeft: `3px solid ${sc.color}`,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: alpha(sc.color, 0.25) },
                  overflow: 'hidden',
                }}
              >
                <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem', fontWeight: 600, color: sc.color, display: 'block' }}>
                  {cs.code}
                </Typography>
                <Typography variant="caption" noWrap sx={{ fontSize: '0.6rem', color: 'text.secondary', display: 'block' }}>
                  {cs.title}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
        {remaining > 0 && (
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', pl: 0.5 }}>
            +{remaining} more
          </Typography>
        )}
      </Box>
    );
  };

  // ── Monthly calendar view ───────────────────────────────────────────────

  const renderMonthView = () => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const days = getMonthDays(year, month);
    const todayStr = dateStr(new Date());
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    // Pad last week
    while (weeks[weeks.length - 1].length < 7) weeks[weeks.length - 1].push(null);

    return (
      <Box>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {DAY_NAMES.map(d => (
                <TableCell key={d} align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1, borderBottom: `2px solid ${theme.palette.divider}` }}>
                  {d}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {weeks.map((week, wi) => (
              <TableRow key={wi}>
                {week.map((day, di) => {
                  if (day === null) {
                    return <TableCell key={di} sx={{ borderRight: `1px solid ${theme.palette.divider}`, height: 100, verticalAlign: 'top' }} />;
                  }
                  const cellDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = cellDate === todayStr;
                  const items = calendarItems[cellDate];

                  return (
                    <TableCell
                      key={di}
                      sx={{
                        borderRight: `1px solid ${theme.palette.divider}`,
                        height: 100,
                        verticalAlign: 'top',
                        p: 0.5,
                        ...(isToday ? { bgcolor: alpha(theme.palette.primary.main, 0.06) } : {}),
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: isToday ? 700 : 400,
                          color: isToday ? 'primary.main' : 'text.secondary',
                          fontSize: '0.75rem',
                        }}
                      >
                        {day}
                      </Typography>
                      {renderCalendarCell(items)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  // ── Weekly calendar view ────────────────────────────────────────────────

  const renderWeekView = () => {
    const weekDays = getWeekDays(calDate);
    const todayStr = dateStr(new Date());

    return (
      <Box>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {weekDays.map((d, i) => {
                const ds = dateStr(d);
                const isToday = ds === todayStr;
                return (
                  <TableCell
                    key={i}
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      py: 1,
                      borderBottom: `2px solid ${theme.palette.divider}`,
                      ...(isToday ? { bgcolor: alpha(theme.palette.primary.main, 0.06) } : {}),
                    }}
                  >
                    {DAY_NAMES[i]}
                    <Typography variant="caption" display="block" sx={{ fontWeight: isToday ? 700 : 400, color: isToday ? 'primary.main' : 'text.secondary' }}>
                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Typography>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {weekDays.map((d, i) => {
                const ds = dateStr(d);
                const isToday = ds === todayStr;
                const items = calendarItems[ds];
                return (
                  <TableCell
                    key={i}
                    sx={{
                      borderRight: `1px solid ${theme.palette.divider}`,
                      height: 280,
                      verticalAlign: 'top',
                      p: 0.5,
                      ...(isToday ? { bgcolor: alpha(theme.palette.primary.main, 0.04) } : {}),
                    }}
                  >
                    {renderCalendarCell(items)}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    );
  };

  return (
    <PageContainer title="Change Sets" description="SDLC Delivery Containers">
      <Breadcrumb title="Change Sets" items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              <PackageIcon sx={{ mr: 1, verticalAlign: 'middle', color: theme.palette.primary.main }} />
              Change Sets
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {total} delivery container{total !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v) => v && setViewMode(v)}
              size="small"
            >
              <ToggleButton value="list" sx={{ px: 1.5 }}>
                <ListIcon sx={{ fontSize: 18, mr: 0.5 }} /> List
              </ToggleButton>
              <ToggleButton value="calendar" sx={{ px: 1.5 }}>
                <CalendarIcon sx={{ fontSize: 18, mr: 0.5 }} /> Calendar
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              startIcon={<PackageIcon />}
              onClick={() => navigate('/admin/control-panel/om-daily/sdlc-wizard')}
            >
              SDLC Wizard
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon />}
              onClick={() => navigate('/admin/control-panel/om-daily/change-sets/releases')}
            >
              Release History
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              New Change Set
            </Button>
            <IconButton size="small" onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Status summary chips */}
        {!loading && changeSets.length > 0 && !statusFilter && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {Object.entries(
              changeSets.reduce((acc, cs) => { acc[cs.status] = (acc[cs.status] || 0) + 1; return acc; }, {} as Record<string, number>)
            ).map(([status, count]) => {
              const sc = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
              return (
                <Chip key={status} label={`${sc.label}: ${count}`} size="small"
                  onClick={() => setStatusFilter(status)}
                  sx={{ bgcolor: alpha(sc.color, 0.1), color: sc.color, fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}
                />
              );
            })}
          </Box>
        )}

        {/* Filters (list view only) */}
        {viewMode === 'list' && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel><FilterIcon sx={{ fontSize: 16, mr: 0.5 }} />Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {Object.entries(CHANGE_TYPE_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
            {(statusFilter || typeFilter || priorityFilter) && (
              <Button size="small" onClick={() => { setStatusFilter(''); setTypeFilter(''); setPriorityFilter(''); }}>
                Clear Filters
              </Button>
            )}
          </Box>
        )}

        {/* Calendar navigation bar */}
        {viewMode === 'calendar' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ToggleButtonGroup
              value={calMode}
              exclusive
              onChange={(_, v) => v && setCalMode(v)}
              size="small"
            >
              <ToggleButton value="month" sx={{ px: 1.5, fontSize: '0.75rem' }}>Month</ToggleButton>
              <ToggleButton value="week" sx={{ px: 1.5, fontSize: '0.75rem' }}>Week</ToggleButton>
            </ToggleButtonGroup>
            <IconButton size="small" onClick={() => calNav(-1)}><ChevronLeft /></IconButton>
            <Button size="small" variant="text" onClick={calToday} sx={{ textTransform: 'none', fontWeight: 600, minWidth: 160 }}>
              {calMode === 'month'
                ? `${MONTH_NAMES[calDate.getMonth()]} ${calDate.getFullYear()}`
                : `Week of ${getWeekDays(calDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              }
            </Button>
            <IconButton size="small" onClick={() => calNav(1)}><ChevronRight /></IconButton>
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_CONFIG).slice(0, 5).map(([key, cfg]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: cfg.color }} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>{cfg.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Target Dates</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Next Step</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : changeSets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No change sets found</Typography>
                      <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ mt: 1 }}>
                        Create your first change set
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  changeSets.map((cs) => {
                    const sc = STATUS_CONFIG[cs.status] || STATUS_CONFIG.draft;
                    const pc = PRIORITY_CONFIG[cs.priority] || PRIORITY_CONFIG.medium;
                    const fmtDate = (d: string | null) => {
                      if (!d) return null;
                      const dt = d.includes('T') ? new Date(d) : new Date(d + 'T00:00:00');
                      return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    };
                    const startLabel = fmtDate(cs.target_start_date);
                    const endLabel = fmtDate(cs.target_end_date);
                    const dateRange = startLabel && endLabel
                      ? `${startLabel} – ${endLabel}`
                      : startLabel || endLabel || null;

                    return (
                      <TableRow
                        key={cs.id}
                        hover
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(sc.color, 0.04) } }}
                        onClick={() => navigate(`/admin/control-panel/om-daily/change-sets/${cs.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                            {cs.code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 280 }}>
                              {cs.title}
                            </Typography>
                            {cs.has_db_changes && (
                              <Chip label="DB" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {renderStatusChip(cs)}
                        </TableCell>
                        <TableCell>
                          <Chip label={pc.label} size="small" color={pc.color} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {CHANGE_TYPE_LABELS[cs.change_type] || cs.change_type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {dateRange ? (
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                              {dateRange}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>{cs.item_count}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {cs.status === 'draft' && 'Activate'}
                            {cs.status === 'active' && (cs.item_count === 0 ? 'Add items' : 'Mark Ready')}
                            {cs.status === 'ready_for_staging' && (
                              cs.deployment_strategy === 'hotfix_direct'
                                ? <Chip label="Run hotfix CLI" size="small" variant="outlined" color="error" sx={{ fontSize: '0.65rem', height: 20 }} />
                                : <Chip label="Run stage CLI" size="small" variant="outlined" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />
                            )}
                            {cs.status === 'staged' && 'Start Review'}
                            {cs.status === 'in_review' && 'Approve / Reject'}
                            {cs.status === 'approved' && (
                              <Chip label="Run promote CLI" size="small" variant="outlined" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />
                            )}
                            {cs.status === 'promoted' && 'Done'}
                            {cs.status === 'rejected' && 'Reactivate'}
                            {cs.status === 'rolled_back' && '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Calendar view */}
        {viewMode === 'calendar' && (
          <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Skeleton variant="rectangular" height={400} />
              </Box>
            ) : calMode === 'month' ? renderMonthView() : renderWeekView()}
          </Paper>
        )}
      </Box>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Change Set</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            fullWidth
            required
            autoFocus
            placeholder="e.g. Portal Q1 Polish"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value={newType} label="Type" onChange={(e) => setNewType(e.target.value)}>
                <MenuItem value="feature">Feature</MenuItem>
                <MenuItem value="bugfix">Bugfix</MenuItem>
                <MenuItem value="hotfix">Hotfix</MenuItem>
                <MenuItem value="refactor">Refactor</MenuItem>
                <MenuItem value="infra">Infra</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select value={newPriority} label="Priority" onChange={(e) => setNewPriority(e.target.value)}>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TextField
            label="Git Branch (optional)"
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            fullWidth
            size="small"
            placeholder="feature/username/2026-03-08/description"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Deployment Strategy</InputLabel>
            <Select value={newStrategy} label="Deployment Strategy" onChange={(e) => setNewStrategy(e.target.value)}>
              <MenuItem value="stage_then_promote">Stage then Promote</MenuItem>
              <MenuItem value="hotfix_direct">Hotfix Direct</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Target Start Date"
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Target End Date"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ChangeSetsDashboard;
