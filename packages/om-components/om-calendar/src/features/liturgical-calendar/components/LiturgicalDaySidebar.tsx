/**
 * Liturgical Day Sidebar
 *
 * Shows detailed liturgical information for a selected day:
 * saints, readings, fasting, tone, season, and liturgical color.
 */

import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Divider, IconButton, Stack, List,
  ListItem, ListItemIcon, ListItemText, alpha, useTheme,
} from '@mui/material';
import {
  IconX, IconCross, IconBook, IconMeat, IconStar, IconUser, IconCalendar,
} from '@tabler/icons-react';
import { LiturgicalDayData } from '../api/liturgicalCalendarApi';

// Map liturgical colors to hex values
const COLOR_HEX: Record<string, string> = {
  white: '#F5F5F0',
  gold: '#C9A227',
  blue: '#1E6B8C',
  red: '#B22234',
  purple: '#6B2D75',
  green: '#4CAF50',
};

// Map fasting levels to display info
const FASTING_INFO: Record<string, { label: string; color: string }> = {
  strict: { label: 'Strict Fast', color: '#424242' },
  wine_oil: { label: 'Wine & Oil', color: '#8D6E63' },
  fish: { label: 'Fish Allowed', color: '#42A5F5' },
  dairy: { label: 'Dairy Allowed', color: '#FFE082' },
  fast_free: { label: 'No Fast', color: '#4CAF50' },
};

interface LiturgicalDaySidebarProps {
  day: LiturgicalDayData;
  date: Date;
  onClose: () => void;
}

const LiturgicalDaySidebar: React.FC<LiturgicalDaySidebarProps> = ({ day, date, onClose }) => {
  const theme = useTheme();
  const colorHex = COLOR_HEX[day.liturgicalColor] || COLOR_HEX.green;
  const fastingInfo = FASTING_INFO[day.fasting.level] || FASTING_INFO.fast_free;

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderTop: `4px solid ${colorHex}`,
        height: '100%',
        overflow: 'auto',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Chip
              size="small"
              label={day.liturgicalColor.toUpperCase()}
              sx={{
                backgroundColor: alpha(colorHex, 0.15),
                color: colorHex,
                fontWeight: 600,
                fontSize: '0.7rem',
                mb: 1,
              }}
            />
            <Typography variant="h6" fontWeight={600} lineHeight={1.3}>
              {formattedDate}
            </Typography>
            <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
              {day.tone && (
                <Typography variant="caption" color="text.secondary">
                  Tone {day.tone}
                </Typography>
              )}
              {day.tone && day.season && (
                <Typography variant="caption" color="text.secondary">|</Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {day.season}
              </Typography>
            </Stack>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <IconX size={18} />
          </IconButton>
        </Box>

        {/* Feast Name */}
        {day.feastName && (
          <Box
            mb={2}
            p={1.5}
            borderRadius={1}
            sx={{ backgroundColor: alpha(colorHex, 0.08) }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {day.feastRank === 'great' && <IconStar size={16} color={colorHex} />}
              {day.feastRank === 'major' && <IconCross size={16} color={colorHex} />}
              <Typography variant="subtitle2" fontWeight={600} color={colorHex}>
                {day.feastName}
              </Typography>
            </Stack>
            {day.feastRank === 'great' && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Great Feast of the Church
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Saints */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Saints & Commemorations
        </Typography>
        <List dense disablePadding sx={{ mb: 2 }}>
          {day.saints.map((saint, i) => (
            <ListItem key={i} disableGutters sx={{ py: 0.5, alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                <IconUser size={14} color={theme.palette.text.secondary} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={500}>
                    {saint.name}
                  </Typography>
                }
                secondary={saint.description}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>

        {/* Readings */}
        {day.readings && (
          <>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="overline" color="text.secondary" fontWeight={600}>
              Scripture Readings
            </Typography>
            <List dense disablePadding sx={{ mb: 2 }}>
              {day.readings.epistle && (
                <ListItem disableGutters sx={{ py: 0.3 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <IconBook size={14} color={theme.palette.text.secondary} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        <strong>Epistle:</strong> {day.readings.epistle}
                      </Typography>
                    }
                  />
                </ListItem>
              )}
              {day.readings.gospel && (
                <ListItem disableGutters sx={{ py: 0.3 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <IconBook size={14} color={theme.palette.text.secondary} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        <strong>Gospel:</strong> {day.readings.gospel}
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          </>
        )}

        {/* Fasting */}
        <Divider sx={{ mb: 1.5 }} />
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Fasting
        </Typography>
        <Box mt={0.5} mb={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconMeat size={16} color={fastingInfo.color} />
            <Chip
              size="small"
              label={fastingInfo.label}
              sx={{
                backgroundColor: alpha(fastingInfo.color, 0.12),
                color: fastingInfo.color,
                fontWeight: 500,
                fontSize: '0.7rem',
              }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {day.fasting.description}
          </Typography>
        </Box>

        {/* Pascha reference */}
        <Divider sx={{ mb: 1.5 }} />
        <Stack direction="row" spacing={1} alignItems="center">
          <IconCalendar size={14} color={theme.palette.text.secondary} />
          <Typography variant="caption" color="text.secondary">
            Pascha {day.paschaDate}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LiturgicalDaySidebar;
