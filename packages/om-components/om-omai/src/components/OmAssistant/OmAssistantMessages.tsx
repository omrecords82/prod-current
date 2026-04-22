import { SmartToy as BotIcon } from '@mui/icons-material';
import { Avatar, Box, CircularProgress, Link, Stack, Typography } from '@mui/material';
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OmAssistantContext, OmAssistantMessage } from './omAssistant.types';

interface OmAssistantMessagesProps {
  messages: OmAssistantMessage[];
  isLoading: boolean;
  context: OmAssistantContext;
}

const welcomeMessages: Record<string, string> = {
  global: 'Hi! I\'m the OM Assistant. How can I help you today?',
  'user-guide': 'Hi! Ask me anything about using Orthodox Metrics.',
  dashboard: 'Hi! I can help you search records or answer questions about your church data.',
};

export default function OmAssistantMessages({ messages, isLoading, context }: OmAssistantMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Welcome message */}
      {messages.length === 0 && (
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
            <BotIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, px: 1.5, py: 1, maxWidth: '85%' }}>
            <Typography variant="body2">{welcomeMessages[context.type] || welcomeMessages.global}</Typography>
          </Box>
        </Stack>
      )}

      {messages.map(msg => (
        <Stack
          key={msg.id}
          direction="row"
          spacing={1}
          justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}
          alignItems="flex-start"
        >
          {msg.role === 'assistant' && (
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
              <BotIcon sx={{ fontSize: 18 }} />
            </Avatar>
          )}
          <Box sx={{ maxWidth: '85%' }}>
            <Box
              sx={{
                bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                borderRadius: 2,
                px: 1.5,
                py: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <Typography variant="body2">{msg.content}</Typography>
            </Box>
            {/* Subtle work item link */}
            {msg.role === 'assistant' && msg.workItemId && (
              <Typography
                variant="caption"
                sx={{ mt: 0.25, display: 'block', color: 'text.disabled', fontSize: '0.65rem' }}
              >
                Work item{' '}
                <Link
                  component="button"
                  variant="caption"
                  sx={{ fontSize: '0.65rem', verticalAlign: 'baseline' }}
                  onClick={() => window.open(`/omai/tools/om-daily`, '_blank')}
                >
                  #{msg.workItemId}
                </Link>
              </Typography>
            )}
          </Box>
        </Stack>
      ))}

      {isLoading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
            <BotIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <CircularProgress size={18} />
        </Stack>
      )}

      <div ref={bottomRef} />
    </Box>
  );
}
