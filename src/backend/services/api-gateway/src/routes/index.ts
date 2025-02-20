// express ^4.18.2 - Express web framework routing
import { Router } from 'express';
// cors ^2.8.5 - Enhanced CORS middleware with security configuration
import cors from 'cors';
// helmet ^7.0.0 - Comprehensive security headers middleware
import helmet from 'helmet';
// express-error-handler ^1.1.0 - Advanced error handling with detailed logging
import errorHandler from 'express-error-handler';
// express-request-tracker ^1.0.0 - Request correlation and tracking middleware
import requestTracker from 'express-request-tracker';
// express-rate-limit ^6.7.0 - Distributed rate limiting middleware
import rateLimiter from 'express-rate-limit';

// Internal route imports
import metricsRouter from './metrics.routes';
import benchmarksRouter from './benchmarks.routes';
import companiesRouter from './companies.routes';

// Configuration and utilities
import { config } from '../config';
import logger from '../utils/logger';

// Constants
const API_VERSION = 'v1';
const BASE_PATH = `/api/${API_VERSION}`;
const RATE_LIMIT_WINDOW = 3600000; // 1 hour
const RATE_LIMIT_MAX = 1000;

// Initialize router
const router = Router();

/**
 * Configure comprehensive middleware chain for all routes
 */
const configureMiddleware = (): void => {
  // Request tracking for correlation
  router.use(requestTracker({
    requestIdHeader: 'x-request-id',
    requestIdGenerator: () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }));

  // Security headers
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // CORS configuration
  router.use(cors(config.corsOptions));

  // Rate limiting
  router.use(rateLimiter({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  }));
};

/**
 * Configure API routes with versioning
 */
const configureRoutes = (): void => {
  // Health check endpoint
  router.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      version: config.app.version,
      timestamp: new Date().toISOString()
    });
  });

  // Mount route handlers with versioned paths
  router.use(`${BASE_PATH}/metrics`, metricsRouter);
  router.use(`${BASE_PATH}/benchmarks`, benchmarksRouter);
  router.use(`${BASE_PATH}/companies`, companiesRouter);
};

/**
 * Configure error handling
 */
const configureErrorHandling = (): void => {
  // 404 handler
  router.use((_req, res) => {
    res.status(404).json({ error: 'Resource not found' });
  });

  // Global error handler
  router.use(errorHandler({
    handlers: {
      '4xx': (err: any, _req: any, res: any) => {
        logger.warn('Client error', {
          error: err,
          serviceName: 'api-gateway'
        });
        res.status(err.status || 400).json({
          error: err.message || 'Bad Request'
        });
      },
      '5xx': (err: any, _req: any, res: any) => {
        logger.error('Server error', {
          error: err,
          serviceName: 'api-gateway'
        });
        res.status(err.status || 500).json({
          error: 'Internal Server Error'
        });
      }
    },
    logging: {
      enabled: true,
      logger: logger
    }
  }));
};

// Initialize router configuration
configureMiddleware();
configureRoutes();
configureErrorHandling();

// Export configured router
export default router;