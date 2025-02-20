import {
  formatMetricValue,
  formatCurrency,
  formatPercentage,
  formatDate,
  formatChartData
} from '../../src/utils/format.utils';
import { MetricDataType } from '../../src/types/metric.types';

describe('formatMetricValue', () => {
  it('should format currency values with proper ARIA labels', () => {
    const value = 1234.56;
    const result = formatMetricValue(value, MetricDataType.CURRENCY);
    expect(result).toContain('aria-label="Currency value: $1,234.56"');
    expect(result).toContain('>$1,234.56<');
  });

  it('should format percentage values with accessibility support', () => {
    const value = 85.5;
    const result = formatMetricValue(value, MetricDataType.PERCENTAGE);
    expect(result).toContain('aria-label="Percentage value: 85.50%"');
    expect(result).toContain('>85.50%<');
  });

  it('should format ratio values with screen reader text', () => {
    const value = 2.5;
    const result = formatMetricValue(value, MetricDataType.RATIO);
    expect(result).toContain('aria-label="Ratio value: 2.50x"');
    expect(result).toContain('>2.50x<');
  });

  it('should format month values with proper accessibility', () => {
    const value = 18.2;
    const result = formatMetricValue(value, MetricDataType.MONTHS);
    expect(result).toContain('aria-label="Duration: 18 months"');
    expect(result).toContain('>18 months<');
  });

  it('should handle invalid values gracefully', () => {
    expect(formatMetricValue(NaN, MetricDataType.NUMBER)).toBe('N/A');
    expect(formatMetricValue(undefined as any, MetricDataType.CURRENCY)).toBe('N/A');
    expect(formatMetricValue(null as any, MetricDataType.PERCENTAGE)).toBe('N/A');
  });
});

describe('formatCurrency', () => {
  it('should format currency values with proper locale support', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
  });

  it('should handle large numbers with K/M/B suffixes', () => {
    expect(formatCurrency(1234567)).toBe('$1.23M');
    expect(formatCurrency(1234567890)).toBe('$1.23B');
    expect(formatCurrency(12345)).toBe('$12.35K');
  });

  it('should respect precision parameter', () => {
    expect(formatCurrency(1234.5678, 3)).toBe('$1,234.568');
    expect(formatCurrency(1234.5678, 1)).toBe('$1,234.6');
  });

  it('should handle edge cases', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(-0)).toBe('$0.00');
    expect(formatCurrency(NaN)).toBe('N/A');
  });
});

describe('formatPercentage', () => {
  it('should format percentage values with proper precision', () => {
    expect(formatPercentage(85.5)).toBe('85.50%');
    expect(formatPercentage(85.5, 1)).toBe('85.5%');
  });

  it('should handle boundary values', () => {
    expect(formatPercentage(0)).toBe('0.00%');
    expect(formatPercentage(100)).toBe('100.00%');
  });

  it('should clamp values to 0-100 range', () => {
    expect(formatPercentage(-10)).toBe('0.00%');
    expect(formatPercentage(150)).toBe('100.00%');
  });

  it('should handle invalid values', () => {
    expect(formatPercentage(NaN)).toBe('N/A');
    expect(formatPercentage(undefined as any)).toBe('N/A');
  });
});

describe('formatDate', () => {
  it('should format dates with default format', () => {
    const date = new Date('2023-10-15');
    expect(formatDate(date)).toBe('2023-10-15');
  });

  it('should support custom date formats', () => {
    const date = new Date('2023-10-15');
    expect(formatDate(date, 'MM/dd/yyyy')).toBe('10/15/2023');
    expect(formatDate(date, 'MMMM dd, yyyy')).toBe('October 15, 2023');
  });

  it('should handle invalid dates', () => {
    expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
    expect(formatDate(null as any)).toBe('Invalid Date');
  });

  it('should handle edge cases', () => {
    const date = new Date('2023-12-31');
    expect(formatDate(date)).toBe('2023-12-31');
    expect(formatDate(date, 'yyyy')).toBe('2023');
  });
});

describe('formatChartData', () => {
  const sampleData = [
    {
      name: 'Revenue',
      label: '2023 Q1',
      values: [100000, 150000, 200000],
      date: new Date('2023-01-01')
    }
  ];

  it('should format chart data with proper structure', () => {
    const result = formatChartData(sampleData);
    expect(result).toHaveProperty('labels');
    expect(result).toHaveProperty('datasets');
    expect(result.datasets[0]).toHaveProperty('label', 'Revenue');
  });

  it('should support high contrast mode', () => {
    const result = formatChartData(sampleData, { useHighContrast: true });
    expect(result.datasets[0].backgroundColor).toBe('#003f5c');
    expect(result.datasets[0].borderColor).toBe('#002b3f');
  });

  it('should handle precision in data values', () => {
    const result = formatChartData(sampleData, { precision: 1 });
    expect(result.datasets[0].data).toEqual([100000.0, 150000.0, 200000.0]);
  });

  it('should handle empty or invalid data', () => {
    expect(formatChartData([])).toEqual({ labels: [], datasets: [] });
    expect(formatChartData(null as any)).toEqual({ labels: [], datasets: [] });
  });

  it('should support label exclusion', () => {
    const result = formatChartData(sampleData, { includeLabels: false });
    expect(result.labels).toHaveLength(0);
  });
});