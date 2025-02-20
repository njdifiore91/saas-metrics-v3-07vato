// express ^4.18.2 - Express router and types for API endpoint implementation
import { Router, Request, Response } from 'express';
// express-validator ^7.0.1 - Enhanced request validation with sanitization
import { body, param, query, validationResult } from 'express-validator';

import { authenticate, authorize } from '../middleware/auth.middleware';
import { rateLimits } from '../config';
import logger from '../utils/logger';

// Constants
const COMPANY_ROLES = ['COMPANY_USER', 'ANALYST', 'ADMIN'] as const;
const COMPANY_FIELDS = ['name', 'industry', 'revenueRange', 'metadata'] as const;
const SENSITIVE_FIELDS = ['metadata.financials', 'metadata.strategy'] as const;

// Interfaces
interface CompanyProfileRequest {
  name: string;
  industry: string;
  revenueRange: string;
  metadata?: Record<string, unknown>;
}

// Initialize router
const router = Router();

/**
 * Validation chains for company endpoints
 */
const validateCompanyId = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID format')
];

const validateCompanyProfile = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('industry')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Industry must be between 2 and 50 characters'),
  body('revenueRange')
    .trim()
    .matches(/^\$\d+M-\$\d+M$/)
    .withMessage('Revenue range must be in format $XM-$YM'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid object')
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * GET /api/v1/companies/:id
 * Retrieves company profile with role-based access control
 */
router.get(
  '/api/v1/companies/:id',
  authenticate,
  authorize(COMPANY_ROLES),
  validateCompanyId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = req.params.id;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      logger.info('Company profile request', {
        serviceName: 'api-gateway',
        context: { companyId, userId, userRole }
      });

      // Apply rate limiting based on user role
      const rateLimit = rateLimits.authenticated;
      try {
        await rateLimit.consume(userId);
      } catch (error) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
      }

      // Retrieve company profile from service
      const company = await fetchCompanyProfile(companyId);
      if (!company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      // Apply role-based field filtering
      const filteredCompany = filterSensitiveData(company, userRole);

      res.status(200).json(filteredCompany);

      logger.info('Company profile retrieved successfully', {
        serviceName: 'api-gateway',
        context: { companyId, userId }
      });
    } catch (error) {
      logger.error('Error retrieving company profile', {
        serviceName: 'api-gateway',
        context: { error }
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/v1/companies/:id
 * Updates company profile with enhanced validation
 */
router.put(
  '/api/v1/companies/:id',
  authenticate,
  authorize(['ADMIN']),
  validateCompanyId,
  validateCompanyProfile,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = req.params.id;
      const userId = (req as any).user.id;
      const updateData: CompanyProfileRequest = req.body;

      logger.info('Company profile update request', {
        serviceName: 'api-gateway',
        context: { companyId, userId }
      });

      // Apply rate limiting for write operations
      const rateLimit = rateLimits.admin;
      try {
        await rateLimit.consume(userId);
      } catch (error) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
      }

      // Update company profile
      const updatedCompany = await updateCompanyProfile(companyId, updateData);
      if (!updatedCompany) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      res.status(200).json(updatedCompany);

      logger.securityEvent('Company profile updated', {
        severity: 'medium',
        serviceName: 'api-gateway',
        context: { companyId, userId, changes: Object.keys(updateData) }
      });
    } catch (error) {
      logger.error('Error updating company profile', {
        serviceName: 'api-gateway',
        context: { error }
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/v1/companies/:id/users
 * Lists company users with pagination and role-based filtering
 */
router.get(
  '/api/v1/companies/:id/users',
  authenticate,
  authorize(['ADMIN', 'ANALYST']),
  validateCompanyId,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = req.params.id;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      logger.info('Company users list request', {
        serviceName: 'api-gateway',
        context: { companyId, userId, page, limit }
      });

      // Apply rate limiting
      const rateLimit = rateLimits.authenticated;
      try {
        await rateLimit.consume(userId);
      } catch (error) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
      }

      // Retrieve paginated user list
      const { users, total } = await listCompanyUsers(companyId, page, limit);
      
      // Apply role-based data masking
      const maskedUsers = users.map(user => maskUserData(user, userRole));

      res.status(200).json({
        users: maskedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

      logger.info('Company users retrieved successfully', {
        serviceName: 'api-gateway',
        context: { companyId, userId, count: users.length }
      });
    } catch (error) {
      logger.error('Error retrieving company users', {
        serviceName: 'api-gateway',
        context: { error }
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Helper functions
async function fetchCompanyProfile(companyId: string): Promise<any> {
  // Implementation would call the appropriate microservice
  // Placeholder for demonstration
  return Promise.resolve({});
}

async function updateCompanyProfile(companyId: string, data: CompanyProfileRequest): Promise<any> {
  // Implementation would call the appropriate microservice
  // Placeholder for demonstration
  return Promise.resolve({});
}

async function listCompanyUsers(companyId: string, page: number, limit: number): Promise<any> {
  // Implementation would call the appropriate microservice
  // Placeholder for demonstration
  return Promise.resolve({ users: [], total: 0 });
}

function filterSensitiveData(company: any, userRole: string): any {
  if (userRole === 'ADMIN') return company;
  
  const filtered = { ...company };
  if (userRole === 'COMPANY_USER') {
    SENSITIVE_FIELDS.forEach(field => {
      const paths = field.split('.');
      let current = filtered;
      for (let i = 0; i < paths.length - 1; i++) {
        if (current[paths[i]]) current = current[paths[i]];
      }
      if (current[paths[paths.length - 1]]) {
        delete current[paths[paths.length - 1]];
      }
    });
  }
  return filtered;
}

function maskUserData(user: any, userRole: string): any {
  if (userRole === 'ADMIN') return user;
  
  const masked = { ...user };
  delete masked.email;
  delete masked.phoneNumber;
  return masked;
}

export default router;