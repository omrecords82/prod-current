import useChartDefaults from '@/hooks/useChartDefaults';
import { Box, Paper, Typography } from '@mui/material';
import Chart from 'react-apexcharts';

interface MonthlyData {
  month: string;
  baptism: number;
  marriage: number;
  funeral: number;
}

interface Props {
  data: MonthlyData[];
}

const SacramentsByYearChart = ({ data }: Props) => {
  const { buildOptions, themeTokens, OM_PALETTE } = useChartDefaults();

  const categories = data.map(d => {
    const [y, m] = d.month.split('-');
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  const options = buildOptions('bar', {
    chart: { stacked: false },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
    colors: [...OM_PALETTE],
    xaxis: { categories, labels: { style: { colors: themeTokens.textSecondary } } },
    yaxis: { labels: { style: { colors: themeTokens.textSecondary } } },
    legend: { position: 'top', labels: { colors: themeTokens.textPrimary } },
  });

  const series = [
    { name: 'Baptisms', data: data.map(d => d.baptism) },
    { name: 'Marriages', data: data.map(d => d.marriage) },
    { name: 'Funerals', data: data.map(d => d.funeral) },
  ];

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Typography variant="h6" fontWeight={600} mb={2}>Monthly Activity (Last 12 Months)</Typography>
      {data.length > 0 ? (
        <Chart options={options} series={series} type="bar" height={320} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'text.secondary' }}>
          <Typography>No dated records found</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default SacramentsByYearChart;
