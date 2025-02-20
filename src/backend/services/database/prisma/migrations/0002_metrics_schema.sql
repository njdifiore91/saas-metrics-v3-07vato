-- PostgreSQL 14 Migration Script for Metrics Schema
-- Depends on: 0001_user_schema.sql

-- Set search path to ensure proper schema resolution
SET search_path TO startup_metrics, public;

-- Create metrics table for storing metric definitions with validation rules
CREATE TABLE startup_metrics.metrics (
    -- Primary identifier using UUID for security and scalability
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core metric information
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    
    -- Validation rules and calculation formulas stored as JSONB
    validation_rules JSONB NOT NULL,
    
    -- Status flag for metric availability
    active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit trail timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Data validation constraints
    CONSTRAINT metrics_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT metrics_category_not_empty CHECK (length(trim(category)) > 0),
    CONSTRAINT metrics_data_type_not_empty CHECK (length(trim(data_type)) > 0),
    CONSTRAINT metrics_validation_rules_not_empty CHECK (validation_rules IS NOT NULL AND validation_rules::text != '{}')
);

-- Create company_metrics table for storing time series metric data
CREATE TABLE startup_metrics.company_metrics (
    -- Primary identifier using UUID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationship references
    company_id UUID NOT NULL,
    metric_id UUID NOT NULL,
    
    -- Metric value and time period tracking
    value DECIMAL(20,4) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Audit trail timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_company_metrics_company
        FOREIGN KEY (company_id)
        REFERENCES startup_metrics.companies(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_company_metrics_metric
        FOREIGN KEY (metric_id)
        REFERENCES startup_metrics.metrics(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
        
    -- Data validation constraints
    CONSTRAINT company_metrics_period_valid CHECK (period_end >= period_start)
);

-- Create benchmark_sources table
CREATE TABLE startup_metrics.benchmark_sources (
    -- Primary identifier using UUID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Source information
    name VARCHAR(100) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit trail timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Data validation constraints
    CONSTRAINT benchmark_sources_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create benchmark_data table for storing segmented benchmark data
CREATE TABLE startup_metrics.benchmark_data (
    -- Primary identifier using UUID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationship references
    metric_id UUID NOT NULL,
    source_id UUID NOT NULL,
    
    -- Benchmark information
    revenue_range VARCHAR(50) NOT NULL,
    value DECIMAL(20,4) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Audit trail timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_benchmark_data_metric
        FOREIGN KEY (metric_id)
        REFERENCES startup_metrics.metrics(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_benchmark_data_source
        FOREIGN KEY (source_id)
        REFERENCES startup_metrics.benchmark_sources(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
        
    -- Data validation constraints
    CONSTRAINT benchmark_data_revenue_range_not_empty CHECK (length(trim(revenue_range)) > 0),
    CONSTRAINT benchmark_data_period_valid CHECK (period_end >= period_start)
);

-- Create optimized indexes for frequent query patterns
CREATE INDEX metrics_category_name_idx ON startup_metrics.metrics USING btree (category, name);
CREATE UNIQUE INDEX company_metrics_compound_idx ON startup_metrics.company_metrics (company_id, metric_id, period_start);
CREATE INDEX benchmark_data_compound_idx ON startup_metrics.benchmark_data (metric_id, revenue_range, period_start);
CREATE INDEX company_metrics_period_idx ON startup_metrics.company_metrics (period_start, period_end);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON startup_metrics.metrics
    FOR EACH ROW
    EXECUTE FUNCTION startup_metrics.trigger_set_timestamp();

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON startup_metrics.company_metrics
    FOR EACH ROW
    EXECUTE FUNCTION startup_metrics.trigger_set_timestamp();

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON startup_metrics.benchmark_sources
    FOR EACH ROW
    EXECUTE FUNCTION startup_metrics.trigger_set_timestamp();

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON startup_metrics.benchmark_data
    FOR EACH ROW
    EXECUTE FUNCTION startup_metrics.trigger_set_timestamp();

-- Grant appropriate permissions (restrictive by default)
REVOKE ALL ON ALL TABLES IN SCHEMA startup_metrics FROM PUBLIC;

-- Add table comments for documentation
COMMENT ON TABLE startup_metrics.metrics IS 'Core table for storing metric definitions with validation rules and formulas';
COMMENT ON TABLE startup_metrics.company_metrics IS 'Time series metric data for individual companies';
COMMENT ON TABLE startup_metrics.benchmark_sources IS 'External benchmark data providers';
COMMENT ON TABLE startup_metrics.benchmark_data IS 'Segmented benchmark data by revenue range';

-- Add column comments for key fields
COMMENT ON COLUMN startup_metrics.metrics.validation_rules IS 'JSONB field containing metric validation rules and calculation formulas';
COMMENT ON COLUMN startup_metrics.company_metrics.value IS 'Actual metric value for the specified time period';
COMMENT ON COLUMN startup_metrics.benchmark_data.revenue_range IS 'Revenue bracket for benchmark segmentation';