/**
 * ScheduleDayDrawer — Right-side drawer showing detailed information for a selected date.
 */

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import { X, Calendar, Info, CheckCircle2, AlertCircle, XCircle, Crown, Flame } from '@/ui/icons';
import type { ScheduleDay, ScheduleEvent, RestrictionLevel } from './scheduleTypes';

interface ScheduleDayDrawerProps {
  open: boolean;
  date: string | null;
  scheduleDay: ScheduleDay | undefined;
  onClose: () => void;
}

const RESTRICTION_CONFIG: Record<RestrictionLevel, { color: string; label: string; icon: typeof CheckCircle2 }> = {
  allowed: { color: '#10B981', label: 'Allowed', icon: CheckCircle2 },
  conditional: { color: '#F59E0B', label: 'Conditional', icon: AlertCircle },
  restricted: { color: '#EF4444', label: 'Restricted', icon: XCircle },
};

function formatFullDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RestrictionBadge({ level, label }: { level: RestrictionLevel; label: string }) {
  const config = RESTRICTION_CONFIG[level];
  const Icon = config.icon;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        border: `1px solid ${config.color}`,
        bgcolor: `${config.color}10`,
        color: config.color,
      }}
    >
      <Icon size={18} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>{config.label}</Typography>
      </Box>
    </Box>
  );
}

function FeastTag({ event }: { event: ScheduleEvent }) {
  const isFeast = event.type === 'feast';
  const color = isFeast ? 'var(--schedule-feast)' : 'var(--schedule-fast)';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Chip
        icon={isFeast ? <Crown size={14} /> : <Flame size={14} />}
        label={event.name}
        size="small"
        variant="outlined"
        sx={{
          borderColor: color,
          color,
          fontWeight: event.isMajorFeast ? 600 : 400,
        }}
      />
      {event.type === 'fast' && (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${color}33` }}>
          {formatShortDate(event.startDate)} – {formatShortDate(event.endDate)}
        </Typography>
      )}
    </Box>
  );
}

const ScheduleDayDrawer: React.FC<ScheduleDayDrawerProps> = ({ open, date, scheduleDay, onClose }) => {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: 450 } } }}>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--orthodox-purple)', mb: 0.5 }}>
              <Calendar size={18} />
              <Typography variant="caption" fontWeight={500}>Selected Date</Typography>
            </Box>
            {date && (
              <Typography variant="h5" fontWeight={600}>
                {formatFullDate(date)}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={18} />
          </IconButton>
        </Box>

        {/* Liturgical Observances */}
        {scheduleDay && scheduleDay.events.length > 0 ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Info size={16} color="gray" />
              <Typography variant="body2" fontWeight={500} color="text.secondary">Liturgical Observances</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {scheduleDay.events.map((event, i) => (
                <FeastTag key={i} event={event} />
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No special liturgical observances on this date</Typography>
          </Box>
        )}

        <Divider />

        {/* Sacramental Guidelines */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Sacramental Guidelines</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <RestrictionBadge level={scheduleDay?.restrictions.baptism ?? 'allowed'} label="Baptism" />
            <RestrictionBadge level={scheduleDay?.restrictions.marriage ?? 'allowed'} label="Marriage" />
            <RestrictionBadge level={scheduleDay?.restrictions.funeral ?? 'allowed'} label="Funeral" />
          </Box>
        </Box>

        {/* Explanations */}
        {scheduleDay && scheduleDay.events.some((e) =>
          e.explanations.baptism || e.explanations.marriage || e.explanations.funeral || e.explanations.liturgical
        ) && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Additional Information</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {scheduleDay.events.map((event, i) => (
                  <React.Fragment key={i}>
                    {event.explanations.baptism && (
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#10B98108', borderLeft: '3px solid #10B981' }}>
                        <Typography variant="caption" fontWeight={500}>Baptism</Typography>
                        <Typography variant="body2" color="text.secondary">{event.explanations.baptism}</Typography>
                      </Box>
                    )}
                    {event.explanations.marriage && (
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#F59E0B08', borderLeft: '3px solid #F59E0B' }}>
                        <Typography variant="caption" fontWeight={500}>Marriage</Typography>
                        <Typography variant="body2" color="text.secondary">{event.explanations.marriage}</Typography>
                      </Box>
                    )}
                    {event.explanations.funeral && (
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#EF444408', borderLeft: '3px solid #EF4444' }}>
                        <Typography variant="caption" fontWeight={500}>Funeral</Typography>
                        <Typography variant="body2" color="text.secondary">{event.explanations.funeral}</Typography>
                      </Box>
                    )}
                    {event.explanations.liturgical && (
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.50', borderLeft: '3px solid', borderColor: 'grey.400' }}>
                        <Typography variant="caption" fontWeight={500}>Liturgical Note</Typography>
                        <Typography variant="body2" color="text.secondary">{event.explanations.liturgical}</Typography>
                      </Box>
                    )}
                  </React.Fragment>
                ))}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default ScheduleDayDrawer;
