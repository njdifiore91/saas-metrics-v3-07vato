// External imports - react v18.2.0
import { useCallback, useEffect, useRef } from 'react';
// External imports - react-redux v8.0.5
import { useDispatch, useSelector } from 'react-redux';

// Internal imports
import { 
  loginWithGoogle, 
  logout, 
  refreshTokens, 
  selectAuth 
} from '../store/auth/authSlice';
import { 
  User, 
  AuthTokens, 
  GoogleAuthResponse 
} from '../types/auth.types';

// Constants for token management
const TOKEN_REFRESH_BUFFER = 300000; // 5 minutes before expiry
const REFRESH_CHECK_INTERVAL = 60000; // Check every minute

/**
 * Custom hook for managing authentication state and operations
 * Provides comprehensive authentication functionality with automatic token refresh
 * @returns Authentication state and methods
 */
export const useAuth = () => {
  // Initialize Redux hooks with type safety
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  
  // Refs for cleanup and state management
  const refreshInterval = useRef<NodeJS.Timeout>();
  const isRefreshing = useRef(false);

  /**
   * Handle Google OAuth login process
   * @param response - Validated Google OAuth response
   */
  const handleGoogleLogin = useCallback(async (response: GoogleAuthResponse) => {
    try {
      // Validate response structure
      if (!response?.code) {
        throw new Error('Invalid OAuth response');
      }

      // Dispatch login action with response data
      await dispatch(loginWithGoogle(response)).unwrap();
    } catch (error) {
      console.error('Google login failed:', error);
      throw new Error('Authentication failed. Please try again.');
    }
  }, [dispatch]);

  /**
   * Handle user logout with cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      // Clear refresh interval
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = undefined;
      }

      // Dispatch logout action
      await dispatch(logout()).unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
      throw new Error('Logout failed. Please try again.');
    }
  }, [dispatch]);

  /**
   * Refresh authentication tokens with retry mechanism
   */
  const refreshAuthTokens = useCallback(async () => {
    if (isRefreshing.current || !auth.tokens) {
      return;
    }

    try {
      isRefreshing.current = true;
      const expiresAt = auth.tokens.expiresIn * 1000;
      const now = Date.now();

      // Check if refresh is needed
      if (expiresAt - now <= TOKEN_REFRESH_BUFFER) {
        await dispatch(refreshTokens()).unwrap();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Logout on refresh failure
      await handleLogout();
    } finally {
      isRefreshing.current = false;
    }
  }, [auth.tokens, dispatch, handleLogout]);

  /**
   * Setup token refresh interval and initial check
   */
  useEffect(() => {
    if (auth.isAuthenticated && auth.tokens) {
      // Perform initial token refresh check
      refreshAuthTokens();

      // Setup refresh interval
      refreshInterval.current = setInterval(() => {
        refreshAuthTokens();
      }, REFRESH_CHECK_INTERVAL);

      // Cleanup on unmount or auth state change
      return () => {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current);
          refreshInterval.current = undefined;
        }
      };
    }
  }, [auth.isAuthenticated, auth.tokens, refreshAuthTokens]);

  /**
   * Return authentication state and methods
   */
  return {
    user: auth.user as User | null,
    tokens: auth.tokens as AuthTokens | null,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.isLoading,
    error: auth.error,
    handleGoogleLogin,
    handleLogout
  };
};

// Type definitions for hook return value
export interface UseAuthReturn {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  handleGoogleLogin: (response: GoogleAuthResponse) => Promise<void>;
  handleLogout: () => Promise<void>;
}

// Default export
export default useAuth;