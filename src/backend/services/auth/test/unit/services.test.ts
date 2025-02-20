import { jest } from '@jest/globals';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import Redis from 'redis-mock';
import { GoogleOAuthService } from '../../src/services/google-oauth.service';
import { TokenService } from '../../src/services/token.service';
import { config } from '../../src/config';
import { UserRole } from '../../src/models/user.model';

// Mock implementations
const mockAxios = new MockAdapter(axios);
const mockRedis = Redis.createClient();

// Mock user data
const mockUserData = {
  id: '123456789',
  email: 'test@example.com',
  role: UserRole.COMPANY_USER,
  companyId: 'comp123',
  isActive: true,
  lastLogin: new Date()
};

// Mock device data
const mockDeviceData = {
  deviceId: 'device123',
  fingerprint: 'abc123fingerprint'
};

describe('GoogleOAuthService', () => {
  let googleOAuthService: GoogleOAuthService;
  let tokenService: TokenService;

  beforeAll(() => {
    tokenService = new TokenService();
    googleOAuthService = new GoogleOAuthService(tokenService);
  });

  afterAll(() => {
    mockAxios.reset();
    mockRedis.quit();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.reset();
  });

  describe('generateAuthUrl', () => {
    it('should generate valid OAuth URL with PKCE challenge', () => {
      const authUrl = googleOAuthService.generateAuthUrl();

      expect(authUrl).toContain(config.google.AUTH_ENDPOINT);
      expect(authUrl).toContain('code_challenge=');
      expect(authUrl).toContain('code_challenge_method=S256');
      expect(authUrl).toContain(`client_id=${config.google.CLIENT_ID}`);
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(config.google.REDIRECT_URI)}`);
      expect(authUrl).toContain('scope=openid%20profile%20email');
      expect(authUrl).toContain('state=');
      expect(authUrl).toContain('access_type=offline');
      expect(authUrl).toContain('prompt=consent');
    });

    it('should generate unique state and PKCE challenge for each call', () => {
      const url1 = googleOAuthService.generateAuthUrl();
      const url2 = googleOAuthService.generateAuthUrl();

      expect(url1).not.toBe(url2);
    });
  });

  describe('authenticateUser', () => {
    const mockCode = 'valid_auth_code';
    const mockState = 'valid_state';
    const mockTokenResponse = {
      access_token: 'google_access_token',
      id_token: 'google_id_token',
      refresh_token: 'google_refresh_token',
      expires_in: 3600
    };

    const mockUserProfile = {
      sub: mockUserData.id,
      email: mockUserData.email,
      email_verified: true,
      name: 'Test User',
      picture: 'https://example.com/photo.jpg'
    };

    beforeEach(() => {
      // Mock Google token endpoint
      mockAxios.onPost(config.google.TOKEN_ENDPOINT).reply(200, mockTokenResponse);
      
      // Mock Google userinfo endpoint
      mockAxios.onGet(config.google.USER_INFO_ENDPOINT).reply(200, mockUserProfile);
    });

    it('should successfully authenticate user with valid code and PKCE verifier', async () => {
      const result = await googleOAuthService.authenticateUser(
        mockCode,
        mockState,
        mockDeviceData.deviceId
      );

      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('user');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUserProfile.email);
      expect(result.user.id).toBe(mockUserProfile.sub);
      expect(result.user.role).toBe(UserRole.COMPANY_USER);
    });

    it('should reject authentication with invalid code', async () => {
      mockAxios.onPost(config.google.TOKEN_ENDPOINT).reply(400, {
        error: 'invalid_grant'
      });

      await expect(
        googleOAuthService.authenticateUser('invalid_code', mockState, mockDeviceData.deviceId)
      ).rejects.toThrow();
    });

    it('should reject authentication when email is not verified', async () => {
      mockAxios.onGet(config.google.USER_INFO_ENDPOINT).reply(200, {
        ...mockUserProfile,
        email_verified: false
      });

      await expect(
        googleOAuthService.authenticateUser(mockCode, mockState, mockDeviceData.deviceId)
      ).rejects.toThrow('Email not verified with Google');
    });

    it('should handle rate limiting correctly', async () => {
      const promises = Array(101).fill(null).map(() => 
        googleOAuthService.authenticateUser(mockCode, mockState, mockDeviceData.deviceId)
      );

      await expect(Promise.all(promises)).rejects.toThrow('Rate limit exceeded');
    });
  });
});

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeAll(() => {
    tokenService = new TokenService();
  });

  describe('generateAccessToken', () => {
    it('should generate valid JWT access token', async () => {
      const token = await tokenService.generateAccessToken(mockUserData);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = await tokenService.verifyAccessToken(token);
      expect(decoded.userId).toBe(mockUserData.id);
      expect(decoded.role).toBe(mockUserData.role);
      expect(decoded.type).toBe('access');
    });

    it('should include correct expiration time', async () => {
      const token = await tokenService.generateAccessToken(mockUserData);
      const decoded = await tokenService.verifyAccessToken(token);

      const expectedExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      expect(decoded.exp).toBeCloseTo(expectedExpiry, -2); // Allow 2 seconds difference
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token with device binding', async () => {
      const token = await tokenService.generateRefreshToken(
        mockUserData,
        mockDeviceData.deviceId,
        mockDeviceData.fingerprint
      );

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = await tokenService.verifyRefreshToken(
        token,
        mockDeviceData.deviceId,
        mockDeviceData.fingerprint
      );

      expect(decoded.userId).toBe(mockUserData.id);
      expect(decoded.deviceId).toBe(mockDeviceData.deviceId);
      expect(decoded.fingerprint).toBe(mockDeviceData.fingerprint);
      expect(decoded.type).toBe('refresh');
    });

    it('should reject token verification with mismatched device fingerprint', async () => {
      const token = await tokenService.generateRefreshToken(
        mockUserData,
        mockDeviceData.deviceId,
        mockDeviceData.fingerprint
      );

      await expect(
        tokenService.verifyRefreshToken(token, mockDeviceData.deviceId, 'wrong_fingerprint')
      ).rejects.toThrow('Device fingerprint mismatch');
    });

    it('should reject blacklisted tokens', async () => {
      const token = await tokenService.generateRefreshToken(
        mockUserData,
        mockDeviceData.deviceId,
        mockDeviceData.fingerprint
      );

      await tokenService.revokeRefreshToken(token);

      await expect(
        tokenService.verifyRefreshToken(token, mockDeviceData.deviceId, mockDeviceData.fingerprint)
      ).rejects.toThrow('Token has been revoked');
    });
  });
});