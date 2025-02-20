import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import axe from '@axe-core/react';

// Internal imports
import DashboardPage from '../../src/pages/DashboardPage';
import { renderWithProviders } from '../../src/utils/test.utils';

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'company_user',
  companyId: 'test-company-id',
  preferences: {
    theme: 'light',
    notifications: true,
    defaultDateRange: 'monthly',
    dashboardLayout: {}
  },
  lastLogin: new Date()
};

const mockMetrics = {
  arr: 1200000,
  growthRate: 125,
  ndr: 112,
  cacPayback: 18,
  ltv: 85000,
  burnRate: 75000
};

const mockBenchmarks = {
  revenueRange: '$1M-$5M',
  industryAvg: {
    arr_growth: 89,
    ndr: 106,
    cac_payback: 15,
    ltv: 92000,
    burn_rate: 80000
  }
};

// Mock hooks
jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    checkPermission: (permission: string) => true,
    loading: false
  })
}));

jest.mock('../../src/hooks/useMetrics', () => ({
  useMetrics: () => ({
    metrics: mockMetrics,
    loading: false,
    error: null,
    fetchMetrics: jest.fn(),
    calculateMetric: jest.fn()
  })
}));

describe('DashboardPage', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Test rendering and layout
  it('renders all main dashboard sections', async () => {
    renderWithProviders(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: true }}
        analyticsEnabled={true}
      />
    );

    // Verify main sections are rendered
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Revenue Overview')).toBeInTheDocument();
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
    expect(screen.getByText('Benchmark Comparison')).toBeInTheDocument();
  });

  // Test loading states
  it('displays loading indicators when data is being fetched', () => {
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [true, jest.fn()]);

    renderWithProviders(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: true }}
        analyticsEnabled={true}
      />
    );

    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });

  // Test responsive behavior
  it('handles different viewport sizes', async () => {
    const { rerender } = renderWithProviders(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: true }}
        analyticsEnabled={true}
      />
    );

    // Test mobile layout
    window.innerWidth = 320;
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveStyle({ padding: '16px' });
    });

    // Test tablet layout
    window.innerWidth = 768;
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveStyle({ padding: '24px' });
    });

    // Test desktop layout
    window.innerWidth = 1024;
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveStyle({ padding: '32px' });
    });
  });

  // Test metric interactions
  it('handles metric click events', async () => {
    const handleMetricClick = jest.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: true }}
        analyticsEnabled={true}
      />
    );

    const metricCard = screen.getByText('Net Dollar Retention').closest('div');
    await user.click(metricCard!);

    expect(handleMetricClick).toHaveBeenCalledWith('ndr');
  });

  // Test feature flags
  it('conditionally renders benchmark section based on feature flag', () => {
    const { rerender } = renderWithProviders(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: false }}
        analyticsEnabled={true}
      />
    );

    expect(screen.queryByText('Benchmark Comparison')).not.toBeInTheDocument();

    rerender(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: true }}
        analyticsEnabled={true}
      />
    );

    expect(screen.getByText('Benchmark Comparison')).toBeInTheDocument();
  });

  // Test error handling
  it('displays error states appropriately', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockError = new Error('Failed to fetch metrics');
    jest.mock('../../src/hooks/useMetrics', () => ({
      useMetrics: () => ({
        metrics: null,
        loading: false,
        error: mockError,
        fetchMetrics: jest.fn(),
        calculateMetric: jest.fn()
      })
    }));

    renderWithProviders(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: true }}
        analyticsEnabled={true}
      />
    );

    expect(screen.getByText('Failed to fetch metrics')).toBeInTheDocument();
  });

  // Test accessibility
  it('meets accessibility standards', async () => {
    const { container } = renderWithProviders(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: true }}
        analyticsEnabled={true}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // Test analytics tracking
  it('tracks page views and interactions when analytics is enabled', async () => {
    const mockAnalytics = {
      page: jest.fn(),
      track: jest.fn()
    };

    jest.mock('@segment/analytics-react', () => ({
      useAnalytics: () => mockAnalytics
    }));

    renderWithProviders(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: true }}
        analyticsEnabled={true}
      />
    );

    expect(mockAnalytics.page).toHaveBeenCalledWith('Dashboard', {
      userId: mockUser.id,
      role: mockUser.role,
      timestamp: expect.any(String)
    });
  });

  // Test role-based access control
  it('respects role-based access control for features', () => {
    jest.mock('../../src/hooks/useAuth', () => ({
      useAuth: () => ({
        user: { ...mockUser, role: 'restricted_user' },
        checkPermission: (permission: string) => permission !== 'VIEW_BENCHMARKS',
        loading: false
      })
    }));

    renderWithProviders(
      <DashboardPage 
        featureFlags={{ enableBenchmarks: true }}
        analyticsEnabled={true}
      />
    );

    expect(screen.queryByText('Benchmark Comparison')).not.toBeInTheDocument();
  });
});