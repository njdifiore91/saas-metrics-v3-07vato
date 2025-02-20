import { format as dateFnsFormat } from 'date-fns';
import { MetricDataType } from '../types/metric.types';
import { ChartData, ChartColorScheme } from '../types/chart.types';

// Default formatting configuration
const DEFAULT_PRECISION = 2;
const CURRENCY_LOCALE = 'en-US';
const DATE_FORMAT = 'yyyy-MM-dd';

// Cache for number formatters to improve performance
const NUMBER_FORMATTERS: Record<string, Intl.NumberFormat> = {};

// High contrast color schemes for accessibility
const HIGH_CONTRAST_COLORS: ChartColorScheme = {
  backgroundColor: ['#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600'],
  borderColor: ['#002b3f', '#3d3762', '#833864', '#b34544', '#b37500']
};

/**
 * Gets or creates a cached number formatter instance
 * @param type Formatter type ('currency', 'percent', 'decimal')
 * @param precision Decimal precision
 * @returns Intl.NumberFormat instance
 */
const getNumberFormatter = (
  type: 'currency' | 'percent' | 'decimal',
  precision: number
): Intl.NumberFormat => {
  const key = `${type}-${precision}`;
  if (!NUMBER_FORMATTERS[key]) {
    NUMBER_FORMATTERS[key] = new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: type === 'decimal' ? 'decimal' : type,
      currency: type === 'currency' ? 'USD' : undefined,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  }
  return NUMBER_FORMATTERS[key];
};

/**
 * Formats a metric value based on its data type with accessibility support
 * @param value Numeric value to format
 * @param dataType MetricDataType enum value
 * @param precision Optional decimal precision (defaults to 2)
 * @returns Formatted string with ARIA attributes
 */
export const formatMetricValue = (
  value: number,
  dataType: MetricDataType,
  precision: number = DEFAULT_PRECISION
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  let formattedValue: string;
  let ariaLabel: string;

  switch (dataType) {
    case MetricDataType.CURRENCY:
      formattedValue = formatCurrency(value, precision);
      ariaLabel = `Currency value: ${formattedValue}`;
      break;

    case MetricDataType.PERCENTAGE:
      formattedValue = formatPercentage(value, precision);
      ariaLabel = `Percentage value: ${formattedValue}`;
      break;

    case MetricDataType.RATIO:
      formattedValue = `${getNumberFormatter('decimal', precision).format(value)}x`;
      ariaLabel = `Ratio value: ${formattedValue}`;
      break;

    case MetricDataType.MONTHS:
      formattedValue = `${Math.round(value)} months`;
      ariaLabel = `Duration: ${formattedValue}`;
      break;

    case MetricDataType.NUMBER:
    default:
      formattedValue = getNumberFormatter('decimal', precision).format(value);
      ariaLabel = `Numeric value: ${formattedValue}`;
  }

  return `<span aria-label="${ariaLabel}">${formattedValue}</span>`;
};

/**
 * Formats a number as currency with locale support
 * @param value Numeric value to format as currency
 * @param precision Optional decimal precision (defaults to 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  precision: number = DEFAULT_PRECISION
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  // Handle large numbers with K/M/B suffixes
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(precision)}B`;
  } else if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(precision)}M`;
  } else if (Math.abs(value) >= 1e3) {
    return `$${(value / 1e3).toFixed(precision)}K`;
  }

  return getNumberFormatter('currency', precision).format(value);
};

/**
 * Formats a number as percentage with validation
 * @param value Numeric value to format as percentage
 * @param precision Optional decimal precision (defaults to 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  precision: number = DEFAULT_PRECISION
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  // Ensure value is in 0-100 range
  const normalizedValue = Math.max(0, Math.min(100, value));
  return getNumberFormatter('percent', precision).format(normalizedValue / 100);
};

/**
 * Formats a date with timezone support
 * @param date Date to format
 * @param formatString Optional format string (defaults to yyyy-MM-dd)
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date,
  formatString: string = DATE_FORMAT
): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  try {
    return dateFnsFormat(date, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Formats data for chart visualization with accessibility features
 * @param data Raw data array
 * @param options Chart formatting options
 * @returns Formatted ChartData object
 */
export const formatChartData = (
  data: any[],
  options: {
    useHighContrast?: boolean;
    includeLabels?: boolean;
    precision?: number;
  } = {}
): ChartData => {
  const {
    useHighContrast = false,
    includeLabels = true,
    precision = DEFAULT_PRECISION
  } = options;

  if (!Array.isArray(data) || data.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  const labels = data.map(item => 
    item.label || formatDate(item.date || new Date())
  );

  const datasets = data.map((dataset, index) => ({
    label: dataset.name || `Dataset ${index + 1}`,
    data: dataset.values.map((value: number) => 
      Number(value.toFixed(precision))
    ),
    backgroundColor: useHighContrast 
      ? HIGH_CONTRAST_COLORS.backgroundColor[index % HIGH_CONTRAST_COLORS.backgroundColor.length]
      : dataset.backgroundColor || '#003f5c',
    borderColor: useHighContrast
      ? HIGH_CONTRAST_COLORS.borderColor[index % HIGH_CONTRAST_COLORS.borderColor.length]
      : dataset.borderColor || '#002b3f',
    borderWidth: 1
  }));

  return {
    labels: includeLabels ? labels : [],
    datasets
  };
};

/**
 * Validates and formats a number within specified range
 * @param value Number to validate and format
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @param precision Decimal precision
 * @returns Formatted number string or error message
 */
export const formatValidatedNumber = (
  value: number,
  min: number | null,
  max: number | null,
  precision: number = DEFAULT_PRECISION
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'Invalid number';
  }

  if (min !== null && value < min) {
    return `Value must be at least ${min}`;
  }

  if (max !== null && value > max) {
    return `Value must be at most ${max}`;
  }

  return getNumberFormatter('decimal', precision).format(value);
};