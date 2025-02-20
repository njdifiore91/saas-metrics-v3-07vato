import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'; // chart.js v4.4.0
import { Bar } from '@chartjs/react-chartjs-2'; // @chartjs/react-chartjs-2 v5.2.0
import { MetricChartProps } from '../../types/chart.types';
import { getChartOptions } from '../../utils/chart.utils';
import { useTheme } from '../../hooks/useTheme';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * A reusable bar chart component with theme support, accessibility features,
 * and optimized performance for metric visualization.
 */
const BarChart: React.FC<MetricChartProps> = ({
  data,
  options,
  height,
  width,
  isLoading
}) => {
  // Refs
  const chartRef = useRef<ChartJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { theme, isDarkMode } = useTheme();

  // Memoized chart options with theme support
  const chartOptions = useMemo(() => {
    const containerDimensions = {
      width: width || containerRef.current?.clientWidth || 300,
      height: height || containerRef.current?.clientHeight || 200
    };

    return getChartOptions('bar', isDarkMode ? 'dark' : 'light', containerDimensions);
  }, [width, height, isDarkMode]);

  // Merge custom options with default theme options
  const finalOptions = useMemo(() => ({
    ...chartOptions,
    ...options,
    plugins: {
      ...chartOptions.plugins,
      ...options?.plugins,
    }
  }), [chartOptions, options]);

  // Chart instance callback
  const getChartInstance = useCallback((chart: ChartJS | null) => {
    chartRef.current = chart;
  }, []);

  // Effect for handling resize events
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect for updating chart on theme changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [theme]);

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          width: width || '100%',
          height: height || 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.background.paper
        }}
        role="progressbar"
        aria-busy="true"
        aria-label="Loading chart data"
      >
        <span>Loading chart...</span>
      </div>
    );
  }

  // Error state for invalid data
  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <div
        style={{
          width: width || '100%',
          height: height || 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.error.main
        }}
        role="alert"
      >
        No data available for visualization
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: width || '100%',
        height: height || 200,
        position: 'relative'
      }}
    >
      <Bar
        data={data}
        options={finalOptions}
        plugins={[
          {
            id: 'chartAccessibility',
            beforeDraw: (chart) => {
              const ctx = chart.ctx;
              ctx.save();
              ctx.fillStyle = theme.palette.background.paper;
              ctx.fillRect(0, 0, chart.width, chart.height);
              ctx.restore();
            }
          }
        ]}
        ref={getChartInstance}
        aria-label={`Bar chart ${data.datasets[0]?.label || ''}`}
        role="img"
      />
    </div>
  );
};

// Performance optimization
export default React.memo(BarChart);