/**
 * ScheduleTableView — Tabular list of liturgical events with restriction indicators.
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { CheckCircle2, AlertCircle, XCircle, Crown, Flame } from '@/ui/icons';
import type { ScheduleData, RestrictionLevel, SacramentType } from './scheduleTypes';

interface ScheduleTableViewProps {
  data: ScheduleData;
  searchQuery: string;
  sacramentType: SacramentType;
}

const COLORS = {
  allowed: '#10B981',
  conditional: '#F59E0B',
  restricted: '#EF4444',
};

function RestrictionIcon({ level }: { level: RestrictionLevel }) {
  switch (level) {
    case 'allowed':
      return <CheckCircle2 size={16} color={COLORS.allowed} />;
    case 'conditional':
      return <AlertCircle size={16} color={COLORS.conditional} />;
    case 'restricted':
      return <XCircle size={16} color={COLORS.restricted} />;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const ScheduleTableView: React.FC<ScheduleTableViewProps> = ({ data, searchQuery, sacramentType }) => {
  const filtered = searchQuery
    ? data.events.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : data.events;

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>Liturgical Events Table</Typography>
        <Typography variant="body2" color="text.secondary">
          Comprehensive list of feasts, fasts, and restrictions
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><strong>Event Name</strong></TableCell>
              <TableCell><strong>Start Date</strong></TableCell>
              <TableCell><strong>End Date</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell align="center"><strong>Baptism</strong></TableCell>
              <TableCell align="center"><strong>Marriage</strong></TableCell>
              <TableCell align="center"><strong>Funeral</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((event, idx) => (
              <TableRow
                key={idx}
                hover
                sx={{
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={500}>{event.name}</Typography>
                    {event.isMajorFeast && (
                      <Chip
                        label="Major"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: 'rgba(217, 119, 6, 0.15)',
                          color: 'var(--orthodox-gold)',
                        }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(event.startDate)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(event.endDate)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={event.type === 'feast' ? <Crown size={14} /> : event.type === 'fast' ? <Flame size={14} /> : undefined}
                    label={event.type}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 24,
                      textTransform: 'capitalize',
                      borderColor: event.type === 'feast' ? 'var(--schedule-feast)' : event.type === 'fast' ? 'var(--schedule-fast)' : 'grey.400',
                      color: event.type === 'feast' ? 'var(--schedule-feast)' : event.type === 'fast' ? 'var(--schedule-fast)' : 'text.secondary',
                    }}
                  />
                </TableCell>
                <TableCell align="center"><RestrictionIcon level={event.restrictions.baptism} /></TableCell>
                <TableCell align="center"><RestrictionIcon level={event.restrictions.marriage} /></TableCell>
                <TableCell align="center"><RestrictionIcon level={event.restrictions.funeral} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery ? 'No matching events found' : 'No events to display'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CheckCircle2 size={14} color={COLORS.allowed} />
          <Typography variant="caption">Allowed</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AlertCircle size={14} color={COLORS.conditional} />
          <Typography variant="caption">Conditional</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <XCircle size={14} color={COLORS.restricted} />
          <Typography variant="caption">Restricted</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ScheduleTableView;
