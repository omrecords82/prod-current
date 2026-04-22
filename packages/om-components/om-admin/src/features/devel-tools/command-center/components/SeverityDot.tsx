import React from 'react';
import { Box } from '@mui/material';
import { SEVERITY_COLOR } from '../types';
import type { Severity } from '../types';

/** Severity indicator dot */
function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: SEVERITY_COLOR[severity],
        flexShrink: 0,
        mt: 0.5,
      }}
    />
  );
}

export default SeverityDot;
