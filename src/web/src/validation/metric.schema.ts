// zod v3.22.0 - Runtime type validation library
import { z } from 'zod';
import { 
  MetricCategory, 
  MetricDataType, 
  MetricValidationRule 
} from '../types/metric.types';

/**
 * Validation schema for metric validation rules
 * Enforces strict type checking and range validation for rule configuration
 */
export const metricValidationRuleSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  precision: z.number().min(0).max(10),
  required: z.boolean()
}).refine((data) => {
  if (data.min !== null && data.max !== null) {
    return data.min < data.max;
  }
  return true;
}, {
  message: "Maximum value must be greater than minimum value"
});

/**
 * Comprehensive metric definition schema
 * Validates complete metric structure with strict type checking
 */
export const metricSchema = z.object({
  id: z.string().uuid(),
  name: z.string()
    .min(1, "Metric name is required")
    .max(100, "Metric name cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s_-]+$/, "Metric name must contain only alphanumeric characters, spaces, underscores, and hyphens"),
  category: z.nativeEnum(MetricCategory),
  dataType: z.nativeEnum(MetricDataType),
  validationRules: metricValidationRuleSchema,
  active: z.boolean()
});

/**
 * Metric entry schema with comprehensive validation rules
 * Implements type-specific validation based on metric data type
 */
export const metricEntrySchema = z.object({
  companyId: z.string().uuid(),
  metricId: z.string().uuid(),
  value: z.number(),
  periodStart: z.date(),
  periodEnd: z.date()
}).refine((data) => {
  return data.periodStart < data.periodEnd;
}, {
  message: "Period end date must be after period start date",
  path: ["periodEnd"]
});

/**
 * Validates a metric value against its validation rules and data type
 * Implements comprehensive type-specific validation with security measures
 */
export const validateMetricValue = (
  value: number,
  rules: MetricValidationRule,
  dataType: MetricDataType
): boolean => {
  // Required field validation
  if (rules.required && (value === null || value === undefined)) {
    return false;
  }

  // Sanitize and validate numeric input
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }

  // Apply precision rules
  const precision = Math.pow(10, rules.precision);
  const roundedValue = Math.round(value * precision) / precision;
  if (roundedValue !== value) {
    return false;
  }

  // Range validation
  if (rules.min !== null && value < rules.min) {
    return false;
  }
  if (rules.max !== null && value > rules.max) {
    return false;
  }

  // Type-specific validation
  switch (dataType) {
    case MetricDataType.PERCENTAGE:
      return value >= 0 && value <= 200;

    case MetricDataType.CURRENCY:
      return value >= 0;

    case MetricDataType.RATIO:
      return value >= 0 && value <= 10;

    case MetricDataType.MONTHS:
      return value >= 0 && value <= 60;

    case MetricDataType.NUMBER:
      return true; // Already validated by range rules

    default:
      return false;
  }
};

/**
 * Type-specific validation schemas based on metric data types
 * Implements validation rules from technical specifications
 */
export const metricTypeValidation = {
  [MetricDataType.PERCENTAGE]: z.number()
    .min(0, "Percentage must be at least 0%")
    .max(200, "Percentage cannot exceed 200%"),

  [MetricDataType.CURRENCY]: z.number()
    .positive("Currency amount must be positive"),

  [MetricDataType.RATIO]: z.number()
    .min(0, "Ratio must be at least 0")
    .max(10, "Ratio cannot exceed 10"),

  [MetricDataType.MONTHS]: z.number()
    .min(0, "Months must be at least 0")
    .max(60, "Months cannot exceed 60"),

  [MetricDataType.NUMBER]: z.number()
    .finite("Value must be a finite number")
};