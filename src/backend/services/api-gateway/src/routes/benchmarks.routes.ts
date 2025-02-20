// express ^4.18.2 - Express web framework
import { Router, Request, Response } from 'express';
// compression ^1.7.4 - Response compression
import compression from 'compression';
// @grpc/grpc-js ^1.9.0 - gRPC client
import * as grpc from '@grpc/grpc-js';

// Internal imports
import { authenticate } from '../middleware/auth.middleware';
import { authenticatedRateLimit } from '../middleware/rateLimit.middleware';
import { BenchmarkServiceClient } from '../../proto/benchmark';
import Logger from '../utils/logger';
import { services } from '../config';

// Constants
const CIRCUIT_BREAKER_OPTIONS = {
  maxFailures: 5,
  resetTimeout: 30000
};

const router = Router();

// Initialize gRPC client with retry and timeout configuration
const benchmarkClient = new BenchmarkServiceClient(
  `${services.benchmark.host}:${services.benchmark.port}`,
  grpc.credentials.createInsecure(),
  {
    'grpc.keepalive_time_ms': 10000,
    'grpc.keepalive_timeout_ms': 5000,
    'grpc.max_reconnect_backoff_ms': 5000
  }
);

/**
 * GET /api/v1/benchmarks
 * Retrieves benchmark data for specified revenue range and metric type
 */
router.get('/benchmarks', 
  authenticate,
  authenticatedRateLimit,
  compression(),
  async (req: Request, res: Response) => {
    try {
      const { 
        revenueRange, 
        metricType, 
        sourceIds, 
        periodStart, 
        periodEnd,
        includeStatistics = true 
      } = req.query;

      // Validate required parameters
      if (!revenueRange || !metricType) {
        return res.status(400).json({
          error: 'Missing required parameters: revenueRange and metricType are required'
        });
      }

      // Build gRPC request
      const request = {
        revenueRange: Number(revenueRange),
        metricType: Number(metricType),
        sourceIds: Array.isArray(sourceIds) ? sourceIds : [sourceIds],
        periodStart: new Date(periodStart as string),
        periodEnd: new Date(periodEnd as string),
        includeStatistics: Boolean(includeStatistics)
      };

      // Call benchmark service with timeout
      const response = await new Promise((resolve, reject) => {
        benchmarkClient.GetBenchmarkData(
          request,
          { deadline: Date.now() + services.benchmark.timeout },
          (error, response) => {
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      });

      // Set cache control headers
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      res.json(response);

    } catch (error) {
      Logger.error('Benchmark data retrieval failed', {
        error,
        serviceName: 'api-gateway',
        context: { query: req.query }
      });

      if (error.code === grpc.status.DEADLINE_EXCEEDED) {
        return res.status(504).json({ error: 'Request timeout' });
      }

      res.status(500).json({ error: 'Failed to retrieve benchmark data' });
    }
  }
);

/**
 * GET /api/v1/benchmarks/timeseries
 * Retrieves time-series benchmark data
 */
router.get('/benchmarks/timeseries',
  authenticate,
  authenticatedRateLimit,
  compression(),
  async (req: Request, res: Response) => {
    try {
      const {
        revenueRange,
        metricType,
        periodStart,
        periodEnd,
        granularity,
        sourceIds
      } = req.query;

      // Validate time period
      if (!periodStart || !periodEnd) {
        return res.status(400).json({
          error: 'Missing required parameters: periodStart and periodEnd are required'
        });
      }

      // Build gRPC request
      const request = {
        revenueRange: Number(revenueRange),
        metricType: Number(metricType),
        periodStart: new Date(periodStart as string),
        periodEnd: new Date(periodEnd as string),
        granularity: granularity || 'monthly',
        sourceIds: Array.isArray(sourceIds) ? sourceIds : [sourceIds]
      };

      // Call benchmark service with timeout
      const response = await new Promise((resolve, reject) => {
        benchmarkClient.GetTimeSeriesData(
          request,
          { deadline: Date.now() + services.benchmark.timeout },
          (error, response) => {
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      });

      // Set cache headers for time series data
      res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
      res.json(response);

    } catch (error) {
      Logger.error('Time series data retrieval failed', {
        error,
        serviceName: 'api-gateway',
        context: { query: req.query }
      });

      if (error.code === grpc.status.DEADLINE_EXCEEDED) {
        return res.status(504).json({ error: 'Request timeout' });
      }

      res.status(500).json({ error: 'Failed to retrieve time series data' });
    }
  }
);

/**
 * POST /api/v1/benchmarks/ranking
 * Calculates percentile ranking for a metric value
 */
router.post('/benchmarks/ranking',
  authenticate,
  authenticatedRateLimit,
  async (req: Request, res: Response) => {
    try {
      const {
        metricValue,
        revenueRange,
        metricType,
        period,
        sourceIds
      } = req.body;

      // Validate required parameters
      if (!metricValue || !revenueRange || !metricType || !period) {
        return res.status(400).json({
          error: 'Missing required parameters: metricValue, revenueRange, metricType, and period are required'
        });
      }

      // Build gRPC request
      const request = {
        metricValue: Number(metricValue),
        revenueRange: Number(revenueRange),
        metricType: Number(metricType),
        period: new Date(period),
        sourceIds: sourceIds || []
      };

      // Call benchmark service with timeout
      const response = await new Promise((resolve, reject) => {
        benchmarkClient.CalculateRanking(
          request,
          { deadline: Date.now() + services.benchmark.timeout },
          (error, response) => {
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      });

      // No caching for ranking calculations
      res.set('Cache-Control', 'no-store');
      res.json(response);

    } catch (error) {
      Logger.error('Ranking calculation failed', {
        error,
        serviceName: 'api-gateway',
        context: { body: req.body }
      });

      if (error.code === grpc.status.DEADLINE_EXCEEDED) {
        return res.status(504).json({ error: 'Request timeout' });
      }

      res.status(500).json({ error: 'Failed to calculate ranking' });
    }
  }
);

/**
 * GET /api/v1/benchmarks/health
 * Health check endpoint for the benchmark routes
 */
router.get('/benchmarks/health', async (_req: Request, res: Response) => {
  try {
    // Test connection to benchmark service
    await new Promise((resolve, reject) => {
      benchmarkClient.GetBenchmarkData(
        { revenueRange: 1, metricType: 1 },
        { deadline: Date.now() + 5000 },
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(true);
          }
        }
      );
    });

    res.json({ status: 'healthy' });
  } catch (error) {
    Logger.error('Benchmark service health check failed', {
      error,
      serviceName: 'api-gateway'
    });
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

export default router;