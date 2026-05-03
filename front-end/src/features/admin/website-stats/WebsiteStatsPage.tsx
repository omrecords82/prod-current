import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { apiClient } from '@/api/utils/axiosInstance';
import { activeProvider } from '@/lib/analytics';

type Period = '24h' | '7d' | '30d' | '12mo';

type StatsResponse =
  | {
      configured: false;
      provider: string;
      message: string;
      env_hint: string[];
    }
  | {
      configured: true;
      provider: 'plausible' | 'umami';
      period: string;
      totals: {
        visitors: number;
        pageviews: number;
        bounce_rate: number;
        visit_duration: number;
      };
      top_pages: { page: string; visitors: number }[];
      top_referrers: { source: string; visitors: number }[];
    }
  | {
      configured: true;
      provider: string;
      error: string;
      detail?: string;
    };

const PERIODS: { id: Period; label: string }[] = [
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '12mo', label: 'Last 12 months' },
];

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatPercent(value: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

export default function WebsiteStatsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Show the *frontend's* analytics provider too — useful when an operator
  // is debugging "why isn't anything being recorded".
  const feProvider = useMemo(() => activeProvider(), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    apiClient
      .get<StatsResponse>(`/admin/website-stats?period=${period}`, {
        // Don't throw on 503 — that's the configured=false case which we
        // render as an empty state, not as an error.
        validateStatus: (s) => s < 500 || s === 503,
      })
      .then((res) => {
        if (cancelled) return;
        setData(res as StatsResponse);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err?.response?.data?.error || err?.message || 'Failed to load stats';
        setFetchError(String(msg));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Website Stats
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Public-site traffic for orthodoxmetrics.com — pulled from the configured analytics provider.
          </Typography>
        </Box>

        <Stack direction="row" gap={2} alignItems="center">
          <Chip
            size="small"
            color={feProvider === 'none' ? 'default' : 'primary'}
            label={`Tracker: ${feProvider}`}
          />
          <FormControl size="small">
            <InputLabel id="ws-period-label">Period</InputLabel>
            <Select
              labelId="ws-period-label"
              label="Period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              {PERIODS.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {!loading && fetchError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {fetchError}
        </Alert>
      )}

      {!loading && data && data.configured === false && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configuration needed
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {data.message}
            </Typography>
            <Box component="pre" sx={{
              mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1,
              fontSize: 13, overflowX: 'auto',
            }}>
{`# Backend env (server/.env or systemd unit):
${data.env_hint.join('\n')}

# Frontend env (front-end/.env.production):
VITE_ANALYTICS_PROVIDER=plausible|umami|ga4
VITE_PLAUSIBLE_DOMAIN=orthodoxmetrics.com         # for plausible
VITE_UMAMI_WEBSITE_ID=<uuid>                      # for umami
VITE_UMAMI_SCRIPT_URL=https://umami.example/script.js
VITE_GA4_MEASUREMENT_ID=G-XXXXXXX                 # for ga4`}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              See <code>docs/public-website-launch-config.md</code> for full setup steps.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!loading && data && 'error' in data && (
        <Alert severity="warning">
          Provider request failed{data.detail ? `: ${data.detail}` : ''}.
        </Alert>
      )}

      {!loading && data && data.configured === true && 'totals' in data && (
        <>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2} mb={3}>
            <StatCard label="Unique visitors" value={data.totals.visitors.toLocaleString()} />
            <StatCard label="Pageviews" value={data.totals.pageviews.toLocaleString()} />
            <StatCard label="Bounce rate" value={formatPercent(data.totals.bounce_rate)} />
            <StatCard label="Avg. visit duration" value={formatDuration(data.totals.visit_duration)} />
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
            <RankedTable title="Top pages" rows={data.top_pages.map((r) => ({ name: r.page, value: r.visitors }))} />
            <RankedTable title="Top referrers" rows={data.top_referrers.map((r) => ({ name: r.source, value: r.visitors }))} />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            Source: {data.provider}. No mock data is shown — when the provider is unreachable, the page surfaces the failure
            instead of substituting placeholders.
          </Typography>
        </>
      )}
    </Box>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={600} sx={{ mt: 0.5 }}>{value}</Typography>
    </Paper>
  );
}

function RankedTable({ title, rows }: { title: string; rows: { name: string; value: number }[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">No data for this period yet.</Typography>
      )}
      <Stack gap={1}>
        {rows.map((r, i) => (
          <Box key={`${r.name}-${i}`}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{r.name}</Typography>
              <Typography variant="body2" fontWeight={600}>{r.value.toLocaleString()}</Typography>
            </Stack>
            <Box sx={{ height: 4, bgcolor: 'grey.100', borderRadius: 1, mt: 0.5 }}>
              <Box sx={{ height: 4, bgcolor: 'primary.main', borderRadius: 1, width: `${(r.value / max) * 100}%` }} />
            </Box>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
