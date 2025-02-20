// External imports - @reduxjs/toolkit v1.9.5
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';

// Internal imports
import { 
  BenchmarkData, 
  BenchmarkFilter, 
  BenchmarkComparison,
  MetricType,
  DataQuality
} from '../../types/benchmark.types';
import { BenchmarkService } from '../../services/benchmark.service';

// Constants for cache and retry management
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const MAX_RETRIES = 3;

// State interface definition
interface BenchmarkState {
  data: BenchmarkData[];
  loading: boolean;
  error: string | null;
  comparison: BenchmarkComparison | null;
  filter: BenchmarkFilter | null;
  lastUpdated: Date | null;
  cache: Record<string, { data: BenchmarkData[]; timestamp: Date }>;
  retryCount: number;
}

// Initial state
const initialState: BenchmarkState = {
  data: [],
  loading: false,
  error: null,
  comparison: null,
  filter: null,
  lastUpdated: null,
  cache: {},
  retryCount: 0
};

// Async thunk for fetching benchmark data with caching and retry logic
export const fetchBenchmarkData = createAsyncThunk(
  'benchmark/fetchData',
  async (filter: BenchmarkFilter, { getState, rejectWithValue }) => {
    try {
      const benchmarkService = BenchmarkService.getInstance(null);
      const data = await benchmarkService.getBenchmarkData(filter);
      
      if (!data || data.length === 0) {
        throw new Error('No benchmark data available');
      }

      const validatedData = data.filter(item => 
        item.confidence_score >= 0.8 && 
        item.data_quality !== DataQuality.INSUFFICIENT
      );

      return validatedData;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Async thunk for benchmark comparison operations
export const compareToBenchmark = createAsyncThunk(
  'benchmark/compare',
  async ({ 
    companyValue, 
    benchmarkData 
  }: { 
    companyValue: number; 
    benchmarkData: BenchmarkData[] 
  }, { rejectWithValue }) => {
    try {
      const benchmarkService = BenchmarkService.getInstance(null);
      const comparison = await benchmarkService.compareBenchmarks(
        companyValue,
        benchmarkData
      );
      return comparison;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Create the benchmark slice
const benchmarkSlice = createSlice({
  name: 'benchmark',
  initialState,
  reducers: {
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    clearCache: (state) => {
      state.cache = {};
      state.lastUpdated = null;
    },
    resetError: (state) => {
      state.error = null;
      state.retryCount = 0;
    },
    clearComparison: (state) => {
      state.comparison = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch benchmark data cases
      .addCase(fetchBenchmarkData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBenchmarkData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.lastUpdated = new Date();
        state.retryCount = 0;
        
        // Update cache
        if (state.filter) {
          const cacheKey = JSON.stringify(state.filter);
          state.cache[cacheKey] = {
            data: action.payload,
            timestamp: new Date()
          };
        }
      })
      .addCase(fetchBenchmarkData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.retryCount += 1;
      })
      // Comparison cases
      .addCase(compareToBenchmark.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(compareToBenchmark.fulfilled, (state, action) => {
        state.loading = false;
        state.comparison = action.payload;
      })
      .addCase(compareToBenchmark.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Memoized selectors for optimized state access
export const selectBenchmarkData = (state: { benchmark: BenchmarkState }) => state.benchmark.data;
export const selectBenchmarkLoading = (state: { benchmark: BenchmarkState }) => state.benchmark.loading;
export const selectBenchmarkError = (state: { benchmark: BenchmarkState }) => state.benchmark.error;
export const selectBenchmarkComparison = (state: { benchmark: BenchmarkState }) => state.benchmark.comparison;
export const selectBenchmarkFilter = (state: { benchmark: BenchmarkState }) => state.benchmark.filter;

// Complex selectors with memoization
export const selectFilteredBenchmarks = createSelector(
  [selectBenchmarkData, selectBenchmarkFilter],
  (data, filter) => {
    if (!filter) return data;
    
    return data.filter(benchmark => {
      const matchesRevenue = benchmark.revenue_range.min >= filter.revenue_range.min &&
                            benchmark.revenue_range.max <= filter.revenue_range.max;
      
      const matchesMetricType = filter.metric_types.includes(benchmark.metric_id as MetricType);
      
      return matchesRevenue && matchesMetricType;
    });
  }
);

export const selectCachedBenchmarks = createSelector(
  [
    (state: { benchmark: BenchmarkState }) => state.benchmark.cache,
    (state: { benchmark: BenchmarkState }) => state.benchmark.filter
  ],
  (cache, filter) => {
    if (!filter) return null;
    
    const cacheKey = JSON.stringify(filter);
    const cachedData = cache[cacheKey];
    
    if (cachedData && 
        (new Date().getTime() - cachedData.timestamp.getTime()) < CACHE_DURATION) {
      return cachedData.data;
    }
    
    return null;
  }
);

// Export actions and reducer
export const { 
  setFilter, 
  clearCache, 
  resetError, 
  clearComparison 
} = benchmarkSlice.actions;

export default benchmarkSlice.reducer;