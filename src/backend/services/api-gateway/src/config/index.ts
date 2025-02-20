// dotenv v16.3.1 - Load environment variables
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Validate required environment configuration
const validateConfig = (): void => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_OAUTH_REDIRECT_URI'
  ];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Load and validate configuration
validateConfig();

// Application constants
const app = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  apiVersion: 'v1',
  name: 'startup-metrics-api-gateway',
  version: '1.0.0'
};

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Rate-Limit'],
  credentials: true,
  maxAge: 3600
};

// Authentication and security configuration
const security = {
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiryTime: 3600, // 1 hour
    refreshTokenExpiryTime: 2592000, // 30 days
    tokenRotationInterval: 86400 // 24 hours
  },
  session: {
    maxSessionsPerUser: 5
  },
  googleOAuth: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    scopes: ['profile', 'email'],
    responseType: 'code',
    grantType: 'authorization_code'
  },
  policies: {
    enableBruteForceProtection: true,
    maxLoginAttempts: 5,
    lockoutDuration: 900, // 15 minutes
    password: {
      minLength: 12,
      requireNumbers: true,
      requireSpecialChars: true,
      requireUppercase: true,
      maxAge: 90 // days
    }
  }
};

// Microservice endpoints configuration
const services = {
  auth: {
    host: process.env.AUTH_SERVICE_HOST || 'localhost',
    port: process.env.AUTH_SERVICE_PORT || 50051,
    timeout: 5000,
    retries: 3,
    healthCheck: '/health',
    circuit: {
      threshold: 0.5,
      windowSize: 60000 // 1 minute
    }
  },
  metrics: {
    host: process.env.METRICS_SERVICE_HOST || 'localhost',
    port: process.env.METRICS_SERVICE_PORT || 50052,
    timeout: 10000,
    retries: 3,
    healthCheck: '/health',
    circuit: {
      threshold: 0.5,
      windowSize: 60000
    }
  },
  benchmark: {
    host: process.env.BENCHMARK_SERVICE_HOST || 'localhost',
    port: process.env.BENCHMARK_SERVICE_PORT || 50053,
    timeout: 15000,
    retries: 3,
    healthCheck: '/health',
    circuit: {
      threshold: 0.5,
      windowSize: 60000
    }
  }
};

// Rate limiting configuration
const rateLimits = {
  public: {
    windowMs: 60000, // 1 minute
    max: 100,
    burstLimit: 150,
    message: 'Too many requests from this IP',
    headers: true,
    keyGenerator: (req: any) => req.ip
  },
  authenticated: {
    windowMs: 3600000, // 1 hour
    max: 1000,
    burstLimit: 1200,
    message: 'Rate limit exceeded',
    headers: true,
    keyGenerator: (req: any) => req.user.id
  },
  admin: {
    windowMs: 3600000,
    max: 5000,
    burstLimit: 6000,
    message: 'Admin rate limit exceeded',
    headers: true,
    keyGenerator: (req: any) => req.user.id
  }
};

// Logging configuration
const logging = {
  level: process.env.LOG_LEVEL || 'info',
  format: 'combined',
  rotation: {
    interval: '1d',
    maxFiles: 30,
    maxSize: '100m'
  },
  categories: {
    default: 'info',
    http: 'info',
    security: 'warn',
    performance: 'debug'
  }
};

// Monitoring configuration
const monitoring = {
  metrics: {
    enabled: true,
    interval: 60000, // 1 minute
    prefix: 'api_gateway_',
    labels: ['service', 'endpoint', 'method']
  },
  tracing: {
    enabled: true,
    serviceName: 'api-gateway',
    samplingRate: 0.1 // 10% sampling
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000,
    path: '/health'
  }
};

// Export configuration object
export const config = {
  app,
  corsOptions,
  security,
  services,
  rateLimits,
  logging,
  monitoring
};

// Export individual configuration sections for selective imports
export const {
  app: appConfig,
  corsOptions: cors,
  security: securityConfig,
  services: serviceConfig,
  rateLimits: rateLimitConfig,
  logging: loggingConfig,
  monitoring: monitoringConfig
} = config;

// Default export
export default config;