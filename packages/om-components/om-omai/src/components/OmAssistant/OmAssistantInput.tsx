import { Send as SendIcon } from '@mui/icons-material';
import { IconButton, Stack, TextField } from '@mui/material';
import React, { useState } from 'react';
import type { OmAssistantContext } from './omAssistant.types';

interface OmAssistantInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  context: OmAssistantContext;
}

const placeholders: Record<string, string> = {
  global: 'Ask OM Assistant...',
  'user-guide': 'Ask about the user guide...',
  dashboard: 'Search records or ask a question...',
};

export default function OmAssistantInput({ onSend, disabled, context }: OmAssistantInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <TextField
        fullWidth
        size="small"
        placeholder={placeholders[context.type] || placeholders.global}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        disabled={disabled}
        autoComplete="off"
      />
      <IconButton color="primary" onClick={handleSend} disabled={disabled || !value.trim()}>
        <SendIcon />
      </IconButton>
    </Stack>
  );
}
