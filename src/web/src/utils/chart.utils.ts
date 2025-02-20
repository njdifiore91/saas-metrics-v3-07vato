import { Chart } from 'chart.js'; // chart.js v4.4.0
import { 
  ChartType, 
  ChartData, 
  ChartDataset, 
  ChartOptions,
  ChartColorScheme
} from '../types/chart.types';
import { chartConfig } from '../config/chart.config';

/**
 * Formats raw metric data into Chart.js compatible data structure
 * @param rawData Array of metric data points
 * @param chartType Type of chart to be rendered
 * @param theme Current theme ('light' or 'dark')
 * @returns Formatted ChartData object
 */
export const formatChartData = (
  rawData: Array<{ period: string; value: number; label: string }>,
  chartType: ChartType,
  theme: 'light' | 'dark'
): ChartData => {
  if (!Array.isArray(rawData) || !rawData.length) {
    throw new Error('Invalid or empty data array provided');
  }

  // Extract unique labels and periods
  const labels = [...new Set(rawData.map(item => item.period))].sort();
  const uniqueDataLabels = [...new Set(rawData.map(item => item.label))];

  // Generate color scheme
  const colors = generateChartColors(uniqueDataLabels.length, theme, false);

  // Create datasets
  const datasets: ChartDataset[] = uniqueDataLabels.map((dataLabel, index) => {
    const dataPoints = labels.map(period => {
      const point = rawData.find(item => item.period === period && item.label === dataLabel);
      return point ? point.value : 0;
    });

    return {
      label: dataLabel,
      data: dataPoints,
      backgroundColor: chartType === ChartType.PIE ? colors.backgroundColor : colors.backgroundColor[index],
      borderColor: colors.borderColor[index],
      borderWidth: 2,
      ...chartConfig.chartTypeConfig[chartType]
    };
  });

  return { labels, datasets };
};

/**
 * Generates chart options with responsive behavior and theme support
 * @param chartType Type of chart to be rendered
 * @param theme Current theme ('light' or 'dark')
 * @param containerDimensions Container dimensions object
 * @returns ChartOptions object
 */
export const getChartOptions = (
  chartType: ChartType,
  theme: 'light' | 'dark',
  containerDimensions: { width: number; height: number }
): ChartOptions => {
  const baseOptions = { ...chartConfig.defaultOptions };
  const { width } = containerDimensions;

  // Adjust options based on container width
  if (width <= chartConfig.dimensions.breakpoints.sm) {
    baseOptions.plugins.legend.display = false;
    baseOptions.scales.x!.ticks.maxRotation = 90;
  } else if (width <= chartConfig.dimensions.breakpoints.md) {
    baseOptions.plugins.legend.position = 'bottom';
    baseOptions.scales.x!.ticks.maxRotation = 45;
  }

  // Apply theme-specific colors
  const themeColors = chartConfig.colors[theme];
  baseOptions.plugins.tooltip!.backgroundColor = theme === 'light' 
    ? 'rgba(33, 33, 33, 0.95)' 
    : 'rgba(255, 255, 255, 0.95)';
  baseOptions.plugins.tooltip!.titleColor = theme === 'light' 
    ? '#ffffff' 
    : '#000000';

  // Chart type specific adjustments
  if (chartType === ChartType.PIE) {
    delete baseOptions.scales;
  }

  return baseOptions;
};

/**
 * Calculates optimal chart dimensions based on container and type
 * @param containerWidth Container width
 * @param containerHeight Container height
 * @param chartType Type of chart
 * @returns Optimized dimensions object
 */
export const calculateChartDimensions = (
  containerWidth: number,
  containerHeight: number,
  chartType: ChartType
): { width: number; height: number; padding: typeof chartConfig.dimensions.padding } => {
  const { minWidth, minHeight, aspectRatio, padding } = chartConfig.dimensions;

  // Calculate base dimensions
  let width = Math.max(minWidth, containerWidth - padding.left - padding.right);
  let height = Math.max(minHeight, containerHeight - padding.top - padding.bottom);

  // Adjust for chart type
  if (chartType === ChartType.PIE) {
    height = width / aspectRatio;
  } else {
    // Maintain aspect ratio for other chart types
    height = width / aspectRatio;
    if (height > containerHeight) {
      height = containerHeight - padding.top - padding.bottom;
      width = height * aspectRatio;
    }
  }

  return {
    width: Math.floor(width),
    height: Math.floor(height),
    padding
  };
};

/**
 * Generates accessible color palettes with theme support
 * @param dataLength Number of colors needed
 * @param theme Current theme ('light' or 'dark')
 * @param requireHighContrast Whether to enforce high contrast
 * @returns Color scheme object with background and border colors
 */
export const generateChartColors = (
  dataLength: number,
  theme: 'light' | 'dark',
  requireHighContrast: boolean
): ChartColorScheme => {
  const themeColors = chartConfig.colors[theme];
  const colorKeys = ['primary', 'success', 'warning', 'error', 'neutral'];
  
  const generateColorArrays = () => {
    const backgrounds: string[] = [];
    const borders: string[] = [];
    
    for (let i = 0; i < dataLength; i++) {
      const colorKey = colorKeys[i % colorKeys.length];
      const colorSet = themeColors[colorKey];
      
      if (requireHighContrast) {
        backgrounds.push(colorSet.base);
        borders.push(colorSet.variants[0]);
      } else {
        const variantIndex = i % colorSet.variants.length;
        backgrounds.push(colorSet.variants[variantIndex]);
        borders.push(colorSet.base);
      }
    }
    
    return { backgrounds, borders };
  };

  const { backgrounds, borders } = generateColorArrays();

  return {
    backgroundColor: backgrounds,
    borderColor: borders
  };
};