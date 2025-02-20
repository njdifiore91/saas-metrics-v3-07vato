-- PostgreSQL 14 Initial Migration Script for Startup Metrics Benchmarking Platform

-- Create dedicated schema for application data isolation
CREATE SCHEMA startup_metrics;

-- Set search path to ensure proper schema resolution
SET search_path TO startup_metrics, public;

-- Enable UUID generation capabilities
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create companies table with comprehensive audit capabilities
CREATE TABLE startup_metrics.companies (
    -- Primary identifier using UUID for security and scalability
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core company information
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    revenue_range VARCHAR(50) NOT NULL,
    
    -- Audit trail timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Data validation constraints
    CONSTRAINT companies_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT companies_industry_not_empty CHECK (length(trim(industry)) > 0),
    CONSTRAINT companies_revenue_range_not_empty CHECK (length(trim(revenue_range)) > 0)
);

-- Create optimized index for benchmark comparison queries
CREATE INDEX idx_companies_revenue_range ON startup_metrics.companies(revenue_range);

-- Create function for automated timestamp management
CREATE OR REPLACE FUNCTION startup_metrics.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON startup_metrics.companies
    FOR EACH ROW
    EXECUTE FUNCTION startup_metrics.trigger_set_timestamp();

-- Grant appropriate permissions (restrictive by default)
REVOKE ALL ON ALL TABLES IN SCHEMA startup_metrics FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA startup_metrics FROM PUBLIC;

-- Add table comment for documentation
COMMENT ON TABLE startup_metrics.companies IS 'Core table for storing company information with comprehensive audit capabilities';

-- Add column comments for documentation
COMMENT ON COLUMN startup_metrics.companies.id IS 'Unique identifier for company records';
COMMENT ON COLUMN startup_metrics.companies.name IS 'Official company name';
COMMENT ON COLUMN startup_metrics.companies.industry IS 'Industry classification for segmentation and analysis';
COMMENT ON COLUMN startup_metrics.companies.revenue_range IS 'Revenue bracket for benchmark comparisons';
COMMENT ON COLUMN startup_metrics.companies.created_at IS 'Timestamp of record creation';
COMMENT ON COLUMN startup_metrics.companies.updated_at IS 'Timestamp of last record update';