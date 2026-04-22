import { useTheme } from '@mui/material';
import { Paper, Typography, Box } from '@mui/material';
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
  const theme = useTheme();

  const categories = data.map(d => {
    const [y, m] = d.month.split('-');
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  const options: ApexCharts.ApexOptions = {
    chart: { type: 'bar', stacked: false, toolbar: { show: false }, fontFamily: theme.typography.fontFamily },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
    colors: ['#1e88e5', '#e91e63', '#7b1fa2'],
    xaxis: { categories, labels: { style: { colors: theme.palette.text.secondary } } },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
    legend: { position: 'top', labels: { colors: theme.palette.text.primary } },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 4 },
    tooltip: { theme: theme.palette.mode },
    dataLabels: { enabled: false },
  };

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
