import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Grid, Typography, Alert, CircularProgress, useTheme, useMediaQuery } from '@mui/material';

// Internal imports
import BenchmarkFilterForm from '../components/forms/BenchmarkFilterForm';
import MetricComparison from '../components/metrics/MetricComparison';
import { BenchmarkService } from '../services/benchmark.service';
import { BenchmarkFilter, BenchmarkData, MetricType } from '../types/benchmark.types';

// Constants
const DEBOUNCE_DELAY = 300;
const RETRY_ATTEMPTS = 3;

/**
 * BenchmarkPage component for displaying and managing benchmark comparisons
 * Implements WCAG 2.1 Level AA compliance and optimized performance
 */
const BenchmarkPage: React.FC = React.memo(() => {
  // Theme and responsive handling
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redux state management
  const dispatch = useDispatch();
  const companyId = useSelector((state: any) => state.auth.companyId);

  // Local state management
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize benchmark service
  const benchmarkService = useMemo(() => new BenchmarkService(), []);

  // Memoized initial filter state
  const initialFilterState = useMemo(() => ({
    revenue_range: {
      min: 0,
      max: 0,
      currency: 'USD'
    },
    metric_types: [] as MetricType[],
    date_range: {
      start: new Date(),
      end: new Date()
    },
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
  }), []);

  /**
   * Handles benchmark filter submission with debouncing and error handling
   */
  const handleFilterSubmit = useCallback(async (filter: BenchmarkFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      let attempts = 0;
      let success = false;
      let data = null;

      // Implement retry mechanism
      while (attempts < RETRY_ATTEMPTS && !success) {
        try {
          data = await benchmarkService.getBenchmarkData(filter);
          success = true;
        } catch (err) {
          attempts++;
          if (attempts === RETRY_ATTEMPTS) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }

      setBenchmarkData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch benchmark data');
      console.error('Benchmark data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [benchmarkService]);

  /**
   * Handles export functionality with accessibility support
   */
  const handleExport = useCallback(async () => {
    if (!benchmarkData) return;

    try {
      const response = await benchmarkService.exportBenchmarkReport(benchmarkData);
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `benchmark-report-${new Date().toISOString()}.csv`);
      link.setAttribute('aria-label', 'Download benchmark report CSV');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to export benchmark data');
      console.error('Export error:', err);
    }
  }, [benchmarkData, benchmarkService]);

  // Effect for keyboard navigation setup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Clear any active tooltips or popovers
        document.body.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Box
      component="main"
      role="main"
      aria-label="Benchmark comparison page"
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: '100%',
        margin: '0 auto'
      }}
    >
      {/* Page Header */}
      <Typography
        variant="h1"
        component="h1"
        sx={{
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
          mb: 4,
          fontWeight: 600
        }}
      >
        Benchmark Analysis
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          role="alert"
        >
          {error}
        </Alert>
      )}

      {/* Filter Form */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <BenchmarkFilterForm
            onSubmit={handleFilterSubmit}
            initialValues={initialFilterState}
            isLoading={isLoading}
          />
        </Grid>

        {/* Loading State */}
        {isLoading && (
          <Grid item xs={12} display="flex" justifyContent="center" p={4}>
            <CircularProgress
              aria-label="Loading benchmark data"
              role="progressbar"
            />
          </Grid>
        )}

        {/* Benchmark Comparison */}
        {!isLoading && benchmarkData && (
          <Grid item xs={12}>
            <MetricComparison
              companyId={companyId}
              benchmarkData={benchmarkData}
              onExport={handleExport}
            />
          </Grid>
        )}

        {/* Empty State */}
        {!isLoading && !benchmarkData && !error && (
          <Grid item xs={12}>
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
              sx={{ py: 4 }}
            >
              Select filters above to view benchmark comparisons
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
});

// Display name for debugging
BenchmarkPage.displayName = 'BenchmarkPage';

export default BenchmarkPage;