import jwt from 'jsonwebtoken'; // ^9.0.2
import ms from 'ms'; // ^2.1.3
import { createClient } from 'redis'; // ^4.6.7
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { jwt as jwtConfig } from '../config';
import { User, UserRole } from '../models/user.model';
import { encryptData, decryptData } from '../utils/encryption';

// Initialize Redis client for token blacklist
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

// Types for token payloads
interface AccessTokenPayload {
  userId: string;
  role: UserRole;
  companyId: string;
  version: string;
  type: 'access';
}

interface RefreshTokenPayload {
  userId: string;
  deviceId: string;
  fingerprint: string;
  rotationCounter: number;
  type: 'refresh';
}

interface TokenMetadata {
  jti: string;
  iat: number;
  exp: number;
}

/**
 * Generates a secure JWT access token for authenticated users
 * @param user - User object containing id, role, and companyId
 * @returns Promise resolving to signed JWT access token
 */
export async function generateAccessToken(user: User): Promise<string> {
  const jti = uuidv4();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ms(jwtConfig.ACCESS_TOKEN_EXPIRY) / 1000;

  const payload: AccessTokenPayload & TokenMetadata = {
    userId: user.id,
    role: user.role,
    companyId: user.companyId,
    version: '1.0',
    type: 'access',
    jti,
    iat,
    exp
  };

  return jwt.sign(payload, jwtConfig.ACCESS_TOKEN_SECRET, {
    algorithm: jwtConfig.ALGORITHM,
    issuer: jwtConfig.TOKEN_ISSUER,
    audience: jwtConfig.TOKEN_AUDIENCE
  });
}

/**
 * Generates an encrypted refresh token with device fingerprinting
 * @param user - User object for token generation
 * @param deviceId - Unique device identifier
 * @param fingerprint - Device fingerprint hash
 * @returns Promise resolving to signed and encrypted refresh token
 */
export async function generateRefreshToken(
  user: User,
  deviceId: string,
  fingerprint: string
): Promise<string> {
  const jti = uuidv4();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ms(jwtConfig.REFRESH_TOKEN_EXPIRY) / 1000;

  const sensitiveData = {
    userId: user.id,
    deviceId,
    fingerprint,
    rotationCounter: 0
  };

  const encryptedData = encryptData(JSON.stringify(sensitiveData), jwtConfig.REFRESH_TOKEN_SECRET);

  const payload: Partial<RefreshTokenPayload> & TokenMetadata = {
    type: 'refresh',
    jti,
    iat,
    exp,
    ...encryptedData
  };

  return jwt.sign(payload, jwtConfig.REFRESH_TOKEN_SECRET, {
    algorithm: jwtConfig.ALGORITHM,
    issuer: jwtConfig.TOKEN_ISSUER,
    audience: jwtConfig.TOKEN_AUDIENCE
  });
}

/**
 * Verifies and decodes a JWT access token
 * @param token - JWT access token to verify
 * @returns Promise resolving to decoded token payload
 * @throws Error if token is invalid or expired
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const decoded = jwt.verify(token, jwtConfig.ACCESS_TOKEN_SECRET, {
      algorithms: [jwtConfig.ALGORITHM],
      issuer: jwtConfig.TOKEN_ISSUER,
      audience: jwtConfig.TOKEN_AUDIENCE
    }) as AccessTokenPayload & TokenMetadata;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Verifies, decrypts, and validates a refresh token
 * @param token - Refresh token to verify
 * @param deviceId - Device identifier to validate
 * @param fingerprint - Device fingerprint to validate
 * @returns Promise resolving to decoded token payload
 * @throws Error if token is invalid, expired, or fingerprint mismatch
 */
export async function verifyRefreshToken(
  token: string,
  deviceId: string,
  fingerprint: string
): Promise<RefreshTokenPayload> {
  try {
    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    const decoded = jwt.verify(token, jwtConfig.REFRESH_TOKEN_SECRET, {
      algorithms: [jwtConfig.ALGORITHM],
      issuer: jwtConfig.TOKEN_ISSUER,
      audience: jwtConfig.TOKEN_AUDIENCE
    }) as any;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Decrypt sensitive payload data
    const decryptedData = JSON.parse(
      decryptData(
        {
          encrypted: decoded.encrypted,
          iv: Buffer.from(decoded.iv),
          tag: Buffer.from(decoded.tag)
        },
        jwtConfig.REFRESH_TOKEN_SECRET
      )
    );

    // Validate device fingerprint
    if (decryptedData.deviceId !== deviceId || decryptedData.fingerprint !== fingerprint) {
      throw new Error('Device fingerprint mismatch');
    }

    return decryptedData;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Revokes a refresh token by adding it to Redis blacklist
 * @param token - Refresh token to revoke
 * @returns Promise resolving when token is blacklisted
 * @throws Error if token blacklisting fails
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const decoded = jwt.decode(token) as TokenMetadata;
    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token format');
    }

    const timeToExpiry = decoded.exp - Math.floor(Date.now() / 1000);
    if (timeToExpiry <= 0) {
      throw new Error('Token has already expired');
    }

    await redisClient.setEx(
      `blacklist:${token}`,
      timeToExpiry,
      'revoked'
    );
  } catch (error) {
    throw new Error(`Failed to revoke token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}