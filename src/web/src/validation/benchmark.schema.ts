import { z } from 'zod'; // v3.21.0
import { 
  BenchmarkData, 
  BenchmarkFilter, 
  MetricType,
  DataQuality,
  TimeGranularity,
  TrendDirection,
  SeasonalityPattern
} from '../types/benchmark.types';

// Create metric type schema with custom error handling
const createMetricTypeSchema = () => {
  return z.nativeEnum(MetricType, {
    errorMap: (issue, ctx) => {
      switch (issue.code) {
        case 'invalid_enum_value':
          return { message: `Invalid metric type. Must be one of: ${Object.values(MetricType).join(', ')}` };
        case 'invalid_type':
          return { message: 'Metric type must be a string value' };
        default:
          return { message: ctx.defaultError };
      }
    }
  });
};

// Schema for revenue range validation
const revenueRangeSchema = z.object({
  min: z.number().nonnegative({ message: 'Minimum revenue must be non-negative' }),
  max: z.number().positive({ message: 'Maximum revenue must be positive' }),
  currency: z.string().length(3, { message: 'Currency must be a 3-letter code' }),
  normalized_range: z.string().optional()
}).refine(data => data.max > data.min, {
  message: 'Maximum revenue must be greater than minimum revenue',
  path: ['max']
});

// Schema for exclusion criteria
const exclusionCriteriaSchema = z.object({
  outliers: z.boolean(),
  incomplete_data: z.boolean(),
  low_confidence_scores: z.boolean(),
  minimum_sample_size: z.number().int().positive({ message: 'Minimum sample size must be positive' })
});

// Schema for historical context
const historicalContextSchema = z.object({
  previous_periods: z.array(z.number()),
  average: z.number(),
  median: z.number(),
  standard_deviation: z.number().nonnegative()
});

// Schema for trend analysis
const trendAnalysisSchema = z.object({
  trend_direction: z.nativeEnum(TrendDirection),
  growth_rate: z.number(),
  seasonality: z.nativeEnum(SeasonalityPattern),
  confidence_interval: z.object({
    lower: z.number(),
    upper: z.number()
  }).optional()
}).refine(data => {
  if (data.confidence_interval) {
    return data.confidence_interval.upper > data.confidence_interval.lower;
  }
  return true;
}, {
  message: 'Upper confidence interval must be greater than lower interval',
  path: ['confidence_interval']
});

// Schema for benchmark data validation
export const benchmarkDataSchema = z.object({
  id: z.string().uuid({ message: 'Invalid benchmark ID format' }),
  metric_id: z.string().uuid({ message: 'Invalid metric ID format' }),
  source_id: z.string().uuid({ message: 'Invalid source ID format' }),
  revenue_range: revenueRangeSchema,
  value: z.number()
    .finite({ message: 'Value must be a finite number' })
    .refine(val => !isNaN(val), { message: 'Value cannot be NaN' }),
  period_start: z.date({ required_error: 'Start date is required' }),
  period_end: z.date({ required_error: 'End date is required' }),
  confidence_score: z.number()
    .min(0, { message: 'Confidence score must be at least 0' })
    .max(1, { message: 'Confidence score must be at most 1' }),
  data_quality: z.nativeEnum(DataQuality),
  sample_size: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional()
}).refine(data => data.period_end > data.period_start, {
  message: 'End date must be after start date',
  path: ['period_end']
});

// Schema for benchmark filter validation
export const benchmarkFilterSchema = z.object({
  revenue_range: revenueRangeSchema,
  metric_types: z.array(createMetricTypeSchema())
    .min(1, { message: 'At least one metric type must be selected' }),
  date_range: z.object({
    start: z.date(),
    end: z.date()
  }).refine(range => range.end > range.start, {
    message: 'End date must be after start date',
    path: ['end']
  }),
  industries: z.array(z.string())
    .min(1, { message: 'At least one industry must be selected' }),
  source_preference: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    reliability_score: z.number().min(0).max(1),
    update_frequency: z.nativeEnum(TimeGranularity),
    last_updated: z.date()
  })),
  exclusion_criteria: exclusionCriteriaSchema,
  time_granularity: z.nativeEnum(TimeGranularity),
  confidence_threshold: z.number()
    .min(0, { message: 'Confidence threshold must be at least 0' })
    .max(1, { message: 'Confidence threshold must be at most 1' }),
  include_incomplete_data: z.boolean().optional(),
  normalization_method: z.string().optional()
});

// Schema for benchmark comparison validation
export const benchmarkComparisonSchema = z.object({
  metric_id: z.string().uuid({ message: 'Invalid metric ID format' }),
  metric_type: createMetricTypeSchema(),
  company_value: z.number().finite(),
  benchmark_value: z.number().finite(),
  variance: z.number().finite(),
  percentile: z.number()
    .min(0, { message: 'Percentile must be at least 0' })
    .max(100, { message: 'Percentile must be at most 100' }),
  trend_analysis: trendAnalysisSchema,
  historical_context: historicalContextSchema,
  confidence_score: z.number()
    .min(0, { message: 'Confidence score must be at least 0' })
    .max(1, { message: 'Confidence score must be at most 1' }),
  sample_size: z.number().int().positive(),
  data_quality_indicators: z.object({
    company_data: z.nativeEnum(DataQuality),
    benchmark_data: z.nativeEnum(DataQuality)
  })
});

// Export the metric type schema for reuse
export const metricTypeSchema = createMetricTypeSchema();