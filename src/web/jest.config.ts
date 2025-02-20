/**
 * Jest configuration file for the web frontend application
 * Version: 29.5.0
 * 
 * Comprehensive test configuration including:
 * - TypeScript support via ts-jest
 * - Browser environment simulation via jsdom
 * - Module and asset mocking
 * - Coverage thresholds and reporting
 * - Test execution settings
 */

import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Use jsdom for browser environment simulation
  testEnvironment: 'jsdom',

  // Define test file locations
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Module name mapping for assets and path aliases
  moduleNameMapper: {
    // Handle style imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.ts',
    
    // Handle path aliases
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Test setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setupTests.ts'
  ],

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!src/index.tsx',
    '!src/App.tsx',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // TypeScript transformation
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },

  // Test execution settings
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,

  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test'
  }
};

export default config;