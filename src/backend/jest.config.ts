// Jest configuration for backend services
// jest ^29.6.2
// ts-jest ^29.1.1

const jestConfig = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Define root directories for test discovery
  roots: ['<rootDir>/services'],

  // Test file patterns to match
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],

  // TypeScript transformation configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Enable code coverage collection
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',

  // Coverage report formats
  coverageReporters: [
    'text',
    'lcov',
    'json',
    'html'
  ],

  // Strict coverage thresholds to ensure data accuracy
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Service-specific test setup files
  setupFilesAfterEnv: [
    '<rootDir>/services/*/test/setup.ts'
  ],

  // Module path aliases for clean imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/services/$1'
  },

  // TypeScript compiler options
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },

  // Enable verbose test output
  verbose: true,

  // Test timeout in milliseconds
  testTimeout: 30000,

  // Limit parallel test execution to 50% of available cores
  maxWorkers: '50%'
};

export default jestConfig;