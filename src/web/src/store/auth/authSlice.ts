// External imports - @reduxjs/toolkit v1.9.0
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';

// Internal imports
import { User, AuthTokens, GoogleAuthResponse } from '../../types/auth.types';
import { AuthService } from '../../services/auth.service';

// Constants for token management
const TOKEN_REFRESH_BUFFER = 300000; // 5 minutes before expiry
const SESSION_TIMEOUT = 1800000; // 30 minutes of inactivity

// Interface for auth state
interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokenExpiryTimer: NodeJS.Timeout | null;
  lastActivity: number;
}

// Initial state with enhanced security
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tokenExpiryTimer: null,
  lastActivity: Date.now()
};

// Enhanced Google OAuth login with comprehensive error handling
export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async (response: GoogleAuthResponse, { dispatch, rejectWithValue }) => {
    try {
      const authService = AuthService.getInstance();
      const user = await authService.handleGoogleAuth(response);
      
      // Setup token refresh timer
      const tokens = authService.getStoredTokens();
      if (tokens) {
        dispatch(setupTokenRefresh(tokens));
      }

      return user;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Authentication failed');
    }
  }
);

// Automatic token refresh with retry mechanism
export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const authService = AuthService.getInstance();
      const tokens = await authService.refreshTokens();
      
      // Setup new refresh timer
      dispatch(setupTokenRefresh(tokens));
      
      return tokens;
    } catch (error) {
      dispatch(logout());
      return rejectWithValue('Token refresh failed');
    }
  }
);

// Secure logout with cleanup
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState, dispatch }) => {
    try {
      const authService = AuthService.getInstance();
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
);

// Setup token refresh timer
const setupTokenRefresh = createAsyncThunk(
  'auth/setupTokenRefresh',
  async (tokens: AuthTokens, { dispatch }) => {
    const expiresAt = tokens.expiresIn * 1000;
    const refreshTime = expiresAt - Date.now() - TOKEN_REFRESH_BUFFER;

    if (refreshTime > 0) {
      return setTimeout(() => {
        dispatch(refreshAuthToken());
      }, refreshTime);
    }
  }
);

// Enhanced auth slice with comprehensive state management
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    clearTokenTimer: (state) => {
      if (state.tokenExpiryTimer) {
        clearTimeout(state.tokenExpiryTimer);
        state.tokenExpiryTimer = null;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Login handlers
      .addCase(loginWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      
      // Token refresh handlers
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.tokens = action.payload;
        state.lastActivity = Date.now();
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      })
      
      // Logout handlers
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = null;
        state.tokenExpiryTimer = null;
        state.lastActivity = Date.now();
      })
      
      // Token refresh timer setup
      .addCase(setupTokenRefresh.fulfilled, (state, action) => {
        if (state.tokenExpiryTimer) {
          clearTimeout(state.tokenExpiryTimer);
        }
        state.tokenExpiryTimer = action.payload;
      });
  }
});

// Export actions
export const { updateLastActivity, clearTokenTimer } = authSlice.actions;

// Memoized selectors for performance
export const selectUser = createSelector(
  [(state: { auth: AuthState }) => state.auth],
  (auth) => auth.user
);

export const selectIsAuthenticated = createSelector(
  [(state: { auth: AuthState }) => state.auth],
  (auth) => auth.isAuthenticated && 
    (Date.now() - auth.lastActivity < SESSION_TIMEOUT)
);

export const selectAuthError = createSelector(
  [(state: { auth: AuthState }) => state.auth],
  (auth) => auth.error
);

// Export reducer
export default authSlice.reducer;