/**
 * Company-related type definitions for the Startup Metrics Platform
 * @version 1.0.0
 */

/**
 * Strongly-typed enumeration of company revenue ranges for filtering and benchmarking
 * Values represent annual revenue in USD
 */
export enum RevenueRange {
    LESS_THAN_1M = "< $1M",
    ONE_TO_5M = "$1M - $5M",
    FIVE_TO_10M = "$5M - $10M",
    TEN_TO_50M = "$10M - $50M",
    FIFTY_PLUS = "$50M+"
}

/**
 * Core company data structure interface matching database schema
 * Includes system-managed and audit fields
 */
export interface Company {
    /** Unique identifier (UUID v4) */
    id: string;
    
    /** Company legal name */
    name: string;
    
    /** Primary industry classification */
    industry: string;
    
    /** Annual revenue classification */
    revenueRange: RevenueRange;
    
    /** Record creation timestamp */
    createdAt: Date;
    
    /** Last modification timestamp */
    updatedAt: Date;
}

/**
 * Interface for tracking company-specific metric values
 * Supports time-series data with audit trail
 */
export interface CompanyMetric {
    /** Unique identifier (UUID v4) */
    id: string;
    
    /** Reference to parent company */
    companyId: string;
    
    /** Reference to metric definition */
    metricId: string;
    
    /** Numeric metric value */
    value: number;
    
    /** Start of measurement period */
    periodStart: Date;
    
    /** End of measurement period */
    periodEnd: Date;
    
    /** Record creation timestamp */
    createdAt: Date;
}

/**
 * Simplified company interface for form handling
 * Excludes system-managed fields
 */
export interface CompanyProfile {
    /** Company legal name */
    name: string;
    
    /** Primary industry classification */
    industry: string;
    
    /** Annual revenue classification */
    revenueRange: RevenueRange;
}