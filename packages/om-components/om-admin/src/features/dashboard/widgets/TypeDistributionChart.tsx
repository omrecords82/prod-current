import { useTheme } from '@mui/material';
import { Paper, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';

interface Props {
  data: { name: string; value: number }[];
}

const TypeDistributionChart = ({ data }: Props) => {
  const theme = useTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const options: ApexCharts.ApexOptions = {
    chart: { type: 'donut', fontFamily: theme.typography.fontFamily },
    labels: data.map(d => d.name),
    colors: ['#1e88e5', '#e91e63', '#7b1fa2'],
    legend: { position: 'bottom', labels: { colors: theme.palette.text.primary } },
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
    tooltip: { theme: theme.palette.mode },
    dataLabels: { enabled: false },
  };

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
