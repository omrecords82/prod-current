import { Paper, Typography, Box } from '@mui/material';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';

interface Props {
  data: {
    currentYear: number;
    previousYear: number;
    current: number;
    previous: number;
    changePercent: number;
  };
}

const YearOverYearCard = ({ data }: Props) => {
  const isUp = data.changePercent > 0;
  const isDown = data.changePercent < 0;
  const TrendIcon = isUp ? IconTrendingUp : isDown ? IconTrendingDown : IconMinus;
  const trendColor = isUp ? '#2e7d32' : isDown ? '#d32f2f' : '#757575';

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Typography variant="h6" fontWeight={600} mb={2}>Year over Year</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">{data.currentYear}</Typography>
          <Typography variant="h4" fontWeight={700}>{data.current.toLocaleString()}</Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">{data.previousYear}</Typography>
          <Typography variant="h5" fontWeight={600} color="text.secondary">{data.previous.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: `${trendColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendIcon size={18} color={trendColor} />
          </Box>
          <Typography variant="body1" fontWeight={600} sx={{ color: trendColor }}>
            {isUp ? '+' : ''}{data.changePercent}%
          </Typography>
          <Typography variant="body2" color="text.secondary">change</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default YearOverYearCard;
