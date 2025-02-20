import { z } from 'zod'; // ^3.22.0
import { UserRole, UserPreferences } from '../types/auth.types';

/**
 * UUID format validation regex
 * Validates UUID v4 format strings
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email format validation regex
 * RFC 5322 compliant email validation
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Dashboard layout item schema
 * Validates grid positioning and dimensions
 */
const dashboardLayoutItemSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(12),
});

/**
 * User preferences validation schema
 * Enforces strict validation for user customization options
 */
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.boolean().default(true),
  defaultDateRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  dashboardLayout: z.record(dashboardLayoutItemSchema),
}).strict();

/**
 * User profile validation schema
 * Implements comprehensive validation for user data
 */
export const userProfileSchema = z.object({
  id: z.string().regex(UUID_REGEX, 'Invalid UUID format'),
  email: z.string()
    .regex(EMAIL_REGEX, 'Invalid email format')
    .min(5, 'Email too short')
    .max(254, 'Email too long'),
  role: z.nativeEnum(UserRole),
  companyId: z.string().regex(UUID_REGEX, 'Invalid company ID format'),
  preferences: userPreferencesSchema,
  lastLogin: z.date().optional(),
}).strict();

/**
 * Google OAuth response validation schema
 * Validates response data from Google OAuth 2.0 flow
 */
export const googleAuthResponseSchema = z.object({
  code: z.string()
    .min(1, 'Authorization code is required')
    .max(256, 'Authorization code too long'),
  scope: z.string()
    .min(1, 'Scope is required')
    .includes('email', 'Email scope is required'),
  authuser: z.string()
    .regex(/^\d+$/, 'Invalid authuser format'),
  prompt: z.enum(['none', 'consent', 'select_account'])
    .default('none'),
}).strict();

/**
 * JWT token validation schema
 * Enforces strict validation for authentication tokens
 */
export const authTokensSchema = z.object({
  accessToken: z.string()
    .min(1, 'Access token is required')
    .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, 'Invalid JWT format'),
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
    .min(32, 'Invalid refresh token length')
    .max(512, 'Refresh token too long'),
  expiresIn: z.number()
    .int()
    .min(0, 'Invalid expiration time')
    .max(86400, 'Maximum 24 hour expiration'),
}).strict();

/**
 * JWT payload validation schema
 * Validates the structure of decoded JWT payloads
 */
export const jwtPayloadSchema = z.object({
  userId: z.string().regex(UUID_REGEX, 'Invalid user ID format'),
  email: z.string().regex(EMAIL_REGEX, 'Invalid email format'),
  role: z.nativeEnum(UserRole),
  companyId: z.string().regex(UUID_REGEX, 'Invalid company ID format'),
  exp: z.number().int().min(0),
  iat: z.number().int().min(0),
}).strict();