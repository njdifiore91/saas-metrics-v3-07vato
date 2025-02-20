import supertest from 'supertest'; // ^6.3.3
import { jest } from '@types/jest'; // ^29.5.3
import nock from 'nock'; // ^13.3.2
import RedisMock from 'ioredis-mock'; // ^8.2.2
import app from '../../src/app';
import { GoogleOAuthService } from '../../src/services/google-oauth.service';
import { TokenService } from '../../src/services/token.service';
import { UserRole } from '../../src/models/user.model';

// Test constants
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: UserRole.COMPANY_USER,
  companyId: 'test-company-id'
};

const TEST_DEVICE_ID = 'test-device-id';
const TEST_FINGERPRINT = 'test-device-fingerprint';

// Mock setup
let request: supertest.SuperTest<supertest.Test>;
let mockGoogleOAuthService: jest.Mocked<GoogleOAuthService>;
let mockTokenService: jest.Mocked<TokenService>;
let mockRedis: RedisMock;

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Initialize test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

    // Setup supertest
    request = supertest(app);

    // Setup Redis mock
    mockRedis = new RedisMock();

    // Mock Google OAuth service
    mockGoogleOAuthService = {
      generateAuthUrl: jest.fn(),
      authenticateUser: jest.fn(),
      validatePKCE: jest.fn()
    } as unknown as jest.Mocked<GoogleOAuthService>;

    // Mock Token service
    mockTokenService = {
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      blacklistToken: jest.fn()
    } as unknown as jest.Mocked<TokenService>;

    // Setup HTTP interceptors
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(async () => {
    // Cleanup
    nock.cleanAll();
    nock.enableNetConnect();
    await mockRedis.quit();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.flushall();
  });

  describe('Google OAuth Endpoints', () => {
    test('GET /auth/google should return authorization URL with PKCE', async () => {
      const mockAuthUrl = 'https://accounts.google.com/oauth/test';
      mockGoogleOAuthService.generateAuthUrl.mockResolvedValue(mockAuthUrl);

      const response = await request
        .get('/auth/google')
        .set('X-Device-ID', TEST_DEVICE_ID)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('url', mockAuthUrl);
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(mockGoogleOAuthService.generateAuthUrl).toHaveBeenCalled();
    });

    test('GET /auth/google/callback should handle OAuth callback securely', async () => {
      const mockCode = 'test-auth-code';
      const mockState = 'test-state';
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token'
      };

      mockGoogleOAuthService.authenticateUser.mockResolvedValue({
        tokens: mockTokens,
        user: TEST_USER
      });

      const response = await request
        .get('/auth/google/callback')
        .query({ code: mockCode, state: mockState })
        .set('X-Device-ID', TEST_DEVICE_ID)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Token Security Endpoints', () => {
    test('POST /auth/refresh should securely refresh access token', async () => {
      const mockRefreshToken = 'test-refresh-token';
      const mockNewAccessToken = 'new-access-token';

      mockTokenService.verifyRefreshToken.mockResolvedValue({
        userId: TEST_USER.id,
        deviceId: TEST_DEVICE_ID,
        fingerprint: TEST_FINGERPRINT,
        type: 'refresh'
      });

      const response = await request
        .post('/auth/refresh')
        .send({
          refreshToken: mockRefreshToken,
          deviceId: TEST_DEVICE_ID,
          fingerprint: TEST_FINGERPRINT
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
        TEST_DEVICE_ID,
        TEST_FINGERPRINT
      );
    });

    test('POST /auth/logout should securely handle user logout', async () => {
      const mockRefreshToken = 'test-refresh-token';

      mockTokenService.blacklistToken.mockResolvedValue(undefined);

      const response = await request
        .post('/auth/logout')
        .set('Authorization', `Bearer test-access-token`)
        .set('Cookie', [`refreshToken=${mockRefreshToken}`])
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      expect(mockTokenService.blacklistToken).toHaveBeenCalledWith(mockRefreshToken);
    });
  });

  describe('Security Validation Endpoints', () => {
    test('should handle rate limiting correctly', async () => {
      // Exceed rate limit
      for (let i = 0; i < 101; i++) {
        await request.get('/auth/google');
      }

      const response = await request
        .get('/auth/google')
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.headers['retry-after']).toBeDefined();
    });

    test('should validate device fingerprint', async () => {
      const mockRefreshToken = 'test-refresh-token';

      mockTokenService.verifyRefreshToken.mockRejectedValue(
        new Error('Device fingerprint mismatch')
      );

      const response = await request
        .post('/auth/refresh')
        .send({
          refreshToken: mockRefreshToken,
          deviceId: TEST_DEVICE_ID,
          fingerprint: 'invalid-fingerprint'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    test('should enforce secure headers', async () => {
      const response = await request
        .get('/auth/google')
        .expect(200);

      expect(response.headers).toMatchObject({
        'strict-transport-security': expect.any(String),
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block'
      });
    });

    test('should handle invalid tokens appropriately', async () => {
      const response = await request
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    test('should handle OAuth errors gracefully', async () => {
      mockGoogleOAuthService.authenticateUser.mockRejectedValue(
        new Error('OAuth authentication failed')
      );

      const response = await request
        .get('/auth/google/callback')
        .query({ code: 'invalid-code', state: 'test-state' })
        .set('X-Device-ID', TEST_DEVICE_ID)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle missing required parameters', async () => {
      const response = await request
        .get('/auth/google/callback')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});