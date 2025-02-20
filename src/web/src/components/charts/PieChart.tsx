import React, { useRef, useEffect, useCallback } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'; // chart.js v4.4.0
import { ErrorBoundary } from 'react-error-boundary'; // react-error-boundary v4.0.11
import { MetricChartProps } from '../../types/chart.types';
import { getChartOptions } from '../../utils/chart.utils';
import { useTheme } from '../../hooks/useTheme';

// Register required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Custom hook for managing Chart.js instance lifecycle and optimizations
 */
const useChartEffect = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  data: MetricChartProps['data'],
  options: MetricChartProps['options'],
  theme: ReturnType<typeof useTheme>['theme']
) => {
  // Chart instance ref
  const chartInstance = useRef<ChartJS | null>(null);
  
  // Resize observer ref
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // Memoized chart update handler
  const updateChart = useCallback(() => {
    if (!canvasRef.current || !data) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Apply theme-specific styling
    const themeOptions = getChartOptions('pie', theme.palette.mode, {
      width: canvasRef.current.width,
      height: canvasRef.current.height
    });

    // Destroy existing chart instance if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart instance with merged options
    chartInstance.current = new ChartJS(ctx, {
      type: 'pie',
      data,
      options: {
        ...themeOptions,
        ...options,
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }, [data, options, theme.palette.mode]);

  // Handle canvas resize with debouncing
  const handleResize = useCallback(() => {
    if (!chartInstance.current) return;
    
    const resize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    // Debounce resize operations
    let timeoutId: NodeJS.Timeout;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(resize, 100);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize resize observer
    resizeObserver.current = new ResizeObserver(handleResize);
    resizeObserver.current.observe(canvasRef.current);

    // Initial chart render
    updateChart();

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
      }
    };
  }, [updateChart, handleResize]);

  // Update chart when data, options, or theme changes
  useEffect(() => {
    updateChart();
  }, [data, options, theme.palette.mode, updateChart]);
};

/**
 * Error Fallback component for graceful error handling
 */
const ChartErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" style={{ textAlign: 'center', padding: '20px' }}>
    <p>Error loading chart:</p>
    <pre style={{ color: 'red' }}>{error.message}</pre>
  </div>
);

/**
 * PieChart Component - A production-ready pie chart with accessibility and performance optimizations
 */
export const PieChart: React.FC<MetricChartProps> = ({
  data,
  options,
  height = 400,
  width = 400,
  isLoading = false,
  accessibility = {
    ariaLabel: 'Pie Chart',
    description: 'Visualization of data distribution'
  }
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  // Use custom hook for chart lifecycle management
  useChartEffect(canvasRef, data, options, theme);

  // Loading state
  if (isLoading) {
    return (
      <div
        role="progressbar"
        aria-label="Loading chart"
        style={{
          height,
          width,
          backgroundColor: theme.palette.action.hover,
          borderRadius: '4px'
        }}
      />
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ChartErrorFallback}>
      <div
        style={{
          position: 'relative',
          height,
          width,
          margin: 'auto'
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={accessibility.ariaLabel}
          style={{
            display: 'block',
            boxSizing: 'border-box',
            height: '100%',
            width: '100%'
          }}
        >
          {/* Fallback content for accessibility */}
          <p>{accessibility.description}</p>
          {data.labels.map((label, index) => (
            <p key={label}>
              {label}: {data.datasets[0].data[index]}
            </p>
          ))}
        </canvas>
      </div>
    </ErrorBoundary>
  );
};

export default PieChart;