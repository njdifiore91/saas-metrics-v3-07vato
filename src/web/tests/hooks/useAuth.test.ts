// External imports
import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore, Store } from '@reduxjs/toolkit';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Internal imports
import { useAuth } from '../../src/hooks/useAuth';
import { loginWithGoogle, logout, refreshTokens } from '../../src/store/auth/authSlice';
import { User, AuthTokens, GoogleAuthResponse, UserRole } from '../../src/types/auth.types';

// Mock data
const mockGoogleAuthResponse: GoogleAuthResponse = {
  code: 'test_auth_code',
  scope: 'email profile openid',
  authuser: '0',
  prompt: 'consent'
};

const mockAuthTokens: AuthTokens = {
  accessToken: 'mock_access_token',
  refreshToken: 'mock_refresh_token',
  expiresIn: 3600
};

const mockUser: User = {
  id: 'test_user_id',
  email: 'test@example.com',
  role: UserRole.COMPANY_USER,
  companyId: 'test_company_id',
  preferences: {
    theme: 'light',
    notifications: true,
    defaultDateRange: '30d',
    dashboardLayout: {}
  },
  lastLogin: new Date()
};

// Test utilities
interface TestStore {
  auth: {
    user: User | null;
    tokens: AuthTokens | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
  };
}

const setupTestEnvironment = (initialState?: Partial<TestStore>) => {
  const store = configureStore({
    reducer: {
      auth: (state = {
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...initialState?.auth
      }, action) => state
    }
  });

  const wrapper: React.FC = ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );

  return { store, wrapper };
};

// Test suite
describe('useAuth Hook', () => {
  // Mock timers for token refresh testing
  jest.useFakeTimers();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initial State', () => {
    test('should initialize with default values', () => {
      const { wrapper } = setupTestEnvironment();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBeFalsy();
      expect(result.current.loading).toBeFalsy();
      expect(result.current.error).toBeNull();
    });

    test('should initialize with existing auth state', () => {
      const { wrapper } = setupTestEnvironment({
        auth: {
          user: mockUser,
          tokens: mockAuthTokens,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockAuthTokens);
      expect(result.current.isAuthenticated).toBeTruthy();
    });
  });

  describe('Google Login Flow', () => {
    test('should handle successful Google login', async () => {
      const { wrapper, store } = setupTestEnvironment();
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.handleGoogleLogin(mockGoogleAuthResponse);
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: loginWithGoogle.pending.type,
          payload: mockGoogleAuthResponse
        })
      );
    });

    test('should handle Google login failure', async () => {
      const { wrapper, store } = setupTestEnvironment();
      const error = new Error('Authentication failed');
      jest.spyOn(store, 'dispatch').mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await expect(result.current.handleGoogleLogin(mockGoogleAuthResponse))
          .rejects.toThrow('Authentication failed. Please try again.');
      });
    });

    test('should validate Google OAuth response', async () => {
      const { wrapper } = setupTestEnvironment();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await expect(result.current.handleGoogleLogin({} as GoogleAuthResponse))
          .rejects.toThrow('Invalid OAuth response');
      });
    });
  });

  describe('Token Refresh', () => {
    test('should automatically refresh tokens before expiry', () => {
      const { wrapper, store } = setupTestEnvironment({
        auth: {
          user: mockUser,
          tokens: { ...mockAuthTokens, expiresIn: 600 }, // 10 minutes
          isAuthenticated: true,
          isLoading: false,
          error: null
        }
      });

      const dispatchSpy = jest.spyOn(store, 'dispatch');
      renderHook(() => useAuth(), { wrapper });

      // Advance time to near token expiry
      jest.advanceTimersByTime(300000); // 5 minutes

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: refreshTokens.pending.type
        })
      );
    });

    test('should handle token refresh failure', async () => {
      const { wrapper, store } = setupTestEnvironment({
        auth: {
          user: mockUser,
          tokens: mockAuthTokens,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }
      });

      const error = new Error('Token refresh failed');
      jest.spyOn(store, 'dispatch').mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(result.current.isAuthenticated).toBeFalsy();
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
    });
  });

  describe('Logout', () => {
    test('should handle successful logout', async () => {
      const { wrapper, store } = setupTestEnvironment({
        auth: {
          user: mockUser,
          tokens: mockAuthTokens,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }
      });

      const dispatchSpy = jest.spyOn(store, 'dispatch');
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: logout.pending.type
        })
      );
    });

    test('should clear refresh interval on logout', async () => {
      const { wrapper } = setupTestEnvironment({
        auth: {
          user: mockUser,
          tokens: mockAuthTokens,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('should handle logout failure', async () => {
      const { wrapper, store } = setupTestEnvironment({
        auth: {
          user: mockUser,
          tokens: mockAuthTokens,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }
      });

      const error = new Error('Logout failed');
      jest.spyOn(store, 'dispatch').mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await expect(result.current.handleLogout())
          .rejects.toThrow('Logout failed. Please try again.');
      });
    });
  });
});