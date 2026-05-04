import { FC, useMemo } from 'react';
import { Box, Chip, Stack, Tooltip, Typography, useTheme, alpha } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import useDeploymentFingerprint, { type BuildFingerprint } from '@/hooks/useDeploymentFingerprint';

/**
 * DeploymentFingerprintBar — thin, compact strip at the top of the OM admin
 * shell. Visible to super_admin only. Shows what FE + BE builds are
 * currently running so a developer can decide whether OM needs another
 * frontend or backend deploy after a merge.
 *
 * NOT a "is this stale vs main" indicator — Tier 2 (polling main) is
 * intentionally out of scope for this iteration.
 */

function formatRelative(iso: string | null): string {
  if (!iso) return 'no time';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'no time';
  const diffMs = Date.now() - t;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

interface BuildVersionChipProps {
  label: string;
  fingerprint: BuildFingerprint | null;
  showTime?: boolean;
}

const BuildVersionChip: FC<BuildVersionChipProps> = ({ label, fingerprint, showTime }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fg = isDark ? theme.palette.grey[300] : theme.palette.grey[800];
  const bg = isDark ? alpha(theme.palette.grey[700], 0.4) : alpha(theme.palette.grey[300], 0.5);

  const value = showTime
    ? formatRelative(fingerprint?.builtAt ?? null)
    : fingerprint?.gitSha?.slice(0, 7) || 'unknown';

  const tooltipLines = fingerprint
    ? [
        `${fingerprint.app}/${fingerprint.target}`,
        `commit: ${fingerprint.gitSha}`,
        `branch: ${fingerprint.gitBranch}`,
        fingerprint.builtAt ? `built: ${fingerprint.builtAt}` : 'built: —',
        fingerprint.buildHost ? `host: ${fingerprint.buildHost}` : '',
      ].filter(Boolean).join('\n')
    : `${label} unavailable — version.json missing or fetch failed`;

  return (
    <Tooltip title={<pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 11 }}>{tooltipLines}</pre>} arrow>
      <Chip
        size="small"
        label={
          <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
            <Box component="span" sx={{ opacity: 0.7, mr: 0.5 }}>{label}</Box>
            <Box component="span" sx={{ fontWeight: 600 }}>{value}</Box>
          </Box>
        }
        sx={{
          height: 20,
          color: fg,
          bgcolor: bg,
          border: `1px solid ${alpha(fg, 0.15)}`,
          '& .MuiChip-label': { px: 1, py: 0 },
        }}
      />
    </Tooltip>
  );
};

const DeploymentFingerprintBar: FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const enabled = !!user && isSuperAdmin();
  const { frontend, backend, loading } = useDeploymentFingerprint(enabled);

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const barStyles = useMemo(
    () => ({
      bgcolor: isDark ? alpha('#000', 0.35) : alpha(theme.palette.grey[100], 0.85),
      borderBottom: `1px solid ${isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
      px: 2,
      py: 0.5,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minHeight: 28,
      backdropFilter: 'blur(6px)',
      position: 'sticky' as const,
      top: 0,
      zIndex: theme.zIndex.appBar + 1,
    }),
    [theme, isDark],
  );

  if (!enabled) return null;
  if (loading) return null;

  return (
    <Box sx={barStyles} role="status" aria-label="Deployment fingerprint (super_admin)">
      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'text.secondary', mr: 0.5 }}>
        OM build
      </Typography>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
        <BuildVersionChip label="fe" fingerprint={frontend} />
        <BuildVersionChip label="fe@" fingerprint={frontend} showTime />
        <BuildVersionChip label="be" fingerprint={backend} />
        <BuildVersionChip label="be@" fingerprint={backend} showTime />
      </Stack>
    </Box>
  );
};

export default DeploymentFingerprintBar;
