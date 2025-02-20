// express ^4.18.2 - Express router and types for API implementation
import { Router, Request, Response } from 'express';
// @grpc/grpc-js ^1.9.0 - gRPC client with connection pooling and circuit breaker
import * as grpc from '@grpc/grpc-js';
// express-validator ^7.0.0 - Request validation and sanitization
import { body, query, validationResult } from 'express-validator';

import { authenticate, authorize } from '../middleware/auth.middleware';
import { authenticatedRateLimit } from '../middleware/rateLimit.middleware';
import { services } from '../config';
import logger from '../utils/logger';

// Interfaces
interface MetricRequest {
  company_id: string;
  metric_type: MetricType;
  value: number;
  period_start: Date;
  period_end: Date;
  metadata?: Record<string, unknown>;
  validation_rules?: ValidationRule[];
}

interface MetricFilter {
  company_id: string;
  metric_types?: MetricType[];
  start_date?: Date;
  end_date?: Date;
  aggregation?: AggregationType;
  include_metadata?: boolean;
}

enum MetricType {
  ARR = 'ARR',
  NDR = 'NDR',
  CAC = 'CAC',
  LTV = 'LTV',
  BURN_RATE = 'BURN_RATE',
  GROSS_MARGIN = 'GROSS_MARGIN'
}

enum AggregationType {
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX'
}

interface ValidationRule {
  type: 'range' | 'threshold' | 'trend';
  params: Record<string, unknown>;
}

// Initialize router
const router = Router();

// Initialize gRPC client with connection pooling
const metricsClient = new grpc.Client(
  `${services.metrics.host}:${services.metrics.port}`,
  grpc.credentials.createInsecure(),
  {
    'grpc.keepalive_time_ms': 10000,
    'grpc.keepalive_timeout_ms': 5000,
    'grpc.keepalive_permit_without_calls': 1,
    'grpc.max_concurrent_streams': 100
  }
);

// Validation middleware
const validateMetricCreation = [
  body('company_id').isUUID().notEmpty(),
  body('metric_type').isIn(Object.values(MetricType)),
  body('value').isNumeric(),
  body('period_start').isISO8601(),
  body('period_end').isISO8601(),
  body('metadata').optional().isObject(),
  body('validation_rules').optional().isArray()
];

const validateMetricRetrieval = [
  query('company_id').isUUID().notEmpty(),
  query('metric_types').optional().isArray(),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('aggregation').optional().isIn(Object.values(AggregationType)),
  query('include_metadata').optional().isBoolean()
];

// Create new metric
router.post(
  '/',
  authenticate,
  authorize(['create:metrics']),
  authenticatedRateLimit,
  validateMetricCreation,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const metricRequest: MetricRequest = req.body;

      // Apply business rule validation
      const validationErrors = await validateMetricRules(metricRequest);
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      const response = await metricsClient.CreateMetric(metricRequest);

      logger.info('Metric created successfully', {
        serviceName: 'api-gateway',
        requestId: req.headers['x-request-id'],
        context: {
          companyId: metricRequest.company_id,
          metricType: metricRequest.metric_type
        }
      });

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating metric', {
        error,
        serviceName: 'api-gateway',
        requestId: req.headers['x-request-id']
      });
      res.status(500).json({ error: 'Failed to create metric' });
    }
  }
);

// Retrieve metrics
router.get(
  '/',
  authenticate,
  authorize(['read:metrics']),
  authenticatedRateLimit,
  validateMetricRetrieval,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const filter: MetricFilter = {
        company_id: req.query.company_id as string,
        metric_types: req.query.metric_types as MetricType[],
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        aggregation: req.query.aggregation as AggregationType,
        include_metadata: req.query.include_metadata === 'true'
      };

      const response = await metricsClient.GetMetrics(filter);

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving metrics', {
        error,
        serviceName: 'api-gateway',
        requestId: req.headers['x-request-id']
      });
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  }
);

// Calculate derived metrics
router.post(
  '/calculate',
  authenticate,
  authorize(['calculate:metrics']),
  authenticatedRateLimit,
  [
    body('metric_type').isIn(Object.values(MetricType)),
    body('input_metrics').isArray(),
    body('calculation_params').optional().isObject()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const response = await metricsClient.CalculateMetric(req.body);

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error calculating metric', {
        error,
        serviceName: 'api-gateway',
        requestId: req.headers['x-request-id']
      });
      res.status(500).json({ error: 'Failed to calculate metric' });
    }
  }
);

// Validate metric data
router.post(
  '/validate',
  authenticate,
  authorize(['validate:metrics']),
  authenticatedRateLimit,
  validateMetricCreation,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const validationErrors = await validateMetricRules(req.body);
      res.status(200).json({ valid: validationErrors.length === 0, errors: validationErrors });
    } catch (error) {
      logger.error('Error validating metric', {
        error,
        serviceName: 'api-gateway',
        requestId: req.headers['x-request-id']
      });
      res.status(500).json({ error: 'Failed to validate metric' });
    }
  }
);

// Get benchmark comparisons
router.get(
  '/benchmarks',
  authenticate,
  authorize(['read:benchmarks']),
  authenticatedRateLimit,
  [
    query('metric_type').isIn(Object.values(MetricType)),
    query('revenue_range').isString(),
    query('period').isISO8601()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const response = await metricsClient.GetBenchmarkData(req.query);

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving benchmark data', {
        error,
        serviceName: 'api-gateway',
        requestId: req.headers['x-request-id']
      });
      res.status(500).json({ error: 'Failed to retrieve benchmark data' });
    }
  }
);

// Helper function for metric validation
async function validateMetricRules(metric: MetricRequest): Promise<string[]> {
  const errors: string[] = [];

  if (metric.validation_rules) {
    for (const rule of metric.validation_rules) {
      switch (rule.type) {
        case 'range':
          if (metric.value < rule.params.min || metric.value > rule.params.max) {
            errors.push(`Value ${metric.value} is outside allowed range [${rule.params.min}, ${rule.params.max}]`);
          }
          break;
        case 'threshold':
          if (metric.value < rule.params.threshold) {
            errors.push(`Value ${metric.value} is below threshold ${rule.params.threshold}`);
          }
          break;
        case 'trend':
          // Implement trend validation logic
          break;
      }
    }
  }

  return errors;
}

export default router;