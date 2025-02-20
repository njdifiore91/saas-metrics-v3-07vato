import React, { useEffect, useState, useMemo, useCallback } from 'react'; // react v18.2.0
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  useTheme, 
  Alert 
} from '@mui/material'; // @mui/material v5.14.0

import LineChart from '../charts/LineChart';
import { useMetrics } from '../../hooks/useMetrics';
import ErrorBoundary from '../common/ErrorBoundary';
import { ChartType, ChartData } from '../../types/chart.types';
import { MetricCategory, MetricDataType } from '../../types/metric.types';

interface MetricHistoryProps {
  companyId: string;
  category: MetricCategory;
  enableRealtime?: boolean;
}

const TIME_PERIODS = {
  '1M': { label: 'Last Month', days: 30 },
  '3M': { label: 'Last 3 Months', days: 90 },
  '6M': { label: 'Last 6 Months', days: 180 },
  '1Y': { label: 'Last Year', days: 365 },
  'YTD': { label: 'Year to Date', days: 0 }
};

const MetricHistory: React.FC<MetricHistoryProps> = React.memo(({
  companyId,
  category,
  enableRealtime = false
}) => {
  const theme = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('3M');
  
  // Initialize metrics hook with real-time updates
  const {
    metrics,
    loading,
    error,
    fetchMetrics,
    subscribeToUpdates
  } = useMetrics(companyId, {
    category,
    autoRefresh: enableRealtime,
    refreshInterval: 300000 // 5 minutes
  });

  // Format metric data for chart visualization
  const chartData = useMemo((): ChartData => {
    if (!metrics?.length) {
      return { labels: [], datasets: [] };
    }

    const periodDays = TIME_PERIODS[selectedPeriod].days;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    const filteredMetrics = metrics.filter(metric => 
      new Date(metric.periodStart) >= cutoffDate
    );

    const labels = [...new Set(filteredMetrics.map(m => 
      new Date(m.periodStart).toLocaleDateString()
    ))].sort();

    const datasets = filteredMetrics.reduce((acc, metric) => {
      const existingDataset = acc.find(ds => ds.label === metric.name);
      
      if (existingDataset) {
        existingDataset.data.push(metric.value);
      } else {
        acc.push({
          label: metric.name,
          data: [metric.value],
          backgroundColor: theme.palette.primary.main,
          borderColor: theme.palette.primary.dark,
          borderWidth: 2
        });
      }
      
      return acc;
    }, [] as ChartData['datasets']);

    return { labels, datasets };
  }, [metrics, selectedPeriod, theme.palette]);

  // Chart configuration
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          maxRotation: 45,
          autoSkip: true
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: theme.palette.divider
        },
        ticks: {
          callback: (value: number) => {
            if (category === MetricCategory.FINANCIAL) {
              return `$${value.toLocaleString()}`;
            }
            if (category === MetricCategory.RETENTION) {
              return `${value}%`;
            }
            return value;
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        padding: 12,
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1
      }
    }
  }), [category, theme]);

  // Handle real-time updates
  useEffect(() => {
    if (!enableRealtime) return;

    const unsubscribe = subscribeToUpdates((updatedMetric) => {
      fetchMetrics();
    });

    return () => {
      unsubscribe?.();
    };
  }, [enableRealtime, subscribeToUpdates, fetchMetrics]);

  // Handle period change
  const handlePeriodChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedPeriod(event.target.value as string);
  }, []);

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ mb: 2 }}
        role="alert"
      >
        Failed to load metric history: {error.message}
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" component="h2">
              Metric History
            </Typography>
            <FormControl variant="outlined" size="small">
              <InputLabel id="time-period-label">Time Period</InputLabel>
              <Select
                labelId="time-period-label"
                value={selectedPeriod}
                onChange={handlePeriodChange}
                label="Time Period"
                aria-label="Select time period"
              >
                {Object.entries(TIME_PERIODS).map(([key, { label }]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box
            height={400}
            position="relative"
            role="region"
            aria-label="Metric history chart"
          >
            {loading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
              >
                <CircularProgress />
              </Box>
            ) : (
              <LineChart
                data={chartData}
                options={chartOptions}
                type={ChartType.LINE}
                height={400}
                width={800}
                isLoading={loading}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
});

MetricHistory.displayName = 'MetricHistory';

export default MetricHistory;