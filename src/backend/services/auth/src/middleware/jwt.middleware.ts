import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';
import { jwt as jwtConfig } from '../config';
import { TokenService } from '../services/token.service';
import { UserRole } from '../models/user.model';

// Initialize Redis client for rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

// Configure rate limiter for token refresh
const refreshRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'refresh_limit',
  points: 5, // Number of refresh attempts
  duration: 60 * 15, // Per 15 minutes
  blockDuration: 60 * 60 // Block for 1 hour on limit exceed
});

// Custom error types
class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
    companyId: string;
  };
}

/**
 * Middleware to authenticate JWT access tokens
 * Implements comprehensive token validation with security checks
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Verify the access token
    const decoded = await TokenService.verifyAccessToken(token);

    // Validate token claims
    if (decoded.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    // Attach user information to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      companyId: decoded.companyId
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  }
};

/**
 * Role-based access control middleware factory
 * Supports hierarchical role checking with audit logging
 */
export const requireRole = (allowedRoles: UserRole[]): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Check if user's role is allowed
      const hasPermission = allowedRoles.includes(user.role);

      // Handle admin override
      if (user.role === UserRole.ADMIN) {
        next();
        return;
      }

      if (!hasPermission) {
        throw new AuthenticationError('Insufficient permissions');
      }

      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Authorization check failed' });
      }
    }
  };
};

/**
 * Token refresh middleware with rate limiting and security measures
 * Implements comprehensive refresh token validation and rotation
 */
export const refreshTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Apply rate limiting
    await refreshRateLimiter.consume(req.ip);

    const { refreshToken, deviceId, fingerprint } = req.body;

    if (!refreshToken || !deviceId || !fingerprint) {
      throw new AuthenticationError('Missing required refresh parameters');
    }

    // Verify refresh token with device binding
    const decoded = await TokenService.verifyRefreshToken(
      refreshToken,
      deviceId,
      fingerprint
    );

    // Generate new token pair
    const user = {
      id: decoded.userId,
      role: decoded.role,
      companyId: decoded.companyId
    };

    const newTokens = await TokenService.generateTokenPair(user, deviceId, fingerprint);

    // Blacklist the used refresh token
    await TokenService.blacklistToken(refreshToken);

    // Return new tokens
    res.json({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }
};