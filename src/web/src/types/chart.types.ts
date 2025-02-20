// chart.js v4.4.0 - Chart type definitions for data visualization components
import { Chart } from 'chart.js';

/**
 * Enum defining supported chart types for standardized visualization across the application
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  AREA = 'area',
  PIE = 'pie',
  SCATTER = 'scatter'
}

/**
 * Interface defining the structure of chart data with support for multiple datasets
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Interface for configuring individual chart datasets with styling options
 */
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor: string;
  borderWidth: number;
}

/**
 * Interface for comprehensive chart configuration options including responsiveness and animations
 */
export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  scales: {
    x?: {
      grid: {
        display: boolean;
        drawBorder: boolean;
      };
      ticks: {
        autoSkip: boolean;
        maxRotation: number;
      };
    };
    y?: {
      grid: {
        display: boolean;
        drawBorder: boolean;
      };
      ticks: {
        beginAtZero: boolean;
      };
    };
  };
  plugins: {
    legend: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip: {
      enabled: boolean;
      mode: 'index' | 'nearest' | 'point';
      intersect: boolean;
    };
  };
  animation: {
    duration: number;
    easing: string;
  };
}

/**
 * Interface for chart component props including dimensions and loading state
 */
export interface MetricChartProps {
  data: ChartData;
  options: ChartOptions;
  type: ChartType;
  height: number;
  width: number;
  isLoading: boolean;
}

/**
 * Type definition for chart event handlers
 */
export type ChartEventHandler = (event: MouseEvent, elements: any[]) => void;

/**
 * Interface for chart axis configuration
 */
export interface ChartAxis {
  title: {
    display: boolean;
    text: string;
  };
  min?: number;
  max?: number;
  stepSize?: number;
}

/**
 * Interface for chart legend configuration
 */
export interface ChartLegend {
  display: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  labels: {
    usePointStyle: boolean;
    padding: number;
  };
}

/**
 * Interface for chart tooltip configuration
 */
export interface ChartTooltip {
  enabled: boolean;
  mode: 'index' | 'nearest' | 'point';
  intersect: boolean;
  callbacks?: {
    label?: (context: any) => string;
    title?: (context: any[]) => string;
  };
}

/**
 * Type for chart color schemes
 */
export type ChartColorScheme = {
  backgroundColor: string[];
  borderColor: string[];
};

/**
 * Interface for chart animation configuration
 */
export interface ChartAnimation {
  duration: number;
  easing: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
  delay?: number;
}