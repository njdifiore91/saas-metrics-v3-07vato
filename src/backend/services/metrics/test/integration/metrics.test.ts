import { MetricsServer } from '../../src/app';
import { MetricsController } from '../../src/controllers/metrics.controller';
import { CalculationService } from '../../src/services/calculation.service';
import { credentials, ServiceError } from '@grpc/grpc-js'; // ^1.9.0
import { performance } from 'perf_hooks';
import supertest from 'supertest'; // ^6.3.3
import { MetricCategory, MetricDataType } from '../../src/models/metric.model';
import { prisma, disconnectPrisma } from '../../../database/src/client';

describe('Metrics Service Integration Tests', () => {
    let server: MetricsServer;
    let client: any;
    let testCompanyId: string;

    beforeAll(async () => {
        // Initialize test environment
        server = new MetricsServer();
        await server.start();

        // Create gRPC client
        client = new MetricsController(
            `localhost:${process.env.METRICS_SERVICE_PORT || 50052}`,
            credentials.createInsecure()
        );

        // Setup test data
        const testCompany = await prisma.company.create({
            data: {
                name: 'Test Company',
                industry: 'Technology',
                revenueRange: '$1M-$5M'
            }
        });
        testCompanyId = testCompany.id;
    });

    afterAll(async () => {
        // Cleanup test data
        await prisma.companyMetric.deleteMany({
            where: { companyId: testCompanyId }
        });
        await prisma.company.delete({
            where: { id: testCompanyId }
        });

        // Shutdown server and disconnect
        await server.stop();
        await disconnectPrisma();
    });

    describe('Create Metric Tests', () => {
        it('should successfully create a valid metric', async () => {
            const request = {
                name: 'Test NDR',
                category: MetricCategory.RETENTION,
                dataType: MetricDataType.PERCENTAGE,
                validationRules: {
                    required: true,
                    min: 0,
                    max: 200,
                    precision: 2
                }
            };

            const response = await client.createMetric(request);
            expect(response).toBeDefined();
            expect(response.id).toBeDefined();
            expect(response.name).toBe(request.name);
            expect(response.category).toBe(request.category);
        });

        it('should reject metric creation with invalid validation rules', async () => {
            const request = {
                name: 'Invalid NDR',
                category: MetricCategory.RETENTION,
                dataType: MetricDataType.PERCENTAGE,
                validationRules: {
                    min: 200,
                    max: 0 // Invalid: min > max
                }
            };

            await expect(client.createMetric(request))
                .rejects
                .toThrow(ServiceError);
        });

        it('should handle duplicate metric names', async () => {
            const request = {
                name: 'Duplicate Metric',
                category: MetricCategory.FINANCIAL,
                dataType: MetricDataType.CURRENCY
            };

            await client.createMetric(request);
            await expect(client.createMetric(request))
                .rejects
                .toThrow(ServiceError);
        });
    });

    describe('Get Metrics Tests', () => {
        beforeEach(async () => {
            // Setup test metrics
            await prisma.metric.createMany({
                data: [
                    {
                        companyId: testCompanyId,
                        name: 'NDR Q1',
                        value: 120,
                        periodStart: new Date('2023-01-01'),
                        periodEnd: new Date('2023-03-31')
                    },
                    {
                        companyId: testCompanyId,
                        name: 'NDR Q2',
                        value: 135,
                        periodStart: new Date('2023-04-01'),
                        periodEnd: new Date('2023-06-30')
                    }
                ]
            });
        });

        it('should retrieve metrics with date range filtering', async () => {
            const request = {
                companyId: testCompanyId,
                startDate: '2023-01-01',
                endDate: '2023-06-30',
                category: MetricCategory.RETENTION
            };

            const response = await client.getMetrics(request);
            expect(response.metrics).toHaveLength(2);
            expect(response.metrics[0].value).toBe(120);
            expect(response.metrics[1].value).toBe(135);
        });

        it('should handle pagination correctly', async () => {
            const request = {
                companyId: testCompanyId,
                pageSize: 1,
                pageNumber: 1
            };

            const response = await client.getMetrics(request);
            expect(response.metrics).toHaveLength(1);
            expect(response.hasMore).toBe(true);
        });

        it('should validate date range parameters', async () => {
            const request = {
                companyId: testCompanyId,
                startDate: '2023-06-30',
                endDate: '2023-01-01' // Invalid: end before start
            };

            await expect(client.getMetrics(request))
                .rejects
                .toThrow(ServiceError);
        });
    });

    describe('Calculate Metric Tests', () => {
        it('should calculate NDR correctly', async () => {
            const request = {
                metricType: 'NDR',
                startingARR: 1000000,
                expansions: 200000,
                contractions: 50000,
                churn: 100000
            };

            const response = await client.calculateMetric(request);
            expect(response.value).toBe(105); // (1000000 + 200000 - 50000 - 100000) / 1000000 * 100
            expect(response.metricType).toBe('NDR');
        });

        it('should calculate Magic Number correctly', async () => {
            const request = {
                metricType: 'MAGIC_NUMBER',
                netNewARR: 500000,
                previousQuarterSMSpend: 250000
            };

            const response = await client.calculateMetric(request);
            expect(response.value).toBe(2); // 500000 / 250000
            expect(response.metricType).toBe('MAGIC_NUMBER');
        });

        it('should handle edge cases in CAC Payback calculation', async () => {
            const request = {
                metricType: 'CAC_PAYBACK',
                cac: 10000,
                arpa: 1000,
                grossMargin: 80
            };

            const response = await client.calculateMetric(request);
            expect(response.value).toBeLessThanOrEqual(60); // Maximum allowed months
            expect(response.metricType).toBe('CAC_PAYBACK');
        });

        it('should validate Pipeline Coverage ratio bounds', async () => {
            const request = {
                metricType: 'PIPELINE_COVERAGE',
                pipelineValue: 5000000,
                revenueTarget: 1000000
            };

            const response = await client.calculateMetric(request);
            expect(response.value).toBeGreaterThanOrEqual(1);
            expect(response.value).toBeLessThanOrEqual(10);
            expect(response.metricType).toBe('PIPELINE_COVERAGE');
        });
    });

    describe('Metric Validation Tests', () => {
        it('should validate NDR range correctly', async () => {
            const request = {
                metricType: 'NDR',
                value: 250 // Invalid: > 200%
            };

            const response = await client.validateMetric(request);
            expect(response.isValid).toBe(false);
            expect(response.errors).toContain('NDR must be between 0% and 200%');
        });

        it('should validate Magic Number precision', async () => {
            const request = {
                metricType: 'MAGIC_NUMBER',
                value: 5.123 // Invalid precision
            };

            const response = await client.validateMetric(request);
            expect(response.isValid).toBe(false);
            expect(response.errors).toContain('Value cannot have more than 2 decimal places');
        });

        it('should validate CAC Payback period limits', async () => {
            const request = {
                metricType: 'CAC_PAYBACK',
                value: 65 // Invalid: > 60 months
            };

            const response = await client.validateMetric(request);
            expect(response.isValid).toBe(false);
            expect(response.errors).toContain('CAC Payback must be between 0 and 60 months');
        });
    });

    describe('Performance Tests', () => {
        it('should handle concurrent metric calculations', async () => {
            const startTime = performance.now();
            const requests = Array(100).fill(null).map(() => ({
                metricType: 'NDR',
                startingARR: 1000000,
                expansions: 200000,
                contractions: 50000,
                churn: 100000
            }));

            const results = await Promise.all(
                requests.map(req => client.calculateMetric(req))
            );

            const duration = performance.now() - startTime;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(results).toHaveLength(100);
            results.forEach(result => {
                expect(result.value).toBe(105);
            });
        });

        it('should maintain response times under load', async () => {
            const requests = Array(50).fill(null).map(() => ({
                companyId: testCompanyId,
                category: MetricCategory.RETENTION
            }));

            const timings: number[] = [];
            for (const request of requests) {
                const start = performance.now();
                await client.getMetrics(request);
                timings.push(performance.now() - start);
            }

            const averageResponseTime = timings.reduce((a, b) => a + b) / timings.length;
            expect(averageResponseTime).toBeLessThan(200); // Average response time under 200ms
        });
    });
});