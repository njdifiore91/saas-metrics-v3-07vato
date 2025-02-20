import { injectable } from 'inversify'; // v6.0.1
import { Logger } from 'winston'; // v3.10.0
import { Cache } from 'node-cache'; // v5.1.2
import { MetricModel } from '../models/metric.model';
import { CalculationService } from '../services/calculation.service';
import { MetricValidationService } from '../services/validation.service';
import { grpcService, GrpcMethod } from '@grpc/grpc-js'; // v1.9.0
import { Status } from '@grpc/grpc-js/build/src/constants';
import { performance } from 'perf_hooks';

@injectable()
@grpcService('MetricsService')
export class MetricsController {
    private readonly CACHE_TTL = 3600; // 1 hour cache duration

    constructor(
        private readonly metricModel: MetricModel,
        private readonly calculationService: CalculationService,
        private readonly validationService: MetricValidationService,
        private readonly logger: Logger,
        private readonly cacheService: Cache
    ) {}

    @GrpcMethod('MetricsService', 'CreateMetric')
    public async createMetric(request: CreateMetricRequest): Promise<MetricResponse> {
        const startTime = performance.now();
        const traceId = `metric-${Date.now()}`;

        try {
            this.logger.info('Creating new metric', {
                traceId,
                metricName: request.name,
                category: request.category
            });

            // Validate request data
            const validationResult = await this.validationService.validateMetricData({
                name: request.name,
                category: request.category,
                dataType: request.dataType,
                validationRules: request.validationRules
            });

            if (!validationResult.isValid) {
                throw {
                    code: Status.INVALID_ARGUMENT,
                    message: `Validation failed: ${validationResult.errors.join(', ')}`
                };
            }

            // Create metric
            const metric = await this.metricModel.createMetric({
                name: request.name,
                category: request.category,
                dataType: request.dataType,
                validationRules: request.validationRules,
                description: request.description,
                active: true
            });

            const duration = performance.now() - startTime;
            this.logger.info('Metric created successfully', {
                traceId,
                metricId: metric.id,
                duration
            });

            return {
                id: metric.id,
                name: metric.name,
                category: metric.category,
                dataType: metric.dataType,
                validationRules: metric.validationRules,
                createdAt: metric.createdAt.toISOString()
            };
        } catch (error) {
            this.logger.error('Error creating metric', {
                traceId,
                error: error.message,
                stack: error.stack
            });

            throw {
                code: error.code || Status.INTERNAL,
                message: error.message || 'Internal server error'
            };
        }
    }

    @GrpcMethod('MetricsService', 'GetMetrics')
    public async getMetrics(request: GetMetricsRequest): Promise<GetMetricsResponse> {
        const startTime = performance.now();
        const traceId = `metrics-${Date.now()}`;
        const cacheKey = `metrics:${request.companyId}:${request.category}`;

        try {
            // Check cache
            const cachedResult = this.cacheService.get(cacheKey);
            if (cachedResult) {
                this.logger.debug('Returning cached metrics', { traceId });
                return cachedResult as GetMetricsResponse;
            }

            // Validate request parameters
            if (!request.companyId) {
                throw {
                    code: Status.INVALID_ARGUMENT,
                    message: 'Company ID is required'
                };
            }

            // Retrieve metrics
            const metrics = await this.metricModel.getBatchMetrics({
                companyId: request.companyId,
                category: request.category,
                startDate: request.startDate,
                endDate: request.endDate
            });

            const response = {
                metrics: metrics.map(metric => ({
                    id: metric.id,
                    name: metric.name,
                    value: metric.value,
                    category: metric.category,
                    periodStart: metric.periodStart.toISOString(),
                    periodEnd: metric.periodEnd.toISOString()
                }))
            };

            // Cache results
            this.cacheService.set(cacheKey, response, this.CACHE_TTL);

            const duration = performance.now() - startTime;
            this.logger.info('Metrics retrieved successfully', {
                traceId,
                count: metrics.length,
                duration
            });

            return response;
        } catch (error) {
            this.logger.error('Error retrieving metrics', {
                traceId,
                error: error.message,
                stack: error.stack
            });

            throw {
                code: error.code || Status.INTERNAL,
                message: error.message || 'Internal server error'
            };
        }
    }

    @GrpcMethod('MetricsService', 'CalculateMetric')
    public async calculateMetric(request: CalculateMetricRequest): Promise<CalculateMetricResponse> {
        const startTime = performance.now();
        const traceId = `calc-${Date.now()}`;

        try {
            this.logger.info('Calculating metric', {
                traceId,
                metricType: request.metricType,
                companyId: request.companyId
            });

            let result: number;
            switch (request.metricType) {
                case 'NDR':
                    result = await this.calculationService.calculateNDR(
                        request.startingARR,
                        request.expansions,
                        request.contractions,
                        request.churn
                    );
                    break;

                case 'MAGIC_NUMBER':
                    result = await this.calculationService.calculateMagicNumber(
                        request.netNewARR,
                        request.previousQuarterSMSpend
                    );
                    break;

                case 'CAC_PAYBACK':
                    result = await this.calculationService.calculateCACPayback(
                        request.cac,
                        request.arpa,
                        request.grossMargin
                    );
                    break;

                case 'PIPELINE_COVERAGE':
                    result = await this.calculationService.calculatePipelineCoverage(
                        request.pipelineValue,
                        request.revenueTarget
                    );
                    break;

                default:
                    throw {
                        code: Status.INVALID_ARGUMENT,
                        message: `Unsupported metric type: ${request.metricType}`
                    };
            }

            const duration = performance.now() - startTime;
            this.logger.info('Metric calculation completed', {
                traceId,
                metricType: request.metricType,
                duration
            });

            return {
                value: result,
                metricType: request.metricType,
                calculatedAt: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('Error calculating metric', {
                traceId,
                error: error.message,
                stack: error.stack
            });

            throw {
                code: error.code || Status.INTERNAL,
                message: error.message || 'Internal server error'
            };
        }
    }

    @GrpcMethod('MetricsService', 'ValidateMetric')
    public async validateMetric(request: ValidateMetricRequest): Promise<ValidateMetricResponse> {
        const startTime = performance.now();
        const traceId = `validate-${Date.now()}`;

        try {
            this.logger.info('Validating metric', {
                traceId,
                metricType: request.metricType,
                value: request.value
            });

            const validationResult = await this.validationService.validateMetricValue(
                request.value,
                request.dataType,
                request.validationRules
            );

            const duration = performance.now() - startTime;
            this.logger.info('Metric validation completed', {
                traceId,
                isValid: validationResult.isValid,
                duration
            });

            return {
                isValid: validationResult.isValid,
                errors: validationResult.errors,
                context: validationResult.context
            };
        } catch (error) {
            this.logger.error('Error validating metric', {
                traceId,
                error: error.message,
                stack: error.stack
            });

            throw {
                code: error.code || Status.INTERNAL,
                message: error.message || 'Internal server error'
            };
        }
    }
}