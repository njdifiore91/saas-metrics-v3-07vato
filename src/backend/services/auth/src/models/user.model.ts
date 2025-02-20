/**
 * User Model Type Definitions
 * @version 1.0.0
 * @description Type definitions for User model including roles, preferences and security settings
 */

/**
 * Enumeration of available user roles with strict hierarchy enforcement
 */
export enum UserRole {
  COMPANY_USER = 'COMPANY_USER',
  ANALYST = 'ANALYST',
  ADMIN = 'ADMIN'
}

/**
 * Interface defining notification preference settings
 */
interface NotificationPreferences {
  emailAlerts: boolean;
  benchmarkUpdates: boolean;
  systemNotifications: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
}

/**
 * Interface defining dashboard layout preferences
 */
interface DashboardLayoutPreferences {
  layout: 'grid' | 'list';
  defaultView: 'metrics' | 'benchmarks' | 'comparison';
  widgetOrder: string[];
  collapsedSections: string[];
}

/**
 * Interface defining chart visualization preferences
 */
interface ChartPreferences {
  defaultChartType: 'line' | 'bar' | 'pie' | 'scatter';
  colorScheme: 'light' | 'dark' | 'custom';
  showLegend: boolean;
  showGridLines: boolean;
  animations: boolean;
}

/**
 * Interface defining email communication settings
 */
interface EmailSettings {
  marketingEmails: boolean;
  reportSchedule: 'never' | 'daily' | 'weekly' | 'monthly';
  digestFormat: 'html' | 'text';
  language: string;
}

/**
 * Interface defining display format preferences
 */
interface DisplayFormatPreferences {
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  numberFormat: 'comma' | 'space' | 'none';
  currencyDisplay: 'symbol' | 'code' | 'name';
  timezone: string;
}

/**
 * Interface defining security question structure
 */
interface SecurityQuestion {
  questionId: string;
  answer: string;
  lastUpdated: Date;
}

/**
 * Comprehensive interface for user preferences with strict typing
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  defaultDateRange: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  dashboardLayout: DashboardLayoutPreferences;
  chartPreferences: ChartPreferences;
  emailSettings: EmailSettings;
  displayFormat: DisplayFormatPreferences;
}

/**
 * Complete user data structure with strict typing and security properties
 */
export interface User {
  /** Unique identifier for the user */
  id: string;

  /** User's email address used for authentication */
  email: string;

  /** User's assigned role for access control */
  role: UserRole;

  /** Associated company identifier */
  companyId: string;

  /** User's customization preferences */
  preferences: UserPreferences;

  /** Timestamp of last successful login */
  lastLogin: Date;

  /** Account creation timestamp */
  createdAt: Date;

  /** Last account update timestamp */
  updatedAt: Date;

  /** Account status indicator */
  isActive: boolean;

  /** Timestamp of last password modification */
  lastPasswordChange: Date;

  /** Array of security questions for account recovery */
  securityQuestions: SecurityQuestion[];
}