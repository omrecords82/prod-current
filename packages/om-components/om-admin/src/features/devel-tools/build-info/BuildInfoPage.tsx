/**
 * Build Info Page
 * Displays synchronized build version information for Frontend and Server
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Chip,
  Stack,
  Divider,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  IconGitBranch,
  IconCalendar,
  IconInfoCircle,
  IconServer,
  IconBrowser,
  IconRefresh,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { getBuildInfo } from '@/shared/lib/buildInfo';
import { useServerVersion } from '@/hooks/useServerVersion';

const formatValue = (value: string | undefined, fallback: string = 'N/A'): string => {
  if (!value || value === 'unknown' || value === 'undefined') {
    return fallback;
  }
  return value;
};

const isValidValue = (value: string | undefined): boolean => {
  return !!value && value !== 'unknown' && value !== 'undefined' && value !== 'N/A';
};

const BuildInfoPage: React.FC = () => {
  const buildInfo = getBuildInfo();
  const { serverVersion, isLoading, refetch } = useServerVersion();
  const versionsMatch = serverVersion && buildInfo.gitSha === serverVersion.gitSha;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Build Information</Typography>
        <Tooltip title="Refresh server version">
          <IconButton onClick={refetch} disabled={isLoading}>
            {isLoading ? <CircularProgress size={20} /> : <IconRefresh size={20} />}
          </IconButton>
        </Tooltip>
      </Stack>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          background: versionsMatch 
            ? 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)'
            : 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)',
          borderRadius: 2,
          color: '#fff',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {versionsMatch ? <IconCheck size={24} /> : <IconAlertTriangle size={24} />}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {versionsMatch ? 'Versions Synchronized' : 'Version Mismatch Detected'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {versionsMatch 
                ? 'Frontend and Server are running the same build.'
                : 'Frontend and Server builds may be out of sync.'}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)', borderRadius: 2, height: '100%', color: '#fff' }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconBrowser size={24} />
                <Typography variant="h6" fontWeight="bold">Frontend</Typography>
              </Stack>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>Version</Typography>
                <Typography variant="h5" fontFamily="monospace" fontWeight="bold">
                  {formatValue(buildInfo.version, 'unknown')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>Git SHA</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconGitBranch size={16} />
                  <Chip label={formatValue(buildInfo.gitSha, 'unknown')} size="small" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} />
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>Build Time</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconCalendar size={16} />
                  <Typography variant="body2" fontFamily="monospace">
                    {new Date(buildInfo.buildTime).toLocaleString()}
                  </Typography>
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>Environment</Typography>
                <Typography variant="body2" fontFamily="monospace">{buildInfo.environment || 'development'}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          {isLoading ? (
            <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%)', borderRadius: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <CircularProgress color="inherit" />
            </Paper>
          ) : (
            <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%)', borderRadius: 2, height: '100%', color: '#fff' }}>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconServer size={24} />
                  <Typography variant="h6" fontWeight="bold">Server</Typography>
                </Stack>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Version</Typography>
                  <Typography variant="h5" fontFamily="monospace" fontWeight="bold">
                    {formatValue(serverVersion?.version, 'unknown')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Git SHA</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconGitBranch size={16} />
                    <Chip label={formatValue(serverVersion?.gitSha, 'unknown')} size="small" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} />
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Build Time</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconCalendar size={16} />
                    <Typography variant="body2" fontFamily="monospace">
                      {serverVersion?.buildTime ? new Date(serverVersion.buildTime).toLocaleString() : 'unknown'}
                    </Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Node.js</Typography>
                  <Typography variant="body2" fontFamily="monospace">{serverVersion?.nodeVersion || 'unknown'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Uptime</Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {serverVersion?.uptime ? `${Math.floor(serverVersion.uptime / 3600)}h ${Math.floor((serverVersion.uptime % 3600) / 60)}m` : 'unknown'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconInfoCircle size={20} />
            Raw Build Data
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Frontend</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <pre style={{ margin: 0, overflow: 'auto' }}>{JSON.stringify(buildInfo, null, 2)}</pre>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Server</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <pre style={{ margin: 0, overflow: 'auto' }}>{JSON.stringify(serverVersion, null, 2)}</pre>
              </Paper>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> If you see old build information after a deployment, clear your browser cache or perform a hard refresh (Ctrl+Shift+R / Cmd+Shift+R).
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BuildInfoPage;
