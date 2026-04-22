import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconChartBar,
  IconChecklist,
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import React from 'react';
import {
  AGENT_TOOLS_CONV,
  AGENT_TOOL_LABELS_CONV,
  HORIZON_OPTIONS,
  type Task,
} from './types';

interface TasksTabProps {
  // Task data
  tasks: Task[];
  tasksLoading: boolean;
  filteredTasks: Task[];
  taskCategories: string[];
  taskStats: { total: number; completed: number; pending: number; pct: number };

  // Task filters
  taskFilter: 'all' | 'pending' | 'completed';
  setTaskFilter: (filter: 'all' | 'pending' | 'completed') => void;
  taskCategoryFilter: string;
  setTaskCategoryFilter: (filter: string) => void;

  // New task input
  newTaskText: string;
  setNewTaskText: (text: string) => void;
  newTaskCategory: string;
  setNewTaskCategory: (category: string) => void;

  // Expanded task
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;

  // Task actions
  addTask: () => void;
  toggleTask: (taskId: string, completed: boolean) => void;
  deleteTask: (taskId: string) => void;
  deleteCompletedTasks: () => void;

  // Bulk export pipeline
  pipelineAgentTool: string;
  setPipelineAgentTool: (value: string) => void;
  pipelineHorizon: string;
  setPipelineHorizon: (value: string) => void;
  bulkExportPreview: any[] | null;
  bulkExportLoading: boolean;
  bulkExportResult: { count: number; skipped: number } | null;
  setBulkExportPreview: (preview: any[] | null) => void;
  setBulkExportResult: (result: { count: number; skipped: number } | null) => void;
  handleBulkExportPreview: () => void;
  handleBulkExportConfirm: () => void;
}

const TasksTab: React.FC<TasksTabProps> = ({
  tasksLoading,
  filteredTasks,
  taskCategories,
  taskStats,
  taskFilter,
  setTaskFilter,
  taskCategoryFilter,
  setTaskCategoryFilter,
  newTaskText,
  setNewTaskText,
  newTaskCategory,
  setNewTaskCategory,
  expandedTaskId,
  setExpandedTaskId,
  addTask,
  toggleTask,
  deleteTask,
  deleteCompletedTasks,
  pipelineAgentTool,
  setPipelineAgentTool,
  pipelineHorizon,
  setPipelineHorizon,
  bulkExportPreview,
  bulkExportLoading,
  bulkExportResult,
  setBulkExportPreview,
  setBulkExportResult,
  handleBulkExportPreview,
  handleBulkExportConfirm,
}) => {
  const theme = useTheme();

  return (
    <>
      {/* Task Progress */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Progress: {taskStats.completed}/{taskStats.total} tasks
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {taskStats.pct}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={taskStats.pct}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`${taskStats.completed} Done`} size="small" color="success" variant="outlined" />
            <Chip label={`${taskStats.pending} Pending`} size="small" color="warning" variant="outlined" />
            {taskStats.completed > 0 && (
              <Button
                size="small" variant="outlined" color="error"
                startIcon={<IconTrash size={14} />}
                onClick={deleteCompletedTasks}
                sx={{ textTransform: 'none', fontSize: '0.75rem', ml: 1 }}
              >
                Delete all done
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Bulk Export to OM Daily Pipeline */}
      {taskStats.completed > 0 && (
        <Paper sx={{ p: 2, mb: 3, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`, bgcolor: alpha(theme.palette.success.main, 0.02) }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Export Completed Tasks to OM Daily Pipeline
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Bulk-import {taskStats.completed} completed task(s) as pipeline items with auto-categorization and branch type detection
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  select size="small" label="Agent" value={pipelineAgentTool}
                  onChange={(e) => setPipelineAgentTool(e.target.value)}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="">None</MenuItem>
                  {AGENT_TOOLS_CONV.map(a => <MenuItem key={a} value={a}>{AGENT_TOOL_LABELS_CONV[a]}</MenuItem>)}
                </TextField>
                <TextField
                  select size="small" label="Horizon" value={pipelineHorizon}
                  onChange={(e) => setPipelineHorizon(e.target.value)}
                  sx={{ minWidth: 100 }}
                >
                  {HORIZON_OPTIONS.map(h => <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>)}
                </TextField>
                <Button
                  variant="outlined" size="small" color="info"
                  onClick={handleBulkExportPreview}
                  disabled={bulkExportLoading}
                  startIcon={bulkExportLoading ? <CircularProgress size={14} /> : <IconChartBar size={16} />}
                  sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                >
                  Preview
                </Button>
              </Stack>
            </Stack>

            {/* Preview results */}
            {bulkExportPreview && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {bulkExportPreview.length} item(s) ready to export
                  </Typography>
                  <Button
                    variant="contained" size="small" color="success"
                    onClick={handleBulkExportConfirm}
                    disabled={bulkExportLoading || bulkExportPreview.length === 0}
                    startIcon={bulkExportLoading ? <CircularProgress size={14} /> : <IconChecklist size={16} />}
                    sx={{ textTransform: 'none' }}
                  >
                    Confirm Export ({bulkExportPreview.length})
                  </Button>
                  <Button size="small" onClick={() => setBulkExportPreview(null)} sx={{ textTransform: 'none' }}>
                    Cancel
                  </Button>
                </Stack>
                <Box sx={{ maxHeight: 300, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                  {bulkExportPreview.map((item, idx) => (
                    <Box key={idx} sx={{ px: 1.5, py: 0.75, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`, display: 'flex', alignItems: 'center', gap: 1, '&:last-child': { borderBottom: 'none' } }}>
                      <Typography variant="caption" sx={{ flex: 1, fontSize: '0.75rem' }}>{item.title}</Typography>
                      <Chip size="small" label={item.category} sx={{ fontSize: '0.6rem', height: 18 }} />
                      {item.branch_type && (
                        <Chip size="small" label={item.branch_type.replace('_', ' ')} sx={{ fontSize: '0.6rem', height: 18, bgcolor: alpha(
                          item.branch_type === 'bugfix' ? '#d73a4a' : item.branch_type === 'new_feature' ? '#0e8a16' : item.branch_type === 'existing_feature' ? '#1d76db' : '#fbca04', 0.12
                        ), color: item.branch_type === 'bugfix' ? '#d73a4a' : item.branch_type === 'new_feature' ? '#0e8a16' : item.branch_type === 'existing_feature' ? '#1d76db' : '#fbca04' }} />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Export result */}
            {bulkExportResult && (
              <Alert severity="success" sx={{ fontSize: '0.8rem' }} onClose={() => setBulkExportResult(null)}>
                Successfully exported {bulkExportResult.count} task(s) to OM Daily pipeline.
                {bulkExportResult.skipped > 0 && ` ${bulkExportResult.skipped} duplicate(s) skipped.`}
                {' '}<a href="/omai/tools/om-daily" target="_blank" rel="noopener" style={{ color: 'inherit', fontWeight: 600 }}>View Pipeline &rarr;</a>
              </Alert>
            )}
          </Stack>
        </Paper>
      )}

      {/* Task Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={0.5}>
            <Chip label="All" size="small" variant={taskFilter === 'all' ? 'filled' : 'outlined'} color={taskFilter === 'all' ? 'primary' : 'default'} onClick={() => setTaskFilter('all')} />
            <Chip label="Pending" size="small" variant={taskFilter === 'pending' ? 'filled' : 'outlined'} color={taskFilter === 'pending' ? 'warning' : 'default'} onClick={() => setTaskFilter('pending')} />
            <Chip label="Completed" size="small" variant={taskFilter === 'completed' ? 'filled' : 'outlined'} color={taskFilter === 'completed' ? 'success' : 'default'} onClick={() => setTaskFilter('completed')} />
          </Stack>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Chip label="All Categories" size="small" variant={taskCategoryFilter === 'all' ? 'filled' : 'outlined'} color={taskCategoryFilter === 'all' ? 'primary' : 'default'} onClick={() => setTaskCategoryFilter('all')} sx={{ fontSize: '0.7rem' }} />
            {taskCategories.map(cat => (
              <Chip key={cat} label={cat} size="small" variant={taskCategoryFilter === cat ? 'filled' : 'outlined'} color={taskCategoryFilter === cat ? 'primary' : 'default'} onClick={() => setTaskCategoryFilter(cat)} sx={{ fontSize: '0.7rem' }} />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* Add Task */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder="Add a new task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
          />
          <TextField
            size="small"
            placeholder="Category"
            value={newTaskCategory}
            onChange={(e) => setNewTaskCategory(e.target.value)}
            sx={{ width: 150 }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<IconPlus size={16} />}
            onClick={addTask}
            disabled={!newTaskText.trim()}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            Add
          </Button>
        </Stack>
      </Paper>

      {/* Task List */}
      {tasksLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredTasks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No tasks found</Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {filteredTasks.map((task) => (
            <Paper
              key={task.id}
              sx={{
                p: 0,
                overflow: 'hidden',
                border: `1px solid ${task.completed ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.divider, 0.5)}`,
                bgcolor: task.completed ? alpha(theme.palette.success.main, 0.03) : 'background.paper',
                transition: 'all 0.2s ease',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0.5,
                  p: 1.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                }}
                onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
              >
                <Checkbox
                  checked={task.completed}
                  onChange={(e) => { e.stopPropagation(); toggleTask(task.id, !task.completed); }}
                  onClick={(e) => e.stopPropagation()}
                  size="small"
                  color="success"
                  sx={{ mt: -0.5 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      textDecoration: task.completed ? 'line-through' : 'none',
                      color: task.completed ? 'text.secondary' : 'text.primary',
                    }}
                  >
                    {task.text}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                    <Chip label={task.category} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                    {task.source && task.source !== 'manual' && (
                      <Chip label={task.source} size="small" variant="outlined" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                    <Chip
                      label={task.completed ? 'Done' : 'Pending'}
                      size="small"
                      color={task.completed ? 'success' : 'warning'}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Stack>
                </Box>
                <Tooltip title="Delete task">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                    sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: 'error.main' } }}
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </Tooltip>
                {expandedTaskId === task.id ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              </Box>
              <Collapse in={expandedTaskId === task.id}>
                {task.notes && (
                  <Box sx={{ px: 2, pb: 2, pt: 0, ml: 5 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Notes:</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                      {task.notes}
                    </Typography>
                  </Box>
                )}
              </Collapse>
            </Paper>
          ))}
        </Stack>
      )}
    </>
  );
};

export default TasksTab;
