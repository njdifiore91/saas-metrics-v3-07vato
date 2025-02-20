import React, { useEffect, useMemo, useCallback } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, useTheme, useMediaQuery } from '@mui/material'; // @mui/material v5.14.0
import Big from 'big.js'; // big.js v6.2.1

// Internal imports
import LineChart from '../charts/LineChart';
import { useMetrics } from '../../hooks/useMetrics';
import ErrorBoundary from '../common/ErrorBoundary';
import { ChartType } from '../../types/chart.types';
import { MetricCategory, MetricDataType } from '../../types/metric.types';

interface RevenueOverviewProps {
  companyId: string;
  refreshInterval?: number;
}

/**
 * RevenueOverview component displays key revenue metrics with real-time updates
 * and responsive visualization.
 * 
 * @param {RevenueOverviewProps} props - Component properties
 * @returns {JSX.Element} Revenue overview dashboard component
 */
const RevenueOverview: React.FC<RevenueOverviewProps> = React.memo(({ 
  companyId, 
  refreshInterval = 300000 // 5 minutes default
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Initialize metrics hook with auto-refresh
  const {
    metrics,
    loading,
    error,
    fetchMetrics,
    calculateMetric
  } = useMetrics(companyId, {
    category: MetricCategory.REVENUE,
    autoRefresh: true,
    refreshInterval,
    skipCache: false
  });

  // Calculate revenue metrics with memoization
  const revenueMetrics = useMemo(() => {
    if (!metrics?.length) return null;

    try {
      const currentARR = metrics
        .filter(m => m.dataType === MetricDataType.CURRENCY)
        .reduce((acc, m) => new Big(acc).plus(m.value), new Big(0));

      const previousYearARR = metrics
        .filter(m => {
          const date = new Date(m.periodStart);
          return date.getFullYear() === new Date().getFullYear() - 1;
        })
        .reduce((acc, m) => new Big(acc).plus(m.value), new Big(0));

      const yoyGrowth = previousYearARR.gt(0) 
        ? currentARR.div(previousYearARR).minus(1).times(100)
        : new Big(0);

      return {
        arr: currentARR.toFixed(2),
        growth: yoyGrowth.toFixed(1),
        trending: yoyGrowth.gt(0)
      };
    } catch (error) {
      console.error('Error calculating revenue metrics:', error);
      return null;
    }
  }, [metrics]);

  // Format chart data with proper scaling
  const chartData = useMemo(() => {
    if (!metrics?.length) return null;

    const sortedMetrics = [...metrics].sort(
      (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
    );

    return {
      labels: sortedMetrics.map(m => {
        const date = new Date(m.periodStart);
        return isMobile 
          ? date.toLocaleDateString(undefined, { month: 'short' })
          : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      }),
      datasets: [{
        label: 'Annual Recurring Revenue',
        data: sortedMetrics.map(m => Number(m.value)),
        backgroundColor: theme.palette.primary.main,
        borderColor: theme.palette.primary.main,
        borderWidth: 2
      }]
    };
  }, [metrics, isMobile, theme.palette.primary.main]);

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
          maxRotation: isMobile ? 45 : 0,
          autoSkip: true,
          font: {
            size: isMobile ? 10 : 12
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false,
          color: theme.palette.divider
        },
        ticks: {
          callback: (value: number) => `$${value.toLocaleString()}`,
          font: {
            size: isMobile ? 10 : 12
          }
        }
      }
    },
    plugins: {
      legend: {
        display: !isMobile,
        position: 'top' as const,
        align: 'start' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `ARR: $${value.toLocaleString()}`;
          }
        }
      }
    }
  }), [isMobile, theme.palette.divider]);

  // Error handling with retry mechanism
  const handleRetry = useCallback(() => {
    fetchMetrics(true);
  }, [fetchMetrics]);

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error" gutterBottom>
            Failed to load revenue metrics
          </Typography>
          <button onClick={handleRetry}>
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <Card>
        <CardContent>
          {loading && !metrics?.length ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" mb={3}>
                <Box flex={1}>
                  <Typography variant="h6" gutterBottom>
                    Annual Recurring Revenue
                  </Typography>
                  <Typography variant="h4" color="primary">
                    ${revenueMetrics?.arr ? Number(revenueMetrics.arr).toLocaleString() : '0'}
                  </Typography>
                </Box>
                <Box flex={1} textAlign={isMobile ? 'left' : 'right'} mt={isMobile ? 2 : 0}>
                  <Typography variant="h6" gutterBottom>
                    YoY Growth
                  </Typography>
                  <Typography 
                    variant="h4" 
                    color={revenueMetrics?.trending ? 'success.main' : 'error.main'}
                  >
                    {revenueMetrics?.growth}%
                  </Typography>
                </Box>
              </Box>

              <Box height={isMobile ? 200 : 300}>
                {chartData && (
                  <LineChart
                    data={chartData}
                    options={chartOptions}
                    type={ChartType.LINE}
                    height={isMobile ? 200 : 300}
                    width="100%"
                    isLoading={loading}
                  />
                )}
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
});

RevenueOverview.displayName = 'RevenueOverview';

export default RevenueOverview;