import { useState, useEffect, useMemo, useCallback } from 'react'; // react v18.2.0
import { useTheme, useMediaQuery } from '@mui/material'; // @mui/material v5.14.0
import {
  formatChartData,
  getChartOptions,
  calculateChartDimensions,
  generateChartColors,
  validateChartData
} from '../utils/chart.utils';
import {
  ChartType,
  ChartData,
  ChartOptions,
  ChartError
} from '../types/chart.types';

/**
 * Custom hook for managing chart data transformations, configurations, and responsive behavior
 * with comprehensive error handling and accessibility support.
 * 
 * @param rawData Array of metric data points to be visualized
 * @param chartType Type of chart to be rendered (line, bar, area, pie, scatter)
 * @param options Optional chart configuration overrides
 * @returns Object containing formatted chart data, options, dimensions, loading and error states
 */
export const useChartData = (
  rawData: Array<{ period: string; value: number; label: string }>,
  chartType: ChartType,
  options?: Partial<ChartOptions>
) => {
  // State management
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ChartError | null>(null);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Theme and responsive handling
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Calculate container dimensions based on breakpoints and container size
  const dimensions = useMemo(() => {
    if (!containerRef) {
      return { width: 0, height: 0 };
    }

    const { width, height } = containerRef.getBoundingClientRect();
    return calculateChartDimensions(
      width,
      height,
      chartType
    );
  }, [containerRef, chartType]);

  // Format chart data with error handling
  const chartData = useMemo(() => {
    try {
      if (!rawData || !rawData.length) {
        throw new ChartError('No data provided for visualization');
      }

      // Validate data structure
      validateChartData(rawData);

      // Generate theme-aware colors
      const colorScheme = generateChartColors(
        new Set(rawData.map(item => item.label)).size,
        theme.palette.mode,
        theme.palette.contrastThreshold >= 4.5
      );

      // Format data for Chart.js
      return formatChartData(
        rawData,
        chartType,
        theme.palette.mode
      );
    } catch (err) {
      setError(err instanceof ChartError ? err : new ChartError('Error formatting chart data'));
      return null;
    }
  }, [rawData, chartType, theme.palette.mode]);

  // Generate chart options with responsive behavior
  const chartOptions = useMemo(() => {
    if (!dimensions.width || !dimensions.height) {
      return null;
    }

    const baseOptions = getChartOptions(
      chartType,
      theme.palette.mode,
      dimensions
    );

    // Apply responsive adjustments
    const responsiveOptions = {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins.legend,
          display: !isMobile,
          position: isTablet ? 'bottom' : 'right'
        }
      }
    };

    // Merge with custom options
    return {
      ...responsiveOptions,
      ...options
    };
  }, [dimensions, chartType, theme.palette.mode, isMobile, isTablet, options]);

  // Handle container ref callback
  const containerCallback = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setContainerRef(node);
    }
  }, []);

  // Effect for data processing and error handling
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    try {
      if (!chartData || !chartOptions) {
        throw new ChartError('Unable to initialize chart configuration');
      }

      // Validate chart options for accessibility
      if (theme.palette.contrastThreshold < 4.5) {
        console.warn('Chart colors may not meet WCAG contrast requirements');
      }
    } catch (err) {
      setError(err instanceof ChartError ? err : new ChartError('Chart initialization error'));
    } finally {
      setIsLoading(false);
    }
  }, [chartData, chartOptions, theme.palette.contrastThreshold]);

  return {
    chartData,
    chartOptions,
    dimensions,
    isLoading,
    error,
    containerRef: containerCallback
  };
};

export type UseChartDataReturn = ReturnType<typeof useChartData>;