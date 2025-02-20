import React, { useRef, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'; // chart.js v4.4.0
import { Line } from 'react-chartjs-2'; // react-chartjs-2 v5.2.0
import { MetricChartProps } from '../../types/chart.types';
import { formatChartData, getChartOptions, generateChartColors } from '../../utils/chart.utils';
import { useTheme } from '../../hooks/useTheme';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Enhanced Area Chart component with theme support and accessibility features
 */
const AreaChart: React.FC<MetricChartProps> = React.memo(({
  data,
  options,
  height,
  width,
  isLoading
}) => {
  // Refs and hooks
  const chartRef = useRef<ChartJS>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, isDarkMode } = useTheme();

  // Generate theme-aware area chart configuration
  const chartConfig = useMemo(() => {
    const baseOptions = getChartOptions('area', isDarkMode ? 'dark' : 'light', { width, height });
    const themeColors = generateChartColors(data.datasets.length, isDarkMode ? 'dark' : 'light', true);

    // Area-specific options
    const areaOptions = {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          intersect: false,
          mode: 'index' as const,
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales.y,
          beginAtZero: true,
          grid: {
            color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            drawBorder: false
          }
        }
      }
    };

    // Apply area fill styles to datasets
    const enhancedData = {
      ...data,
      datasets: data.datasets.map((dataset, index) => ({
        ...dataset,
        fill: true,
        backgroundColor: `rgba(${themeColors.backgroundColor[index]}, 0.2)`,
        borderColor: themeColors.borderColor[index],
        pointBackgroundColor: themeColors.borderColor[index],
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      }))
    };

    return { options: areaOptions, data: enhancedData };
  }, [data, width, height, isDarkMode]);

  // Handle responsive resizing
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    });

    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Set up accessibility attributes
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.setAttribute('role', 'img');
      canvasRef.current.setAttribute('aria-label', 'Area chart showing metric trends over time');
    }
  }, []);

  // Loading state handler
  if (isLoading) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div role="status" aria-label="Loading chart data">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        position: 'relative'
      }}
    >
      <Line
        ref={chartRef}
        data={chartConfig.data}
        options={chartConfig.options}
        height={height}
        width={width}
        aria-label="Area chart visualization"
        role="graphics-document"
      />
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
});

// Display name for debugging
AreaChart.displayName = 'AreaChart';

export default AreaChart;