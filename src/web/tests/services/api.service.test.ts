// External imports
// @jest/globals v29.6.0
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
// axios-mock-adapter v1.21.0
import MockAdapter from 'axios-mock-adapter';

// Internal imports
import { ApiService } from '../../src/services/api.service';
import { axiosInstance, ENDPOINTS } from '../../src/config/api.config';
import { HttpStatus } from '../../src/types/api.types';

// Test constants
const TEST_TIMEOUT = 2000; // 2 seconds from success criteria
const RETRY_COUNT = 3;
const TEST_ENDPOINT = ENDPOINTS.metrics.path;

// Mock data
const mockMetricData = {
  id: '123',
  value: 100,
  timestamp: Date.now()
};

const mockErrorResponse = {
  code: 'TEST_ERROR',
  message: 'Test error message',
  details: { status: HttpStatus.BAD_REQUEST }
};

// Initialize mocks
const mockAxios = new MockAdapter(axiosInstance);
const apiService = new ApiService();

describe('ApiService Tests', () => {
  beforeEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
    apiService.clearRequestCache();
  });

  afterEach(() => {
    mockAxios.reset();
    jest.restoreAllMocks();
  });

  describe('GET Requests', () => {
    it('should successfully retrieve data within performance threshold', async () => {
      const startTime = Date.now();
      mockAxios.onGet(TEST_ENDPOINT).reply(200, mockMetricData);

      const response = await apiService.get(TEST_ENDPOINT);

      expect(response.data).toEqual(mockMetricData);
      expect(response.status).toBe(HttpStatus.OK);
      expect(Date.now() - startTime).toBeLessThan(TEST_TIMEOUT);
      expect(response.requestId).toBeDefined();
    });

    it('should handle request caching correctly', async () => {
      mockAxios.onGet(TEST_ENDPOINT).replyOnce(200, mockMetricData);

      const firstResponse = await apiService.get(TEST_ENDPOINT);
      const secondResponse = await apiService.get(TEST_ENDPOINT);

      expect(firstResponse.data).toEqual(secondResponse.data);
      expect(mockAxios.history.get.length).toBe(1);
    });

    it('should handle query parameters correctly', async () => {
      const params = {
        page: 1,
        pageSize: 20,
        sortBy: 'value',
        sortOrder: 'desc'
      };

      mockAxios.onGet(TEST_ENDPOINT, { params }).reply(200, mockMetricData);

      const response = await apiService.get(TEST_ENDPOINT, params);

      expect(response.data).toEqual(mockMetricData);
      expect(mockAxios.history.get[0].params).toEqual(params);
    });
  });

  describe('POST Requests', () => {
    it('should successfully create data', async () => {
      const payload = { value: 100 };
      mockAxios.onPost(TEST_ENDPOINT, payload).reply(201, mockMetricData);

      const response = await apiService.post(TEST_ENDPOINT, payload);

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.data).toEqual(mockMetricData);
    });

    it('should handle content validation', async () => {
      const invalidPayload = { value: null };
      mockAxios.onPost(TEST_ENDPOINT, invalidPayload).reply(400, mockErrorResponse);

      await expect(apiService.post(TEST_ENDPOINT, invalidPayload))
        .rejects.toMatchObject({
          code: mockErrorResponse.code,
          message: mockErrorResponse.message
        });
    });
  });

  describe('Error Handling', () => {
    it('should retry failed requests', async () => {
      mockAxios
        .onGet(TEST_ENDPOINT)
        .replyOnce(500)
        .onGet(TEST_ENDPOINT)
        .replyOnce(500)
        .onGet(TEST_ENDPOINT)
        .reply(200, mockMetricData);

      const response = await apiService.get(TEST_ENDPOINT);

      expect(response.data).toEqual(mockMetricData);
      expect(mockAxios.history.get.length).toBe(3);
    });

    it('should handle network errors', async () => {
      mockAxios.onGet(TEST_ENDPOINT).networkError();

      await expect(apiService.get(TEST_ENDPOINT))
        .rejects.toMatchObject({
          code: 'NETWORK_ERROR'
        });
    });

    it('should handle timeout errors', async () => {
      mockAxios.onGet(TEST_ENDPOINT).timeout();

      await expect(apiService.get(TEST_ENDPOINT))
        .rejects.toMatchObject({
          code: 'TIMEOUT_ERROR'
        });
    });

    it('should handle authentication errors', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(401, {
        code: 'UNAUTHORIZED',
        message: 'Invalid token'
      });

      await expect(apiService.get(TEST_ENDPOINT))
        .rejects.toMatchObject({
          code: 'UNAUTHORIZED'
        });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track request metrics', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, mockMetricData);

      await apiService.get(TEST_ENDPOINT);
      const metrics = apiService.getRequestMetrics();

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        endpoint: TEST_ENDPOINT,
        status: HttpStatus.OK
      });
      expect(metrics[0].duration).toBeLessThan(TEST_TIMEOUT);
    });

    it('should handle concurrent requests efficiently', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, mockMetricData);

      const requests = Array(5).fill(null).map(() => 
        apiService.get(TEST_ENDPOINT)
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(5);
      expect(mockAxios.history.get.length).toBe(1); // Due to request deduplication
    });
  });

  describe('Cache Management', () => {
    it('should respect cache skip option', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, mockMetricData);

      await apiService.get(TEST_ENDPOINT);
      await apiService.get(TEST_ENDPOINT, undefined, { skipCache: true });

      expect(mockAxios.history.get.length).toBe(2);
    });

    it('should handle cache expiration', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, mockMetricData);

      await apiService.get(TEST_ENDPOINT);
      
      // Fast-forward time to simulate cache expiration
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      
      await apiService.get(TEST_ENDPOINT);

      expect(mockAxios.history.get.length).toBe(2);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate identical concurrent requests', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, mockMetricData);

      const [response1, response2] = await Promise.all([
        apiService.get(TEST_ENDPOINT),
        apiService.get(TEST_ENDPOINT)
      ]);

      expect(response1.data).toEqual(response2.data);
      expect(mockAxios.history.get.length).toBe(1);
    });
  });
});