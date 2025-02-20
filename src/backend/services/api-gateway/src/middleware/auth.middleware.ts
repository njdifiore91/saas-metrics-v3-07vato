// express ^4.18.2 - Express middleware types and functions
import { Request, Response, NextFunction, RequestHandler } from 'express';
// @grpc/grpc-js ^1.9.0 - gRPC client for auth service communication
import * as grpc from '@grpc/grpc-js';
// rate-limiter-flexible ^2.4.1 - Distributed rate limiting
import { RateLimiterRedis } from 'rate-limiter-flexible';
// circuit-breaker-js ^0.0.1 - Circuit breaker for auth service
import CircuitBreaker from 'circuit-breaker-js';

import { auth, services } from '../config';
import logger from '../utils/logger';

// Constants
const TOKEN_HEADER = 'Authorization';
const TOKEN_PREFIX = 'Bearer';
const MAX_RETRY_ATTEMPTS = 3;
const CIRCUIT_BREAKER_OPTIONS = {
  failureThreshold: 5,
  resetTimeout: 30000
};

// Interfaces
interface TokenValidationResult {
  valid: boolean;
  token: string;
  fingerprint: string;
  error?: string;
}

interface ValidateTokenResponse {
  valid: boolean;
  userId: string;
  role: string;
  permissions: string[];
  context: AuthContext;
  fingerprint: string;
}

interface AuthContext {
  companyId?: string;
  features: string[];
  restrictions: Record<string, unknown>;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
    context: AuthContext;
    fingerprint: string;
  };
  security: {
    correlationId: string;
    sourceIp: string;
    userAgent: string;
  };
}

// Initialize rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: auth.redisClient,
  keyPrefix: 'auth_ratelimit',
  points: 100,
  duration: 60
});

// Initialize circuit breaker
const breaker = new CircuitBreaker(CIRCUIT_BREAKER_OPTIONS);

/**
 * Extracts and validates JWT token from request
 * @param req Express request object
 * @returns Token validation result
 */
async function extractToken(req: Request): Promise<TokenValidationResult> {
  try {
    const authHeader = req.header(TOKEN_HEADER);
    if (!authHeader) {
      return { valid: false, token: '', fingerprint: '', error: 'No authorization header' };
    }

    if (!authHeader.startsWith(TOKEN_PREFIX)) {
      return { valid: false, token: '', fingerprint: '', error: 'Invalid token format' };
    }

    const token = authHeader.slice(TOKEN_PREFIX.length + 1);
    const fingerprint = generateTokenFingerprint(req);

    // Check token blacklist
    const isBlacklisted = await checkTokenBlacklist(token);
    if (isBlacklisted) {
      return { valid: false, token, fingerprint, error: 'Token is blacklisted' };
    }

    return { valid: true, token, fingerprint };
  } catch (error) {
    logger.error('Token extraction error', { error });
    return { valid: false, token: '', fingerprint: '', error: 'Token extraction failed' };
  }
}

/**
 * Validates JWT token using auth service
 * @param token JWT token
 * @param fingerprint Token fingerprint
 * @returns Token validation response
 */
async function validateToken(token: string, fingerprint: string): Promise<ValidateTokenResponse> {
  return new Promise((resolve, reject) => {
    breaker.run(async () => {
      const client = createAuthServiceClient();
      let attempts = 0;

      while (attempts < MAX_RETRY_ATTEMPTS) {
        try {
          const response = await client.validateToken({ token, fingerprint });
          logger.securityEvent('Token validation successful', {
            severity: 'low',
            serviceName: 'api-gateway',
            context: { userId: response.userId }
          });
          return resolve(response);
        } catch (error) {
          attempts++;
          if (attempts === MAX_RETRY_ATTEMPTS) {
            logger.error('Token validation failed after retries', { error });
            return reject(error);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }, reject);
  });
}

/**
 * Authentication middleware
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Generate correlation ID
    req.security = {
      correlationId: generateCorrelationId(),
      sourceIp: req.ip,
      userAgent: req.headers['user-agent'] || ''
    };

    // Check rate limiting
    try {
      await rateLimiter.consume(req.ip);
    } catch (error) {
      logger.securityEvent('Rate limit exceeded', {
        severity: 'medium',
        serviceName: 'api-gateway',
        context: { ip: req.ip }
      });
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    // Extract and validate token
    const tokenResult = await extractToken(req);
    if (!tokenResult.valid) {
      res.status(401).json({ error: tokenResult.error });
      return;
    }

    // Validate token with auth service
    const validation = await validateToken(tokenResult.token, tokenResult.fingerprint);
    if (!validation.valid) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Attach user context to request
    req.user = {
      id: validation.userId,
      role: validation.role,
      permissions: validation.permissions,
      context: validation.context,
      fingerprint: validation.fingerprint
    };

    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Authorization middleware factory
 */
export function authorize(allowedRoles: string[], context?: AuthContext): RequestHandler {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const hasRole = allowedRoles.includes(req.user.role);
      const hasPermissions = checkPermissions(req.user.permissions, context);

      if (!hasRole || !hasPermissions) {
        logger.securityEvent('Authorization denied', {
          severity: 'medium',
          serviceName: 'api-gateway',
          context: { userId: req.user.id, role: req.user.role }
        });
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Authorization error', { error });
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
}

// Helper functions
function createAuthServiceClient(): any {
  return new grpc.Client(
    `${services.auth.host}:${services.auth.port}`,
    grpc.credentials.createInsecure(),
    {
      'grpc.keepalive_time_ms': 10000,
      'grpc.keepalive_timeout_ms': 5000,
      'grpc.keepalive_permit_without_calls': 1
    }
  );
}

function generateTokenFingerprint(req: Request): string {
  return Buffer.from(
    `${req.ip}:${req.headers['user-agent']}:${req.headers['x-forwarded-for'] || ''}`
  ).toString('base64');
}

function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function checkTokenBlacklist(token: string): Promise<boolean> {
  try {
    const result = await auth.redisClient.get(`blacklist:${token}`);
    return !!result;
  } catch (error) {
    logger.error('Token blacklist check failed', { error });
    return false;
  }
}

function checkPermissions(userPermissions: string[], context?: AuthContext): boolean {
  if (!context) return true;
  
  const requiredPermissions = context.features || [];
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
}