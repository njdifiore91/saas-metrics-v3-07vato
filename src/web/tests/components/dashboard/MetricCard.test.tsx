import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import MetricCard from '../../../../src/components/dashboard/MetricCard';
import { renderWithProviders } from '../../../../src/utils/test.utils';
import { MetricDataType } from '../../../../src/types/metric.types';

// Default test props
const defaultProps = {
  title: 'Net Dollar Retention',
  value: 112.5,
  dataType: MetricDataType.PERCENTAGE,
  precision: 2,
  description: 'Year-over-year revenue retention including expansions',
  loading: false,
  onClick: jest.fn(),
  ariaLabel: 'NDR metric card'
};

describe('MetricCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Basic rendering tests
  it('renders correctly with default props', async () => {
    const { axe } = renderWithProviders(
      <MetricCard {...defaultProps} />
    );

    expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
    expect(screen.getByText('112.50%')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.description)).toBeInTheDocument();

    // Accessibility check
    const results = await axe();
    expect(results).toHaveNoViolations();
  });

  // Percentage metric tests
  it('formats percentage metrics correctly with different precisions', () => {
    const testCases = [
      { value: 85.4567, precision: 1, expected: '85.5%' },
      { value: 100, precision: 0, expected: '100%' },
      { value: 12.3456, precision: 3, expected: '12.346%' }
    ];

    testCases.forEach(({ value, precision, expected }) => {
      const { rerender } = renderWithProviders(
        <MetricCard {...defaultProps} value={value} precision={precision} />
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      rerender(<></>);
    });
  });

  // Currency metric tests
  it('formats currency metrics correctly with different locales', () => {
    const testCases = [
      { value: 1234567, expected: '$1.23M' },
      { value: 5000, expected: '$5,000' },
      { value: 1000000000, expected: '$1.00B' }
    ];

    testCases.forEach(({ value, expected }) => {
      const { rerender } = renderWithProviders(
        <MetricCard 
          {...defaultProps} 
          value={value} 
          dataType={MetricDataType.CURRENCY}
        />
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      rerender(<></>);
    });
  });

  // Loading state tests
  it('handles loading state correctly', () => {
    renderWithProviders(
      <MetricCard {...defaultProps} loading={true} />
    );

    const card = screen.getByRole('article');
    expect(card).toHaveClass('loading');
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  // Error state tests
  it('handles error state correctly', () => {
    const errorProps = {
      ...defaultProps,
      error: true,
      errorMessage: 'Failed to load metric data'
    };

    renderWithProviders(
      <MetricCard {...errorProps} />
    );

    const card = screen.getByRole('article');
    expect(card).toHaveClass('error');
    expect(screen.getByText(errorProps.errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // Interaction tests
  it('handles click interactions correctly', () => {
    const onClick = jest.fn();
    renderWithProviders(
      <MetricCard {...defaultProps} onClick={onClick} />
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // Keyboard interaction tests
  it('handles keyboard interactions correctly', () => {
    const onClick = jest.fn();
    renderWithProviders(
      <MetricCard {...defaultProps} onClick={onClick} />
    );

    const card = screen.getByRole('button');
    fireEvent.keyPress(card, { key: 'Enter', code: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyPress(card, { key: ' ', code: 'Space' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  // Theme and styling tests
  it('applies correct theme styles', () => {
    const { rerender } = renderWithProviders(
      <MetricCard {...defaultProps} />,
      { theme: 'light' }
    );

    let card = screen.getByRole('button');
    expect(card).toHaveStyle({ backgroundColor: expect.any(String) });

    rerender(
      <MetricCard {...defaultProps} />,
      { theme: 'dark' }
    );

    card = screen.getByRole('button');
    expect(card).toHaveStyle({ backgroundColor: expect.any(String) });
  });

  // Edge cases
  it('handles edge case values correctly', () => {
    const edgeCases = [
      { value: 0, expected: '0.00%' },
      { value: 999999.99, expected: '100,000.00%' },
      { value: -50, expected: '-50.00%' }
    ];

    edgeCases.forEach(({ value, expected }) => {
      const { rerender } = renderWithProviders(
        <MetricCard {...defaultProps} value={value} />
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      rerender(<></>);
    });
  });

  // Accessibility tests
  it('meets accessibility requirements', () => {
    renderWithProviders(
      <MetricCard {...defaultProps} />
    );

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label', defaultProps.ariaLabel);
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  // Visual hierarchy tests
  it('maintains proper visual hierarchy', () => {
    renderWithProviders(
      <MetricCard {...defaultProps} />
    );

    const title = screen.getByText(defaultProps.title);
    const value = screen.getByText('112.50%');
    const description = screen.getByText(defaultProps.description);

    expect(title).toHaveClass('metric-title');
    expect(value).toHaveClass('metric-value');
    expect(description).toHaveClass('metric-description');
  });
});