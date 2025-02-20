import { injectable } from 'inversify'; // v6.0.1
import { z } from 'zod'; // v3.21.0
import Decimal from 'decimal.js'; // v10.4.3
import { MetricDataType } from '../models/metric.model';
import { calculateNDR, calculateMagicNumber } from '../utils/formulas';

// Validation result interface
interface ValidationResult {
    isValid: boolean;
    errors: string[];
    context?: Record<string, any>;
}

// Validation rules interface
interface ValidationRules {
    required?: boolean;
    min?: number;
    max?: number;
    precision?: number;
    allowNegative?: boolean;
    customRules?: Array<(value: number) => boolean>;
}

// Cache interface for validation results
interface ValidationCache {
    key: string;
    result: ValidationResult;
    timestamp: number;
}

@injectable()
export class MetricValidationService {
    private readonly validationSchemas: Map<MetricDataType, z.ZodSchema>;
    private readonly validationCache: Map<string, ValidationCache>;
    private readonly CACHE_TTL = 300000; // 5 minutes in milliseconds

    constructor() {
        this.validationSchemas = new Map();
        this.validationCache = new Map();
        this.initializeValidationSchemas();
    }

    /**
     * Initializes validation schemas for each metric data type
     */
    private initializeValidationSchemas(): void {
        // Percentage schema (0-100)
        this.validationSchemas.set(
            MetricDataType.PERCENTAGE,
            z.number()
                .min(0, 'Percentage must be at least 0')
                .max(100, 'Percentage cannot exceed 100')
                .transform(val => new Decimal(val).toDecimalPlaces(2).toNumber())
        );

        // Currency schema (non-negative with 2 decimal places)
        this.validationSchemas.set(
            MetricDataType.CURRENCY,
            z.number()
                .min(0, 'Currency amount must be non-negative')
                .transform(val => new Decimal(val).toDecimalPlaces(2).toNumber())
        );

        // Ratio schema (0-10 with 2 decimal places)
        this.validationSchemas.set(
            MetricDataType.RATIO,
            z.number()
                .min(0, 'Ratio must be at least 0')
                .max(10, 'Ratio cannot exceed 10')
                .transform(val => new Decimal(val).toDecimalPlaces(2).toNumber())
        );

        // Number schema (integer validation)
        this.validationSchemas.set(
            MetricDataType.NUMBER,
            z.number()
                .int('Value must be an integer')
        );

        // Months schema (positive integer)
        this.validationSchemas.set(
            MetricDataType.MONTHS,
            z.number()
                .int('Months must be an integer')
                .min(0, 'Months cannot be negative')
                .max(60, 'Months cannot exceed 60')
        );
    }

    /**
     * Validates a metric value against its data type and validation rules
     */
    public validateMetricValue(
        value: number,
        dataType: MetricDataType,
        rules: ValidationRules
    ): ValidationResult {
        const cacheKey = `${value}-${dataType}-${JSON.stringify(rules)}`;
        const cachedResult = this.getCachedValidation(cacheKey);
        if (cachedResult) return cachedResult;

        const result: ValidationResult = {
            isValid: true,
            errors: []
        };

        try {
            // Required field validation
            if (rules.required && (value === null || value === undefined)) {
                result.errors.push('Value is required');
                result.isValid = false;
                return this.cacheAndReturnResult(cacheKey, result);
            }

            // Schema validation
            const schema = this.validationSchemas.get(dataType);
            if (!schema) {
                result.errors.push(`Invalid data type: ${dataType}`);
                result.isValid = false;
                return this.cacheAndReturnResult(cacheKey, result);
            }

            // Parse value through schema
            schema.parse(value);

            // Range validation
            const decimalValue = new Decimal(value);
            if (rules.min !== undefined && decimalValue.lessThan(rules.min)) {
                result.errors.push(`Value cannot be less than ${rules.min}`);
                result.isValid = false;
            }
            if (rules.max !== undefined && decimalValue.greaterThan(rules.max)) {
                result.errors.push(`Value cannot exceed ${rules.max}`);
                result.isValid = false;
            }

            // Precision validation
            if (rules.precision !== undefined) {
                const actualPrecision = decimalValue.decimalPlaces();
                if (actualPrecision > rules.precision) {
                    result.errors.push(`Value cannot have more than ${rules.precision} decimal places`);
                    result.isValid = false;
                }
            }

            // Negative value validation
            if (rules.allowNegative === false && decimalValue.isNegative()) {
                result.errors.push('Negative values are not allowed');
                result.isValid = false;
            }

            // Custom validation rules
            if (rules.customRules) {
                for (const rule of rules.customRules) {
                    if (!rule(value)) {
                        result.errors.push('Custom validation rule failed');
                        result.isValid = false;
                    }
                }
            }

            return this.cacheAndReturnResult(cacheKey, result);
        } catch (error) {
            result.isValid = false;
            result.errors.push(error instanceof Error ? error.message : 'Validation error occurred');
            return this.cacheAndReturnResult(cacheKey, result);
        }
    }

    /**
     * Validates date ranges for metric periods
     */
    public validateDateRange(startDate: Date, endDate: Date): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: []
        };

        try {
            // Convert to timestamps for comparison
            const start = startDate.getTime();
            const end = endDate.getTime();
            const now = Date.now();

            // Chronological order validation
            if (start >= end) {
                result.errors.push('Start date must be before end date');
                result.isValid = false;
            }

            // Future date validation
            if (end > now) {
                result.errors.push('End date cannot be in the future');
                result.isValid = false;
            }

            // Period length validation (minimum 1 day)
            const dayInMs = 24 * 60 * 60 * 1000;
            if (end - start < dayInMs) {
                result.errors.push('Period must be at least one day');
                result.isValid = false;
            }

            return result;
        } catch (error) {
            result.isValid = false;
            result.errors.push('Date validation error occurred');
            return result;
        }
    }

    /**
     * Validates business rules for specific metric categories
     */
    public validateBusinessRules(
        metricType: string,
        value: number,
        context?: Record<string, any>
    ): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            context: {}
        };

        try {
            switch (metricType) {
                case 'NDR':
                    if (value < 0 || value > 200) {
                        result.errors.push('NDR must be between 0% and 200%');
                        result.isValid = false;
                    }
                    break;

                case 'MAGIC_NUMBER':
                    if (value < 0 || value > 10) {
                        result.errors.push('Magic Number must be between 0 and 10');
                        result.isValid = false;
                    }
                    break;

                case 'CAC_PAYBACK':
                    if (value < 0 || value > 60) {
                        result.errors.push('CAC Payback must be between 0 and 60 months');
                        result.isValid = false;
                    }
                    break;
            }

            return result;
        } catch (error) {
            result.isValid = false;
            result.errors.push('Business rule validation error occurred');
            return result;
        }
    }

    /**
     * Retrieves cached validation result if available and not expired
     */
    private getCachedValidation(key: string): ValidationResult | null {
        const cached = this.validationCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.result;
        }
        return null;
    }

    /**
     * Caches validation result and returns it
     */
    private cacheAndReturnResult(key: string, result: ValidationResult): ValidationResult {
        this.validationCache.set(key, {
            key,
            result,
            timestamp: Date.now()
        });
        return result;
    }
}

export default MetricValidationService;