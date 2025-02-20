import React, { useEffect, useRef, useCallback, memo } from 'react';
import { Chart } from 'chart.js/auto'; // chart.js v4.4.0
import { Box, CircularProgress, useTheme } from '@mui/material'; // @mui/material v5.14.0
import { ChartType, MetricChartProps } from '../../types/chart.types';
import { useChartData } from '../../hooks/useChartData';
import { formatChartData, getChartOptions } from '../../utils/chart.utils';

/**
 * A reusable line chart component that visualizes time-series metric data with
 * responsive design, theme support, and WCAG 2.1 Level AA compliance.
 * 
 * @component
 * @param {MetricChartProps} props - Component props including data, options, and dimensions
 * @returns {JSX.Element} Rendered line chart component with accessibility attributes
 */
const LineChart: React.FC<MetricChartProps> = memo(({
  data,
  options,
  type = ChartType.LINE,
  height,
  width,
  isLoading
}) => {
  // Refs for chart instance and canvas element
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Get theme context for color scheme
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Initialize ResizeObserver ref
  const resizeObserver = useRef<ResizeObserver | null>(null);

  /**
   * Cleanup function to destroy chart instance and disconnect resize observer
   */
  const cleanup = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    if (resizeObserver.current) {
      resizeObserver.current.disconnect();
      resizeObserver.current = null;
    }
  }, []);

  /**
   * Initialize or update chart instance with current data and options
   */
  const initializeChart = useCallback(() => {
    if (!canvasRef.current) return;

    // Format chart data with theme-aware colors
    const formattedData = formatChartData(data.datasets, type, theme.palette.mode);

    // Get chart options with responsive configuration
    const chartOptions = getChartOptions(type, theme.palette.mode, { width, height });

    // Merge with custom options
    const finalOptions = {
      ...chartOptions,
      ...options,
      plugins: {
        ...chartOptions.plugins,
        ...options?.plugins,
        // Ensure WCAG compliance for tooltips
        tooltip: {
          ...chartOptions.plugins?.tooltip,
          ...options?.plugins?.tooltip,
          titleColor: isDarkMode ? '#ffffff' : '#000000',
          backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          padding: 12,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          displayColors: true,
          intersect: false,
        }
      }
    };

    // Create new chart instance
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: formattedData,
      options: finalOptions,
    });

    // Setup keyboard navigation
    canvasRef.current.tabIndex = 0;
    canvasRef.current.setAttribute('role', 'img');
    canvasRef.current.setAttribute('aria-label', 'Line chart showing metric trends over time');
  }, [data, options, type, width, height, theme.palette.mode, isDarkMode]);

  /**
   * Handle responsive behavior with ResizeObserver
   */
  useEffect(() => {
    if (!canvasRef.current) return;

    resizeObserver.current = new ResizeObserver(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    });

    resizeObserver.current.observe(canvasRef.current);

    return () => cleanup();
  }, [cleanup]);

  /**
   * Update chart when data, options, or theme changes
   */
  useEffect(() => {
    cleanup();
    initializeChart();
  }, [cleanup, initializeChart, data, options, theme.palette.mode]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!chartRef.current) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft':
        // Navigate through data points
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const activeElements = chartRef.current.getActiveElements();
        if (activeElements.length) {
          const currentIndex = activeElements[0].index;
          const newIndex = Math.max(0, Math.min(currentIndex + direction, data.labels.length - 1));
          chartRef.current.setActiveElements([{ datasetIndex: 0, index: newIndex }]);
          chartRef.current.update();
        }
        event.preventDefault();
        break;
    }
  }, [data.labels.length]);

  // Render loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={height}
        width={width}
        role="progressbar"
        aria-label="Loading chart data"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Render chart canvas
  return (
    <Box
      width={width}
      height={height}
      position="relative"
      role="region"
      aria-label="Line chart visualization"
    >
      <canvas
        ref={canvasRef}
        onKeyDown={handleKeyDown}
        style={{ width: '100%', height: '100%' }}
        aria-label="Interactive line chart showing metric trends"
      />
    </Box>
  );
});

// Display name for debugging
LineChart.displayName = 'LineChart';

export default LineChart;