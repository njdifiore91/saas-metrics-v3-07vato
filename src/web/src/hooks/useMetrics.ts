// External imports
import { useState, useCallback, useEffect, useMemo } from 'react'; // react v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // react-redux v8.0.5
import Big from 'big.js'; // big.js v6.2.1

// Internal imports
import { selectMetrics, metricsSlice } from '../store/metrics/metricsSlice';
import { Metric, MetricCategory, MetricDataType } from '../types/metric.types';
import { metricsService } from '../services/metrics.service';

// Types for hook parameters and state
interface MetricOptions {
  category?: MetricCategory;
  autoRefresh?: boolean;
  refreshInterval?: number;
  skipCache?: boolean;
}

interface LoadingState {
  metrics: boolean;
  calculations: boolean;
  updates: boolean;
}

interface MetricError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

interface CalculationOptions {
  precision?: number;
  validateBounds?: boolean;
}

// Constants
const DEFAULT_REFRESH_INTERVAL = 300000; // 5 minutes
const DEFAULT_CALCULATION_PRECISION = 4;

/**
 * Enhanced custom hook for managing metrics state and operations
 * Provides comprehensive metric management capabilities with optimized performance
 */
export function useMetrics(companyId: string, options: MetricOptions = {}) {
  const dispatch = useDispatch();
  const metrics = useSelector(selectMetrics);
  
  // Local state management
  const [loading, setLoading] = useState<LoadingState>({
    metrics: false,
    calculations: false,
    updates: false
  });
  const [error, setError] = useState<MetricError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Memoized configuration
  const config = useMemo(() => ({
    refreshInterval: options.refreshInterval || DEFAULT_REFRESH_INTERVAL,
    autoRefresh: options.autoRefresh ?? true,
    category: options.category,
    skipCache: options.skipCache ?? false
  }), [options]);

  /**
   * Fetches metrics with enhanced error handling and caching
   */
  const fetchMetrics = useCallback(async (force: boolean = false) => {
    try {
      setLoading(prev => ({ ...prev, metrics: true }));
      setError(null);

      const response = await dispatch(metricsSlice.actions.fetchMetrics({
        companyId,
        category: config.category,
        forceRefresh: force || config.skipCache
      })).unwrap();

      setLastUpdated(Date.now());
      return response;
    } catch (error: any) {
      setError({
        code: error.code || 'FETCH_ERROR',
        message: error.message || 'Failed to fetch metrics',
        details: error.details
      });
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, metrics: false }));
    }
  }, [dispatch, companyId, config.category, config.skipCache]);

  /**
   * Calculates derived metrics with precision handling
   */
  const calculateMetric = useCallback(async (
    inputs: Record<string, number>,
    calculationType: string,
    options: CalculationOptions = {}
  ): Promise<number> => {
    try {
      setLoading(prev => ({ ...prev, calculations: true }));
      setError(null);

      const result = await metricsService.calculateMetric(
        calculationType,
        inputs
      );

      const precision = options.precision || DEFAULT_CALCULATION_PRECISION;
      return Number(new Big(result).toFixed(precision));
    } catch (error: any) {
      setError({
        code: 'CALCULATION_ERROR',
        message: error.message || 'Failed to calculate metric',
        details: error.details
      });
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, calculations: false }));
    }
  }, []);

  /**
   * Updates metric values with optimistic updates
   */
  const updateMetric = useCallback(async (
    metricId: string,
    value: number,
    period: { start: Date; end: Date }
  ) => {
    try {
      setLoading(prev => ({ ...prev, updates: true }));
      setError(null);

      // Optimistic update
      dispatch(metricsSlice.actions.updateMetricOptimistic({
        id: metricId,
        value,
        periodStart: period.start,
        periodEnd: period.end
      }));

      const response = await dispatch(metricsSlice.actions.updateMetric({
        id: metricId,
        companyId,
        value,
        periodStart: period.start,
        periodEnd: period.end
      })).unwrap();

      setLastUpdated(Date.now());
      return response;
    } catch (error: any) {
      // Revert optimistic update
      dispatch(metricsSlice.actions.revertMetricUpdate({ id: metricId }));
      
      setError({
        code: 'UPDATE_ERROR',
        message: error.message || 'Failed to update metric',
        details: error.details
      });
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, updates: false }));
    }
  }, [dispatch, companyId]);

  /**
   * Subscribes to real-time metric updates
   */
  const subscribeToUpdates = useCallback((callback: (metric: Metric) => void) => {
    const unsubscribe = metricsService.subscribeToMetricUpdates(
      companyId,
      callback
    );
    return unsubscribe;
  }, [companyId]);

  /**
   * Clears metric cache and triggers refresh
   */
  const clearCache = useCallback(async () => {
    dispatch(metricsSlice.actions.invalidateCache());
    return fetchMetrics(true);
  }, [dispatch, fetchMetrics]);

  // Setup auto-refresh
  useEffect(() => {
    if (!config.autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchMetrics();
    }, config.refreshInterval);

    return () => clearInterval(intervalId);
  }, [config.autoRefresh, config.refreshInterval, fetchMetrics]);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    fetchMetrics,
    calculateMetric,
    updateMetric,
    subscribeToUpdates,
    clearCache
  };
}