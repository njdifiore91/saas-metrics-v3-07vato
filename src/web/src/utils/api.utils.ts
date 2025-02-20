// External imports
import { AxiosError } from 'axios'; // axios v1.4.0

// Internal imports
import { 
  ApiError, 
  RequestParams,
  HttpStatus,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE
} from '../types/api.types';

// Constants for retry mechanism
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000; // milliseconds
const MAX_RETRY_DELAY = 10000; // milliseconds

// Interface for retry configuration
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  shouldRetry?: (error: AxiosError) => boolean;
}

// Cache for memoized request parameters
const parameterCache = new Map<string, Record<string, any>>();

/**
 * Enhanced error handler with retry mechanism and detailed logging
 * @param error - The axios error object
 * @param retryConfig - Configuration for retry mechanism
 * @returns Promise<ApiError> - Standardized error object
 */
export async function handleApiError(
  error: AxiosError,
  retryConfig: RetryConfig = {
    maxAttempts: DEFAULT_RETRY_ATTEMPTS,
    initialDelay: DEFAULT_RETRY_DELAY,
    maxDelay: MAX_RETRY_DELAY
  }
): Promise<ApiError> {
  const isRetryable = retryConfig.shouldRetry ?? defaultShouldRetry;
  let attempt = 1;
  let delay = retryConfig.initialDelay;

  while (attempt < retryConfig.maxAttempts && isRetryable(error)) {
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      // Attempt to retry the failed request
      if (error.config) {
        const response = await fetch(error.config.url!, {
          method: error.config.method,
          headers: error.config.headers as HeadersInit,
          body: error.config.data
        });
        if (response.ok) {
          return {
            code: 'RETRY_SUCCESS',
            message: 'Request succeeded after retry',
            details: {
              attempt,
              originalError: error.message
            }
          } as ApiError;
        }
      }
    } catch (retryError) {
      error = retryError as AxiosError;
    }

    attempt++;
    delay = Math.min(delay * 2, retryConfig.maxDelay);
  }

  return formatApiError(error);
}

/**
 * Optimized request parameter formatter with validation and caching
 * @param params - Request parameters to format
 * @returns Formatted and validated parameters
 */
export function formatRequestParams(params: RequestParams): Record<string, any> {
  const cacheKey = JSON.stringify(params);
  const cached = parameterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatted: Record<string, any> = {};

  // Validate and format pagination
  formatted.page = Math.max(1, params.page || 1);
  formatted.pageSize = Math.min(
    params.pageSize || DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );

  // Process filters with type safety
  if (params.filters && Object.keys(params.filters).length > 0) {
    formatted.filters = sanitizeFilters(params.filters);
  }

  // Cache the result for future use
  parameterCache.set(cacheKey, formatted);
  
  // Implement cache cleanup to prevent memory leaks
  if (parameterCache.size > 1000) {
    const oldestKey = parameterCache.keys().next().value;
    parameterCache.delete(oldestKey);
  }

  return formatted;
}

/**
 * High-performance query string builder with enhanced safety
 * @param params - Parameters to convert to query string
 * @returns Safely encoded query string
 */
export function buildQueryString(params: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const parts: string[] = [];
  const stringBuilder = new StringBuilder();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach(item => {
        stringBuilder
          .append(encodeURIComponent(key))
          .append('[]')
          .append('=')
          .append(encodeURIComponent(String(item)))
          .append('&');
      });
    } else if (typeof value === 'object') {
      stringBuilder
        .append(encodeURIComponent(key))
        .append('=')
        .append(encodeURIComponent(JSON.stringify(value)))
        .append('&');
    } else {
      stringBuilder
        .append(encodeURIComponent(key))
        .append('=')
        .append(encodeURIComponent(String(value)))
        .append('&');
    }
  }

  let result = stringBuilder.toString();
  return result.endsWith('&') ? result.slice(0, -1) : result;
}

// Helper class for efficient string building
class StringBuilder {
  private parts: string[] = [];

  append(str: string): StringBuilder {
    this.parts.push(str);
    return this;
  }

  toString(): string {
    return this.parts.join('');
  }
}

// Helper function to determine if error is retryable
function defaultShouldRetry(error: AxiosError): boolean {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }

  const status = error.response.status;
  return status === HttpStatus.SERVICE_UNAVAILABLE ||
         status === HttpStatus.INTERNAL_SERVER_ERROR ||
         status >= 500;
}

// Helper function to format API errors
function formatApiError(error: AxiosError): ApiError {
  const response = error.response;
  const baseError: ApiError = {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    details: {},
    validationErrors: [],
    stack: error.stack || ''
  };

  if (!response) {
    return {
      ...baseError,
      code: 'NETWORK_ERROR',
      message: 'Network error occurred',
      details: { originalError: error.message }
    };
  }

  const status = response.status;
  const data = response.data;

  return {
    ...baseError,
    code: data?.code || `HTTP_${status}`,
    message: data?.message || error.message,
    details: {
      status,
      statusText: response.statusText,
      data: data,
      headers: response.headers,
      timestamp: new Date().toISOString()
    }
  };
}

// Helper function to sanitize filter values
function sanitizeFilters(filters: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else if (Array.isArray(value)) {
      sanitized[key] = value.filter(item => item !== null && item !== undefined);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeFilters(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}