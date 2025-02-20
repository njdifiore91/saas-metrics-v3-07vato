-- PostgreSQL 14 Migration Script for Benchmark Schema
-- Depends on: 0002_metrics_schema.sql

-- Set search path to ensure proper schema resolution
SET search_path TO startup_metrics, public;

-- Create function for automatic partition management
CREATE OR REPLACE FUNCTION startup_metrics.create_benchmark_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_year INTEGER;
    partition_quarter INTEGER;
    partition_name TEXT;
    start_date TIMESTAMP;
    end_date TIMESTAMP;
BEGIN
    -- Extract year and quarter from period_start
    partition_year := EXTRACT(YEAR FROM NEW.period_start);
    partition_quarter := EXTRACT(QUARTER FROM NEW.period_start);
    
    -- Generate partition name
    partition_name := 'benchmark_data_y' || partition_year || 'q' || partition_quarter;
    
    -- Calculate partition bounds
    start_date := make_date(partition_year, ((partition_quarter - 1) * 3) + 1, 1);
    end_date := make_date(partition_year, (partition_quarter * 3) + 1, 1);
    
    -- Create partition if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS startup_metrics.%I PARTITION OF startup_metrics.benchmark_data 
            FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
        
        -- Create local indexes on partition
        EXECUTE format(
            'CREATE INDEX %I ON startup_metrics.%I (metric_id, revenue_range, period_start)',
            partition_name || '_metric_range_idx',
            partition_name
        );
        
        EXECUTE format(
            'CREATE INDEX %I ON startup_metrics.%I (source_id)',
            partition_name || '_source_idx',
            partition_name
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS startup_metrics.benchmark_data CASCADE;
DROP TABLE IF EXISTS startup_metrics.benchmark_sources CASCADE;

-- Create benchmark_sources table
CREATE TABLE startup_metrics.benchmark_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Data validation constraints
    CONSTRAINT benchmark_sources_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create partitioned benchmark_data table
CREATE TABLE startup_metrics.benchmark_data (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    metric_id UUID NOT NULL,
    source_id UUID NOT NULL,
    revenue_range VARCHAR(50) NOT NULL,
    value DECIMAL(20,4) NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary key must include partitioning column
    PRIMARY KEY (id, period_start),
    
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
    CONSTRAINT benchmark_data_value_positive CHECK (value >= 0),
    CONSTRAINT benchmark_data_period_valid CHECK (period_end > period_start),
    CONSTRAINT benchmark_data_revenue_range_not_empty CHECK (length(trim(revenue_range)) > 0)
) PARTITION BY RANGE (period_start);

-- Create optimized indexes
CREATE INDEX benchmark_sources_active_idx ON startup_metrics.benchmark_sources (active) WHERE active = true;

-- Create trigger for partition management
CREATE TRIGGER benchmark_data_partition_trigger
    BEFORE INSERT ON startup_metrics.benchmark_data
    FOR EACH ROW
    EXECUTE FUNCTION startup_metrics.create_benchmark_partition();

-- Create trigger for timestamp updates
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON startup_metrics.benchmark_sources
    FOR EACH ROW
    EXECUTE FUNCTION startup_metrics.trigger_set_timestamp();

-- Grant appropriate permissions
REVOKE ALL ON ALL TABLES IN SCHEMA startup_metrics FROM PUBLIC;

-- Add table comments
COMMENT ON TABLE startup_metrics.benchmark_sources IS 'Stores information about benchmark data providers with activity tracking';
COMMENT ON TABLE startup_metrics.benchmark_data IS 'Stores benchmark metrics with revenue range segmentation and automated time-based partitioning';

-- Add column comments
COMMENT ON COLUMN startup_metrics.benchmark_sources.name IS 'Name of the benchmark data provider';
COMMENT ON COLUMN startup_metrics.benchmark_sources.description IS 'Detailed description of the data source';
COMMENT ON COLUMN startup_metrics.benchmark_sources.active IS 'Flag indicating if the source is currently active';
COMMENT ON COLUMN startup_metrics.benchmark_data.revenue_range IS 'Revenue bracket for benchmark segmentation';
COMMENT ON COLUMN startup_metrics.benchmark_data.value IS 'Actual benchmark value for the metric';
COMMENT ON COLUMN startup_metrics.benchmark_data.period_start IS 'Start of the benchmark period (used for partitioning)';
COMMENT ON COLUMN startup_metrics.benchmark_data.period_end IS 'End of the benchmark period';