import { injectable } from 'tsyringe'; // v4.3.0
import { z } from 'zod'; // v3.21.0
import Decimal from 'decimal.js'; // v10.4.3
import { metric, companyMetric } from '@prisma/client';
import { PrismaClient } from 'src/backend/services/database/src/client';

// Metric Categories
export enum MetricCategory {
    REVENUE = 'REVENUE',
    GROWTH = 'GROWTH',
    RETENTION = 'RETENTION',
    SALES_EFFICIENCY = 'SALES_EFFICIENCY',
    FINANCIAL = 'FINANCIAL'
}

// Metric Data Types
export enum MetricDataType {
    PERCENTAGE = 'PERCENTAGE',
    CURRENCY = 'CURRENCY',
    RATIO = 'RATIO',
    NUMBER = 'NUMBER',
    MONTHS = 'MONTHS'
}

// Validation Rule Interface
interface MetricValidationRule {
    required?: boolean;
    min?: number;
    max?: number;
    precision?: number;
    allowNegative?: boolean;
}

// DTOs
interface CreateMetricDTO {
    name: string;
    category: MetricCategory;
    dataType: MetricDataType;
    validationRules: MetricValidationRule;
    description?: string;
    active?: boolean;
}

interface CreateCompanyMetricDTO {
    companyId: string;
    metricId: string;
    value: number;
    periodStart: Date;
    periodEnd: Date;
}

// Validation Decorator
function validateInput() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            if (!args[0]) {
                throw new Error('Input validation failed: Missing required parameters');
            }
            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}

@injectable()
export class MetricModel {
    private readonly validationSchema: z.ZodSchema;
    private readonly decimalConfig: Decimal.Config;

    constructor(private readonly prisma: PrismaClient) {
        // Initialize Decimal.js configuration
        this.decimalConfig = {
            precision: 20,
            rounding: Decimal.ROUND_HALF_UP,
            toExpNeg: -7,
            toExpPos: 21
        };
        Decimal.set(this.decimalConfig);

        // Initialize Zod validation schema
        this.validationSchema = z.object({
            name: z.string().min(1).max(100),
            category: z.nativeEnum(MetricCategory),
            dataType: z.nativeEnum(MetricDataType),
            validationRules: z.object({
                required: z.boolean().optional(),
                min: z.number().optional(),
                max: z.number().optional(),
                precision: z.number().min(0).max(10).optional(),
                allowNegative: z.boolean().optional()
            })
        });
    }

    @validateInput()
    public async createMetric(data: CreateMetricDTO): Promise<metric> {
        // Validate input schema
        const validatedData = this.validationSchema.parse(data);

        // Check for duplicate metric names
        const existingMetric = await this.prisma.metric.findFirst({
            where: { name: validatedData.name }
        });

        if (existingMetric) {
            throw new Error(`Metric with name ${validatedData.name} already exists`);
        }

        // Create metric in transaction
        return await this.prisma.$transaction(async (tx) => {
            const metric = await tx.metric.create({
                data: {
                    name: validatedData.name,
                    category: validatedData.category,
                    dataType: validatedData.dataType,
                    validationRules: validatedData.validationRules,
                    description: data.description,
                    active: data.active ?? true
                }
            });

            return metric;
        });
    }

    @validateInput()
    public async createCompanyMetric(data: CreateCompanyMetricDTO): Promise<companyMetric> {
        // Validate company and metric existence
        const [company, metric] = await Promise.all([
            this.prisma.company.findUnique({ where: { id: data.companyId } }),
            this.prisma.metric.findUnique({ where: { id: data.metricId } })
        ]);

        if (!company) throw new Error('Company not found');
        if (!metric) throw new Error('Metric not found');

        // Validate metric value
        if (!this.validateMetricValue(data.value, metric.dataType, metric.validationRules)) {
            throw new Error('Invalid metric value');
        }

        // Create company metric in transaction
        return await this.prisma.$transaction(async (tx) => {
            const companyMetric = await tx.companyMetric.create({
                data: {
                    companyId: data.companyId,
                    metricId: data.metricId,
                    value: new Decimal(data.value).toNumber(),
                    periodStart: data.periodStart,
                    periodEnd: data.periodEnd
                }
            });

            return companyMetric;
        });
    }

    @validateInput()
    private validateMetricValue(
        value: number,
        dataType: MetricDataType,
        rules: MetricValidationRule
    ): boolean {
        // Handle required check
        if (rules.required && (value === null || value === undefined)) {
            return false;
        }

        // Convert to Decimal for precise calculations
        const decimalValue = new Decimal(value);

        // Check range constraints
        if (rules.min !== undefined && decimalValue.lessThan(rules.min)) return false;
        if (rules.max !== undefined && decimalValue.greaterThan(rules.max)) return false;

        // Check negative values
        if (rules.allowNegative === false && decimalValue.isNegative()) return false;

        // Validate based on data type
        switch (dataType) {
            case MetricDataType.PERCENTAGE:
                return decimalValue.greaterThanOrEqualTo(0) && decimalValue.lessThanOrEqualTo(100);
            case MetricDataType.RATIO:
                return decimalValue.greaterThanOrEqualTo(0);
            case MetricDataType.MONTHS:
                return decimalValue.isInteger() && decimalValue.greaterThanOrEqualTo(0);
            default:
                return true;
        }
    }
}