import useChartDefaults from '@/hooks/useChartDefaults';
import { Box, Paper, Typography } from '@mui/material';
import Chart from 'react-apexcharts';

interface Props {
  value: number;
  dateRange: { earliest: number | null; latest: number | null };
}

const CompletenessGauge = ({ value, dateRange }: Props) => {
  const { buildOptions, themeTokens } = useChartDefaults();
  const color = value >= 80 ? '#2e7d32' : value >= 50 ? '#ed6c02' : '#d32f2f';

  const options = buildOptions('radialBar', {
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '65%' },
        track: { background: themeTokens.mode === 'dark' ? '#333' : '#f0f0f0', strokeWidth: '100%' },
        dataLabels: {
          name: { show: true, offsetY: -10, color: themeTokens.textSecondary, fontSize: '13px' },
          value: { show: true, fontSize: '28px', fontWeight: 700, color: themeTokens.textPrimary, formatter: (val: number) => `${val}%` },
        },
      },
    },
    colors: [color],
    labels: ['Complete'],
    stroke: { lineCap: 'round' },
  });

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Typography variant="h6" fontWeight={600} mb={1}>Data Completeness</Typography>
      <Chart options={options} series={[value]} type="radialBar" height={220} />
      {dateRange.earliest && dateRange.latest && (
        <Box sx={{ textAlign: 'center', mt: -1 }}>
          <Typography variant="body2" color="text.secondary">
            Records span {dateRange.earliest} &ndash; {dateRange.latest}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CompletenessGauge;
