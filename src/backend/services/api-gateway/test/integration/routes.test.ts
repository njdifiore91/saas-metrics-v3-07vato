// Test framework and assertions
import request from 'supertest';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { TestHelpers } from '@test/helpers';

// Application imports
import app from '../../src/app';

// Test constants
const TEST_COMPANY_ID = 'test-company-123';
const TEST_USER_ID = 'test-user-123';
const TEST_ADMIN_ID = 'test-admin-123';
const TEST_DEVICE_FINGERPRINT = 'test-device-fingerprint';

// Mock data
const validMetric = {
  company_id: TEST_COMPANY_ID,
  metric_type: 'ARR',
  value: 1000000,
  period_start: '2023-01-01',
  period_end: '2023-03-31',
  metadata: {
    source: 'manual',
    confidence: 'high'
  }
};

const validBenchmarkRequest = {
  revenue_range: '$1M-$5M',
  metric_type: 'ARR',
  period: '2023-Q2',
  filters: {
    industry: 'SaaS',
    region: 'NA'
  }
};

// Global test setup
let testServer: request.SuperTest<request.Test>;
let validAdminToken: string;
let validUserToken: string;
let redisClient: Redis;

beforeAll(async () => {
  // Initialize test database
  await TestHelpers.setupTestDatabase();

  // Generate test tokens
  validAdminToken = jwt.sign(
    { sub: TEST_ADMIN_ID, role: 'admin', fingerprint: TEST_DEVICE_FINGERPRINT },
    process.env.JWT_SECRET!
  );

  validUserToken = jwt.sign(
    { sub: TEST_USER_ID, role: 'user', fingerprint: TEST_DEVICE_FINGERPRINT },
    process.env.JWT_SECRET!
  );

  // Initialize Redis client for rate limit testing
  redisClient = new Redis(process.env.REDIS_URL!);

  // Initialize test server
  testServer = request(app);
});

afterAll(async () => {
  // Cleanup test database
  await TestHelpers.cleanupTestDatabase();

  // Clear Redis data
  await redisClient.flushall();
  await redisClient.quit();
});

beforeEach(async () => {
  // Reset rate limit counters
  await redisClient.flushall();
});

describe('Metrics Routes', () => {
  describe('GET /api/v1/metrics', () => {
    it('returns 401 without auth token', async () => {
      const response = await testServer
        .get('/api/v1/metrics')
        .query({ company_id: TEST_COMPANY_ID });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('returns 403 with invalid permissions', async () => {
      const invalidToken = jwt.sign(
        { sub: 'invalid-user', role: 'guest', fingerprint: TEST_DEVICE_FINGERPRINT },
        process.env.JWT_SECRET!
      );

      const response = await testServer
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${invalidToken}`)
        .query({ company_id: TEST_COMPANY_ID });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('returns 429 when rate limit exceeded', async () => {
      // Exceed rate limit
      const requests = Array(1001).fill(null);
      for (const _ of requests) {
        await testServer
          .get('/api/v1/metrics')
          .set('Authorization', `Bearer ${validUserToken}`)
          .query({ company_id: TEST_COMPANY_ID });
      }

      const response = await testServer
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${validUserToken}`)
        .query({ company_id: TEST_COMPANY_ID });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too many requests');
    });

    it('returns 200 with valid metrics data', async () => {
      const response = await testServer
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${validUserToken}`)
        .query({
          company_id: TEST_COMPANY_ID,
          metric_types: ['ARR', 'NDR'],
          start_date: '2023-01-01',
          end_date: '2023-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(Array.isArray(response.body.metrics)).toBe(true);
    });
  });

  describe('POST /api/v1/metrics', () => {
    it('validates required fields', async () => {
      const response = await testServer
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${validUserToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveLength(4); // company_id, metric_type, value, period required
    });

    it('creates metric with valid data', async () => {
      const response = await testServer
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${validUserToken}`)
        .send(validMetric);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.company_id).toBe(TEST_COMPANY_ID);
    });

    it('enforces data type constraints', async () => {
      const response = await testServer
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${validUserToken}`)
        .send({
          ...validMetric,
          value: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].param).toBe('value');
    });
  });
});

describe('Benchmark Routes', () => {
  describe('GET /api/v1/benchmarks', () => {
    it('returns benchmark data with valid request', async () => {
      const response = await testServer
        .get('/api/v1/benchmarks')
        .set('Authorization', `Bearer ${validUserToken}`)
        .query(validBenchmarkRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('statistics');
    });

    it('handles service timeouts', async () => {
      // Simulate slow service response
      jest.setTimeout(6000);

      const response = await testServer
        .get('/api/v1/benchmarks')
        .set('Authorization', `Bearer ${validUserToken}`)
        .query({
          ...validBenchmarkRequest,
          simulate_timeout: true
        });

      expect(response.status).toBe(504);
      expect(response.body).toHaveProperty('error', 'Request timeout');
    });
  });

  describe('POST /api/v1/benchmarks/ranking', () => {
    it('calculates ranking with valid data', async () => {
      const response = await testServer
        .post('/api/v1/benchmarks/ranking')
        .set('Authorization', `Bearer ${validUserToken}`)
        .send({
          metric_value: 1000000,
          revenue_range: '$1M-$5M',
          metric_type: 'ARR',
          period: '2023-Q2'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('percentile');
      expect(response.body).toHaveProperty('rank');
    });
  });
});

describe('Authentication and Authorization', () => {
  it('validates token fingerprint', async () => {
    const tokenWithDifferentFingerprint = jwt.sign(
      { sub: TEST_USER_ID, role: 'user', fingerprint: 'different-device' },
      process.env.JWT_SECRET!
    );

    const response = await testServer
      .get('/api/v1/metrics')
      .set('Authorization', `Bearer ${tokenWithDifferentFingerprint}`)
      .query({ company_id: TEST_COMPANY_ID });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid token fingerprint');
  });

  it('handles token expiration', async () => {
    const expiredToken = jwt.sign(
      { 
        sub: TEST_USER_ID,
        role: 'user',
        fingerprint: TEST_DEVICE_FINGERPRINT,
        exp: Math.floor(Date.now() / 1000) - 3600
      },
      process.env.JWT_SECRET!
    );

    const response = await testServer
      .get('/api/v1/metrics')
      .set('Authorization', `Bearer ${expiredToken}`)
      .query({ company_id: TEST_COMPANY_ID });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Token expired');
  });
});