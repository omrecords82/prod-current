import React from 'react';
import { Box, Button, Stack, Typography, useTheme, alpha } from '@mui/material';

/**
 * EmptyState — friendly empty-state placeholder.
 *
 * Shows a soft illustration, a short title, a supporting description, and
 * an optional call-to-action button. Use anywhere a list, table, or queue
 * has no items yet to give users a clear next step instead of a bare
 * "No results" line.
 */
export interface EmptyStateProps {
  /** Optional illustration — either a React node (e.g. an icon component) or an image src. */
  illustration?: React.ReactNode;
  /** Main heading, e.g. "No OCR jobs yet". */
  title: string;
  /** Supporting paragraph that explains what the user can do next. */
  description?: string;
  /** Optional primary action label. If omitted the button is not rendered. */
  actionLabel?: string;
  /** Callback invoked when the action button is clicked. */
  onAction?: () => void;
  /** Size preset. `compact` is suited for table rows / sidebar sections, `default` for full-page empties. */
  size?: 'compact' | 'default';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  size = 'default',
}) => {
  const theme = useTheme();
  const isCompact = size === 'compact';
  return (
    <Stack
      alignItems="center"
      spacing={isCompact ? 1.25 : 2}
      sx={{
        py: isCompact ? 3 : 6,
        px: 2,
        textAlign: 'center',
        color: 'text.secondary',
      }}
    >
      {illustration && (
        <Box
          aria-hidden
          sx={{
            width: isCompact ? 96 : 160,
            height: isCompact ? 96 : 160,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.palette.primary.main,
          }}
        >
          {illustration}
        </Box>
      )}
      <Typography variant={isCompact ? 'subtitle1' : 'h6'} fontWeight={600} color="text.primary">
        {title}
      </Typography>
      {description && (
        <Typography
          variant={isCompact ? 'caption' : 'body2'}
          sx={{ maxWidth: isCompact ? 320 : 420, lineHeight: 1.55 }}
        >
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} size={isCompact ? 'small' : 'medium'}>
          {actionLabel}
        </Button>
      )}
    </Stack>
  );
};

export default EmptyState;
