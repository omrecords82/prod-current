/**
 * BuildSummaryCards.tsx — Frontend and Server build info cards.
 */

import React from 'react';
import { Box, Paper, Typography, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { IconRefresh, IconServer, IconBrowser } from '@tabler/icons-react';
import { FONT as f } from './helpers';

interface BuildSummaryCardsProps {
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  labelColor: string;
  textColor: string;
  buildInfo: { version?: string; environment?: string; gitSha?: string; buildTime?: string };
  serverVersion: any;
  serverLoading: boolean;
  refetchServer: () => void;
}

const BuildSummaryCards: React.FC<BuildSummaryCardsProps> = ({
  isDark, cardBg, cardBorder, labelColor, textColor,
  buildInfo, serverVersion, serverLoading, refetchServer,
}) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
    {/* Frontend */}
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: cardBorder, bgcolor: cardBg }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconBrowser size={18} color={isDark ? '#93c5fd' : '#3b82f6'} />
        <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor }}>Frontend Build</Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        {[
          { label: 'Version', value: buildInfo.version || 'N/A' },
          { label: 'Environment', value: buildInfo.environment || 'development' },
          { label: 'Git SHA', value: buildInfo.gitSha || 'unknown', mono: true },
          { label: 'Build Time', value: buildInfo.buildTime ? new Date(buildInfo.buildTime).toLocaleString() : 'N/A' },
        ].map(item => (
          <Box key={item.label}>
            <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {item.label}
            </Typography>
            <Typography sx={{ fontFamily: item.mono ? 'monospace' : f, fontSize: '0.75rem', color: textColor, fontWeight: 500 }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>

    {/* Server */}
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: cardBorder, bgcolor: cardBg }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconServer size={18} color={isDark ? '#c4b5fd' : '#7c3aed'} />
        <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor }}>Server Build</Typography>
        <Box sx={{ ml: 'auto' }}>
          <Tooltip title="Refresh server version">
            <IconButton size="small" onClick={refetchServer} disabled={serverLoading}>
              {serverLoading ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      {serverLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {[
            { label: 'Version', value: serverVersion?.version || 'N/A' },
            { label: 'Node.js', value: serverVersion?.nodeVersion || 'N/A' },
            { label: 'Git SHA', value: serverVersion?.gitSha || 'unknown', mono: true },
            { label: 'Uptime', value: serverVersion?.uptime ? `${Math.floor(serverVersion.uptime / 3600)}h ${Math.floor((serverVersion.uptime % 3600) / 60)}m` : 'N/A' },
          ].map(item => (
            <Box key={item.label}>
              <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </Typography>
              <Typography sx={{ fontFamily: item.mono ? 'monospace' : f, fontSize: '0.75rem', color: textColor, fontWeight: 500 }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  </Box>
);

export default BuildSummaryCards;
