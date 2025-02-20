// External imports
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore, PreloadedState } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ReactElement, ReactNode } from 'react';

// Internal imports
import { RootState } from '../store/store';
import { lightTheme, darkTheme } from '../assets/styles/theme';
import rootReducer from '../store/rootReducer';

// Extend jest matchers
expect.extend(toHaveNoViolations);

// Types for enhanced render options
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  store?: ReturnType<typeof createMockStore>;
  route?: string;
  theme?: 'light' | 'dark';
}

/**
 * Creates a fully configured mock Redux store with middleware and type safety
 * @param preloadedState - Optional initial state for testing
 * @returns Configured store instance
 */
export function createMockStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false
      })
  });
}

/**
 * Creates a test theme with proper type definitions
 * @param mode - Theme mode (light/dark)
 * @returns Material-UI theme object
 */
export function createTestTheme(mode: 'light' | 'dark' = 'light') {
  return mode === 'light' ? lightTheme : darkTheme;
}

/**
 * Enhanced render function that wraps component with all necessary providers
 * Includes Redux, Router, Theme, and accessibility testing context
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = createMockStore(preloadedState),
    route = '/',
    theme = 'light',
    ...renderOptions
  }: ExtendedRenderOptions = {}
): RenderResult & {
  store: ReturnType<typeof createMockStore>;
  user: ReturnType<typeof userEvent.setup>;
  axe: typeof axe;
} {
  // Create user event instance
  const user = userEvent.setup();

  // Wrapper component with all providers
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <ThemeProvider theme={createTestTheme(theme)}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={route} element={children} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
  }

  // Render with all providers
  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  // Return enhanced object with store and testing utilities
  return {
    ...renderResult,
    store,
    user,
    axe: async (element?: Element) => {
      const results = await axe(element || renderResult.container);
      expect(results).toHaveNoViolations();
      return results;
    }
  };
}

/**
 * Helper function to wait for loading states to resolve
 * @param callback - Assertion callback
 * @param timeout - Maximum wait time
 */
export async function waitForLoadingState(
  callback: () => boolean | Promise<boolean>,
  timeout = 2000
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await callback()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Loading state did not resolve within ${timeout}ms`);
}

/**
 * Helper function to mock Redux dispatch and track actions
 * @param store - Redux store instance
 * @returns Tracked actions array
 */
export function trackDispatchedActions(store: ReturnType<typeof createMockStore>) {
  const actions: any[] = [];
  const originalDispatch = store.dispatch;

  store.dispatch = jest.fn((action) => {
    actions.push(action);
    return originalDispatch(action);
  });

  return actions;
}

/**
 * Helper function to simulate network responses
 * @param status - HTTP status code
 * @param data - Response data
 * @returns Mock response object
 */
export function createMockResponse(status: number, data: any) {
  return {
    status,
    data,
    headers: {
      'content-type': 'application/json'
    }
  };
}

/**
 * Helper function to create mock error responses
 * @param status - HTTP status code
 * @param message - Error message
 * @returns Mock error object
 */
export function createMockError(status: number, message: string) {
  return {
    response: {
      status,
      data: {
        message,
        code: `ERROR_${status}`,
        details: {}
      }
    }
  };
}