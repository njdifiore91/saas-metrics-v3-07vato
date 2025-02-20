import { z } from 'zod'; // ^3.22.0
import { RevenueRange, Company } from '../types/company.types';

/**
 * Validation schema for company profile data
 * Implements strict validation rules with comprehensive error messages
 */
export const companyProfileSchema = z.object({
  name: z.string()
    .min(2, 'Company name must be at least 2 characters long')
    .max(200, 'Company name cannot exceed 200 characters')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-\.,&()]+$/, {
      message: 'Company name can only contain letters, numbers, spaces, and basic punctuation'
    }),

  industry: z.string()
    .min(2, 'Industry must be at least 2 characters long')
    .max(100, 'Industry cannot exceed 100 characters')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-&]+$/, {
      message: 'Industry can only contain letters, numbers, spaces, and hyphens'
    }),

  revenueRange: z.nativeEnum(RevenueRange, {
    errorMap: () => ({ message: 'Please select a valid revenue range' })
  })
}).strict();

/**
 * Validation schema for company metric entries
 * Enforces strict numeric validation and date range rules
 */
export const companyMetricSchema = z.object({
  companyId: z.string()
    .uuid('Invalid company ID format')
    .trim(),

  metricId: z.string()
    .uuid('Invalid metric ID format')
    .trim(),

  value: z.number()
    .finite('Value must be a finite number')
    .min(-999999999999, 'Value is too small')
    .max(999999999999, 'Value is too large')
    .transform(val => Number(val.toFixed(2))), // Ensure 2 decimal precision

  periodStart: z.date()
    .min(new Date('2000-01-01'), 'Period start date cannot be before year 2000')
    .max(new Date(), 'Period start date cannot be in the future'),

  periodEnd: z.date()
    .min(new Date('2000-01-01'), 'Period end date cannot be before year 2000')
    .max(new Date(), 'Period end date cannot be in the future')
}).strict()
.refine(data => data.periodEnd >= data.periodStart, {
  message: 'Period end date must be after or equal to start date',
  path: ['periodEnd']
});

/**
 * Validation schema for company update operations
 * Supports partial updates with the same validation rules as profile schema
 */
export const companyUpdateSchema = companyProfileSchema.partial()
.refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * Helper type for runtime type inference of validated company profile
 */
export type ValidatedCompanyProfile = z.infer<typeof companyProfileSchema>;

/**
 * Helper type for runtime type inference of validated company metric
 */
export type ValidatedCompanyMetric = z.infer<typeof companyMetricSchema>;

/**
 * Helper type for runtime type inference of validated company update
 */
export type ValidatedCompanyUpdate = z.infer<typeof companyUpdateSchema>;