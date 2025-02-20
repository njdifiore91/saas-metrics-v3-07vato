import { injectable } from 'inversify'; // v6.0.1
import { Logger } from 'winston'; // v3.10.0
import NodeCache from 'node-cache'; // v5.1.2
import { MetricCategory, MetricDataType } from '../models/metric.model';
import { ValidationService } from './validation.service';
import * as FormulaUtils from '../utils/formulas';

@injectable()
export class CalculationService {
    private readonly calculationCache: NodeCache;
    private readonly CACHE_TTL_SECONDS = 3600; // 1 hour cache

    constructor(
        private readonly logger: Logger,
        private readonly validationService: ValidationService
    ) {
        this.calculationCache = new NodeCache({
            stdTTL: this.CACHE_TTL_SECONDS,
            checkperiod: 600, // Check for expired entries every 10 minutes
            useClones: false
        });
    }

    /**
     * Calculates Net Dollar Retention with validation and caching
     */
    public async calculateNDR(
        startingARR: number,
        expansions: number,
        contractions: number,
        churn: number
    ): Promise<number> {
        const cacheKey = `ndr:${startingARR}:${expansions}:${contractions}:${churn}`;
        const cachedResult = this.calculationCache.get<number>(cacheKey);

        if (cachedResult !== undefined) {
            return cachedResult;
        }

        try {
            this.logger.debug('Calculating NDR', {
                startingARR,
                expansions,
                contractions,
                churn
            });

            const validationResult = this.validationService.validateBusinessRules(
                'NDR',
                startingARR,
                { expansions, contractions, churn }
            );

            if (!validationResult.isValid) {
                throw new Error(`NDR validation failed: ${validationResult.errors.join(', ')}`);
            }

            const result = FormulaUtils.calculateNDR(
                startingARR,
                expansions,
                contractions,
                churn
            );

            this.calculationCache.set(cacheKey, result);
            return result;
        } catch (error) {
            this.logger.error('NDR calculation failed', { error });
            throw error;
        }
    }

    /**
     * Calculates Magic Number with validation and caching
     */
    public async calculateMagicNumber(
        netNewARR: number,
        previousQuarterSMSpend: number
    ): Promise<number> {
        const cacheKey = `magic:${netNewARR}:${previousQuarterSMSpend}`;
        const cachedResult = this.calculationCache.get<number>(cacheKey);

        if (cachedResult !== undefined) {
            return cachedResult;
        }

        try {
            this.logger.debug('Calculating Magic Number', {
                netNewARR,
                previousQuarterSMSpend
            });

            const validationResult = this.validationService.validateBusinessRules(
                'MAGIC_NUMBER',
                netNewARR,
                { previousQuarterSMSpend }
            );

            if (!validationResult.isValid) {
                throw new Error(`Magic Number validation failed: ${validationResult.errors.join(', ')}`);
            }

            const result = FormulaUtils.calculateMagicNumber(
                netNewARR,
                previousQuarterSMSpend
            );

            this.calculationCache.set(cacheKey, result);
            return result;
        } catch (error) {
            this.logger.error('Magic Number calculation failed', { error });
            throw error;
        }
    }

    /**
     * Calculates CAC Payback Period with validation and caching
     */
    public async calculateCACPayback(
        cac: number,
        arpa: number,
        grossMargin: number
    ): Promise<number> {
        const cacheKey = `cac:${cac}:${arpa}:${grossMargin}`;
        const cachedResult = this.calculationCache.get<number>(cacheKey);

        if (cachedResult !== undefined) {
            return cachedResult;
        }

        try {
            this.logger.debug('Calculating CAC Payback', {
                cac,
                arpa,
                grossMargin
            });

            const validationResult = this.validationService.validateBusinessRules(
                'CAC_PAYBACK',
                cac,
                { arpa, grossMargin }
            );

            if (!validationResult.isValid) {
                throw new Error(`CAC Payback validation failed: ${validationResult.errors.join(', ')}`);
            }

            const result = FormulaUtils.calculateCACPayback(
                cac,
                arpa,
                grossMargin
            );

            this.calculationCache.set(cacheKey, result);
            return result;
        } catch (error) {
            this.logger.error('CAC Payback calculation failed', { error });
            throw error;
        }
    }

    /**
     * Calculates Pipeline Coverage with validation and caching
     */
    public async calculatePipelineCoverage(
        pipelineValue: number,
        revenueTarget: number
    ): Promise<number> {
        const cacheKey = `pipeline:${pipelineValue}:${revenueTarget}`;
        const cachedResult = this.calculationCache.get<number>(cacheKey);

        if (cachedResult !== undefined) {
            return cachedResult;
        }

        try {
            this.logger.debug('Calculating Pipeline Coverage', {
                pipelineValue,
                revenueTarget
            });

            const validationResult = this.validationService.validateMetricValue(
                pipelineValue / revenueTarget,
                MetricDataType.RATIO,
                { min: 1, max: 10 }
            );

            if (!validationResult.isValid) {
                throw new Error(`Pipeline Coverage validation failed: ${validationResult.errors.join(', ')}`);
            }

            const result = FormulaUtils.calculatePipelineCoverage(
                pipelineValue,
                revenueTarget
            );

            this.calculationCache.set(cacheKey, result);
            return result;
        } catch (error) {
            this.logger.error('Pipeline Coverage calculation failed', { error });
            throw error;
        }
    }

    /**
     * Calculates percentage difference from benchmark
     */
    public async calculateBenchmarkComparison(
        actualValue: number,
        benchmarkValue: number
    ): Promise<number> {
        try {
            if (benchmarkValue === 0) {
                throw new Error('Benchmark value cannot be zero');
            }

            const percentageDiff = ((actualValue - benchmarkValue) / benchmarkValue) * 100;
            return Number(percentageDiff.toFixed(2));
        } catch (error) {
            this.logger.error('Benchmark comparison calculation failed', { error });
            throw error;
        }
    }
}