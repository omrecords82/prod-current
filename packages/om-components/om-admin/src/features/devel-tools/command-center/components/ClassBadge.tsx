import React from 'react';
import { Chip } from '@mui/material';
import { CLASSIFICATION } from '@/theme/adminTokens';
import { CLASSIFICATION_CONFIG } from '../types';
import type { Classification } from '../types';

/** Classification badge chip */
function ClassBadge({ classification }: { classification: Classification }) {
  const cfg = CLASSIFICATION_CONFIG[classification];
  const Icon = cfg.icon;
  const tokens = CLASSIFICATION[classification] || CLASSIFICATION.monitor;
  return (
    <Chip
      icon={<Icon size={14} />}
      label={cfg.label}
      size="small"
      sx={{
        fontWeight: 700,
        fontSize: '0.7rem',
        letterSpacing: 0.5,
        backgroundColor: tokens.chip.bg,
        color: tokens.chip.text,
        border: `1px solid ${tokens.border}`,
        '& .MuiChip-icon': { color: tokens.chip.text },
      }}
    />
  );
}

export default ClassBadge;
