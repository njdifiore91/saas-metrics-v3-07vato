import { lazy, Suspense } from 'react'; // react v18.2.0
import { RouteObject } from 'react-router-dom'; // react-router-dom v6.14.0
import { ErrorBoundary } from '@sentry/react'; // @sentry/react v7.0.0

// Internal imports
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { UserRole } from '../types/auth.types';
import Loading from '../components/common/Loading';

// Route path constants with analytics metadata
export const ROUTES = {
  LOGIN: {
    path: '/login',
    analyticsId: 'login_page',
    requiresAuth: false
  },
  DASHBOARD: {
    path: '/dashboard',
    analyticsId: 'dashboard_page',
    requiresAuth: true,
    allowedRoles: [UserRole.COMPANY_USER, UserRole.ANALYST, UserRole.ADMIN]
  },
  METRICS: {
    path: '/metrics',
    analyticsId: 'metrics_page',
    requiresAuth: true,
    allowedRoles: [UserRole.COMPANY_USER, UserRole.ANALYST, UserRole.ADMIN]
  },
  BENCHMARKS: {
    path: '/benchmarks',
    analyticsId: 'benchmarks_page',
    requiresAuth: true,
    allowedRoles: [UserRole.ANALYST, UserRole.ADMIN]
  },
  SETTINGS: {
    path: '/settings',
    analyticsId: 'settings_page',
    requiresAuth: true,
    allowedRoles: [UserRole.COMPANY_USER, UserRole.ADMIN]
  },
  COMPANY_PROFILE: {
    path: '/company',
    analyticsId: 'company_profile_page',
    requiresAuth: true,
    allowedRoles: [UserRole.COMPANY_USER, UserRole.ADMIN]
  },
  NOT_FOUND: {
    path: '*',
    analyticsId: '404_page',
    requiresAuth: false
  }
} as const;

// Lazy-loaded page components with error boundaries
const LoginPage = lazy(() => import('../pages/LoginPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const MetricsPage = lazy(() => import('../pages/MetricsPage'));
const BenchmarksPage = lazy(() => import('../pages/BenchmarksPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const CompanyProfilePage = lazy(() => import('../pages/CompanyProfilePage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// Loading component for lazy-loaded routes
const RouteLoadingFallback = () => (
  <Loading 
    message="Loading page..." 
    size="large" 
    overlay={true}
    color="primary"
  />
);

// Error boundary fallback component
const RouteErrorFallback = ({ error }: { error: Error }) => (
  <div>
    <h1>Error loading page</h1>
    <p>{error.message}</p>
  </div>
);

/**
 * Generates the application route configuration with protected routes,
 * role-based access control, and performance optimization
 * @returns Array of route configuration objects
 */
export const getRouteConfig = (): RouteObject[] => [
  {
    path: ROUTES.LOGIN.path,
    element: (
      <ErrorBoundary fallback={RouteErrorFallback}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <LoginPage />
        </Suspense>
      </ErrorBoundary>
    )
  },
  {
    path: ROUTES.DASHBOARD.path,
    element: (
      <ErrorBoundary fallback={RouteErrorFallback}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <ProtectedRoute allowedRoles={ROUTES.DASHBOARD.allowedRoles}>
            <DashboardPage />
          </ProtectedRoute>
        </Suspense>
      </ErrorBoundary>
    )
  },
  {
    path: ROUTES.METRICS.path,
    element: (
      <ErrorBoundary fallback={RouteErrorFallback}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <ProtectedRoute allowedRoles={ROUTES.METRICS.allowedRoles}>
            <MetricsPage />
          </ProtectedRoute>
        </Suspense>
      </ErrorBoundary>
    )
  },
  {
    path: ROUTES.BENCHMARKS.path,
    element: (
      <ErrorBoundary fallback={RouteErrorFallback}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <ProtectedRoute allowedRoles={ROUTES.BENCHMARKS.allowedRoles}>
            <BenchmarksPage />
          </ProtectedRoute>
        </Suspense>
      </ErrorBoundary>
    )
  },
  {
    path: ROUTES.SETTINGS.path,
    element: (
      <ErrorBoundary fallback={RouteErrorFallback}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <ProtectedRoute allowedRoles={ROUTES.SETTINGS.allowedRoles}>
            <SettingsPage />
          </ProtectedRoute>
        </Suspense>
      </ErrorBoundary>
    )
  },
  {
    path: ROUTES.COMPANY_PROFILE.path,
    element: (
      <ErrorBoundary fallback={RouteErrorFallback}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <ProtectedRoute allowedRoles={ROUTES.COMPANY_PROFILE.allowedRoles}>
            <CompanyProfilePage />
          </ProtectedRoute>
        </Suspense>
      </ErrorBoundary>
    )
  },
  {
    path: ROUTES.NOT_FOUND.path,
    element: (
      <ErrorBoundary fallback={RouteErrorFallback}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <NotFoundPage />
        </Suspense>
      </ErrorBoundary>
    )
  }
];