/**
 * RecordsTimelineView — Chronological timeline of church records
 *
 * Groups records by year/month and presents them in a vertical timeline.
 * Designed to feel historical and meaningful — appropriate for browsing
 * sacramental history of a parish.
 */

import React, { useMemo } from 'react';
import {
  Box, Chip, Skeleton, Stack, Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { IconDroplet, IconHeart, IconCross, IconCalendar } from '@tabler/icons-react';
import { formatRecordDate } from '@/utils/formatDate';

const getPersonName = (record: any, recordType: string): string => {
  if (recordType === 'marriage') {
    const groom = `${record.fname_groom || record.groom_first || record.groomFirstName || ''} ${record.lname_groom || record.groom_last || record.groomLastName || ''}`.trim();
    const bride = `${record.fname_bride || record.bride_first || record.brideFirstName || ''} ${record.lname_bride || record.bride_last || record.brideLastName || ''}`.trim();
    if (groom && bride) return `${groom} & ${bride}`;
    return groom || bride || 'Unknown';
  }
  if (recordType === 'funeral') {
    const first = record.name || record.deceased_first || record.firstName || '';
    const last = record.lastname || record.deceased_last || record.lastName || '';
    return `${first} ${last}`.trim() || 'Unknown';
  }
  const first = record.person_first || record.first_name || record.firstName || '';
  const middle = record.person_middle || '';
  const last = record.person_last || record.last_name || record.lastName || '';
  return [first, middle, last].filter(Boolean).join(' ').trim() || 'Unknown';
};

const getRawDate = (record: any, recordType: string): string => {
  if (recordType === 'marriage') return record.mdate || record.marriage_date || record.marriageDate || '';
  if (recordType === 'funeral') return record.burial_date || record.funeral_date || record.burialDate || record.deceased_date || '';
  return record.reception_date || record.baptism_date || record.dateOfBaptism || '';
};

const SACRAMENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  baptism: { icon: IconDroplet, color: '#1e88e5', label: 'Baptism' },
  marriage: { icon: IconHeart, color: '#e91e63', label: 'Marriage' },
  funeral: { icon: IconCross, color: '#7b1fa2', label: 'Funeral' },
};

interface TimelineGroup {
  label: string;
  sortKey: string;
  records: any[];
}

interface RecordsTimelineViewProps {
  records: any[];
  recordType: string;
  loading: boolean;
  onViewRecord: (record: any) => void;
  searchTerm?: string;
}

const RecordsTimelineView: React.FC<RecordsTimelineViewProps> = ({
  records,
  recordType,
  loading,
  onViewRecord,
  searchTerm,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const config = SACRAMENT_CONFIG[recordType] || SACRAMENT_CONFIG.baptism;
  const SacramentIcon = config.icon;

  // Group records by year-month
  const groups = useMemo((): TimelineGroup[] => {
    const map = new Map<string, any[]>();

    for (const record of records) {
      const raw = getRawDate(record, recordType);
      let label = 'Unknown Date';
      let sortKey = '0000-00';

      if (raw) {
        try {
          // For YYYY-MM-DD strings, append T12:00 to avoid UTC midnight → local timezone shift
          const safeRaw = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
          const d = new Date(safeRaw);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = d.toLocaleDateString('en-US', { month: 'long' });
            label = `${month} ${year}`;
            sortKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          }
        } catch {
          // keep default
        }
      }

      if (!map.has(sortKey)) map.set(sortKey, []);
      map.get(sortKey)!.push(record);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // Newest first
      .map(([sortKey, recs]) => {
        let label = 'Unknown Date';
        if (sortKey !== '0000-00') {
          const [y, m] = sortKey.split('-');
          const d = new Date(Number(y), Number(m) - 1);
          label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        return { label, sortKey, records: recs };
      });
  }, [records, recordType]);

  if (loading) {
    return (
      <Stack spacing={3} sx={{ py: 2 }}>
        {[1, 2, 3].map((i) => (
          <Box key={i}>
            <Skeleton variant="text" width={160} height={28} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={64} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={64} sx={{ borderRadius: 2, mt: 1 }} />
          </Box>
        ))}
      </Stack>
    );
  }

  if (records.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
        <IconCalendar size={48} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 12 }} />
        <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>
          {searchTerm ? 'No matching records' : 'No records yet'}
        </Typography>
        <Typography variant="body2">
          {searchTerm
            ? `No ${recordType} records match "${searchTerm}"`
            : `${config.label} records will appear here in chronological order.`}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1, position: 'relative' }}>
      {/* Vertical timeline line */}
      <Box
        sx={{
          position: 'absolute',
          left: { xs: 16, sm: 20 },
          top: 0,
          bottom: 0,
          width: 2,
          bgcolor: alpha(config.color, isDark ? 0.2 : 0.12),
          borderRadius: 1,
        }}
      />

      <Stack spacing={4}>
        {groups.map((group) => (
          <Box key={group.sortKey}>
            {/* Month/Year label */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, pl: { xs: 0, sm: 0 } }}>
              <Box
                sx={{
                  width: { xs: 34, sm: 42 },
                  height: { xs: 34, sm: 42 },
                  borderRadius: '50%',
                  bgcolor: alpha(config.color, isDark ? 0.2 : 0.1),
                  border: `2px solid ${alpha(config.color, 0.3)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  zIndex: 1,
                  background: theme.palette.background.paper,
                }}
              >
                <IconCalendar size={16} color={config.color} />
              </Box>
              <Typography
                variant="subtitle2"
                sx={{
                  ml: 1.5,
                  fontWeight: 700,
                  color: config.color,
                  letterSpacing: 0.3,
                }}
              >
                {group.label}
              </Typography>
              <Chip
                size="small"
                label={group.records.length}
                sx={{
                  ml: 1,
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  bgcolor: alpha(config.color, 0.1),
                  color: config.color,
                }}
              />
            </Box>

            {/* Records in this group */}
            <Stack spacing={1} sx={{ pl: { xs: 5.5, sm: 7 } }}>
              {group.records.map((record) => {
                const name = getPersonName(record, recordType);
                const dateStr = formatRecordDate(getRawDate(record, recordType)) || '';
                const clergy = record.officiant_name || record.clergy || record.priest || '';

                return (
                  <Box
                    key={record.id}
                    onClick={() => onViewRecord(record)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.25,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      bgcolor: isDark ? 'background.paper' : 'background.default',
                      '&:hover': {
                        borderColor: alpha(config.color, 0.3),
                        bgcolor: alpha(config.color, isDark ? 0.06 : 0.03),
                      },
                    }}
                  >
                    <SacramentIcon size={16} color={config.color} style={{ flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {name}
                      </Typography>
                    </Box>
                    {clergy && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: { xs: 'none', sm: 'block' },
                          flexShrink: 0,
                        }}
                      >
                        {clergy}
                      </Typography>
                    )}
                    {dateStr && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flexShrink: 0, fontWeight: 500 }}
                      >
                        {dateStr}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default RecordsTimelineView;
