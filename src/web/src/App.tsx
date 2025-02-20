import React, { lazy, Suspense } from 'react'; // react v18.2.0
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // react-router-dom v6.14.0
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material'; // @mui/material v5.14.0
import { Provider } from 'react-redux'; // react-redux v8.1.0
import { ErrorBoundary } from 'react-error-boundary'; // react-error-boundary v4.0.11

// Internal imports
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Loading from './components/common/Loading';
import { useTheme } from './hooks/useTheme';
import { store } from './store';
import { ROUTES } from './config/routes.config';

// Constants for theme management
const THEME_SETTINGS = {
  TRANSITION_DURATION: 300,
  STORAGE_KEY: 'theme_preference',
  DEFAULT_THEME: 'system'
} as const;

// Role-based access control constants
const ROLES = {
  ADMIN: 'ADMIN',
  COMPANY_USER: 'COMPANY_USER',
  ANALYST: 'ANALYST'
} as const;

// Lazy-loaded page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MetricsPage = lazy(() => import('./pages/MetricsPage'));
const BenchmarksPage = lazy(() => import('./pages/BenchmarksPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/**
 * Error fallback component for error boundary
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" aria-live="assertive">
    <h2>Something went wrong</h2>
    <pre style={{ color: 'red' }}>{error.message}</pre>
  </div>
);

/**
 * Root application component with enhanced theme detection, error handling,
 * and performance monitoring
 */
const App: React.FC = React.memo(() => {
  // Initialize theme management
  const { theme, isDarkMode } = useTheme();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <MainLayout>
              <Suspense
                fallback={
                  <Loading
                    message="Loading content..."
                    size="large"
                    overlay={true}
                    color="primary"
                  />
                }
              >
                <Routes>
                  {/* Public routes */}
                  <Route
                    path="/"
                    element={<Navigate to={ROUTES.DASHBOARD.path} replace />}
                  />
                  <Route path={ROUTES.LOGIN.path} element={<LoginPage />} />

                  {/* Protected routes */}
                  <Route
                    path={ROUTES.DASHBOARD.path}
                    element={
                      <ProtectedRoute allowedRoles={[ROLES.COMPANY_USER, ROLES.ANALYST, ROLES.ADMIN]}>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path={ROUTES.METRICS.path}
                    element={
                      <ProtectedRoute allowedRoles={[ROLES.COMPANY_USER, ROLES.ANALYST, ROLES.ADMIN]}>
                        <MetricsPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path={ROUTES.BENCHMARKS.path}
                    element={
                      <ProtectedRoute allowedRoles={[ROLES.ANALYST, ROLES.ADMIN]}>
                        <BenchmarksPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path={ROUTES.SETTINGS.path}
                    element={
                      <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback route */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </MainLayout>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
});

// Display name for debugging
App.displayName = 'App';

export default App;