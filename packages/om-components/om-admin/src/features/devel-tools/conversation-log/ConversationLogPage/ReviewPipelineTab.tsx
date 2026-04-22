import {
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconChecklist,
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import React, { useCallback } from 'react';
import {
  AGENT_TOOLS_CONV,
  AGENT_TOOL_COLORS_CONV,
  AGENT_TOOL_LABELS_CONV,
  HORIZON_OPTIONS,
  PipelineExportItem,
  ReviewResult,
} from './types';

interface ReviewPipelineTabProps {
  reviewResults: ReviewResult[];
  reviewLoading: boolean;
  reviewExpanded: string | null;
  setReviewExpanded: React.Dispatch<React.SetStateAction<string | null>>;
  pipelineItems: PipelineExportItem[];
  setPipelineItems: React.Dispatch<React.SetStateAction<PipelineExportItem[]>>;
  pipelineAgentTool: string;
  setPipelineAgentTool: React.Dispatch<React.SetStateAction<string>>;
  pipelineHorizon: string;
  setPipelineHorizon: React.Dispatch<React.SetStateAction<string>>;
  pipelineExporting: boolean;
  onExportToPipeline: () => void;
  onAddPipelineItem: () => void;
  onRemovePipelineItem: (index: number) => void;
  onUpdatePipelineItem: (index: number, field: string, value: any) => void;
  onNavigateToConversations: () => void;
}

const ReviewPipelineTab: React.FC<ReviewPipelineTabProps> = ({
  reviewResults,
  reviewLoading,
  reviewExpanded,
  setReviewExpanded,
  pipelineItems,
  setPipelineItems,
  pipelineAgentTool,
  setPipelineAgentTool,
  pipelineHorizon,
  setPipelineHorizon,
  pipelineExporting,
  onExportToPipeline,
  onAddPipelineItem,
  onRemovePipelineItem,
  onUpdatePipelineItem,
  onNavigateToConversations,
}) => {
  const theme = useTheme();

  if (reviewLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }} color="text.secondary">Analyzing conversations...</Typography>
      </Box>
    );
  }

  if (reviewResults.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <IconFileText size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>No Conversations Reviewed</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select conversations from the Conversations tab and click "Review & Analyze" to extract insights and create pipeline items.
        </Typography>
        <Button variant="outlined" onClick={onNavigateToConversations} sx={{ textTransform: 'none' }}>
          Go to Conversations
        </Button>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* Left: Conversation Insights */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Conversation Insights ({reviewResults.length})
            </Typography>
            <Button size="small" variant="outlined" onClick={onNavigateToConversations} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              Select More
            </Button>
          </Stack>
        </Paper>

        {reviewResults.map((result) => {
          const ins = result.insights;
          const isExpanded = reviewExpanded === result.filename;
          const totalInsights = ins.decisions.length + ins.tasks.length + ins.filesChanged.length +
            ins.featuresBuilt.length + ins.bugsFixed.length + ins.keyExchanges.length;

          return (
            <Paper key={result.filename} sx={{ mb: 1.5, overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 2, cursor: 'pointer',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                  display: 'flex', alignItems: 'center', gap: 1.5,
                }}
                onClick={() => setReviewExpanded(isExpanded ? null : result.filename)}
              >
                {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {result.title || result.filename}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {result.messageCount} messages &middot; {result.source} &middot; {ins.summary}
                  </Typography>
                </Box>
                <Chip label={`${totalInsights} insights`} size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
              </Box>

              <Collapse in={isExpanded}>
                <Box sx={{ px: 2, pb: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.3)}` }}>
                  {/* Summary chips */}
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, mb: 2, flexWrap: 'wrap' }} useFlexGap>
                    {ins.featuresBuilt.length > 0 && <Chip label={`${ins.featuresBuilt.length} Features`} size="small" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />}
                    {ins.bugsFixed.length > 0 && <Chip label={`${ins.bugsFixed.length} Fixes`} size="small" color="error" sx={{ fontSize: '0.65rem', height: 20 }} />}
                    {ins.tasks.length > 0 && <Chip label={`${ins.tasks.length} Tasks`} size="small" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />}
                    {ins.decisions.length > 0 && <Chip label={`${ins.decisions.length} Decisions`} size="small" color="info" sx={{ fontSize: '0.65rem', height: 20 }} />}
                    {ins.filesChanged.length > 0 && <Chip label={`${ins.filesChanged.length} Files`} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />}
                  </Stack>

                  {/* Features Built */}
                  {ins.featuresBuilt.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main', display: 'block', mb: 0.5 }}>
                        Features Built
                      </Typography>
                      {ins.featuresBuilt.map((feat, fi) => (
                        <Typography key={fi} variant="body2" sx={{ fontSize: '0.82rem', pl: 1.5, py: 0.2, borderLeft: `2px solid ${theme.palette.success.main}` }}>
                          {feat}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Bugs Fixed */}
                  {ins.bugsFixed.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main', display: 'block', mb: 0.5 }}>
                        Bugs Fixed
                      </Typography>
                      {ins.bugsFixed.map((bug, bi) => (
                        <Typography key={bi} variant="body2" sx={{ fontSize: '0.82rem', pl: 1.5, py: 0.2, borderLeft: `2px solid ${theme.palette.error.main}` }}>
                          {bug}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Tasks / Follow-ups */}
                  {ins.tasks.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main', display: 'block', mb: 0.5 }}>
                        Tasks & Follow-ups
                      </Typography>
                      {ins.tasks.map((task, ti) => (
                        <Typography key={ti} variant="body2" sx={{ fontSize: '0.82rem', pl: 1.5, py: 0.2, borderLeft: `2px solid ${theme.palette.warning.main}` }}>
                          {task.text}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Decisions */}
                  {ins.decisions.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main', display: 'block', mb: 0.5 }}>
                        Decisions Made
                      </Typography>
                      {ins.decisions.slice(0, 8).map((dec, di) => (
                        <Typography key={di} variant="body2" sx={{ fontSize: '0.82rem', pl: 1.5, py: 0.2, borderLeft: `2px solid ${theme.palette.info.main}` }}>
                          {dec}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Files Changed */}
                  {ins.filesChanged.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Files Referenced ({ins.filesChanged.length})
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {ins.filesChanged.slice(0, 20).map((file, fi) => (
                          <Chip key={fi} label={file} size="small" variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20, fontFamily: 'monospace', maxWidth: 300 }} />
                        ))}
                        {ins.filesChanged.length > 20 && (
                          <Chip label={`+${ins.filesChanged.length - 20} more`} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Key Exchanges */}
                  {ins.keyExchanges.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Key Exchanges ({ins.keyExchanges.length})
                      </Typography>
                      {ins.keyExchanges.slice(0, 5).map((ex, ei) => (
                        <Paper key={ei} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>You:</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>{ex.userMessage}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>Claude:</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{ex.assistantMessage}</Typography>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Box>

      {/* Right: Pipeline Export Panel */}
      <Box sx={{ width: { xs: '100%', lg: 380 }, flexShrink: 0 }}>
        <Paper sx={{ p: 2, mb: 2, position: 'sticky', top: 16 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#00897b' }}>
            Export to OM Daily Pipeline
          </Typography>

          {/* Agent Tool & Horizon selectors */}
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1}>
              <TextField
                select size="small" fullWidth label="Agent Tool"
                value={pipelineAgentTool}
                onChange={(e) => setPipelineAgentTool(e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {AGENT_TOOLS_CONV.map(a => (
                  <MenuItem key={a} value={a}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: AGENT_TOOL_COLORS_CONV[a] }} />
                      {AGENT_TOOL_LABELS_CONV[a]}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" fullWidth label="Default Horizon"
                value={pipelineHorizon}
                onChange={(e) => setPipelineHorizon(e.target.value)}
              >
                {HORIZON_OPTIONS.map(h => (
                  <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          {/* Pipeline items list */}
          <Box sx={{ maxHeight: 500, overflow: 'auto', mb: 2 }}>
            {pipelineItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No pipeline items generated. Review conversations to extract actionable items.
              </Typography>
            ) : (
              pipelineItems.map((item, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{
                    p: 1.5, mb: 1,
                    opacity: item.enabled ? 1 : 0.5,
                    borderColor: item.enabled ? alpha('#00897b', 0.3) : undefined,
                    bgcolor: item.enabled ? alpha('#00897b', 0.02) : undefined,
                  }}
                >
                  <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <Checkbox
                      size="small"
                      checked={item.enabled}
                      onChange={(e) => onUpdatePipelineItem(idx, 'enabled', e.target.checked)}
                      sx={{ p: 0.3, mt: 0.1 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        size="small" fullWidth variant="standard"
                        value={item.title}
                        onChange={(e) => onUpdatePipelineItem(idx, 'title', e.target.value)}
                        placeholder="Task title..."
                        sx={{ '& .MuiInput-input': { fontSize: '0.82rem', fontWeight: 600 } }}
                      />
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={item.priority}
                          size="small"
                          sx={{ fontSize: '0.6rem', height: 18, textTransform: 'capitalize', cursor: 'pointer' }}
                          onClick={() => {
                            const pris = ['low', 'medium', 'high', 'critical'];
                            const next = pris[(pris.indexOf(item.priority) + 1) % pris.length];
                            onUpdatePipelineItem(idx, 'priority', next);
                          }}
                        />
                        <Chip
                          label={HORIZON_OPTIONS.find(h => h.value === item.horizon)?.label || item.horizon}
                          size="small"
                          sx={{ fontSize: '0.6rem', height: 18, cursor: 'pointer' }}
                          onClick={() => {
                            const vals = HORIZON_OPTIONS.map(h => h.value);
                            const next = vals[(vals.indexOf(item.horizon) + 1) % vals.length];
                            onUpdatePipelineItem(idx, 'horizon', next);
                          }}
                        />
                        {item.category && (
                          <Chip label={item.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                        )}
                      </Stack>
                    </Box>
                    <IconButton size="small" onClick={() => onRemovePipelineItem(idx)} sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: 'error.main' } }}>
                      <IconTrash size={14} />
                    </IconButton>
                  </Stack>
                </Paper>
              ))
            )}
          </Box>

          {/* Actions */}
          <Stack spacing={1}>
            <Button
              size="small" variant="outlined" fullWidth
              startIcon={<IconPlus size={14} />}
              onClick={onAddPipelineItem}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Add Custom Item
            </Button>
            <Button
              variant="contained" fullWidth
              startIcon={pipelineExporting ? <CircularProgress size={16} /> : <IconChecklist size={16} />}
              onClick={onExportToPipeline}
              disabled={pipelineExporting || pipelineItems.filter(i => i.enabled).length === 0}
              sx={{
                textTransform: 'none',
                bgcolor: '#00897b',
                '&:hover': { bgcolor: '#00695c' },
              }}
            >
              Export {pipelineItems.filter(i => i.enabled).length} Item(s) to Pipeline
            </Button>
            <Button
              size="small" variant="text" fullWidth
              onClick={() => window.open('/omai/tools/om-daily', '_blank')}
              sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#00897b' }}
            >
              Open OM Daily Pipeline
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default ReviewPipelineTab;
