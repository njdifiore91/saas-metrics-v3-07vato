import React, { useMemo, useCallback } from 'react';
import { Grid, Typography, Skeleton } from '@mui/material'; // @mui/material v5.14.0
import Card from '../common/Card';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricCategory, MetricDataType } from '../../types/metric.types';

// Props interface for the KeyMetrics component
interface KeyMetricsProps {
  companyId: string;
  isLoading?: boolean;
  onMetricClick?: (metricId: string) => void;
}

// Interface for metric card display data
interface MetricCardData {
  id: string;
  title: string;
  value: number | null;
  unit: string;
  isPositiveTrend: boolean;
  trendPercentage: string;
  ariaLabel: string;
}

/**
 * Formats metric values with appropriate units and precision
 * @param value - The numeric value to format
 * @param metricType - The type of metric for formatting rules
 * @returns Formatted string with appropriate unit and precision
 */
const formatMetricValue = (value: number | null, metricType: MetricDataType): string => {
  if (value === null || isNaN(value)) return 'N/A';

  switch (metricType) {
    case MetricDataType.PERCENTAGE:
      return `${value.toFixed(1)}%`;
    case MetricDataType.CURRENCY:
      return `$${value.toLocaleString()}`;
    case MetricDataType.RATIO:
      return value.toFixed(2);
    case MetricDataType.MONTHS:
      return `${value.toFixed(1)} mo`;
    default:
      return value.toFixed(2);
  }
};

/**
 * KeyMetrics component displays critical business metrics in a responsive grid
 * Implements real-time updates and accessibility features
 */
const KeyMetrics: React.FC<KeyMetricsProps> = React.memo(({ 
  companyId, 
  isLoading = false, 
  onMetricClick 
}) => {
  // Initialize metrics hook with auto-refresh
  const { 
    metrics, 
    loading: metricsLoading, 
    calculateMetric 
  } = useMetrics(companyId, {
    category: MetricCategory.FINANCIAL,
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  });

  // Calculate and memoize metric values
  const metricCards = useMemo((): MetricCardData[] => {
    if (!metrics || metricsLoading) return [];

    return [
      {
        id: 'ndr',
        title: 'Net Dollar Retention',
        value: calculateMetric({
          startingARR: metrics.startingARR,
          expansions: metrics.expansions,
          contractions: metrics.contractions,
          churn: metrics.churn
        }, 'NDR'),
        unit: '%',
        isPositiveTrend: (metrics.ndr || 0) > 100,
        trendPercentage: `${((metrics.ndr || 0) - 100).toFixed(1)}%`,
        ariaLabel: 'Net Dollar Retention rate'
      },
      {
        id: 'magicNumber',
        title: 'Magic Number',
        value: calculateMetric({
          netNewARR: metrics.netNewARR,
          previousQuarterSMSpend: metrics.previousQuarterSMSpend
        }, 'MAGIC_NUMBER'),
        unit: 'x',
        isPositiveTrend: (metrics.magicNumber || 0) > 0.75,
        trendPercentage: `${((metrics.magicNumber || 0) * 100).toFixed(1)}%`,
        ariaLabel: 'Sales efficiency magic number'
      },
      {
        id: 'cacPayback',
        title: 'CAC Payback',
        value: calculateMetric({
          cac: metrics.cac,
          arpa: metrics.arpa,
          grossMargin: metrics.grossMargin
        }, 'CAC_PAYBACK'),
        unit: 'months',
        isPositiveTrend: (metrics.cacPayback || 0) < 12,
        trendPercentage: `${((12 - (metrics.cacPayback || 0)) / 12 * 100).toFixed(1)}%`,
        ariaLabel: 'Customer acquisition cost payback period'
      },
      {
        id: 'pipelineCoverage',
        title: 'Pipeline Coverage',
        value: calculateMetric({
          pipelineValue: metrics.pipelineValue,
          revenueTarget: metrics.revenueTarget
        }, 'PIPELINE_COVERAGE'),
        unit: 'x',
        isPositiveTrend: (metrics.pipelineCoverage || 0) > 3,
        trendPercentage: `${((metrics.pipelineCoverage || 0) / 3 * 100).toFixed(1)}%`,
        ariaLabel: 'Sales pipeline coverage ratio'
      }
    ];
  }, [metrics, metricsLoading, calculateMetric]);

  // Handle metric card click
  const handleMetricClick = useCallback((metricId: string) => {
    if (onMetricClick) {
      onMetricClick(metricId);
    }
  }, [onMetricClick]);

  // Render loading skeleton if data is loading
  if (isLoading || metricsLoading) {
    return (
      <Grid container spacing={3}>
        {[...Array(4)].map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={`skeleton-${index}`}>
            <Card>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="80%" height={36} />
              <Skeleton variant="text" width="40%" height={20} />
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {metricCards.map((metric) => (
        <Grid item xs={12} sm={6} md={3} key={metric.id}>
          <Card
            interactive={Boolean(onMetricClick)}
            onClick={() => handleMetricClick(metric.id)}
            aria-label={metric.ariaLabel}
          >
            <Typography variant="subtitle2" color="textSecondary">
              {metric.title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ my: 1 }}>
              {formatMetricValue(metric.value, MetricDataType.NUMBER)}
              <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
                {metric.unit}
              </Typography>
            </Typography>
            <Typography
              variant="body2"
              color={metric.isPositiveTrend ? 'success.main' : 'error.main'}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              {metric.isPositiveTrend ? '↑' : '↓'} {metric.trendPercentage}
            </Typography>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
});

// Display name for debugging
KeyMetrics.displayName = 'KeyMetrics';

export default KeyMetrics;