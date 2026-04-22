/**
 * RecordsCardView — Card-based browsing for church records
 *
 * Presents records as readable cards rather than spreadsheet rows.
 * Each card shows the person's name, key dates, and sacrament details
 * in a warm, approachable layout appropriate for church users.
 */

import React from 'react';
import {
  Box, Card, CardActionArea, CardContent, Chip, Grid, Skeleton,
  Stack, Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { IconDroplet, IconHeart, IconCross, IconUser } from '@tabler/icons-react';
import { formatRecordDate } from '@/utils/formatDate';

// Helpers for field extraction (same fallback logic as RecordsPage)
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

const getCeremonyDate = (record: any, recordType: string): string => {
  if (recordType === 'marriage') return formatRecordDate(record.mdate || record.marriage_date || record.marriageDate) || '';
  if (recordType === 'funeral') return formatRecordDate(record.burial_date || record.funeral_date || record.burialDate) || '';
  return formatRecordDate(record.reception_date || record.baptism_date || record.dateOfBaptism) || '';
};

const getSecondaryInfo = (record: any, recordType: string): string => {
  if (recordType === 'marriage') {
    return record.officiant_name || record.clergy || record.priest || '';
  }
  if (recordType === 'funeral') {
    const age = record.age ? `Age ${record.age}` : '';
    const location = record.burial_location || record.burialLocation || '';
    return [age, location].filter(Boolean).join(' · ');
  }
  const parents = (() => {
    if (record.parents) return record.parents;
    const f = record.father_name || record.fatherName || '';
    const m = record.mother_name || record.motherName || '';
    if (f && m) return `${f} & ${m}`;
    return f || m || '';
  })();
  return parents;
};

const SACRAMENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  baptism: { icon: IconDroplet, color: '#1e88e5', label: 'Baptism' },
  marriage: { icon: IconHeart, color: '#e91e63', label: 'Marriage' },
  funeral: { icon: IconCross, color: '#7b1fa2', label: 'Funeral' },
};

interface RecordsCardViewProps {
  records: any[];
  recordType: string;
  loading: boolean;
  onViewRecord: (record: any) => void;
  searchTerm?: string;
}

const RecordsCardView: React.FC<RecordsCardViewProps> = ({
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

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (records.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
        <IconUser size={48} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 12 }} />
        <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>
          {searchTerm ? 'No matching records' : 'No records yet'}
        </Typography>
        <Typography variant="body2">
          {searchTerm
            ? `No ${recordType} records match "${searchTerm}"`
            : `${config.label} records will appear here once added.`}
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {records.map((record) => {
        const name = getPersonName(record, recordType);
        const date = getCeremonyDate(record, recordType);
        const secondary = getSecondaryInfo(record, recordType);
        const clergy = record.officiant_name || record.clergy || record.priest || '';

        return (
          <Grid item xs={12} sm={6} md={4} key={record.id}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover': {
                  borderColor: alpha(config.color, 0.4),
                  boxShadow: `0 2px 12px ${alpha(config.color, 0.08)}`,
                },
              }}
            >
              <CardActionArea onClick={() => onViewRecord(record)} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  {/* Top: Icon + Name */}
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={1.5}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: alpha(config.color, isDark ? 0.15 : 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <SacramentIcon size={18} color={config.color} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600,
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {name}
                      </Typography>
                      {date && (
                        <Typography variant="caption" color="text.secondary">
                          {date}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  {/* Details */}
                  <Stack spacing={0.5}>
                    {secondary && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.82rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {secondary}
                      </Typography>
                    )}
                    {recordType !== 'marriage' && clergy && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: '0.82rem' }}
                      >
                        Officiant: {clergy}
                      </Typography>
                    )}
                  </Stack>

                  {/* Registry badge */}
                  {(record.book_no || record.certificate_no) && (
                    <Box sx={{ mt: 1.5 }}>
                      <Chip
                        size="small"
                        label={
                          record.book_no
                            ? `Book ${record.book_no}${record.page_no ? `, p. ${record.page_no}` : ''}`
                            : `Cert. ${record.certificate_no}`
                        }
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 22, borderColor: 'divider' }}
                      />
                    </Box>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default RecordsCardView;
