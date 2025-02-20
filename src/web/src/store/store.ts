// External imports - @reduxjs/toolkit v1.9.5
import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';

// Internal imports
import rootReducer, { RootState } from './rootReducer';

/**
 * Performance monitoring middleware with timing metrics
 */
const performanceMiddleware = () => (next: any) => (action: any) => {
  const start = performance.now();
  const result = next(action);
  const duration = performance.now() - start;

  // Log actions taking longer than 100ms
  if (duration > 100) {
    console.warn(`Action ${action.type} took ${duration.toFixed(2)}ms to process`);
  }

  return result;
};

/**
 * Error handling middleware for action dispatching
 */
const errorHandlingMiddleware = () => (next: any) => (action: any) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Action error:', {
      action: action.type,
      payload: action.payload,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

/**
 * Serialization check middleware to prevent circular references
 */
const serializationCheckMiddleware = () => (next: any) => (action: any) => {
  try {
    JSON.stringify(action);
  } catch (error) {
    console.error('Non-serializable action detected:', {
      action: action.type,
      error: error instanceof Error ? error.message : 'Serialization error'
    });
    return action;
  }
  return next(action);
};

/**
 * Configure and create the Redux store with enhanced middleware and monitoring
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      // Enhanced middleware configuration
      serializableCheck: {
        // Ignore specific action types and paths for non-serializable data
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['payload.timestamp', 'payload.date']
      },
      thunk: {
        extraArgument: undefined
      },
      immutableCheck: {
        // Ignore specific paths for immutability checks
        ignoredPaths: ['ignoredPath']
      }
    }).concat([
      performanceMiddleware,
      errorHandlingMiddleware,
      serializationCheckMiddleware
    ]),
  devTools: process.env.NODE_ENV !== 'production',
  preloadedState: undefined,
  enhancers: []
});

// Set up store subscription for performance monitoring
store.subscribe(() => {
  const state = store.getState();
  const stateSize = new TextEncoder().encode(JSON.stringify(state)).length;
  
  // Log warning if state size exceeds 1MB
  if (stateSize > 1024 * 1024) {
    console.warn(`Redux state size (${(stateSize / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit`);
  }
});

// Type definitions for TypeScript support
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default store;