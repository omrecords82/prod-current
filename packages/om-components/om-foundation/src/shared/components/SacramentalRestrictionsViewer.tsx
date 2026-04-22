/**
 * SacramentalRestrictionsViewer.tsx
 *
 * Reusable viewer for Eastern Orthodox sacramental date restrictions.
 * Two sections:
 *   A. Reference table (accordions for Baptism / Marriage / Funeral)
 *   B. Year calendar with colour-coded restricted dates
 *
 * Used by: Admin page, Portal page, Public page.
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import {
  getRestrictionsForYear,
  calculatePascha,
  toOldCalendarDates,
  type RestrictionPeriod,
  type OrthodoxCalendar,
} from '../lib/sacramentalDateRestrictions';
import { useLanguage } from '@/context/LanguageContext';

// ─── Reference data (key-driven) ────────────────────────────────

const BAPTISM_ROWS = [
  { periodKey: 'restrictions.bap_period_1', dates: 'Dec 25 – Jan 6', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.bap_period_2', dates: 'Feb 2', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.bap_period_3', dates: 'Mar 25', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.bap_period_4', dates: 'Aug 1–14', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.bap_period_5', dates: 'Aug 6', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.bap_period_6', dates: 'Sep 14', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.bap_period_7', dates: 'Pascha − 7', typeKey: 'restrictions.chip_moveable' },
  { periodKey: 'restrictions.bap_period_8', dates: 'Pascha − 6 to Pascha − 1', typeKey: 'restrictions.chip_moveable' },
  { periodKey: 'restrictions.bap_period_9', dates: 'Pascha', typeKey: 'restrictions.chip_moveable' },
  { periodKey: 'restrictions.bap_period_10', dates: 'Pascha + 39', typeKey: 'restrictions.chip_moveable' },
  { periodKey: 'restrictions.bap_period_11', dates: 'Pascha + 49', typeKey: 'restrictions.chip_moveable' },
];

const MARRIAGE_ROWS = [
  { periodKey: 'restrictions.mar_period_1', dates: 'Pascha − 48 to Pascha − 1', typeKey: 'restrictions.chip_moveable' },
  { periodKey: 'restrictions.mar_period_2', dates: 'Pascha to Pascha + 6', typeKey: 'restrictions.chip_moveable' },
  { periodKey: 'restrictions.mar_period_3', dates: 'Pascha + 49', typeKey: 'restrictions.chip_moveable' },
  { periodKey: 'restrictions.mar_period_4', dates: 'Pascha + 57 to Jun 28', typeKey: 'restrictions.chip_moveable' },
  { periodKey: 'restrictions.mar_period_5', dates: 'Aug 1–14', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.mar_period_6', dates: 'Nov 15 – Dec 24', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.mar_period_7', dates: 'Dec 25 – Jan 6', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.mar_period_8', dates: 'Aug 29', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.mar_period_9', dates: 'Sep 14', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.mar_period_10', dates: 'Feb 2', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.mar_period_11', dates: 'Mar 25', typeKey: 'restrictions.chip_fixed' },
  { periodKey: 'restrictions.mar_period_12', dates: 'Aug 6', typeKey: 'restrictions.chip_fixed' },
];

const FUNERAL_ROWS = [
  { periodKey: 'restrictions.fun_period_1', dates: 'Always', severity: 'Error' as const, noteKey: 'restrictions.fun_note_1' },
  { periodKey: 'restrictions.fun_period_2', dates: 'Pascha − 2', severity: 'Error' as const, noteKey: 'restrictions.fun_note_2' },
  { periodKey: 'restrictions.fun_period_3', dates: 'Pascha − 1', severity: 'Error' as const, noteKey: 'restrictions.fun_note_3' },
  { periodKey: 'restrictions.fun_period_4', dates: 'Pascha', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_4' },
  { periodKey: 'restrictions.fun_period_5', dates: 'Pascha + 1 to +6', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_5' },
  { periodKey: 'restrictions.fun_period_6', dates: 'Pascha + 49', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_6' },
  { periodKey: 'restrictions.fun_period_7', dates: 'Dec 25', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_7' },
  { periodKey: 'restrictions.fun_period_8', dates: 'Jan 6', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_8' },
  { periodKey: 'restrictions.fun_period_9', dates: 'Mar 25', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_9' },
  { periodKey: 'restrictions.fun_period_10', dates: 'Aug 6', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_10' },
  { periodKey: 'restrictions.fun_period_11', dates: 'Aug 15', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_11' },
  { periodKey: 'restrictions.fun_period_12', dates: 'Sep 8', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_12' },
  { periodKey: 'restrictions.fun_period_13', dates: 'Sep 14', severity: 'Warning' as const, noteKey: 'restrictions.fun_note_13' },
];

const DOW_KEYS = ['restrictions.dow_su', 'restrictions.dow_mo', 'restrictions.dow_tu', 'restrictions.dow_we', 'restrictions.dow_th', 'restrictions.dow_fr', 'restrictions.dow_sa'];

// ─── Helpers ────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────

const SacramentalRestrictionsViewer: React.FC = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [year, setYear] = useState(new Date().getFullYear());
  const [calendar, setCalendar] = useState<OrthodoxCalendar>('new');

  // Build restriction map for the selected year and calendar
  const restrictionMap = useMemo(() => {
    const periods = getRestrictionsForYear(year, calendar);
    const map = new Map<string, RestrictionPeriod[]>();
    for (const p of periods) {
      const existing = map.get(p.date);
      if (existing) {
        existing.push(p);
      } else {
        map.set(p.date, [p]);
      }
    }
    return map;
  }, [year, calendar]);

  const pascha = useMemo(() => calculatePascha(year), [year]);
  const paschaStr = `${t(`restrictions.month_${pascha.getMonth() + 1}`)} ${pascha.getDate()}`;

  // Colour helpers
  const getDateColor = (iso: string): string | undefined => {
    const periods = restrictionMap.get(iso);
    if (!periods) return undefined;
    const hasBaptism = periods.some((p) => p.sacrament === 'baptism');
    const hasMarriage = periods.some((p) => p.sacrament === 'marriage');
    const hasFuneral = periods.some((p) => p.sacrament === 'funeral');

    if (hasBaptism && hasMarriage) return theme.palette.error.main;
    if (hasBaptism) return theme.palette.error.light;
    if (hasMarriage) return theme.palette.warning.main;
    if (hasFuneral) return theme.palette.info.main;
    return undefined;
  };

  const getTooltip = (iso: string): string => {
    const periods = restrictionMap.get(iso);
    if (!periods) return '';
    const unique = [...new Set(periods.map((p) => `${p.sacrament}: ${p.label}`))];
    return unique.join('\n');
  };

  // Render a single mini-month
  const renderMonth = (month: number) => {
    const days = daysInMonth(year, month);
    const start = firstDayOfWeek(year, month);
    const cells: React.ReactNode[] = [];

    // Empty leading cells
    for (let i = 0; i < start; i++) {
      cells.push(<Box key={`empty-${i}`} sx={{ width: 28, height: 28 }} />);
    }

    for (let d = 1; d <= days; d++) {
      const iso = toISO(year, month, d);
      const color = getDateColor(iso);
      const tooltip = getTooltip(iso);
      const periods = restrictionMap.get(iso);
      const hasFuneralOnly = periods && periods.every((p) => p.sacrament === 'funeral');
      const hasFuneralError = periods && periods.some((p) => p.sacrament === 'funeral' && p.severity === 'error');
      const funeralOnlyWarning = hasFuneralOnly && !hasFuneralError;

      cells.push(
        <Tooltip key={d} title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} arrow disableHoverListener={!tooltip}>
          <Box
            sx={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              fontSize: '0.75rem',
              fontWeight: color ? 600 : 400,
              backgroundColor: color && !funeralOnlyWarning ? alpha(color, 0.2) : undefined,
              color: color || 'text.primary',
              border: funeralOnlyWarning ? `2px solid ${theme.palette.info.main}` : undefined,
              cursor: tooltip ? 'help' : undefined,
            }}
          >
            {d}
          </Box>
        </Tooltip>,
      );
    }

    return (
      <Paper
        key={month}
        variant="outlined"
        sx={{ p: 1.5, width: 240 }}
      >
        <Typography variant="subtitle2" align="center" sx={{ mb: 1 }}>
          {t(`restrictions.month_${month + 1}`)}
        </Typography>
        <Box sx={{ display: 'flex', gap: '2px', mb: 0.5 }}>
          {DOW_KEYS.map((key) => (
            <Box key={key} sx={{ width: 28, textAlign: 'center', fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600 }}>
              {t(key)}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
          {cells}
        </Box>
      </Paper>
    );
  };

  return (
    <>
      {/* ── A. Reference Table ── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {t('restrictions.ref_title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('restrictions.ref_subtitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          New Calendar (Revised Julian) dates align with the civil calendar. Old Calendar (Julian) fixed feasts fall 13 days later. Moveable feasts (Pascha-based) are the same for both calendars.
        </Typography>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('restrictions.baptism_heading')}</Typography>
            <Chip label={t('restrictions.chip_error')} color="error" size="small" sx={{ ml: 1 }} />
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>{t('restrictions.col_period')}</strong></TableCell>
                    <TableCell><strong>New Calendar</strong></TableCell>
                    <TableCell><strong>Old Calendar</strong></TableCell>
                    <TableCell><strong>{t('restrictions.col_type')}</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {BAPTISM_ROWS.map((r) => (
                    <TableRow key={r.periodKey}>
                      <TableCell>{t(r.periodKey)}</TableCell>
                      <TableCell>{r.dates}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{toOldCalendarDates(r.dates)}</TableCell>
                      <TableCell><Chip label={t(r.typeKey)} size="small" variant="outlined" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('restrictions.marriage_heading')}</Typography>
            <Chip label={t('restrictions.chip_error')} color="warning" size="small" sx={{ ml: 1 }} />
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>{t('restrictions.col_period')}</strong></TableCell>
                    <TableCell><strong>New Calendar</strong></TableCell>
                    <TableCell><strong>Old Calendar</strong></TableCell>
                    <TableCell><strong>{t('restrictions.col_type')}</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MARRIAGE_ROWS.map((r) => (
                    <TableRow key={r.periodKey}>
                      <TableCell>{t(r.periodKey)}</TableCell>
                      <TableCell>{r.dates}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{toOldCalendarDates(r.dates)}</TableCell>
                      <TableCell><Chip label={t(r.typeKey)} size="small" variant="outlined" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('restrictions.funeral_heading')}</Typography>
            <Chip label={t('restrictions.chip_warning')} color="info" size="small" sx={{ ml: 1 }} />
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>{t('restrictions.col_check')}</strong></TableCell>
                    <TableCell><strong>New Calendar</strong></TableCell>
                    <TableCell><strong>Old Calendar</strong></TableCell>
                    <TableCell><strong>{t('restrictions.col_severity')}</strong></TableCell>
                    <TableCell><strong>{t('restrictions.col_note')}</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {FUNERAL_ROWS.map((r) => (
                    <TableRow key={r.periodKey}>
                      <TableCell>{t(r.periodKey)}</TableCell>
                      <TableCell>{r.dates}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{toOldCalendarDates(r.dates)}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.severity === 'Error' ? t('restrictions.chip_error') : t('restrictions.chip_warning')}
                          size="small"
                          color={r.severity === 'Error' ? 'error' : 'info'}
                        />
                      </TableCell>
                      <TableCell>{t(r.noteKey)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* ── B. Year Calendar ── */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <IconButton onClick={() => setYear((y) => y - 1)} size="small">
            <ChevronLeft />
          </IconButton>
          <Typography variant="h5" sx={{ mx: 2 }}>
            {year}
          </Typography>
          <IconButton onClick={() => setYear((y) => y + 1)} size="small">
            <ChevronRight />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            {t('restrictions.pascha_label')} {paschaStr}
          </Typography>
          <ToggleButtonGroup
            value={calendar}
            exclusive
            onChange={(_e, val) => val && setCalendar(val as OrthodoxCalendar)}
            size="small"
            sx={{ ml: 'auto' }}
          >
            <ToggleButton value="new">New Calendar</ToggleButton>
            <ToggleButton value="old">Old Calendar</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: alpha(theme.palette.error.main, 0.2) }} />
            <Typography variant="caption">{t('restrictions.legend_both')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: alpha(theme.palette.error.light, 0.2) }} />
            <Typography variant="caption">{t('restrictions.legend_baptism')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: alpha(theme.palette.warning.main, 0.2) }} />
            <Typography variant="caption">{t('restrictions.legend_marriage')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: alpha(theme.palette.info.main, 0.2) }} />
            <Typography variant="caption">{t('restrictions.legend_funeral')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${theme.palette.info.main}` }} />
            <Typography variant="caption">{t('restrictions.legend_funeral_warn')}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
          {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
        </Box>
      </Paper>
    </>
  );
};

export default SacramentalRestrictionsViewer;
