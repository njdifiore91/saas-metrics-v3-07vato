/**
 * @fileoverview Centralized configuration constants for the web application
 * @version 1.0.0
 */

/**
 * API configuration constants for system reliability and performance
 * Configured for 99.9% uptime target with retry mechanism
 */
export const API_CONSTANTS = {
  VERSION: 'v1',
  TIMEOUT: 2000, // 2 seconds max response time
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second between retries
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000'
} as const;

/**
 * Authentication and authorization related constants
 * Implements secure session management and role-based access
 */
export const AUTH_CONSTANTS = {
  TOKEN_KEY: 'startup_metrics_token',
  SESSION_TIMEOUT: 1800000, // 30 minutes in milliseconds
  ROLES: ['user', 'admin', 'analyst'] as const,
  GOOGLE_AUTH_SCOPE: 'email profile'
} as const;

/**
 * UI configuration constants for consistent layout and spacing
 * Implements F-pattern and Z-pattern layouts with 8px grid system
 */
export const UI_CONSTANTS = {
  BREAKPOINTS: {
    MOBILE: 320,
    TABLET: 768,
    DESKTOP: 1024,
    WIDE: 1440
  },
  SPACING: {
    BASE: 8,    // Base unit for grid system
    SMALL: 4,   // Half base unit
    MEDIUM: 16, // 2x base unit
    LARGE: 24,  // 3x base unit
    XLARGE: 32  // 4x base unit
  },
  GRID: {
    COLUMNS: 12,    // Standard 12-column grid
    GUTTER: 16,     // Space between columns
    MARGIN: 24      // Page margin
  }
} as const;

/**
 * Metric-related configuration and validation constants
 * Defines standardized categories and validation rules
 */
export const METRIC_CONSTANTS = {
  CATEGORIES: [
    'Revenue',
    'Growth',
    'Retention',
    'Sales',
    'Expenses'
  ] as const,
  VALIDATION_RULES: {
    NUMERIC: {
      MIN: 0,
      MAX: 1000000000, // 1 billion
      DECIMALS: 2
    },
    PERCENTAGE: {
      MIN: 0,
      MAX: 200, // Allow for growth percentages over 100%
      DECIMALS: 1
    },
    DATE_RANGE: {
      MAX_MONTHS: 36, // 3 years
      MIN_MONTHS: 1
    }
  },
  REVENUE_RANGES: [
    '0-1M',
    '1M-5M',
    '5M-10M',
    '10M-50M',
    '50M+'
  ] as const
} as const;

/**
 * Chart and visualization configuration constants
 * Defines consistent styling and behavior for data visualizations
 */
export const CHART_CONSTANTS = {
  ANIMATION_DURATION: 750, // milliseconds
  DEFAULT_ASPECT_RATIO: 1.6, // Golden ratio approximation
  MIN_DIMENSIONS: {
    WIDTH: 300,
    HEIGHT: 200
  },
  COLORS: {
    PRIMARY: ['#1976d2', '#2196f3', '#64b5f6'],
    SUCCESS: ['#2e7d32', '#4caf50', '#81c784'],
    WARNING: ['#f57c00', '#ff9800', '#ffb74d'],
    ERROR: ['#d32f2f', '#f44336', '#e57373']
  }
} as const;

// Type exports for TypeScript support
export type ApiVersion = typeof API_CONSTANTS.VERSION;
export type UserRole = typeof AUTH_CONSTANTS.ROLES[number];
export type MetricCategory = typeof METRIC_CONSTANTS.CATEGORIES[number];
export type RevenueRange = typeof METRIC_CONSTANTS.REVENUE_RANGES[number];