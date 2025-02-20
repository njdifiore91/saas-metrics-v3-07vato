import { PrismaClient } from '@prisma/client'; // v5.2.0
import winston from 'winston'; // v3.8.2
import { z } from 'zod'; // v3.22.0
import { prisma } from '../client';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'seed-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'seed-combined.log' })
  ]
});

// Validation schemas
const INDUSTRY_CATEGORIES = [
  'SaaS',
  'E-commerce',
  'Fintech',
  'Healthcare',
  'Enterprise Software',
  'Marketplace'
] as const;

const REVENUE_RANGES = [
  '$0-1M',
  '$1M-5M',
  '$5M-10M',
  '$10M-20M',
  '$20M-50M',
  '$50M+'
] as const;

const USER_ROLES = ['admin', 'company_user', 'analyst'] as const;

const CompanySchema = z.object({
  name: z.string().min(2).max(100),
  industry: z.enum(INDUSTRY_CATEGORIES),
  revenue_range: z.enum(REVENUE_RANGES),
  created_at: z.date()
});

const UserSchema = z.object({
  email: z.string().email(),
  role: z.enum(USER_ROLES),
  company_id: z.string().uuid(),
  preferences: z.record(z.unknown())
});

const MetricSchema = z.object({
  name: z.string().min(2).max(50),
  category: z.string(),
  data_type: z.enum(['number', 'percentage', 'currency', 'ratio']),
  validation_rules: z.record(z.unknown())
});

// Sample data
const SAMPLE_COMPANIES = [
  {
    name: 'TechCorp Solutions',
    industry: 'SaaS',
    revenue_range: '$5M-10M',
    created_at: new Date('2023-01-01')
  },
  {
    name: 'HealthTech Innovations',
    industry: 'Healthcare',
    revenue_range: '$1M-5M',
    created_at: new Date('2023-01-02')
  },
  {
    name: 'FinanceFlow',
    industry: 'Fintech',
    revenue_range: '$10M-20M',
    created_at: new Date('2023-01-03')
  }
] as const;

const SAMPLE_USERS = [
  {
    email: 'admin@techcorp.com',
    role: 'admin',
    company_id: '', // Will be populated after company creation
    preferences: { theme: 'dark', notifications: true }
  },
  {
    email: 'analyst@healthtech.com',
    role: 'analyst',
    company_id: '', // Will be populated after company creation
    preferences: { theme: 'light', notifications: false }
  }
] as const;

const SAMPLE_METRICS = [
  {
    name: 'Annual Recurring Revenue',
    category: 'Revenue',
    data_type: 'currency',
    validation_rules: {
      min: 0,
      max: 1000000000,
      decimals: 2
    }
  },
  {
    name: 'Net Dollar Retention',
    category: 'Growth',
    data_type: 'percentage',
    validation_rules: {
      min: 0,
      max: 200,
      decimals: 1
    }
  }
] as const;

async function seedCompanies(prisma: PrismaClient): Promise<void> {
  logger.info('Starting company seeding process');
  
  try {
    await prisma.$transaction(async (tx) => {
      // Validate all company data
      SAMPLE_COMPANIES.forEach(company => {
        CompanySchema.parse(company);
      });

      // Clear existing companies with cascade
      await tx.company.deleteMany();
      
      // Create companies
      const companies = await Promise.all(
        SAMPLE_COMPANIES.map(company =>
          tx.company.create({
            data: company
          })
        )
      );

      logger.info(`Successfully seeded ${companies.length} companies`);
      return companies;
    });
  } catch (error) {
    logger.error('Error seeding companies:', error);
    throw error;
  }
}

async function seedUsers(prisma: PrismaClient): Promise<void> {
  logger.info('Starting user seeding process');

  try {
    await prisma.$transaction(async (tx) => {
      // Get company IDs
      const companies = await tx.company.findMany({
        select: { id: true }
      });

      if (companies.length === 0) {
        throw new Error('No companies found for user association');
      }

      // Clear existing users
      await tx.user.deleteMany();

      // Create users with company associations
      const users = await Promise.all(
        SAMPLE_USERS.map((user, index) => {
          const userData = {
            ...user,
            company_id: companies[index % companies.length].id
          };
          UserSchema.parse(userData);
          return tx.user.create({
            data: userData
          });
        })
      );

      logger.info(`Successfully seeded ${users.length} users`);
    });
  } catch (error) {
    logger.error('Error seeding users:', error);
    throw error;
  }
}

async function seedMetrics(prisma: PrismaClient): Promise<void> {
  logger.info('Starting metrics seeding process');

  try {
    await prisma.$transaction(async (tx) => {
      // Validate metric definitions
      SAMPLE_METRICS.forEach(metric => {
        MetricSchema.parse(metric);
      });

      // Clear existing metrics
      await tx.metric.deleteMany();
      await tx.companyMetric.deleteMany();

      // Create metrics
      const metrics = await Promise.all(
        SAMPLE_METRICS.map(metric =>
          tx.metric.create({
            data: metric
          })
        )
      );

      // Get companies for metric association
      const companies = await tx.company.findMany();

      // Create company-specific metric values
      for (const company of companies) {
        for (const metric of metrics) {
          await tx.companyMetric.create({
            data: {
              company_id: company.id,
              metric_id: metric.id,
              value: Math.random() * 100, // Sample value
              period_start: new Date('2023-01-01'),
              period_end: new Date('2023-12-31')
            }
          });
        }
      }

      logger.info(`Successfully seeded ${metrics.length} metrics with company associations`);
    });
  } catch (error) {
    logger.error('Error seeding metrics:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  logger.info('Starting database seed process');

  try {
    // Verify database connection
    await prisma.$connect();

    // Execute seeding operations
    await seedCompanies(prisma);
    await seedUsers(prisma);
    await seedMetrics(prisma);

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default main;

if (require.main === module) {
  main()
    .catch((error) => {
      logger.error('Seed script failed:', error);
      process.exit(1);
    });
}