// External imports
// axios v1.4.0 - HTTP client
import axios, { AxiosInstance, AxiosError } from 'axios';

// Internal imports
import { ApiEndpoint, HttpMethod } from '../types/api.types';

// Environment configuration
export const API_VERSION = 'v1';
export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Request configuration constants
const REQUEST_TIMEOUT = 2000; // 2 seconds default timeout
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // Base delay in ms
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

// Circuit breaker state management
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

let circuitBreakerState: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
};

// Enhanced API endpoint configurations
export const ENDPOINTS: Record<string, ApiEndpoint> = {
  metrics: {
    path: '/api/v1/metrics',
    method: HttpMethod.GET,
    requiresAuth: true,
    timeout: REQUEST_TIMEOUT,
    retryConfig: {
      attempts: RETRY_ATTEMPTS,
      backoffFactor: 1.5,
      maxDelay: 5000,
    },
  },
  benchmarks: {
    path: '/api/v1/benchmarks',
    method: HttpMethod.GET,
    requiresAuth: true,
    timeout: REQUEST_TIMEOUT,
    retryConfig: {
      attempts: RETRY_ATTEMPTS,
      backoffFactor: 1.5,
      maxDelay: 5000,
    },
  },
  companies: {
    path: '/api/v1/companies',
    method: HttpMethod.GET,
    requiresAuth: true,
    timeout: REQUEST_TIMEOUT,
    retryConfig: {
      attempts: RETRY_ATTEMPTS,
      backoffFactor: 1.5,
      maxDelay: 5000,
    },
  },
  auth: {
    path: '/api/v1/auth',
    method: HttpMethod.POST,
    requiresAuth: false,
    timeout: 5000,
    retryConfig: {
      attempts: 2,
      backoffFactor: 2,
      maxDelay: 2000,
    },
  },
};

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

// Create and configure axios instance with enhanced capabilities
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': API_VERSION,
    },
  });

  // Request interceptor for authentication and tracking
  instance.interceptors.request.use(
    (config) => {
      const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params || {})}-${JSON.stringify(config.data || {})}`;
      
      // Check circuit breaker
      if (circuitBreakerState.isOpen) {
        const now = Date.now();
        if (now - circuitBreakerState.lastFailure > CIRCUIT_BREAKER_RESET_TIMEOUT) {
          circuitBreakerState.isOpen = false;
          circuitBreakerState.failures = 0;
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      // Request deduplication
      const pendingRequest = pendingRequests.get(requestKey);
      if (pendingRequest) {
        return pendingRequest;
      }

      // Add authentication token if required
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add request tracking headers
      config.headers['X-Request-ID'] = crypto.randomUUID();
      config.headers['X-Request-Timestamp'] = Date.now().toString();

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and monitoring
  instance.interceptors.response.use(
    (response) => {
      // Clear from pending requests
      const requestKey = `${response.config.method}-${response.config.url}-${JSON.stringify(response.config.params || {})}-${JSON.stringify(response.config.data || {})}`;
      pendingRequests.delete(requestKey);

      // Reset circuit breaker on success
      circuitBreakerState.failures = 0;
      circuitBreakerState.isOpen = false;

      // Track response time
      const requestTime = Date.now() - parseInt(response.config.headers['X-Request-Timestamp']);
      console.debug(`Request completed in ${requestTime}ms`);

      return response;
    },
    async (error: AxiosError) => {
      const config = error.config!;
      
      // Update circuit breaker state
      circuitBreakerState.failures++;
      circuitBreakerState.lastFailure = Date.now();
      
      if (circuitBreakerState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreakerState.isOpen = true;
        console.error('Circuit breaker opened due to consecutive failures');
      }

      // Implement retry logic with exponential backoff
      const retryConfig = ENDPOINTS[config.url!]?.retryConfig;
      if (retryConfig && (!config.retryCount || config.retryCount < retryConfig.attempts)) {
        config.retryCount = (config.retryCount || 0) + 1;
        
        const delay = Math.min(
          retryConfig.maxDelay,
          RETRY_DELAY * Math.pow(retryConfig.backoffFactor, config.retryCount - 1)
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        return instance(config);
      }

      // Clear from pending requests on final failure
      const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params || {})}-${JSON.stringify(config.data || {})}`;
      pendingRequests.delete(requestKey);

      return Promise.reject(error);
    }
  );

  return instance;
};

// Export configured axios instance
export const axiosInstance = createAxiosInstance();

// Rate limiting configuration
let requestCount = 0;
let windowStart = Date.now();

// Rate limiting middleware
axiosInstance.interceptors.request.use((config) => {
  const now = Date.now();
  if (now - windowStart >= RATE_LIMIT_WINDOW) {
    requestCount = 0;
    windowStart = now;
  }

  if (requestCount >= RATE_LIMIT_REQUESTS) {
    throw new Error('Rate limit exceeded');
  }

  requestCount++;
  return config;
});

// Performance monitoring
axiosInstance.interceptors.response.use(
  (response) => {
    const duration = Date.now() - parseInt(response.config.headers['X-Request-Timestamp']);
    if (duration > REQUEST_TIMEOUT * 0.8) {
      console.warn(`Request took ${duration}ms, approaching timeout threshold`);
    }
    return response;
  }
);

// Export configured endpoints and base URL for use in application
export { ENDPOINTS, BASE_URL };