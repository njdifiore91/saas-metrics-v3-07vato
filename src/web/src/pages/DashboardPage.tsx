import React, { useEffect, useCallback, useMemo } from 'react';
import { Grid, Box, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { useAnalytics } from '@segment/analytics-react';

// Internal imports
import Layout from '../components/common/Layout';
import RevenueOverview from '../components/dashboard/RevenueOverview';
import KeyMetrics from '../components/dashboard/KeyMetrics';
import BenchmarkComparison from '../components/dashboard/BenchmarkComparison';
import { useAuth } from '../hooks/useAuth';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Interface for component props
interface DashboardPageProps {
  featureFlags: Record<string, boolean>;
  analyticsEnabled: boolean;
}

/**
 * Main dashboard page component that displays key startup metrics, revenue overview,
 * and benchmark comparisons in a responsive layout with role-based access control.
 */
const DashboardPage: React.FC<DashboardPageProps> = React.memo(({ 
  featureFlags,
  analyticsEnabled 
}) => {
  // Hooks
  const theme = useTheme();
  const analytics = useAnalytics();
  const { user, checkPermission } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Memoized grid spacing based on screen size
  const gridSpacing = useMemo(() => ({
    spacing: isMobile ? 2 : 3,
    px: isMobile ? 2 : 3,
    py: isMobile ? 2 : 4
  }), [isMobile]);

  // Track page view
  useEffect(() => {
    if (analyticsEnabled && user) {
      analytics.page('Dashboard', {
        userId: user.id,
        role: user.role,
        timestamp: new Date().toISOString()
      });
    }
  }, [analytics, analyticsEnabled, user]);

  // Handle metric click for analytics
  const handleMetricClick = useCallback((metricId: string) => {
    if (analyticsEnabled) {
      analytics.track('Metric Clicked', {
        metricId,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [analytics, analyticsEnabled, user]);

  // Handle error reporting
  const handleError = useCallback((error: Error) => {
    console.error('Dashboard error:', error);
    if (analyticsEnabled) {
      analytics.track('Dashboard Error', {
        error: error.message,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [analytics, analyticsEnabled, user]);

  if (!user) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout>
      <Box sx={{ flexGrow: 1, ...gridSpacing }}>
        <Grid container spacing={gridSpacing.spacing}>
          {/* Revenue Overview Section */}
          <Grid item xs={12}>
            <ErrorBoundary onError={handleError}>
              <RevenueOverview
                companyId={user.companyId}
                refreshInterval={300000} // 5 minutes
              />
            </ErrorBoundary>
          </Grid>

          {/* Key Metrics Section */}
          <Grid item xs={12}>
            <ErrorBoundary onError={handleError}>
              <KeyMetrics
                companyId={user.companyId}
                onMetricClick={handleMetricClick}
              />
            </ErrorBoundary>
          </Grid>

          {/* Benchmark Comparison Section */}
          {featureFlags.enableBenchmarks && checkPermission('VIEW_BENCHMARKS') && (
            <Grid item xs={12}>
              <ErrorBoundary onError={handleError}>
                <BenchmarkComparison
                  companyMetrics={{
                    ARR: 0,
                    REVENUE_GROWTH: 0,
                    NET_DOLLAR_RETENTION: 0,
                    CAC_PAYBACK: 0
                  }}
                  telemetryEnabled={analyticsEnabled}
                  onError={handleError}
                />
              </ErrorBoundary>
            </Grid>
          )}
        </Grid>
      </Box>
    </Layout>
  );
});

// Display name for debugging
DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;