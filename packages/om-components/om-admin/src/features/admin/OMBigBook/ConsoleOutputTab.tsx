/**
 * ConsoleOutputTab.tsx — Console output display panel for OMBigBook.
 */

import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Refresh as RefreshCwIcon } from '@mui/icons-material';
import type { ConsoleOutput } from './types';

interface ConsoleOutputTabProps {
  consoleOutput: ConsoleOutput[];
  consoleRef: React.RefObject<HTMLDivElement>;
  clearConsole: () => void;
}

const ConsoleOutputTab: React.FC<ConsoleOutputTabProps> = ({ consoleOutput, consoleRef, clearConsole }) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      <Typography variant="h6">Console Output</Typography>
      <Button variant="outlined" startIcon={<RefreshCwIcon />} onClick={clearConsole} size="small">
        Clear Console
      </Button>
    </Stack>

    <Paper
      ref={consoleRef}
      sx={{
        height: 400,
        overflow: 'auto',
        p: 2,
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
      }}
    >
      {consoleOutput.length === 0 ? (
        <Typography color="grey.500" textAlign="center">
          No console output yet. Upload and execute files to see results.
        </Typography>
      ) : (
        consoleOutput.map((output) => (
          <Box key={output.id} sx={{ mb: 1 }}>
            <Typography
              component="span"
              sx={{
                color: output.type === 'error' ? '#ff6b6b' :
                       output.type === 'success' ? '#51cf66' :
                       output.type === 'warning' ? '#ffd43b' :
                       output.type === 'command' ? '#74c0fc' : '#ffffff',
                fontWeight: output.type === 'command' ? 'bold' : 'normal',
              }}
            >
              [{output.timestamp.toLocaleTimeString()}] {output.content}
            </Typography>
            {output.source && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                ({output.source})
              </Typography>
            )}
          </Box>
        ))
      )}
    </Paper>
  </Box>
);

export default ConsoleOutputTab;
