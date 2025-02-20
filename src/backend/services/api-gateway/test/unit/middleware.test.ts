// jest ^29.6.2 - Testing framework
import { jest } from '@jest/globals';
// supertest ^6.3.3 - HTTP testing
import request from 'supertest';
// express ^4.18.2 - Express types
import { Request, Response, NextFunction } from 'express';
// ioredis-mock ^8.9.0 - Redis mock
import RedisMock from 'ioredis-mock';

import { 
  validateToken, 
  extractToken 
} from '../../src/middleware/auth.middleware';
import { 
  checkRole, 
  validatePermissions 
} from '../../src/middleware/auth.middleware';
import { 
  publicRateLimit, 
  authenticatedRateLimit, 
  adminRateLimit 
} from '../../src/middleware/rateLimit.middleware';

// Mock Redis client
jest.mock('ioredis', () => require('ioredis-mock'));

// Test helper classes
class MockRequest {
  headers: Record<string, string>;
  user?: any;
  ip: string;
  method: string;
  path: string;

  constructor(options: {
    token?: string;
    role?: string;
    permissions?: string[];
    ip?: string;
  } = {}) {
    this.headers = {
      'authorization': options.token ? `Bearer ${options.token}` : '',
      'user-agent': 'test-agent',
      'x-forwarded-for': '127.0.0.1'
    };
    if (options.role) {
      this.user = {
        id: 'test-user',
        role: options.role,
        permissions: options.permissions || []
      };
    }
    this.ip = options.ip || '127.0.0.1';
    this.method = 'GET';
    this.path = '/api/test';
  }
}

class MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;

  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = null;
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(body: any) {
    this.body = body;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name] = value;
    return this;
  }
}

describe('Authentication Middleware', () => {
  const validToken = 'valid.jwt.token';
  const expiredToken = 'expired.jwt.token';
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Token Extraction', () => {
    it('should extract valid token from Authorization header', async () => {
      const req = new MockRequest({ token: validToken });
      const result = await extractToken(req as unknown as Request);
      expect(result.valid).toBe(true);
      expect(result.token).toBe(validToken);
    });

    it('should reject invalid token format', async () => {
      const req = new MockRequest();
      req.headers.authorization = 'Invalid token';
      const result = await extractToken(req as unknown as Request);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });

    it('should handle missing Authorization header', async () => {
      const req = new MockRequest();
      delete req.headers.authorization;
      const result = await extractToken(req as unknown as Request);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No authorization header');
    });
  });

  describe('Token Validation', () => {
    it('should validate token and set user context', async () => {
      const req = new MockRequest({ token: validToken });
      const res = new MockResponse();
      
      await validateToken(validToken, 'test-fingerprint');
      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should reject expired tokens', async () => {
      const req = new MockRequest({ token: expiredToken });
      const res = new MockResponse();
      
      await validateToken(expiredToken, 'test-fingerprint');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });

    it('should handle token validation service failures', async () => {
      const req = new MockRequest({ token: validToken });
      const res = new MockResponse();
      
      // Simulate service failure
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Service unavailable'));
      
      await validateToken(validToken, 'test-fingerprint');
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Authentication failed');
    });
  });
});

describe('Authorization Middleware', () => {
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Role Validation', () => {
    it('should allow access for users with valid role', async () => {
      const req = new MockRequest({ role: 'admin' });
      const res = new MockResponse();
      
      await checkRole(['admin'])(req as unknown as Request, res as unknown as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for users with invalid role', async () => {
      const req = new MockRequest({ role: 'user' });
      const res = new MockResponse();
      
      await checkRole(['admin'])(req as unknown as Request, res as unknown as Response, mockNext);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Insufficient permissions');
    });
  });

  describe('Permission Validation', () => {
    it('should allow access with required permissions', async () => {
      const req = new MockRequest({
        role: 'user',
        permissions: ['read:metrics', 'write:metrics']
      });
      const res = new MockResponse();
      
      await validatePermissions(['read:metrics'])(req as unknown as Request, res as unknown as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access without required permissions', async () => {
      const req = new MockRequest({
        role: 'user',
        permissions: ['read:metrics']
      });
      const res = new MockResponse();
      
      await validatePermissions(['write:metrics'])(req as unknown as Request, res as unknown as Response, mockNext);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Insufficient permissions');
    });
  });
});

describe('Rate Limiting Middleware', () => {
  let mockNext: jest.Mock;
  let redisMock: RedisMock;

  beforeEach(() => {
    mockNext = jest.fn();
    redisMock = new RedisMock();
    jest.clearAllMocks();
  });

  describe('Public Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const req = new MockRequest();
      const res = new MockResponse();
      
      for (let i = 0; i < 100; i++) {
        await publicRateLimit(req as unknown as Request, res as unknown as Response, mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(100);
    });

    it('should block requests exceeding limit', async () => {
      const req = new MockRequest();
      const res = new MockResponse();
      
      for (let i = 0; i < 101; i++) {
        await publicRateLimit(req as unknown as Request, res as unknown as Response, mockNext);
      }
      expect(res.statusCode).toBe(429);
      expect(res.body.error).toBe('Too Many Requests');
    });
  });

  describe('Authenticated Rate Limiting', () => {
    it('should allow authenticated requests within limit', async () => {
      const req = new MockRequest({ role: 'user' });
      const res = new MockResponse();
      
      for (let i = 0; i < 1000; i++) {
        await authenticatedRateLimit(req as unknown as Request, res as unknown as Response, mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(1000);
    });

    it('should handle burst traffic within limits', async () => {
      const req = new MockRequest({ role: 'user' });
      req.headers['x-burst-multiplier'] = '1.2';
      const res = new MockResponse();
      
      for (let i = 0; i < 1200; i++) {
        await authenticatedRateLimit(req as unknown as Request, res as unknown as Response, mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(1200);
    });
  });

  describe('Admin Rate Limiting', () => {
    it('should allow admin requests within limit', async () => {
      const req = new MockRequest({ role: 'admin' });
      const res = new MockResponse();
      
      for (let i = 0; i < 5000; i++) {
        await adminRateLimit(req as unknown as Request, res as unknown as Response, mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(5000);
    });

    it('should track rate limits per user', async () => {
      const req1 = new MockRequest({ role: 'admin', ip: '1.1.1.1' });
      const req2 = new MockRequest({ role: 'admin', ip: '2.2.2.2' });
      const res = new MockResponse();
      
      for (let i = 0; i < 5000; i++) {
        await adminRateLimit(req1 as unknown as Request, res as unknown as Response, mockNext);
        await adminRateLimit(req2 as unknown as Request, res as unknown as Response, mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(10000);
    });
  });
});