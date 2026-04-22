/**
 * StateBadge — shared badge renderer for NEW / UPDATED state indicators
 *
 * Renders a compact MUI Chip based on resolved badge state.
 * Supports light and dark mode via theme-aware styling.
 */

import { Chip, useTheme } from '@mui/material';
import { BadgeData, resolveBadge } from '@/utils/badgeResolver';

interface StateBadgeProps {
  badgeData: BadgeData | undefined;
}

const StateBadge = ({ badgeData }: StateBadgeProps) => {
  const resolved = resolveBadge(badgeData);
  const theme = useTheme();

  if (!resolved.label) return null;

  const isDark = theme.palette.mode === 'dark';

  // State-specific styling
  const styles = resolved.state === 'new'
    ? {
        borderColor: isDark ? '#d4af37' : '#2d1b4e',
        color: isDark ? '#d4af37' : '#2d1b4e',
      }
    : {
        borderColor: isDark ? '#60a5fa' : '#3b82f6',
        color: isDark ? '#60a5fa' : '#3b82f6',
      };

  return (
    <Chip
      variant="outlined"
      size="small"
      label={resolved.label}
      sx={{
        height: '20px',
        fontSize: '0.625rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        borderRadius: '4px',
        ...styles,
      }}
    />
  );
};

export default StateBadge;
