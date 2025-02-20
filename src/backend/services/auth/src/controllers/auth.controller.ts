import { Request, Response } from 'express';
import helmet from 'helmet'; // ^7.0.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^3.0.0
import winston from 'winston'; // ^3.8.2
import { GoogleOAuthService } from '../services/google-oauth.service';
import { TokenService } from '../services/token.service';
import { User, UserRole } from '../models/user.model';
import { config } from '../config';

/**
 * Controller handling authentication endpoints with enhanced security features
 * @version 1.0.0
 */
export class AuthController {
  private readonly logger: winston.Logger;
  private readonly securityHeaders: Record<string, string>;

  constructor(
    private readonly oauthService: GoogleOAuthService,
    private readonly tokenService: TokenService,
    private readonly rateLimiter: RateLimiterRedis
  ) {
    // Initialize secure logging
    this.logger = winston.createLogger({
      level: config.env.LOG_LEVEL,
      format: winston.format.json(),
      defaultMeta: { service: 'auth-controller' },
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });

    // Configure security headers
    this.securityHeaders = {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  /**
   * Generates secure Google OAuth authorization URL with PKCE
   */
  public async getGoogleAuthUrl(req: Request, res: Response): Promise<void> {
    try {
      // Apply rate limiting
      await this.rateLimiter.consume(req.ip);

      // Set security headers
      Object.entries(this.securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      const authUrl = this.oauthService.generateAuthUrl();

      // Audit logging
      this.logger.info('OAuth URL generated', {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({ url: authUrl });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Handles Google OAuth callback with enhanced security
   */
  public async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;
      const deviceId = req.headers['x-device-id'] as string;

      // Validate required parameters
      if (!code || !state || !deviceId) {
        throw new Error('Missing required parameters');
      }

      // Generate device fingerprint
      const fingerprint = this.generateDeviceFingerprint(req);

      const { tokens, user } = await this.oauthService.authenticateUser(
        code as string,
        state as string,
        deviceId
      );

      // Set secure cookie options
      const cookieOptions = {
        httpOnly: true,
        secure: config.security.COOKIE_SECURE,
        sameSite: config.security.COOKIE_SAME_SITE,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      };

      // Set secure cookies
      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

      // Audit logging
      this.logger.info('User authenticated', {
        userId: user.id,
        ip: req.ip,
        deviceId
      });

      res.status(200).json({
        accessToken: tokens.accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Refreshes access token with security validations
   */
  public async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Apply rate limiting
      await this.rateLimiter.consume(req.ip);

      const refreshToken = req.cookies.refreshToken;
      const deviceId = req.headers['x-device-id'] as string;
      const fingerprint = this.generateDeviceFingerprint(req);

      if (!refreshToken || !deviceId) {
        throw new Error('Missing required parameters');
      }

      // Verify refresh token with device binding
      const tokenPayload = await this.tokenService.verifyRefreshToken(
        refreshToken,
        deviceId,
        fingerprint
      );

      // Generate new access token
      const user: Partial<User> = {
        id: tokenPayload.userId,
        role: UserRole.COMPANY_USER
      };

      const newAccessToken = await this.tokenService.generateAccessToken(user as User);

      // Audit logging
      this.logger.info('Token refreshed', {
        userId: user.id,
        ip: req.ip,
        deviceId
      });

      res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Handles secure user logout process
   */
  public async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        // Revoke refresh token
        await this.tokenService.revokeRefreshToken(refreshToken);

        // Clear secure cookies
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: config.security.COOKIE_SECURE,
          sameSite: config.security.COOKIE_SAME_SITE
        });

        // Audit logging
        this.logger.info('User logged out', {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      }

      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Generates device fingerprint for token security
   */
  private generateDeviceFingerprint(req: Request): string {
    const components = [
      req.headers['user-agent'],
      req.headers['accept-language'],
      req.headers['x-device-id'],
      req.ip
    ];
    return Buffer.from(components.join('|')).toString('base64');
  }

  /**
   * Handles errors with appropriate logging and response
   */
  private handleError(error: unknown, req: Request, res: Response): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log error with context
    this.logger.error('Authentication error', {
      error: errorMessage,
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });

    // Send appropriate error response
    if (error instanceof Error) {
      switch (error.message) {
        case 'Rate limit exceeded':
          res.status(429).json({ error: 'Too many requests' });
          break;
        case 'Token has expired':
          res.status(401).json({ error: 'Token expired' });
          break;
        case 'Invalid token':
          res.status(401).json({ error: 'Invalid authentication' });
          break;
        default:
          res.status(500).json({ error: 'Internal server error' });
      }
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}