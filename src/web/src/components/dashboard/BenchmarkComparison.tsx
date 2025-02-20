import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Grid, Card, Typography, Skeleton, Box, useTheme } from '@mui/material'; // @mui/material v5.14.0
import { useQuery } from 'react-query'; // v3.39.0

// Internal imports
import BenchmarkFilterForm from '../forms/BenchmarkFilterForm';
import { BenchmarkService } from '../../services/benchmark.service';
import ErrorBoundary from '../common/ErrorBoundary';
import { Notification } from '../common/Notification';
import { NotificationType } from '../../hooks/useNotification';
import { 
  BenchmarkComparison as IBenchmarkComparison,
  BenchmarkFilter,
  BenchmarkData,
  MetricType,
  DataQuality
} from '../../types/benchmark.types';

// Constants for performance optimization
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 300;
const RETRY_ATTEMPTS = 3;

interface BenchmarkComparisonProps {
  companyMetrics: Record<MetricType, number>;
  className?: string;
  onError?: (error: Error) => void;
  telemetryEnabled?: boolean;
  cacheTimeout?: number;
}

// Custom hook for benchmark data management
const useBenchmarkData = (filter: BenchmarkFilter, options?: { enabled: boolean }) => {
  const benchmarkService = useMemo(() => BenchmarkService.getInstance(null), []);
  
  return useQuery<BenchmarkData[], Error>(
    ['benchmarks', filter],
    () => benchmarkService.getBenchmarkData(filter),
    {
      enabled: options?.enabled ?? true,
      staleTime: CACHE_TIMEOUT,
      cacheTime: CACHE_TIMEOUT,
      retry: RETRY_ATTEMPTS,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Benchmark data fetch error:', error);
      }
    }
  );
};

export const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = React.memo(({
  companyMetrics,
  className,
  onError,
  telemetryEnabled = true,
  cacheTimeout = CACHE_TIMEOUT
}) => {
  const theme = useTheme();
  const [currentFilter, setCurrentFilter] = useState<BenchmarkFilter>({
    revenue_range: { min: 0, max: 0, currency: 'USD' },
    metric_types: [],
    date_range: { start: new Date(), end: new Date() },
    industries: [],
    source_preference: [],
    exclusion_criteria: {
      outliers: false,
      incomplete_data: false,
      low_confidence_scores: false,
      minimum_sample_size: 30
    },
    time_granularity: 'QUARTERLY',
    confidence_threshold: 0.8
  });

  const [comparisons, setComparisons] = useState<IBenchmarkComparison[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const benchmarkService = useMemo(() => BenchmarkService.getInstance(null), []);

  // Fetch benchmark data using custom hook
  const { data: benchmarkData, error: benchmarkError, isLoading: isBenchmarkLoading } = 
    useBenchmarkData(currentFilter);

  // Handle filter changes with debouncing
  const handleFilterChange = useCallback(async (filter: BenchmarkFilter) => {
    try {
      setIsLoading(true);
      setCurrentFilter(filter);

      if (telemetryEnabled) {
        console.debug('Filter changed:', filter);
      }

      // Wait for benchmark data to be fetched
      if (benchmarkData) {
        const newComparisons = await Promise.all(
          Object.entries(companyMetrics).map(async ([metric, value]) => {
            const metricData = benchmarkData.filter(
              data => data.metric_id === metric
            );
            return benchmarkService.compareBenchmarks(value, metricData);
          })
        );

        setComparisons(newComparisons);
      }
    } catch (error) {
      console.error('Error processing benchmark comparison:', error);
      onError?.(error as Error);
      
      Notification.show({
        message: 'Failed to process benchmark comparison',
        type: NotificationType.ERROR,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }, [benchmarkData, benchmarkService, companyMetrics, onError, telemetryEnabled]);

  // Render loading skeleton
  const renderSkeleton = useCallback(() => (
    <Grid container spacing={3}>
      {[1, 2, 3].map((key) => (
        <Grid item xs={12} md={4} key={key}>
          <Skeleton 
            variant="rectangular" 
            height={200} 
            sx={{ borderRadius: theme.shape.borderRadius }}
          />
        </Grid>
      ))}
    </Grid>
  ), [theme.shape.borderRadius]);

  // Render comparison card
  const renderComparisonCard = useCallback((comparison: IBenchmarkComparison) => (
    <Card
      key={comparison.metric_id}
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.paper
      }}
    >
      <Typography variant="h6" gutterBottom>
        {MetricType[comparison.metric_type]}
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body1" color="textSecondary">
          Your Value: {comparison.company_value.toFixed(2)}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Benchmark: {comparison.benchmark_value.toFixed(2)}
        </Typography>
        <Typography 
          variant="body1" 
          color={comparison.variance >= 0 ? 'success.main' : 'error.main'}
        >
          Variance: {comparison.variance.toFixed(2)}%
        </Typography>
      </Box>

      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Typography variant="caption" display="block">
          Confidence Score: {(comparison.confidence_score * 100).toFixed(1)}%
        </Typography>
        <Typography variant="caption" display="block">
          Sample Size: {comparison.sample_size}
        </Typography>
      </Box>
    </Card>
  ), [theme.palette.background.paper]);

  // Effect for error handling
  useEffect(() => {
    if (benchmarkError) {
      onError?.(benchmarkError);
      Notification.show({
        message: 'Failed to fetch benchmark data',
        type: NotificationType.ERROR,
        duration: 5000
      });
    }
  }, [benchmarkError, onError]);

  return (
    <ErrorBoundary>
      <div className={className}>
        <BenchmarkFilterForm
          onSubmit={handleFilterChange}
          initialValues={currentFilter}
          isLoading={isLoading || isBenchmarkLoading}
        />

        <Box sx={{ mt: 4 }}>
          {(isLoading || isBenchmarkLoading) ? (
            renderSkeleton()
          ) : (
            <Grid container spacing={3}>
              {comparisons.map((comparison) => (
                <Grid item xs={12} md={4} key={comparison.metric_id}>
                  {renderComparisonCard(comparison)}
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </div>
    </ErrorBoundary>
  );
});

BenchmarkComparison.displayName = 'BenchmarkComparison';

export default BenchmarkComparison;