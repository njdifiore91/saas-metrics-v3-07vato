// External imports
// zod v3.22.0 - Runtime type validation
import { z } from 'zod';

// Type definitions for validation errors
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// Generic API Response interface with enhanced tracking
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message: string;
  timestamp: number;
  requestId: string;
}

// Comprehensive error interface with validation details
export interface ApiError {
  code: string;
  message: string;
  details: Record<string, any>;
  validationErrors: ValidationError[];
  stack: string;
}

// Date range type for time-based filtering
export interface DateRange {
  startDate: string;
  endDate: string;
}

// Filter criteria for advanced querying
export interface FilterCriteria {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: unknown;
}

// Enhanced paginated response with navigation helpers
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Comprehensive request parameters interface
export interface RequestParams {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: FilterCriteria;
  search: string;
  timeRange: DateRange;
}

// Rate limiting configuration
export interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
  burst?: number;
}

// Extended HTTP methods enum
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

// Enhanced API endpoint type definition
export type ApiEndpoint = {
  path: string;
  method: HttpMethod;
  requiresAuth: boolean;
  version: string;
  rateLimit: RateLimitConfig;
  timeout: number;
};

// Zod validation schemas for runtime type checking
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
  value: z.unknown().optional()
});

export const ApiResponseSchema = z.object({
  data: z.unknown(),
  status: z.number(),
  message: z.string(),
  timestamp: z.number(),
  requestId: z.string()
});

export const DateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
});

export const FilterCriteriaSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains']),
  value: z.unknown()
});

export const RequestParamsSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  sortBy: z.string(),
  sortOrder: z.enum(['asc', 'desc']),
  filters: FilterCriteriaSchema,
  search: z.string(),
  timeRange: DateRangeSchema
});

export const RateLimitConfigSchema = z.object({
  limit: z.number().int().positive(),
  window: z.number().int().positive(),
  burst: z.number().int().positive().optional()
});

export const ApiEndpointSchema = z.object({
  path: z.string(),
  method: z.nativeEnum(HttpMethod),
  requiresAuth: z.boolean(),
  version: z.string(),
  rateLimit: RateLimitConfigSchema,
  timeout: z.number().int().positive()
});

// Default values for request parameters
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_SORT_ORDER = 'desc' as const;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_API_TIMEOUT = 30000; // 30 seconds

// HTTP status codes for type safety
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}