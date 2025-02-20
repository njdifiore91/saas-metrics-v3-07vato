// External imports - v18.2.0
import React, { useMemo, useCallback } from 'react';
import { 
  Grid, 
  CircularProgress, 
  Alert, 
  useTheme, 
  Card, 
  CardContent, 
  Typography, 
  Skeleton,
  Box,
  useMediaQuery
} from '@mui/material'; // v5.14.0

// Internal imports
import { useMetrics } from '../../hooks/useMetrics';
import { Metric, MetricCategory } from '../../types/metric.types';

// Constants for grid layout and loading
const GRID_SPACING = 2;
const LOADING_CARDS = 6;

interface MetricsListProps {
  companyId: string;
  selectedCategory?: MetricCategory;
  onMetricClick?: (metric: Metric) => void;
  className?: string;
  gridSpacing?: number;
}

/**
 * A responsive grid layout component for displaying company metrics
 * Implements WCAG 2.1 Level AA compliance and Material Design patterns
 */
const MetricsList: React.FC<MetricsListProps> = React.memo(({
  companyId,
  selectedCategory,
  onMetricClick,
  className,
  gridSpacing = GRID_SPACING
}) => {
  // Theme and responsive breakpoints
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Fetch metrics data with loading and error states
  const { metrics, loading, error, retryFetch } = useMetrics(companyId);

  // Filter metrics by category if selected
  const filteredMetrics = useMemo(() => {
    if (!selectedCategory) return metrics;
    return metrics.filter(metric => metric.category === selectedCategory);
  }, [metrics, selectedCategory]);

  // Calculate grid columns based on breakpoint
  const getGridColumns = useCallback(() => {
    if (isMobile) return 12; // Full width on mobile
    if (isTablet) return 6;  // Two columns on tablet
    return 4;                // Three columns on desktop
  }, [isMobile, isTablet]);

  // Handle metric card click with keyboard support
  const handleMetricClick = useCallback((metric: Metric) => (
    event: React.MouseEvent | React.KeyboardEvent
  ) => {
    if (
      event.type === 'click' || 
      (event.type === 'keydown' && (event as React.KeyboardEvent).key === 'Enter')
    ) {
      onMetricClick?.(metric);
    }
  }, [onMetricClick]);

  // Render loading skeleton
  if (loading) {
    return (
      <Grid container spacing={gridSpacing} className={className}>
        {Array.from({ length: LOADING_CARDS }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={20} />
                <Skeleton variant="rectangular" height={60} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <button onClick={retryFetch} className="retry-button">
            Retry
          </button>
        }
      >
        Failed to load metrics: {error}
      </Alert>
    );
  }

  // Render empty state
  if (!filteredMetrics.length) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="h6" color="textSecondary">
          No metrics available {selectedCategory ? `for ${selectedCategory}` : ''}
        </Typography>
      </Box>
    );
  }

  // Render metrics grid
  return (
    <Grid 
      container 
      spacing={gridSpacing} 
      className={className}
      role="list"
      aria-label="Metrics List"
    >
      {filteredMetrics.map((metric) => (
        <Grid 
          item 
          xs={12} 
          sm={6} 
          md={4} 
          key={metric.id}
          role="listitem"
        >
          <Card
            onClick={(e) => handleMetricClick(metric)(e)}
            onKeyDown={(e) => handleMetricClick(metric)(e)}
            tabIndex={0}
            role="button"
            aria-label={`${metric.name} metric details`}
            sx={{
              cursor: 'pointer',
              transition: theme.transitions.create(['transform', 'box-shadow']),
              '&:hover, &:focus': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[4]
              }
            }}
          >
            <CardContent>
              <Typography 
                variant="h6" 
                component="h3"
                gutterBottom
              >
                {metric.name}
              </Typography>
              <Typography 
                variant="body2" 
                color="textSecondary"
                gutterBottom
              >
                {metric.category}
              </Typography>
              <Typography 
                variant="h4"
                component="p"
                sx={{ mt: 2 }}
              >
                {formatMetricValue(metric.value)}
              </Typography>
              {metric.trend && (
                <Typography 
                  variant="body2"
                  color={metric.trend.direction === 'up' ? 'success.main' : 'error.main'}
                  sx={{ mt: 1 }}
                >
                  {formatTrendValue(metric.trend)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
});

// Helper function to format metric values
const formatMetricValue = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
};

// Helper function to format trend values
const formatTrendValue = (trend: { value: number; direction: 'up' | 'down' }): string => {
  const prefix = trend.direction === 'up' ? '↑' : '↓';
  return `${prefix} ${trend.value}%`;
};

// Display name for debugging
MetricsList.displayName = 'MetricsList';

export default MetricsList;