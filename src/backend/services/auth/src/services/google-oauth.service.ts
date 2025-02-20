import axios, { AxiosInstance } from 'axios'; // ^1.4.0
import { createHash, randomBytes } from 'crypto'; // ^1.0.1
import { google } from '../config';
import { TokenService } from './token.service';
import { User, UserRole } from '../models/user.model';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}

interface GoogleUserProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

interface CachedProfile {
  data: GoogleUserProfile;
  timestamp: number;
}

export class GoogleOAuthService {
  private readonly axiosInstance: AxiosInstance;
  private readonly tokenService: TokenService;
  private codeVerifier: string;
  private codeChallenge: string;
  private readonly rateLimiter: Map<string, number>;
  private readonly profileCache: Map<string, CachedProfile>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_REQUESTS = 100;
  private readonly WINDOW_MS = 60 * 1000; // 1 minute

  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
    this.rateLimiter = new Map();
    this.profileCache = new Map();
    
    // Initialize PKCE values
    this.codeVerifier = this.generateCodeVerifier();
    this.codeChallenge = this.generateCodeChallenge(this.codeVerifier);

    // Configure axios instance with retry and timeout
    this.axiosInstance = axios.create({
      timeout: 10000,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 300
    });
  }

  /**
   * Generates a secure authorization URL with PKCE challenge
   */
  public generateAuthUrl(): string {
    const state = randomBytes(32).toString('hex');
    this.codeVerifier = this.generateCodeVerifier();
    this.codeChallenge = this.generateCodeChallenge(this.codeVerifier);

    const params = new URLSearchParams({
      client_id: google.CLIENT_ID,
      redirect_uri: google.REDIRECT_URI,
      response_type: google.RESPONSE_TYPE,
      scope: google.SCOPES.join(' '),
      state,
      code_challenge: this.codeChallenge,
      code_challenge_method: google.PKCE_METHOD,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${google.AUTH_ENDPOINT}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for tokens with PKCE verification
   */
  private async exchangeCodeForTokens(code: string, state: string): Promise<GoogleTokenResponse> {
    this.checkRateLimit();

    const params = new URLSearchParams({
      client_id: google.CLIENT_ID,
      client_secret: google.CLIENT_SECRET,
      code,
      grant_type: google.GRANT_TYPE,
      redirect_uri: google.REDIRECT_URI,
      code_verifier: this.codeVerifier
    });

    try {
      const response = await this.axiosInstance.post(
        google.TOKEN_ENDPOINT,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves and validates user profile from Google
   */
  private async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    // Check cache first
    const cachedProfile = this.profileCache.get(accessToken);
    if (cachedProfile && Date.now() - cachedProfile.timestamp < this.CACHE_TTL) {
      return cachedProfile.data;
    }

    try {
      const response = await this.axiosInstance.get(google.USER_INFO_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const profile = response.data;

      // Validate email verification
      if (!profile.email_verified) {
        throw new Error('Email not verified with Google');
      }

      // Cache the profile
      this.profileCache.set(accessToken, {
        data: profile,
        timestamp: Date.now()
      });

      return profile;
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Completes OAuth flow with enhanced security measures
   */
  public async authenticateUser(
    code: string,
    state: string,
    deviceId: string
  ): Promise<{
    tokens: { accessToken: string; refreshToken: string };
    user: Partial<User>;
  }> {
    // Validate inputs
    if (!code || !state || !deviceId) {
      throw new Error('Missing required authentication parameters');
    }

    // Exchange code for tokens
    const googleTokens = await this.exchangeCodeForTokens(code, state);
    
    // Get user profile
    const profile = await this.getUserProfile(googleTokens.access_token);

    // Create user object
    const user: Partial<User> = {
      id: profile.sub,
      email: profile.email,
      role: UserRole.COMPANY_USER,
      isActive: true,
      lastLogin: new Date()
    };

    // Generate application tokens
    const accessToken = await this.tokenService.generateAccessToken(user as User);
    const refreshToken = await this.tokenService.generateRefreshToken(
      user as User,
      deviceId,
      this.generateDeviceFingerprint(deviceId)
    );

    return {
      tokens: {
        accessToken,
        refreshToken
      },
      user
    };
  }

  /**
   * Generates cryptographically secure PKCE verifier
   */
  private generateCodeVerifier(): string {
    const verifier = randomBytes(32).toString('base64url');
    // Ensure minimum length of 43 characters
    return verifier.length >= 43 ? verifier : this.generateCodeVerifier();
  }

  /**
   * Generates PKCE challenge from verifier using SHA-256
   */
  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  /**
   * Generates device fingerprint for token security
   */
  private generateDeviceFingerprint(deviceId: string): string {
    return createHash('sha256')
      .update(deviceId + process.env.FINGERPRINT_SALT)
      .digest('hex');
  }

  /**
   * Implements rate limiting for token requests
   */
  private checkRateLimit(): void {
    const now = Date.now();
    let requests = this.rateLimiter.get(now.toString()) || 0;

    if (requests >= this.MAX_REQUESTS) {
      throw new Error('Rate limit exceeded');
    }

    this.rateLimiter.set(now.toString(), requests + 1);

    // Cleanup old entries
    for (const [timestamp] of this.rateLimiter) {
      if (parseInt(timestamp) < now - this.WINDOW_MS) {
        this.rateLimiter.delete(timestamp);
      }
    }
  }
}