// zod v3.21.0 - Runtime type checking and schema validation
import { z } from 'zod';

/**
 * Enumeration of available metric categories for classification and filtering
 */
export enum MetricCategory {
  REVENUE = 'REVENUE',
  GROWTH = 'GROWTH',
  RETENTION = 'RETENTION',
  SALES_EFFICIENCY = 'SALES_EFFICIENCY',
  FINANCIAL = 'FINANCIAL'
}

/**
 * Enumeration of supported metric data types for validation and display formatting
 */
export enum MetricDataType {
  PERCENTAGE = 'PERCENTAGE',
  CURRENCY = 'CURRENCY',
  RATIO = 'RATIO',
  NUMBER = 'NUMBER',
  MONTHS = 'MONTHS'
}

/**
 * Interface defining validation rules for metric values
 * Includes range constraints, precision requirements, and required field flags
 */
export interface MetricValidationRule {
  min: number | null;        // Minimum allowed value
  max: number | null;        // Maximum allowed value
  precision: number;         // Number of decimal places
  required: boolean;         // Whether the metric is required
}

/**
 * Core metric interface definition with complete type information
 * Represents the fundamental structure of a metric definition
 */
export interface Metric {
  id: string;
  name: string;
  category: MetricCategory;
  dataType: MetricDataType;
  validationRules: MetricValidationRule;
  active: boolean;
}

/**
 * Interface for company-specific metric entries
 * Tracks actual metric values for a company over specific time periods
 */
export interface CompanyMetric {
  id: string;
  companyId: string;
  metricId: string;
  value: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

/**
 * Interface for calculated metric values with standardized calculation methods
 * Implements formulas from technical specifications
 */
export interface MetricCalculation {
  NDR: number;              // Net Dollar Retention (0% - 200%)
  magicNumber: number;      // Magic Number (0 - 10)
  cacPayback: number;       // CAC Payback Period (0 - 60 months)
  pipelineCoverage: number; // Pipeline Coverage (1x - 10x)
}

/**
 * Zod schema for runtime validation of metric validation rules
 */
export const metricValidationRuleSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  precision: z.number().min(0).max(10),
  required: z.boolean()
});

/**
 * Zod schema for runtime validation of metric data
 */
export const metricSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  category: z.nativeEnum(MetricCategory),
  dataType: z.nativeEnum(MetricDataType),
  validationRules: metricValidationRuleSchema,
  active: z.boolean()
});

/**
 * Zod schema for runtime validation of company metric data
 */
export const companyMetricSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  metricId: z.string().uuid(),
  value: z.number(),
  periodStart: z.date(),
  periodEnd: z.date(),
  createdAt: z.date()
});

/**
 * Zod schema for runtime validation of metric calculations
 */
export const metricCalculationSchema = z.object({
  NDR: z.number().min(0).max(200),
  magicNumber: z.number().min(0).max(10),
  cacPayback: z.number().min(0).max(60),
  pipelineCoverage: z.number().min(1).max(10)
});