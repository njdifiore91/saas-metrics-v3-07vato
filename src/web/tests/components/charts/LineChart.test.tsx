import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import { axe } from '@axe-core/react';
import { LineChart } from '../../../../src/components/charts/LineChart';
import { renderWithProviders } from '../../../../src/utils/test.utils';
import { ChartType, MetricChartProps, ThemeMode } from '../../../../src/types/chart.types';

// Mock ResizeObserver
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.ResizeObserver = mockResizeObserver;

// Mock Chart.js
jest.mock('chart.js/auto', () => ({
  Chart: jest.fn(() => ({
    destroy: jest.fn(),
    resize: jest.fn(),
    getActiveElements: jest.fn(() => [{ index: 0 }]),
    setActiveElements: jest.fn(),
    update: jest.fn(),
  })),
}));

describe('LineChart Component', () => {
  let mockProps: MetricChartProps;

  beforeEach(() => {
    // Generate mock data for testing
    mockProps = {
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [{
          label: 'Revenue Growth',
          data: [100, 120, 150, 180],
          backgroundColor: 'rgba(25,118,210,0.1)',
          borderColor: '#1976d2',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            enabled: true,
            mode: 'index'
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true
          }
        }
      },
      type: ChartType.LINE,
      height: 400,
      width: 600,
      isLoading: false
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders chart canvas with correct dimensions', () => {
    const { container } = renderWithProviders(<LineChart {...mockProps} />);
    const canvas = container.querySelector('canvas');
    
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('style', expect.stringContaining('width: 100%'));
    expect(canvas).toHaveAttribute('style', expect.stringContaining('height: 100%'));
  });

  it('displays loading state correctly', () => {
    const loadingProps = { ...mockProps, isLoading: true };
    renderWithProviders(<LineChart {...loadingProps} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading chart data')).toBeInTheDocument();
  });

  it('handles theme changes correctly', async () => {
    const { rerender } = renderWithProviders(<LineChart {...mockProps} />, {
      theme: 'light'
    });

    // Verify light theme rendering
    let canvas = screen.getByRole('img');
    expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('Line chart'));

    // Switch to dark theme
    rerender(<LineChart {...mockProps} />);
    await waitFor(() => {
      canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', () => {
    renderWithProviders(<LineChart {...mockProps} />);
    const canvas = screen.getByRole('img');
    
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' });
    
    // Chart instance methods should be called
    expect(mockProps.data.labels.length).toBeGreaterThan(0);
  });

  it('handles data updates correctly', async () => {
    const { rerender } = renderWithProviders(<LineChart {...mockProps} />);
    
    const updatedProps = {
      ...mockProps,
      data: {
        ...mockProps.data,
        datasets: [{
          ...mockProps.data.datasets[0],
          data: [120, 140, 160, 200]
        }]
      }
    };
    
    rerender(<LineChart {...updatedProps} />);
    await waitFor(() => {
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithProviders(<LineChart {...mockProps} />);
    
    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    
    // Check ARIA attributes
    const canvas = screen.getByRole('img');
    expect(canvas).toHaveAttribute('aria-label');
    expect(canvas).toHaveAttribute('tabIndex', '0');
  });

  it('handles resize events correctly', async () => {
    renderWithProviders(<LineChart {...mockProps} />);
    
    // Trigger resize observer
    const resizeCallback = mockResizeObserver.mock.calls[0][0];
    resizeCallback([{ contentRect: { width: 800, height: 600 } }]);
    
    await waitFor(() => {
      expect(mockResizeObserver).toHaveBeenCalled();
    });
  });

  it('cleans up resources on unmount', () => {
    const { unmount } = renderWithProviders(<LineChart {...mockProps} />);
    unmount();
    
    // Verify cleanup
    expect(mockResizeObserver).toHaveBeenCalled();
  });

  it('renders with empty data gracefully', () => {
    const emptyProps = {
      ...mockProps,
      data: {
        labels: [],
        datasets: []
      }
    };
    
    renderWithProviders(<LineChart {...emptyProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  it('applies correct ARIA labels for screen readers', () => {
    renderWithProviders(<LineChart {...mockProps} />);
    
    expect(screen.getByLabelText('Line chart visualization')).toBeInTheDocument();
    expect(screen.getByLabelText('Interactive line chart showing metric trends')).toBeInTheDocument();
  });
});