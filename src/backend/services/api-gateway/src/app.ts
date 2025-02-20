// express ^4.18.2 - Express web framework
import express, { Request, Response, NextFunction } from 'express';
// cors ^2.8.5 - CORS middleware
import cors from 'cors';
// helmet ^7.0.0 - Security headers middleware
import helmet from 'helmet';
// compression ^1.7.4 - Response compression
import compression from 'compression';
// morgan ^1.10.0 - HTTP request logging
import morgan from 'morgan';

// Internal imports
import router from './routes';
import { config } from './config';
import logger from './utils/logger';
import { authenticate } from './middleware/auth.middleware';
import { publicRateLimit, authenticatedRateLimit } from './middleware/rateLimit.middleware';

// Initialize Express application
const app = express();

/**
 * Configures global middleware stack with security, monitoring, and performance features
 */
function configureMiddleware(): void {
  // Security headers with strict CSP
  app.use(helmet({
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
  app.use(cors(config.corsOptions));

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Response compression
  app.use(compression());

  // Request logging with correlation IDs
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim(), {
          serviceName: 'api-gateway',
          category: 'http'
        });
      }
    }
  }));

  // Request correlation ID
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || 
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
  });
}

/**
 * Configures API routes with authentication, validation, and error handling
 */
function configureRoutes(): void {
  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      version: config.app.version,
      timestamp: new Date().toISOString()
    });
  });

  // Public routes with rate limiting
  app.use('/api/v1/public', publicRateLimit, router);

  // Protected routes with authentication and rate limiting
  app.use('/api/v1', authenticate, authenticatedRateLimit, router);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Resource not found' });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.status || 500;
    const errorMessage = err.message || 'Internal Server Error';

    logger.error('Request error', {
      error: err,
      serviceName: 'api-gateway',
      requestId: req.headers['x-request-id'],
      context: {
        path: req.path,
        method: req.method,
        userId: (req as any).user?.id
      }
    });

    res.status(statusCode).json({
      error: errorMessage,
      requestId: req.headers['x-request-id'],
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
}

/**
 * Starts the Express server with advanced error handling and logging
 */
async function startServer(): Promise<void> {
  try {
    // Configure middleware and routes
    configureMiddleware();
    configureRoutes();

    // Start server
    const server = app.listen(config.app.port, () => {
      logger.info('API Gateway started', {
        serviceName: 'api-gateway',
        context: {
          port: config.app.port,
          env: config.app.env,
          version: config.app.version
        }
      });
    });

    // Graceful shutdown handling
    const shutdown = async () => {
      logger.info('Shutting down API Gateway...', {
        serviceName: 'api-gateway'
      });

      server.close(() => {
        logger.info('Server closed', {
          serviceName: 'api-gateway'
        });
        process.exit(0);
      });

      // Force close after timeout
      setTimeout(() => {
        logger.error('Forced shutdown after timeout', {
          serviceName: 'api-gateway'
        });
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start API Gateway', {
      error,
      serviceName: 'api-gateway'
    });
    process.exit(1);
  }
}

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;