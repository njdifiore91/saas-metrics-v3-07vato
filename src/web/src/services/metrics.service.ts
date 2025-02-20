// External imports
// big.js v6.2.1 - Precise decimal arithmetic
import Big from 'big.js';

// Internal imports
import { ApiService } from './api.service';
import { Metric, CompanyMetric, MetricCategory, MetricDataType, metricSchema, companyMetricSchema } from '../types/metric.types';
import { ApiError, RequestParams } from '../types/api.types';

// Constants for metric calculations and validation
const CALCULATION_PRECISION = 4;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const METRIC_BOUNDS = {
  NDR: { min: 0, max: 200 },
  MAGIC_NUMBER: { min: 0, max: 10 },
  CAC_PAYBACK: { min: 0, max: 60 },
  PIPELINE_COVERAGE: { min: 1, max: 10 }
};

// Types for metric caching
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Enhanced service class for managing metric-related operations with comprehensive
 * error handling, performance optimization, and precise calculations
 */
export class MetricsService {
  private metricsCache: Map<string, CacheEntry<Metric[]>> = new Map();
  private calculationCache: Map<string, CacheEntry<Big>> = new Map();

  constructor(private apiService: ApiService) {
    // Configure Big.js for financial calculations
    Big.DP = CALCULATION_PRECISION;
    Big.RM = Big.roundHalfUp;
  }

  /**
   * Retrieves list of available metrics with caching and error handling
   */
  public async getMetrics(params?: RequestParams): Promise<Metric[]> {
    const cacheKey = this.generateCacheKey('metrics', params);
    const cached = this.getFromCache<Metric[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.apiService.get<Metric[]>('/api/v1/metrics', params);
      const metrics = response.data;

      // Validate metrics using zod schema
      metrics.forEach(metric => {
        const validationResult = metricSchema.safeParse(metric);
        if (!validationResult.success) {
          throw new Error(`Invalid metric data: ${JSON.stringify(validationResult.error)}`);
        }
      });

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      throw this.handleMetricError(error as ApiError);
    }
  }

  /**
   * Creates or updates company metric with validation
   */
  public async saveCompanyMetric(metric: CompanyMetric): Promise<CompanyMetric> {
    try {
      // Validate metric data
      const validationResult = companyMetricSchema.safeParse(metric);
      if (!validationResult.success) {
        throw new Error(`Invalid company metric data: ${JSON.stringify(validationResult.error)}`);
      }

      const response = metric.id
        ? await this.apiService.put<CompanyMetric, CompanyMetric>(`/api/v1/metrics/${metric.id}`, metric)
        : await this.apiService.post<CompanyMetric, CompanyMetric>('/api/v1/metrics', metric);

      return response.data;
    } catch (error) {
      throw this.handleMetricError(error as ApiError);
    }
  }

  /**
   * Calculates derived metrics using precise decimal arithmetic
   */
  public async calculateMetric(metricType: string, data: Record<string, number>): Promise<Big> {
    const cacheKey = this.generateCacheKey(metricType, data);
    const cached = this.getFromCache<Big>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      let result: Big;

      switch (metricType) {
        case 'NDR':
          result = this.calculateNDR(
            new Big(data.startingARR),
            new Big(data.expansions),
            new Big(data.contractions),
            new Big(data.churn)
          );
          break;

        case 'MAGIC_NUMBER':
          result = this.calculateMagicNumber(
            new Big(data.netNewARR),
            new Big(data.previousQuarterSMSpend)
          );
          break;

        case 'CAC_PAYBACK':
          result = this.calculateCACPayback(
            new Big(data.cac),
            new Big(data.arpa),
            new Big(data.grossMargin)
          );
          break;

        case 'PIPELINE_COVERAGE':
          result = this.calculatePipelineCoverage(
            new Big(data.pipelineValue),
            new Big(data.revenueTarget)
          );
          break;

        default:
          throw new Error(`Unsupported metric type: ${metricType}`);
      }

      // Validate result against bounds
      this.validateCalculationResult(metricType, result);
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      throw this.handleMetricError(error as ApiError);
    }
  }

  /**
   * Calculates Net Dollar Retention
   */
  private calculateNDR(startingARR: Big, expansions: Big, contractions: Big, churn: Big): Big {
    return startingARR.plus(expansions).minus(contractions).minus(churn)
      .div(startingARR)
      .times(100);
  }

  /**
   * Calculates Magic Number
   */
  private calculateMagicNumber(netNewARR: Big, previousQuarterSMSpend: Big): Big {
    return netNewARR.div(previousQuarterSMSpend);
  }

  /**
   * Calculates CAC Payback Period
   */
  private calculateCACPayback(cac: Big, arpa: Big, grossMargin: Big): Big {
    return cac.div(arpa.times(grossMargin.div(100)));
  }

  /**
   * Calculates Pipeline Coverage
   */
  private calculatePipelineCoverage(pipelineValue: Big, revenueTarget: Big): Big {
    return pipelineValue.div(revenueTarget);
  }

  /**
   * Validates calculation results against defined bounds
   */
  private validateCalculationResult(metricType: string, result: Big): void {
    const bounds = METRIC_BOUNDS[metricType as keyof typeof METRIC_BOUNDS];
    if (bounds) {
      if (result.lt(bounds.min) || result.gt(bounds.max)) {
        throw new Error(
          `Calculation result ${result} for ${metricType} is outside valid range [${bounds.min}, ${bounds.max}]`
        );
      }
    }
  }

  /**
   * Generates cache key for metric data
   */
  private generateCacheKey(type: string, data?: any): string {
    return `${type}:${JSON.stringify(data || {})}`;
  }

  /**
   * Retrieves data from cache if valid
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Sets data in cache with timestamp
   */
  private setCache<T>(key: string, data: T): void {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Implement cache size limiting
    if (this.metricsCache.size > 1000) {
      const oldestKey = Array.from(this.metricsCache.keys())[0];
      this.metricsCache.delete(oldestKey);
    }
  }

  /**
   * Handles metric-specific errors with enhanced context
   */
  private handleMetricError(error: ApiError): Error {
    const context = {
      timestamp: new Date().toISOString(),
      type: error.code,
      details: error.details
    };

    console.error('Metric operation failed:', context);
    
    return new Error(
      `Metric operation failed: ${error.message} (Code: ${error.code})`
    );
  }
}

// Export singleton instance
export const metricsService = new MetricsService(new ApiService());