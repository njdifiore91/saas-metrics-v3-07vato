import { PrismaClient } from '../client'; // From internal client.ts
import { faker } from '@faker-js/faker'; // v8.0.0

// Constants for test data generation
const TEST_COMPANIES_COUNT = 5;
const TEST_USERS_PER_COMPANY = 3;
const TEST_METRICS_COUNT = 10;
const INDUSTRY_TYPES = ['SaaS', 'Fintech', 'E-commerce', 'Healthcare', 'Enterprise'];
const USER_ROLES = ['admin', 'analyst', 'user'];
const METRIC_CATEGORIES = ['financial', 'growth', 'retention', 'efficiency'];

// Validation rules from technical specification
const METRIC_VALIDATION_RULES = {
  'net_dollar_retention': {
    min: 0,
    max: 200,
    unit: 'percentage'
  },
  'magic_number': {
    min: 0,
    max: 10,
    unit: 'ratio'
  },
  'cac_payback': {
    min: 0,
    max: 60,
    unit: 'months'
  },
  'pipeline_coverage': {
    min: 1,
    max: 10,
    unit: 'ratio'
  }
};

/**
 * Creates test company records with realistic business data
 */
async function createTestCompanies(prisma: PrismaClient) {
  const companies = Array.from({ length: TEST_COMPANIES_COUNT }, () => ({
    name: faker.company.name(),
    industry: faker.helpers.arrayElement(INDUSTRY_TYPES),
    revenue_range: `$${faker.number.int({ min: 1, max: 50 })}M-$${faker.number.int({ min: 51, max: 100 })}M`,
    preferences: {
      reporting_frequency: 'monthly',
      benchmark_preferences: {
        peer_group_size: faker.number.int({ min: 10, max: 50 }),
        include_industry_data: true
      }
    },
    created_at: faker.date.past(),
    updated_at: faker.date.recent()
  }));

  return await prisma.company.createMany({
    data: companies,
    skipDuplicates: true
  });
}

/**
 * Creates test users with proper role distribution
 */
async function createTestUsers(prisma: PrismaClient, companies: any[]) {
  const users = companies.flatMap(company => 
    Array.from({ length: TEST_USERS_PER_COMPANY }, (_, index) => ({
      email: faker.internet.email({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        provider: company.name.toLowerCase().replace(/\s/g, '') + '.com'
      }),
      role: index === 0 ? 'admin' : faker.helpers.arrayElement(USER_ROLES),
      company_id: company.id,
      preferences: {
        notifications: {
          email: true,
          in_app: true,
          frequency: 'daily'
        },
        dashboard_layout: faker.helpers.arrayElement(['compact', 'detailed', 'custom'])
      },
      last_login: faker.date.recent()
    }))
  );

  return await prisma.user.createMany({
    data: users,
    skipDuplicates: true
  });
}

/**
 * Creates sample metric definitions with validation rules
 */
async function createTestMetrics(prisma: PrismaClient) {
  const metrics = Object.entries(METRIC_VALIDATION_RULES).map(([name, rules]) => ({
    name,
    category: faker.helpers.arrayElement(METRIC_CATEGORIES),
    data_type: rules.unit === 'percentage' ? 'percentage' : 'decimal',
    validation_rules: rules,
    active: true
  }));

  // Add additional generic metrics
  for (let i = metrics.length; i < TEST_METRICS_COUNT; i++) {
    metrics.push({
      name: `test_metric_${i}`,
      category: faker.helpers.arrayElement(METRIC_CATEGORIES),
      data_type: faker.helpers.arrayElement(['percentage', 'decimal', 'integer']),
      validation_rules: {
        min: 0,
        max: 1000,
        unit: 'value'
      },
      active: true
    });
  }

  return await prisma.metric.createMany({
    data: metrics,
    skipDuplicates: true
  });
}

/**
 * Creates test metric values for companies following validation rules
 */
async function createTestCompanyMetrics(prisma: PrismaClient, companies: any[], metrics: any[]) {
  const companyMetrics = companies.flatMap(company =>
    metrics.flatMap(metric => {
      // Generate 12 months of historical data
      const historicalData = Array.from({ length: 12 }, (_, index) => {
        const rules = metric.validation_rules;
        const value = faker.number.float({
          min: rules.min,
          max: rules.max,
          precision: 0.01
        });

        return {
          company_id: company.id,
          metric_id: metric.id,
          value,
          period_start: new Date(new Date().setMonth(new Date().getMonth() - index, 1)),
          period_end: new Date(new Date().setMonth(new Date().getMonth() - index + 1, 0)),
          created_at: faker.date.recent()
        };
      });

      return historicalData;
    })
  );

  return await prisma.companyMetric.createMany({
    data: companyMetrics,
    skipDuplicates: true
  });
}

/**
 * Main seeding function that orchestrates test data creation
 */
export async function seed() {
  const prisma = new PrismaClient();
  
  try {
    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Clean existing test data
      await tx.companyMetric.deleteMany();
      await tx.user.deleteMany();
      await tx.metric.deleteMany();
      await tx.company.deleteMany();

      // Create test data
      const companies = await createTestCompanies(tx);
      const users = await createTestUsers(tx, companies);
      const metrics = await createTestMetrics(tx);
      const companyMetrics = await createTestCompanyMetrics(tx, companies, metrics);

      console.log(`Seeded: ${companies.count} companies, ${users.count} users, ${metrics.count} metrics, ${companyMetrics.count} company metrics`);
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for CLI usage
export default seed;