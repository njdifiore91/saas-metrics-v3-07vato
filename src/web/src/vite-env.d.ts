/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables used in the Startup Metrics Benchmarking Platform.
 * Provides strict typing and IntelliSense support for critical application configuration.
 * @version 4.3.9
 */
interface ImportMetaEnv {
  /**
   * Backend API endpoint URL for service communication
   * @example 'https://api.startupmetrics.com'
   * @security Ensure this is properly configured per environment
   */
  readonly VITE_API_URL: string;

  /**
   * Google OAuth client ID for authentication integration
   * @example '123456789-abcdef.apps.googleusercontent.com'
   * @security Keep this value secure and never expose in client-side code
   */
  readonly VITE_GOOGLE_CLIENT_ID: string;

  /**
   * Current deployment environment identifier
   * @example 'production' | 'staging' | 'development'
   */
  readonly VITE_ENVIRONMENT: string;

  /**
   * Application version from package.json
   * @example '1.0.0'
   */
  readonly VITE_APP_VERSION: string;
}

/**
 * Type augmentation for Vite's ImportMeta interface
 * Ensures proper typing for import.meta.env throughout the application
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Global constant for application version
 * Injected at build time by Vite
 */
declare const __APP_VERSION__: string;

// Prevent auto-complete from suggesting NodeJS types
// when working with browser-only code
declare interface Window {
  // Add any custom window properties here if needed
}