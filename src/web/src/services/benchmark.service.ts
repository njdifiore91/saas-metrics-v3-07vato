// External imports
// axios v1.4.0
import axios from 'axios';

// Internal imports
import { ApiService } from './api.service';
import { 
  BenchmarkData, 
  BenchmarkFilter,
  BenchmarkComparison,
  MetricType,
  DataQuality,
  TrendDirection,
  TimeGranularity
} from '../types/benchmark.types';

// Constants for caching and performance
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CONFIDENCE_THRESHOLD = 0.8;
const MIN_SAMPLE_SIZE = 10;
const PERCENTILE_PRECISION = 2;

/**
 * Service for handling benchmark data operations with advanced caching and monitoring
 */
export class BenchmarkService {
  private static instance: BenchmarkService;
  private cachedData: Map<string, { data: BenchmarkData[]; timestamp: number }> = new Map();
  private metrics: Map<string, number> = new Map();
  private readonly apiService: ApiService;

  private constructor(apiService: ApiService) {
    this.apiService = apiService;
    this.initializeMetricsTracking();
  }

  /**
   * Get singleton instance of BenchmarkService
   */
  public static getInstance(apiService: ApiService): BenchmarkService {
    if (!BenchmarkService.instance) {
      BenchmarkService.instance = new BenchmarkService(apiService);
    }
    return BenchmarkService.instance;
  }

  /**
   * Retrieves benchmark data based on provided filters with caching
   */
  public async getBenchmarkData(filter: BenchmarkFilter): Promise<BenchmarkData[]> {
    try {
      this.validateFilter(filter);
      const cacheKey = this.generateCacheKey(filter);
      
      // Check cache for valid data
      const cachedResult = this.getCachedData(cacheKey);
      if (cachedResult) {
        this.trackMetric('cache_hit');
        return cachedResult;
      }

      this.trackMetric('cache_miss');
      const response = await this.apiService.get<BenchmarkData[]>('/api/v1/benchmarks', {
        params: this.formatFilterParams(filter)
      });

      const validatedData = this.validateBenchmarkData(response.data);
      this.cacheData(cacheKey, validatedData);

      return validatedData;
    } catch (error) {
      this.trackMetric('request_error');
      throw error;
    }
  }

  /**
   * Calculates comprehensive comparison metrics between company data and benchmarks
   */
  public async compareBenchmarks(
    companyValue: number,
    benchmarkData: BenchmarkData[]
  ): Promise<BenchmarkComparison> {
    try {
      this.validateComparisonInput(companyValue, benchmarkData);

      const benchmarkStats = this.calculateBenchmarkStatistics(benchmarkData);
      const percentileRank = this.calculatePercentileRank(companyValue, benchmarkData);
      const trendAnalysis = this.analyzeTrends(benchmarkData);

      return {
        metric_id: benchmarkData[0].metric_id,
        metric_type: benchmarkData[0].metric_id as MetricType,
        company_value: companyValue,
        benchmark_value: benchmarkStats.average,
        variance: this.calculateVariance(companyValue, benchmarkStats.average),
        percentile: percentileRank,
        trend_analysis: trendAnalysis,
        historical_context: {
          previous_periods: this.extractPreviousPeriods(benchmarkData),
          average: benchmarkStats.average,
          median: benchmarkStats.median,
          standard_deviation: benchmarkStats.standardDeviation
        },
        confidence_score: this.calculateConfidenceScore(benchmarkData),
        sample_size: benchmarkData.length,
        data_quality_indicators: {
          company_data: this.assessDataQuality([companyValue]),
          benchmark_data: this.assessDataQuality(benchmarkData.map(d => d.value))
        }
      };
    } catch (error) {
      this.trackMetric('comparison_error');
      throw error;
    }
  }

  /**
   * Validates and formats filter parameters
   */
  private formatFilterParams(filter: BenchmarkFilter): Record<string, any> {
    return {
      revenue_range: filter.revenue_range,
      metric_types: filter.metric_types,
      date_range: filter.date_range,
      industries: filter.industries,
      time_granularity: filter.time_granularity,
      confidence_threshold: filter.confidence_threshold || CONFIDENCE_THRESHOLD,
      exclusion_criteria: filter.exclusion_criteria
    };
  }

  /**
   * Validates benchmark data for quality and completeness
   */
  private validateBenchmarkData(data: BenchmarkData[]): BenchmarkData[] {
    return data.filter(item => 
      item.confidence_score >= CONFIDENCE_THRESHOLD &&
      (item.sample_size ?? 0) >= MIN_SAMPLE_SIZE &&
      item.data_quality !== DataQuality.INSUFFICIENT
    );
  }

  /**
   * Calculates statistical metrics for benchmark data
   */
  private calculateBenchmarkStatistics(data: BenchmarkData[]): {
    average: number;
    median: number;
    standardDeviation: number;
  } {
    const values = data.map(d => d.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(values.length / 2)];
    const standardDeviation = Math.sqrt(
      values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length
    );

    return { average, median, standardDeviation };
  }

  /**
   * Analyzes trends in benchmark data
   */
  private analyzeTrends(data: BenchmarkData[]): TrendAnalysis {
    const sortedData = [...data].sort((a, b) => 
      new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
    );

    const values = sortedData.map(d => d.value);
    const growthRate = this.calculateGrowthRate(values);
    const direction = this.determineTrendDirection(values);

    return {
      trend_direction: direction,
      growth_rate: growthRate,
      seasonality: this.detectSeasonality(sortedData),
      confidence_interval: this.calculateConfidenceInterval(values)
    };
  }

  /**
   * Calculates percentile rank for a company value
   */
  private calculatePercentileRank(value: number, data: BenchmarkData[]): number {
    const values = data.map(d => d.value).sort((a, b) => a - b);
    const position = values.findIndex(v => v >= value);
    return Number(((position / values.length) * 100).toFixed(PERCENTILE_PRECISION));
  }

  /**
   * Generates cache key from filter parameters
   */
  private generateCacheKey(filter: BenchmarkFilter): string {
    return JSON.stringify({
      revenue_range: filter.revenue_range,
      metric_types: filter.metric_types,
      date_range: filter.date_range,
      time_granularity: filter.time_granularity
    });
  }

  /**
   * Retrieves cached data if valid
   */
  private getCachedData(key: string): BenchmarkData[] | null {
    const cached = this.cachedData.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
      return cached.data;
    }
    return null;
  }

  /**
   * Caches benchmark data with timestamp
   */
  private cacheData(key: string, data: BenchmarkData[]): void {
    this.cachedData.set(key, {
      data,
      timestamp: Date.now()
    });

    // Implement cache size management
    if (this.cachedData.size > 100) {
      const oldestKey = Array.from(this.cachedData.keys())[0];
      this.cachedData.delete(oldestKey);
    }
  }

  /**
   * Initializes metrics tracking
   */
  private initializeMetricsTracking(): void {
    setInterval(() => {
      this.reportMetrics();
      this.metrics.clear();
    }, 60000); // Report metrics every minute
  }

  /**
   * Tracks service metrics
   */
  private trackMetric(name: string): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + 1);
  }

  /**
   * Reports collected metrics
   */
  private reportMetrics(): void {
    console.info('Benchmark Service Metrics:', Object.fromEntries(this.metrics));
  }
}

// Export singleton instance
export const benchmarkService = BenchmarkService.getInstance(ApiService.getInstance());