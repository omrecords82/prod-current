/**
 * OcrChurchSelector — Compact church selector dropdown for OCR Studio pages.
 * Uses the shared useOcrChurchSelector hook.
 * Only renders for super_admin users.
 */

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import React from 'react';
import { useOcrChurchSelector } from '../hooks/useOcrChurchSelector';

const OcrChurchSelector: React.FC = () => {
  const { churches, selectedChurchId, setSelectedChurchId, showSelector } = useOcrChurchSelector();

  if (!showSelector) return null;

  return (
    <FormControl size="small" sx={{ minWidth: 260 }}>
      <InputLabel>Target Church</InputLabel>
      <Select
        value={selectedChurchId ?? ''}
        label="Target Church"
        onChange={(e) => setSelectedChurchId(Number(e.target.value))}
      >
        {churches.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name} (#{c.id})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default OcrChurchSelector;
