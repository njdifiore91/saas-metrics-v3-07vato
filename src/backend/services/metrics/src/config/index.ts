import dotenv from 'dotenv'; // ^16.3.1

// Load environment variables from .env file
dotenv.config();

// Environment validation function
const validateConfig = (): void => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'METRICS_SERVICE_PORT',
    'NODE_ENV'
  ];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Validate configuration on load
validateConfig();

// Application configuration
export const app = {
  port: parseInt(process.env.METRICS_SERVICE_PORT || '50052', 10),
  env: process.env.NODE_ENV || 'development',
  serviceVersion: 'v1',
  serviceName: 'metrics-service',
  shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10)
};

// Database configuration
export const database = {
  url: process.env.DATABASE_URL,
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '5', 10),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60000', 10),
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000', 10),
  partitioning: {
    enabled: true,
    timeInterval: '1 month',
    retentionPeriod: process.env.METRIC_RETENTION_PERIOD || '12 months'
  }
};

// Metrics configuration
export const metrics = {
  validationRules: {
    ndr: {
      min: 0,
      max: 200,
      type: 'PERCENTAGE',
      precision: 2,
      required: true
    },
    magicNumber: {
      min: 0,
      max: 10,
      type: 'RATIO',
      precision: 2,
      required: true
    },
    cacPayback: {
      min: 0,
      max: 60,
      type: 'MONTHS',
      precision: 1,
      required: true
    },
    pipelineCoverage: {
      min: 1,
      max: 10,
      type: 'RATIO',
      precision: 2,
      required: true
    }
  },
  calculationPeriods: {
    default: 'monthly',
    allowed: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    aggregationRules: {
      daily: 'sum',
      weekly: 'average',
      monthly: 'average',
      quarterly: 'average',
      yearly: 'average'
    }
  },
  caching: {
    enabled: process.env.ENABLE_METRIC_CACHE === 'true',
    ttl: parseInt(process.env.METRIC_CACHE_TTL || '3600', 10),
    maxSize: parseInt(process.env.METRIC_CACHE_MAX_SIZE || '1000', 10),
    invalidationRules: {
      onUpdate: true,
      onDelete: true,
      maxAge: parseInt(process.env.METRIC_CACHE_MAX_AGE || '86400', 10)
    }
  },
  batchProcessing: {
    enabled: true,
    batchSize: parseInt(process.env.METRIC_BATCH_SIZE || '1000', 10),
    processingInterval: parseInt(process.env.METRIC_PROCESSING_INTERVAL || '60000', 10)
  }
};

// Logging configuration
export const logging = {
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
  colorize: process.env.LOG_COLORIZE === 'true',
  logRequests: process.env.LOG_REQUESTS === 'true',
  logMetrics: process.env.LOG_METRICS === 'true',
  logErrors: true
};

// Export default configuration object
export default {
  app,
  database,
  metrics,
  logging
};