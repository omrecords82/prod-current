import useChartDefaults from '@/hooks/useChartDefaults';
import { Box, Paper, Typography } from '@mui/material';
import Chart from 'react-apexcharts';

interface Props {
  data: { name: string; value: number }[];
}

const TypeDistributionChart = ({ data }: Props) => {
  const { buildOptions, themeTokens, OM_PALETTE } = useChartDefaults();
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const options = buildOptions('donut', {
    labels: data.map(d => d.name),
    colors: [...OM_PALETTE],
    legend: { position: 'bottom', labels: { colors: themeTokens.textPrimary } },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: { show: true, label: 'Total', formatter: () => total.toLocaleString() },
          },
        },
      },
    },
    stroke: { width: 0 },
  });

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Typography variant="h6" fontWeight={600} mb={2}>Record Types</Typography>
      {total > 0 ? (
        <Chart options={options} series={data.map(d => d.value)} type="donut" height={320} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'text.secondary' }}>
          <Typography>No records yet</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TypeDistributionChart;
