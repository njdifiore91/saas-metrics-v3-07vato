// External imports
import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit v1.9.5

// Internal imports
import { Metric, CompanyMetric, MetricCategory } from '../../types/metric.types';
import { metricsService } from '../../services/metrics.service';

// Constants for cache management
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const LOADING_TIMEOUT = 2000; // 2 seconds (from success criteria)

// State interface definitions
interface MetricsState {
  metrics: Record<string, Metric>;
  companyMetrics: Record<string, CompanyMetric>;
  lastFetched: number | null;
  loading: {
    metrics: boolean;
    companyMetrics: boolean;
    updates: boolean;
  };
  error: {
    metrics: string | null;
    companyMetrics: string | null;
    updates: string | null;
  };
  cache: {
    timestamp: number;
    valid: boolean;
  };
}

// Initial state
const initialState: MetricsState = {
  metrics: {},
  companyMetrics: {},
  lastFetched: null,
  loading: {
    metrics: false,
    companyMetrics: false,
    updates: false,
  },
  error: {
    metrics: null,
    companyMetrics: null,
    updates: null,
  },
  cache: {
    timestamp: 0,
    valid: false,
  },
};

// Async thunks
export const fetchMetrics = createAsyncThunk(
  'metrics/fetchMetrics',
  async ({ forceRefresh = false, category }: { forceRefresh?: boolean; category?: MetricCategory }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { metrics: MetricsState };
      const now = Date.now();

      // Check cache validity unless force refresh is requested
      if (!forceRefresh && state.metrics.cache.valid && (now - state.metrics.cache.timestamp) < CACHE_TTL) {
        return Object.values(state.metrics.metrics);
      }

      const metrics = await metricsService.getMetrics({ category });
      return metrics;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
  {
    condition: (_, { getState }) => {
      const { metrics } = getState() as { metrics: MetricsState };
      return !metrics.loading.metrics;
    }
  }
);

export const fetchCompanyMetrics = createAsyncThunk(
  'metrics/fetchCompanyMetrics',
  async ({ 
    companyId, 
    startDate, 
    endDate, 
    categories 
  }: { 
    companyId: string; 
    startDate: Date; 
    endDate: Date; 
    categories?: MetricCategory[]; 
  }, { rejectWithValue }) => {
    try {
      const response = await metricsService.getCompanyMetrics(companyId, {
        startDate,
        endDate,
        categories
      });
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateMetric = createAsyncThunk(
  'metrics/updateMetric',
  async (metric: CompanyMetric, { rejectWithValue }) => {
    try {
      const response = await metricsService.saveCompanyMetric(metric);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice definition
const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    invalidateCache: (state) => {
      state.cache.valid = false;
    },
    clearErrors: (state) => {
      state.error = {
        metrics: null,
        companyMetrics: null,
        updates: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch metrics handlers
      .addCase(fetchMetrics.pending, (state) => {
        state.loading.metrics = true;
        state.error.metrics = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action: PayloadAction<Metric[]>) => {
        state.loading.metrics = false;
        state.metrics = action.payload.reduce((acc, metric) => ({
          ...acc,
          [metric.id]: metric
        }), {});
        state.cache = {
          timestamp: Date.now(),
          valid: true,
        };
        state.lastFetched = Date.now();
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading.metrics = false;
        state.error.metrics = action.payload as string;
      })

      // Fetch company metrics handlers
      .addCase(fetchCompanyMetrics.pending, (state) => {
        state.loading.companyMetrics = true;
        state.error.companyMetrics = null;
      })
      .addCase(fetchCompanyMetrics.fulfilled, (state, action: PayloadAction<CompanyMetric[]>) => {
        state.loading.companyMetrics = false;
        state.companyMetrics = action.payload.reduce((acc, metric) => ({
          ...acc,
          [metric.id]: metric
        }), {});
      })
      .addCase(fetchCompanyMetrics.rejected, (state, action) => {
        state.loading.companyMetrics = false;
        state.error.companyMetrics = action.payload as string;
      })

      // Update metric handlers
      .addCase(updateMetric.pending, (state) => {
        state.loading.updates = true;
        state.error.updates = null;
      })
      .addCase(updateMetric.fulfilled, (state, action: PayloadAction<CompanyMetric>) => {
        state.loading.updates = false;
        state.companyMetrics[action.payload.id] = action.payload;
      })
      .addCase(updateMetric.rejected, (state, action) => {
        state.loading.updates = false;
        state.error.updates = action.payload as string;
      });
  },
});

// Selectors
export const selectAllMetrics = createSelector(
  [(state: { metrics: MetricsState }) => state.metrics.metrics],
  (metrics) => Object.values(metrics)
);

export const selectMetricsByCategory = createSelector(
  [
    (state: { metrics: MetricsState }) => state.metrics.metrics,
    (_: any, category: MetricCategory) => category
  ],
  (metrics, category) => Object.values(metrics).filter(metric => metric.category === category)
);

export const selectCompanyMetrics = createSelector(
  [(state: { metrics: MetricsState }) => state.metrics.companyMetrics],
  (companyMetrics) => Object.values(companyMetrics)
);

export const selectMetricsLoading = createSelector(
  [(state: { metrics: MetricsState }) => state.metrics.loading],
  (loading) => loading
);

export const selectMetricsError = createSelector(
  [(state: { metrics: MetricsState }) => state.metrics.error],
  (error) => error
);

export const selectCacheStatus = createSelector(
  [(state: { metrics: MetricsState }) => state.metrics.cache],
  (cache) => ({
    isValid: cache.valid && (Date.now() - cache.timestamp) < CACHE_TTL,
    lastUpdated: cache.timestamp,
  })
);

// Export actions and reducer
export const { invalidateCache, clearErrors } = metricsSlice.actions;
export default metricsSlice.reducer;