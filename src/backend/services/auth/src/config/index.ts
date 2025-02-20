import dotenv from 'dotenv'; // ^16.3.1

// Load environment variables from .env file
dotenv.config();

// Global constants
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const CONFIG_VERSION = '1.0.0';

// Validation functions
const validateJwtConfig = (): boolean => {
  const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;
  
  if (!ACCESS_TOKEN_SECRET || ACCESS_TOKEN_SECRET.length < 32) {
    throw new Error('ACCESS_TOKEN_SECRET must be at least 32 characters long');
  }
  
  if (!REFRESH_TOKEN_SECRET || REFRESH_TOKEN_SECRET.length < 32) {
    throw new Error('REFRESH_TOKEN_SECRET must be at least 32 characters long');
  }

  return true;
};

const validateGoogleConfig = (): boolean => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials are required');
  }

  if (!GOOGLE_REDIRECT_URI || !GOOGLE_REDIRECT_URI.startsWith('https://')) {
    throw new Error('Valid HTTPS redirect URI is required for Google OAuth');
  }

  return true;
};

const validateConfig = (): void => {
  // Validate environment
  if (!['development', 'staging', 'production'].includes(NODE_ENV)) {
    throw new Error('Invalid NODE_ENV specified');
  }

  // Validate required configurations
  validateJwtConfig();
  validateGoogleConfig();
};

// Configuration object
export const config = Object.freeze({
  env: {
    NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    CONFIG_VERSION
  },

  google: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,
    SCOPES: ['openid', 'profile', 'email'],
    TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
    AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
    USER_INFO_ENDPOINT: 'https://www.googleapis.com/oauth2/v3/userinfo',
    RESPONSE_TYPE: 'code',
    GRANT_TYPE: 'authorization_code',
    PKCE_METHOD: 'S256'
  },

  jwt: {
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET!,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,
    ACCESS_TOKEN_EXPIRY: '1h',
    REFRESH_TOKEN_EXPIRY: '30d',
    TOKEN_ISSUER: process.env.JWT_ISSUER || 'startup-metrics-platform',
    TOKEN_AUDIENCE: process.env.JWT_AUDIENCE || 'startup-metrics-users',
    ALGORITHM: 'HS256',
    ROTATION_INTERVAL: '90d'
  },

  server: {
    PORT: parseInt(process.env.AUTH_SERVICE_PORT || '3000', 10),
    HOST: process.env.AUTH_SERVICE_HOST || '0.0.0.0',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://app.startupmetrics.com',
    RATE_LIMIT: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX_REQUESTS: 100,
      SKIP_TRUSTED: true
    },
    TRUSTED_PROXIES: (process.env.TRUSTED_PROXIES || '').split(',').filter(Boolean)
  },

  security: {
    COOKIE_SECRET: process.env.COOKIE_SECRET!,
    COOKIE_SECURE: NODE_ENV === 'production',
    COOKIE_SAME_SITE: 'lax',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
    MIN_PASSWORD_LENGTH: 12,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: '15m'
  }
});

// Validate configuration on module load
validateConfig();

// Default export
export default config;