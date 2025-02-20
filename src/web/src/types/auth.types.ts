/**
 * Authentication type definitions for the Startup Metrics Platform
 * @version 1.0.0
 */

/**
 * Enumeration of available user roles for role-based access control
 */
export enum UserRole {
  COMPANY_USER = 'COMPANY_USER',
  ANALYST = 'ANALYST',
  ADMIN = 'ADMIN'
}

/**
 * Interface for authentication token pairs returned from OAuth flow
 * Includes both access and refresh tokens with expiration
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Interface representing the response data structure from Google OAuth 2.0
 * Based on Google OAuth 2.0 specification
 */
export interface GoogleAuthResponse {
  code: string;
  scope: string;
  authuser: string;
  prompt: string;
}

/**
 * Interface for user preference settings that can be customized
 */
export interface UserPreferences {
  theme: string;
  notifications: boolean;
  defaultDateRange: string;
  dashboardLayout: {
    [key: string]: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  };
}

/**
 * Interface representing a user in the system
 * Contains core user data and associated preferences
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  companyId: string;
  preferences: UserPreferences;
  lastLogin: Date;
}

/**
 * Interface for JWT token payload structure
 * Contains essential user information and token metadata
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string;
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}