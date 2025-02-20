// express-rate-limit v6.9.0 - Rate limiting middleware
import rateLimit from 'express-rate-limit';
// rate-limit-redis v3.0.0 - Redis store for rate limiting
import RedisStore from 'rate-limit-redis';
// ioredis v5.3.2 - Redis client with cluster support
import Redis from 'ioredis';
import { Request, Response } from 'express';
import { rateLimits } from '../config';
import logger from '../utils/logger';

// Redis cluster configuration for distributed rate limiting
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'ratelimit:',
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  enableOfflineQueue: true,
  connectionPoolSize: 10
};

// Circuit breaker configuration for Redis failures
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 60000,
  fallbackResponse: 429
};

// Redis client instance
const redisClient = new Redis(REDIS_CONFIG);

// Error handling for Redis connection
redisClient.on('error', (error) => {
  logger.error('Redis connection error:', { error: error.message });
});

redisClient.on('connect', () => {
  logger.info('Redis connected successfully');
});

/**
 * Creates a rate limiter with Redis storage and monitoring
 * @param config Rate limiting configuration
 * @returns Configured rate limiter middleware
 */
const createRateLimiter = (config: typeof rateLimits.public | typeof rateLimits.authenticated | typeof rateLimits.admin) => {
  let failureCount = 0;
  
  const store = new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: REDIS_CONFIG.keyPrefix
  });

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: config.keyGenerator,
    skip: (req: Request) => req.method === 'OPTIONS',
    handler: (req: Request, res: Response) => {
      logger.securityEvent('Rate limit exceeded', {
        severity: 'medium',
        serviceName: 'api-gateway',
        requestId: req.headers['x-request-id'] as string,
        context: {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userId: req.user?.id
        }
      });
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    },
    skip: (req: Request) => {
      // Circuit breaker for Redis failures
      if (failureCount >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
        setTimeout(() => {
          failureCount = 0;
        }, CIRCUIT_BREAKER_CONFIG.resetTimeout);
        return true;
      }
      return false;
    },
    onFailedAttempt: (req: Request) => {
      failureCount++;
      logger.warn('Rate limit store failure', {
        serviceName: 'api-gateway',
        requestId: req.headers['x-request-id'] as string
      });
    },
    // Burst limit handling
    max: (req: Request) => {
      const burstMultiplier = req.headers['x-burst-multiplier'] ? 
        Number(req.headers['x-burst-multiplier']) : 1;
      return Math.min(config.max * burstMultiplier, config.burstLimit);
    }
  });
};

// Public API rate limiter (100/minute with 150 burst)
export const publicRateLimit = createRateLimiter(rateLimits.public);

// Authenticated API rate limiter (1000/hour with 1200 burst)
export const authenticatedRateLimit = createRateLimiter(rateLimits.authenticated);

// Admin API rate limiter (5000/hour with 6000 burst)
export const adminRateLimit = createRateLimiter(rateLimits.admin);