import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert
} from '@mui/material'; // @mui/material v5.14.0
import { LineChart } from '../charts/LineChart';
import { useMetrics } from '../../hooks/useMetrics';
import { Metric, MetricCategory } from '../../types/metric.types';
import { ChartType } from '../../types/chart.types';

interface MetricComparisonProps {
  companyId: string;
}

const REVENUE_RANGES = [
  '< $1M ARR',
  '$1M - $5M ARR',
  '$5M - $10M ARR',
  '$10M - $25M ARR',
  '$25M+ ARR'
];

const MAX_METRICS_SELECTION = 5;

const MetricComparison: React.FC<MetricComparisonProps> = React.memo(({ companyId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // State management
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [revenueRange, setRevenueRange] = useState<string>(REVENUE_RANGES[1]);
  const [chartData, setChartData] = useState<any>(null);

  // Fetch metrics data using custom hook
  const { metrics, loading, error } = useMetrics(companyId, {
    category: MetricCategory.FINANCIAL,
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  });

  // Memoized chart dimensions based on screen size
  const chartDimensions = useMemo(() => ({
    width: isMobile ? 320 : isTablet ? 600 : 800,
    height: isMobile ? 240 : isTablet ? 400 : 500
  }), [isMobile, isTablet]);

  // Handle metric selection changes
  const handleMetricSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const metricId = event.target.value;
    setSelectedMetrics(prev => {
      const isSelected = prev.includes(metricId);
      if (isSelected) {
        return prev.filter(id => id !== metricId);
      }
      if (prev.length >= MAX_METRICS_SELECTION) {
        return prev;
      }
      return [...prev, metricId];
    });
  }, []);

  // Handle revenue range changes
  const handleRevenueRangeChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    setRevenueRange(event.target.value as string);
  }, []);

  // Export comparison data
  const handleExport = useCallback(() => {
    if (!chartData) return;

    const csvContent = [
      ['Metric', 'Your Data', 'Benchmark', 'Variance'],
      ...chartData.datasets.map((dataset: any) => [
        dataset.label,
        dataset.data[0],
        dataset.data[1],
        `${((dataset.data[0] - dataset.data[1]) / dataset.data[1] * 100).toFixed(1)}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metric-comparison-${new Date().toISOString()}.csv`;
    link.click();
  }, [chartData]);

  // Update chart data when selections change
  useEffect(() => {
    if (!metrics || !selectedMetrics.length) return;

    const selectedMetricData = metrics
      .filter(metric => selectedMetrics.includes(metric.id))
      .map(metric => ({
        label: metric.name,
        companyData: Math.random() * 100, // Replace with actual company data
        benchmarkData: Math.random() * 100 // Replace with actual benchmark data
      }));

    setChartData({
      labels: ['Your Company', 'Industry Benchmark'],
      datasets: selectedMetricData.map((metric, index) => ({
        label: metric.label,
        data: [metric.companyData, metric.benchmarkData],
        backgroundColor: theme.palette.primary[`${index * 100 + 100}`],
        borderColor: theme.palette.primary[`${index * 100 + 200}`],
        borderWidth: 2
      }))
    });
  }, [metrics, selectedMetrics, theme.palette.primary]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading metrics: {error}
      </Alert>
    );
  }

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: { xs: 2, sm: 3, md: 4 },
        borderRadius: 2
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom>
        Benchmark Analysis
      </Typography>

      {/* Controls Section */}
      <Box sx={{ mb: 4 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Revenue Range Selection
          </Typography>
          <Select
            value={revenueRange}
            onChange={handleRevenueRangeChange}
            aria-label="Select revenue range"
          >
            {REVENUE_RANGES.map(range => (
              <MenuItem key={range} value={range}>
                {range}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Metric Selection (max {MAX_METRICS_SELECTION})
          </Typography>
          <FormGroup>
            {metrics?.map(metric => (
              <FormControlLabel
                key={metric.id}
                control={
                  <Checkbox
                    checked={selectedMetrics.includes(metric.id)}
                    onChange={handleMetricSelect}
                    value={metric.id}
                    disabled={!selectedMetrics.includes(metric.id) && 
                            selectedMetrics.length >= MAX_METRICS_SELECTION}
                  />
                }
                label={metric.name}
              />
            ))}
          </FormGroup>
        </FormControl>
      </Box>

      {/* Comparison View */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : chartData ? (
        <>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table aria-label="metric comparison table">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Your Data</TableCell>
                  <TableCell align="right">Benchmark</TableCell>
                  <TableCell align="right">Variance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chartData.datasets.map((dataset: any) => (
                  <TableRow key={dataset.label}>
                    <TableCell component="th" scope="row">
                      {dataset.label}
                    </TableCell>
                    <TableCell align="right">
                      {dataset.data[0].toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {dataset.data[1].toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {((dataset.data[0] - dataset.data[1]) / dataset.data[1] * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mb: 4 }}>
            <LineChart
              data={chartData}
              type={ChartType.LINE}
              height={chartDimensions.height}
              width={chartDimensions.width}
              isLoading={loading}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: isMobile ? 'bottom' : 'right'
                  }
                }
              }}
            />
          </Box>

          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleExport}
              disabled={!chartData}
              aria-label="Export comparison data"
            >
              Export Data
            </Button>
          </Box>
        </>
      ) : (
        <Typography variant="body1" color="text.secondary" align="center">
          Select metrics to view comparison
        </Typography>
      )}
    </Paper>
  );
});

MetricComparison.displayName = 'MetricComparison';

export default MetricComparison;