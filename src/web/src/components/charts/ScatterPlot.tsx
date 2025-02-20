import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Chart as ChartJS, ScatterController, LinearScale, PointElement, Tooltip, Legend } from 'chart.js'; // chart.js v4.4.0
import { Scatter } from 'react-chartjs-2'; // react-chartjs-2 v5.2.0
import { MetricChartProps, ChartOptions } from '../../types/chart.types';
import { getChartOptions } from '../../utils/chart.utils';
import { chartConfig } from '../../config/chart.config';

// Register required Chart.js components
ChartJS.register(ScatterController, LinearScale, PointElement, Tooltip, Legend);

/**
 * Interface for scatter plot specific props extending base metric chart props
 */
interface ScatterPlotProps extends Omit<MetricChartProps, 'type'> {
  theme?: 'light' | 'dark';
  height?: number;
  width?: number;
  isLoading?: boolean;
  onError?: (error: Error) => void;
  exportOptions?: {
    fileName?: string;
    backgroundColor?: string;
    quality?: number;
  };
}

/**
 * Custom hook for generating scatter plot specific options with theme support
 */
const useScatterOptions = (theme: string = 'light', customOptions?: ChartOptions) => {
  return useMemo(() => {
    const baseOptions = getChartOptions('scatter', theme as 'light' | 'dark', {
      width: window.innerWidth,
      height: window.innerHeight
    });

    const scatterSpecificOptions: ChartOptions = {
      ...baseOptions,
      scales: {
        x: {
          ...baseOptions.scales.x,
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'X Axis'
          }
        },
        y: {
          ...baseOptions.scales.y,
          type: 'linear',
          title: {
            display: true,
            text: 'Y Axis'
          }
        }
      },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            label: (context: any) => {
              const point = context.raw;
              return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        intersect: true,
        axis: 'xy'
      }
    };

    return {
      ...scatterSpecificOptions,
      ...customOptions
    };
  }, [theme, customOptions]);
};

/**
 * ScatterPlot Component
 * A reusable scatter plot visualization component with theme support and accessibility features
 */
const ScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  options,
  theme = 'light',
  height = 400,
  width = 600,
  isLoading = false,
  onError,
  exportOptions
}) => {
  const chartRef = useRef<ChartJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mergedOptions = useScatterOptions(theme, options);

  // Handle chart instance reference
  const handleChartRef = useCallback((chart: ChartJS | null) => {
    chartRef.current = chart;
  }, []);

  // Export chart functionality
  const exportChart = useCallback(() => {
    if (chartRef.current && exportOptions) {
      try {
        const canvas = chartRef.current.canvas;
        const image = canvas.toDataURL('image/png', exportOptions.quality || 1.0);
        const link = document.createElement('a');
        link.download = exportOptions.fileName || 'scatter-plot.png';
        link.href = image;
        link.click();
      } catch (error) {
        onError?.(error as Error);
      }
    }
  }, [exportOptions, onError]);

  // Handle resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Error boundary handler
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      onError?.(error.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  if (isLoading) {
    return (
      <div
        role="progressbar"
        aria-busy="true"
        aria-label="Loading scatter plot"
        style={{
          height,
          width,
          backgroundColor: theme === 'light' ? '#f5f5f5' : '#424242'
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width }}
      role="region"
      aria-label="Scatter plot visualization"
    >
      <Scatter
        ref={handleChartRef}
        data={data}
        options={mergedOptions}
        plugins={[
          {
            id: 'accessibility',
            beforeDraw: (chart) => {
              const ctx = chart.ctx;
              ctx.save();
              ctx.canvas.setAttribute('role', 'img');
              ctx.canvas.setAttribute('aria-label', 'Scatter plot visualization of metric data');
              ctx.restore();
            }
          }
        ]}
      />
      {exportOptions && (
        <button
          onClick={exportChart}
          aria-label="Export scatter plot"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '4px 8px',
            backgroundColor: theme === 'light' ? '#1976d2' : '#90caf9',
            color: theme === 'light' ? '#ffffff' : '#000000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Export
        </button>
      )}
    </div>
  );
};

export default ScatterPlot;