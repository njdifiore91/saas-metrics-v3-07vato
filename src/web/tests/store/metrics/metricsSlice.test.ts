// External imports
import { configureStore } from '@reduxjs/toolkit'; // @reduxjs/toolkit v1.9.5
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'; // @jest/globals v29.6.0
import { renderHook } from '@testing-library/react'; // @testing-library/react v13.4.0

// Internal imports
import { reducer, actions, selectors, thunks } from '../../src/store/metrics/metricsSlice';
import { MetricsService } from '../../src/services/metrics.service';
import { MetricCategory, MetricDataType } from '../../src/types/metric.types';

// Mock MetricsService
jest.mock('../../src/services/metrics.service');

// Test fixtures
const mockMetrics = [
  {
    id: '1',
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
  },
  {
    id: '2',
    name: 'CAC Payback',
    category: MetricCategory.SALES_EFFICIENCY,
    dataType: MetricDataType.MONTHS,
    validationRules: {
      min: 0,
      max: 60,
      precision: 1,
      required: true
    },
    active: true
  }
];

const mockCompanyMetrics = [
  {
    id: '1',
    companyId: 'company1',
    metricId: '1',
    value: 112.5,
    periodStart: new Date('2023-01-01'),
    periodEnd: new Date('2023-03-31'),
    createdAt: new Date()
  }
];

// Test store setup
const createTestStore = () => {
  return configureStore({
    reducer: {
      metrics: reducer
    }
  });
};

describe('metricsSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should have correct initial state', () => {
      const state = store.getState().metrics;
      expect(state).toEqual({
        metrics: {},
        companyMetrics: {},
        lastFetched: null,
        loading: {
          metrics: false,
          companyMetrics: false,
          updates: false
        },
        error: {
          metrics: null,
          companyMetrics: null,
          updates: null
        },
        cache: {
          timestamp: 0,
          valid: false
        }
      });
    });
  });

  describe('Async Thunks', () => {
    describe('fetchMetrics', () => {
      it('should fetch metrics successfully', async () => {
        MetricsService.getMetrics.mockResolvedValueOnce(mockMetrics);

        await store.dispatch(thunks.fetchMetrics({ forceRefresh: true }));
        const state = store.getState().metrics;

        expect(state.metrics).toEqual(
          mockMetrics.reduce((acc, metric) => ({ ...acc, [metric.id]: metric }), {})
        );
        expect(state.loading.metrics).toBe(false);
        expect(state.error.metrics).toBeNull();
        expect(state.cache.valid).toBe(true);
      });

      it('should handle fetch metrics failure', async () => {
        const error = new Error('Failed to fetch metrics');
        MetricsService.getMetrics.mockRejectedValueOnce(error);

        await store.dispatch(thunks.fetchMetrics({ forceRefresh: true }));
        const state = store.getState().metrics;

        expect(state.metrics).toEqual({});
        expect(state.loading.metrics).toBe(false);
        expect(state.error.metrics).toBe(error.message);
      });

      it('should respect cache TTL', async () => {
        MetricsService.getMetrics.mockResolvedValueOnce(mockMetrics);

        // First fetch
        await store.dispatch(thunks.fetchMetrics({}));
        const callCount1 = MetricsService.getMetrics.mock.calls.length;

        // Second fetch within cache TTL
        await store.dispatch(thunks.fetchMetrics({}));
        const callCount2 = MetricsService.getMetrics.mock.calls.length;

        expect(callCount1).toBe(1);
        expect(callCount2).toBe(1); // Should use cached data
      });
    });

    describe('fetchCompanyMetrics', () => {
      const params = {
        companyId: 'company1',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-03-31')
      };

      it('should fetch company metrics successfully', async () => {
        MetricsService.getCompanyMetrics.mockResolvedValueOnce(mockCompanyMetrics);

        await store.dispatch(thunks.fetchCompanyMetrics(params));
        const state = store.getState().metrics;

        expect(state.companyMetrics).toEqual(
          mockCompanyMetrics.reduce((acc, metric) => ({ ...acc, [metric.id]: metric }), {})
        );
        expect(state.loading.companyMetrics).toBe(false);
        expect(state.error.companyMetrics).toBeNull();
      });

      it('should handle fetch company metrics failure', async () => {
        const error = new Error('Failed to fetch company metrics');
        MetricsService.getCompanyMetrics.mockRejectedValueOnce(error);

        await store.dispatch(thunks.fetchCompanyMetrics(params));
        const state = store.getState().metrics;

        expect(state.companyMetrics).toEqual({});
        expect(state.loading.companyMetrics).toBe(false);
        expect(state.error.companyMetrics).toBe(error.message);
      });
    });

    describe('updateMetric', () => {
      const mockUpdate = {
        id: '1',
        companyId: 'company1',
        metricId: '1',
        value: 115.0,
        periodStart: new Date('2023-01-01'),
        periodEnd: new Date('2023-03-31'),
        createdAt: new Date()
      };

      it('should update metric successfully', async () => {
        MetricsService.saveCompanyMetric.mockResolvedValueOnce(mockUpdate);

        await store.dispatch(thunks.updateMetric(mockUpdate));
        const state = store.getState().metrics;

        expect(state.companyMetrics[mockUpdate.id]).toEqual(mockUpdate);
        expect(state.loading.updates).toBe(false);
        expect(state.error.updates).toBeNull();
      });

      it('should handle update failure', async () => {
        const error = new Error('Failed to update metric');
        MetricsService.saveCompanyMetric.mockRejectedValueOnce(error);

        await store.dispatch(thunks.updateMetric(mockUpdate));
        const state = store.getState().metrics;

        expect(state.loading.updates).toBe(false);
        expect(state.error.updates).toBe(error.message);
      });
    });
  });

  describe('Selectors', () => {
    beforeEach(async () => {
      MetricsService.getMetrics.mockResolvedValueOnce(mockMetrics);
      await store.dispatch(thunks.fetchMetrics({ forceRefresh: true }));
    });

    it('should select all metrics', () => {
      const allMetrics = selectors.selectAllMetrics(store.getState());
      expect(allMetrics).toHaveLength(mockMetrics.length);
      expect(allMetrics).toEqual(expect.arrayContaining(mockMetrics));
    });

    it('should select metrics by category', () => {
      const retentionMetrics = selectors.selectMetricsByCategory(
        store.getState(),
        MetricCategory.RETENTION
      );
      expect(retentionMetrics).toHaveLength(1);
      expect(retentionMetrics[0].name).toBe('Net Dollar Retention');
    });

    it('should select loading state', () => {
      const loading = selectors.selectMetricsLoading(store.getState());
      expect(loading).toEqual({
        metrics: false,
        companyMetrics: false,
        updates: false
      });
    });

    it('should select error state', () => {
      const error = selectors.selectMetricsError(store.getState());
      expect(error).toEqual({
        metrics: null,
        companyMetrics: null,
        updates: null
      });
    });

    it('should select cache status', () => {
      const cacheStatus = selectors.selectCacheStatus(store.getState());
      expect(cacheStatus).toHaveProperty('isValid');
      expect(cacheStatus).toHaveProperty('lastUpdated');
    });
  });

  describe('Actions', () => {
    it('should invalidate cache', () => {
      store.dispatch(actions.invalidateCache());
      const state = store.getState().metrics;
      expect(state.cache.valid).toBe(false);
    });

    it('should clear errors', () => {
      // Set some errors first
      store.dispatch(thunks.fetchMetrics({ forceRefresh: true }))
        .then(() => {
          store.dispatch(actions.clearErrors());
          const state = store.getState().metrics;
          expect(state.error).toEqual({
            metrics: null,
            companyMetrics: null,
            updates: null
          });
        });
    });
  });
});