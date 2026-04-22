import { Box, Typography, Paper, useTheme } from '@mui/material';
import Grid2 from '@/components/compat/Grid2';
import { IconDroplet, IconHeart, IconCross, IconDatabase } from '@tabler/icons-react';

interface Props {
  counts: { baptisms: number; marriages: number; funerals: number; total: number };
  yearOverYear: { changePercent: number };
}

const cards = [
  { key: 'baptisms', label: 'Baptisms', icon: IconDroplet, color: '#1e88e5' },
  { key: 'marriages', label: 'Marriages', icon: IconHeart, color: '#e91e63' },
  { key: 'funerals', label: 'Funerals', icon: IconCross, color: '#7b1fa2' },
  { key: 'total', label: 'Total Records', icon: IconDatabase, color: '#00897b' },
] as const;

const SacramentCountCards = ({ counts, yearOverYear }: Props) => {
  const theme = useTheme();

  return (
    <Grid2 container spacing={3}>
      {cards.map(({ key, label, icon: Icon, color }) => (
        <Grid2 key={key} size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: `${color}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={24} color={color} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {counts[key].toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              {key === 'total' && yearOverYear.changePercent !== 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: yearOverYear.changePercent > 0 ? 'success.main' : 'error.main' }}
                >
                  {yearOverYear.changePercent > 0 ? '+' : ''}{yearOverYear.changePercent}% vs last year
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid2>
      ))}
    </Grid2>
  );
};

export default SacramentCountCards;
