import React from 'react'; // react v18.2.0
import { createRoot } from 'react-dom/client'; // react-dom v18.2.0
import { Provider } from 'react-redux'; // react-redux v8.1.0
import { ErrorBoundary } from 'react-error-boundary'; // react-error-boundary v4.0.11
import { ThemeProvider } from '@mui/material'; // @mui/material v5.14.0
import { registerServiceWorker } from 'workbox-registration'; // workbox-registration v7.0.0

// Internal imports
import App from './App';
import { store } from './store/store';
import { useTheme } from './hooks/useTheme';

/**
 * Error fallback component for the root error boundary
 */
const RootErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  const { theme } = useTheme();

  return (
    <div
      role="alert"
      style={{
        padding: '20px',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.error.main
      }}
    >
      <h2>Application Error</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '8px 16px',
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Reload Application
      </button>
    </div>
  );
};

/**
 * Initialize performance monitoring for development
 */
const setupDevelopmentTools = (): void => {
  if (process.env.NODE_ENV === 'development') {
    // Enable React DevTools
    const { whyDidYouUpdate } = require('why-did-you-update');
    whyDidYouUpdate(React);

    // Enable performance monitoring
    const { createBrowserHistory } = require('history');
    const history = createBrowserHistory();
    history.listen(() => {
      if (window.performance && window.performance.memory) {
        console.debug('Memory usage:', {
          usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
        });
      }
    });
  }
};

/**
 * Render the root application with all necessary providers and error boundaries
 */
const renderApp = (): void => {
  const container = document.getElementById('root');
  if (!container) throw new Error('Root element not found');

  const root = createRoot(container);

  // Setup development tools
  setupDevelopmentTools();

  // Configure error reporting
  const onError = (error: Error) => {
    console.error('Application error:', error);
    // Additional error reporting would go here
  };

  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={RootErrorFallback}
        onError={onError}
        onReset={() => window.location.reload()}
      >
        <Provider store={store}>
          <ThemeProvider theme={useTheme().theme}>
            <App />
          </ThemeProvider>
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Register service worker for PWA support
  if (process.env.NODE_ENV === 'production') {
    registerServiceWorker({
      onSuccess: () => console.log('Service Worker registered successfully'),
      onUpdate: () => console.log('New content available; please refresh'),
    });
  }
};

// Initialize application
renderApp();

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    console.log('Hot reloading application...');
    renderApp();
  });
}