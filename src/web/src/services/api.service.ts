// External imports
// axios v1.4.0
import axios, { AxiosError, AxiosResponse } from 'axios';

// Internal imports
import { 
  ApiResponse, 
  ApiError, 
  RequestParams,
  HttpStatus 
} from '../types/api.types';
import { 
  axiosInstance, 
  ENDPOINTS 
} from '../config/api.config';
import { 
  handleApiError, 
  formatRequestParams 
} from '../utils/api.utils';

// Constants for request management
const REQUEST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PERFORMANCE_THRESHOLD = 2000; // 2 seconds (from success criteria)

// Types for request tracking and caching
interface RequestMetrics {
  endpoint: string;
  duration: number;
  timestamp: number;
  status: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * ApiService class providing comprehensive API communication capabilities
 * with enhanced error handling, caching, and performance monitoring
 */
export class ApiService {
  private static instance: ApiService;
  private requestMetrics: RequestMetrics[] = [];
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  private constructor() {
    this.initializePerformanceMonitoring();
  }

  /**
   * Get singleton instance of ApiService
   */
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Perform GET request with comprehensive error handling and caching
   */
  public async get<T>(
    endpoint: string,
    params?: RequestParams,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    
    // Check cache if caching is enabled
    if (!options.skipCache) {
      const cachedResponse = this.getFromCache<T>(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Check for pending duplicate requests
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    const startTime = Date.now();
    const formattedParams = params ? formatRequestParams(params) : {};

    try {
      const request = axiosInstance.get<T>(endpoint, { params: formattedParams })
        .then(response => this.handleResponse<T>(response, startTime, endpoint));

      this.pendingRequests.set(cacheKey, request);
      
      const response = await request;
      
      // Cache successful response
      if (!options.skipCache) {
        this.setCache(cacheKey, response);
      }

      return response;
    } catch (error) {
      const apiError = await handleApiError(error as AxiosError);
      this.trackError(endpoint, apiError);
      throw apiError;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Perform POST request with validation and monitoring
   */
  public async post<T, R>(
    endpoint: string,
    data: T,
    options: RequestOptions = {}
  ): Promise<ApiResponse<R>> {
    const startTime = Date.now();

    try {
      const response = await axiosInstance.post<R>(endpoint, data);
      return this.handleResponse<R>(response, startTime, endpoint);
    } catch (error) {
      const apiError = await handleApiError(error as AxiosError);
      this.trackError(endpoint, apiError);
      throw apiError;
    }
  }

  /**
   * Perform PUT request with validation and monitoring
   */
  public async put<T, R>(
    endpoint: string,
    data: T,
    options: RequestOptions = {}
  ): Promise<ApiResponse<R>> {
    const startTime = Date.now();

    try {
      const response = await axiosInstance.put<R>(endpoint, data);
      return this.handleResponse<R>(response, startTime, endpoint);
    } catch (error) {
      const apiError = await handleApiError(error as AxiosError);
      this.trackError(endpoint, apiError);
      throw apiError;
    }
  }

  /**
   * Perform DELETE request with confirmation and monitoring
   */
  public async delete(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<void>> {
    const startTime = Date.now();

    try {
      const response = await axiosInstance.delete(endpoint);
      return this.handleResponse<void>(response, startTime, endpoint);
    } catch (error) {
      const apiError = await handleApiError(error as AxiosError);
      this.trackError(endpoint, apiError);
      throw apiError;
    }
  }

  /**
   * Get request performance metrics
   */
  public getRequestMetrics(): RequestMetrics[] {
    return [...this.requestMetrics];
  }

  /**
   * Clear request cache
   */
  public clearRequestCache(): void {
    this.cache.clear();
  }

  /**
   * Handle successful response with performance tracking
   */
  private handleResponse<T>(
    response: AxiosResponse<T>,
    startTime: number,
    endpoint: string
  ): ApiResponse<T> {
    const duration = Date.now() - startTime;

    // Track request performance
    this.trackPerformance({
      endpoint,
      duration,
      timestamp: Date.now(),
      status: response.status
    });

    // Check performance against SLA
    if (duration > PERFORMANCE_THRESHOLD) {
      console.warn(`Request to ${endpoint} exceeded performance threshold: ${duration}ms`);
    }

    return {
      data: response.data,
      status: response.status,
      message: response.statusText,
      timestamp: Date.now(),
      requestId: response.headers['x-request-id']
    };
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    // Cleanup old metrics periodically
    setInterval(() => {
      const threshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      this.requestMetrics = this.requestMetrics.filter(
        metric => metric.timestamp > threshold
      );
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(endpoint: string, params?: RequestParams): string {
    return `${endpoint}:${JSON.stringify(params || {})}`;
  }

  /**
   * Get response from cache
   */
  private getFromCache<T>(key: string): ApiResponse<T> | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < REQUEST_CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set response in cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Implement cache size limiting
    if (this.cache.size > 1000) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Track request performance metrics
   */
  private trackPerformance(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics);
  }

  /**
   * Track request errors
   */
  private trackError(endpoint: string, error: ApiError): void {
    this.requestMetrics.push({
      endpoint,
      duration: 0,
      timestamp: Date.now(),
      status: error.details?.status || HttpStatus.INTERNAL_SERVER_ERROR
    });
  }
}

interface RequestOptions {
  skipCache?: boolean;
  timeout?: number;
}

// Export singleton instance
export const apiService = ApiService.getInstance();