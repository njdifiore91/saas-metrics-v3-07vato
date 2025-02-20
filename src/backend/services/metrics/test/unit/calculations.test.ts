import { describe, it, expect, jest, beforeEach, afterEach } from 'jest'; // v29.6.2
import { Container } from 'inversify'; // v6.0.1
import { Logger } from 'winston'; // v3.10.0
import { CalculationService } from '../../src/services/calculation.service';
import { ValidationService } from '../../src/services/validation.service';
import { MetricDataType } from '../../src/models/metric.model';

describe('Metric Calculations Test Suite', () => {
    let container: Container;
    let calculationService: CalculationService;
    let validationService: ValidationService;
    let mockLogger: jest.Mocked<Logger>;

    beforeEach(() => {
        // Setup container and mocks
        container = new Container();
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn()
        } as unknown as jest.Mocked<Logger>;

        // Bind services
        container.bind<Logger>('Logger').toConstantValue(mockLogger);
        container.bind<ValidationService>(ValidationService).toSelf();
        container.bind<CalculationService>(CalculationService).toSelf();

        // Get service instances
        calculationService = container.get<CalculationService>(CalculationService);
        validationService = container.get<ValidationService>(ValidationService);

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        container.unbindAll();
        jest.resetAllMocks();
    });

    describe('Net Dollar Retention (NDR) Calculations', () => {
        it('should calculate valid NDR within range', async () => {
            const startingARR = 1000000;
            const expansions = 200000;
            const contractions = 50000;
            const churn = 50000;

            const result = await calculationService.calculateNDR(
                startingARR,
                expansions,
                contractions,
                churn
            );

            expect(result).toBe(110.00); // (1000000 + 200000 - 50000 - 50000) / 1000000 * 100
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(200);
            expect(Number.isInteger(result * 100)).toBeTruthy(); // Verify 2 decimal precision
        });

        it('should throw error for zero starting ARR', async () => {
            await expect(
                calculationService.calculateNDR(0, 100000, 0, 0)
            ).rejects.toThrow('Starting ARR must be greater than zero');
        });

        it('should throw error for negative revenue components', async () => {
            await expect(
                calculationService.calculateNDR(1000000, -100000, 0, 0)
            ).rejects.toThrow('Revenue components cannot be negative');
        });

        it('should use cached result for identical inputs', async () => {
            const inputs = [1000000, 200000, 50000, 50000];
            
            const result1 = await calculationService.calculateNDR(...inputs);
            const result2 = await calculationService.calculateNDR(...inputs);

            expect(result1).toBe(result2);
            expect(mockLogger.debug).toHaveBeenCalledTimes(1); // Second call used cache
        });
    });

    describe('Magic Number Calculations', () => {
        it('should calculate valid Magic Number within range', async () => {
            const netNewARR = 500000;
            const previousQuarterSMSpend = 250000;

            const result = await calculationService.calculateMagicNumber(
                netNewARR,
                previousQuarterSMSpend
            );

            expect(result).toBe(2.00);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(10);
            expect(Number.isInteger(result * 100)).toBeTruthy(); // Verify 2 decimal precision
        });

        it('should throw error for zero S&M spend', async () => {
            await expect(
                calculationService.calculateMagicNumber(100000, 0)
            ).rejects.toThrow('Previous quarter S&M spend must be greater than zero');
        });

        it('should handle edge case near maximum value', async () => {
            const result = await calculationService.calculateMagicNumber(2500000, 250000);
            expect(result).toBeLessThanOrEqual(10);
        });
    });

    describe('CAC Payback Period Calculations', () => {
        it('should calculate valid CAC Payback within range', async () => {
            const cac = 10000;
            const arpa = 1000;
            const grossMargin = 80;

            const result = await calculationService.calculateCACPayback(
                cac,
                arpa,
                grossMargin
            );

            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(60);
            expect(Number.isInteger(result * 10)).toBeTruthy(); // Verify 1 decimal precision
        });

        it('should throw error for invalid gross margin', async () => {
            await expect(
                calculationService.calculateCACPayback(10000, 1000, 101)
            ).rejects.toThrow('Gross margin must be between 0 and 100');
        });

        it('should throw error for zero ARPA', async () => {
            await expect(
                calculationService.calculateCACPayback(10000, 0, 80)
            ).rejects.toThrow('CAC and ARPA must be greater than zero');
        });
    });

    describe('Pipeline Coverage Calculations', () => {
        it('should calculate valid Pipeline Coverage within range', async () => {
            const pipelineValue = 2000000;
            const revenueTarget = 1000000;

            const result = await calculationService.calculatePipelineCoverage(
                pipelineValue,
                revenueTarget
            );

            expect(result).toBe(2.00);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(10);
            expect(Number.isInteger(result * 100)).toBeTruthy(); // Verify 2 decimal precision
        });

        it('should throw error for zero revenue target', async () => {
            await expect(
                calculationService.calculatePipelineCoverage(1000000, 0)
            ).rejects.toThrow('Revenue target must be greater than zero');
        });

        it('should throw error for coverage ratio below minimum', async () => {
            await expect(
                calculationService.calculatePipelineCoverage(500000, 1000000)
            ).rejects.toThrow('Pipeline Coverage must be between 1x and 10x');
        });
    });

    describe('Benchmark Comparison Calculations', () => {
        it('should calculate valid percentage difference', async () => {
            const actualValue = 120;
            const benchmarkValue = 100;

            const result = await calculationService.calculateBenchmarkComparison(
                actualValue,
                benchmarkValue
            );

            expect(result).toBe(20.00); // (120 - 100) / 100 * 100
            expect(Number.isInteger(result * 100)).toBeTruthy(); // Verify 2 decimal precision
        });

        it('should throw error for zero benchmark value', async () => {
            await expect(
                calculationService.calculateBenchmarkComparison(100, 0)
            ).rejects.toThrow('Benchmark value cannot be zero');
        });

        it('should handle negative percentage differences', async () => {
            const result = await calculationService.calculateBenchmarkComparison(80, 100);
            expect(result).toBe(-20.00);
        });
    });
});