import React from 'react';
import { Typography, Stack, Chip, IconButton, Tooltip, useTheme } from '@mui/material';
import { IconRocket } from '@tabler/icons-react';
import ClassBadge from './ClassBadge';
import type { ReadyItem } from '../types';

function ReadyRow({ item, onRelease }: { item: ReadyItem; onRelease: (id: number) => void }) {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        px: 2,
        py: 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:hover': { bgcolor: theme.palette.grey[100] },
      }}
    >
      <ClassBadge classification={item.classification} />
      <Typography variant="body2" fontWeight={500} flex={1} noWrap>
        {item.title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {item.component}
      </Typography>
      {item.is_overdue && <Chip label="OVERDUE" size="small" color="error" sx={{ fontSize: '0.65rem', height: 20 }} />}
      {item.can_auto_release && <Chip label="Auto" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
      <Tooltip title="Release Now">
        <IconButton size="small" color="primary" onClick={() => onRelease(item.id)}>
          <IconRocket size={16} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default ReadyRow;
