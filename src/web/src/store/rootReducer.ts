// External imports - @reduxjs/toolkit v1.9.5
import { combineReducers } from '@reduxjs/toolkit';

// Internal imports
import authReducer from './auth/authSlice';
import benchmarkReducer from './benchmark/benchmarkSlice';
import metricsReducer from './metrics/metricsSlice';
import companyReducer from './company/companySlice';

/**
 * Root reducer combining all feature slices for global state management
 * Implements Redux Toolkit for predictable state updates and TypeScript support
 */
const rootReducer = combineReducers({
  auth: authReducer,
  benchmark: benchmarkReducer,
  metrics: metricsReducer,
  company: companyReducer
});

/**
 * Type definition for the root state, derived from the root reducer
 * Used for type-safe state access throughout the application
 */
export type RootState = ReturnType<typeof rootReducer>;

// Export the root reducer as default
export default rootReducer;