// External imports
// jwt-decode v3.1.2
import jwtDecode from 'jwt-decode';
// crypto-js v4.1.1
import { AES, enc } from 'crypto-js';

// Internal imports
import { apiService } from './api.service';
import { 
  User, 
  AuthTokens, 
  GoogleAuthResponse, 
  JWTPayload,
  UserRole 
} from '../types/auth.types';

// Constants for token and storage management
const TOKEN_STORAGE_KEY = 'encrypted_auth_tokens';
const USER_STORAGE_KEY = 'encrypted_user_data';
const TOKEN_REFRESH_INTERVAL = 300000; // 5 minutes
const TOKEN_EXPIRY_BUFFER = 300000; // 5 minutes buffer before expiry
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-secure-key';

/**
 * AuthService class providing comprehensive authentication management
 * with enhanced security features and session handling
 */
export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  private constructor() {
    this.initializeAuthState();
  }

  /**
   * Get singleton instance of AuthService
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Handle Google OAuth authentication flow
   * @param response - Google OAuth response
   * @returns Promise<User> - Authenticated user data
   */
  public async handleGoogleAuth(response: GoogleAuthResponse): Promise<User> {
    try {
      // Validate OAuth response
      if (!response.code) {
        throw new Error('Invalid OAuth response');
      }

      // Exchange code for tokens
      const authResponse = await apiService.post<GoogleAuthResponse, AuthTokens>(
        '/api/v1/auth/google',
        { code: response.code }
      );

      // Store tokens securely
      this.storeTokens(authResponse.data);

      // Initialize user session
      const user = await this.initializeUserSession(authResponse.data.accessToken);

      return user;
    } catch (error) {
      console.error('Google authentication failed:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication tokens
   * @returns Promise<AuthTokens> - New token pair
   */
  public async refreshTokens(): Promise<AuthTokens> {
    if (this.isRefreshing) {
      throw new Error('Token refresh already in progress');
    }

    try {
      this.isRefreshing = true;
      const tokens = this.getStoredTokens();

      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.post<{ refreshToken: string }, AuthTokens>(
        '/api/v1/auth/refresh',
        { refreshToken: tokens.refreshToken }
      );

      this.storeTokens(response.data);
      this.setupTokenRefresh(response.data);

      return response.data;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get current authenticated user
   * @returns User | null - Current user data
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user has specific role
   * @param role - Role to check
   * @returns boolean - Has role
   */
  public hasRole(role: UserRole): boolean {
    return this.currentUser?.role === role;
  }

  /**
   * Logout current user
   */
  public async logout(): Promise<void> {
    try {
      const tokens = this.getStoredTokens();
      if (tokens?.refreshToken) {
        await apiService.post('/api/v1/auth/logout', { 
          refreshToken: tokens.refreshToken 
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthState();
    }
  }

  /**
   * Initialize authentication state from storage
   */
  private async initializeAuthState(): Promise<void> {
    const tokens = this.getStoredTokens();
    if (tokens?.accessToken) {
      try {
        await this.initializeUserSession(tokens.accessToken);
      } catch (error) {
        this.clearAuthState();
      }
    }
  }

  /**
   * Initialize user session with token
   * @param accessToken - JWT access token
   */
  private async initializeUserSession(accessToken: string): Promise<User> {
    const decoded = jwtDecode<JWTPayload>(accessToken);
    
    // Validate token expiration
    if (decoded.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }

    // Fetch user data
    const response = await apiService.get<User>('/api/v1/auth/me');
    this.currentUser = response.data;

    // Store user data securely
    this.storeUserData(this.currentUser);

    // Setup token refresh
    this.setupTokenRefresh({ accessToken, refreshToken: '', expiresIn: decoded.exp });

    return this.currentUser;
  }

  /**
   * Setup automatic token refresh
   * @param tokens - Auth tokens
   */
  private setupTokenRefresh(tokens: AuthTokens): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const expiresAt = tokens.expiresIn * 1000;
    const refreshTime = expiresAt - Date.now() - TOKEN_EXPIRY_BUFFER;

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTokens().catch(() => this.clearAuthState());
      }, refreshTime);
    }
  }

  /**
   * Store tokens securely
   * @param tokens - Auth tokens to store
   */
  private storeTokens(tokens: AuthTokens): void {
    const encrypted = AES.encrypt(
      JSON.stringify(tokens),
      ENCRYPTION_KEY
    ).toString();
    localStorage.setItem(TOKEN_STORAGE_KEY, encrypted);
  }

  /**
   * Retrieve stored tokens
   * @returns AuthTokens | null - Stored tokens
   */
  private getStoredTokens(): AuthTokens | null {
    const encrypted = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!encrypted) return null;

    try {
      const decrypted = AES.decrypt(encrypted, ENCRYPTION_KEY).toString(enc.Utf8);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Store user data securely
   * @param user - User data to store
   */
  private storeUserData(user: User): void {
    const encrypted = AES.encrypt(
      JSON.stringify(user),
      ENCRYPTION_KEY
    ).toString();
    localStorage.setItem(USER_STORAGE_KEY, encrypted);
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    this.currentUser = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();