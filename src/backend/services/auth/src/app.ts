import express, { Application, Request, Response, NextFunction } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import cookieParser from 'cookie-parser'; // ^1.4.6
import rateLimit from 'express-rate-limit'; // ^6.9.0
import compression from 'compression'; // ^1.7.4
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^3.0.0
import { createClient } from 'redis'; // ^4.6.7

import { config } from './config';
import { AuthController } from './controllers/auth.controller';
import { authenticateToken, requireRole } from './middleware/jwt.middleware';
import { GoogleOAuthService } from './services/google-oauth.service';
import { TokenService } from './services/token.service';
import { UserRole } from './models/user.model';

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
  }
});

redisClient.connect().catch(console.error);

// Configure rate limiter
const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'auth_limit',
  points: 100, // Number of requests
  duration: 60 * 60, // Per hour
  blockDuration: 60 * 60 // Block for 1 hour
});

// Initialize application
const app: Application = express();

// Setup middleware with enhanced security
const setupMiddleware = (app: Application): void => {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://accounts.google.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: config.server.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Request parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser(config.security.COOKIE_SECRET));

  // Compression
  app.use(compression());

  // Request ID
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.headers['x-request-id'] = uuidv4();
    next();
  });

  // Global rate limiting
  app.use(rateLimit({
    windowMs: config.server.RATE_LIMIT.WINDOW_MS,
    max: config.server.RATE_LIMIT.MAX_REQUESTS,
    skipSuccessfulRequests: false,
    message: { error: 'Too many requests, please try again later' }
  }));
};

// Setup authentication routes
const setupRoutes = (app: Application, authController: AuthController): void => {
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Authentication routes
  app.get('/auth/google', 
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await authLimiter.consume(req.ip);
        next();
      } catch {
        res.status(429).json({ error: 'Too many login attempts' });
      }
    },
    authController.getGoogleAuthUrl.bind(authController)
  );

  app.get('/auth/google/callback',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await authLimiter.consume(req.ip);
        next();
      } catch {
        res.status(429).json({ error: 'Too many login attempts' });
      }
    },
    authController.handleGoogleCallback.bind(authController)
  );

  app.post('/auth/refresh',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await authLimiter.consume(req.ip);
        next();
      } catch {
        res.status(429).json({ error: 'Too many refresh attempts' });
      }
    },
    authController.refreshToken.bind(authController)
  );

  app.post('/auth/logout',
    authenticateToken,
    authController.logout.bind(authController)
  );

  // Protected route example
  app.get('/auth/profile',
    authenticateToken,
    requireRole([UserRole.COMPANY_USER, UserRole.ANALYST, UserRole.ADMIN]),
    (req: Request, res: Response) => {
      res.status(200).json({ message: 'Protected profile access successful' });
    }
  );
};

// Setup error handling
const setupErrorHandling = (app: Application): void => {
  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);

    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({
      error: 'Internal server error',
      ...(config.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
};

// Start server function
const startServer = async (app: Application): Promise<void> => {
  try {
    // Initialize services
    const tokenService = new TokenService();
    const googleOAuthService = new GoogleOAuthService(tokenService);
    const authController = new AuthController(googleOAuthService, tokenService, authLimiter);

    // Setup application
    setupMiddleware(app);
    setupRoutes(app, authController);
    setupErrorHandling(app);

    // Start listening
    app.listen(config.server.PORT, config.server.HOST, () => {
      console.log(`Auth service listening on ${config.server.HOST}:${config.server.PORT}`);
      console.log(`Environment: ${config.env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      redisClient.quit();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Initialize server
startServer(app).catch(console.error);

// Export for testing
export default app;