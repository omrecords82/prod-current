/**
 * CorrectionsViewer — View correction events for a job.
 * Shows before/after values, provenance, flagged status.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconFlag,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { fetchCorrections } from '../../api/pipelineApi';
import type { CorrectionEvent, CorrectionsSummary } from '../../types/pipeline';

interface CorrectionsViewerProps {
  churchId: number;
  jobId: number;
  onHighlightBbox?: (bbox: [number, number, number, number], label: string) => void;
}

const PAGE_SIZE = 25;

const CorrectionsViewer: React.FC<CorrectionsViewerProps> = ({
  churchId,
  jobId,
  onHighlightBbox,
}) => {
  const theme = useTheme();
  const [events, setEvents] = useState<CorrectionEvent[]>([]);
  const [summary, setSummary] = useState<CorrectionsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterField, setFilterField] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterFlagged, setFilterFlagged] = useState<boolean | null>(null);

  // Load corrections
  const loadCorrections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCorrections(churchId, jobId, {
        limit: PAGE_SIZE,
        offset,
      });
      setEvents(result.events);
      setSummary(result.summary);
      setHasMore(result.pagination.has_more);
      setTotal(result.pagination.total);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to load corrections');
    } finally {
      setLoading(false);
    }
  }, [churchId, jobId, offset]);

  useEffect(() => {
    loadCorrections();
  }, [loadCorrections]);

  // Client-side filtering (small datasets)
  const filteredEvents = useMemo(() => {
    let result = events;
    if (filterField) {
      result = result.filter((e) => e.field_name === filterField);
    }
    if (filterSource) {
      result = result.filter((e) => e.edit_source === filterSource);
    }
    if (filterFlagged !== null) {
      result = result.filter((e) => e.was_flagged === filterFlagged);
    }
    return result;
  }, [events, filterField, filterSource, filterFlagged]);

  // Unique field names for filter
  const fieldNames = useMemo(() => {
    const names = new Set(events.map((e) => e.field_name));
    return [...names].sort();
  }, [events]);

  if (loading && events.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Summary Bar */}
      {summary && summary.total_events > 0 && (
        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" label={`${summary.total_events} edits`} variant="outlined" />
            <Chip size="small" label={`${summary.unique_fields_edited} fields`} variant="outlined" />
            <Chip size="small" label={`${summary.unique_candidates_edited} entries`} variant="outlined" />
            {summary.flagged_corrections > 0 && (
              <Chip
                size="small"
                label={`${summary.flagged_corrections} flagged`}
                color="warning"
                variant="outlined"
                icon={<IconFlag size={12} />}
              />
            )}
            <Box sx={{ flex: 1 }} />
            <IconButton size="small" onClick={loadCorrections} disabled={loading}>
              <IconRefresh size={14} />
            </IconButton>
          </Stack>
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Field</InputLabel>
            <Select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              label="Field"
              sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' } }}
            >
              <MenuItem value="">All</MenuItem>
              {fieldNames.map((f) => (
                <MenuItem key={f} value={f} sx={{ fontSize: '0.75rem' }}>
                  {f.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Source</InputLabel>
            <Select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              label="Source"
              sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' } }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="autosave" sx={{ fontSize: '0.75rem' }}>Autosave</MenuItem>
              <MenuItem value="finalize" sx={{ fontSize: '0.75rem' }}>Finalize</MenuItem>
              <MenuItem value="commit" sx={{ fontSize: '0.75rem' }}>Commit</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Flagged</InputLabel>
            <Select
              value={filterFlagged === null ? '' : filterFlagged ? 'yes' : 'no'}
              onChange={(e) => {
                const v = e.target.value;
                setFilterFlagged(v === '' ? null : v === 'yes');
              }}
              label="Flagged"
              sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' } }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="yes" sx={{ fontSize: '0.75rem' }}>Yes</MenuItem>
              <MenuItem value="no" sx={{ fontSize: '0.75rem' }}>No</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Events Table */}
      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        {filteredEvents.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {events.length === 0 ? 'No corrections recorded yet.' : 'No corrections match filters.'}
            </Typography>
          </Box>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }}>Time</TableCell>
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5, width: 40 }}>#</TableCell>
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }}>Field</TableCell>
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }}>Before → After</TableCell>
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5, width: 50 }}>Src</TableCell>
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5, width: 30 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents.map((event) => {
                const hasBbox = event.provenance?.bbox_union_norm || event.provenance?.bbox_union_px;
                return (
                  <TableRow
                    key={event.edit_id}
                    hover
                    sx={{
                      cursor: hasBbox ? 'pointer' : 'default',
                      bgcolor: event.was_flagged
                        ? alpha(theme.palette.warning.main, 0.04)
                        : undefined,
                    }}
                    onClick={() => {
                      if (hasBbox && onHighlightBbox) {
                        const bbox = (event.provenance?.bbox_union_px || event.provenance?.bbox_union_norm) as [number, number, number, number];
                        if (bbox) onHighlightBbox(bbox, event.field_name);
                      }
                    }}
                  >
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontWeight={600}>
                        {event.candidate_index}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontWeight={500} sx={{ fontSize: '0.7rem' }}>
                        {event.field_name.replace(/_/g, ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {event.before_value && (
                          <Typography
                            variant="caption"
                            sx={{
                              textDecoration: 'line-through',
                              color: theme.palette.error.main,
                              fontSize: '0.65rem',
                              maxWidth: 100,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {event.before_value}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">→</Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: theme.palette.success.main,
                            fontWeight: 500,
                            fontSize: '0.65rem',
                            maxWidth: 100,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {event.after_value || '(empty)'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={event.edit_source}
                        variant="outlined"
                        sx={{ height: 16, fontSize: '0.55rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      {event.was_flagged && (
                        <Tooltip title={event.flag_reasons.join(', ')}>
                          <IconFlag size={12} color={theme.palette.warning.main} />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <IconChevronLeft size={14} />
            </IconButton>
            <IconButton
              size="small"
              disabled={!hasMore}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              <IconChevronRight size={14} />
            </IconButton>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default CorrectionsViewer;
