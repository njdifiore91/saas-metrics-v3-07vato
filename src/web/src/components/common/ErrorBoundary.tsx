import React from 'react'; // react v18.2.0
import { Notification } from './Notification';
import { NotificationType } from '../../hooks/useNotification';

// Props interface for the ErrorBoundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// State interface for error tracking
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in child components,
 * logs them, and displays a fallback UI with accessibility support.
 * 
 * @implements {React.Component<ErrorBoundaryProps, ErrorBoundaryState>}
 * @version 1.0.0
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  /**
   * Static method to update state when an error occurs
   * @param {Error} error - The error that was caught
   * @returns {ErrorBoundaryState} Updated state with error information
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error: error
    };
  }

  /**
   * Lifecycle method for error logging and monitoring
   * @param {Error} error - The error that was caught
   * @param {React.ErrorInfo} errorInfo - Component stack information
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Sanitize error information for security
    const sanitizedError = {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n') // Limit stack trace for security
    };

    // Log error with component stack for debugging
    console.error('ErrorBoundary caught an error:', {
      error: sanitizedError,
      componentStack: errorInfo.componentStack
    });

    // Track error for analytics (implement your tracking logic here)
    this.trackError(sanitizedError);
  }

  /**
   * Tracks errors for monitoring and analytics
   * @param {Object} error - Sanitized error information
   * @private
   */
  private trackError(error: { name: string; message: string; stack?: string }): void {
    // Implement error tracking/monitoring logic here
    // Example: Send to monitoring service
    try {
      // Analytics tracking code would go here
    } catch (trackingError) {
      // Fail silently to avoid infinite error loops
      console.warn('Error tracking failed:', trackingError);
    }
  }

  /**
   * Renders either the error UI or the children
   * @returns {React.ReactNode} Rendered content
   */
  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback;
      }

      // Default error UI with accessibility support
      return (
        <div role="alert" aria-live="assertive">
          <Notification
            open={true}
            message={error?.message || 'An unexpected error occurred'}
            type={NotificationType.ERROR}
            duration={null} // Keep error visible
            autoHide={false}
            role="alert"
            ariaLabel="Application Error"
          />
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: 'rgba(0, 0, 0, 0.87)'
            }}
            tabIndex={0} // Make focusable for keyboard navigation
          >
            <h2>Something went wrong</h2>
            <p>
              We apologize for the inconvenience. Please try refreshing the page or
              contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                fontSize: '1rem',
                cursor: 'pointer',
                backgroundColor: '#1976d2',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                marginTop: '16px'
              }}
              aria-label="Refresh page"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return children;
  }
}

export default ErrorBoundary;