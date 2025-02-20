import { ApiResponse, DateRange } from './api.types';

// Metric type definitions for various data domains
export enum MetricType {
  // Financial metrics
  ARR = 'ARR',
  REVENUE_GROWTH = 'REVENUE_GROWTH',
  GROSS_MARGIN = 'GROSS_MARGIN',
  BURN_RATE = 'BURN_RATE',
  
  // Growth metrics
  CUSTOMER_GROWTH = 'CUSTOMER_GROWTH',
  EXPANSION_REVENUE = 'EXPANSION_REVENUE',
  PIPELINE_GROWTH = 'PIPELINE_GROWTH',
  
  // Retention metrics
  NET_DOLLAR_RETENTION = 'NET_DOLLAR_RETENTION',
  LOGO_RETENTION = 'LOGO_RETENTION',
  CHURN_RATE = 'CHURN_RATE',
  
  // Sales efficiency metrics
  CAC = 'CAC',
  CAC_PAYBACK = 'CAC_PAYBACK',
  LTV_CAC_RATIO = 'LTV_CAC_RATIO',
  MAGIC_NUMBER = 'MAGIC_NUMBER'
}

// Data quality indicators
export enum DataQuality {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INSUFFICIENT = 'INSUFFICIENT'
}

// Trend direction for analysis
export enum TrendDirection {
  INCREASING = 'INCREASING',
  DECREASING = 'DECREASING',
  STABLE = 'STABLE',
  VOLATILE = 'VOLATILE'
}

// Seasonality patterns in data
export enum SeasonalityPattern {
  NONE = 'NONE',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  CUSTOM = 'CUSTOM'
}

// Time granularity options
export enum TimeGranularity {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

// Benchmark data source definition
export interface BenchmarkSource {
  id: string;
  name: string;
  reliability_score: number;
  update_frequency: TimeGranularity;
  last_updated: Date;
}

// Revenue range specification
export interface RevenueRange {
  min: number;
  max: number;
  currency: string;
  normalized_range?: string;
}

// Exclusion criteria for filtering
export interface ExclusionCriteria {
  outliers: boolean;
  incomplete_data: boolean;
  low_confidence_scores: boolean;
  minimum_sample_size: number;
}

// Historical context for trend analysis
export interface HistoricalContext {
  previous_periods: number[];
  average: number;
  median: number;
  standard_deviation: number;
}

// Trend analysis data structure
export interface TrendAnalysis {
  trend_direction: TrendDirection;
  growth_rate: number;
  seasonality: SeasonalityPattern;
  confidence_interval?: {
    lower: number;
    upper: number;
  };
}

// Core benchmark data interface
export interface BenchmarkData {
  id: string;
  metric_id: string;
  source_id: string;
  revenue_range: RevenueRange;
  value: number;
  period_start: Date;
  period_end: Date;
  confidence_score: number;
  data_quality: DataQuality;
  sample_size?: number;
  metadata?: Record<string, unknown>;
}

// Enhanced benchmark filter options
export interface BenchmarkFilter {
  revenue_range: RevenueRange;
  metric_types: MetricType[];
  date_range: DateRange;
  industries: string[];
  source_preference: BenchmarkSource[];
  exclusion_criteria: ExclusionCriteria;
  time_granularity: TimeGranularity;
  confidence_threshold: number;
  include_incomplete_data?: boolean;
  normalization_method?: string;
}

// Comprehensive benchmark comparison interface
export interface BenchmarkComparison {
  metric_id: string;
  metric_type: MetricType;
  company_value: number;
  benchmark_value: number;
  variance: number;
  percentile: number;
  trend_analysis: TrendAnalysis;
  historical_context: HistoricalContext;
  confidence_score: number;
  sample_size: number;
  data_quality_indicators: {
    company_data: DataQuality;
    benchmark_data: DataQuality;
  };
}

// API response types for benchmark data
export type BenchmarkDataResponse = ApiResponse<BenchmarkData[]>;
export type BenchmarkComparisonResponse = ApiResponse<BenchmarkComparison>;

// Utility type for metric validation
export type MetricValidationRules = {
  [K in MetricType]: {
    min: number;
    max: number;
    required_fields: string[];
    validation_formula?: string;
  };
};