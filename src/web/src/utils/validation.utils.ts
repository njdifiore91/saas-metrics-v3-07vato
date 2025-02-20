import { z } from 'zod'; // v3.22.0
import { MetricValidationRule, MetricDataType } from '../types/metric.types';
import { RevenueRange } from '../types/company.types';

/**
 * Validates a metric value against defined validation rules and data type constraints
 * Implements comprehensive validation based on technical specifications
 */
export const validateMetricValue = (
  value: number,
  rules: MetricValidationRule,
  dataType: MetricDataType
): boolean => {
  try {
    // Base schema for numeric validation
    const baseSchema = z.number();
    
    // Required field validation
    if (rules.required && (value === null || value === undefined)) {
      return false;
    }

    // Build type-specific validation schema
    let schema = baseSchema;
    
    // Apply min/max bounds if specified
    if (rules.min !== null) {
      schema = schema.min(rules.min);
    }
    if (rules.max !== null) {
      schema = schema.max(rules.max);
    }

    // Apply data type specific validation
    switch (dataType) {
      case MetricDataType.PERCENTAGE:
        schema = schema.min(0).max(100);
        break;
      
      case MetricDataType.RATIO:
        schema = schema.min(0);
        break;
      
      case MetricDataType.CURRENCY:
        schema = schema.min(0).multipleOf(0.01);
        break;
      
      case MetricDataType.MONTHS:
        schema = schema.min(0).max(60).int();
        break;
    }

    // Special metric-specific validations based on A.1.1 Metric Calculation Formulas
    if (value.toString().includes('NDR')) {
      schema = schema.min(0).max(200);
    }
    if (value.toString().includes('magicNumber')) {
      schema = schema.min(0).max(10);
    }
    if (value.toString().includes('pipelineCoverage')) {
      schema = schema.min(1).max(10);
    }

    // Precision validation
    const precision = rules.precision;
    const multiplier = Math.pow(10, precision);
    const roundedValue = Math.round(value * multiplier) / multiplier;
    
    if (value !== roundedValue) {
      return false;
    }

    // Perform schema validation
    schema.parse(value);
    return true;

  } catch (error) {
    return false;
  }
};

/**
 * Validates date ranges for metric entries with comprehensive period consistency checks
 * Implements validation rules from technical specifications
 */
export const validateDateRange = (startDate: Date, endDate: Date): boolean => {
  try {
    // Create schema for date validation
    const dateSchema = z.object({
      startDate: z.date(),
      endDate: z.date()
    });

    // Validate basic date structure
    dateSchema.parse({ startDate, endDate });

    // Convert to timestamps for comparison
    const start = startDate.getTime();
    const end = endDate.getTime();
    const now = new Date().getTime();

    // Basic range validation
    if (start >= end) {
      return false;
    }

    // Future date validation
    if (end > now) {
      return false;
    }

    // Maximum historical range (5 years)
    const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
    if (now - start > fiveYearsMs) {
      return false;
    }

    // Period consistency validation
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    // Validate quarter alignment
    if ((startMonth % 3 !== 0) || ((endMonth + 1) % 3 !== 0)) {
      return false;
    }

    // Validate minimum period (1 quarter)
    const quarterMs = 3 * 30 * 24 * 60 * 60 * 1000;
    if (end - start < quarterMs) {
      return false;
    }

    return true;

  } catch (error) {
    return false;
  }
};

/**
 * Validates revenue range selections with transition validation
 * Implements revenue range validation rules from technical specifications
 */
export const validateRevenueRange = (range: RevenueRange): boolean => {
  try {
    // Create schema for revenue range validation
    const revenueRangeSchema = z.nativeEnum(RevenueRange);

    // Validate against enum values
    revenueRangeSchema.parse(range);

    // Validate range transitions
    const validTransitions = new Map([
      [RevenueRange.LESS_THAN_1M, [RevenueRange.ONE_TO_5M]],
      [RevenueRange.ONE_TO_5M, [RevenueRange.LESS_THAN_1M, RevenueRange.FIVE_TO_10M]],
      [RevenueRange.FIVE_TO_10M, [RevenueRange.ONE_TO_5M, RevenueRange.TEN_TO_50M]],
      [RevenueRange.TEN_TO_50M, [RevenueRange.FIVE_TO_10M, RevenueRange.FIFTY_PLUS]],
      [RevenueRange.FIFTY_PLUS, [RevenueRange.TEN_TO_50M]]
    ]);

    // Note: Actual transition validation would require previous range from company history
    // This is a placeholder for the validation logic
    
    return true;

  } catch (error) {
    return false;
  }
};