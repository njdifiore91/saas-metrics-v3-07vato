// External imports
import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';

// Internal imports
import { useMetrics } from '../../src/hooks/useMetrics';
import { renderWithProviders } from '../../src/utils/test.utils';
import metricsReducer, { actions as metricsActions } from '../../src/store/metrics/metricsSlice';
import { MetricCategory, MetricDataType } from '../../src/types/metric.types';
import { metricsService } from '../../src/services/metrics.service';

// Mock the metrics service
jest.mock('../../src/services/metrics.service', () => ({
  metricsService: {
    calculateMetric: jest.fn(),
    subscribeToMetricUpdates: jest.fn(),
    getMetrics: jest.fn(),
    saveCompanyMetric: jest.fn()
  }
}));

// Test data constants
const TEST_COMPANY_ID = 'test-company-123';
const MOCK_METRIC = {
  id: 'metric-123',
  name: 'Net Dollar Retention',
  category: MetricCategory.RETENTION,
  dataType: MetricDataType.PERCENTAGE,
  validationRules: {
    min: 0,
    max: 200,
    precision: 2,
    required: true
  },
  active: true
};

const MOCK_METRIC_DATA = {
  id: 'data-123',
  metricId: MOCK_METRIC.id,
  value: 120,
  periodStart: new Date('2023-01-01'),
  periodEnd: new Date('2023-03-31'),
  companyId: TEST_COMPANY_ID
};

// Store setup
const setupStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      metrics: metricsReducer
    },
    preloadedState
  });
};

describe('useMetrics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      expect(result.current.loading.metrics).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
    });

    it('should fetch metrics on mount', async () => {
      (metricsService.getMetrics as jest.Mock).mockResolvedValueOnce([MOCK_METRIC]);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await waitFor(() => {
        expect(result.current.loading.metrics).toBe(false);
      });

      expect(metricsService.getMetrics).toHaveBeenCalledWith({
        companyId: TEST_COMPANY_ID
      });
    });
  });

  describe('Metric Fetching', () => {
    it('should handle successful metric fetch', async () => {
      (metricsService.getMetrics as jest.Mock).mockResolvedValueOnce([MOCK_METRIC]);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        await result.current.fetchMetrics();
      });

      expect(result.current.metrics).toContainEqual(MOCK_METRIC);
      expect(result.current.loading.metrics).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch metrics');
      (metricsService.getMetrics as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        try {
          await result.current.fetchMetrics();
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.error).toEqual({
        code: 'FETCH_ERROR',
        message: 'Failed to fetch metrics',
        details: undefined
      });
    });

    it('should respect cache settings', async () => {
      (metricsService.getMetrics as jest.Mock).mockResolvedValue([MOCK_METRIC]);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID, { skipCache: true }), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        await result.current.fetchMetrics();
        await result.current.fetchMetrics();
      });

      expect(metricsService.getMetrics).toHaveBeenCalledTimes(2);
    });
  });

  describe('Metric Calculations', () => {
    it('should calculate NDR correctly', async () => {
      const inputs = {
        startingARR: 1000000,
        expansions: 200000,
        contractions: 50000,
        churn: 100000
      };

      (metricsService.calculateMetric as jest.Mock).mockResolvedValueOnce(105);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      const ndr = await act(async () => {
        return await result.current.calculateMetric(inputs, 'NDR', { precision: 2 });
      });

      expect(ndr).toBe(105);
      expect(result.current.loading.calculations).toBe(false);
    });

    it('should handle calculation errors', async () => {
      const error = new Error('Invalid calculation inputs');
      (metricsService.calculateMetric as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        try {
          await result.current.calculateMetric({}, 'NDR');
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.error).toEqual({
        code: 'CALCULATION_ERROR',
        message: error.message,
        details: undefined
      });
    });
  });

  describe('Metric Updates', () => {
    it('should handle metric update with optimistic updates', async () => {
      (metricsService.saveCompanyMetric as jest.Mock).mockResolvedValueOnce(MOCK_METRIC_DATA);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        await result.current.updateMetric(
          MOCK_METRIC_DATA.id,
          MOCK_METRIC_DATA.value,
          {
            start: MOCK_METRIC_DATA.periodStart,
            end: MOCK_METRIC_DATA.periodEnd
          }
        );
      });

      expect(result.current.loading.updates).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle update errors and revert optimistic updates', async () => {
      const error = new Error('Update failed');
      (metricsService.saveCompanyMetric as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        try {
          await result.current.updateMetric(
            MOCK_METRIC_DATA.id,
            MOCK_METRIC_DATA.value,
            {
              start: MOCK_METRIC_DATA.periodStart,
              end: MOCK_METRIC_DATA.periodEnd
            }
          );
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.error).toEqual({
        code: 'UPDATE_ERROR',
        message: error.message,
        details: undefined
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle metric subscription', () => {
      const unsubscribe = jest.fn();
      (metricsService.subscribeToMetricUpdates as jest.Mock).mockReturnValue(unsubscribe);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      const callback = jest.fn();
      const cleanup = result.current.subscribeToUpdates(callback);

      expect(metricsService.subscribeToMetricUpdates).toHaveBeenCalledWith(
        TEST_COMPANY_ID,
        callback
      );
      expect(cleanup).toBe(unsubscribe);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache and trigger refresh', async () => {
      (metricsService.getMetrics as jest.Mock).mockResolvedValue([MOCK_METRIC]);

      const { result } = renderHook(() => useMetrics(TEST_COMPANY_ID), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        await result.current.clearCache();
      });

      expect(metricsService.getMetrics).toHaveBeenCalledTimes(2);
    });
  });
});